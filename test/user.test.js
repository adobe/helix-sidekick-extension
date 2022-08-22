/*
 * Copyright 2022 Adobe. All rights reserved.
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
  stopBrowser, openPage, closeAllPages,
} = require('./utils.js');
const { SidekickTest } = require('./SidekickTest.js');

describe('Test user auth handling', () => {
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

  it('Shows user info from profile', async () => {
    const { checkPageResult } = await new SidekickTest({
      page,
      checkPage: (p) => p.evaluate(() => [...window.hlx.sidekick.get('user')
        .querySelectorAll(':scope .dropdown-container > div > div')]
        .map((div) => div.textContent)
        .join('---') === 'Jane Smith---jane@foo.bar'),
    }).run();
    assert.ok(checkPageResult, 'Did not show user info from profile');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Shows login option in user menu if user not logged in', async () => {
    const { plugins } = await new SidekickTest({
      page,
      apiResponses: [{
        status: 401,
      }],
    }).run();
    assert.ok(plugins.find((p) => p.id === 'user-login'), 'Did not show login option');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Shows switch user and logout option in user menu if user logged in', async () => {
    const { plugins } = await new SidekickTest({
      page,
    }).run();
    assert.ok(plugins.find((p) => p.id === 'user-switch'), 'Did not show switch user option');
    assert.ok(plugins.find((p) => p.id === 'user-logout'), 'Did not show logout option');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Keeps plugin buttons disabled based on permissions', async () => {
    const test = new SidekickTest({
      page,
    });
    // change live permissions to readonly
    test.apiResponses[0].live.permissions = ['read'];
    const { plugins } = await test.run();
    assert.ok(plugins.find((p) => p.id === 'publish' && !p.buttonEnabled), 'Did not keep publish plugin disabled');
  }).timeout(IT_DEFAULT_TIMEOUT);
});
