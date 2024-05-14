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
import { expect } from '@esm-bundle/chai';
import {
  IT_DEFAULT_TIMEOUT, Nock, Setup, TestBrowser,
} from './utils.js';

import { SidekickTest } from './SidekickTest.js';

describe('Test publish plugin', () => {
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

  it('Publish plugin uses live API', async () => {
    const setup = new Setup('blog');
    nock.sidekick(setup);
    nock.admin(setup);
    nock('https://admin.hlx.page')
      .post('/live/adobe/blog/main/en/topics/bla')
      .reply(200);
    const { requestsMade, navigated } = await new SidekickTest({
      browser,
      page,
      plugin: 'publish',
      waitNavigation: 'https://blog.adobe.com/en/topics/bla?nocache=',
    }).run();
    const publishReq = requestsMade.find((r) => r.method === 'POST');
    assert.ok(
      publishReq && publishReq.url.startsWith('https://admin.hlx.page/live/'),
      'Live API not called',
    );
    assert.ok(navigated.startsWith('https://blog.adobe.com/en/topics/bla?nocache='), 'Redirect not sent');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Publish plugin also publishes dependencies', async () => {
    const setup = new Setup('blog');
    nock.sidekick(setup);
    nock.admin(setup);
    nock('https://admin.hlx.page')
      .post('/live/adobe/blog/main/en/topics/bla')
      .reply(200)
      .post('/live/adobe/blog/main/en/topics/foo')
      .reply(200)
      .post('/live/adobe/blog/main/en/topics/bar')
      .reply(200);
    const { requestsMade } = await new SidekickTest({
      browser,
      page,
      plugin: 'publish',
      post: (p) => p.evaluate(() => {
        window.hlx.dependencies = [
          '/en/topics/foo',
          'bar',
        ];
      }),
      waitNavigation: 'https://blog.adobe.com/en/topics/bla?nocache=',
    }).run();
    const publishPaths = requestsMade.filter((r) => r.method === 'POST').map((r) => new URL(r.url).pathname);
    assert.strictEqual(publishPaths.length, 3, 'Unexpected number of publish requests');
    assert.ok(
      publishPaths[1].endsWith('/en/topics/foo') && publishPaths[2].endsWith('/en/topics/bar'),
      'Dependencies not published in expected order',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Publish plugin available for JSON resource', async () => {
    const setup = new Setup('blog');
    nock.sidekick(setup);
    nock.admin(setup);

    const { plugins } = await new SidekickTest({
      browser,
      page,
    }).run('https://main--blog--adobe.hlx.page/en/topics/bla.json');
    assert.ok(
      plugins.find((p) => p.id === 'publish'),
      'Publish plugin not available for JSON',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Publish plugin button disabled without source document', async () => {
    const setup = new Setup('blog');
    setup.apiResponse().edit = {};
    nock.sidekick(setup);
    nock.admin(setup);
    const { plugins } = await new SidekickTest({
      browser,
      page,
      url: 'https://blog.adobe.com/en/topics/bla',
    }).run();
    assert.ok(plugins.find((p) => p.id === 'publish' && !p.buttonEnabled), 'Publish plugin button not disabled');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Publish plugin shows update indicator if preview is newer than live', async () => {
    const setup = new Setup('blog');
    const liveLastMod = setup.apiResponse().live.lastModified;
    setup.apiResponse().live.lastModified = new Date(new Date(liveLastMod)
      .setFullYear(2019)).toUTCString();
    nock.sidekick(setup);
    nock.admin(setup);
    const test = new SidekickTest({
      browser,
      page,
    });
    const { plugins } = await test.run();
    assert.ok(
      plugins.find((p) => p.id === 'publish')?.classes.includes('update'),
      'Publish plugin without update class',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Publish plugin shows modal when rate-limited by admin', async () => {
    const setup = new Setup('blog');
    nock.sidekick(setup);
    nock.admin(setup);
    nock('https://admin.hlx.page')
      .post('/live/adobe/blog/main/en/topics/bla')
      .reply(429);
    const { notification } = await new SidekickTest({
      browser,
      page,
      setup,
      plugin: 'publish',
    }).run();
    assert.ok(notification.message.includes('429'), 'Publish plugin does not show modal on 429');
    assert.ok(notification.message.includes('publishing service'), 'Publish plugin does not mention admin');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Publish plugin shows modal when rate-limited by onedrive', async () => {
    const setup = new Setup('blog');
    nock.sidekick(setup);
    nock.admin(setup);
    nock('https://admin.hlx.page')
      .post('/live/adobe/blog/main/en/topics/bla')
      .reply(503, '', { 'x-error': 'unable to handle onedrive (429)' });
    const { notification } = await new SidekickTest({
      browser,
      page,
      setup,
      plugin: 'publish',
    }).run();
    assert.ok(notification.message.includes('429'), 'Publish plugin does not show modal on 429');
    assert.ok(notification.message.includes('Microsoft SharePoint'), 'Publish plugin does not mention onedrive');
  }).timeout(IT_DEFAULT_TIMEOUT);
});
