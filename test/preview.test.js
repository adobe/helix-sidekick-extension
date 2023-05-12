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

describe('Test preview plugin', () => {
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

  it('Preview plugin switches to preview from gdrive URL', async () => {
    nock('https://main--pages--adobe.hlx.page')
      .get('/creativecloud/en/test')
      .reply(200, '<html></html>');
    const setup = new Setup('pages');
    nock.sidekick(setup);
    nock.admin(setup);
    const { popupOpened } = await new SidekickTest({
      browser,
      page,
      setup: 'pages',
      url: 'https://docs.google.com/document/d/2E1PNphAhTZAZrDjevM0BX7CZr7KjomuBO6xE1TUo9NU/edit',
      plugin: 'preview',
      waitPopup: 2000,
    }).run();
    assert.strictEqual(
      popupOpened,
      'https://main--pages--adobe.hlx.page/creativecloud/en/test',
      'Preview URL not opened',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Preview plugin switches to preview from onedrive URL', async () => {
    nock('https://main--blog--adobe.hlx.page')
      .get('/en/topics/bla')
      .reply(200, '<html></html>');
    const setup = new Setup('blog');
    nock.sidekick(setup);
    nock.admin(setup);
    const { popupOpened } = await new SidekickTest({
      browser,
      page,
      url: 'https://adobe.sharepoint.com/:w:/r/sites/TheBlog/_layouts/15/Doc.aspx?sourcedoc=%7BE8EC80CB-24C3-4B95-B082-C51FD8BC8760%7D&file=bla.docx&action=default&mobileredirect=true',
      plugin: 'preview',
      waitPopup: 2000,
    }).run();
    assert.strictEqual(
      popupOpened,
      'https://main--blog--adobe.hlx.page/en/topics/bla',
      'Preview URL not opened',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Preview plugin switches to preview from live URL', async () => {
    const setup = new Setup('blog');
    nock.sidekick(setup);
    nock.admin(setup);
    const { navigated } = await new SidekickTest({
      browser,
      page,
      url: 'https://main--blog--adobe.hlx.live/en/topics/bla',
      plugin: 'preview',
      waitNavigation: 'https://main--blog--adobe.hlx.page/en/topics/bla',
    }).run();
    assert.strictEqual(
      navigated,
      'https://main--blog--adobe.hlx.page/en/topics/bla',
      'Preview URL not opened',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Preview plugin switches to preview from production URL', async () => {
    const setup = new Setup('blog');
    nock.sidekick(setup);
    nock.admin(setup);
    const { navigated } = await new SidekickTest({
      browser,
      page,
      url: 'https://blog.adobe.com/en/topics/bla',
      plugin: 'preview',
      waitNavigation: 'https://main--blog--adobe.hlx.page/en/topics/bla',
    }).run();
    assert.strictEqual(
      navigated,
      'https://main--blog--adobe.hlx.page/en/topics/bla',
      'Preview URL not opened',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Preview plugin preserves query parameters and hash when switching to preview', async () => {
    const setup = new Setup('blog');
    nock.sidekick(setup);
    nock.admin(setup);
    const { navigated } = await new SidekickTest({
      browser,
      page,
      url: 'https://main--blog--adobe.hlx.live/en/topics/bla?foo=bar',
      plugin: 'preview',
      waitNavigation: 'https://main--blog--adobe.hlx.page/en/topics/bla?foo=bar',
    }).run();
    assert.strictEqual(
      navigated,
      'https://main--blog--adobe.hlx.page/en/topics/bla?foo=bar',
      'Query parameters not preserved',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Preview plugin does not forward onedrive query parameters when switching to preview', async () => {
    nock('https://main--blog--adobe.hlx.page')
      .get('/en/topics/bla')
      .reply(200, 'some content...');
    const setup = new Setup('blog');
    nock.sidekick(setup);
    nock.admin(setup);
    const { popupOpened } = await new SidekickTest({
      browser,
      page,
      url: 'https://adobe.sharepoint.com/:w:/r/sites/TheBlog/_layouts/15/Doc.aspx?sourcedoc=%7BE8EC80CB-24C3-4B95-B082-C51FD8BC8760%7D&file=bla.docx&action=default&mobileredirect=true',
      plugin: 'preview',
      waitPopup: 2000,
    }).run();
    assert.strictEqual(
      popupOpened,
      'https://main--blog--adobe.hlx.page/en/topics/bla',
      'Unexpected editor query parameters forwarded',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);
});
