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

describe('Test unpublish plugin', () => {
  beforeEach(startBrowser);
  afterEach(stopBrowser);

  it('Unpublish plugin uses live API in hlx3 mode', async () => {
    const page = getPage();
    const apiMock = { ...MOCKS.api.blog };
    delete apiMock.edit;
    let apiCalled = false;
    // wait for delete confirmation dialog and accept it
    page.on('dialog', async (dialog) => {
      if (dialog.type() === 'confirm') {
        assert.ok(
          dialog.message().includes('Are you sure you want to unpublish it?'),
          `Unexpected dialog message: "${dialog.message()}"`,
        );
        dialog.accept();
      }
    });
    await testPageRequests({
      page,
      url: `${fixturesPrefix}/publish-staging-hlx3.html`,
      check: (req) => {
        if (!apiCalled && req.method() === 'DELETE') {
          // intercept api request
          apiCalled = req.url().endsWith(`/live/adobe/theblog/main${apiMock.webPath}`);
          return true;
        }
        return false;
      },
      checkCondition: (request) => request.url().startsWith('https://'),
      mockResponses: [
        apiMock,
        MOCKS.json,
      ],
      plugin: 'unpublish',
    });
    // check result
    assert.ok(apiCalled, 'Live API not called');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('No unpublish plugin if source document still exists', async () => {
    const page = getPage();
    await mockStandardResponses(page, {
      mockResponses: [MOCKS.api.blog],
    });
    // open test page
    await page.goto(`${fixturesPrefix}/reload-staging-hlx3.html`, { waitUntil: 'load' });
    await sleep();
    const plugins = await getPlugins(page);
    assert.ok(!plugins.find((p) => p.id === 'unpublish'), 'Unexpected unpublish plugin found');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('No unpublish plugin if page not published', async () => {
    const page = getPage();
    const apiMock = { ...MOCKS.api.blog };
    delete apiMock.edit;
    delete apiMock.live.lastModified;
    await mockStandardResponses(page, {
      mockResponses: [apiMock],
    });
    // open test page
    await page.goto(`${fixturesPrefix}/reload-staging-hlx3.html`, { waitUntil: 'load' });
    await sleep();
    const plugins = await getPlugins(page);
    assert.ok(!plugins.find((p) => p.id === 'unpublish'), 'Unexpected unpublish plugin found');
  }).timeout(IT_DEFAULT_TIMEOUT);
});
