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

describe('Test preview plugin', () => {
  beforeEach(startBrowser);
  afterEach(stopBrowser);

  it('Preview plugin switches to preview from gdrive URL', async () => {
    const page = getPage();
    const apiMock = MOCKS.api.pages;
    await testPageRequests({
      page,
      url: `${fixturesPrefix}/preview-gdrive.html`,
      check: (req) => {
        if (req.url().includes('.hlx.page/')) {
          // check request to preview url
          assert.ok(
            req.url() === `https://master--pages--adobe.hlx.page${apiMock.webPath}`,
            'Preview URL not called',
          );
          return true;
        }
        // ignore otherwise
        return false;
      },
      mockResponses: [
        apiMock,
      ],
      plugin: 'preview',
    });
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Preview plugin switches to preview from onedrive URL', async () => {
    const page = getPage();
    const apiMock = MOCKS.api.blog;
    await testPageRequests({
      page,
      url: `${fixturesPrefix}/preview-onedrive.html`,
      check: (req) => {
        if (req.url().includes('.hlx.page/')) {
          // check request to preview url
          assert.ok(
            req.url() === `https://master--theblog--adobe.hlx.page${apiMock.webPath}`,
            'Preview URL not called',
          );
          return true;
        }
        // ignore otherwise
        return false;
      },
      mockResponses: [
        apiMock,
      ],
      plugin: 'preview',
    });
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Preview plugin updates preview when switching from editor', async () => {
    const page = getPage();
    const apiMock = MOCKS.api.blog;
    await testPageRequests({
      page,
      url: `${fixturesPrefix}/preview-onedrive-hlx3.html`,
      check: (req) => {
        if (req.method() === 'POST') {
          // check post request to preview url
          assert.ok(
            req.url() === `https://admin.hlx3.page/preview/adobe/theblog/master${apiMock.webPath}`,
            'Preview URL not updated',
          );
          return true;
        }
        // ignore otherwise
        return false;
      },
      mockResponses: [
        apiMock,
      ],
      plugin: 'preview',
    });
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Preview plugin switches to preview from production URL', async () => {
    const page = getPage();
    const apiMock = MOCKS.api.blog;
    await testPageRequests({
      page,
      url: `${fixturesPrefix}/edit-production.html`,
      check: (req) => {
        if (req.url().includes('.hlx.page/')) {
          // check request to preview url
          assert.ok(
            req.url() === `https://master--theblog--adobe.hlx.page${apiMock.webPath}`,
            'Preview URL not called',
          );
          return true;
        }
        // ignore otherwise
        return false;
      },
      mockResponses: [
        apiMock,
      ],
      plugin: 'preview',
    });
  }).timeout(IT_DEFAULT_TIMEOUT);
});
