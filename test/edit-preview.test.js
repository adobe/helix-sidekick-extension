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

describe('Test editor preview plugin', () => {
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

  it('Editor preview plugin updates preview when switching from editor', async () => {
    const setup = new Setup('blog');
    nock.sidekick(setup);
    nock.admin(setup);
    nock('https://admin.hlx.page')
      .post('/preview/adobe/blog/main/en/topics/bla')
      .reply(201);
    nock('https://main--blog--adobe.hlx.page')
      .persist()
      .get(/.*/)
      .reply(200, 'blog adobe...');
    const { requestsMade } = await new SidekickTest({
      browser,
      page,
      url: 'https://adobe.sharepoint.com/:x:/r/sites/TheBlog/_layouts/15/Doc.aspx?sourcedoc=%7BE8EC80CB-24C3-4B95-B082-C51FD8BC8760%7D&file=bla.docx&action=default&mobileredirect=true',
      plugin: 'edit-preview',
      waitPopup: 2000,
      waitNavigation: 'https://main--blog--adobe.hlx.page/en/topics/bla',
      loadModule: true,
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
    const setup = new Setup('blog');
    nock.sidekick(setup);
    nock.admin(setup);
    nock('https://admin.hlx.page')
      // send 404 on first post
      .post('/preview/adobe/blog/main/en/topics/bla')
      .reply(404)
      // send 200 on 2nd post
      .post('/preview/adobe/blog/main/en/topics/bla')
      .reply(200)
      .get('/status/adobe/blog/main?editUrl=https%3A%2F%2Fadobe.sharepoint.com%2F%3Ax%3A%2Fr%2Fsites%2FTheBlog%2F_layouts%2F15%2FDoc.aspx%3Fsourcedoc%3D%257BE8EC80CB-24C3-4B95-B082-C51FD8BC8760%257D%26file%3Dbla.docx%26action%3Ddefault%26mobileredirect%3Dtrue')
      .reply(200, setup.apiResponse());
    nock('https://main--blog--adobe.hlx.page')
      .persist()
      .get(/.*/)
      .reply(200, 'blog adobe...');
    const { requestsMade } = await new SidekickTest({
      browser,
      page,
      url: 'https://adobe.sharepoint.com/:x:/r/sites/TheBlog/_layouts/15/Doc.aspx?sourcedoc=%7BE8EC80CB-24C3-4B95-B082-C51FD8BC8760%7D&file=bla.docx&action=default&mobileredirect=true',
      plugin: 'edit-preview',
      waitNavigation: 'https://main--blog--adobe.hlx.page/en/topics/bla',
      loadModule: true,
    }).run();
    const statusReqs = requestsMade
      .filter((r) => r.method === 'GET' && r.url.startsWith('https://admin.hlx.page/status/'));
    assert.strictEqual(statusReqs.length, 2, 'Did not refetch status before updating preview URL');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Editor preview plugin handles /.helix/config.json special case', async () => {
    const setup = new Setup('blog');
    setup.apiResponse().webPath = '/.helix/config.json';
    nock.sidekick(setup);
    nock.admin(setup);
    nock('https://admin.hlx.page')
      .post('/preview/adobe/blog/main/.helix/config.json')
      .reply(200);
    nock('https://main--blog--adobe.hlx.page')
      .get('/.helix/config.json')
      .reply(200, '{}');

    const { popupOpened, notification } = await new SidekickTest({
      browser,
      page,
      url: 'https://adobe.sharepoint.com/:w:/r/sites/TheBlog/_layouts/15/Doc.aspx?sourcedoc=%7BE8EC80CB-24C3-4B95-B082-C51FD8BC8760%7D&file=config.xlsx&action=default&mobileredirect=true',
      type: 'json',
      plugin: 'edit-preview',
      waitNavigation: 'https://main--blog--adobe.hlx.page/.helix/config.json',
      loadModule: true,
    }).run();
    assert.ok(!popupOpened, 'Unexpected popup opened');
    assert.strictEqual(
      notification.message,
      'Configuration successfully activated.',
      `Unexpected notification message: ${notification.message}`,
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Editor preview plugin shows /.helix/* error message from server', async () => {
    const setup = new Setup('blog');
    setup.apiResponse().webPath = '/.helix/config.json';
    nock.sidekick(setup);
    nock.admin(setup);
    nock.admin(setup);
    nock('https://admin.hlx.page')
      .post('/preview/adobe/blog/main/.helix/config.json')
      .twice()
      .reply(502, 'Bad Gateway', { 'x-error': 'foo' });

    const { popupOpened, notification } = await new SidekickTest({
      browser,
      page,
      url: 'https://adobe.sharepoint.com/:x:/r/sites/TheBlog/_layouts/15/Doc.aspx?sourcedoc=%7BE8EC80CB-24C3-4B95-B082-C51FD8BC8760%7D&file=test.xlsx&action=default&mobileredirect=true',
      type: 'json',
      plugin: 'edit-preview',
      waitNavigation: 'https://main--blog--adobe.hlx.page/.helix/test.json',
      loadModule: true,
    }).run();
    assert.ok(!popupOpened, 'Unexpected popup opened');
    assert.strictEqual(
      notification.message,
      'Failed to activate configuration: foo',
      `Unexpected notification message: ${notification.message}`,
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Editor preview plugin shows update indicator if edit is newer than preview', async () => {
    const setup = new Setup('blog');
    const previewLastMod = setup.apiResponse().preview.lastModified;
    setup.apiResponse().preview.lastModified = new Date(new Date(previewLastMod)
      .setFullYear(2020)).toUTCString();
    nock.sidekick(setup);
    nock.admin(setup);
    const { plugins } = await new SidekickTest({
      browser,
      page,
      url: 'https://adobe.sharepoint.com/:w:/r/sites/TheBlog/_layouts/15/Doc.aspx?sourcedoc=%7BE8EC80CB-24C3-4B95-B082-C51FD8BC8760%7D&file=bla.docx&action=default&mobileredirect=true',
    }).run();
    assert.ok(
      plugins.find((p) => p.id === 'edit-preview')?.classes.includes('update'),
      'Preview plugin without update class',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Editor preview plugin fails for office document from gdrive URL', async () => {
    const setup = new Setup('pages');
    setup.apiResponse().edit.sourceLocation = 'gdrive:1mfBb_tpzM4yYGdxMhRgrKEnBqboxsr';
    setup.apiResponse().edit.contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    nock.sidekick(setup);
    nock.admin(setup);
    const { popupOpened, notification } = await new SidekickTest({
      browser,
      page,
      setup: 'pages',
      url: 'https://docs.google.com/document/d/2E1PNphAhTZAZrDjevM0BX7CZr7KjomuBO6xE1TUo9NU/edit',
      plugin: 'edit-preview',
      waitPopup: 2000,
      loadModule: true,
    }).run();
    assert.ok(!popupOpened, 'Unexpected popup opened');
    assert.ok(
      notification.message.includes('Microsoft Excel'),
      `Unexpected notification message: ${notification.message}`,
    );
  }).timeout(IT_DEFAULT_TIMEOUT);
});
