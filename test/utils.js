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

'use strict';

const assert = require('assert');
const puppeteer = require('puppeteer');

// set debug to true to see browser window and debug output
const DEBUG = false;
const IT_DEFAULT_TIMEOUT = 60000;

const SETUPS = {
  none: {
    sidekickConfig: {},
    api: {
      status: {},
    },
    content: {
      html: '<html></html>',
      json: '{}',
      xml: '<?xml version="1.0" encoding="UTF-8"?><bla></bla>',
    },
  },
  pages: {
    sidekickConfig: {
      owner: 'adobe',
      repo: 'pages',
      ref: 'main',
    },
    configJs: 'window.hlx.initSidekick({host:"pages.adobe.com","hlx3":true});',
    api: {
      status: {
        html: {
          webPath: '/creativecloud/en/test',
          resourcePath: '/creativecloud/en/test.md',
          live: {
            url: 'https://main--pages--adobe.hlx.live/creativecloud/en/test',
            status: 200,
            lastModified: 'Fri, 18 Jun 2021 09:57:50 GMT',
          },
          preview: {
            url: 'https://main--pages--adobe.hlx.page/creativecloud/en/test',
            status: 200,
            lastModified: 'Fri, 18 Jun 2021 09:57:42 GMT',
          },
          edit: {
            url: 'https://docs.google.com/document/d/2E1PNphAhTZAZrDjevM0BX7CZr7KjomuBO6xE1TUo9NU/edit',
            status: 200,
            lastModified: 'Fri, 18 Jun 2021 09:55:03 GMT',
          },
        },
      },
    },
    content: {
      html: '<html></html>',
    },
  },
  blog: {
    sidekickConfig: {
      owner: 'adobe',
      repo: 'blog',
      ref: 'main',
      hlx3: true,
    },
    configJs: 'window.hlx.initSidekick({host:"blog.adobe.com"});',
    api: {
      status: {
        html: {
          webPath: '/en/topics/bla',
          resourcePath: '/en/topics/bla.md',
          live: {
            url: 'https://main--blog--adobe.hlx.live/en/topics/bla',
            status: 200,
            lastModified: 'Fri, 18 Jun 2021 09:57:02 GMT',
            permisions: [
              'read',
              'write',
              'delete',
            ],
          },
          preview: {
            url: 'https://main--blog--adobe.hlx.page/en/topics/bla',
            status: 200,
            lastModified: 'Fri, 18 Jun 2021 09:57:01 GMT',
            permisions: [
              'read',
              'write',
              'delete',
            ],
          },
          edit: {
            url: 'https://adobe.sharepoint.com/:w:/r/sites/TheBlog/_layouts/15/Doc.aspx?sourcedoc=%7BE8EC80CB-24C3-4B95-B082-C51FD8BC8760%7D&file=bla.docx&action=default&mobileredirect=true',
            lastModified: 'Fri, 18 Jun 2021 09:57:00 GMT',
          },
          profile: {
            email: 'jane@foo.bar',
            name: 'Jane Smith',
            picture: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 216 216'><defs><style>.cls-1{fill:%23f15a3a;}.cls-2{fill:%23c71f3d;}.cls-3{fill:%23ffc40c;}</style></defs><circle class='cls-1' cx='22.5' cy='108' r='22.5'/><circle class='cls-1' cx='193.5' cy='108' r='22.5'/><circle class='cls-2' cx='63' cy='27' r='27'/><circle class='cls-3' cx='162' cy='27' r='18'/><circle class='cls-2' cx='162' cy='189' r='27'/><circle class='cls-3' cx='63' cy='189' r='18'/></svg>",
            roles: [
              'publish',
            ],
          },
        },
        json: {
          webPath: '/en/bla.json',
          resourcePath: '/en/bla.json',
          live: {
            url: 'https://main--blog--adobe.hlx.live/en/bla.json',
            status: 200,
            lastModified: 'Tue, 09 Nov 2021 14:17:35 GMT',
          },
          preview: {
            url: 'https://main--blog--adobe.hlx.page/en/bla.json',
            status: 200,
            lastModified: 'Tue, 09 Nov 2021 14:17:27 GMT',
          },
          edit: {
            url: '"https://adobe.sharepoint.com/sites/TheBlog/_layouts/15/Doc.aspx?sourcedoc=%7BDB0B15EE-5CCD-4509-97E3-81D80C7F53FC%7D&file=bla.xlsx&action=default&mobileredirect=true',
            lastModified: 'Tue, 09 Nov 2021 14:17:20 GMT',
          },
        },
        xml: {
          webPath: '/en/bla.xml',
          resourcePath: '/en/bla.xml',
          live: {
            url: 'https://main--blog--adobe.hlx.live/en/bla.xml',
            status: 200,
            lastModified: 'Tue, 09 Nov 2021 14:17:35 GMT',
          },
          preview: {
            url: 'https://main--blog--adobe.hlx.page/en/bla.xml',
            status: 200,
            lastModified: 'Tue, 09 Nov 2021 14:17:27 GMT',
          },
          edit: {
            url: 'https://raw.githubusercontent.com/adobe/blog/main/en/bla.xml',
            lastModified: 'Tue, 09 Nov 2021 14:17:13 GMT',
          },
          source: {
            status: 200,
            contentType: 'application/xml',
            lastModified: 'Thu, 09 Dec 2021 08:01:27 GMT',
            contentLength: 208,
            sourceLocation: 'https://raw.githubusercontent.com/adobe/blog/main/en/bla.xml',
          },
        },
      },
    },
    content: {
      html: '<html></html>',
      json: '{"total":3485,"offset":0,"limit":256,"data":[{"date":"44552","image":"/en/publish/2021/12/22/media_0ebb8bfaee318619d92adbfe872bbb9cc714eb3ea.jpeg?width=1200&format=pjpg&optimize=medium","path":"/en/publish/2021/12/22/foo","title":"Lorem ipsum dolorsit amet","author":"Jane Doe","description":"Lorem ipsum dolor sit amet.","imageAlt":"Lorem ipsum sit amet","robots":"0","lastModified":"1640205745"}',
      xml: '<?xml version="1.0" encoding="UTF-8"?><bla></bla>',
    },
  },
};

