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

describe('Test production plugin', () => {
  beforeEach(startBrowser);
  afterEach(stopBrowser);

  it('Production plugin switches to production from gdrive URL', async () => {
    const page = getPage();
    const apiMock = MOCKS.api.pages;
    await testPageRequests({
      page,
      url: `${fixturesPrefix}/preview-gdrive.html`,
      popupCheck: (req) => {
        if (req.url().includes('.adobe.com/')) {
          // check request to production url
          assert.ok(
            req.url() === `https://pages.adobe.com${apiMock.webPath}`,
            'Production URL not called',
          );
          return true;
        }
        // ignore otherwise
        return false;
      },
      mockResponses: [
        apiMock,
      ],
      plugin: 'prod',
    });
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Production plugin switches to production from staging URL', async () => {
    const page = getPage();
    const apiMock = MOCKS.api.pages;
    await testPageRequests({
      page,
      url: `${fixturesPrefix}/is-preview.html`,
      check: (req) => {
        if (req.url().includes('.adobe.com/')) {
          // check request to production url
          assert.ok(
            req.url() === `https://blog.adobe.com${apiMock.webPath}`,
            'Production URL not called',
          );
          return true;
        }
        // ignore otherwise
        return false;
      },
      mockResponses: [
        apiMock,
      ],
      plugin: 'prod',
    });
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Production plugin switches to production from live URL', async () => {
    const page = getPage();
    const apiMock = MOCKS.api.pages;
    await testPageRequests({
      page,
      url: `${fixturesPrefix}/is-live.html`,
      check: (req) => {
        if (req.url().includes('.adobe.com/')) {
          // check request to production url
          assert.ok(
            req.url() === `https://blog.adobe.com${apiMock.webPath}`,
            'Production URL not called',
          );
          return true;
        }
        // ignore otherwise
        return false;
      },
      mockResponses: [
        apiMock,
      ],
      plugin: 'prod',
    });
  }).timeout(IT_DEFAULT_TIMEOUT);
});
