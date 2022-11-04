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
  Nock,
  sleep,
  DEBUG,
} = require('./utils.js');
const { SidekickTest } = require('./SidekickTest.js');

describe('Test sidekick login', () => {
  let browser;

  before(async function before() {
    this.timeout(10000);
    browser = await startBrowser();
  });
  after(async () => stopBrowser(browser));

  let page;
  let nock;

  beforeEach(async () => {
    page = await openPage(browser);
    nock = new Nock();
  });

  afterEach(async () => {
    await closeAllPages(browser);
    nock.done();
  });

  it('Opens login window and logs in via auth-cookie', async () => {
    let loggedIn = false;
    const test = new SidekickTest({
      page,
      apiResponses: (req) => {
        if (req.headers.cookie === 'auth_token=foobar') {
          loggedIn = true;
          return {
            status: 200,
            headers: {
              'content-type': 'application/json',
            },
            body: '{}',
          };
        }
        return {
          status: 401,
        };
      },
      waitPopup: 2000,
      post: async (p) => {
        const btn = await p.waitForFunction(() => window.hlx.sidekick.shadowRoot.querySelector('.hlx-sk .user div.user-login button'));
        await btn.click();
      },
    });

    nock('https://admin.hlx.page')
      .get('/login/adobe/blog/main/en/topics/bla?loginRedirect=https%3A%2F%2Fwww.hlx.live%2Ftools%2Fsidekick%2Flogin-success')
      .times(DEBUG ? 2 : 1) // when dev-tools are enabled, browser makes 2 requests.
      .delay(1500) // delay so that 2 requests are made
      .reply(200, 'logged in!', {
        'set-cookie': 'auth_token=foobar; Path=/; HttpOnly; Secure; SameSite=None',
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
      page,
      apiResponses: [{
        status: 401,
      }],
      waitPopup: 2000,
      post: async (p) => {
        const btn = await p.waitForFunction(() => window.hlx.sidekick.shadowRoot.querySelector('.hlx-sk .user div.user-login button'));
        await btn.click();
      },
    });

    nock('https://admin.hlx.page')
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
      await page.waitForFunction(() => window.hlx.sidekick.shadowRoot.querySelector('.hlx-sk-overlay .modal.modal-login-aborted'), {
        timeout: 2000,
      });
    } catch (e) {
      assert.fail('Sidekick shows login aborted notification.');
    }
  }).timeout(IT_DEFAULT_TIMEOUT);
});
