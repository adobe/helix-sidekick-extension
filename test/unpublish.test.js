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

import assert from 'assert';
import {
  IT_DEFAULT_TIMEOUT, Nock, Setup, TestBrowser,
} from './utils.js';

import { SidekickTest } from './SidekickTest.js';

describe('Test unpublish plugin', () => {
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

  it('Unpublish plugin uses live API', async () => {
    const setup = new Setup('blog');
    setup.apiResponse().edit = { status: 404 }; // no source doc
    setup.apiResponse().live.permissions.push('delete'); // add delete permission
    nock.sidekick(setup);
    nock.admin(setup);
    nock('https://admin.hlx.page')
      .delete('/live/adobe/blog/main/en/topics/bla')
      .reply(201);
    await new SidekickTest({
      browser,
      page,
      acceptDialogs: true,
      plugin: 'unpublish',
    }).run();
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('No unpublish plugin if source document still exists', async () => {
    const setup = new Setup('blog');
    nock.sidekick(setup);
    nock.admin(setup);
    const { plugins } = await new SidekickTest({
      browser,
      page,
    }).run();
    assert.ok(!plugins.find((p) => p.id === 'unpublish'), 'Unexpected unpublish plugin found');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('No unpublish plugin if page not published', async () => {
    const setup = new Setup('blog');
    setup.apiResponse().edit = { status: 404 }; // no source doc
    setup.apiResponse().live = { status: 404 }; // page not published
    nock.sidekick(setup);
    nock.admin(setup);
    const { plugins } = await new SidekickTest({
      browser,
      page,
    }).run();
    assert.ok(!plugins.find((p) => p.id === 'unpublish'), 'Unexpected unpublish plugin found');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Unpublish plugin hidden if source document still exists but user is authenticated', async () => {
    let mockToken = null;
    const setup = new Setup('blog');
    nock.login();
    nock('https://admin.hlx.page')
      .get('/sidekick/adobe/blog/main/config.json')
      .twice()
      .reply(function req() {
        if (this.req.headers.authorization === `token ${mockToken}`) {
          return [200, '{}', { 'content-type': 'application/json' }];
        }
        return [401];
      })
      .get('/status/adobe/blog/main/en/topics/bla?editUrl=auto')
      .twice()
      .reply(function req() {
        if (this.req.headers.authorization === `token ${mockToken}`) {
          const resp = setup.apiResponse();
          resp.live.permissions.push('delete'); // authenticated request, add delete permission
          return [200, JSON.stringify(resp), { 'content-type': 'application/json' }];
        }
        return [401, '{ "status": 401 }', { 'content-type': 'application/json' }];
      })
      .get('/login/adobe/blog/main?extensionId=testsidekickid')
      .reply(() => {
        mockToken = 'test-token'; // mock admin sending token to the background extension worker
        return [200, '<html>logged in<script>setTimeout(() => self.close(), 500)</script></html>'];
      })
      .get('/profile/adobe/blog/main')
      .reply(function req() {
        if (this.req.headers.authorization === `token ${mockToken}`) {
          return [200, '{ "status": 200 }', { 'content-type': 'application/json' }];
        }
        return [401, '{ "status": 401 }', { 'content-type': 'application/json' }];
      })
      // in debug mode, the browser requests /favicon.ico
      .get('/favicon.ico')
      .optionally()
      .reply(404);

    const { plugins } = await new SidekickTest({
      browser,
      page,
      plugin: 'user-login',
      pluginSleep: 2000,
      loadModule: true,
      requestHandler: (request) => {
        if (new URL(request.url).hostname !== 'admin.hlx.page') return;

        if (mockToken) {
          // mock admin sending token from background extension worker
          request.headers.authorization = `token ${mockToken}`;
        }
      },
    }).run();
    assert.ok(
      plugins.find((p) => p.id === 'unpublish' && p.classes.includes('hlx-sk-advanced-only')),
      'Unpublish plugin not found',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Unpublish plugin shows modal when rate-limited by admin', async () => {
    const setup = new Setup('blog');
    setup.apiResponse().live.permissions.push('delete'); // add delete permission
    nock.sidekick(setup);
    nock.admin(setup);
    nock('https://admin.hlx.page')
      .delete('/live/adobe/blog/main/en/topics/bla')
      .reply(429);
    const { notification } = await new SidekickTest({
      browser,
      page,
      setup,
      plugin: 'unpublish',
      acceptDialogs: true,
    }).run();
    assert.ok(notification.message.includes('429'), 'Unpublish plugin does not show modal on 429');
    assert.ok(notification.message.includes('publishing service'), 'Unpublish plugin does not mention admin');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Unpublish plugin shows modal when rate-limited by onedrive', async () => {
    const setup = new Setup('blog');
    setup.apiResponse().live.permissions.push('delete'); // add delete permission
    nock.sidekick(setup);
    nock.admin(setup);
    nock('https://admin.hlx.page')
      .delete('/live/adobe/blog/main/en/topics/bla')
      .reply(503, '', { 'x-error': 'unable to handle onedrive (429)' });
    const { notification } = await new SidekickTest({
      browser,
      page,
      setup,
      plugin: 'unpublish',
      pluginSleep: 500,
      acceptDialogs: true,
    }).run();
    assert.ok(notification.message.includes('429'), 'Unpublish plugin does not show modal on 429');
    assert.ok(notification.message.includes('Microsoft SharePoint'), 'Unpublish plugin does not mention onedrive');
  }).timeout(IT_DEFAULT_TIMEOUT);
});
