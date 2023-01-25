/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
/* eslint-env mocha */

'use strict';

const assert = require('assert');

const {
  IT_DEFAULT_TIMEOUT,
  Nock,
  TestBrowser,
  Setup,
} = require('./utils.js');
const { SidekickTest } = require('./SidekickTest.js');

const SHAREPOINT_FIXTURE = 'admin-sharepoint.html';
const GDRIVE_FIXTURE = 'admin-gdrive.html';
const TESTS = [{
  env: 'sharepoint',
  setup: new Setup('blog'),
  fixture: SHAREPOINT_FIXTURE,
}, {
  env: 'gdrive',
  setup: new Setup('pages'),
  fixture: GDRIVE_FIXTURE,
}];

describe('Test bulk info plugin', () => {
  /** @type TestBrowser */
  let browser;

  before(async function before() {
    this.timeout(10000);
    browser = await TestBrowser.create();
  });

  after(async () => browser.close());

  let page;
  let nock;

  beforeEach(async () => {
    page = await browser.openPage();
    nock = new Nock();
  });

  afterEach(async () => {
    await browser.closeAllPages();
    nock.done();
  });

  it('Bulk info plugin displays selection size', async () => {
    const { setup } = TESTS[0];
    nock.admin(setup, {
      route: 'status',
      type: 'admin',
    });
    const { checkPageResult: size } = await new SidekickTest({
      browser,
      page,
      fixture: SHAREPOINT_FIXTURE,
      url: setup.getUrl('edit', 'admin'),
      loadModule: true,
      checkPage: (p) => p.evaluate(() => {
        // get displayed selection size
        const info = window.hlx.sidekick.shadowRoot.getElementById('hlx-sk-bulk-info');
        const num = +(window.getComputedStyle(info, ':before')
          .getPropertyValue('content')
          .replaceAll('"', '')
          .split(' ')
          .shift());
        return Number.isNaN(num) ? 0 : num;
      }),
    }).run();
    assert.strictEqual(size, 1, 'Wrong selection size displayed');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Bulk info plugin refetches status after navigation', async () => {
    const { setup } = TESTS[0];
    nock.admin(setup, {
      route: 'status',
      type: 'admin',
      persist: true,
    });
    const { requestsMade } = await new SidekickTest({
      browser,
      page,
      fixture: SHAREPOINT_FIXTURE,
      url: setup.getUrl('edit', 'admin'),
      post: (p) => p.evaluate((url) => {
        document.getElementById('sidekick_test_location').value = `${url}&navigated=true`;
      }, setup.getUrl('edit', 'admin')),
      checkPage: (p) => p.evaluate(() => new Promise((resolve) => {
        // wait a bit
        setTimeout(resolve, 1000);
      })),
      loadModule: true,
    }).run();
    const statusReqs = requestsMade
      .filter((r) => r.url.startsWith('https://admin.hlx.page/status/'))
      .map((r) => r.url);
    assert.ok(
      statusReqs.length === 2,
      'Did not refetch status after navigation',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);
});
