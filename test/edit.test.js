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

describe('Test edit plugin', () => {
  beforeEach(startBrowser);
  afterEach(stopBrowser);

  it('Edit plugin opens editor from preview URL', async () => {
    const { popupOpened } = await new SidekickTest({
      plugin: 'edit',
      pluginSleep: 3000,
    }).run();
    assert.ok(
      popupOpened && popupOpened.startsWith('https://login.microsoftonline.com/'),
      'Microsoft login page not shown',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Edit plugin opens editor from production URL', async () => {
    const { popupOpened } = await new SidekickTest({
      url: 'https://blog.adobe.com/en/topics/bla',
      plugin: 'edit',
      pluginSleep: 2000,
    }).run();
    assert.ok(
      popupOpened && popupOpened.startsWith('https://login.microsoftonline.com/'),
      'Microsoft login page not shown',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Edit plugin button disabled without source document', async () => {
    const test = new SidekickTest();
    delete test.apiResponses[0].edit;
    const { plugins } = await test.run();
    assert.ok(plugins.find((p) => p.id === 'edit' && !p.buttonEnabled), 'Edit plugin button not disabled');
  }).timeout(IT_DEFAULT_TIMEOUT);
});
