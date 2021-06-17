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
/* global window document */

'use strict';

const assert = require('assert');
const puppeteer = require('puppeteer');

const apiTests = {
  blog: {
    webPath: '/en/topics/bla.html',
    edit: {
      url: 'https://adobe.sharepoint.com/:w:/r/sites/TheBlog/_layouts/15/Doc.aspx?sourcedoc=%7BE8EC80CB-24C3-4B95-B082-C51FD8BC8760%7D&file=bla.docx&action=default&mobileredirect=true',
    },
  },
  pages: {
    webPath: '/creativecloud/en/test',
    edit: {
      url: 'https://docs.google.com/document/d/2E1PNphAhTZAZrDjevM0BX7CZr7KjomuBO6xE1TUo9NU/edit',
    },
  },
};

describe('Test sidekick bookmarklet', () => {
  const IT_DEFAULT_TIMEOUT = 60000;
  const fixturesPrefix = `file://${__dirname}/fixtures`;

  const getPlugins = async (p) => p.evaluate(
    () => Array.from(document.querySelectorAll('.hlx-sk > div.env > div, .hlx-sk > div:not(.env)'))
      .map((plugin) => ({
        id: plugin.className,
        text: plugin.textContent,
        buttonPressed: plugin.querySelector(':scope > button')
          && plugin.querySelector(':scope > button').classList.contains('pressed'),
      })),
  );

  const execPlugin = async (p, id) => p.evaluate((pluginId) => {
    const click = (el) => {
      const evt = document.createEvent('Events');
      evt.initEvent('click', true, false);
      el.dispatchEvent(evt);
    };
    if (pluginId) {
      click(document.querySelector(`.hlx-sk .${pluginId} button`));
    }
  }, id);

  const clickButton = async (p, id) => p.evaluate((buttonId) => {
    const click = (el) => {
      const evt = window.document.createEvent('Events');
      evt.initEvent('click', true, false);
      el.dispatchEvent(evt);
    };
    click(window.document.querySelector(`.hlx-sk button.${buttonId}`));
  }, id);

  const mockCustomPlugins = async (p, js, check = () => true) => {
    await p.setRequestInterception(true);
    p.on('request', (req) => {
      if (req.url().endsWith('/tools/sidekick/plugins.js')
        && check(req)) {
        req.respond({
          status: 200,
          body: js || '',
        });
      } else {
        req.continue();
      }
    });
  };

  const testPageRequests = async ({
    page,
    url,
    plugin,
    prep = () => {},
    check = () => true,
    checkResponse = {
      status: 200,
      body: JSON.stringify([{ status: 'ok' }]),
    },
    checkCondition = (req) => req.url().startsWith('https://'),
    timeout = 0,
    timeoutSuccess = true,
  }) => {
    await page.setRequestInterception(true);
    return new Promise((resolve, reject) => {
      // watch for new browser window
      page.on('request', async (req) => {
        if (req.url().endsWith('/tools/sidekick/plugins.js')) {
          // send plugins response
          return req.respond({
            status: 200,
            body: '',
          });
        } else if (checkCondition(req)) {
          try {
            if (check(req)) {
              // check successful
              resolve();
            }
            if (req.url().startsWith('file://')) {
              // let file:// requests through
              req.continue();
            } else {
              // send check response
              return req.respond(checkResponse);
            }
          } catch (e) {
            reject(e);
          }
        }
        // let request continue
        return req.continue();
      });
      // open url and optionally click plugin button
      page
        .goto(url, { waitUntil: 'load' })
        .then(() => prep(page))
        .then(() => execPlugin(page, plugin));
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

  beforeEach(async function setup() {
    this.timeout(10000);
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--disable-popup-blocking',
        '--disable-web-security',
        '–no-sandbox',
        '–disable-setuid-sandbox',
      ],
    });
    page = await browser.newPage();
  });

  afterEach(async () => {
    await browser.close();
    browser = null;
    page = null;
  });

  it('Renders with missing config', async () => {
    await page.goto(`${fixturesPrefix}/config-none.html`, { waitUntil: 'load' });
    const skHandle = await page.$('div.hlx-sk');
    assert.ok(skHandle, 'Did not render without config');
    const plugins = await getPlugins(page);
    assert.strictEqual(plugins.length, 0, 'Rendered unexpected plugins');
    const zIndex = await page.evaluate(
      (elem) => window.getComputedStyle(elem).getPropertyValue('z-index'),
      skHandle,
    );
    assert.strictEqual(zIndex, '9999999', 'Did not apply default CSS');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Renders with irrelevant config', async () => {
    await page.goto(`${fixturesPrefix}/config-wrong.html`, { waitUntil: 'load' });
    const skHandle = await page.$('div.hlx-sk');
    assert.ok(skHandle, 'Did not render with irrelevant config');
    const plugins = await getPlugins(page);
    assert.strictEqual(plugins.length, 0, 'Rendered unexpected plugins');
    const zIndex = await page.evaluate(
      (elem) => window.getComputedStyle(elem).getPropertyValue('z-index'),
      skHandle,
    );
    assert.strictEqual(zIndex, '9999999', 'Did not apply default CSS');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Checks for missing Helix 3 flag in config', async () => {
    await mockCustomPlugins(page);
    await new Promise((resolve, reject) => {
      // wait for dialog
      page.on('dialog', async (dialog) => {
        if (dialog.type() === 'confirm') {
          try {
            assert.ok(
              dialog.message().includes('unable to deal with a Helix 3 site'),
              `Unexpected dialog message: "${dialog.message()}"`,
            );
            resolve();
          } catch (e) {
            reject(e);
          }
        }
      });
      // open test page and click preview button
      page
        .goto(`${fixturesPrefix}/config-hlx3-missing-flag.html`, { waitUntil: 'load' });
    });
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Checks for Helix 3 config/URL mismatch', async () => {
    await mockCustomPlugins(page);
    await new Promise((resolve, reject) => {
      // wait for dialog
      page.on('dialog', async (dialog) => {
        if (dialog.type() === 'confirm') {
          try {
            assert.ok(
              dialog.message().includes('can only work on a Helix 3 site'),
              `Unexpected dialog message: "${dialog.message()}"`,
            );
            resolve();
          } catch (e) {
            reject(e);
          }
        }
      });
      // open test page and click preview button
      page
        .goto(`${fixturesPrefix}/config-hlx3-wrong-url.html`, { waitUntil: 'load' });
    });
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Uses main branch by default', async () => {
    await page.goto(`${fixturesPrefix}/config-no-ref.html`, { waitUntil: 'load' });
    const ref = await page.evaluate(() => window.hlx.sidekick.config.ref);
    assert.strictEqual(ref, 'main', 'Did not use main branch');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Adds plugin from config', async () => {
    await mockCustomPlugins(page);
    await page.goto(`${fixturesPrefix}/config-plugin.html`, { waitUntil: 'load' });
    const plugins = await getPlugins(page);
    assert.ok(plugins.find((p) => p.id === 'foo'), 'Did not add plugin from config');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Adds plugin from legacy config', async () => {
    await mockCustomPlugins(page);
    await new Promise((resolve, reject) => {
      page.on('dialog', (dialog) => {
        try {
          assert.ok(dialog.message().startsWith('Good news!'), 'Did not show update dialog');
          resolve();
        } catch (e) {
          reject(e);
        }
      });
      page
        .goto(`${fixturesPrefix}/config-legacy.html`, { waitUntil: 'load' })
        .then(async () => {
          const plugins = await getPlugins(page);
          assert.ok(plugins.find((p) => p.id === 'foo'), 'Did not add plugin from legacy config');
        });
    });
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Detects innerHost and outerHost from config', async () => {
    await mockCustomPlugins(page);
    await page.goto(`${fixturesPrefix}/config-plugin.html`, { waitUntil: 'load' });
    const config = await page.evaluate(() => window.hlx.sidekick.config);
    assert.strictEqual(
      config.innerHost,
      'foo--theblog--adobe.hlx.page',
    );
    assert.strictEqual(
      config.outerHost,
      'theblog--adobe.hlx.live',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Adds plugins via API', async () => {
    await page.goto(`${fixturesPrefix}/add-plugins.html`, { waitUntil: 'load' });
    let plugins = await getPlugins(page);
    assert.ok(plugins.length, 6, 'Did not add plugins via API');

    await (await page.$('div.hlx-sk .ding button')).click();
    plugins = await getPlugins(page);
    assert.ok(plugins.length, 7, 'Did not execute plugin action');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Adds plugins from project', async () => {
    await mockCustomPlugins(page, `
      window.hlx.sidekick.add({
        id: 'bar',
        button: {
          text: 'Bar',
        },
      });
    `);
    await page.goto(`${fixturesPrefix}/config-plugin.html`, { waitUntil: 'load' });
    assert.ok((await getPlugins(page)).find((p) => p.id === 'bar'), 'Did not add plugins from project');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Adds plugins from fixed host', async () => {
    await mockCustomPlugins(
      page,
      `window.hlx.sidekick.add({
        id: 'bar',
        button: {
          text: 'Bar',
        },
      });`,
      (req) => req.url().startsWith('https://plugins.foo.bar'),
    );
    await page.goto(`${fixturesPrefix}/config-plugin-host.html`, { waitUntil: 'load' });
    assert.ok((await getPlugins(page)).find((p) => p.id === 'bar'), 'Did not add plugins from fixed host');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Replaces plugin', async () => {
    await mockCustomPlugins(page);
    await page.goto(`${fixturesPrefix}/config-plugin.html`, { waitUntil: 'load' });
    await page.evaluate(() => {
      window.hlx.sidekick.add({
        id: 'edit',
        override: true,
        button: {
          text: 'Replaced',
        },
      });
    });
    const plugins = await getPlugins(page);
    const replacedPlugin = plugins.find((p) => p.id === 'edit' && p.text === 'Replaced');
    const originalPluginIndex = plugins.findIndex((p) => p.id === 'edit');
    const replacedPluginIndex = plugins.findIndex((p) => p.text === 'Replaced');
    assert.ok(replacedPlugin, 'Did not replace plugin');
    assert.strictEqual(replacedPluginIndex, originalPluginIndex, 'Replaced plugin did not retain original position');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Extends plugin', async () => {
    await mockCustomPlugins(page);
    await page.goto(`${fixturesPrefix}/config-plugin.html`, { waitUntil: 'load' });
    await page.evaluate(() => {
      window.hlx.sidekick.add({
        id: 'foo',
        button: {
          text: 'ExtendFoo',
          isPressed: true,
        },
      });
    });
    const plugins = await getPlugins(page);
    const extendedPlugin = plugins.find((p) => p.id === 'foo' && p.text === 'ExtendFoo');
    assert.ok(extendedPlugin, 'Did not extend plugin');
    assert.ok(extendedPlugin.buttonPressed, 'Extended plugin button not pressed');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Removes plugin', async () => {
    await mockCustomPlugins(page);
    await page.goto(`${fixturesPrefix}/config-plugin.html`, { waitUntil: 'load' });
    await page.evaluate(() => window.hlx.sidekick.remove('foo'));
    const plugins = await getPlugins(page);
    assert.ok(!plugins.find((p) => p.id === 'foo'), 'Did not remove plugin');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Adds HTML element in plugin', async () => {
    await page.goto(`${fixturesPrefix}/config-none.html`, { waitUntil: 'load' });
    const text = await page.evaluate(() => {
      window.hlx.sidekick.add({
        id: 'foo',
        elements: [
          {
            tag: 'span',
            text: 'Lorem ipsum',
          },
        ],
      });
      return document.querySelector('.hlx-sk .foo').textContent;
    });
    assert.strictEqual(text, 'Lorem ipsum', 'Did not add HTML element in plugin');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Loads custom CSS', async () => {
    await page.goto(`${fixturesPrefix}/config-none.html`, { waitUntil: 'load' });
    await page.evaluate(() => {
      window.hlx.sidekick.loadCSS('custom.css');
    });
    const bgColor = await page.$eval('div.hlx-sk',
      (elem) => window.getComputedStyle(elem).getPropertyValue('background-color'));
    await sleep(3000);
    assert.strictEqual(bgColor, 'rgb(255, 255, 0)', 'Did not load custom CSS');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Shows and hides notifications', async () => {
    await page.goto(`${fixturesPrefix}/config-none.html`, { waitUntil: 'load' });

    // shows notification
    assert.strictEqual(await page.evaluate(() => {
      window.hlx.sidekick.notify('Lorem ipsum');
      return document.querySelector('.hlx-sk-overlay .modal').textContent;
    }), 'Lorem ipsum', 'Did show notification');

    // shows sticky modal
    assert.strictEqual(await page.evaluate(() => {
      window.hlx.sidekick.showModal('Sticky', true);
      return document.querySelector('.hlx-sk-overlay .modal.wait').textContent;
    }), 'Sticky', 'Did show sticky modal');

    // hides sticky modal
    assert.strictEqual(await page.evaluate(() => {
      window.hlx.sidekick.hideModal();
      return document.querySelector('.hlx-sk-overlay').classList.contains('hlx-sk-hidden');
    }), true, 'Did not hide sticky modal');

    // shows multi-line notification
    assert.strictEqual(await page.evaluate(() => {
      window.hlx.sidekick.notify(['Lorem ipsum', 'sit amet']);
      return document.querySelector('.hlx-sk-overlay .modal').innerHTML;
    }), '<p>Lorem ipsum</p><p>sit amet</p>', 'Did not show multi-line notification');

    // hides sticky modal on overlay click
    assert.ok(await page.evaluate(() => {
      window.hlx.sidekick.showModal('Sticky');
      const overlay = document.querySelector('.hlx-sk-overlay');
      const click = (el) => {
        const evt = document.createEvent('Events');
        evt.initEvent('click', true, false);
        el.dispatchEvent(evt);
      };
      click(overlay);
      return overlay.classList.contains('hlx-sk-hidden');
    }), 'Did not hide sticky modal on overlay click');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Close button hides sidekick', async () => {
    await page.goto(`${fixturesPrefix}/config-none.html`, { waitUntil: 'load' });
    await clickButton(page, 'close');
    assert.ok(
      await page.evaluate(() => window.document.querySelector('.hlx-sk').classList.contains('hlx-sk-hidden')),
      'Did not hide sidekick',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Share button copies sharing URL to clipboard', async () => {
    await page.goto(`${fixturesPrefix}/config-none.html`, { waitUntil: 'load' });
    await clickButton(page, 'share');
    assert.strictEqual(
      await page.evaluate(() => window.document.querySelector('.hlx-sk-overlay .modal').textContent),
      'Sharing URL copied to clipboard',
      'Did not copy sharing URL to clipboard',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Edit plugin uses preview API from staging URL', async () => {
    const apiTest = apiTests.blog;
    await testPageRequests({
      page,
      url: `${fixturesPrefix}/edit-staging.html`,
      check: (req) => {
        if (req.url().includes('/preview/')) {
          // check request to preview API
          assert.ok(
            req.url().endsWith(`/preview/adobe/theblog/master${apiTest.webPath}`),
            'Preview API not called',
          );
        } else if (req.url().startsWith('https://adobe.sharepoint.com/')) {
          // check request to edit url
          assert.ok(req.url() === apiTest.edit.url, 'Edit URL not called');
          return true;
        }
        // ignore otherwise
        return false;
      },
      checkResponse: {
        status: 200,
        body: JSON.stringify(apiTest),
      },
      plugin: 'edit',
    });
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Edit plugin uses preview API from production URL', async () => {
    const apiTest = apiTests.blog;
    await testPageRequests({
      page,
      url: `${fixturesPrefix}/edit-production.html`,
      check: (req) => {
        if (req.url().includes('/preview/')) {
          // check request to preview API
          assert.ok(
            req.url().endsWith(`/preview/adobe/theblog/master${apiTest.webPath}`),
            'Preview API not called',
          );
        } else if (req.url().startsWith('https://adobe.sharepoint.com/')) {
          // check request to edit url
          assert.ok(req.url() === apiTest.edit.url, 'Edit URL not called');
          return true;
        }
        // ignore otherwise
        return false;
      },
      checkResponse: {
        status: 200,
        body: JSON.stringify(apiTest),
      },
      plugin: 'edit',
    });
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Preview plugin uses preview API with editURL parameter from gdrive URL', async () => {
    const apiTest = apiTests.pages;
    await testPageRequests({
      page,
      url: `${fixturesPrefix}/preview-gdrive.html`,
      check: (req) => {
        if (req.url().includes('/preview/')) {
          // check request to preview API
          assert.ok(
            req.url().endsWith(`/preview/adobe/pages/master?editUrl=${encodeURIComponent(apiTest.edit.url)}`),
            'Preview API not called',
          );
        } else if (req.url().includes('.hlx.page/')) {
          // check request to preview url
          assert.ok(
            req.url() === `https://master--pages--adobe.hlx.page${apiTest.webPath}`,
            'Preview URL not called',
          );
          return true;
        }
        // ignore otherwise
        return false;
      },
      checkResponse: {
        status: 200,
        body: JSON.stringify(apiTest),
      },
      plugin: 'preview',
    });
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Preview plugin uses preview API with editURL parameter from onedrive URL', async () => {
    const apiTest = apiTests.blog;
    await testPageRequests({
      page,
      url: `${fixturesPrefix}/preview-onedrive.html`,
      check: (req) => {
        if (req.url().includes('/preview/')) {
          // check request to preview API
          assert.ok(
            req.url().endsWith(`/preview/adobe/theblog/master?editUrl=${encodeURIComponent(apiTest.edit.url)}`),
            'Preview API not called',
          );
        } else if (req.url().includes('.hlx.page/')) {
          // check request to preview url
          assert.ok(
            req.url() === `https://master--theblog--adobe.hlx.page${apiTest.webPath}`,
            'Preview URL not called',
          );
          return true;
        }
        // ignore otherwise
        return false;
      },
      checkResponse: {
        status: 200,
        body: JSON.stringify(apiTest),
      },
      plugin: 'preview',
    });
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Preview plugin uses preview API from production URL', async () => {
    const apiTest = apiTests.blog;
    await testPageRequests({
      page,
      url: `${fixturesPrefix}/edit-production.html`,
      check: (req) => {
        if (req.url().includes('/preview/')) {
          // check request to preview API
          assert.ok(
            req.url().endsWith(`/preview/adobe/theblog/master${apiTest.webPath}`),
            'Preview API not called',
          );
        } else if (req.url().includes('.hlx.page/')) {
          // check request to preview url
          assert.ok(
            req.url() === `https://master--theblog--adobe.hlx.page${apiTest.webPath}`,
            'Preview URL not called',
          );
          return true;
        }
        // ignore otherwise
        return false;
      },
      checkResponse: {
        status: 200,
        body: JSON.stringify(apiTest),
      },
      plugin: 'preview',
    });
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Live plugin uses preview API from gdrive URL', async () => {
    const apiTest = apiTests.pages;
    await testPageRequests({
      page,
      url: `${fixturesPrefix}/preview-gdrive.html`,
      check: (req) => {
        if (req.url().includes('/preview/')) {
          // check request to preview API
          assert.ok(
            req.url().endsWith(`/preview/adobe/pages/master?editUrl=${encodeURIComponent(apiTest.edit.url)}`),
            'Preview API not called',
          );
        } else if (req.url().includes('.hlx.live/')) {
          // check request to live url
          assert.ok(
            req.url() === `https://pages--adobe.hlx.live${apiTest.webPath}`,
            'Live URL not called',
          );
          return true;
        }
        // ignore otherwise
        return false;
      },
      checkResponse: {
        status: 200,
        body: JSON.stringify(apiTest),
      },
      plugin: 'live',
    });
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Production plugin uses preview API from gdrive URL', async () => {
    const apiTest = apiTests.pages;
    await testPageRequests({
      page,
      url: `${fixturesPrefix}/preview-gdrive.html`,
      check: (req) => {
        if (req.url().includes('/preview/')) {
          // check request to preview API
          assert.ok(
            req.url().endsWith(`/preview/adobe/pages/master?editUrl=${encodeURIComponent(apiTest.edit.url)}`),
            'Preview API not called',
          );
        } else if (req.url().includes('.adobe.com/')) {
          // check request to production url
          assert.ok(
            req.url() === `https://pages.adobe.com${apiTest.webPath}`,
            'Production URL not called',
          );
          return true;
        }
        // ignore otherwise
        return false;
      },
      checkResponse: {
        status: 200,
        body: JSON.stringify(apiTest),
      },
      plugin: 'prod',
    });
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Reload plugin sends purge request from staging URL and reloads page', async () => {
    let loads = 0;
    let purged = false;
    let reloaded = false;
    await testPageRequests({
      page,
      url: `${fixturesPrefix}/reload-staging.html`,
      check: (req) => {
        if (!purged && req.method() === 'POST') {
          // intercept purge request
          const headers = req.headers();
          purged = req.url() === 'https://theblog--adobe.hlx.page/en/topics/bla.html'
            && headers['x-forwarded-host'] === 'master--theblog--adobe.hlx.page';
        } else if (req.url().endsWith('reload-staging.html')) {
          loads += 1;
          if (loads === 2) {
            reloaded = true;
            return true;
          }
        }
        return false;
      },
      checkCondition: (request) => request.url().startsWith('https://')
        || request.url().endsWith('reload-staging.html'),
      plugin: 'reload',
    });
    // check result
    assert.ok(purged, 'Purge request not sent');
    assert.ok(reloaded, 'Reload not triggered');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Reload plugin in hlx3 mode calls preview API', async () => {
    let loads = 0;
    let apiCalled = false;
    let reloaded = false;
    await testPageRequests({
      page,
      url: `${fixturesPrefix}/reload-staging-hlx3.html`,
      check: (req) => {
        if (!apiCalled && req.method() === 'POST') {
          // intercept api request
          apiCalled = req.url().endsWith('/preview/adobe/theblog/master/en/topics/bla.html');
          req.respond({
            status: 200,
            body: JSON.stringify([{ status: 'ok' }]),
          });
        } else if (req.url().endsWith('reload-staging-hlx3.html')) {
          loads += 1;
          if (loads === 2) {
            // reload triggered
            reloaded = true;
            return true;
          }
        }
        return false;
      },
      checkCondition: (request) => request.url().startsWith('https://')
        || request.url().endsWith('reload-staging-hlx3.html'),
      plugin: 'reload',
    });
    // check result
    assert.ok(apiCalled, 'Preview API not called');
    assert.ok(reloaded, 'Reload not triggered');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Publish plugin sends purge request from staging URL and redirects to production URL', async () => {
    let purged = false;
    let redirected = false;
    await testPageRequests({
      page,
      url: `${fixturesPrefix}/publish-staging.html`,
      check: (req) => {
        if (!purged && req.method() === 'POST') {
          // intercept purge request
          const headers = req.headers();
          purged = req.url() === 'https://theblog--adobe.hlx.page/en/topics/bla.html'
            && headers['x-forwarded-host'].split(',').length === 3;
        } else if (req.url().startsWith('https://blog.adobe.com')) {
          // intercept redirect to production
          redirected = true;
          req.respond({
            status: 200,
            body: 'dummy html',
          });
          return true;
        }
        return false;
      },
      plugin: 'publish',
    });
    // check result
    assert.ok(purged, 'Purge request not sent');
    assert.ok(redirected, 'Redirect not sent');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Publish plugin also purges dependencies', async () => {
    const dependencies = [
      '/en/topics/foo.html',
      'bar.html?step=1',
    ];
    const purged = [];
    await testPageRequests({
      page,
      url: `${fixturesPrefix}/publish-staging.html`,
      prep: async (p) => {
        // add publish dependencies
        await p.evaluate((deps) => {
          window.hlx.dependencies = deps;
        }, dependencies);
      },
      check: (req) => {
        if (req.method() === 'POST') {
          // check result
          const purgeUrl = new URL(req.url());
          purged.push(`${purgeUrl.pathname}${purgeUrl.search}`);
        }
        return purged.length === 3;
      },
      plugin: 'publish',
    });
    assert.deepStrictEqual(purged, [
      '/en/topics/bla.html',
      '/en/topics/foo.html',
      '/en/topics/bar.html?step=1',
    ], 'Purge request not sent');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Publish plugin does not purge outer without production host', async () => {
    let noPurge = true;
    await testPageRequests({
      page,
      url: `${fixturesPrefix}/publish-staging.html`,
      prep: async (p) => {
        // remove production host from config
        await p.evaluate(() => {
          delete window.hlx.sidekick.config.host;
        });
      },
      check: (req) => {
        if (req.method() === 'POST') {
          // intercept purge request
          req.respond({
            status: 200,
            body: JSON.stringify([{ status: 'ok' }]),
          });
          noPurge = false;
          return true;
        }
        return false;
      },
      plugin: 'publish',
      timeout: 5000,
    });
    assert.ok(noPurge, 'Did not purge inner host only');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Publish plugin in hlx3 mode uses publish API', async () => {
    let apiCalled = false;
    let redirected = false;
    await testPageRequests({
      page,
      url: `${fixturesPrefix}/publish-staging-hlx3.html`,
      check: (req) => {
        if (!apiCalled && req.method() === 'POST') {
          // intercept purge request
          apiCalled = req.url().endsWith('/live/adobe/theblog/main/en/topics/bla.html');
        } else if (req.url().startsWith('https://blog.adobe.com')) {
          redirected = true;
          return true;
        }
        return false;
      },
      plugin: 'publish',
    });
    // check result
    assert.ok(apiCalled, 'Purge request not sent');
    assert.ok(redirected, 'Redirect not sent');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('No publish plugin on bring-your-own-CDN production host', async () => {
    await mockCustomPlugins(page);
    // open test page
    await page.goto(`${fixturesPrefix}/publish-byocdn.html`, { waitUntil: 'load' });
    const plugins = await getPlugins(page);
    assert.ok(!plugins.includes('publish'), 'Unexpected publish plugin found');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Development environment is correctly detected', async () => {
    await page.goto(`${fixturesPrefix}/is-dev.html`, { waitUntil: 'load' });
    assert.ok(
      await page.evaluate(() => window.hlx.sidekick.isDev()),
      'Did not detect development URL',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Inner CDN is correctly detected', async () => {
    await page.goto(`${fixturesPrefix}/publish-staging.html`, { waitUntil: 'load' });
    assert.ok(
      await page.evaluate(() => window.hlx.sidekick.isInner() && window.hlx.sidekick.isHelix()),
      'Did not detect inner CDN URL',
    );
    // check with different ref
    await page.evaluate(() => {
      window.hlx.sidekick.location.host = 'test--theblog--adobe.hlx.page';
    });
    assert.ok(
      await page.evaluate(() => window.hlx.sidekick.isInner()),
      'Did not detect inner CDN URL with different ref',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Outer CDN is correctly detected', async () => {
    await page.goto(`${fixturesPrefix}/is-live.html`, { waitUntil: 'load' });
    assert.ok(
      await page.evaluate(() => window.hlx.sidekick.isOuter() && window.hlx.sidekick.isHelix()),
      'Did not detect outer CDN URL',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Production is correctly detected', async () => {
    await page.goto(`${fixturesPrefix}/edit-production.html`, { waitUntil: 'load' });
    assert.ok(
      await page.evaluate(() => window.hlx.sidekick.isProd() && window.hlx.sidekick.isHelix()),
      'Did not detect production URL',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);
});

describe('makeHostHelixCompliant', () => {
  // TODO: move to proper unit test in order to use original funtion
  // this is a copy of function in sidekick/app.js
  const makeHostHelixCompliant = (ahost) => {
    if (ahost.match(/^.*?--.*?--.*?\./gm)) {
      return ahost;
    }
    return ahost
      .replace(/^([^-.]+)-([^-.]+)-([^-.]+)\./gm, '$1-$2--$3.')
      .replace(/^([^-.]+)-([^-.]+)\./gm, '$1--$2.');
  };

  it('Test makeHostHelixCompliant', () => {
    assert.strictEqual(makeHostHelixCompliant('repo-owner.hlx.page'), 'repo--owner.hlx.page');
    assert.strictEqual(makeHostHelixCompliant('repo-owner.hlx-1.page'), 'repo--owner.hlx-1.page');

    assert.strictEqual(makeHostHelixCompliant('branch--repo--owner.hlx.page'), 'branch--repo--owner.hlx.page');
    assert.strictEqual(makeHostHelixCompliant('branch--repo--owner.hlx-1.page'), 'branch--repo--owner.hlx-1.page');

    assert.strictEqual(makeHostHelixCompliant('branch-dash--repo--owner.hlx.page'), 'branch-dash--repo--owner.hlx.page');
    assert.strictEqual(makeHostHelixCompliant('branch-dash--repo--owner.hlx-1.page'), 'branch-dash--repo--owner.hlx-1.page');

    assert.strictEqual(makeHostHelixCompliant('repo-dash--owner.hlx.page'), 'repo-dash--owner.hlx.page');
    assert.strictEqual(makeHostHelixCompliant('repo-dash--owner.hlx-1.page'), 'repo-dash--owner.hlx-1.page');

    assert.strictEqual(makeHostHelixCompliant('repo-dash-owner.hlx.page'), 'repo-dash--owner.hlx.page');
    assert.strictEqual(makeHostHelixCompliant('repo-dash-owner.hlx-1.page'), 'repo-dash--owner.hlx-1.page');

    assert.strictEqual(makeHostHelixCompliant('branch--repo-dash--owner.hlx.page'), 'branch--repo-dash--owner.hlx.page');
    assert.strictEqual(makeHostHelixCompliant('branch--repo-dash--owner.hlx-1.page'), 'branch--repo-dash--owner.hlx-1.page');

    assert.strictEqual(makeHostHelixCompliant('branch-dash--repo-dash--owner.hlx.page'), 'branch-dash--repo-dash--owner.hlx.page');
    assert.strictEqual(makeHostHelixCompliant('branch-dash--repo-dash--owner.hlx-1.page'), 'branch-dash--repo-dash--owner.hlx-1.page');
  });
});
