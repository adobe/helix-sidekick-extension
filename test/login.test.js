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

import assert from 'assert';
import {
  IT_DEFAULT_TIMEOUT, Nock, TestBrowser,
} from './utils.js';

import { SidekickTest } from './SidekickTest.js';

describe('Test sidekick login', () => {
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

  it('Opens login window and logs in via auth-cookie', async () => {
    let loggedIn = false;
    const test = new SidekickTest({
      browser,
      page,
      pluginSleep: 2000,
      plugin: 'user-login',
      loadModule: true,
    });

    nock.login();
    nock('https://admin.hlx.page')
      .get('/sidekick/adobe/blog/main/config.json')
      .twice()
      .reply(function req() {
        if (this.req.headers.cookie === 'auth_token=foobar') {
          return [200, '{}', { 'content-type': 'application/json' }];
        }
        return [401];
      })
      .get('/status/adobe/blog/main/en/topics/bla?editUrl=auto')
      .twice()
      .reply(function req() {
        if (this.req.headers.cookie === 'auth_token=foobar') {
          loggedIn = true;
          return [200, '{ "status": 200}', { 'content-type': 'application/json' }];
        }
        return [401, '{ "status": 401 }', { 'content-type': 'application/json' }];
      })
      .get('/login/adobe/blog/main?loginRedirect=https%3A%2F%2Fwww.hlx.live%2Ftools%2Fsidekick%2Flogin-success')
      .reply(200, '<html>logged in<script>setTimeout(() => self.close(), 500)</script></html>', {
        'set-cookie': 'auth_token=foobar; Path=/; HttpOnly; Secure; SameSite=None',
      })
      .get('/profile/adobe/blog/main')
      .reply(function req() {
        if (this.req.headers.cookie === 'auth_token=foobar') {
          return [200, '{ "status": 200 }', { 'content-type': 'application/json' }];
        }
        return [401, '{ "status": 401 }', { 'content-type': 'application/json' }];
      })
      // in debug mode, the browser requests /favicon.ico
      .get('/favicon.ico')
      .optionally()
      .reply(404);

    await test.run();

    assert.ok(loggedIn, 'Sidekick did not send auth cookie.');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Opens login window and shows aborted modal', async () => {
    const test = new SidekickTest({
      browser,
      page,
      plugin: 'user-login',
      pluginSleep: 7000, // sidekick tries 5 times before showing the login aborted modal
      loadModule: true,
    });

    nock.login();
    nock('https://admin.hlx.page')
      .get('/sidekick/adobe/blog/main/config.json')
      .reply(401)
      .get('/status/adobe/blog/main/en/topics/bla?editUrl=auto')
      .reply(401, '{ "status": 401 }', { 'content-type': 'application/json' })
      .get('/login/adobe/blog/main?loginRedirect=https%3A%2F%2Fwww.hlx.live%2Ftools%2Fsidekick%2Flogin-success')
      .reply(200, '<html>not logged in!<script>setTimeout(() => self.close(), 500)</script></html>')
      .get('/profile/adobe/blog/main')
      .times(5)
      .reply(401, '{ "status": 401 }', { 'content-type': 'application/json' });

    await test.run();

    // wait for 'aborted' modal
    try {
      await page.waitForFunction(() => window.hlx.sidekick.shadowRoot.querySelector('.hlx-sk-overlay .modal'), {
        timeout: 2000,
      });
    } catch (e) {
      assert.fail('Sidekick shows login aborted notification.');
    }
  }).timeout(IT_DEFAULT_TIMEOUT);
});
