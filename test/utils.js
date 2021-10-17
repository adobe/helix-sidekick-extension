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
/* global window document */

'use strict';

const assert = require('assert');
const fs = require('fs-extra');
const puppeteer = require('puppeteer');

// set debug to true to see browser window and debug output
const DEBUG = false;
const IT_DEFAULT_TIMEOUT = 60000;
const MOCKS = {
  api: {
    dummy: {
      webPath: '/dummy',
    },
    blog: {
      webPath: '/en/topics/bla.html',
      preview: {
        lastModified: 'Fri, 18 Jun 2021 09:57:42 GMT',
      },
      live: {
        lastModified: 'Fri, 18 Jun 2021 09:57:42 GMT',
      },
      source: {
        lastModified: 'Fri, 18 Jun 2021 09:55:03 GMT',
      },
      edit: {
        url: 'https://adobe.sharepoint.com/:w:/r/sites/TheBlog/_layouts/15/Doc.aspx?sourcedoc=%7BE8EC80CB-24C3-4B95-B082-C51FD8BC8760%7D&file=bla.docx&action=default&mobileredirect=true',
      },
    },
    blogCode: {
      resourcePath: '/scripts/bla.js',
      webPath: '/scripts/bla.js',
      live: {
        url: 'https://master-theblog--adobe.hlx.live/scripts/bla.js',
      },
      code: {
        codeBusId: 'helix-code-bus/adobe/theblog/master/scripts/bla.js',
        contentType: 'application/javascript',
        contentLength: '11239',
        lastModified: 'Mon, 20 Sep 2021 18:44:07 GMT',
      },
      preview: {
        url: 'https://master--theblog--adobe.hlx3.page/scripts/bla.js',
      },
      edit: {
        url: 'https://github.com/adobe/theblog/edit/master/scripts/bla.js',
      },
      source: {
        lastModified: null,
        sourceLocation: 'https://raw.githubusercontent.com/adobe/theblog/master/scripts/bla.js',
      },
    },
    pages: {
      webPath: '/creativecloud/en/test',
      preview: {
        lastModified: 'Fri, 18 Jun 2021 09:57:42 GMT',
      },
      source: {
        lastModified: 'Fri, 18 Jun 2021 09:55:03 GMT',
      },
      edit: {
        url: 'https://docs.google.com/document/d/2E1PNphAhTZAZrDjevM0BX7CZr7KjomuBO6xE1TUo9NU/edit',
      },
    },
  },
  purge: [{ status: 'ok' }],
  html: '<html></html>',
  json: '{}',
};

const toResp = (resp) => ({
  status: resp ? 200 : 404,
  // eslint-disable-next-line no-nested-ternary
  body: resp ? (typeof resp === 'object' ? JSON.stringify(resp) : resp) : '',
});

const getPlugins = async (p) => p.evaluate(
  () => Array.from(window.hlx.sidekick
    .shadowRoot
    .querySelectorAll('.hlx-sk > div.env > div, .hlx-sk > div:not(.env)'))
    .map((plugin) => ({
      id: plugin.className,
      text: plugin.textContent,
      buttonPressed: plugin.querySelector(':scope > button')
        && plugin.querySelector(':scope > button').classList.contains('pressed'),
    })),
);

const waitForEvent = async (p, type) => p.evaluate((evtType) => {
  if (!evtType) return;
  const evtTypes = typeof evtType === 'string' ? [evtType] : evtType;
  evtTypes.forEach((et) => {
    // set up test var and event listener
    window[`${et}EventFired`] = false;
    window.hlx.sidekick.addEventListener(et, () => {
      window[`${et}EventFired`] = true;
    });
  });
}, type);

const checkEventFired = async (p, type) => p.evaluate(async (evtType) => {
  if (!evtType) return true;
  const evtTypes = typeof evtType === 'string' ? [evtType] : evtType;
  const results = await Promise.all(evtTypes.map((et) => window[`${et}EventFired`]));
  return results.every((res) => res === true);
}, type);

const execPlugin = async (p, id) => {
  await waitForEvent(p, 'pluginused');
  await p.evaluate((pluginId) => {
    const click = (el) => {
      const evt = document.createEvent('Events');
      evt.initEvent('click', true, false);
      el.dispatchEvent(evt);
    };
    if (pluginId) {
      click(window.hlx.sidekick.shadowRoot.querySelector(`.hlx-sk .${pluginId} button`));
    }
  }, id);
  assert.ok(await checkEventFired(p, 'pluginused'), 'Event pluginused not fired');
};

