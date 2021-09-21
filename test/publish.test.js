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

describe('Test publish plugin', () => {
  beforeEach(startBrowser);
  afterEach(stopBrowser);

  it('Publish plugin sends purge request from preview URL and redirects to production URL', async () => {
    const page = getPage();
    const apiMock = MOCKS.api.blog;
    let purged = false;
    let redirected = false;
    await testPageRequests({
      page,
      url: `${fixturesPrefix}/publish-staging.html`,
      check: (req) => {
        if (!purged && req.method() === 'POST') {
          // intercept purge request
          const headers = req.headers();
          purged = req.url() === `https://theblog--adobe.hlx.page${apiMock.webPath}`
            && headers['x-forwarded-host'].split(',').length === 3;
        } else if (req.url().startsWith('https://blog.adobe.com')) {
          // intercept redirect to production
          redirected = true;
          return true;
        }
        return false;
      },
      mockResponses: [
        apiMock,
        MOCKS.purge,
      ],
      plugin: 'publish',
    });
    // check result
    assert.ok(purged, 'Purge request not sent');
    assert.ok(redirected, 'Redirect not sent');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Publish plugin also purges dependencies', async () => {
    const page = getPage();
    const apiMock = MOCKS.api.blog;
    const dependencies = [
      '/en/topics/foo.html',
      'bar.html?step=1',
    ];
    const purged = [];
    await testPageRequests({
      page,
      url: `${fixturesPrefix}/publish-staging.html`,
      prep: async (p) => {
        // add publish dependencies
        await p.evaluate((deps) => {
          window.hlx.dependencies = deps;
        }, dependencies);
      },
      check: (req) => {
        if (req.method() === 'POST') {
          // check result
          const purgeUrl = new URL(req.url());
          purged.push(`${purgeUrl.pathname}${purgeUrl.search}`);
        }
        return purged.length === 3;
      },
      mockResponses: [
        apiMock,
        MOCKS.purge,
        MOCKS.purge,
        MOCKS.purge,
      ],
      plugin: 'publish',
    });
    assert.deepStrictEqual(purged, [
      '/en/topics/bla.html',
      '/en/topics/foo.html',
      '/en/topics/bar.html?step=1',
    ], 'Purge request not sent');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Publish plugin refuses to publish without production host', async () => {
    const page = getPage();
    const apiMock = MOCKS.api.blog;
    let noPurge = true;
    await testPageRequests({
      page,
      url: `${fixturesPrefix}/publish-staging.html`,
      prep: async (p) => {
        // remove production host from config
        await p.evaluate(() => {
          delete window.hlx.sidekick.config.outerHost;
          delete window.hlx.sidekick.config.host;
        });
      },
      check: (req) => {
        if (req.method() === 'POST') {
          // intercept purge request
          noPurge = false;
          return true;
        }
        return false;
      },
      mockResponses: [
        apiMock,
      ],
      plugin: 'publish',
      timeout: 5000,
    });
    assert.ok(noPurge, 'Did not purge inner host only');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Publish plugin uses publish API in hlx3 mode', async () => {
    const page = getPage();
    const apiMock = MOCKS.api.blog;
    let apiCalled = false;
    let redirected = false;
    await testPageRequests({
      page,
      url: `${fixturesPrefix}/publish-staging-hlx3.html`,
      check: (req) => {
        if (!apiCalled && req.method() === 'POST') {
          // intercept purge request
          apiCalled = req.url().endsWith('/live/adobe/theblog/main/en/topics/bla.html');
        } else if (req.url().startsWith('https://blog.adobe.com')) {
          redirected = true;
          return true;
        }
        return false;
      },
      mockResponses: [
        apiMock,
        apiMock,
        MOCKS.html,
        MOCKS.html,
      ],
      plugin: 'publish',
    });
    // check result
    assert.ok(apiCalled, 'Purge request not sent');
    assert.ok(redirected, 'Redirect not sent');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Publish plugin redirects to live instead of bring-your-own-CDN production host', async () => {
    const page = getPage();
    const apiMock = MOCKS.api.blog;
    let redirected = false;
    await testPageRequests({
      page,
      url: `${fixturesPrefix}/publish-staging.html`,
      prep: async (p) => {
        // set byocdn flag
        await p.evaluate(() => {
          window.hlx.sidekick.config.byocdn = true;
        });
      },
      check: (req) => {
        if (req.url().startsWith('https://theblog--adobe.hlx.live')) {
          // intercept redirect to live
          redirected = true;
          return true;
        }
        return false;
      },
      mockResponses: [
        apiMock,
        MOCKS.purge,
      ],
      plugin: 'publish',
    });
    // check result
    assert.ok(redirected, 'Redirect to live not sent');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('No publish plugin on bring-your-own-CDN production host', async () => {
    const page = getPage();
    await mockStandardResponses(page);
    // open test page
    await page.goto(`${fixturesPrefix}/publish-byocdn.html`, { waitUntil: 'load' });
    await sleep();
    const plugins = await getPlugins(page);
    assert.ok(!plugins.find((p) => p.id === 'publish'), 'Unexpected publish plugin found');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('No publish plugin without source document', async () => {
    const page = getPage();
    const apiMock = { ...MOCKS.api.blog };
    delete apiMock.edit;
    await mockStandardResponses(page, {
      mockResponses: [apiMock],
    });
    // open test page
    await page.goto(`${fixturesPrefix}/publish-staging.html`, { waitUntil: 'load' });
    await sleep();
    const plugins = await getPlugins(page);
    assert.ok(!plugins.find((p) => p.id === 'publish'), 'Unexpected publish plugin found');
  }).timeout(IT_DEFAULT_TIMEOUT);
});
