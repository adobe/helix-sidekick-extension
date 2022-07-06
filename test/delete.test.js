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

describe('Test delete plugin', () => {
  before(startBrowser);
  after(stopBrowser);

  let page;
  beforeEach(async () => {
    page = await openPage();
  });

  afterEach(async () => {
    await closeAllPages();
  });

  it('Delete plugin uses preview API if page not published', async () => {
    const test = new SidekickTest({
      page,
      acceptDialogs: true,
      plugin: 'delete',
    });
    test.apiResponses[0].edit = {}; // no source doc
    test.apiResponses[0].live = {}; // not published
    const { dialog, requestsMade } = await test.run();
    const delReq = requestsMade.find((r) => r.method === 'DELETE');
    const homeReq = requestsMade.pop();
    assert.ok(
      dialog && dialog.message.includes('Are you sure you want to delete it?'),
      `Unexpected dialog: "${dialog}"`,
    );
    assert.ok(
      delReq && delReq.url.startsWith('https://admin.hlx.page/preview/'),
      'Preview API not called',
    );
    assert.ok(
      homeReq && homeReq.url === 'https://main--blog--adobe.hlx.page/',
      'Redirect to homepage not triggered',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Delete plugin uses preview and live API if page published', async () => {
    const test = new SidekickTest({
      page,
      acceptDialogs: true,
      plugin: 'delete',
    });
    test.apiResponses[0].edit = {}; // no source doc
    const { dialog, requestsMade } = await test.run();
    const delPreviewReq = requestsMade.find((r) => r.method === 'DELETE' && r.url.includes('/preview/'));
    const delLiveReq = requestsMade.find((r) => r.method === 'DELETE' && r.url.includes('/live/'));
    const homeReq = requestsMade.pop();
    assert.ok(
      dialog && dialog.message.includes('Are you sure you want to delete it?'),
      `Unexpected dialog: "${dialog}"`,
    );
    assert.ok(delPreviewReq, 'Preview API not called');
    assert.ok(delLiveReq, 'Live API not called');
    assert.ok(
      homeReq && homeReq.url === 'https://main--blog--adobe.hlx.page/',
      'Redirect to homepage not triggered',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Delete plugin uses code API', async () => {
    const test = new SidekickTest({
      page,
      type: 'xml',
      acceptDialogs: true,
      plugin: 'delete',
    });
    test.apiResponses[0].edit = {}; // no source doc
    const { dialog, requestsMade } = await test.run();
    const delReq = requestsMade.find((r) => r.method === 'DELETE');
    assert.ok(
      dialog && dialog.message.includes('Are you sure you want to delete it?'),
      `Unexpected dialog: "${dialog}"`,
    );
    assert.ok(
      delReq && delReq.url.startsWith('https://admin.hlx.page/code/'),
      'Code API not called',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('No delete plugin if source document exists', async () => {
    const { plugins } = await new SidekickTest({
      page,
    }).run();
    assert.ok(!plugins.find((p) => p.id === 'delete'), 'Unexpected delete plugin found');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('No delete plugin if preview does not exist', async () => {
    const test = new SidekickTest({
      page,
    });
    test.apiResponses[0].preview = {}; // no preview
    const { plugins } = await test.run();
    assert.ok(!plugins.find((p) => p.id === 'delete'), 'Unexpected delete plugin found');
  }).timeout(IT_DEFAULT_TIMEOUT);
});
