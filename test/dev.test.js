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

describe('Test dev plugin', () => {
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

  it('Dev plugin hidden by default', async () => {
    const { plugins } = await new SidekickTest({
      browser,
      page,
    }).run();
    assert.ok(
      plugins.find((p) => p.id === 'dev' && p.classes.includes('hlx-sk-advanced-only')),
      'Dev plugin not hidden by default',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Dev plugin switches to dev from gdrive URL', async () => {
    nock('http://localhost:3000')
      .get('/creativecloud/en/test')
      .reply(200, 'local dev...');
    nock.admin(new Setup('pages'));
    const { popupOpened } = await new SidekickTest({
      browser,
      page,
      setup: 'pages',
      url: 'https://docs.google.com/document/d/2E1PNphAhTZAZrDjevM0BX7CZr7KjomuBO6xE1TUo9NU/edit',
      plugin: 'dev',
      waitPopup: 2000,
    }).run();
    assert.strictEqual(
      popupOpened,
      'http://localhost:3000/creativecloud/en/test',
      'Dev URL not opened',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Dev plugin switches to dev from onedrive URL', async () => {
    nock('http://localhost:3000')
      .get('/en/topics/bla')
      .reply(200, 'local dev...');
    nock.admin(new Setup('blog'));
    const { popupOpened } = await new SidekickTest({
      browser,
      page,
      url: 'https://adobe.sharepoint.com/:w:/r/sites/TheBlog/_layouts/15/Doc.aspx?sourcedoc=%7BE8EC80CB-24C3-4B95-B082-C51FD8BC8760%7D&file=bla.docx&action=default&mobileredirect=true',
      plugin: 'dev',
      waitPopup: 2000,
    }).run();
    assert.strictEqual(
      popupOpened,
      'http://localhost:3000/en/topics/bla',
      'Dev URL not opened',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Dev plugin switches to dev from preview URL', async () => {
    nock.admin(new Setup('blog'));
    await new SidekickTest({
      browser,
      page,
      plugin: 'dev',
      waitNavigation: 'http://localhost:3000/en/topics/bla',
    }).run();
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Dev plugin switches to dev from production URL', async () => {
    nock.admin(new Setup('blog'));
    await new SidekickTest({
      browser,
      page,
      url: 'https://blog.adobe.com/en/topics/bla',
      plugin: 'dev',
      waitNavigation: 'http://localhost:3000/en/topics/bla',
    }).run();
  }).timeout(IT_DEFAULT_TIMEOUT);
});
