/*
 * Copyright 2021 Adobe. All rights reserved.
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

describe('Test reload plugin', () => {
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

  it('Reload plugin uses preview API', async () => {
    const setup = new Setup('blog');
    nock.sidekick(setup);
    nock.admin(setup);
    nock('https://admin.hlx.page')
      .post('/preview/adobe/blog/main/en/topics/bla')
      .reply(200);
    nock('https://main--blog--adobe.hlx.page')
      .get('/en/topics/bla')
      .reply(200);

    let preventReload = false;
    await new SidekickTest({
      browser,
      page,
      plugin: 'reload',
      pluginWait: 1000,
      // waitNavigation: 'https://main--blog--adobe.hlx.page/en/topics/bla',
      // this is a bit hairy, because the sidekick does a window.location.reload() which is the
      // generic.html in this case. the problem is that it will discard the sidekick js, which
      // will fail the page evaluations in SidekickTest.js
      requestHandler: (req) => {
        if (req.url.endsWith('/test/fixtures/generic.html')) {
          if (preventReload) {
            return -1;
          }
          preventReload = true;
        }
        return null;
      },
    }).run();
    assert.ok(
      preventReload,
      'Reload not triggered',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Reload plugin uses code API', async () => {
    const setup = new Setup('blog');
    nock.sidekick(setup);
    nock.admin(setup);
    nock('https://admin.hlx.page')
      .post('/code/adobe/blog/main/en/topics/bla')
      .reply(200);
    nock('https://main--blog--adobe.hlx.page')
      .get('/en/topics/bla')
      .reply(200);
    let preventReload = false;
    const { requestsMade } = await new SidekickTest({
      browser,
      page,
      type: 'xml',
      plugin: 'reload',
      pluginWait: 1000,
      // waitNavigation: 'https://main--blog--adobe.hlx.page/en/bla.xml',
      requestHandler: (req) => {
        if (req.url.endsWith('/test/fixtures/generic.html')) {
          if (preventReload) {
            return -1;
          }
          preventReload = true;
        }
        return null;
      },
    }).run();
    const reloadReq = requestsMade.find((r) => r.method === 'POST');
    assert.ok(
      reloadReq && reloadReq.url.startsWith('https://admin.hlx.page/code/'),
      'Code API not called',
    );
    assert.ok(preventReload, 'Reload not triggered');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Reload plugin button disabled without source document', async () => {
    const setup = new Setup('blog');
    setup.apiResponse().edit = {};
    nock.sidekick(setup);
    nock.admin(setup);
    const { plugins } = await new SidekickTest({
      browser,
      page,
    }).run();
    assert.ok(plugins.find((p) => p.id === 'reload' && !p.buttonEnabled), 'Reload plugin button not disabled');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Reload plugin shows update indicator if edit is newer than preview', async () => {
    const setup = new Setup('blog');
    const previewLastMod = setup.apiResponse().preview.lastModified;
    setup.apiResponse().preview.lastModified = new Date(new Date(previewLastMod)
      .setFullYear(2020)).toUTCString();
    nock.sidekick(setup);
    nock.admin(setup);
    const { plugins } = await new SidekickTest({
      browser,
      page,
    }).run();
    assert.ok(
      plugins.find((p) => p.id === 'reload')?.classes.includes('update'),
      'Reload plugin without update class',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);
});
