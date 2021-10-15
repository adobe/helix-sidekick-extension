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
/* global window */

'use strict';

const assert = require('assert');

const {
  IT_DEFAULT_TIMEOUT,
  MOCKS,
  getPlugins,
  mockStandardResponses,
  testPageRequests,
  sleep,
  getPage,
  startBrowser,
  stopBrowser,
} = require('./utils');

const fixturesPrefix = `file://${__dirname}/fixtures`;

describe('Test live plugin', () => {
  beforeEach(startBrowser);
  afterEach(stopBrowser);

  it('Live plugin switches to live from gdrive URL', async () => {
    const page = getPage();
    const apiMock = MOCKS.api.pages;
    await testPageRequests({
      page,
      url: `${fixturesPrefix}/preview-gdrive.html`,
      popupCheck: (req) => {
        if (req.url().includes('.hlx.live/')) {
          // check request to live url
          assert.ok(
            req.url() === `https://pages--adobe.hlx.live${apiMock.webPath}`,
            'Live URL not called',
          );
          return true;
        }
        // ignore otherwise
        return false;
      },
      mockResponses: [
        apiMock,
      ],
      plugin: 'live',
    });
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Live plugin without host in hlx3 mode', async () => {
    const page = getPage();
    await mockStandardResponses(page);
    // open test page
    await page.goto(`${fixturesPrefix}/config-hlx3-no-host.html`, { waitUntil: 'load' });
    await sleep();
    const plugins = await getPlugins(page);
    // check for live plugin
    assert.ok(plugins.find((plugin) => plugin.id === 'live'), 'Live plugin not shown');
    // check outerHost
    const outerHost = await page.evaluate(() => window.hlx.sidekick.config.outerHost);
    assert.strictEqual(
      outerHost,
      'main--theblog--adobe.hlx.live',
      `Outer CDN not as expected: ${outerHost}`,
    );
  }).timeout(IT_DEFAULT_TIMEOUT);
});
