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

'use strict';

const assert = require('assert');

const {
  IT_DEFAULT_TIMEOUT,
  startBrowser,
  stopBrowser,
  openPage,
  closeAllPages,
  Nock,
} = require('./utils.js');
const { SidekickTest } = require('./SidekickTest.js');

describe('Test editor preview plugin', () => {
  let browser;

  before(async function before() {
    this.timeout(10000);
    browser = await startBrowser();
  });
  after(async () => stopBrowser(browser));

  let page;
  let nock;

  beforeEach(async () => {
    page = await openPage(browser);
    nock = new Nock();
  });

  afterEach(async () => {
    await closeAllPages(browser);
    nock.done();
  });

  it('Editor preview preview plugin updates preview when switching from editor', async () => {
    nock('https://main--blog--adobe.hlx.page')
      .get('/en/topics/bla')
      .reply(200, 'blog adobe...');
    const { requestsMade } = await new SidekickTest({
      page,
      url: 'https://adobe.sharepoint.com/:x:/r/sites/TheBlog/_layouts/15/Doc.aspx?sourcedoc=%7BE8EC80CB-24C3-4B95-B082-C51FD8BC8760%7D&file=bla.docx&action=default&mobileredirect=true',
      plugin: 'edit-preview',
      waitPopup: 2000,
      waitNavigation: [
        'https://admin.hlx.page/preview/adobe/blog/main/en/topics/bla',
        'https://main--blog--adobe.hlx.page/en/topics/bla',
      ],
    }).run();
    const updateReq = requestsMade
      .filter((r) => r.method === 'POST')
      .find((r) => r.url.startsWith('https://admin.hlx.page/preview/'));
    assert.ok(
      updateReq,
      'Preview URL not updated',
    );
    const afterUpdate = requestsMade.slice(requestsMade.indexOf(updateReq) + 1);
    assert.ok(
      afterUpdate[0] && afterUpdate[0].url.startsWith('https://main--blog--adobe.hlx.page/'),
      'Client cache not busted',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Editor preview plugin refetches status and retries on error', async () => {
    const test = new SidekickTest({
      page,
      url: 'https://adobe.sharepoint.com/:x:/r/sites/TheBlog/_layouts/15/Doc.aspx?sourcedoc=%7BE8EC80CB-24C3-4B95-B082-C51FD8BC8760%7D&file=bla.docx&action=default&mobileredirect=true',
      plugin: 'edit-preview',
      waitNavigation: [
        'https://main--blog--adobe.hlx.page/en/topics/bla',
      ],
    });
    // send 404 on first post
    test.apiResponses.push({
      status: 404,
      body: 'not found',
    });
    test.apiResponses.push({ ...test.apiResponses[0] }); // resend status
    const { requestsMade } = await test.run();
    const statusReqs = requestsMade
      .filter((r) => r.method === 'GET' && r.url.startsWith('https://admin.hlx.page/status/'));
    assert.strictEqual(statusReqs.length, 2, 'Did not refetch status before updating preview URL');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Editor preview preview plugin handles /.helix/config.json special case', async () => {
    const test = new SidekickTest({
      page,
      url: 'https://adobe.sharepoint.com/:w:/r/sites/TheBlog/_layouts/15/Doc.aspx?sourcedoc=%7BE8EC80CB-24C3-4B95-B082-C51FD8BC8760%7D&file=config.xlsx&action=default&mobileredirect=true',
      type: 'json',
      plugin: 'edit-preview',
      waitNavigation: [
        'https://admin.hlx.page/preview/adobe/blog/main/.helix/config.json',
        'https://main--blog--adobe.hlx.page/.helix/config.json',
      ],
    });
    test.apiResponses[0].webPath = '/.helix/config.json';
    const { popupOpened, notification } = await test.run();
    assert.ok(!popupOpened, 'Unexpected popup opened');
    assert.ok(notification.className.includes('modal-config-success'), `Unexpected notification classes: ${notification.className}`);
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Editor preview plugin shows /.helix/* error message from server', async () => {
    const test = new SidekickTest({
      page,
      url: 'https://adobe.sharepoint.com/:x:/r/sites/TheBlog/_layouts/15/Doc.aspx?sourcedoc=%7BE8EC80CB-24C3-4B95-B082-C51FD8BC8760%7D&file=test.xlsx&action=default&mobileredirect=true',
      type: 'json',
      plugin: 'edit-preview',
      waitNavigation: [
        'https://admin.hlx.page/preview/adobe/blog/main/.helix/test.json',
        'https://main--blog--adobe.hlx.page/.helix/test.json',
      ],
    });
    test.apiResponses[0].webPath = '/.helix/test.json';
    // send error
    test.apiResponses.push({
      status: 502,
      body: 'Bad Gateway',
      headers: {
        'x-error': 'foo',
      },
    });
    test.apiResponses.push({ ...test.apiResponses[0] }); // resend status
    test.apiResponses.push({ ...test.apiResponses[1] }); // resend error
    const { popupOpened, notification } = await test.run();
    assert.ok(!popupOpened, 'Unexpected popup opened');
    assert.strictEqual(notification.message, 'foo', `Unexpected notification message: ${notification.message}`);
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Editor preview preview plugin shows update indicator if edit is newer than preview', async () => {
    const test = new SidekickTest({
      page,
      url: 'https://adobe.sharepoint.com/:w:/r/sites/TheBlog/_layouts/15/Doc.aspx?sourcedoc=%7BE8EC80CB-24C3-4B95-B082-C51FD8BC8760%7D&file=bla.docx&action=default&mobileredirect=true',
    });
    const previewLastMod = test.apiResponses[0].preview.lastModified;
    test.apiResponses[0].preview.lastModified = new Date(new Date(previewLastMod)
      .setFullYear(2020)).toUTCString();
    const { plugins } = await test.run();
    assert.ok(
      plugins.find((p) => p.id === 'edit-preview')?.classes.includes('update'),
      'Preview plugin without update class',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);
});
