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
} = require('./utils.js');
const { SidekickTest } = require('./SidekickTest.js');

describe('Test preview plugin', () => {
  before(startBrowser);
  after(stopBrowser);

  let page;
  beforeEach(async () => {
    page = await openPage();
  });

  afterEach(async () => {
    await closeAllPages();
  });

  it('Preview plugin switches to preview from gdrive URL', async () => {
    const { popupOpened } = await new SidekickTest({
      page,
      setup: 'pages',
      url: 'https://docs.google.com/document/d/2E1PNphAhTZAZrDjevM0BX7CZr7KjomuBO6xE1TUo9NU/edit',
      plugin: 'preview',
      waitPopup: 2000,
    }).run();
    assert.strictEqual(
      popupOpened,
      'https://main--pages--adobe.hlx.page/creativecloud/en/test',
      'Preview URL not opened',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Preview plugin switches to preview from onedrive URL', async () => {
    const { popupOpened } = await new SidekickTest({
      page,
      url: 'https://adobe.sharepoint.com/:w:/r/sites/TheBlog/_layouts/15/Doc.aspx?sourcedoc=%7BE8EC80CB-24C3-4B95-B082-C51FD8BC8760%7D&file=bla.docx&action=default&mobileredirect=true',
      plugin: 'preview',
      waitPopup: 2000,
    }).run();
    assert.strictEqual(
      popupOpened,
      'https://main--blog--adobe.hlx.page/en/topics/bla',
      'Preview URL not opened',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Preview plugin switches to preview from live URL', async () => {
    const { navigated } = await new SidekickTest({
      page,
      url: 'https://main--blog--adobe.hlx.live/en/topics/bla',
      plugin: 'preview',
      waitNavigation: 'https://main--blog--adobe.hlx.page/en/topics/bla',
    }).run();
    assert.strictEqual(
      navigated,
      'https://main--blog--adobe.hlx.page/en/topics/bla',
      'Preview URL not opened',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Preview plugin switches to preview from production URL', async () => {
    const { navigated } = await new SidekickTest({
      page,
      url: 'https://blog.adobe.com/en/topics/bla',
      plugin: 'preview',
      waitNavigation: 'https://main--blog--adobe.hlx.page/en/topics/bla',
    }).run();
    assert.strictEqual(
      navigated,
      'https://main--blog--adobe.hlx.page/en/topics/bla',
      'Preview URL not opened',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Preview plugin preserves query parameters and hash when switching to preview', async () => {
    const { navigated } = await new SidekickTest({
      page,
      url: 'https://main--blog--adobe.hlx.live/en/topics/bla?foo=bar',
      plugin: 'preview',
      waitNavigation: 'https://main--blog--adobe.hlx.page/en/topics/bla?foo=bar',
    }).run();
    assert.strictEqual(
      navigated,
      'https://main--blog--adobe.hlx.page/en/topics/bla?foo=bar',
      'Query parameters not preserved',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Preview plugin does not forward onedrive query parameters when switching to preview', async () => {
    const { popupOpened } = await new SidekickTest({
      page,
      url: 'https://adobe.sharepoint.com/:w:/r/sites/TheBlog/_layouts/15/Doc.aspx?sourcedoc=%7BE8EC80CB-24C3-4B95-B082-C51FD8BC8760%7D&file=bla.docx&action=default&mobileredirect=true',
      plugin: 'preview',
      waitPopup: 2000,
    }).run();
    assert.strictEqual(
      popupOpened,
      'https://main--blog--adobe.hlx.page/en/topics/bla',
      'Unexpected editor query parameters forwarded',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Edit-specific preview plugin updates preview when switching from editor', async () => {
    const { requestsMade } = await new SidekickTest({
      page,
      url: 'https://adobe.sharepoint.com/:x:/r/sites/TheBlog/_layouts/15/Doc.aspx?sourcedoc=%7BE8EC80CB-24C3-4B95-B082-C51FD8BC8760%7D&file=bla.docx&action=default&mobileredirect=true',
      plugin: 'edit-preview',
      waitPopup: 2000,
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

  it('Edit-specific preview plugin handles /.helix/config.json special case', async () => {
    const test = new SidekickTest({
      page,
      url: 'https://adobe.sharepoint.com/:w:/r/sites/TheBlog/_layouts/15/Doc.aspx?sourcedoc=%7BE8EC80CB-24C3-4B95-B082-C51FD8BC8760%7D&file=config.xlsx&action=default&mobileredirect=true',
      type: 'json',
      plugin: 'edit-preview',
      pluginSleep: 0,
      waitNavigation: 'https://main--blog--adobe.hlx.page/.helix/config.json',
    });
    test.apiResponses[0].webPath = '/.helix/config.json';
    const { popupOpened, notification } = await test.run();
    assert.ok(!popupOpened, 'Unexpected popup opened');
    assert.ok(notification.className.includes('modal-config-success'), `Unexpected notification classes: ${notification.className}`);
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Edit-specific preview plugin shows /.helix/* error message from server', async () => {
    const test = new SidekickTest({
      page,
      url: 'https://adobe.sharepoint.com/:x:/r/sites/TheBlog/_layouts/15/Doc.aspx?sourcedoc=%7BE8EC80CB-24C3-4B95-B082-C51FD8BC8760%7D&file=test.xlsx&action=default&mobileredirect=true',
      type: 'json',
      plugin: 'edit-preview',
      waitNavigation: 'https://main--blog--adobe.hlx.page/.helix/test.json',
    });
    test.apiResponses[0].webPath = '/.helix/test.json';
    test.apiResponses[1] = {
      status: 502,
      body: 'Bad Gateway',
      headers: {
        'x-error': 'foo',
      },
    };
    const { popupOpened, notification } = await test.run();
    assert.ok(!popupOpened, 'Unexpected popup opened');
    assert.strictEqual(notification.message, 'foo', `Unexpected notification message: ${notification.message}`);
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Edit-specific preview plugin shows update indicator if edit is newer than preview', async () => {
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
