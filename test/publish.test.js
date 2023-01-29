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
  TestBrowser,
  Nock,
  Setup,
} = require('./utils.js');
const { SidekickTest } = require('./SidekickTest.js');

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
    nock.admin(new Setup('blog'));
    nock('https://admin.hlx.page')
      .post('/live/adobe/blog/main/en/topics/bla')
      .reply(200);
    nock('https://main--blog--adobe.hlx.live')
      .get('/en/topics/bla')
      .reply(200, 'bla');
    nock('https://blog.adobe.com')
      .get('/en/topics/bla')
      .twice()
      .reply(200, 'bla');
    const { requestsMade, navigated } = await new SidekickTest({
      browser,
      page,
      plugin: 'publish',
      waitNavigation: 'https://blog.adobe.com/en/topics/bla',
    }).run();
    const publishReq = requestsMade.find((r) => r.method === 'POST');
    assert.ok(
      publishReq && publishReq.url.startsWith('https://admin.hlx.page/live/'),
      'Live API not called',
    );
    assert.strictEqual(navigated, 'https://blog.adobe.com/en/topics/bla', 'Redirect not sent');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Publish plugin also publishes dependencies', async () => {
    nock.admin(new Setup('blog'));
    nock('https://admin.hlx.page')
      .post('/live/adobe/blog/main/en/topics/bla')
      .reply(200)
      .post('/live/adobe/blog/main/en/topics/foo')
      .reply(200)
      .post('/live/adobe/blog/main/en/topics/bar')
      .reply(200);
    nock('https://main--blog--adobe.hlx.live')
      .get('/en/topics/bla')
      .reply(200, 'bla')
      .get('/en/topics/foo')
      .reply(200, 'bla')
      .get('/en/topics/bar')
      .reply(200, 'bla');
    nock('https://blog.adobe.com')
      .get('/en/topics/bla')
      .twice()
      .reply(200, 'bla')
      .get('/en/topics/foo')
      .reply(200, 'bla')
      .get('/en/topics/bar')
      .reply(200, 'bla');
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
      waitNavigation: 'https://blog.adobe.com/en/topics/bla',
    }).run();
    const publishPaths = requestsMade.filter((r) => r.method === 'POST').map((r) => new URL(r.url).pathname);
    assert.strictEqual(publishPaths.length, 3, 'Unexpected number of publish requests');
    assert.ok(
      publishPaths[1].endsWith('/en/topics/foo') && publishPaths[2].endsWith('/en/topics/bar'),
      'Dependencies not published in expected order',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Publish plugin busts client cache', async () => {
    nock.admin(new Setup('blog'));
    nock('https://admin.hlx.page')
      .post('/live/adobe/blog/main/en/topics/bla')
      .reply(200);
    nock('https://main--blog--adobe.hlx.live')
      .get('/en/topics/bla')
      .reply(200, 'bla');
    nock('https://blog.adobe.com')
      .get('/en/topics/bla')
      .twice()
      .reply(200, 'bla');

    const { requestsMade } = await new SidekickTest({
      browser,
      page,
      plugin: 'publish',
      waitNavigation: 'https://blog.adobe.com/en/topics/bla',
    }).run();
    const afterPublish = requestsMade.slice(requestsMade.findIndex((r) => r.method === 'POST') + 1);
    assert.ok(
      afterPublish[0] && afterPublish[0].url.startsWith('https://main--blog--adobe.hlx.live/'),
      'Client cache for live not busted',
    );
    assert.ok(
      afterPublish[1] && afterPublish[1].url.startsWith('https://blog.adobe.com/'),
      'Client cache for production not busted',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Publish plugin button disabled without source document', async () => {
    const setup = new Setup('blog');
    setup.apiResponse().edit = {};
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

  it('Publish plugin click on arrow expands dropdown', async () => {
    const { checkPageResult: publishClassName } = await new SidekickTest({
      browser,
      page,
      loadModule: true,
      checkPage: (p) => p.evaluate(async () => {
        const publishPlugin = window.hlx.sidekick.root
          .querySelector('.plugin-container .publish');
        const publishButton = publishPlugin
          .querySelector(':scope > button');
        const rect = publishButton.getBoundingClientRect();
        const evt = new MouseEvent('click', {
          clientX: Math.round(rect.right - 10),
          clientY: Math.round(rect.y + 10),
        });
        publishButton.dispatchEvent(evt);
        return publishPlugin.className;
      }),
    }).run();
    assert.ok(publishClassName.includes('dropdown-expanded'), 'Publish dropdown not exapnded');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Publish later plugin uses live API with date parameter', async () => {
    nock.admin(new Setup('blog'));
    nock('https://admin.hlx.page')
      .post(/\/live\/.*/)
      .reply(200);
    const { requestsMade } = await new SidekickTest({
      browser,
      page,
      plugin: 'publish-later',
      pluginSleep: 1000,
      loadModule: true,
      checkPage: (p) => p.evaluate(async () => {
        // click ok button and wait 1s
        const ok = window.hlx.sidekick.shadowRoot.querySelector('.dialog button.dialog-ok');
        ok.click();
        await new Promise((resolve) => {
          setTimeout(resolve, 1000);
        });
      }),
    }).run();
    const publishReq = requestsMade.find((r) => r.method === 'POST');
    assert.ok(
      publishReq
        && publishReq.url.startsWith('https://admin.hlx.page/live/')
        && publishReq.url.includes('?date='),
      'Live API not called with date parameter',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Publish later plugin checks date range', async () => {
    nock.admin(new Setup('blog'));
    const { checkPageResult: errorMsg } = await new SidekickTest({
      browser,
      page,
      plugin: 'publish-later',
      pluginSleep: 1000,
      loadModule: true,
      checkPage: (p) => p.evaluate(async () => {
        const pad = (num) => `${num < 10 ? '0' : ''}${num}`;
        const toLocalDateTime = (d) => {
          const year = d.getFullYear();
          const month = pad(d.getMonth() + 1);
          const day = pad(d.getDate());
          const hours = pad(d.getHours());
          const minutes = pad(d.getMinutes());
          return `${year}-${month}-${day}T${hours}:${minutes}`;
        };
        // set invalid date, click ok button, wait 0.5s and return notification
        const date = window.hlx.sidekick.shadowRoot.querySelector('.dialog input');
        date.value = toLocalDateTime(new Date()); // date too early
        const ok = window.hlx.sidekick.shadowRoot.querySelector('.dialog button.dialog-ok');
        ok.click();
        const modal = window.hlx.sidekick.shadowRoot.querySelector('.modal');
        return modal && modal.className.includes('error-invalid-date');
      }),
    }).run();
    assert.ok(errorMsg, 'Date range not checked');
  }).timeout(IT_DEFAULT_TIMEOUT);
});
