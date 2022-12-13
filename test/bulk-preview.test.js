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

describe('Test bulk preview plugin', () => {
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

  it('Bulk preview plugin updates preview from selection in sharepoint folder view', async () => {
    nock.admin(new Setup('blog'), 'status', 'admin');
    nock('https://admin.hlx.page')
      .post('/preview/adobe/blog/main/documents/file.pdf')
      .reply(201);
    const { requestsMade } = await new SidekickTest({
      browser,
      page,
      fixture: 'admin-sharepoint.html',
      type: 'admin',
      url: 'https://adobe.sharepoint.com/sites/TheBlog/Shared%20Documents/Forms/AllItems.aspx?FolderCTID=0x0120004CC488DA1EFC304590C46DF3BE1EECC6&id=%2Fsites%2FTheBlog%2FShared%20Documents%2Fdocuments&viewid=91a3c9e8%2D58bf%2D47ea%2D8ea9%2De039dd257d40',
      plugin: 'bulk-preview',
      pre: (p) => p.evaluate(() => {
        setTimeout(() => {
          document.querySelector('[role="row"]').setAttribute('aria-selected', 'true');
        }, 500);
      }),
      acceptDialogs: true,
      sleep: 2000,
    }).run();
    const updateReq = requestsMade
      .filter((r) => r.method === 'POST')
      .find((r) => r.url.startsWith('https://admin.hlx.page/preview/'));
    assert.ok(
      updateReq,
      'Preview URL not updated',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);
});
