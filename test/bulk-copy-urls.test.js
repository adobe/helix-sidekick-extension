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

describe('Test bulk copy URLs plugin', () => {
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

  it('Bulk copy URLs plugin button text adapts based on selection', async () => {
    const { setup } = TESTS[0];
    nock.admin(setup, {
      route: 'status',
      type: 'admin',
      persist: true,
    });
    nock.sidekick(setup);
    const { checkPageResult: buttonTexts } = await new SidekickTest({
      browser,
      page,
      fixture: SHAREPOINT_FIXTURE,
      url: setup.getUrl('edit', 'admin'),
      checkPage: (p) => p.evaluate(async () => {
        const retrieveButtonText = (texts = []) => {
          const plugin = window.hlx.sidekick.get('bulk-copy-urls');
          const button = plugin.querySelector(':scope > button');
          const text = button.textContent;
          texts.push(text);
          return texts;
        };
        const btnTexts = retrieveButtonText();
        // change selection
        document.getElementById('file-word').click();
        // wait 1s
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(retrieveButtonText(btnTexts));
          }, 500);
        });
      }),
      loadModule: true,
      acceptDialogs: true,
    }).run();
    assert.deepStrictEqual(buttonTexts, ['Copy URLs', 'Copy URL'], 'Did not adapt button text');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Bulk copy URLs plugin hidden on empty selection', async () => {
    const { setup } = TESTS[0];
    nock.admin(setup, {
      route: 'status',
      type: 'admin',
      persist: true,
    });
    nock.sidekick(setup);
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
      plugins.find((p) => p.id === 'bulk-copy-urls' && p.classes.includes('hlx-sk-hidden')),
      'Plugin not hidden on empty selection',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Bulk copy preview URLs plugin shows notification when triggered with empty selection', async () => {
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
      plugin: 'bulk-copy-preview-urls',
      pre: (p) => p.evaluate(() => {
        // user deselects all
        document.getElementById('file-pdf').click();
        document.getElementById('file-word').click();
      }),
      loadModule: true,
    }).run();
    assert.strictEqual(notification.message, 'No file selected', 'Empty text not shown');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Bulk copy live URLs plugin hidden with production host', async () => {
    const { setup } = TESTS[0];
    nock.sidekick(setup);
    nock.admin(setup, {
      route: 'status',
      type: 'admin',
      persist: true,
    });
    const { plugins } = await new SidekickTest({
      browser,
      page,
      sidekickConfig: setup.sidekickConfig,
      configJson: setup.configJson,
      fixture: TESTS[0].fixture,
      url: setup.getUrl('edit', 'admin'),
      loadModule: true,
    }).run();
    assert.ok(
      plugins.find((p) => p.id === 'bulk-copy-live-urls' && p.classes.includes('hlx-sk-advanced-only')),
      'Plugin not hidden with production host',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Bulk copy preview URLs plugin prevents duplicate slashes in path if root folder', async () => {
    const { setup } = TESTS[0];
    nock.sidekick(setup);
    nock('https://admin.hlx.page/status')
      .get(/.*/)
      .twice()
      .reply(200, {
        ...setup.apiResponse('admin'),
        webPath: '/', // root folder
      });
    const { checkPageResult: clipboardText } = await new SidekickTest({
      browser,
      page,
      fixture: TESTS[0].fixture,
      sidekickConfig: setup.sidekickConfig,
      url: setup.getUrl('edit', 'admin'),
      plugin: 'bulk-copy-preview-urls',
      pluginSleep: 500,
      post: (p) => p.evaluate(() => {
        window.hlx.clipboardText = 'dummy';
        window.navigator.clipboard.writeText = (text) => {
          window.hlx.clipboardText = text;
        };
      }),
      checkPage: (p) => p.evaluate(() => window.hlx.clipboardText),
      loadModule: true,
    }).run();
    assert.ok(
      !new URL(clipboardText).pathname.startsWith('//'),
      `Preview URL contains duplicate slashes in path: ${clipboardText}`,
    );
  });

  it('Bulk copy preview URLs plugin uses json extension for spreadsheet', async () => {
    const { setup } = TESTS[1];
    nock.sidekick(setup);
    nock.admin(setup, {
      route: 'status',
      type: 'admin',
      persist: true,
    });
    const { checkPageResult: clipboardText } = await new SidekickTest({
      browser,
      page,
      fixture: TESTS[1].fixture,
      sidekickConfig: setup.sidekickConfig,
      url: setup.getUrl('edit', 'admin'),
      plugin: 'bulk-copy-preview-urls',
      pluginSleep: 500,
      pre: (p) => p.evaluate(() => {
        // select spreadsheet
        document.getElementById('file-pdf').click();
        document.getElementById('file-gsheet').click();
      }),
      post: (p) => p.evaluate(() => {
        window.hlx.clipboardText = 'dummy';
        window.navigator.clipboard.writeText = (text) => {
          window.hlx.clipboardText = text;
        };
      }),
      checkPage: (p) => p.evaluate(() => window.hlx.clipboardText),
      loadModule: true,
    }).run();
    assert.ok(
      clipboardText.endsWith('spreadsheet.json'),
      `Preview URL does not have json extension: ${clipboardText}`,
    );
  });

  it('Bulk copy preview URLs plugin handles file name with comma or dot in sharepoint views', async () => {
    const { setup } = TESTS[0];
    nock.sidekick(setup, {
      persist: true,
    });
    nock.admin(setup, {
      route: 'status',
      type: 'admin',
      persist: true,
    });
    const views = [
      {
        view: 'list',
        fixture: 'admin-sharepoint.html',
      },
      {
        view: 'grid',
        fixture: 'admin-sharepoint-grid.html',
      },
    ];
    while (views.length > 0) {
      const { view, fixture } = views.shift();
      // eslint-disable-next-line no-await-in-loop
      const { checkPageResult: clipboardText } = await new SidekickTest({
        browser,
        page,
        fixture,
        sidekickConfig: setup.sidekickConfig,
        plugin: 'bulk-copy-preview-urls',
        // pluginSleep: 1000,
        pre: (p) => p.evaluate(() => {
          // deselect all
          document.getElementById('file-pdf').click();
          document.getElementById('file-word').click();
          // select only files with comma and dot
          document.getElementById('file-comma').click();
          document.getElementById('file-dot').click();
        }),
        post: (p) => p.evaluate(() => {
          window.hlx.clipboardText = 'dummy';
          window.navigator.clipboard.writeText = (text) => {
            window.hlx.clipboardText = text;
          };
        }),
        checkPage: (p) => p.evaluate(() => window.hlx.clipboardText),
        loadModule: true,
      }).run(setup.getUrl('edit', 'admin'));
      const [fileComma, fileDot] = clipboardText.split('\n');
      assert.ok(
        fileComma.endsWith('/document-new'),
        `Unexpected preview URL for file with comma in  ${view} view: ${fileComma}`,
      );
      assert.ok(
        fileDot.endsWith('/document-other'),
        `Unexpected preview URL for file with dot in ${view} view: ${fileDot}`,
      );
    }
  });

  TESTS.forEach(({ env, fixture, setup }) => {
    it(`Bulk copy preview URLs plugin copies preview URLs for existing selection to clipboard in ${env}`, async () => {
      const { owner, repo, ref } = setup.sidekickConfig;
      nock.sidekick(setup);
      nock.admin(setup, {
        route: 'status',
        type: 'admin',
        persist: true,
      });
      const { checkPageResult: clipboardText } = await new SidekickTest({
        browser,
        page,
        fixture,
        sidekickConfig: setup.sidekickConfig,
        url: setup.getUrl('edit', 'admin'),
        plugin: 'bulk-copy-preview-urls',
        pluginSleep: 500,
        // only select first file
        pre: (p) => p.evaluate(() => document.querySelectorAll('div.file')
          .forEach((file, i) => file.setAttribute('aria-selected', `${i === 0}`))),
        post: (p) => p.evaluate(() => {
          window.hlx.clipboardText = 'dummy';
          window.navigator.clipboard.writeText = (text) => {
            window.hlx.clipboardText = text;
          };
        }),
        checkPage: (p) => p.evaluate(() => window.hlx.clipboardText),
        loadModule: true,
      }).run();
      assert.strictEqual(
        clipboardText,
        `https://${ref}--${repo}--${owner}.hlx.page/documents/file.pdf`,
        `URL not copied to clipboard in ${env}`,
      );
    }).timeout(IT_DEFAULT_TIMEOUT);

    it(`Bulk copy preview URLs plugin copies preview URLs for user selection to clipboard in ${env}`, async () => {
      const { owner, repo, ref } = setup.sidekickConfig;
      nock.sidekick(setup);
      nock.admin(setup, {
        route: 'status',
        type: 'admin',
        persist: true,
      });
      const { checkPageResult: clipboardText } = await new SidekickTest({
        browser,
        page,
        fixture,
        sidekickConfig: setup.sidekickConfig,
        url: setup.getUrl('edit', 'admin'),
        plugin: 'bulk-copy-preview-urls',
        pluginSleep: 500,
        // select all supported files
        pre: (p) => p.evaluate(() => document.querySelectorAll('div.file')
          .forEach((file) => file.setAttribute('aria-selected', 'true'))),
        post: (p) => p.evaluate(() => {
          window.hlx.clipboardText = 'dummy';
          window.navigator.clipboard.writeText = (text) => {
            window.hlx.clipboardText = text;
          };
        }),
        checkPage: (p) => p.evaluate(() => window.hlx.clipboardText),
        loadModule: true,
      }).run();
      assert.deepStrictEqual(
        clipboardText.split('\n'),
        [
          `https://${ref}--${repo}--${owner}.hlx.page/documents/file.pdf`,
          `https://${ref}--${repo}--${owner}.hlx.page/documents/document`,
          `https://${ref}--${repo}--${owner}.hlx.page/documents/spreadsheet.json`,
        ],
        `URLs not copied to clipboard in ${env}`,
      );
    }).timeout(IT_DEFAULT_TIMEOUT);

    it(`Bulk copy live URLs plugin copies live URLs for existing selection to clipboard in ${env}`, async () => {
      const { owner, repo, ref } = setup.sidekickConfig;
      nock.sidekick(setup);
      nock.admin(setup, {
        route: 'status',
        type: 'admin',
        persist: true,
      });
      const { checkPageResult: clipboardText } = await new SidekickTest({
        browser,
        page,
        fixture,
        sidekickConfig: setup.sidekickConfig,
        configJson: '{}',
        url: setup.getUrl('edit', 'admin'),
        plugin: 'bulk-copy-live-urls',
        pluginSleep: 500,
        // only select first file
        pre: (p) => p.evaluate(() => document.querySelectorAll('div.file')
          .forEach((file, i) => file.setAttribute('aria-selected', `${i === 0}`))),
        post: (p) => p.evaluate(() => {
          window.hlx.clipboardText = 'dummy';
          window.navigator.clipboard.writeText = (text) => {
            window.hlx.clipboardText = text;
          };
        }),
        checkPage: (p) => p.evaluate(() => window.hlx.clipboardText),
        loadModule: true,
      }).run();
      assert.strictEqual(
        clipboardText,
        `https://${ref}--${repo}--${owner}.hlx.live/documents/file.pdf`,
        `URL not copied to clipboard in ${env}`,
      );
    }).timeout(IT_DEFAULT_TIMEOUT);

    it(`Bulk copy prod URLs plugin copies production URLs for existing selection to clipboard in ${env}`, async () => {
      const { host } = JSON.parse(setup.configJson);
      nock.sidekick(setup);
      nock.admin(setup, {
        route: 'status',
        type: 'admin',
        persist: true,
      });
      const { checkPageResult: clipboardText } = await new SidekickTest({
        browser,
        page,
        fixture,
        sidekickConfig: setup.sidekickConfig,
        configJson: setup.configJson,
        url: setup.getUrl('edit', 'admin'),
        plugin: 'bulk-copy-prod-urls',
        pluginSleep: 500,
        // only select first file
        pre: (p) => p.evaluate(() => document.querySelectorAll('div.file')
          .forEach((file, i) => file.setAttribute('aria-selected', `${i === 0}`))),
        post: (p) => p.evaluate(() => {
          window.hlx.clipboardText = 'dummy';
          window.navigator.clipboard.writeText = (text) => {
            window.hlx.clipboardText = text;
          };
        }),
        checkPage: (p) => p.evaluate(() => window.hlx.clipboardText),
        loadModule: true,
      }).run();
      assert.strictEqual(
        clipboardText,
        `https://${host}/documents/file.pdf`,
        `URL not copied to clipboard in ${env}`,
      );
    }).timeout(IT_DEFAULT_TIMEOUT);

    it(`Bulk copy prod URLs plugin refetches status after navigation in ${env}`, async () => {
      nock.sidekick(setup);
      nock.admin(setup, {
        route: 'status',
        type: 'admin',
        persist: true,
      });
      const { requestsMade } = await new SidekickTest({
        browser,
        page,
        plugin: 'bulk-copy-prod-urls',
        acceptDialogs: true,
        fixture,
        url: setup.getUrl('edit', 'admin'),
        post: (p) => p.evaluate((url) => {
          url = new URL(url);
          url.searchParams.set('navigated', 'true');
          document.getElementById('sidekick_test_location').value = url.toString();
        }, setup.getUrl('edit', 'admin')),
        loadModule: true,
      }).run();
      assert.ok(
        requestsMade.find((r) => r.url.endsWith('navigated%3Dtrue')),
        'Did not refetch status after navigation',
      );
    }).timeout(IT_DEFAULT_TIMEOUT);
  });
});
