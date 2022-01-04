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

describe('Test unpublish plugin', () => {
  beforeEach(startBrowser);
  afterEach(stopBrowser);

  it('Unpublish plugin uses live API', async () => {
    const test = new SidekickTest({
      acceptDialogs: true,
      plugin: 'unpublish',
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
    const { plugins } = await new SidekickTest().run();
    assert.ok(!plugins.find((p) => p.id === 'unpublish'), 'Unexpected unpublish plugin found');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('No unpublish plugin if page not published', async () => {
    const test = new SidekickTest();
    test.apiResponses[0].edit = {}; // no source doc
    test.apiResponses[0].live = {}; // page not published
    const { plugins } = await test.run();
    assert.ok(!plugins.find((p) => p.id === 'unpublish'), 'Unexpected unpublish plugin found');
  }).timeout(IT_DEFAULT_TIMEOUT);
});
