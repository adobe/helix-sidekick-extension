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

describe('Test live plugin', () => {
  beforeEach(startBrowser);
  afterEach(stopBrowser);

  it('Live plugin without production host', async () => {
    const { plugins } = await new SidekickTest().run();
    assert.ok(plugins.find((p) => p.id === 'live'), 'Live plugin not found');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Live plugin switches to live from gdrive URL', async () => {
    const { popupOpened } = await new SidekickTest({
      setup: 'pages',
      url: 'https://docs.google.com/document/d/2E1PNphAhTZAZrDjevM0BX7CZr7KjomuBO6xE1TUo9NU/edit',
      plugin: 'live',
      pluginSleep: 2000,
    }).run();
    assert.strictEqual(
      popupOpened,
      'https://main--pages--adobe.hlx.live/creativecloud/en/test',
      'Live URL not opened',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Live plugin switches to live from onedrive URL', async () => {
    const { popupOpened } = await new SidekickTest({
      url: 'https://adobe.sharepoint.com/:w:/r/sites/TheBlog/_layouts/15/Doc.aspx?sourcedoc=%7BE8EC80CB-24C3-4B95-B082-C51FD8BC8760%7D&file=bla.docx&action=default&mobileredirect=true',
      plugin: 'live',
      pluginSleep: 2000,
    }).run();
    assert.strictEqual(
      popupOpened,
      'https://main--blog--adobe.hlx.live/en/topics/bla',
      'Live URL not opened',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Live plugin switches to live from preview URL', async () => {
    const { requestsMade } = await new SidekickTest({
      plugin: 'live',
    }).run();
    assert.strictEqual(
      requestsMade.pop().url,
      'https://main--blog--adobe.hlx.live/en/topics/bla',
      'Live URL not opened',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Live plugin switches to live from production URL', async () => {
    const { requestsMade } = await new SidekickTest({
      url: 'https://blog.adobe.com/en/topics/bla',
      plugin: 'live',
    }).run();
    assert.strictEqual(
      requestsMade.pop().url,
      'https://main--blog--adobe.hlx.live/en/topics/bla',
      'Live URL not opened',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('No live plugin if page not published', async () => {
    const test = new SidekickTest();
    test.apiResponses[0].live = {};
    const { plugins } = await test.run();
    assert.ok(!plugins.find((p) => p.id === 'live'), 'Unexpected live plugin found');
  }).timeout(IT_DEFAULT_TIMEOUT);
});
