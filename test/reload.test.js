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
  MOCKS,
  testPageRequests,
  getPage,
  startBrowser,
  stopBrowser,
} = require('./utils');

const fixturesPrefix = `file://${__dirname}/fixtures`;

describe('Test reload plugin', () => {
  beforeEach(startBrowser);
  afterEach(stopBrowser);

  it('Reload plugin sends purge request from preview URL and reloads page', async () => {
    const page = getPage();
    const apiMock = MOCKS.api.blog;
    let loads = 0;
    let purged = false;
    let reloaded = false;
    await testPageRequests({
      page,
      url: `${fixturesPrefix}/reload-staging.html`,
      check: (req) => {
        if (!purged && req.method() === 'POST') {
          // intercept purge request
          const headers = req.headers();
          purged = req.url() === `https://theblog--adobe.hlx.page${apiMock.webPath}`
            && headers['x-forwarded-host'] === 'master--theblog--adobe.hlx.page';
        } else if (req.url().endsWith('reload-staging.html')) {
          loads += 1;
          if (loads === 2) {
            reloaded = true;
            return true;
          }
        }
        return false;
      },
      checkCondition: (request) => request.url().startsWith('https://')
        || request.url().endsWith('reload-staging.html'),
      mockResponses: [
        apiMock,
        MOCKS.purge,
      ],
      plugin: 'reload',
    });
    // check result
    assert.ok(purged, 'Purge request not sent');
    assert.ok(reloaded, 'Reload not triggered');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Reload plugin uses preview API in hlx3 mode', async () => {
    const page = getPage();
    const apiMock = MOCKS.api.blog;
    let loads = 0;
    let apiCalled = false;
    let reloaded = false;
    await testPageRequests({
      page,
      url: `${fixturesPrefix}/reload-staging-hlx3.html`,
      check: (req) => {
        if (!apiCalled && req.method() === 'POST') {
          // intercept api request
          apiCalled = req.url().endsWith(`/preview/adobe/theblog/master${apiMock.webPath}`);
        } else if (req.url().endsWith('reload-staging-hlx3.html')) {
          loads += 1;
          if (loads === 2) {
            // reload triggered
            reloaded = true;
            return true;
          }
        }
        return false;
      },
      checkCondition: (request) => request.url().startsWith('https://')
        || request.url().endsWith('reload-staging-hlx3.html'),
      mockResponses: [
        apiMock,
        apiMock,
      ],
      plugin: 'reload',
    });
    // check result
    assert.ok(apiCalled, 'Preview API not called');
    assert.ok(reloaded, 'Reload not triggered');
  }).timeout(IT_DEFAULT_TIMEOUT);
});
