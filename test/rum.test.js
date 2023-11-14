/*
 * Copyright 2023 Adobe. All rights reserved.
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

describe('Test RUM', () => {
  /** @type TestBrowser */
  let browser;
  let page;
  let nock;

  before(async function before() {
    this.timeout(10000);
    browser = await TestBrowser.create();
  });

  after(async () => browser.close());

  beforeEach(async () => {
    page = await browser.openPage();
    nock = new Nock();
  });

  afterEach(async () => {
    await browser.closeAllPages();
    nock.done();
  });

  it('Detects platform and browser in different user agents', async () => {
    const setup = new Setup('blog');
    const userAgents = [
      {
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 Edg/119.0.2151.58',
        p: 'windows',
        b: 'edge',
      },
      {
        ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
        p: 'windows',
        b: 'chrome',
      },
      {
        ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
        p: 'macos',
        b: 'safari',
      },
      {
        ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
        p: 'ios',
        b: 'safari',
      },
      {
        ua: 'Mozilla/5.0 (X11; Linux i686; rv:109.0) Gecko/20100101 Firefox/119.0',
        p: 'linux',
        b: 'firefox',
      },
      {
        ua: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36 OPR/105.0.0.0',
        p: 'macos',
        b: 'opera',
      },
      {
        ua: 'Mozilla/5.0 (Linux; Android 4.4.4; en-au; SAMSUNG SM-N915G Build/KTU84P) AppleWebKit/537.36 (KTHML, like Gecko) Version/2.0 Chrome/34.0.1847.76 Mobile Safari/537.36',
        p: 'android',
        b: 'samsung',
      },
    ];

    const runUserAgentTest = async (cfg = {}) => {
      const { ua: userAgent, p: platform, b: browserName } = cfg;
      let rumTarget = '';
      nock.sidekick(setup);
      nock.admin(setup);
      await page.setUserAgent(userAgent);
      await new SidekickTest({
        browser,
        page,
        checkRUM: (_, data) => {
          if (data.checkpoint === 'sidekick:loaded') {
            rumTarget = data.target;
          }
          return 'data received';
        },
        loadModule: true,
      }).run();
      const [detectedPlatform, detectedBrowser] = rumTarget.split(':');
      assert.strictEqual(detectedPlatform, platform, `Unexpected platform detected: ${detectedBrowser}`);
      assert.strictEqual(detectedBrowser, browserName, `Unexpected browser detected: ${detectedBrowser}`);
    };

    while (userAgents.length > 0) {
      // eslint-disable-next-line no-await-in-loop
      await runUserAgentTest(userAgents.shift());
    }
  }).timeout(IT_DEFAULT_TIMEOUT);
});
