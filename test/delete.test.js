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
  getPlugins,
  mockStandardResponses,
  testPageRequests,
  sleep,
  getPage,
  startBrowser,
  stopBrowser,
} = require('./utils');

const fixturesPrefix = `file://${__dirname}/fixtures`;

describe('Test delete plugin', () => {
  beforeEach(startBrowser);
  afterEach(stopBrowser);

  it('Delete plugin sends purge request from preview URL and redirects to homepage', async () => {
    const page = getPage();
    const apiMock = { ...MOCKS.api.blog };
    delete apiMock.edit;
    let purged = false;
    let redirected = false;
    // wait for delete confirmation dialog and accept it
    page.on('dialog', async (dialog) => {
      if (dialog.type() === 'confirm') {
        assert.ok(
          dialog.message().includes('Are you sure you want to delete it?'),
          `Unexpected dialog message: "${dialog.message()}"`,
        );
        dialog.accept();
      }
    });
    await testPageRequests({
      page,
      url: `${fixturesPrefix}/reload-staging.html`,
      check: (req) => {
        if (!purged && req.method() === 'POST') {
          // intercept purge request
          const headers = req.headers();
          purged = req.url() === `https://theblog--adobe.hlx.page${apiMock.webPath}`
            && headers['x-forwarded-host'] === 'master--theblog--adobe.hlx.page';
        } else if (req.url() === 'https://theblog--adobe.hlx.page/') {
          redirected = true;
          return true;
        }
        return false;
      },
      checkCondition: (request) => request.url().startsWith('https://')
        || request.url().endsWith('reload-staging.html'),
      mockResponses: [
        apiMock,
        MOCKS.purge,
      ],
      plugin: 'delete',
    });
    // check result
    assert.ok(purged, 'Purge request not sent');
    assert.ok(redirected, 'Redirect to homepage not triggered');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Delete plugin uses preview API in hlx3 mode', async () => {
    const page = getPage();
    const apiMock = { ...MOCKS.api.blog };
    delete apiMock.edit;
    let apiCalled = false;
    let redirected = false;
    // wait for delete confirmation dialog and accept it
    page.on('dialog', async (dialog) => {
      if (dialog.type() === 'confirm') {
        assert.ok(
          dialog.message().includes('Are you sure you want to delete it?'),
          `Unexpected dialog message: "${dialog.message()}"`,
        );
        dialog.accept();
      }
    });
    await testPageRequests({
      page,
      url: `${fixturesPrefix}/reload-staging-hlx3.html`,
      check: (req) => {
        if (!apiCalled && req.method() === 'DELETE') {
          // intercept api request
          apiCalled = req.url().endsWith(`/preview/adobe/theblog/master${apiMock.webPath}`);
        } else if (req.url() === 'https://master--theblog--adobe.hlx3.page/') {
          // reload triggered
          redirected = true;
          return true;
        }
        return false;
      },
      checkCondition: (request) => request.url().startsWith('https://')
        || request.url().endsWith('reload-staging-hlx3.html'),
      mockResponses: [
        apiMock,
        'deleted',
      ],
      plugin: 'delete',
    });
    // check result
    assert.ok(apiCalled, 'Preview API not called');
    assert.ok(redirected, 'Redirect to homepage not triggered');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('No delete plugin if source document exists', async () => {
    const page = getPage();
    await mockStandardResponses(page, {
      mockResponses: [MOCKS.api.blog],
    });
    // open test page
    await page.goto(`${fixturesPrefix}/reload-staging.html`, { waitUntil: 'load' });
    await sleep();
    const plugins = await getPlugins(page);
    assert.ok(!plugins.find((p) => p.id === 'delete'), 'Unexpected delete plugin found');
  }).timeout(IT_DEFAULT_TIMEOUT);
});
