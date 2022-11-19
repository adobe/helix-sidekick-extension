/*
 * Copyright 2020 Adobe. All rights reserved.
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
  openPage,
  closeAllPages,
} = require('./utils.js');
const { SidekickTest } = require('./SidekickTest.js');

describe('Test sidekick logout', () => {
  let browser;

  before(async function before() {
    this.timeout(10000);
    browser = await startBrowser();
  });
  after(async () => stopBrowser(browser));

  let page;

  beforeEach(async () => {
    page = await openPage(browser);
  });

  afterEach(async () => {
    await closeAllPages(browser);
  });

  it('Logout removes auth token from config', async () => {
    const test = new SidekickTest({
      page,
      plugin: 'user-logout',
      sleep: 2000,
      checkPage: async (p) => p.evaluate(() => window.hlx.sidekick.config),
    });
    test.sidekickConfig.authToken = 'foobar';
    const { checkPageResult: config } = await test.run();

    assert.ok(!config.authToken, 'Did not remove auth token from config');
  }).timeout(IT_DEFAULT_TIMEOUT);
});
