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

describe('Test reload plugin', () => {
  let browser;

  before(async function before() {
    this.timeout(10000);
    browser = await startBrowser();
  });
  after(async () => stopBrowser(browser));

  let page;
  beforeEach(async () => {
    page = await openPage(browser);
  });

  afterEach(async () => {
    await closeAllPages(browser);
  });

  it('Reload plugin uses preview API', async () => {
    const { requestsMade, navigated } = await new SidekickTest({
      page,
      plugin: 'reload',
      waitNavigation: 'https://main--blog--adobe.hlx.page/en/topics/bla',
    }).run();
    const reloadReq = requestsMade.find((r) => r.method === 'POST');
    assert.ok(
      reloadReq && reloadReq.url.startsWith('https://admin.hlx.page/preview/'),
      'Preview URL not updated',
    );
    assert.ok(
      navigated,
      'Reload not triggered',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Reload plugin uses code API', async () => {
    const { requestsMade, navigated } = await new SidekickTest({
      page,
      type: 'xml',
      plugin: 'reload',
      waitNavigation: 'https://main--blog--adobe.hlx.page/en/bla.xml',
    }).run();
    const reloadReq = requestsMade.find((r) => r.method === 'POST');
    assert.ok(
      reloadReq && reloadReq.url.startsWith('https://admin.hlx.page/code/'),
      'Code API not called',
    );
    assert.ok(navigated, 'Reload not triggered');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Reload plugin busts client cache', async () => {
    const { requestsMade } = await new SidekickTest({
      page,
      plugin: 'reload',
      waitNavigation: 'https://main--blog--adobe.hlx.page/en/topics/bla',
    }).run();
    const afterReload = requestsMade.slice(requestsMade.findIndex((r) => r.method === 'POST') + 1);
    assert.ok(
      afterReload[0] && afterReload[0].url.startsWith('https://main--blog--adobe.hlx.page/'),
      'Client cache not busted',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Reload plugin button disabled without source document', async () => {
    const test = new SidekickTest({
      page,
    });
    test.apiResponses[0].edit = {}; // no source doc
    const { plugins } = await test.run();
    assert.ok(plugins.find((p) => p.id === 'reload' && !p.buttonEnabled), 'Reload plugin button not disabled');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Reload plugin shows update indicator if edit is newer than preview', async () => {
    const test = new SidekickTest({
      page,
    });
    const previewLastMod = test.apiResponses[0].preview.lastModified;
    test.apiResponses[0].preview.lastModified = new Date(new Date(previewLastMod)
      .setFullYear(2020)).toUTCString();
    const { plugins } = await test.run();
    assert.ok(
      plugins.find((p) => p.id === 'reload')?.classes.includes('update'),
      'Reload plugin without update class',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);
});
