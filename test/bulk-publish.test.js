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
  mockRequests: (nock) => {
    nock('https://main--blog--adobe.hlx.live').persist().get(/.*/).reply(200, '');
    nock('https://blog.adobe.com').persist().get(/.*/).reply(200, '');
  },
}, {
  env: 'gdrive',
  setup: new Setup('pages'),
  fixture: GDRIVE_FIXTURE,
  mockRequests: (nock) => {
    nock('https://main--pages--adobe.hlx.live').persist().get(/.*/).reply(200, '');
    nock('https://pages.adobe.com').persist().get(/.*/).reply(200, '');
  },
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
    nock.admin(setup, {
      route: 'status',
      type: 'admin',
    });
    nock.sidekick(setup);
    const { plugins } = await new SidekickTest({
      browser,
      page,
      fixture: TESTS[0].fixture,
      url: setup.getUrl('edit', 'admin'),
      pre: (p) => p.evaluate(() => {
        // user deselects file
        document.getElementById('file-pdf').setAttribute('aria-selected', 'false');
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
    });
    const { plugins } = await new SidekickTest({
      browser,
      page,
      fixture: TESTS[0].fixture,
      url: setup.getUrl('edit', 'admin'),
      sleep: 1000,
      loadModule: true,
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
    });
    const { notification } = await new SidekickTest({
      browser,
      page,
      fixture: TESTS[0].fixture,
      url: setup.getUrl('edit', 'admin'),
      plugin: 'bulk-publish',
      pre: (p) => p.evaluate(() => {
        // user deselects file
        document.getElementById('file-pdf').setAttribute('aria-selected', 'false');
      }),
      loadModule: true,
    }).run();
    assert.strictEqual(notification.message, 'No file selected', 'Empty text not shown');
  }).timeout(IT_DEFAULT_TIMEOUT);

  TESTS.forEach(({
    env,
    fixture,
    setup,
    mockRequests,
  }) => {
    it(`Bulk publish plugin publishes existing selection in ${env}`, async () => {
      mockRequests(nock);
      const { owner, repo, ref } = setup.sidekickConfig;
      nock.sidekick(setup);
      nock.admin(setup, {
        route: 'status',
        type: 'admin',
      });
      nock.admin(setup, {
        route: 'preview',
        type: 'html',
        method: 'post',
      });
      const { requestsMade } = await new SidekickTest({
        browser,
        page,
        fixture,
        sidekickConfig: setup.sidekickConfig,
        configJson: setup.configJson,
        url: setup.getUrl('edit', 'admin'),
        plugin: 'bulk-publish',
        pluginSleep: 500,
        loadModule: true,
        acceptDialogs: true,
      }).run();
      const updateReq = requestsMade
        .filter((r) => r.method === 'POST')
        .find((r) => r.url === `https://admin.hlx.page/live/${owner}/${repo}/${ref}/documents/file.pdf`);
      assert.ok(updateReq, `Publish URL not updated in ${env}`);
    }).timeout(IT_DEFAULT_TIMEOUT);

    it(`Bulk publish plugin publishes user selection in ${env} and copies publish URLs to clipboard`, async () => {
      mockRequests(nock);
      const { owner, repo, ref } = setup.sidekickConfig;
      nock.sidekick(setup);
      nock.admin(setup, {
        route: 'status',
        type: 'admin',
      });
      nock.admin(setup, {
        route: 'preview',
        type: 'html',
        method: 'post',
        persist: true,
      });
      const { requestsMade, checkPageResult: clipboardText } = await new SidekickTest({
        browser,
        page,
        fixture,
        sidekickConfig: setup.sidekickConfig,
        configJson: setup.configJson,
        url: setup.getUrl('edit', 'admin'),
        plugin: 'bulk-publish',
        pluginSleep: 1000,
        pre: (p) => p.evaluate(() => {
          // user selects more files
          document.getElementById('file-word').setAttribute('aria-selected', 'true');
          document.getElementById('file-excel').setAttribute('aria-selected', 'true');
        }),
        checkPage: (p) => p.evaluate(() => {
          window.hlx.clipboardText = 'dummy';
          window.navigator.clipboard.writeText = (text) => {
            window.hlx.clipboardText = text;
          };
          // user clicks copy URLs button
          // eslint-disable-next-line no-underscore-dangle
          window.hlx.sidekick._modal.querySelector('button').click();
          // wait 500ms gthen get clipboard text
          return new Promise((resolve) => {
            setTimeout(() => {
              resolve(window.hlx.clipboardText);
            }, 500);
          });
        }),
        loadModule: true,
        acceptDialogs: true,
      }).run();
      const updateReqs = requestsMade
        .filter((r) => r.method === 'POST')
        .map((r) => r.url);
      assert.deepEqual(
        updateReqs,
        [
          `https://admin.hlx.page/live/${owner}/${repo}/${ref}/documents/file.pdf`,
          `https://admin.hlx.page/live/${owner}/${repo}/${ref}/documents/document${env === 'gdrive' ? '.docx' : ''}`,
          `https://admin.hlx.page/live/${owner}/${repo}/${ref}/documents/spreadsheet${env === 'gdrive' ? '.xlsx' : '.json'}`,
        ],
        `User selection not recognized in ${env}`,
      );
      assert.ok(clipboardText !== 'dummy', `URLs not copied to clipboard in ${env}`);
    }).timeout(IT_DEFAULT_TIMEOUT);
  });

  it('Bulk publish plugin handles error response', async () => {
    TESTS[0].mockRequests(nock);
    const { setup } = TESTS[0];
    nock.sidekick(setup);
    nock.admin(setup, {
      route: 'status',
      type: 'admin',
    });
    nock.admin(setup, {
      route: 'preview',
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
    TESTS[0].mockRequests(nock);
    const { setup } = TESTS[0];
    nock.sidekick(setup);
    nock.admin(setup, {
      route: 'status',
      type: 'admin',
    });
    nock.admin(setup, {
      route: 'preview',
      type: 'html',
      method: 'post',
      status: [200, 404],
      persist: true,
    });
    const { notification } = await new SidekickTest({
      browser,
      page,
      fixture: SHAREPOINT_FIXTURE,
      url: setup.getUrl('edit', 'admin'),
      plugin: 'bulk-publish',
      pluginSleep: 1000,
      pre: (p) => p.evaluate(() => {
        // select another file
        document.getElementById('file-word').setAttribute('aria-selected', 'true');
      }),
      loadModule: true,
      acceptDialogs: true,
    }).run();
    assert.ok(
      notification.className.includes('level-1'),
      'Did not handle partial error',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Bulk publish plugin refetches status after navigation', async () => {
    TESTS[0].mockRequests(nock);
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
      status: [200],
    });
    const { requestsMade } = await new SidekickTest({
      browser,
      page,
      plugin: 'bulk-publish',
      pluginSleep: 1000,
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
