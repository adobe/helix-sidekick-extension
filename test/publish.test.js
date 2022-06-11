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

describe('Test publish plugin', () => {
  beforeEach(startBrowser);
  afterEach(stopBrowser);

  it('Publish plugin uses live API', async () => {
    const { requestsMade, navigated } = await new SidekickTest({
      plugin: 'publish',
    }).run();
    const publishReq = requestsMade.find((r) => r.method === 'POST');
    assert.ok(
      publishReq && publishReq.url.startsWith('https://admin.hlx.page/live/'),
      'Live API not called',
    );
    assert.strictEqual(navigated, 'https://blog.adobe.com/en/topics/bla', 'Redirect not sent');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Publish plugin also publishes dependencies', async () => {
    const { requestsMade } = await new SidekickTest({
      plugin: 'publish',
      post: (p) => p.evaluate(() => {
        window.hlx.dependencies = [
          '/en/topics/foo',
          'bar',
        ];
      }),
    }).run();
    const publishPaths = requestsMade.filter((r) => r.method === 'POST').map((r) => new URL(r.url).pathname);
    assert.strictEqual(publishPaths.length, 3, 'Unexpected number of publish requests');
    assert.ok(
      publishPaths[1].endsWith('/en/topics/foo') && publishPaths[2].endsWith('/en/topics/bar'),
      'Dependencies not published in expected order',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Publish plugin busts client cache', async () => {
    const { requestsMade } = await new SidekickTest({
      plugin: 'publish',
    }).run();
    const afterPublish = requestsMade.slice(requestsMade.findIndex((r) => r.method === 'POST') + 1);
    assert.ok(
      afterPublish[0] && afterPublish[0].url.startsWith('https://main--blog--adobe.hlx.live/'),
      'Client cache for live not busted',
    );
    assert.ok(
      afterPublish[1] && afterPublish[1].url.startsWith('https://blog.adobe.com/'),
      'Client cache for production not busted',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Publish plugin button disabled without source document', async () => {
    const test = new SidekickTest({
      url: 'https://blog.adobe.com/en/topics/bla',
    });
    test.apiResponses[0].edit = {}; // no source doc
    const { plugins } = await test.run();
    assert.ok(plugins.find((p) => p.id === 'publish' && !p.buttonEnabled), 'Publish plugin button not disabled');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Publish plugin shows update indicator if preview is newer than live', async () => {
    const test = new SidekickTest();
    const liveLastMod = test.apiResponses[0].live.lastModified;
    test.apiResponses[0].live.lastModified = new Date(new Date(liveLastMod)
      .setFullYear(2019)).toUTCString();
    const { plugins } = await test.run();
    assert.ok(
      plugins.find((p) => p.id === 'publish')?.classes.includes('update'),
      'Publish plugin without update class',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);
});
