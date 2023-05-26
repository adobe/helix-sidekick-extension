/*
 * Copyright 2020 Adobe. All rights reserved.
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
/* eslint-disable no-console */

import assert from 'assert';
import puppeteer from 'puppeteer';
import { IT_DEFAULT_TIMEOUT } from './utils.js';

describe.skip('Test sidekick extension', () => {
  let browser;
  let extPage;
  let extensionId;
  beforeEach(async function beforeEach() {
    this.timeout(IT_DEFAULT_TIMEOUT);
    browser = await puppeteer.launch({
      headless: false,
      devtools: true,
      args: [
        '--disable-popup-blocking',
        '--disable-web-security',
        '-no-sandbox',
        '-disable-setuid-sandbox',
        '--disable-extensions-except=./src/extension',
        '--load-extension=./src/extension',
      ],
      slowMo: false,
    });

    const extensionTarget = await browser.waitForTarget((target) => target.type() === 'service_worker');
    const partialExtensionUrl = extensionTarget.url() || '';
    [, , extensionId] = partialExtensionUrl.split('/');
    console.log('extension id', extensionId);

    extPage = await browser.newPage();
    extPage.on('console', (msg) => {
      // eslint-disable-next-line no-console
      console.log(`> [${msg.type()}] ${msg.text()}`);
    });
    // instrument requests
    extPage.setRequestInterception(true);
    extPage.on('request', async (req) => {
      const url = req.url();
      console.log('[pup] request:', url);
      if (url === 'https://admin.hlx.page/sidekick/example/test/main/env.json') {
        req.respond({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            project: 'Test Project',
            prod: {
              host: 'www.example.com',
            },
            contentSourceUrl: 'https://example.sharepoint.com/documents/website',
          }),
        });
      } else {
        req.continue();
      }
    });
  });

  afterEach(async () => {
    // await browser.close();
  });

  it('Opens the options and can add project', async () => {
    const extensionUrl = `chrome-extension://${extensionId}/options.html`;
    await extPage.goto(extensionUrl, { waitUntil: 'load' });

    await extPage.evaluate(async () => {
      console.log('extension id', chrome.runtime.id);
      console.log('context menus', chrome.contextMenus);
      console.log('sidekick', window.hlx);
    });

    // instrument dialogs
    let dialog;
    const dlg = new Promise((res) => {
      extPage.on('dialog', async (d) => {
        dialog = {
          type: d.type(),
          message: d.message(),
        };
        console.log('[pup] dialog:', dialog);
        await d.accept();
        res();
      });
    });

    const inputGitUrl = await extPage.$('#giturl');
    await inputGitUrl.type('https://github.com/example/test');
    await extPage.click('#addManualConfigButton');
    await dlg;

    // check dlg message
    assert.deepStrictEqual(dialog, {
      message: 'Project added to Sidekick',
      type: 'alert',
    });

    // check if project is rendered
    const $projTitle = await extPage.waitForSelector('#config-0 h4');
    const projTitle = await $projTitle.evaluate((el) => el.innerText);
    assert.strictEqual(projTitle.trim(), 'Test Project');

    // read the configs
    const configs = await extPage.evaluate(async () => {
      const cfgs = await chrome.storage.sync.get('hlxSidekickConfigs');
      console.log(cfgs);
      return cfgs.hlxSidekickConfigs;
    });
    console.log(configs);
    assert.deepStrictEqual(configs, [{
      giturl: 'https://github.com/example/test',
      host: 'www.example.com',
      id: 'example/test/main',
      mountpoints: [
        'https://example.sharepoint.com/documents/website',
      ],
      owner: 'adobe',
      project: 'Test Project',
      ref: 'main',
      repo: 'helix-sidekick',
    },
    ]);
  }).timeout(IT_DEFAULT_TIMEOUT);
});
