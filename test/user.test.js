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

import assert from 'assert';
import {
  IT_DEFAULT_TIMEOUT, Nock, Setup, TestBrowser,
} from './utils.js';

import { SidekickTest } from './SidekickTest.js';

describe('Test user auth handling', () => {
  /** @type TestBrowser */
  let browser;

  before(async function before() {
    this.timeout(10000);
    browser = await TestBrowser.create();
  });

  after(async () => browser.close());

  let page;
  let nock;

  beforeEach(async () => {
    page = await browser.openPage();
    nock = new Nock();
  });

  afterEach(async () => {
    await browser.closeAllPages();
    nock.done();
  });

  it('Shows user info from profile', async () => {
    const setup = new Setup('blog');
    nock.sidekick(setup);
    nock.admin(setup);
    const { checkPageResult } = await new SidekickTest({
      browser,
      page,
      checkPage: (p) => p.evaluate(() => [...window.hlx.sidekick.get('user')
        .querySelectorAll(':scope .dropdown-container > div > div')]
        .map((div) => div.textContent)
        .join('---') === 'Jane Smith---jane@foo.bar'),
    }).run();
    assert.ok(checkPageResult, 'Did not show user info from profile');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Shows login option in user menu if user not logged in', async () => {
    nock.sidekick();
    nock('https://admin.hlx.page')
      .get('/status/adobe/blog/main/en/topics/bla?editUrl=auto')
      .reply(401);
    const { plugins } = await new SidekickTest({
      browser,
      page,
      apiResponses: [{
        status: 401,
      }],
    }).run();
    assert.ok(plugins.find((p) => p.id === 'user-login'), 'Did not show login option');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Shows switch user and logout option in user menu if user logged in', async () => {
    const setup = new Setup('blog');
    nock.sidekick(setup);
    nock.admin(setup);
    const { plugins } = await new SidekickTest({
      browser,
      page,
    }).run();
    assert.ok(plugins.find((p) => p.id === 'user-switch'), 'Did not show switch user option');
    assert.ok(plugins.find((p) => p.id === 'user-logout'), 'Did not show logout option');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Shows expiry notice after token expiry', async () => {
    const setup = new Setup('blog');
    nock.sidekick(setup);
    nock.admin(setup);
    nock('https://admin.hlx.page')
      .get('/status/adobe/blog/main/en/topics/bla?editUrl=auto')
      .reply(401, '{ "status": 401 }');
    const { notification } = await new SidekickTest({
      browser,
      page,
      sidekickConfig: {
        ...setup.sidekickConfig,
        authTokenExpiry: Date.now() + 500, // token expires in 1 seconds
      },
      loadModule: true,
      sleep: 2000,
    }).run();
    assert.ok(
      notification?.message?.includes('session has expired'),
      'Did not show expiry notice',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('isAuthorized respects permissions', async () => {
    const setup = new Setup('blog');
    setup.apiResponse().live.permissions = ['read'];
    nock.sidekick(setup);
    nock.admin(setup);
    const { checkPageResult: canWriteLive } = await new SidekickTest({
      browser,
      page,
      checkPage: (p) => p.evaluate(() => window.hlx.sidekick.isAuthorized('live', 'write')),
    }).run();
    assert.ok(!canWriteLive, 'Did not respect permissions');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('isAuthorized respects 403 status', async () => {
    const setup = new Setup('blog');
    setup.apiResponse().live.status = 403;
    nock.sidekick(setup);
    nock.admin(setup);
    const { checkPageResult: canReadLive } = await new SidekickTest({
      browser,
      page,
      checkPage: (p) => p.evaluate(() => window.hlx.sidekick.isAuthorized('live', 'read')),
    }).run();
    assert.ok(!canReadLive, 'Did not respect 403 status');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Keeps plugin buttons disabled based on permissions', async () => {
    const setup = new Setup('blog');
    setup.apiResponse().live.permissions = ['read'];
    nock.sidekick(setup);
    nock.admin(setup);
    const { plugins } = await new SidekickTest({
      browser,
      page,
    }).run();
    assert.ok(plugins.find((p) => p.id === 'publish' && !p.buttonEnabled), 'Did not keep publish plugin disabled');
  }).timeout(IT_DEFAULT_TIMEOUT);
});
