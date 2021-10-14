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
  mockStandardResponses,
  getPlugins,
  sleep,
  getPage,
  startBrowser,
  stopBrowser,
} = require('./utils');

const fixturesPrefix = `file://${__dirname}/fixtures`;

describe('Test edit plugin', () => {
  beforeEach(startBrowser);
  afterEach(stopBrowser);

  it('Edit plugin switches to editor from preview URL', async () => {
    const page = getPage();
    const apiMock = MOCKS.api.blog;
    await testPageRequests({
      page,
      url: `${fixturesPrefix}/edit-staging.html`,
      popupCheck: (req) => {
        try {
          // check request to edit url
          assert.ok(req.url() === apiMock.edit.url, 'Edit URL not called');
          return true;
        } catch (e) {
          // ignore otherwise
          return false;
        }
      },
      mockResponses: [
        apiMock,
      ],
      plugin: 'edit',
      events: [
        'statusfetched',
        'contextloaded',
      ],
    });
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Edit plugin switches to editor from production URL', async () => {
    const page = getPage();
    const apiMock = MOCKS.api.blog;
    await testPageRequests({
      page,
      url: `${fixturesPrefix}/edit-production.html`,
      popupCheck: (req) => {
        try {
          // check request to edit url
          assert.ok(req.url() === apiMock.edit.url, 'Edit URL not called');
          return true;
        } catch (e) {
          // ignore otherwise
          return false;
        }
      },
      mockResponses: [
        apiMock,
      ],
      plugin: 'edit',
    });
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('No edit plugin without source document', async () => {
    const page = getPage();
    const apiMock = { ...MOCKS.api.blog };
    delete apiMock.edit;
    await mockStandardResponses(page, {
      mockResponses: [apiMock],
    });
    // open test page
    await page.goto(`${fixturesPrefix}/edit-staging.html`, { waitUntil: 'load' });
    await sleep();
    const plugins = await getPlugins(page);
    assert.ok(!plugins.find((p) => p.id === 'edit'), 'Unexpected edit plugin found');
  }).timeout(IT_DEFAULT_TIMEOUT);
});
