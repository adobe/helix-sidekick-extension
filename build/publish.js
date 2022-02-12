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
/* eslint-disable no-console, import/no-extraneous-dependencies, no-case-declarations */

const fs = require('fs-extra');
const { fetch } = require('@adobe/helix-fetch').h1();

const supportedBrowsers = ['chrome'];

const {
  GOOGLE_APP_ID,
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_REFRESH_TOKEN,
} = process.env;

async function publishExtension(browser) {
  if (browser === 'chrome') {
    // get access token
    const tokenResp = await fetch('https://accounts.google.com/o/oauth2/token', {
      method: 'POST',
      body: new URLSearchParams([
        ['client_id', GOOGLE_CLIENT_ID],
        ['client_secret', GOOGLE_CLIENT_SECRET],
        ['refresh_token', GOOGLE_REFRESH_TOKEN],
        ['grant_type', 'refresh_token'],
        ['redirect_uri', 'urn:ietf:wg:oauth:2.0:oob'],
      ]),
    });
    if (!tokenResp.ok) {
      const msg = await tokenResp.text();
      throw new Error(`failed to retrieve access token: ${tokenResp.status} ${msg}`);
    }
    const { access_token: ACCESS_TOKEN } = await tokenResp.json();

    // upload zip
    const uploadResp = await fetch(`https://www.googleapis.com/upload/chromewebstore/v1.1/items/${GOOGLE_APP_ID}`, {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${ACCESS_TOKEN}`,
        'x-goog-api-version': 2,
      },
      body: Buffer.from(fs.readFileSync('./dist/chrome.zip')),
    });
    if (!uploadResp.ok) {
      throw new Error(`upload failed: ${uploadResp.status} ${await uploadResp.text()}`);
    }
    const { uploadState, itemError } = await uploadResp.json();
    if (uploadState === 'FAILURE') {
      const message = itemError && itemError[0] && itemError[0].error_detail;
      throw new Error(`upload failed: ${message}`);
    }

    // publish extension
    const publishResp = await fetch(`https://www.googleapis.com/chromewebstore/v1.1/items/${GOOGLE_APP_ID}/publish`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${ACCESS_TOKEN}`,
        'x-goog-api-version': 2,
        'content-length': 0,
      },
    });
    if (!publishResp.ok) {
      throw new Error(`publication failed: ${publishResp.status} ${await publishResp.text()}`);
    }
    const { status, statusDetail } = await publishResp.json();
    if (status[0] !== 'OK') {
      throw new Error(`publication failed: ${statusDetail[0]}`);
    }
  }
  console.log('  successfully published');
}

// run publish script
const browser = process.argv[2];
if (!browser) {
  console.log(`specify one of the following browers: ${supportedBrowsers.join(', ')}`);
  process.exit(0);
}
if (!supportedBrowsers.includes(browser)) {
  console.error(`unsupported browser ${browser}`);
  process.exit(1);
}

console.log(`publishing chrome extension ${GOOGLE_APP_ID}...`);

publishExtension(browser)
  .then(() => console.log('done.'))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
