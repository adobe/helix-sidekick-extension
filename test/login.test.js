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
  DEBUG, IT_DEFAULT_TIMEOUT, Nock, sleep, TestBrowser,
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
      waitPopup: 2000,
      plugin: 'user-login',
      loadModule: true,
    });

    nock('https://admin.hlx.page')
      .get('/status/adobe/blog/main/en/topics/bla?editUrl=auto')
      .times(2)
      .reply(function req() {
        if (this.req.headers.cookie === 'auth_token=foobar') {
          loggedIn = true;
          return [200, '{}', { 'content-type': 'application/json' }];
        }
        return [401];
      })
      .get('/login/adobe/blog/main/en/topics/bla?loginRedirect=https%3A%2F%2Fwww.hlx.live%2Ftools%2Fsidekick%2Flogin-success')
      .times(DEBUG ? 2 : 1) // when dev-tools are enabled, browser makes 2 requests.
      .delay(1500) // delay so that 2 requests are made
      .reply(200, 'logged in!', {
        'set-cookie': 'auth_token=foobar; Path=/; HttpOnly; Secure; SameSite=None',
      })
      .get('/profile')
      .times(2)
      .reply(function req() {
        if (this.req.headers.cookie === 'auth_token=foobar') {
          return [200, '{}', { 'content-type': 'application/json' }];
        }
        return [401];
      });

    await test.run();

    // wait until login window closes
    let loginClosed = false;
    await Promise.race([
      new Promise((resolve) => {
        page.browser().on('targetdestroyed', async (target) => {
          const targetUrl = target.url();
          if (targetUrl.startsWith('https://admin.hlx.page/login/adobe/blog/main/en/topics/bla')) {
            loginClosed = true;
            resolve();
          }
        });
      }),
      sleep(2000),
    ]);

    assert.ok(loggedIn, 'Sidekick did not send auth cookie.');
    assert.ok(loginClosed, 'Sidekick did not close login window.');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Opens login window and shows aborted modal', async () => {
    const test = new SidekickTest({
      browser,
      page,
      plugin: 'user-login',
      pluginSleep: 2000,
      loadModule: true,
    });

    nock('https://admin.hlx.page')
      .get('/status/adobe/blog/main/en/topics/bla?editUrl=auto')
      .reply(401)
      .get('/profile')
      .times(2)
      .reply(401)
      .get('/login/adobe/blog/main/en/topics/bla')
      .query({
        loginRedirect: 'https://www.hlx.live/tools/sidekick/login-success',
      })
      .reply(200, 'not logged in!');

    const { popupTarget } = await test.run();

    // close login window
    await (await popupTarget.page()).close();

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
