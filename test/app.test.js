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
  startBrowser,
  stopBrowser,
} = require('./utils.js');
const { SidekickTest } = require('./SidekickTest.js');

describe('Test sidekick bookmarklet', () => {
  beforeEach(startBrowser);
  afterEach(stopBrowser);

  it('Does not render without config', async () => {
    const { sidekick } = await new SidekickTest({
      setup: 'none',
      url: 'https://foo.bar/',
    });
    assert.ok(!sidekick, 'Did render with missing config');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Renders with config', async () => {
    const result = await new SidekickTest({
      setup: 'blog',
    }).run();
    const { plugins, sidekick: { config: { innerHost, outerHost } } } = result;
    // check sidekick config
    assert.strictEqual(innerHost, 'main--blog--adobe.hlx3.page', `Unexpected innerHost: ${innerHost}`);
    assert.strictEqual(outerHost, 'main--blog--adobe.hlx.live', `Unexpected outerHost: ${innerHost}`);
    // check plugins
    assert.strictEqual(plugins.length, 6, `Wrong number of plugins: ${plugins.length}`);
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Handles errors fetching status from admin API', async () => {
    const errors = [
      { status: 401, body: 'Unauthorized' },
      { status: 404, body: 'Not found' },
      { status: 500, body: 'Server error' },
      { status: 504, body: 'Gateway timeout' },
    ];
    const test = new SidekickTest({
      allowNavigation: true,
      apiResponses: [...errors],
      checkPage: (p) => p.evaluate(() => {
        // click overlay and return sidekick reference
        window.hlx.sidekick.shadowRoot.querySelector('.hlx-sk-overlay').click();
        return window.hlx.sidekick;
      }),
    });
    while (errors.length) {
      const error = errors.shift();
      // eslint-disable-next-line no-await-in-loop
      const { checkPageResult, notification } = await test.run();
      assert.ok(notification.startsWith(error.status), `Expected ${error.status} message, but got ${notification}`);
      assert.strictEqual(checkPageResult, undefined, 'Did not delete sidekick');
    }
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Checks for hlx3 config/URL mismatch', async () => {
    const { dialog } = await new SidekickTest({
      sleep: 2000,
      setup: 'blog',
      url: 'https://main--blog--adobe.hlx.page/en/topics/bla',
    }).run();
    assert.strictEqual(dialog?.type, 'confirm', `Unexpected dialog type: "${dialog?.type}"`);
    assert.ok(dialog?.message.includes('can only work on a Helix 3 site'), `Unexpected dialog message: "${dialog?.message}"`);
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Uses main branch by default', async () => {
    const result = await new SidekickTest({
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
    const { plugins } = await new SidekickTest({
      configJs: `
        window.hlx.initSidekick({
          plugins: [{
            id: 'foo',
            button: {
              text: 'Foo',
              action: () => {},
            }
          }],
        });`,
    }).run();
    assert.ok(plugins.find((p) => p.id === 'foo'), 'Did not add plugin from config');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Shows update dialog on legacy config', async () => {
    const { dialog } = await new SidekickTest({
      sleep: 2000,
      pre: (p) => p.evaluate(() => {
        window.hlxSidekickConfig = {
          owner: 'adobe',
          repo: 'theblog',
          ref: 'foo',
        };
      }),
    }).run();
    assert.ok(dialog?.message.startsWith('Apologies'), 'Did not show update dialog');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Shows update dialog in compatibility mode', async () => {
    const { dialog } = await new SidekickTest({
      sleep: 2000,
      pre: (p) => p.evaluate(() => {
        window.hlx = window.hlx || {};
        window.hlx.sidekickConfig = {
          owner: 'adobe',
          repo: 'theblog',
          ref: 'foo',
          compatMode: true,
        };
      }),
    }).run();
    assert.ok(dialog?.message.startsWith('Apologies'), 'Did not show update dialog');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Detects innerHost and outerHost from config', async () => {
    const result = await new SidekickTest({
      setup: 'blog',
    }).run();
    // check sidekick config
    const { sidekick: { config: { innerHost, outerHost } } } = result;
    assert.strictEqual(innerHost, 'main--blog--adobe.hlx3.page', `Unexpected innerHost: ${innerHost}`);
    assert.strictEqual(outerHost, 'main--blog--adobe.hlx.live', `Unexpected outerHost: ${innerHost}`);
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Uses outerHost from config', async () => {
    const testOuterHost = 'test--blog--adobe.hlx.live';
    const { sidekick: { config: { outerHost } } } = await new SidekickTest({
      setup: 'blog',
      configJs: `
        window.hlx.initSidekick({
          outerHost: '${testOuterHost}',
        });
      `,
    }).run();
    assert.strictEqual(
      outerHost,
      testOuterHost,
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Adds plugin via API', async () => {
    const { plugins } = await new SidekickTest({
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
    const test = new SidekickTest({
      configJs: `
      window.hlx.initSidekick({
        host: 'blog.adobe.com',
        plugins: [{
          id: 'bar',
          button: {
            text: 'Bar',
          },
        }],
      });`,
    });
    const { configLoaded, plugins, sidekick: { config: { host } } } = await test.run();
    assert.ok(configLoaded, 'Did not load project config');
    assert.ok(plugins.find((p) => p.id === 'bar'), 'Did not load plugins from project');
    assert.strictEqual(host, 'blog.adobe.com', 'Did not load config from project');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Loads config and plugins from development environment', async () => {
    const { configLoaded } = await new SidekickTest({
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
      post: (p) => p.evaluate(() => {
        window.hlx.sidekick.add({
          id: 'edit',
          button: {
            text: 'ExtendEdit',
            isPressed: true,
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
      post: (p) => p.evaluate(() => window.hlx.sidekick.remove('edit')),
    }).run();
    assert.ok(!plugins.find((p) => p.id === 'edit'), 'Did not remove plugin');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Adds HTML element in plugin', async () => {
    const { plugins } = await new SidekickTest({
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

  it('Loads custom CSS', async () => {
    const { checkPageResult } = await new SidekickTest({
      post: (p) => p.evaluate(() => window.hlx.sidekick.loadCSS('custom.css')),
      checkPage: (p) => p.evaluate(() => {
        const root = window.hlx.sidekick.shadowRoot.querySelector('.hlx-sk');
        return window.getComputedStyle(root).getPropertyValue('background-color');
      }),
    }).run();
    assert.strictEqual(checkPageResult, 'rgb(255, 255, 0)', 'Did not load custom CSS');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Shows and hides notifications', async () => {
    // shows notification
    let result = await new SidekickTest({
      allowNavigation: true,
      post: (p) => p.evaluate(() => window.hlx.sidekick.notify('Lorem ipsum')),
    }).run();
    assert.strictEqual(result.notification, 'Lorem ipsum', 'Did show notification');

    // shows sticky modal
    result = await new SidekickTest({
      allowNavigation: true,
      post: (p) => p.evaluate(() => window.hlx.sidekick.showModal('Sticky', true)),
    }).run();
    assert.strictEqual(result.notification, 'Sticky', 'Did show sticky modal');

    // hides sticky modal
    result = await new SidekickTest({
      allowNavigation: true,
      post: (p) => p.evaluate(() => {
        window.hlx.sidekick.showModal('Sticky', true);
        window.hlx.sidekick.hideModal();
      }),
    }).run();
    assert.strictEqual(result.notification, '', 'Did not hide sticky modal');

    // shows multi-line notification
    result = await new SidekickTest({
      allowNavigation: true,
      post: (p) => p.evaluate(() => window.hlx.sidekick.notify(['Lorem ipsum', 'sit amet'])),
    }).run();
    assert.strictEqual(result.notification, 'Lorem ipsumsit amet', 'Did not show multi-line notification');

    // hides sticky modal on overlay click
    const { checkPageResult } = await new SidekickTest({
      allowNavigation: true,
      checkPage: (p) => p.evaluate(() => {
        window.hlx.sidekick.showModal('Sticky', true);
        const overlay = window.hlx.sidekick.shadowRoot.querySelector('.hlx-sk-overlay');
        overlay.click();
        return overlay.classList.contains('hlx-sk-hidden');
      }),
    }).run();
    assert.ok(checkPageResult, 'Did not hide sticky modal on overlay click');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Hides sidekick on close button click', async () => {
    const { checkPageResult, eventsFired } = await new SidekickTest({
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
      post: (p) => p.evaluate(() => window.hlx.sidekick
        .shadowRoot
        .querySelector('.hlx-sk button.share')
        .click()),
    }).run();
    assert.strictEqual(notification, 'Sharing URL copied to clipboard', 'Did not copy sharing URL to clipboard');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Detects development environment correctly', async () => {
    const { checkPageResult } = await new SidekickTest({
      url: 'http://localhost:3000/',
      checkPage: async (p) => p.evaluate(() => window.hlx.sidekick.isDev()),
    }).run();
    assert.ok(checkPageResult, 'Did not detect development URL');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Detects preview environment correctly', async () => {
    const test = new SidekickTest({
      allowNavigation: true,
      checkPage: async (p) => p.evaluate(() => window.hlx.sidekick.isInner()),
    });
    assert.ok((await test.run()).checkPageResult, 'Did not detect preview URL');
    // check again with different ref
    assert.ok(
      (await test.run('https://test--blog--adobe.hlx3.page/')).checkPageResult,
      'Did not detect preview URL with different ref',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Detects live environment correctly', async () => {
    const test = new SidekickTest({
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
      url: 'https://blog.adobe.com/',
      configJs: 'window.hlx.initSidekick({host: "blog.adobe.com"});',
      checkPage: async (p) => p.evaluate(() => window.hlx.sidekick.isProd()),
    });
    assert.ok((await test.run()).checkPageResult, 'Did not detect production URL');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Pushes down page content by default', async () => {
    const { checkPageResult } = await new SidekickTest({
      checkPage: (p) => p.evaluate(() => document.documentElement.style.marginTop),
    }).run();
    assert.strictEqual(checkPageResult, '49px', 'Did not push down content');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Pushes down custom elements', async () => {
    const { checkPageResult } = await new SidekickTest({
      configJs: 'window.hlx.initSidekick({pushDownSelector:"#topnav"})',
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
      configJs: 'window.hlx.initSidekick({pushDownSelector:"#topnav"})',
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
      post: (p) => p.evaluate(() => window.hlx.sidekick.hide()),
      checkPage: (p) => p.evaluate(() => document.documentElement.style.marginTop),
    }).run();
    assert.strictEqual(checkPageResult, 'initial', 'Push down not reverted');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Does not push down if pushDown false', async () => {
    const { checkPageResult } = await new SidekickTest({
      configJs: 'window.hlx.initSidekick({pushDown:false})',
      checkPage: (p) => p.evaluate(() => document.documentElement.style.marginTop),
    }).run();
    assert.strictEqual(checkPageResult, '', 'Pushed down content');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Does not push down if gdrive', async () => {
    const { checkPageResult } = await new SidekickTest({
      configJs: 'window.hlx.initSidekick({pushDown:false})',
      url: 'https://docs.google.com/document/d/2E1PNphAhTZAZrDjevM0BX7CZr7KjomuBO6xE1TUo9NU/edit',
      checkPage: (p) => p.evaluate(() => document.documentElement.style.marginTop),
    }).run();
    assert.strictEqual(checkPageResult, '', 'Pushed down content');
  }).timeout(IT_DEFAULT_TIMEOUT);
});

describe('makeHostHelixCompliant', () => {
  // TODO: move to proper unit test in order to use original funtion
  // this is a copy of function in sidekick/app.js
  const makeHostHelixCompliant = (ahost) => {
    if (!/.*\.hlx.*\.(live|page)/.test(ahost) || ahost.match(/^.*?--.*?--.*?\./gm)) {
      return ahost;
    }
    return ahost
      .replace(/^([^-.]+)-([^-.]+)-([^-.]+)\./gm, '$1-$2--$3.')
      .replace(/^([^-.]+)-([^-.]+)\./gm, '$1--$2.');
  };

  it('Test makeHostHelixCompliant', () => {
    assert.strictEqual(makeHostHelixCompliant('abc-123.com'), 'abc-123.com');
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
