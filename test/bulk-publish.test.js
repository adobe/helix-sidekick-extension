/*
 * Copyright 2022 Adobe. All rights reserved.
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

const SHAREPOINT_FIXTURE = 'admin-sharepoint.html';
const GDRIVE_FIXTURE = 'admin-gdrive.html';
const TESTS = [{
  env: 'sharepoint',
  setup: new Setup('blog'),
  fixture: SHAREPOINT_FIXTURE,
}, {
  env: 'gdrive',
  setup: new Setup('pages'),
  fixture: GDRIVE_FIXTURE,
}];

describe('Test bulk publish plugin', () => {
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

  it('Bulk publish plugin hidden on empty selection', async () => {
    const { setup } = TESTS[0];
    nock.sidekick(setup);
    nock.admin(setup, {
      route: 'status',
      type: 'admin',
    });
    const { plugins } = await new SidekickTest({
      browser,
      page,
      fixture: TESTS[0].fixture,
      url: setup.getUrl('edit', 'admin'),
      pre: (p) => p.evaluate(() => {
        // user deselects all
        document.getElementById('file-pdf').click();
        document.getElementById('file-word').click();
      }),
      loadModule: true,
    }).run();
    assert.ok(
      plugins.find((p) => p.id === 'bulk-publish' && p.classes.includes('hlx-sk-hidden')),
      'Plugin not hidden on empty selection',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Bulk publish plugin hidden via project config', async () => {
    const { setup } = TESTS[0];
    nock.sidekick(setup, {
      configJson: `{
        "host": "blog.adobe.com",
        "plugins": [{
          "id": "publish",
          "excludePaths": ["/**"]
        }]
      }`,
    });
    nock.admin(setup, {
      route: 'status',
      type: 'admin',
      persist: true,
    });
    const { plugins } = await new SidekickTest({
      browser,
      page,
      fixture: TESTS[0].fixture,
      url: setup.getUrl('edit', 'admin'),
      loadModule: true,
      pre: (p) => p.evaluate(() => {
        // user deselects all
        document.getElementById('file-pdf').click();
        document.getElementById('file-word').click();
      }),
      post: (p) => p.evaluate(() => {
        // user selects another file
        document.getElementById('file-excel').click();
      }),
    }).run();
    assert.ok(
      plugins.find((p) => p.id === 'bulk-publish' && p.classes.includes('hlx-sk-hidden')),
      'Plugin not hidden via project config',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Bulk publish plugin shows notification when triggered with empty selection', async () => {
    const { setup } = TESTS[0];
    nock.sidekick(setup);
    nock.admin(setup, {
      route: 'status',
      type: 'admin',
      persist: true,
    });
    const { notification } = await new SidekickTest({
      browser,
      page,
      fixture: TESTS[0].fixture,
      url: setup.getUrl('edit', 'admin'),
      plugin: 'bulk-publish',
      pre: (p) => p.evaluate(() => {
        // user deselects all
        document.getElementById('file-pdf').click();
        document.getElementById('file-word').click();
      }),
      loadModule: true,
    }).run();
    assert.strictEqual(notification.message, 'No file selected', 'Empty text not shown');
  }).timeout(IT_DEFAULT_TIMEOUT);

  TESTS.forEach(({
    env,
    fixture,
    setup,
  }) => {
    it(`Bulk publish plugin publishes existing selection in ${env}`, async () => {
      nock.sidekick(setup);
      nock.bulkJob(setup, {
        route: 'live',
        topic: 'publish',
        resources: [
          { path: '/documents/file.pdf', status: 200 },
        ],
      });
      const { notification } = await new SidekickTest({
        browser,
        page,
        fixture,
        sidekickConfig: setup.sidekickConfig,
        configJson: setup.configJson,
        url: setup.getUrl('edit', 'admin'),
        plugin: 'bulk-publish',
        pluginSleep: 5000,
        loadModule: true,
        acceptDialogs: true,
      }).run();
      assert.ok(
        notification?.message.startsWith('1 file successfully published'),
        'Did not bulk publish existing selection',
      );
    }).timeout(IT_DEFAULT_TIMEOUT);

    it(`Bulk publish plugin publishes user selection in ${env}, copies publish URLs to clipboard and opens them`, async () => {
      nock.sidekick(setup);
      nock.bulkJob(setup, {
        route: 'live',
        topic: 'publish',
        resources: [
          { path: '/documents/file.pdf', status: 200 },
          { path: `/documents/document${env === 'gdrive' ? '.docx' : ''}`, status: 304 },
          { path: `/documents/spreadsheet${env === 'gdrive' ? '.xlsx' : ''}`, status: 304 },
        ],
      });
      const { notification, checkPageResult } = await new SidekickTest({
        browser,
        page,
        fixture,
        sidekickConfig: setup.sidekickConfig,
        configJson: setup.configJson,
        url: setup.getUrl('edit', 'admin'),
        plugin: 'bulk-publish',
        pluginSleep: 5000,
        pre: (p) => p.evaluate(() => {
          // user selects one more file
          document.getElementById('file-excel').click();
        }),
        checkPage: (p) => p.evaluate(() => {
          window.hlx.clipboardText = 'dummy';
          window.navigator.clipboard.writeText = (text) => {
            window.hlx.clipboardText = text;
          };
          window.hlx.openedWindows = [];
          window.open = (url) => window.hlx.openedWindows.push(url);
          // user clicks copy and open URLs buttons
          // eslint-disable-next-line no-underscore-dangle
          window.hlx.sidekick._modal.querySelectorAll('button').forEach((b) => b.click());
          // wait 500ms, then get clipboard text and opened windows
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve([window.hlx.clipboardText, window.hlx.openedWindows]);
            }, 500);
          });
        }),
        loadModule: true,
        acceptDialogs: true,
      }).run();
      const [clipboardText, openedWindows] = checkPageResult;
      assert.ok(
        notification?.message.startsWith('3 files successfully published'),
        'Did not bulk publish user selection',
      );
      assert.strictEqual(clipboardText.split('\n').length, 3, `3 URLs not copied to clipboard in ${env}: \n${clipboardText}`);
      assert.strictEqual(openedWindows.length, 3, `3 URLs not opened in ${env}: \n${openedWindows.join('\n')}`);
    }).timeout(IT_DEFAULT_TIMEOUT);
  });

  it('Bulk publish plugin previews single selection without creating a job', async () => {
    const { setup, fixture } = TESTS[0];
    const { sidekickConfig, configJson } = setup;
    nock.sidekick(setup);
    nock.admin(setup, {
      route: 'status',
      persist: true,
    });
    nock.admin(setup, {
      route: 'live',
      method: 'post',
    });
    const { requestsMade } = await new SidekickTest({
      browser,
      page,
      fixture,
      sidekickConfig,
      configJson,
      url: setup.getUrl('edit', 'admin'),
      plugin: 'bulk-publish',
      // only select first file
      pre: (p) => p.evaluate(() => document.querySelectorAll('div.file')
        .forEach((file, i) => file.setAttribute('aria-selected', `${i === 0}`))),
      loadModule: true,
      acceptDialogs: true,
    }).run();
    assert.ok(
      requestsMade.find((req) => req.method === 'POST' && !new URL(req.url).pathname.startsWith('/*')),
      'Did not bulk publish single selection without creating a job',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Bulk publish plugin handles error response', async () => {
    const { setup } = TESTS[0];
    nock.sidekick(setup);
    nock.admin(setup, {
      route: 'status',
      type: 'admin',
      persist: true,
    });
    nock.admin(setup, {
      route: 'live',
      type: 'html',
      method: 'post',
      status: [404],
    });
    const { notification } = await new SidekickTest({
      browser,
      page,
      fixture: SHAREPOINT_FIXTURE,
      url: setup.getUrl('edit', 'admin'),
      plugin: 'bulk-publish',
      pluginSleep: 1000,
      loadModule: true,
      acceptDialogs: true,
    }).run();
    assert.ok(
      notification.className.includes('level-0'),
      'Did not handle error',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Bulk publish plugin handles partial error response', async () => {
    const { setup } = TESTS[0];
    nock.sidekick(setup);
    nock.bulkJob(setup, {
      route: 'live',
      topic: 'publish',
      resources: [
        { path: '/documents/file.pdf', status: 200 },
        { path: '/documents/document', status: 404 },
      ],
      failed: 1,
    });
    const { notification } = await new SidekickTest({
      browser,
      page,
      fixture: SHAREPOINT_FIXTURE,
      url: setup.getUrl('edit', 'admin'),
      plugin: 'bulk-publish',
      pluginSleep: 5000,
      loadModule: true,
      acceptDialogs: true,
    }).run();
    assert.ok(
      notification.className.includes('level-1'),
      'Did not handle partial error',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Bulk publish plugin refetches status after navigation', async () => {
    const { setup } = TESTS[0];
    nock.sidekick(setup);
    nock.bulkJob(setup, {
      route: 'live',
      topic: 'publish',
      resources: [
        { path: '/documents/file.pdf', status: 200 },
      ],
    });
    const { requestsMade } = await new SidekickTest({
      browser,
      page,
      plugin: 'bulk-publish',
      pluginSleep: 5000,
      acceptDialogs: true,
      fixture: SHAREPOINT_FIXTURE,
      url: setup.getUrl('edit', 'admin'),
      post: (p) => p.evaluate((url) => {
        document.getElementById('sidekick_test_location').value = `${url}&navigated=true`;
      }, setup.getUrl('edit', 'admin')),
      checkPage: (p) => p.evaluate(() => new Promise((resolve) => {
        // wait a bit
        setTimeout(resolve, 1000);
      })),
      loadModule: true,
    }).run();
    const statusReqs = requestsMade
      .filter((r) => r.url.startsWith('https://admin.hlx.page/status/'))
      .map((r) => r.url);
    assert.ok(
      statusReqs.length === 2,
      'Did not refetch status after navigation',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);
});
