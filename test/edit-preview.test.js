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
} = require('./utils.js');
const { SidekickTest } = require('./SidekickTest.js');

describe('Test editor preview preview plugin', () => {
  beforeEach(startBrowser);
  afterEach(stopBrowser);

  it('Editor preview preview plugin updates preview when switching from editor', async () => {
    const { requestsMade } = await new SidekickTest({
      url: 'https://adobe.sharepoint.com/:x:/r/sites/TheBlog/_layouts/15/Doc.aspx?sourcedoc=%7BE8EC80CB-24C3-4B95-B082-C51FD8BC8760%7D&file=bla.docx&action=default&mobileredirect=true',
      plugin: 'edit-preview',
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

  it('Editor preview preview plugin handles /.helix/config.json special case', async () => {
    const test = new SidekickTest({
      url: 'https://adobe.sharepoint.com/:w:/r/sites/TheBlog/_layouts/15/Doc.aspx?sourcedoc=%7BE8EC80CB-24C3-4B95-B082-C51FD8BC8760%7D&file=config.xlsx&action=default&mobileredirect=true',
      type: 'json',
      plugin: 'edit-preview',
    });
    test.apiResponses[0].webPath = '/.helix/config.json';
    const { popupOpened, notification } = await test.run();
    assert.ok(!popupOpened, 'Unexpected popup opened');
    assert.ok(notification.className.includes('modal-config-success'), `Unexpected notification classes: ${notification.className}`);
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Editor preview preview plugin shows /.helix/* error message from server', async () => {
    const test = new SidekickTest({
      url: 'https://adobe.sharepoint.com/:x:/r/sites/TheBlog/_layouts/15/Doc.aspx?sourcedoc=%7BE8EC80CB-24C3-4B95-B082-C51FD8BC8760%7D&file=test.xlsx&action=default&mobileredirect=true',
      type: 'json',
      plugin: 'edit-preview',
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

  it('Editor preview preview plugin shows update indicator if edit is newer than preview', async () => {
    const test = new SidekickTest({
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
