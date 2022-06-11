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

describe('Test dev plugin', () => {
  beforeEach(startBrowser);
  afterEach(stopBrowser);

  it('Dev plugin hidden by default', async () => {
    const { plugins } = await new SidekickTest().run();
    assert.ok(
      plugins.find((p) => p.id === 'dev' && p.classes.includes('hlx-sk-advanced-only')),
      'Dev plugin not hidden by default',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Dev plugin switches to dev from gdrive URL', async () => {
    const { popupOpened } = await new SidekickTest({
      setup: 'pages',
      url: 'https://docs.google.com/document/d/2E1PNphAhTZAZrDjevM0BX7CZr7KjomuBO6xE1TUo9NU/edit',
      plugin: 'dev',
      pluginSleep: 2000,
    }).run();
    assert.strictEqual(
      popupOpened,
      'http://localhost:3000/creativecloud/en/test',
      'Dev URL not opened',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Dev plugin switches to dev from onedrive URL', async () => {
    const { popupOpened } = await new SidekickTest({
      url: 'https://adobe.sharepoint.com/:w:/r/sites/TheBlog/_layouts/15/Doc.aspx?sourcedoc=%7BE8EC80CB-24C3-4B95-B082-C51FD8BC8760%7D&file=bla.docx&action=default&mobileredirect=true',
      plugin: 'dev',
      pluginSleep: 2000,
    }).run();
    assert.strictEqual(
      popupOpened,
      'http://localhost:3000/en/topics/bla',
      'Dev URL not opened',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Dev plugin switches to dev from preview URL', async () => {
    const { requestsMade } = await new SidekickTest({
      plugin: 'dev',
    }).run();
    assert.strictEqual(
      requestsMade.pop().url,
      'http://localhost:3000/en/topics/bla',
      'Dev URL not opened',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Dev plugin switches to dev from production URL', async () => {
    const { requestsMade } = await new SidekickTest({
      url: 'https://blog.adobe.com/en/topics/bla',
      plugin: 'dev',
    }).run();
    assert.strictEqual(
      requestsMade.pop().url,
      'http://localhost:3000/en/topics/bla',
      'Live URL not opened',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);
});
