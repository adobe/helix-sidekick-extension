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

'use strict';

const assert = require('assert');

const {
  IT_DEFAULT_TIMEOUT,
  DEBUG,
  startBrowser,
  stopBrowser,
  openPage,
  Nock,
  checkEventFired,
} = require('./utils.js');
const { SidekickTest } = require('./SidekickTest.js');

describe('Test sidekick module', () => {
  let browser;
  let nock;

  before(async function before() {
    this.timeout(10000);
    browser = await startBrowser();
  });
  after(async () => stopBrowser(browser));

  let page;
  beforeEach(async () => {
    page = await openPage(browser);
    nock = new Nock();
  });

  afterEach(async () => {
    if (!DEBUG) {
      page?.close(browser);
    }
    nock.done();
  });

  it('Does not render without config', async () => {
    const { sidekick } = await new SidekickTest({
      page,
      setup: 'none',
      url: 'https://foo.bar/',
    });
    assert.ok(!sidekick, 'Did render with missing config');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Renders with config', async () => {
    const result = await new SidekickTest({
      page,
      loadModule: true,
      setup: 'blog',
    }).run();
    const { plugins, sidekick: { config: { innerHost, outerHost } } } = result;
    // check sidekick config
    assert.strictEqual(innerHost, 'main--blog--adobe.hlx.page', `Unexpected innerHost: ${innerHost}`);
    assert.strictEqual(outerHost, 'main--blog--adobe.hlx.live', `Unexpected outerHost: ${innerHost}`);
    // check plugins
    assert.strictEqual(plugins.length, 12, `Wrong number of plugins: ${plugins.length}`);
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Handles errors fetching status from admin API', async () => {
    const errors = [
      { status: 404, body: 'Not found' },
      { status: 500, body: 'Server error' },
      { status: 504, body: 'Gateway timeout' },
    ];
    const test = new SidekickTest({
      page,
      loadModule: true,
      allowNavigation: true,
      apiResponses: [...errors],
      checkPage: (p) => p.evaluate(() => {
        // click overlay and return sidekick reference
        const modal = window.hlx.sidekick.shadowRoot.querySelector('.hlx-sk-overlay .modal');
        const { className } = modal;
        modal.parentElement.click();
        return [className, window.hlx.sidekick];
      }),
    });
    while (errors.length) {
      const error = errors.shift();
      // eslint-disable-next-line no-await-in-loop
      const { checkPageResult } = await test.run();
      const [className, sidekick] = checkPageResult;
      assert.ok(
        className.includes(error.status),
        `Expected ${error.status} in className, but got ${className}`,
      );
      assert.strictEqual(sidekick, null, 'Did not delete sidekick');
    }
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Uses main branch by default', async () => {
    const result = await new SidekickTest({
      page,
      loadModule: true,
      setup: 'blog',
      sidekickConfig: {
        owner: 'adobe',
        repo: 'blog',
      },
    }).run();
    const { sidekick: { config: { ref } } } = result;
    assert.strictEqual(ref, 'main', `Did not use main branch: ${ref}`);
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Adds plugin from config', async () => {
    const { configLoaded, plugins } = await new SidekickTest({
      page,
      loadModule: true,
      configJson: `{
        "plugins": [{
          "id": "foo",
          "title": "Foo",
          "url": "https://www.foo.bar"
        }]
      }`,
    }).run();
    assert.strictEqual(new URL(configLoaded).host, 'main--blog--adobe.hlx.live', 'Did not load config from outer CDN');
    assert.ok(plugins.find((p) => p.id === 'foo'), 'Did not add plugin from config');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Detects innerHost and outerHost from config', async () => {
    const result = await new SidekickTest({
      page,
      loadModule: true,
      setup: 'blog',
    }).run();
    // check sidekick config
    const { sidekick: { config: { innerHost, outerHost } } } = result;
    assert.strictEqual(innerHost, 'main--blog--adobe.hlx.page', `Unexpected innerHost: ${innerHost}`);
    assert.strictEqual(outerHost, 'main--blog--adobe.hlx.live', `Unexpected outerHost: ${innerHost}`);
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Uses outerHost from config', async () => {
    const testOuterHost = 'test--blog--adobe.hlx.live';
    const { sidekick: { config: { outerHost } } } = await new SidekickTest({
      page,
      loadModule: true,
      setup: 'blog',
      configJson: `{
        "outerHost": "${testOuterHost}"
      }`,
    }).run();
    assert.strictEqual(
      outerHost,
      testOuterHost,
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Adds plugin via API', async () => {
    const { plugins } = await new SidekickTest({
      page,
      loadModule: true,
      post: (p) => p.evaluate(() => {
        window.hlx.sidekick.add({
          id: 'ding',
          button: {
            text: 'Ding',
            action: () => {
              window.hlx.sidekick.add({
                id: 'baz',
                button: {
                  text: 'Baz',
                },
              });
            },
          },
        });
        window.hlx.sidekick.get('ding').firstElementChild.click();
      }),
    }).run();
    assert.ok(plugins.find((p) => p.id === 'ding'), 'Did not add plugin via API');
    assert.ok(plugins.find((p) => p.id === 'baz'), 'Did not execute plugin action');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Loads config and plugins from project config', async () => {
    nock('https://www.hlx.live')
      .get('/')
      .reply(200, 'some content...');

    const test = new SidekickTest({
      page,
      loadModule: true,
      configJson: `{
        "host": "blog.adobe.com",
        "plugins": [{
          "id": "bar",
          "title": "Bar",
          "url": "https://www.hlx.live/"
        }]
      }`,
      plugin: 'bar',
      pluginSleep: 2000,
    });
    const {
      configLoaded,
      plugins,
      popupOpened,
      sidekick: { config: { host } },
    } = await test.run();
    assert.ok(configLoaded, 'Did not load project config');
    assert.ok(plugins.find((p) => p.id === 'bar'), 'Did not load plugins from project');
    assert.ok(popupOpened === 'https://www.hlx.live/', 'Did not open plugin URL');
    assert.strictEqual(host, 'blog.adobe.com', 'Did not load config from project');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Plugin passes referrer in url', async () => {
    const pluginUrl = 'https://www.hlx.live/';
    const expectedReferrerParam = '?referrer=https%3A%2F%2Fmain--blog--adobe.hlx.page%2Fen%2Ftopics%2Fbla';
    const expectedPopupUrl = `${pluginUrl}${expectedReferrerParam}`;
    const mockUrl = `/${expectedReferrerParam}`;

    nock('https://www.hlx.live')
      .get(mockUrl)
      .reply(200, 'some content...');

    const test = new SidekickTest({
      page,
      loadModule: true,
      configJson: `{
        "plugins": [{
          "id": "bar",
          "title": "Bar",
          "url": "${pluginUrl}",
          "passReferrer": true
        }]
      }`,
      plugin: 'bar',
      pluginSleep: 2000,
    });
    const {
      plugins,
      popupOpened,
    } = await test.run();
    assert.ok(plugins.find((p) => p.id === 'bar'), 'Did not load plugins from project');
    assert.ok(popupOpened === expectedPopupUrl, 'Did not pass referrer in plugin URL');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Plugin passes config info into url using passConfig', async () => {
    const pluginUrl = 'https://www.hlx.live/';
    const expectedInfoParam = '?ref=main&repo=blog&owner=adobe';
    const expectedPopupUrl = `${pluginUrl}${expectedInfoParam}`;
    const mockUrl = `/${expectedInfoParam}`;

    nock('https://www.hlx.live')
      .get(mockUrl)
      .reply(200, 'some content...');

    const test = new SidekickTest({
      page,
      loadModule: true,
      configJson: `{
        "plugins": [{
          "id": "bar",
          "title": "Bar",
          "url": "${pluginUrl}",
          "passConfig": true
        }]
      }`,
      plugin: 'bar',
      pluginSleep: 2000,
    });
    const {
      plugins,
      popupOpened,
    } = await test.run();
    assert.ok(plugins.find((p) => p.id === 'bar'), 'Did not load plugins from project');
    assert.ok(popupOpened === expectedPopupUrl, 'Did not pass additional info in plugin URL');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Plugin shows palette', async () => {
    const test = new SidekickTest({
      page,
      loadModule: true,
      configJson: `{
        "host": "blog.adobe.com",
        "plugins": [{
          "id": "bar",
          "title": "Bar",
          "url": "https://www.hlx.live/",
          "isPalette": true
        }]
      }`,
      plugin: 'bar',
      pluginSleep: 2000,
    });
    const {
      configLoaded,
      plugins,
    } = await test.run();
    const palette = await page.evaluate(() => window.hlx.sidekick.shadowRoot
      .querySelector('.hlx-sk-palette'));
    assert.ok(configLoaded, 'Did not load project config');
    assert.ok(plugins.find((p) => p.id === 'bar'), 'Did not load plugins from project');
    assert.ok(palette, 'Did not show palette');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Plugin fires custom event', async () => {
    const test = new SidekickTest({
      page,
      loadModule: true,
      configJson: `{
        "host": "blog.adobe.com",
        "plugins": [{
          "id": "bar",
          "title": "Bar",
          "event": "foo"
        }]
      }`,
      plugin: 'bar',
      checkEvents: ['custom:foo'],
    });
    const {
      configLoaded,
      plugins,
    } = await test.run();
    assert.ok(configLoaded, 'Did not load project config');
    assert.ok(plugins.find((p) => p.id === 'bar'), 'Did not load plugins from project');
    assert.ok(checkEventFired(page, 'custom:foo'), 'Did not fire plugin event');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Plugin extends existing plugin', async () => {
    const test = new SidekickTest({
      page,
      loadModule: true,
      configJson: `{
        "host": "blog.adobe.com",
        "plugins": [{
          "id": "publish",
          "excludePaths": ["**/drafts/**"]
        }]
      }`,
    });
    const {
      plugins,
    } = await test.run('https://main--blog--adobe.hlx.page/en/drafts/foo');
    assert.ok(!plugins.find((p) => p.id === 'publish'), 'Did not extend existing plugin');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Loads config from development environment', async () => {
    const { configLoaded } = await new SidekickTest({
      page,
      loadModule: true,
      sidekickConfig: {
        owner: 'adobe',
        repo: 'blog',
        ref: 'main',
        devMode: true,
        hlx3: true,
      },
    }).run();
    assert.ok(configLoaded.startsWith('http://localhost:3000/'), 'Did not load project config from development environment');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Replaces plugin', async () => {
    const { plugins } = await new SidekickTest({
      page,
      loadModule: true,
      post: (p) => p.evaluate(() => {
        window.hlx.sidekick.add({
          id: 'edit',
          override: true,
          button: {
            text: 'Replaced',
          },
        });
      }),
    }).run();
    const replacedPlugin = plugins.find((p) => p.id === 'edit' && p.text === 'Replaced');
    const originalPluginIndex = plugins.findIndex((p) => p.id === 'edit');
    const replacedPluginIndex = plugins.findIndex((p) => p.text === 'Replaced');
    assert.ok(replacedPlugin, 'Did not replace plugin');
    assert.strictEqual(replacedPluginIndex, originalPluginIndex, 'Replaced plugin did not retain original position');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Extends plugin', async () => {
    const { plugins } = await new SidekickTest({
      page,
      loadModule: true,
      post: (p) => p.evaluate(() => {
        window.hlx.sidekick.add({
          id: 'edit',
          button: {
            text: 'ExtendEdit',
            isPressed: () => true,
          },
        });
      }),
    }).run();
    const extendedPlugin = plugins.find((p) => p.id === 'edit' && p.text === 'ExtendEdit');
    assert.ok(extendedPlugin, 'Did not extend plugin');
    assert.ok(extendedPlugin.buttonPressed, 'Extended plugin button not pressed');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Removes plugin', async () => {
    const { plugins } = await new SidekickTest({
      page,
      loadModule: true,
      post: (p) => p.evaluate(() => window.hlx.sidekick.remove('edit')),
    }).run();
    assert.ok(!plugins.find((p) => p.id === 'edit'), 'Did not remove plugin');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Adds HTML element in plugin', async () => {
    const { plugins } = await new SidekickTest({
      page,
      loadModule: true,
      post: (p) => p.evaluate(() => {
        window.hlx.sidekick.add({
          id: 'foo',
          elements: [
            {
              tag: 'span',
              text: 'Lorem ipsum',
            },
          ],
        });
      }),
    }).run();
    assert.strictEqual(plugins.find((p) => p.id === 'foo').text, 'Lorem ipsum', 'Did not add HTML element in plugin');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Enables plugin button', async () => {
    const { plugins } = await new SidekickTest({
      page,
      loadModule: true,
      post: (p) => p.evaluate(() => {
        window.hlx.sidekick.add({
          id: 'foo',
          button: {
            text: 'Lorem ipsum',
            isEnabled: (sk) => sk.status.edit && sk.status.edit.lastModified,
          },
        });
      }),
    }).run();
    assert.ok(plugins.find((p) => p.id === 'foo').buttonEnabled, 'Did not enable plugin button');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Adds dropdown as plugin container', async () => {
    const { plugins } = await new SidekickTest({
      page,
      loadModule: true,
      post: (p) => p.evaluate(() => {
        window.hlx.sidekick.add({
          id: 'foo',
          button: {
            text: 'Lorem ipsum',
            isDropdown: true,
          },
        });
        window.hlx.sidekick.add({
          id: 'bar',
          container: 'foo',
          button: {
            text: 'Dolor sit amet',
          },
        });
      }),
    }).run();
    assert.ok(plugins.find((p) => p.id === 'foo').classes.includes('dropdown'), 'Did not add dropdown');
    assert.ok(plugins.find((p) => p.id === 'bar').container, 'foo', 'Plugin not added to dropdown');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Loads custom CSS', async () => {
    const { checkPageResult } = await new SidekickTest({
      page,
      loadModule: true,
      post: (p) => p.evaluate(() => window.hlx.sidekick.loadCSS('custom.css')),
      checkPage: (p) => p.evaluate(() => {
        const root = window.hlx.sidekick.shadowRoot.querySelector('.hlx-sk');
        return window.getComputedStyle(root).getPropertyValue('background-color');
      }),
    }).run();
    assert.strictEqual(checkPageResult, 'rgb(255, 255, 0)', 'Did not load custom CSS');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Shows notifications', async () => {
    // shows modal
    let result = await new SidekickTest({
      page,
      loadModule: true,
      allowNavigation: true,
      post: (p) => p.evaluate(() => window.hlx.sidekick.showModal({
        message: 'Lorem ipsum',
      })),
    }).run();
    assert.strictEqual(result.notification.message, 'Lorem ipsum', 'Did not show modal');

    // shows sticky modal
    result = await new SidekickTest({
      page,
      loadModule: true,
      allowNavigation: true,
      post: (p) => p.evaluate(() => window.hlx.sidekick.showModal({
        message: 'Sticky',
        sticky: true,
      })),
    }).run();
    assert.strictEqual(result.notification.message, 'Sticky', 'Did not show sticky modal');

    // adds css class
    result = await new SidekickTest({
      page,
      loadModule: true,
      allowNavigation: true,
      post: (p) => p.evaluate(() => window.hlx.sidekick.showModal({
        css: 'test',
      })),
    }).run();
    assert.ok(result.notification.className.includes('test'), 'Did not add CSS class');

    // shows legacy notification
    result = await new SidekickTest({
      page,
      loadModule: true,
      allowNavigation: true,
      post: (p) => p.evaluate(() => window.hlx.sidekick.notify('Lorem ipsum')),
    }).run();
    assert.strictEqual(result.notification.message, 'Lorem ipsum', 'Did not show legacy notification');

    // shows legacy modal
    result = await new SidekickTest({
      page,
      loadModule: true,
      allowNavigation: true,
      post: (p) => p.evaluate(() => window.hlx.sidekick.showModal('Sticky', true)),
    }).run();
    assert.strictEqual(result.notification.message, 'Sticky', 'Did not show legacy modal');

    // shows multi-line modal
    result = await new SidekickTest({
      page,
      loadModule: true,
      allowNavigation: true,
      post: (p) => p.evaluate(() => window.hlx.sidekick.showModal({
        message: ['Lorem ipsum', 'sit amet'],
      })),
    }).run();
    assert.strictEqual(result.notification.message, 'Lorem ipsumsit amet', 'Did not show multi-line notification');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Hides notifications', async () => {
    // hides sticky modal
    const { notification } = await new SidekickTest({
      page,
      loadModule: true,
      allowNavigation: true,
      post: (p) => p.evaluate(() => {
        window.hlx.sidekick.showModal({ message: 'Sticky', sticky: true });
        window.hlx.sidekick.hideModal();
      }),
    }).run();
    assert.strictEqual(notification.message, null, 'Did not hide sticky modal');

    // hides sticky modal on overlay click
    const { checkPageResult } = await new SidekickTest({
      page,
      loadModule: true,
      checkPage: (p) => p.evaluate(() => {
        window.hlx.sidekick.showModal({ message: 'Sticky', sticky: true });
        const overlay = window.hlx.sidekick.shadowRoot.querySelector('.hlx-sk-overlay');
        overlay.click();
        document.body.innerHTML += overlay.className;
        return overlay.className.includes('hlx-sk-hidden');
      }),
    }).run();
    assert.ok(checkPageResult, 'Did not hide sticky modal on overlay click');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Hides sidekick on close button click', async () => {
    const { checkPageResult, eventsFired } = await new SidekickTest({
      page,
      loadModule: true,
      post: (p) => p.evaluate(() => window.hlx.sidekick
        .shadowRoot
        .querySelector('.hlx-sk button.close')
        .click()),
      checkPage: (p) => p.evaluate(() => window.hlx.sidekick
        .shadowRoot
        .querySelector('.hlx-sk')
        .classList
        .contains('hlx-sk-hidden')),
    }).run();
    assert.ok(checkPageResult, 'Sidekick not hidden');
    assert.ok(eventsFired.hidden, 'Event hidden not fired');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Copies sharing URL to clipboard on share button click', async () => {
    const { notification } = await new SidekickTest({
      page,
      loadModule: true,
      post: (p) => p.evaluate(() => window.hlx.sidekick
        .shadowRoot
        .querySelector('.hlx-sk button.share')
        .click()),
    }).run();
    assert.ok(notification.className.includes('modal-share-success'), 'Did not copy sharing URL to clipboard');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Detects edit environment correctly', async () => {
    const test = new SidekickTest({
      page,
      loadModule: true,
      allowNavigation: true,
      checkPage: async (p) => p.evaluate(() => window.hlx.sidekick.isEditor()),
    });
    // check with google docs url
    const { checkPageResult: gdocsUrl } = await test.run('https://docs.google.com/document/d/1234567890/edit');
    assert.ok(gdocsUrl, 'Did not detect google docs URL');
    // check with sharepoint url
    const { checkPageResult: standardSharepointUrl } = await test.run('https://adobe.sharepoint.com/:w:/r/sites/TheBlog/_layouts/15/Doc.aspx?sourcedoc=%7BE8EC80CB-24C3-4B95-B082-C51FD8BC8760%7D&file=bla.docx&action=default&mobileredirect=true');
    assert.ok(standardSharepointUrl, 'Did not detect standard sharepoint URL');
    // check again with custom sharepoint url as mountpoint
    test.sidekickConfig.mountpoint = 'https://foo.custom/sites/foo/Shared%20Documents/root1';
    const { checkPageResult: customSharepointUrl } = await test.run('https://foo.custom/:w:/r/sites/foo/_layouts/15/Doc.aspx?sourcedoc=%7BBFD9A19C-4A68-4DBF-8641-DA2F1283C895%7D&file=index.docx&action=default&mobileredirect=true');
    assert.ok(customSharepointUrl, 'Did not detect custom sharepoint URL');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Detects development environment correctly', async () => {
    const { checkPageResult } = await new SidekickTest({
      page,
      loadModule: true,
      url: 'http://localhost:3000/',
      checkPage: async (p) => p.evaluate(() => window.hlx.sidekick.isDev()),
    }).run();
    assert.ok(checkPageResult, 'Did not detect development URL');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Detects preview environment correctly', async () => {
    const test = new SidekickTest({
      page,
      loadModule: true,
      allowNavigation: true,
      checkPage: async (p) => p.evaluate(() => window.hlx.sidekick.isInner()),
    });
    assert.ok((await test.run()).checkPageResult, 'Did not detect preview URL');
    // check again with different ref
    assert.ok(
      (await test.run('https://test--blog--adobe.hlx.page/')).checkPageResult,
      'Did not detect preview URL with different ref',
    );
    // check again with hlx3.page
    assert.ok(
      (await test.run('https://main--blog--adobe.hlx3.page/')).checkPageResult,
      'Did not detect preview URL with hlx3.page',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Detects live environment correctly', async () => {
    const test = new SidekickTest({
      page,
      loadModule: true,
      allowNavigation: true,
      url: 'https://main--blog--adobe.hlx.live/',
      checkPage: async (p) => p.evaluate(() => window.hlx.sidekick.isOuter()),
    });
    assert.ok((await test.run()).checkPageResult, 'Did not detect live URL');
    // check again with different ref
    assert.ok(
      (await test.run('https://test--blog--adobe.hlx.live/')).checkPageResult,
      'Did not detect live URL witn different ref',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Detects production environment correctly', async () => {
    const test = new SidekickTest({
      page,
      loadModule: true,
      url: 'https://blog.adobe.com/',
      configJson: '{"host": "blog.adobe.com"}',
      checkPage: async (p) => p.evaluate(() => window.hlx.sidekick.isProd()),
    });
    assert.ok((await test.run()).checkPageResult, 'Did not detect production URL');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Does not push down page content by default', async () => {
    const { checkPageResult } = await new SidekickTest({
      page,
      loadModule: true,
      checkPage: (p) => p.evaluate(() => document.documentElement.style.marginTop),
    }).run();
    assert.strictEqual(checkPageResult, '', 'Did push down content');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Pushes down page content if configured', async () => {
    const test = new SidekickTest({
      page,
      loadModule: true,
      sleep: 500,
      checkPage: (p) => p.evaluate(() => document.documentElement.style.marginTop),
    });
    test.sidekickConfig.pushDown = true;
    const { checkPageResult } = await test.run();
    assert.strictEqual(checkPageResult, '49px', 'Did not push down content');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Pushes down custom elements', async () => {
    const { checkPageResult } = await new SidekickTest({
      page,
      loadModule: true,
      sleep: 500,
      configJson: '{"pushDown": true, "pushDownSelector":"#topnav"}',
      pre: (p) => p.evaluate(() => {
        // add topnav element
        const topNav = document.createElement('div');
        topNav.id = 'topnav';
        topNav.style = 'position:fixed;top:0;height:60px';
        document.body.prepend(topNav);
      }),
      checkPage: (p) => p.evaluate(() => document.getElementById('topnav').style.marginTop),
    }).run();
    assert.strictEqual(checkPageResult, '49px', 'Did not push down custom element');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Push down adjusts height of word iframe', async () => {
    const { checkPageResult } = await new SidekickTest({
      page,
      loadModule: true,
      sleep: 500,
      configJson: '{"pushDown": true, "pushDownSelector":"#topnav"}',
      pre: (p) => p.evaluate(() => {
        // add fake word iframe
        const frame = document.createElement('iframe');
        frame.id = 'WebApplicationFrame';
        frame.style = 'position:fixed;top:0;width:100%;height:100%';
        document.body.prepend(frame);
      }),
      checkPage: (p) => p.evaluate(() => document.getElementById('WebApplicationFrame').style.height),
    }).run();
    assert.deepStrictEqual(
      checkPageResult,
      'calc(100% - 49px)',
      'Did not adjust height of editor iframe',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Reverts push down when hidden', async () => {
    const { checkPageResult } = await new SidekickTest({
      page,
      loadModule: true,
      sleep: 500,
      configJson: '{"pushDown": true, "pushDownSelector":"#topnav"}',
      post: (p) => p.evaluate(() => window.hlx.sidekick.hide()),
      checkPage: (p) => p.evaluate(() => document.documentElement.style.marginTop),
    }).run();
    assert.strictEqual(checkPageResult, 'initial', 'Push down not reverted');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Does not push down if pushDown false', async () => {
    const { checkPageResult } = await new SidekickTest({
      page,
      loadModule: true,
      configJson: '{"pushDown":false}',
      checkPage: (p) => p.evaluate(() => document.documentElement.style.marginTop),
    }).run();
    assert.strictEqual(checkPageResult, '', 'Pushed down content');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Does not push down if gdrive', async () => {
    const { checkPageResult } = await new SidekickTest({
      page,
      loadModule: true,
      configJson: '{"pushDown":false}',
      url: 'https://docs.google.com/document/d/2E1PNphAhTZAZrDjevM0BX7CZr7KjomuBO6xE1TUo9NU/edit',
      checkPage: (p) => p.evaluate(() => document.documentElement.style.marginTop),
    }).run();
    assert.strictEqual(checkPageResult, '', 'Pushed down content');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Shows special view for JSON file', async () => {
    const { checkPageResult } = await new SidekickTest({
      page,
      loadModule: true,
      type: 'json',
      checkPage: (p) => p.evaluate(() => window.hlx.sidekick
        .shadowRoot
        .querySelector('.hlx-sk-special-view')),
    }).run();
    assert.ok(checkPageResult, 'Did not show data view for JSON file');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Shows help content', async () => {
    const { notification } = await new SidekickTest({
      page,
      loadModule: true,
      post: (p) => p.evaluate(() => {
        window.hlx.sidekick.showHelp({
          id: 'test',
          steps: [
            {
              message: 'Lorem ipsum dolor sit amet',
              selector: '.env',
              align: 'bottom-right',
            },
          ],
        });
      }),
      // eslint-disable-next-line no-underscore-dangle
      checkPage: (p) => p.evaluate(() => window.hlx.sidekick._modal.classList.toString()),
    }).run();
    assert.strictEqual(notification.message, 'Lorem ipsum dolor sit amet', `Did not show the expected message: ${notification.message}`);
    assert.strictEqual(notification.className, 'modal help bottom-right', `Did not have the expected CSS classes: ${notification.className}`);
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Calls admin API with a specific version', async () => {
    const test = new SidekickTest({
      page,
      loadModule: true,
    });
    test.sidekickConfig.adminVersion = '0.7.7';
    const { requestsMade } = await test.run();
    const adminRequest = requestsMade.find((r) => r.url.startsWith('https://admin.hlx.page/'));
    assert.strictEqual(
      new URL(adminRequest.url).searchParams.get('hlx-admin-version'),
      '0.7.7',
      'Did not use specific admin version',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Handles 401 response from admin API', async () => {
    const { checkPageResult } = await new SidekickTest({
      page,
      loadModule: true,
      apiResponses: [{
        status: 401,
      }],
      checkPage: (p) => p.evaluate(() => window.hlx.sidekick.shadowRoot
        .querySelector('.hlx-sk .feature-container .user .dropdown-container')
        .classList.contains('highlight')),
    }).run();
    assert.ok(checkPageResult, 'Did not show login dialog on 401');
  });
});
