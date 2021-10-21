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

const {
  IT_DEFAULT_TIMEOUT,
  MOCKS,
  getPlugins,
  execPlugin,
  waitForEvent,
  checkEventFired,
  clickButton,
  mockStandardResponses,
  testPageRequests,
  sleep,
  getPage,
  startBrowser,
  stopBrowser,
} = require('./utils');

const fixturesPrefix = `file://${__dirname}/fixtures`;

describe('Test sidekick bookmarklet', () => {
  beforeEach(startBrowser);
  afterEach(stopBrowser);

  it('Renders with missing config', async () => {
    const page = getPage();
    await page.goto(`${fixturesPrefix}/config-none.html`, { waitUntil: 'load' });
    const skRoot = await page.evaluate(() => !!window.hlx.sidekick.shadowRoot.querySelector('.hlx-sk'));
    assert.ok(skRoot, 'Did not render without config');
    const plugins = await getPlugins(page);
    assert.strictEqual(plugins.length, 0, 'Rendered unexpected plugins');
    const zIndex = await page.evaluate(() => {
      const root = window.hlx.sidekick.shadowRoot.querySelector('.hlx-sk');
      return window.getComputedStyle(root).getPropertyValue('z-index');
    });
    assert.strictEqual(zIndex, '9999999', 'Did not apply default CSS');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Renders with irrelevant config', async () => {
    const page = getPage();
    await mockStandardResponses(page);
    await page.goto(`${fixturesPrefix}/config-wrong.html`, { waitUntil: 'load' });
    const skHandle = await page.evaluate(() => !!window.hlx.sidekick
      .shadowRoot.querySelector('.hlx-sk'));
    assert.ok(skHandle, 'Did not render without config');
    const plugins = await getPlugins(page);
    assert.strictEqual(plugins.length, 0, 'Rendered unexpected plugins');
    const zIndex = await page.evaluate(() => {
      const root = window.hlx.sidekick.shadowRoot.querySelector('.hlx-sk');
      return window.getComputedStyle(root).getPropertyValue('z-index');
    });
    assert.strictEqual(zIndex, '9999999', 'Did not apply default CSS');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Checks for hlx3 config/URL mismatch', async () => {
    const page = getPage();
    await mockStandardResponses(page);
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
    const page = getPage();
    await mockStandardResponses(page);
    await page.goto(`${fixturesPrefix}/config-no-ref.html`, { waitUntil: 'load' });
    const ref = await page.evaluate(() => window.hlx.sidekick.config.ref);
    assert.strictEqual(ref, 'main', 'Did not use main branch');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Adds plugin from config', async () => {
    const page = getPage();
    await mockStandardResponses(page, {
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
      mockResponses: [MOCKS.api.blog],
    });
    await page.goto(`${fixturesPrefix}/config-default.html`, { waitUntil: 'load' });
    await sleep();
    const plugins = await getPlugins(page);
    assert.ok(plugins.find((p) => p.id === 'foo'), 'Did not add plugin from config');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Shows update dialog on legacy config', async () => {
    const page = getPage();
    await mockStandardResponses(page);
    await new Promise((resolve, reject) => {
      page.on('dialog', (dialog) => {
        try {
          assert.ok(dialog.message().startsWith('Apologies'), 'Did not show update dialog');
          resolve();
        } catch (e) {
          reject(e);
        }
      });
      page.goto(`${fixturesPrefix}/config-legacy.html`, { waitUntil: 'load' });
    });
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Shows update dialog in compatibility mode', async () => {
    const page = getPage();
    await mockStandardResponses(page);
    await new Promise((resolve, reject) => {
      page.on('dialog', (dialog) => {
        try {
          assert.ok(dialog.message().startsWith('Apologies'), 'Did not show update dialog');
          resolve();
        } catch (e) {
          reject(e);
        }
      });
      page.goto(`${fixturesPrefix}/config-compatibility.html`, { waitUntil: 'load' });
      setTimeout(() => reject(new Error('check timed out')), 5000);
    });
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Detects innerHost and outerHost from config', async () => {
    const page = getPage();
    await mockStandardResponses(page);
    await page.goto(`${fixturesPrefix}/config-default.html`, { waitUntil: 'load' });
    const config = await page.evaluate(() => window.hlx.sidekick.config);
    assert.strictEqual(
      config.innerHost,
      'master--theblog--adobe.hlx.page',
    );
    assert.strictEqual(
      config.outerHost,
      'theblog--adobe.hlx.live',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Uses outerHost from config', async () => {
    const page = getPage();
    const testOuterHost = 'test-cdn-theblog.example.test';
    await mockStandardResponses(page, {
      configJs: `
        window.hlx.initSidekick({
          outerHost: '${testOuterHost}',
        });
      `,
    });
    await page.goto(`${fixturesPrefix}/config-default.html`, { waitUntil: 'load' });
    const config = await page.evaluate(() => window.hlx.sidekick.config);
    assert.strictEqual(
      config.outerHost,
      testOuterHost,
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Uses outerHost with branch in hlx3 mode', async () => {
    const page = getPage();
    await mockStandardResponses(page);
    await page.goto(`${fixturesPrefix}/config-hlx3.html`, { waitUntil: 'load' });
    const outerHost = await page.evaluate(() => window.hlx.sidekick.config.outerHost);
    assert.strictEqual(outerHost, 'master--theblog--adobe.hlx.live', 'Did not use branch in outerHost');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Fails gracefully when unable to fetch status', async () => {
    const page = getPage();
    await testPageRequests({
      page,
      url: `${fixturesPrefix}/config-default.html`,
      prep: (p) => new Promise((resolve, reject) => {
        setTimeout(async () => {
          try {
            // verify that window.hlx.sidekick is gone
            assert.ok(!(await p.evaluate(() => window.hlx.sidekick)));
            resolve(true);
          } catch (e) {
            reject(e);
          }
        }, 5000);
      }),
      mockResponses: [
        '404 Not Found',
      ],
    });
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Adds plugins via API', async () => {
    const page = getPage();
    await page.goto(`${fixturesPrefix}/config-none.html`, { waitUntil: 'load' });
    await page.evaluate(() => {
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
    });
    let plugins = await getPlugins(page);
    assert.ok(plugins.length, 1, 'Did not add plugins via API');
    await execPlugin(page, 'ding');
    plugins = await getPlugins(page);
    assert.ok(plugins.length, 2, 'Did not execute plugin action');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Loads config and plugins from project config', async () => {
    const page = getPage();
    await mockStandardResponses(
      page, {
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
      },
    );
    await page.goto(`${fixturesPrefix}/init-from-project.html`, { waitUntil: 'load' });
    assert.ok((await getPlugins(page)).find((p) => p.id === 'bar'), 'Did not load plugins from project');
    assert.strictEqual(await page.evaluate(() => window.hlx.sidekick.config.host), 'blog.adobe.com', 'Did not load config from project');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Loads config and plugins from development environment', async () => {
    const page = getPage();
    await mockStandardResponses(page, {
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
    await page.goto(`${fixturesPrefix}/init-from-dev.html`, { waitUntil: 'load' });
    assert.ok((await getPlugins(page)).find((p) => p.id === 'bar'), 'Did not load plugins from project');
    assert.strictEqual(await page.evaluate(() => window.hlx.sidekick.config.host), 'blog.adobe.com', 'Did not load config from project');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Adds plugins from project (compatibility mode)', async () => {
    const page = getPage();
    await mockStandardResponses(page, {
      pluginsJs: `
        window.hlx.sidekick.add({
          id: 'bar',
          button: {
            text: 'Bar',
          },
        });
      `,
    });
    // cancel dialog when it pops up
    page.on('dialog', async (dialog) => dialog.dismiss());
    await page.goto(`${fixturesPrefix}/config-compatibility.html`, { waitUntil: 'load' });
    await sleep();
    const plugins = await getPlugins(page);
    assert.ok(plugins.find((p) => p.id === 'bar'), 'Did not add plugins from project');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Replaces plugin', async () => {
    const page = getPage();
    await mockStandardResponses(page);
    await page.goto(`${fixturesPrefix}/config-default.html`, { waitUntil: 'load' });
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
    const page = getPage();
    await mockStandardResponses(page);
    await page.goto(`${fixturesPrefix}/config-default.html`, { waitUntil: 'load' });
    await page.evaluate(() => {
      window.hlx.sidekick.add({
        id: 'edit',
        button: {
          text: 'ExtendEdit',
          isPressed: true,
        },
      });
    });
    const plugins = await getPlugins(page);
    const extendedPlugin = plugins.find((p) => p.id === 'edit' && p.text === 'ExtendEdit');
    assert.ok(extendedPlugin, 'Did not extend plugin');
    assert.ok(extendedPlugin.buttonPressed, 'Extended plugin button not pressed');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Removes plugin', async () => {
    const page = getPage();
    await mockStandardResponses(page);
    await page.goto(`${fixturesPrefix}/config-default.html`, { waitUntil: 'load' });
    await page.evaluate(() => window.hlx.sidekick.remove('edit'));
    const plugins = await getPlugins(page);
    assert.ok(!plugins.find((p) => p.id === 'edit'), 'Did not remove plugin');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Adds HTML element in plugin', async () => {
    const page = getPage();
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
      return window.hlx.sidekick.shadowRoot.querySelector('.hlx-sk .foo').textContent;
    });
    assert.strictEqual(text, 'Lorem ipsum', 'Did not add HTML element in plugin');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Loads custom CSS', async () => {
    const page = getPage();
    await page.goto(`${fixturesPrefix}/config-none.html`, { waitUntil: 'load' });
    await page.evaluate(() => {
      window.hlx.sidekick.loadCSS('custom.css');
    });
    const bgColor = await page.evaluate(() => {
      const root = window.hlx.sidekick.shadowRoot.querySelector('.hlx-sk');
      return window.getComputedStyle(root).getPropertyValue('background-color');
    });
    assert.strictEqual(bgColor, 'rgb(255, 255, 0)', 'Did not load custom CSS');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Shows and hides notifications', async () => {
    const page = getPage();
    await page.goto(`${fixturesPrefix}/config-none.html`, { waitUntil: 'load' });

    // shows notification
    assert.strictEqual(await page.evaluate(() => {
      window.hlx.sidekick.notify('Lorem ipsum');
      return window.hlx.sidekick.shadowRoot.querySelector('.hlx-sk-overlay .modal').textContent;
    }), 'Lorem ipsum', 'Did show notification');

    // shows sticky modal
    assert.strictEqual(await page.evaluate(() => {
      window.hlx.sidekick.showModal('Sticky', true);
      return window.hlx.sidekick.shadowRoot.querySelector('.hlx-sk-overlay .modal.wait').textContent;
    }), 'Sticky', 'Did show sticky modal');

    // hides sticky modal
    assert.strictEqual(await page.evaluate(() => {
      window.hlx.sidekick.hideModal();
      return window.hlx.sidekick.shadowRoot.querySelector('.hlx-sk-overlay').classList.contains('hlx-sk-hidden');
    }), true, 'Did not hide sticky modal');

    // shows multi-line notification
    assert.strictEqual(await page.evaluate(() => {
      window.hlx.sidekick.notify(['Lorem ipsum', 'sit amet']);
      return window.hlx.sidekick.shadowRoot.querySelector('.hlx-sk-overlay .modal').innerHTML;
    }), '<p>Lorem ipsum</p><p>sit amet</p>', 'Did not show multi-line notification');

    // hides sticky modal on overlay click
    assert.ok(await page.evaluate(() => {
      window.hlx.sidekick.showModal('Sticky');
      const overlay = window.hlx.sidekick.shadowRoot.querySelector('.hlx-sk-overlay');
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
    const page = getPage();
    await page.goto(`${fixturesPrefix}/config-none.html`, { waitUntil: 'load' });
    await waitForEvent(page, 'hidden');
    await clickButton(page, 'close');
    assert.ok(
      await page.evaluate(() => window.hlx.sidekick
        .shadowRoot
        .querySelector('.hlx-sk')
        .classList
        .contains('hlx-sk-hidden')),
      'Did not hide sidekick',
    );
    assert.ok(await checkEventFired(page, 'hidden'), 'Event hidden not fired');
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Share button copies sharing URL to clipboard', async () => {
    const page = getPage();
    await page.goto(`${fixturesPrefix}/config-none.html`, { waitUntil: 'load' });
    await clickButton(page, 'share');
    assert.strictEqual(
      await page.evaluate(() => window.hlx.sidekick
        .shadowRoot
        .querySelector('.hlx-sk-overlay .modal')
        .textContent),
      'Sharing URL copied to clipboard',
      'Did not copy sharing URL to clipboard',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Development environment is correctly detected', async () => {
    const page = getPage();
    await mockStandardResponses(page);
    await page.goto(`${fixturesPrefix}/is-dev.html`, { waitUntil: 'load' });
    assert.ok(
      await page.evaluate(() => window.hlx.sidekick.isDev()),
      'Did not detect development URL',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Preview environment is correctly detected', async () => {
    const page = getPage();
    await mockStandardResponses(page);
    await page.goto(`${fixturesPrefix}/is-preview.html`, { waitUntil: 'load' });
    assert.ok(
      await page.evaluate(() => window.hlx.sidekick.isInner() && window.hlx.sidekick.isHelix()),
      'Did not detect preview URL',
    );
    // check with different ref
    await page.evaluate(() => {
      window.hlx.sidekick.location.host = 'test--theblog--adobe.hlx.page';
    });
    assert.ok(
      await page.evaluate(() => window.hlx.sidekick.isInner()),
      'Did not detect preview URL with different ref',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Live environment is correctly detected', async () => {
    const page = getPage();
    await mockStandardResponses(page);
    await page.goto(`${fixturesPrefix}/is-live.html`, { waitUntil: 'load' });
    assert.ok(
      await page.evaluate(() => window.hlx.sidekick.isOuter() && window.hlx.sidekick.isHelix()),
      'Did not detect live URL',
    );
    // check with ref
    await page.evaluate(() => {
      window.hlx.sidekick.location.host = 'master--theblog--adobe.hlx.live';
    });
    assert.ok(
      await page.evaluate(() => window.hlx.sidekick.isOuter()),
      'Did not detect live URL with ref',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Production environment is correctly detected', async () => {
    const page = getPage();
    await mockStandardResponses(page);
    await page.goto(`${fixturesPrefix}/edit-production.html`, { waitUntil: 'load' });
    assert.ok(
      await page.evaluate(() => window.hlx.sidekick.isProd() && window.hlx.sidekick.isHelix()),
      'Did not detect production URL',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Pushes down page content by default', async () => {
    const page = getPage();
    await mockStandardResponses(page);
    await page.goto(`${fixturesPrefix}/config-default.html`, { waitUntil: 'load' });
    await sleep();
    assert.strictEqual(
      await page.evaluate(() => document.documentElement.style.marginTop),
      '49px',
      'Did not push down content',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('Pushes down custom elements', async () => {
    const page = getPage();
    await mockStandardResponses(page, {
      configJs: 'window.hlx.initSidekick({pushDownSelector:"#topnav"})',
    });
    await page.goto(`${fixturesPrefix}/pushdown-custom.html`, { waitUntil: 'load' });
    await sleep();
    assert.deepStrictEqual(
      await page.evaluate(() => Array.from(document.querySelectorAll('html, #topnav'))
        .map((elem) => elem.style.marginTop)),
      ['49px', '49px'],
      'Did not push down custom elements',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('No push down if pushDown false', async () => {
    const page = getPage();
    await mockStandardResponses(page, {
      configJs: 'window.hlx.initSidekick({pushDown:false})',
    });
    await page.goto(`${fixturesPrefix}/config-default.html`, { waitUntil: 'load' });
    await sleep();
    assert.strictEqual(
      await page.evaluate(() => document.documentElement.style.marginTop),
      '',
      'Pushed down content',
    );
  }).timeout(IT_DEFAULT_TIMEOUT);

  it('No push down if gdrive', async () => {
    const page = getPage();
    await mockStandardResponses(page);
    await page.goto(`${fixturesPrefix}/preview-gdrive.html`, { waitUntil: 'load' });
    await sleep();
    assert.strictEqual(
      await page.evaluate(() => document.documentElement.style.marginTop),
      '',
      'Pushed down content',
    );
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