/**
 * The sidekick test setup.
 */
class Setup {
  /**
   * Creates a new test setup.
   * @param {string} name The name of the setup to use
   */
  constructor(name) {
    if (!name) {
      throw new Error('name is mandatory');
    }
    this.name = name;
    this._setup = SETUPS[name];
  }

  /**
   * The project config JS
   * @type {string}
   */
  get configJs() {
    return this._setup.configJs;
  }

  /**
   * The sidekick config
   * @type {string}
   */
  get sidekickConfig() {
    return this._setup.sidekickConfig;
  }

  /**
   * Returns the URL for a given environment and content type.
   * @param {string} env=preview The environment (preview or live)
   * @param {string} type=html The content type (html or json)
   * @returns {string} The URL
   */
  getUrl(env = 'preview', type = 'html') {
    return this.apiResponse('status', type)[env].url;
  }

  /**
   * Returns the API response for a given API and content type.
   * @param {string} api=status The API
   * @param {string} type=html The content type (html, xml or json)
   * @returns {Object} The API response
   */
  apiResponse(api = 'status', type = 'html') {
    return { ...this._setup.api[api][type] };
  }

  /**
   * Returns the content response for a given content type.
   * @param {string} type=html The content type (html, xml or json)
   * @returns {string} The content response
   */
  contentResponse(type = 'html') {
    return { ...this._setup.content[type] };
  }
}

// eslint-disable-next-line no-unused-vars
let globalBrowser;
let globalPage;

const getPage = () => globalPage;

const toResp = (resp) => {
  if (typeof resp === 'object' && resp.body) {
    return resp;
  } else {
    return {
      status: resp ? 200 : 404,
      // eslint-disable-next-line no-nested-ternary
      body: resp ? (typeof resp === 'object' ? JSON.stringify(resp) : resp) : '',
    };
  }
};

