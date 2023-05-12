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
    setup.apiResponse().edit = {}; // no source doc
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
    setup.apiResponse().edit = {}; // no source doc
    setup.apiResponse().live = {}; // page not published
    nock.sidekick(setup);
    nock.admin(setup);
    const { plugins } = await new SidekickTest({
      browser,
      page,
    }).run();
    assert.ok(!plugins.find((p) => p.id === 'unpublish'), 'Unexpected unpublish plugin found');
  }).timeout(IT_DEFAULT_TIMEOUT);
});
