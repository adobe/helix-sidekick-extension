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

describe('Test unpublish plugin', () => {
  before(startBrowser);
  after(stopBrowser);

  let page;
  beforeEach(async () => {
    page = await openPage();
  });

  afterEach(async () => {
    await closeAllPages();
  });

  it('Unpublish plugin uses live API', async () => {
    const test = new SidekickTest({
      page,
      acceptDialogs: true,
      plugin: 'unpublish',
      waitNavigation: 'https://admin.hlx.page/live/adobe/blog/main/en/topics/bla',
    });
    test.apiResponses[0].edit = {}; // no source doc
    const { requestsMade } = await test.run();
    const unpublishReq = requestsMade.find((r) => r.method === 'DELETE');
    assert.ok(
      unpublishReq && unpublishReq.url.startsWith('https://admin.hlx.page/live/'),
      'Live API not called',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('No unpublish plugin if source document still exists', async () => {
    const { plugins } = await new SidekickTest({
      page,
    }).run();
    assert.ok(!plugins.find((p) => p.id === 'unpublish'), 'Unexpected unpublish plugin found');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('No unpublish plugin if page not published', async () => {
    const test = new SidekickTest({
      page,
    });
    test.apiResponses[0].edit = {}; // no source doc
    test.apiResponses[0].live = {}; // page not published
    const { plugins } = await test.run();
    assert.ok(!plugins.find((p) => p.id === 'unpublish'), 'Unexpected unpublish plugin found');
  }).timeout(IT_DEFAULT_TIMEOUT);
});
