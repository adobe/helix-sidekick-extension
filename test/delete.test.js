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

describe('Test delete plugin', () => {
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

  it('Delete plugin uses preview API if page not published', async () => {
    const setup = new Setup('blog');
    setup.apiResponse().edit = { status: 404 }; // no source doc
    setup.apiResponse().preview.permissions.push('delete'); // add delete permission
    setup.apiResponse().live = { status: 404 }; // not published
    nock.sidekick(setup);
    nock.admin(setup);
    nock('https://admin.hlx.page')
      .delete('/preview/adobe/blog/main/en/topics/bla')
      .reply(201);
    const { dialog } = await new SidekickTest({
      browser,
      page,
      acceptDialogs: true,
      waitNavigation: 'https://main--blog--adobe.hlx.page/',
      plugin: 'delete',
    }).run();
    assert.ok(
      dialog && dialog.message.includes('Are you sure you want to delete it?'),
      `Unexpected dialog: "${dialog}"`,
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Delete plugin uses preview and live API if page published', async () => {
    const setup = new Setup('blog');
    setup.apiResponse().edit = { status: 404 }; // no source doc
    setup.apiResponse().preview.permissions.push('delete');
    setup.apiResponse().live.permissions.push('delete');
    nock.sidekick(setup);
    nock.admin(setup);
    nock('https://admin.hlx.page')
      .delete('/preview/adobe/blog/main/en/topics/bla')
      .reply(201)
      .delete('/live/adobe/blog/main/en/topics/bla')
      .reply(201);

    const { dialog } = await new SidekickTest({
      browser,
      page,
      acceptDialogs: true,
      waitNavigation: 'https://main--blog--adobe.hlx.page/',
      plugin: 'delete',
    }).run();
    assert.ok(
      dialog && dialog.message.includes('Are you sure you want to delete it?'),
      `Unexpected dialog: "${dialog}"`,
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Delete plugin uses code API', async () => {
    const setup = new Setup('blog');
    setup.apiResponse().code = { status: 404 }; // no source doc
    setup.apiResponse().preview.permissions.push('delete'); // add delete permission
    nock.sidekick(setup);
    nock.admin(setup);
    nock('https://admin.hlx.page')
      .delete('/code/adobe/blog/main/en/topics/bla')
      .reply(201);

    const { dialog } = await new SidekickTest({
      browser,
      page,
      type: 'xml',
      acceptDialogs: true,
      waitNavigation: 'https://main--blog--adobe.hlx.page/',
      plugin: 'delete',
      loadModule: true,
    }).run();

    assert.ok(
      dialog && dialog.message.includes('Are you sure you want to delete it?'),
      `Unexpected dialog: "${dialog}"`,
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('No delete plugin if source document exists', async () => {
    const setup = new Setup('blog');
    nock.sidekick(setup);
    nock.admin(setup);
    const { plugins } = await new SidekickTest({
      browser,
      page,
    }).run();
    assert.ok(!plugins.find((p) => p.id === 'delete'), 'Unexpected delete plugin found');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('No delete plugin if preview does not exist', async () => {
    const setup = new Setup('blog');
    setup.apiResponse().preview = { status: 404 }; // no preview
    nock.sidekick(setup);
    nock.admin(setup);
    const { plugins } = await new SidekickTest({
      browser,
      page,
    }).run();
    assert.ok(!plugins.find((p) => p.id === 'delete'), 'Unexpected delete plugin found');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Delete plugin if source document still exists but user is authenticated', async () => {
    const setup = new Setup('blog');
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
          const resp = setup.apiResponse();
          resp.preview.permissions.push('delete'); // authenticated request, add delete permission
          return [200, JSON.stringify(resp), { 'content-type': 'application/json' }];
        }
        return [401, '{ "status": 401 }', { 'content-type': 'application/json' }];
      })
      .get('/login/adobe/blog/main?extensionId=cookie')
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

    const { plugins } = await new SidekickTest({
      browser,
      page,
      plugin: 'user-login',
      pluginSleep: 2000,
      loadModule: true,
    }).run();
    assert.ok(plugins.find((p) => p.id === 'delete'), 'Delete plugin not found');
  }).timeout(IT_DEFAULT_TIMEOUT);
});