const clickButton = async (p, id) => p.evaluate((buttonId) => {
  const click = (el) => {
    const evt = document.createEvent('Events');
    evt.initEvent('click', true, false);
    el.dispatchEvent(evt);
  };
  click(window.hlx.sidekick.shadowRoot.querySelector(`.hlx-sk button.${buttonId}`));
}, id);

const mockStandardResponses = async (p, opts = {}) => {
  const {
    pluginsJs = '',
    configJs = '',
    check = () => true,
    mockResponses = [MOCKS.api.dummy],
  } = opts;
  await p.setRequestInterception(true);
  p.on('request', async (req) => {
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log(req.method(), req.url());
    }
    if (req.url().endsWith('/tools/sidekick/plugins.js')
      && check(req)) {
      req.respond(toResp(pluginsJs));
    } else if (req.url().endsWith('/tools/sidekick/config.js')
      && check(req)) {
      req.respond(toResp(configJs));
    } else if (req.url().startsWith('https://admin.hlx3.page/')) {
      req.respond(toResp(mockResponses.shift()));
    } else if (req.url() === 'https://www.hlx.live/tools/sidekick/module.js') {
      try {
        const data = await fs.readFile(`${__dirname}/../src/sidekick/module.js`, 'utf-8');
        req.respond(toResp(data));
      } catch (e) {
        console.error(e);
      }
    } else {
      // console.log(req.url());
      req.continue();
    }
  });
};

const testPageRequests = async ({
  page,
  url,
  plugin,
  events,
  prep = () => {},
  check = () => true,
  browserCheck: popupCheck,
  mockResponses = MOCKS.purge,
  checkCondition = (req) => req.url().startsWith('https://'),
  timeout = 0,
  timeoutSuccess = true,
}) => {
  await page.setRequestInterception(true);
  return new Promise((resolve, reject) => {
    if (typeof popupCheck === 'function') {
      page.browser().on('request', (req) => {
        if (popupCheck(req)) {
          resolve();
        }
      });
    }
    // watch for new browser window
    page.on('request', async (req) => {
      if (DEBUG) {
        // eslint-disable-next-line no-console
        console.log(req.method(), req.url());
      }
      if (req.url().endsWith('/tools/sidekick/plugins.js')
        || req.url().endsWith('/tools/sidekick/config.js')) {
        // send plugins response
        return req.respond(toResp());
      } else if (checkCondition(req)) {
        try {
          if (check(req)) {
            // check successful
            resolve();
          }
          if (req.url().startsWith('file://')) {
            // let file:// requests through
            // console.log(req.url());
            req.continue();
          } else {
            // send mock response
            // console.log(req.url());
            const response = toResp(mockResponses.shift() || '');
            return req.respond(response);
          }
        } catch (e) {
          reject(e);
        }
      }
      // let request continue
      // console.log(req.url());
      return req.continue();
    });
    // open url and optionally click plugin button
    page
      .goto(url, { waitUntil: 'load' })
      .then(() => prep(page))
      .then(() => waitForEvent(page, events))
      .then(() => execPlugin(page, plugin))
      .then(() => checkEventFired(page, events))
      .catch((e) => reject(e));
    if (timeout) {
      setTimeout(() => {
        if (timeoutSuccess) {
          resolve();
        } else {
          reject(new Error('check timed out'));
        }
      }, parseInt(timeout, 10));
    }
  });
};

const sleep = async (delay = 1000) => new Promise((resolve) => setTimeout(resolve, delay));

let browser;
let page;

const getBrowser = () => browser;

const getPage = () => page;

async function startBrowser() {
  this.timeout(10000);
  browser = await puppeteer.launch({
    devtools: DEBUG,
    args: [
      '--disable-popup-blocking',
      '--disable-web-security',
      '–no-sandbox',
      '–disable-setuid-sandbox',
    ],
  });
  page = await browser.newPage();
}

const stopBrowser = async () => {
  if (!DEBUG) {
    await browser.close();
    browser = null;
    page = null;
  }
};

module.exports = {
  IT_DEFAULT_TIMEOUT,
  MOCKS,
  getPlugins,
  waitForEvent,
  checkEventFired,
  execPlugin,
  clickButton,
  mockStandardResponses,
  testPageRequests,
  sleep,
  getBrowser,
  getPage,
  startBrowser,
  stopBrowser,
};
