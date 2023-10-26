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

import assert from 'assert';
import {
  IT_DEFAULT_TIMEOUT, Nock, Setup, TestBrowser,
} from './utils.js';

import { SidekickTest } from './SidekickTest.js';

const TESTS = [{
  env: 'sharepoint',
  setup: new Setup('blog'),
  fixtureList: 'admin-sharepoint.html',
  fixtureGrid: 'admin-sharepoint-grid.html',
}, {
  env: 'gdrive',
  setup: new Setup('pages'),
  fixtureList: 'admin-gdrive.html',
  fixtureGrid: 'admin-gdrive-grid.html',
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

  TESTS.forEach(({
    env, fixtureList, fixtureGrid, setup,
  }) => {
    it(`Bulk info plugin displays selection size in ${env} list view`, async () => {
      nock.sidekick();
      nock.admin(setup, {
        route: 'status',
        type: 'admin',
      });
      const { checkPageResult: sizeCheck } = await new SidekickTest({
        browser,
        page,
        fixture: fixtureList,
        url: setup.getUrl('edit', 'admin'),
        loadModule: true,
        checkPage: (p) => p.evaluate(() => {
          // get displayed selection size
          const info = window.hlx.sidekick.shadowRoot.getElementById('hlx-sk-bulk-info');
          const num = +(info.textContent
            .split(' ')
            .shift());
          return Number.isNaN(num) ? false : num === 1;
        }),
      }).run();
      assert.ok(sizeCheck, 'Wrong selection size displayed');
    }).timeout(IT_DEFAULT_TIMEOUT);

    it(`Bulk info plugin displays selection size in ${env} grid view`, async () => {
      nock.sidekick();
      nock.admin(setup, {
        route: 'status',
        type: 'admin',
      });
      const { checkPageResult: sizeCheck } = await new SidekickTest({
        browser,
        page,
        fixture: fixtureGrid,
        url: setup.getUrl('edit', 'admin'),
        loadModule: true,
        checkPage: (p) => p.evaluate(() => {
          // get displayed selection size
          const info = window.hlx.sidekick.shadowRoot.getElementById('hlx-sk-bulk-info');
          const num = +(info.textContent
            .split(' ')
            .shift());
          return Number.isNaN(num) ? false : num === 2;
        }),
      }).run();
      assert.ok(sizeCheck, 'Wrong selection size displayed');
    }).timeout(IT_DEFAULT_TIMEOUT);
  });
});