const getPlugins = async (p = getPage()) => p.evaluate(
  () => window.hlx.sidekick.plugins
    .map(({ id }) => window.hlx.sidekick.get(id))
    .filter((plugin) => !!plugin)
    .map((plugin) => ({
      id: plugin.classList.item(0),
      classes: [...plugin.classList],
      container: plugin.closest('.dropdown')?.classList.item(0),
      text: plugin.textContent,
      buttonPressed: plugin.querySelector(':scope > button')
        && plugin.querySelector(':scope > button').classList.contains('pressed'),
      buttonEnabled: plugin.querySelector(':scope > button')
        && !plugin.querySelector(':scope > button').hasAttribute('disabled'),
    })),
);

const getPlugin = async (p, id) => getPlugins(p)
  .then((plugins) => plugins.find((plugin) => plugin.id === id));

const checkPlugin = async (p, pluginId) => {
  if (!pluginId) return;
  const pluginIds = typeof pluginId === 'string' ? [pluginId] : pluginId;
  const plugins = await getPlugins(p);
  pluginIds.forEach((id) => assert.ok(plugins.find((plugin) => plugin.id === id)));
};

const waitForEvent = async (p, type) => p.waitForFunction('window.hlx.sidekick')
  .then(() => p.evaluate((evtType) => {
    window.hlx.sidekickEvents = {};
    const eventTypes = Array.isArray(evtType) ? evtType : [evtType];
    eventTypes.forEach((eventType) => {
      // set up event listener
      window.hlx.sidekick.addEventListener(eventType, (evt) => {
        window.hlx.sidekickEvents[eventType] = evt;
      });
    });
  }, type));

const getFiredEvents = async (p = getPage()) => p.evaluate(() => window.hlx.sidekickEvents);

const checkEventFired = async (p, type) => {
  if (!type) return true;
  const firedEvents = await getFiredEvents(p);
  const eventTypes = Array.isArray(type) ? type : [type];
  assert.ok(
    eventTypes.every((et) => firedEvents[et] !== undefined),
    `Not all of events ${type} fired`,
  );
  return true;
};

const execPlugin = async (p, id) => {
  if (!id) return;
  await waitForEvent(p, 'pluginused');
  await p.evaluate((pluginId) => {
    if (pluginId) {
      window.hlx.sidekick.shadowRoot.querySelector(`.hlx-sk .${pluginId} button`).click();
    }
  }, id);
};

const clickButton = async (p, id) => p.evaluate((buttonId) => window.hlx.sidekick
  .shadowRoot.querySelector(`.hlx-sk button.${buttonId}`).click(), id);

const getNotification = async (p = getPage()) => p.evaluate(() => {
  const modal = window.hlx.sidekick.shadowRoot.querySelector('.hlx-sk-overlay .modal');
  const message = modal ? modal.textContent : null;
  const className = modal ? modal.className : null;
  return {
    message,
    className,
  };
});

const sleep = async (delay = 1000) => new Promise((resolve) => {
  setTimeout(resolve, delay);
});

async function startBrowser() {
  this.timeout(10000);
  globalBrowser = await puppeteer.launch({
    devtools: DEBUG || process.env.HLX_SK_TEST_DEBUG,
    args: [
      '--disable-popup-blocking',
      '--disable-web-security',
      '-no-sandbox',
      '-disable-setuid-sandbox',
    ],
  });
  globalPage = await globalBrowser.newPage();
}

const stopBrowser = async () => {
  if (!DEBUG) {
    await globalBrowser.close();
    globalBrowser = null;
    globalPage = null;
  }
};

module.exports = {
  IT_DEFAULT_TIMEOUT,
  Setup,
  toResp,
  getPlugins,
  getPlugin,
  checkPlugin,
  waitForEvent,
  checkEventFired,
  execPlugin,
  clickButton,
  getNotification,
  sleep,
  getPage,
  startBrowser,
  stopBrowser,
};
