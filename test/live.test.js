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

describe('Test live plugin', () => {
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

  it('Live plugin without production host', async () => {
    const { plugins } = await new SidekickTest({
      browser,
      page,
    }).run();
    assert.ok(plugins.find((p) => p.id === 'live'), 'Live plugin not found');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Live plugin hidden with production host', async () => {
    const test = new SidekickTest({
      browser,
      page,
    });
    test.sidekickConfig.host = 'blog.adobe.com';
    const { plugins } = await test.run();
    assert.ok(
      plugins.find((p) => p.id === 'live' && p.classes.includes('hlx-sk-advanced-only')),
      'Live plugin not hidden with production host',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Live plugin switches to live from gdrive URL', async () => {
    nock('https://main--pages--adobe.hlx.live')
      .get('/creativecloud/en/test')
      .reply(200, 'some content...');
    const setup = new Setup('pages');
    nock.sidekick(setup);
    nock.admin(setup);
    const { popupOpened } = await new SidekickTest({
      browser,
      page,
      setup: 'pages',
      url: 'https://docs.google.com/document/d/2E1PNphAhTZAZrDjevM0BX7CZr7KjomuBO6xE1TUo9NU/edit',
      plugin: 'live',
      waitPopup: 2000,
    }).run();
    assert.strictEqual(
      popupOpened,
      'https://main--pages--adobe.hlx.live/creativecloud/en/test',
      'Live URL not opened',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Live plugin switches to live from onedrive URL', async () => {
    nock('https://main--blog--adobe.hlx.live')
      .get('/en/topics/bla')
      .reply(200, 'some content...');
    const setup = new Setup('blog');
    nock.sidekick(setup);
    nock.admin(setup);
    const { popupOpened } = await new SidekickTest({
      browser,
      page,
      url: 'https://adobe.sharepoint.com/:w:/r/sites/TheBlog/_layouts/15/Doc.aspx?sourcedoc=%7BE8EC80CB-24C3-4B95-B082-C51FD8BC8760%7D&file=bla.docx&action=default&mobileredirect=true',
      plugin: 'live',
      waitPopup: 2000,
    }).run();
    assert.strictEqual(
      popupOpened,
      'https://main--blog--adobe.hlx.live/en/topics/bla',
      'Live URL not opened',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Live plugin switches to live from preview URL', async () => {
    const setup = new Setup('blog');
    nock.sidekick(setup);
    nock.admin(setup);
    const { requestsMade } = await new SidekickTest({
      browser,
      page,
      plugin: 'live',
      waitNavigation: 'https://main--blog--adobe.hlx.live/en/topics/bla',
    }).run();
    assert.strictEqual(
      requestsMade.findIndex((f) => f.url === 'https://main--blog--adobe.hlx.live/en/topics/bla') >= 0,
      true,
      'Live URL not opened',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Live plugin switches to live from production URL', async () => {
    const setup = new Setup('blog');
    nock.sidekick(setup);
    nock.admin(setup);
    const { requestsMade } = await new SidekickTest({
      browser,
      page,
      url: 'https://blog.adobe.com/en/topics/bla',
      plugin: 'live',
      waitNavigation: 'https://main--blog--adobe.hlx.live/en/topics/bla',
    }).run();
    assert.strictEqual(
      requestsMade.pop().url,
      'https://main--blog--adobe.hlx.live/en/topics/bla',
      'Live URL not opened',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Live plugin button disabled if page not published', async () => {
    const setup = new Setup('blog');
    setup.apiResponse().live = {};
    nock.sidekick(setup);
    nock.admin(setup);

    const { plugins } = await new SidekickTest({
      browser,
      page,
    }).run();
    assert.ok(plugins.find((p) => p.id === 'live' && !p.buttonEnabled), 'Live plugin button not disabled');
  }).timeout(IT_DEFAULT_TIMEOUT);
});
