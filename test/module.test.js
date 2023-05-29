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

import assert from 'assert';
import {
  checkEventFired, IT_DEFAULT_TIMEOUT, Nock, Setup, TestBrowser,
} from './utils.js';

import { SidekickTest } from './SidekickTest.js';

describe('Test sidekick', () => {
  for (const loadModule of [true, false]) {
    describe(`Test sidekick ${loadModule ? 'module' : 'bookmarklet'}`, () => {
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

      it('Renders with config', async () => {
        const setup = new Setup('blog');
        nock.sidekick(setup);
        nock.admin(setup);
        const result = await new SidekickTest({
          browser,
          page,
          loadModule,
          sleep: 500,
          setup: 'blog',
        }).run();
        const { plugins, sidekick: { config: { innerHost, outerHost } } } = result;
        // check sidekick config
        assert.strictEqual(innerHost, 'main--blog--adobe.hlx.page', `Unexpected innerHost: ${innerHost}`);
        assert.strictEqual(outerHost, 'main--blog--adobe.hlx.live', `Unexpected outerHost: ${innerHost}`);
        // check plugins
        assert.strictEqual(plugins.length, 14, `Wrong number of plugins: ${plugins.length}`);
      }).timeout(IT_DEFAULT_TIMEOUT);

      it('Handles errors fetching status from admin API', async () => {
        const errors = [
          { status: 404, body: 'Not found' },
          { status: 500, body: 'Server error' },
          { status: 504, body: 'Gateway timeout' },
        ];
        nock('https://admin.hlx.page')
          .get('/status/adobe/blog/main/en/topics/bla?editUrl=auto')
          .reply(404)
          .get('/status/adobe/blog/main/en/topics/bla?editUrl=auto')
          .reply(500)
          .get('/status/adobe/blog/main/en/topics/bla?editUrl=auto')
          .reply(504);
        nock.sidekick(new Setup('blog'), { persist: true }); // will be called multiple times
        const test = new SidekickTest({
          browser,
          page,
          loadModule,
          acceptDialogs: true,
          checkPage: (p) => p.evaluate(() => {
            // click overlay and return sidekick reference
            window.hlx.sidekick.shadowRoot.querySelector('.hlx-sk-overlay').click();
            return window.hlx.sidekick;
          }),
        });
        while (errors.length) {
          const { status } = errors.shift();
          // eslint-disable-next-line no-await-in-loop
          const { notification, checkPageResult } = await test.run();
          const sidekick = checkPageResult;
          assert.ok(
            notification.message.includes(status),
            `Expected ${status} in message, but got ${notification.message}`,
          );
          assert.strictEqual(sidekick, undefined, 'Did not delete sidekick');
        }
      }).timeout(IT_DEFAULT_TIMEOUT);

      it('Uses main branch by default', async () => {
        const setup = new Setup('blog');
        nock.sidekick(setup);
        nock.admin(setup);
        const result = await new SidekickTest({
          browser,
          page,
          loadModule,
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
        const setup = new Setup('blog');
        nock.sidekick(setup, {
          configJson: `{
            "plugins": [{
              "id": "foo",
              "title": "Foo",
              "url": "https://www.foo.bar"
            }]
          }`,
        });
        nock.admin(setup);
        const { plugins } = await new SidekickTest({
          browser,
          page,
          loadModule,
        }).run();
        assert.ok(plugins.find((p) => p.id === 'foo'), 'Did not add plugin from config');
      }).timeout(IT_DEFAULT_TIMEOUT);

      it('Detects innerHost and outerHost from config', async () => {
        const setup = new Setup('blog');
        nock.sidekick(setup);
        nock.admin(setup);
        const result = await new SidekickTest({
          browser,
          page,
          loadModule,
          setup: 'blog',
        }).run();
        // check sidekick config
        const { sidekick: { config: { innerHost, outerHost } } } = result;
        assert.strictEqual(innerHost, 'main--blog--adobe.hlx.page', `Unexpected innerHost: ${innerHost}`);
        assert.strictEqual(outerHost, 'main--blog--adobe.hlx.live', `Unexpected outerHost: ${innerHost}`);
      }).timeout(IT_DEFAULT_TIMEOUT);

      it('Uses previewHost from config', async () => {
        const testPreviewHost = 'preview.example.com';
        const setup = new Setup('blog');
        nock.sidekick(setup, {
          configJson: `{
            "previewHost": "${testPreviewHost}"
          }`,
        });
        nock.admin(setup);
        const { sidekick: { config: { innerHost } } } = await new SidekickTest({
          browser,
          page,
          loadModule,
          setup: 'blog',
        }).run();
        assert.strictEqual(
          innerHost,
          testPreviewHost,
        );
      }).timeout(IT_DEFAULT_TIMEOUT);

      it('Uses liveHost from config', async () => {
        const testLiveHost = 'live.example.com';
        const setup = new Setup('blog');
        nock.sidekick(setup, {
          configJson: `{
            "liveHost": "${testLiveHost}"
          }`,
        });
        nock.admin(setup);
        const { sidekick: { config: { outerHost } } } = await new SidekickTest({
          browser,
          page,
          loadModule,
          setup: 'blog',
        }).run();
        assert.strictEqual(
          outerHost,
          testLiveHost,
        );
      }).timeout(IT_DEFAULT_TIMEOUT);

      it('Adds plugin via API', async () => {
        const setup = new Setup('blog');
        nock.sidekick(setup);
        nock.admin(setup);
        const { plugins } = await new SidekickTest({
          browser,
          page,
          loadModule,
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

      it.only('Loads config and plugins from project config', async () => {
        const setup = new Setup('blog');
        nock.sidekick(setup, {
          configJson: `{
            "host": "blog.adobe.com",
            "plugins": [{
              "id": "bar",
              "title": "Bar",
              "url": "https://www.adobe.com/"
            }, {
              "id": "publish",
              "excludePaths": ["/en/topics/**"]
            }]
            }`,
        });
        nock.admin(setup);
        nock('https://www.adobe.com')
          .get(/.*/)
          .optionally()
          .reply(200, 'some content...');

        const test = new SidekickTest({
          browser,
          page,
          loadModule,
          plugin: 'bar',
          pluginSleep: 1000,
        });
        const {
          configLoaded,
          plugins,
          popupOpened,
          sidekick: { config: { host } },
        } = await test.run();
        assert.ok(configLoaded, 'Did not load project config');
        assert.ok(plugins.find((p) => p.id === 'bar'), 'Did not load plugins from project');
        assert.ok(!plugins.find((p) => p.id === 'publish'), 'Did not override publish plugin from project');
        assert.ok(popupOpened === 'https://www.adobe.com/', 'Did not open plugin URL');
        assert.strictEqual(host, 'blog.adobe.com', 'Did not load config from project');
      }).timeout(IT_DEFAULT_TIMEOUT);

      it('Plugin passes referrer in url', async () => {
        const pluginUrl = 'https://www.adobe.com/';
        const expectedReferrerParam = '?referrer=https%3A%2F%2Fmain--blog--adobe.hlx.page%2Fen%2Ftopics%2Fbla';
        const expectedPopupUrl = `${pluginUrl}${expectedReferrerParam}`;

        nock('https://www.adobe.com')
          .get(/.*/)
          .optionally()
          .reply(200, 'some content...');

        const setup = new Setup('blog');
        nock.sidekick(setup, {
          configJson: `{
            "plugins": [{
              "id": "bar",
              "title": "Bar",
              "url": "${pluginUrl}",
              "passReferrer": true
            }]
          }`,
        });
        nock.admin(setup);
        const test = new SidekickTest({
          browser,
          page,
          loadModule,
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
        const pluginUrl = 'https://www.adobe.com/';
        const expectedInfoParam = '?ref=main&repo=blog&owner=adobe&project=Blog';
        const expectedPopupUrl = `${pluginUrl}${expectedInfoParam}`;

        nock('https://www.adobe.com')
          .get(/.*/)
          .optionally()
          .reply(200, 'some content...');

        const setup = new Setup('blog');
        nock.sidekick(setup, {
          configJson: `{
            "plugins": [{
              "id": "bar",
              "title": "Bar",
              "url": "${pluginUrl}",
              "passConfig": true
            }]
          }`,
        });
        nock.admin(setup);
        const test = new SidekickTest({
          browser,
          page,
          loadModule,
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
        const setup = new Setup('blog');
        nock.sidekick(setup, {
          configJson: JSON.stringify({
            host: 'blog.adobe.com',
            plugins: [{
              id: 'bar',
              title: 'Bar',
              url: 'https://www.adobe.com/',
              isPalette: true,
            }],
          }),
        });
        nock.admin(setup);
        nock('https://www.adobe.com/')
          .get('/')
          .optionally()
          .reply(200, 'foo');
        const test = new SidekickTest({
          browser,
          page,
          loadModule,
          plugin: 'bar',
          pluginSleep: 50,
        });
        const {
          configLoaded,
          plugins,
        } = await test.run();
        const palette = await page.evaluate(() => {
          const $p = window.hlx.sidekick.shadowRoot.querySelector('.hlx-sk-palette');
          if (!$p) {
            return null;
          }
          const title = $p.querySelector('.palette-title')?.innerHTML;
          const content = $p.querySelector('.palette-content').innerHTML;
          return {
            title,
            content,
          };
        });
        assert.ok(configLoaded, 'Did not load project config');
        assert.ok(plugins.find((p) => p.id === 'bar'), 'Did not load plugins from project');
        assert.ok(palette, 'Did not show palette');
        assert.deepStrictEqual(palette, {
          title: 'Bar<button title="Close" class="close" tabindex="0"></button>',
          content: '<iframe src="https://www.adobe.com/" allow="clipboard-write *"></iframe>',
        });
      }).timeout(IT_DEFAULT_TIMEOUT);

      it('Plugin fires custom event', async () => {
        const setup = new Setup('blog');
        nock.sidekick(setup, {
          configJson: `{
            "host": "blog.adobe.com",
            "plugins": [{
              "id": "bar",
              "title": "Bar",
              "event": "foo"
            }]
          }`,
        });
        nock.admin(setup);
        const test = new SidekickTest({
          browser,
          page,
          loadModule,
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
        const setup = new Setup('blog');
        nock.sidekick(setup, {
          configJson: `{
            "host": "blog.adobe.com",
            "plugins": [{
              "id": "publish",
              "excludePaths": ["**/drafts/**"]
            }]
          }`,
        });
        nock.admin(setup);
        const test = new SidekickTest({
          browser,
          page,
          loadModule,
        });
        const {
          plugins,
        } = await test.run('https://main--blog--adobe.hlx.page/en/drafts/foo');
        assert.ok(!plugins.find((p) => p.id === 'publish'), 'Did not extend existing plugin');
      }).timeout(IT_DEFAULT_TIMEOUT);

      it('Loads config from development environment', async () => {
        const setup = new Setup('blog');
        nock.admin(setup);
        nock.sidekick(setup);
        const { configLoaded } = await new SidekickTest({
          browser,
          page,
          loadModule,
          sidekickConfig: {
            owner: 'adobe',
            repo: 'blog',
            ref: 'main',
            devMode: true,
          },
        }).run();
        assert.ok(configLoaded.startsWith('http://localhost:3000/'), 'Did not load project config from development environment');
      }).timeout(IT_DEFAULT_TIMEOUT);

      it('Replaces plugin', async () => {
        const setup = new Setup('blog');
        nock.sidekick(setup);
        nock.admin(setup);
        const { plugins } = await new SidekickTest({
          browser,
          page,
          loadModule,
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
        const setup = new Setup('blog');
        nock.sidekick(setup);
        nock.admin(setup);
        const { plugins } = await new SidekickTest({
          browser,
          page,
          loadModule,
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
        const setup = new Setup('blog');
        nock.sidekick(setup);
        nock.admin(setup);
        const { plugins } = await new SidekickTest({
          browser,
          page,
          loadModule,
          post: (p) => p.evaluate(() => window.hlx.sidekick.remove('edit')),
        }).run();
        assert.ok(!plugins.find((p) => p.id === 'edit'), 'Did not remove plugin');
      }).timeout(IT_DEFAULT_TIMEOUT);

      it('Adds HTML element in plugin', async () => {
        const setup = new Setup('blog');
        nock.sidekick(setup);
        nock.admin(setup);
        const { plugins } = await new SidekickTest({
          browser,
          page,
          loadModule,
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
        const setup = new Setup('blog');
        nock.sidekick(setup);
        nock.admin(setup);
        const { plugins } = await new SidekickTest({
          browser,
          page,
          loadModule,
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
        const setup = new Setup('blog');
        nock.sidekick(setup);
        nock.admin(setup);
        const { plugins } = await new SidekickTest({
          browser,
          page,
          loadModule,
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
        const setup = new Setup('blog');
        nock.sidekick(setup);
        nock.admin(setup);
        const { checkPageResult } = await new SidekickTest({
          browser,
          page,
          loadModule,
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
        const setup = new Setup('blog');
        nock.admin(setup, { persist: true });
        nock.sidekick(setup, { persist: true });
        let result = await new SidekickTest({
          browser,
          page,
          loadModule,
          post: (p) => p.evaluate(() => window.hlx.sidekick.showModal({
            message: 'Lorem ipsum',
          })),
        }).run();
        assert.strictEqual(result.notification.message, 'Lorem ipsum', 'Did not show modal');

        // shows sticky modal
        result = await new SidekickTest({
          browser,
          page,
          loadModule,
          post: (p) => p.evaluate(() => window.hlx.sidekick.showModal({
            message: 'Sticky',
            sticky: true,
          })),
        }).run();
        assert.strictEqual(result.notification.message, 'Sticky', 'Did not show sticky modal');

        // adds css class
        result = await new SidekickTest({
          browser,
          page,
          loadModule,
          post: (p) => p.evaluate(() => window.hlx.sidekick.showModal({
            css: 'test',
          })),
        }).run();
        assert.ok(result.notification.className.includes('test'), 'Did not add CSS class');

        // shows legacy notification
        result = await new SidekickTest({
          browser,
          page,
          loadModule,
          post: (p) => p.evaluate(() => window.hlx.sidekick.notify('Lorem ipsum')),
        }).run();
        assert.strictEqual(result.notification.message, 'Lorem ipsum', 'Did not show legacy notification');

        // shows legacy modal
        result = await new SidekickTest({
          browser,
          page,
          loadModule,
          post: (p) => p.evaluate(() => window.hlx.sidekick.showModal('Sticky', true)),
        }).run();
        assert.strictEqual(result.notification.message, 'Sticky', 'Did not show legacy modal');

        // shows multi-line modal
        result = await new SidekickTest({
          browser,
          page,
          loadModule,
          post: (p) => p.evaluate(() => window.hlx.sidekick.showModal({
            message: ['Lorem ipsum', 'sit amet'],
          })),
        }).run();
        assert.strictEqual(result.notification.message, 'Lorem ipsumsit amet', 'Did not show multi-line notification');
      }).timeout(IT_DEFAULT_TIMEOUT);

      it('Hides notifications', async () => {
        // hides sticky modal
        const setup = new Setup('blog');
        nock.sidekick(setup);
        nock.admin(setup);
        const { notification } = await new SidekickTest({
          browser,
          page,
          loadModule,
          post: (p) => p.evaluate(async () => {
            window.hlx.sidekick.showModal({ message: 'Sticky', sticky: true });
            await new Promise((resolve) => {
              setTimeout(resolve, 50);
            });
            window.hlx.sidekick.hideModal();
          }),
        }).run();
        assert.strictEqual(notification.message, null, 'Did not hide sticky modal');
      }).timeout(IT_DEFAULT_TIMEOUT);

      it('Hides notifications on overlay click', async () => {
        // hides sticky modal on overlay click
        const setup = new Setup('blog');
        nock.admin(setup);
        nock.sidekick(setup);
        const { checkPageResult } = await new SidekickTest({
          browser,
          page,
          loadModule,
          checkPage: (p) => p.evaluate(async () => {
            window.hlx.sidekick.showModal({ message: 'Sticky', sticky: true });
            const overlay = window.hlx.sidekick.shadowRoot.querySelector('.hlx-sk-overlay');
            overlay.click();
            const wait = () => new Promise((resolve) => {
              setTimeout(resolve, 200);
            });
            let found;
            let attempt = 0;
            // try multiple times, as the overlay click might be deferred
            do {
              found = overlay.className.includes('hlx-sk-hidden');
              if (!found) {
                attempt += 1;
                // eslint-disable-next-line no-await-in-loop
                await wait();
              }
            } while (attempt < 10 && !found);

            return found;
          }),
        }).run();
        assert.ok(checkPageResult, 'Did not hide sticky modal on overlay click');
      }).timeout(IT_DEFAULT_TIMEOUT);

      it('Hides sidekick on close button click', async () => {
        const setup = new Setup('blog');
        nock.sidekick(setup);
        nock.admin(setup);
        const { checkPageResult, eventsFired } = await new SidekickTest({
          browser,
          page,
          loadModule,
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
        const setup = new Setup('blog');
        nock.sidekick(setup);
        nock.admin(setup);
        const { notification } = await new SidekickTest({
          browser,
          page,
          loadModule,
          post: (p) => p.evaluate(() => window.hlx.sidekick
            .shadowRoot
            .querySelector('.hlx-sk button.share')
            .click()),
        }).run();
        assert.strictEqual(
          notification.message,
          'Sharing URL for Blog copied to clipboard',
          'Did not copy sharing URL to clipboard',
        );
      }).timeout(IT_DEFAULT_TIMEOUT);

      it('Displays page modified info on info button click', async () => {
        const setup = new Setup('blog');
        nock.admin(setup, {
          route: 'status',
          persist: true,
        });
        nock.sidekick(setup);
        const { checkPageResult } = await new SidekickTest({
          browser,
          page,
          loadModule,
          plugin: 'info',
          post: (p) => p.evaluate(() => window.hlx.sidekick.get('info')
            .querySelector('.dropdown-toggle')
            .click()),
          checkPage: (p) => p.evaluate(() => window.hlx.sidekick.get('page-info')
            .innerText),
        }).run();
        assert.ok(
          checkPageResult.includes('Jun 18, 2021'),
          'Dates not displayed by info plugin',
        );
      }).timeout(IT_DEFAULT_TIMEOUT);

      it('Closes open info dropdown when clicking icon', async () => {
        const setup = new Setup('blog');
        nock.admin(setup, {
          route: 'status',
          persist: true,
        });
        nock.sidekick(setup);
        const { checkPageResult } = await new SidekickTest({
          browser,
          page,
          loadModule,
          plugin: 'info',
          checkPage: (p) => p.evaluate(async () => {
            const sleep = async (delay) => new Promise((resolve) => {
              setTimeout(resolve, delay);
            });
            const isOpen = () => window.hlx.sidekick.get('info').classList.contains('dropdown-expanded');
            if (!isOpen()) {
              return 'Menu did not open';
            }

            window.hlx.sidekick.get('info')
              .querySelector('.dropdown-toggle')
              .click();

            await sleep(50);
            if (isOpen()) {
              return 'Menu did not close';
            }
            return 'Menu closed as expected';
          }),
        }).run();
        assert.ok(
          checkPageResult === 'Menu closed as expected',
          checkPageResult,
        );
      }).timeout(IT_DEFAULT_TIMEOUT);

      it('Detects edit environment correctly', async () => {
        const setup = new Setup('blog');
        nock.admin(setup, { persist: true });
        nock.sidekick(setup, { persist: true });
        const test = new SidekickTest({
          browser,
          page,
          loadModule,
          checkPage: async (p) => p.evaluate(() => window.hlx.sidekick.isEditor()),
        });
        // check with google docs url
        const { checkPageResult: gdocsUrl } = await test.run('https://docs.google.com/document/d/1234567890/edit');
        assert.ok(gdocsUrl, 'Did not detect google docs URL');

        // check with sharepoint url
        const { checkPageResult: standardSharepointUrl } = await test.run('https://adobe.sharepoint.com/:w:/r/sites/TheBlog/_layouts/15/Doc.aspx?sourcedoc=%7BE8EC80CB-24C3-4B95-B082-C51FD8BC8760%7D&file=bla.docx&action=default&mobileredirect=true');
        assert.ok(standardSharepointUrl, 'Did not detect standard sharepoint URL');

        // check again with sharepoint url for new documents
        const { checkPageResult: newDocSharepointUrl } = await test.run('https://adobe.sharepoint.com/:w:/r/sites/TheBlog/_layouts/15/doc.aspx?sourcedoc=%7Bac6f726e-9293-433d-b825-18bc487816b6%7D&action=edit&cid=04035fad-1161-4f85-9654-ee42e52a20fb');
        assert.ok(newDocSharepointUrl, 'Did not detect sharepoint URL for new document');

        // check again with custom sharepoint url as mountpoint
        test.sidekickConfig.mountpoint = 'https://foo.custom/sites/foo/Shared%20Documents/root1';
        const { checkPageResult: customSharepointUrl } = await test.run('https://foo.custom/:w:/r/sites/foo/_layouts/15/Doc.aspx?sourcedoc=%7BBFD9A19C-4A68-4DBF-8641-DA2F1283C895%7D&file=index.docx&action=default&mobileredirect=true');
        assert.ok(customSharepointUrl, 'Did not detect custom sharepoint URL');
      }).timeout(IT_DEFAULT_TIMEOUT);

      it('Detects development environment correctly', async () => {
        const setup = new Setup('blog');
        nock.sidekick(setup);
        nock.admin(setup);
        const { checkPageResult } = await new SidekickTest({
          browser,
          page,
          loadModule,
          url: 'http://localhost:3000/',
          checkPage: async (p) => p.evaluate(() => window.hlx.sidekick.isDev()),
        }).run();
        assert.ok(checkPageResult, 'Did not detect development URL');
      }).timeout(IT_DEFAULT_TIMEOUT);

      it('Detects preview environment correctly', async () => {
        const setup = new Setup('blog');
        nock.sidekick(setup);
        nock.admin(setup);
        const test = new SidekickTest({
          browser,
          page,
          loadModule,
          checkPage: async (p) => p.evaluate(() => window.hlx.sidekick.isInner()),
        });
        assert.ok((await test.run()).checkPageResult, 'Did not detect preview URL');
        // check again with different ref
        nock.sidekick(setup);
        nock.admin(setup);
        assert.ok(
          (await test.run('https://test--blog--adobe.hlx.page/')).checkPageResult,
          'Did not detect preview URL with different ref',
        );
        // check again with hlx3.page
        nock.sidekick(setup);
        nock.admin(setup);
        assert.ok(
          (await test.run('https://main--blog--adobe.hlx3.page/')).checkPageResult,
          'Did not detect preview URL with hlx3.page',
        );
      }).timeout(IT_DEFAULT_TIMEOUT);

      it('Detects live environment correctly', async () => {
        const test = new SidekickTest({
          browser,
          page,
          loadModule,
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
        const setup = new Setup('blog');
        nock.sidekick(setup);
        nock.admin(setup);
        const test = new SidekickTest({
          browser,
          page,
          loadModule,
          url: 'https://blog.adobe.com/',
          configJson: '{"host": "blog.adobe.com"}',
          checkPage: async (p) => p.evaluate(() => window.hlx.sidekick.isProd()),
        });
        assert.ok((await test.run()).checkPageResult, 'Did not detect production URL');
      }).timeout(IT_DEFAULT_TIMEOUT);

      it('Does not push down page content by default', async () => {
        const setup = new Setup('blog');
        nock.sidekick(setup);
        nock.admin(setup);
        const { checkPageResult } = await new SidekickTest({
          browser,
          page,
          loadModule,
          checkPage: (p) => p.evaluate(() => document.documentElement.style.marginTop),
        }).run();
        assert.strictEqual(checkPageResult, '', 'Did push down content');
      }).timeout(IT_DEFAULT_TIMEOUT);

      it('Pushes down page content if configured', async () => {
        const setup = new Setup('blog');
        nock.sidekick(setup, {
          configJson: '{"pushDown": true}',
        });
        nock.admin(setup);
        const test = new SidekickTest({
          browser,
          page,
          loadModule,
          sleep: 500,
          checkPage: (p) => p.evaluate(() => document.documentElement.style.marginTop),
        });
        const { checkPageResult } = await test.run();
        assert.strictEqual(checkPageResult, '49px', 'Did not push down content');
      }).timeout(IT_DEFAULT_TIMEOUT);

      it('Pushes down custom elements', async () => {
        const setup = new Setup('blog');
        nock.sidekick(setup, {
          configJson: '{"pushDown": true, "pushDownSelector":"#topnav"}',
        });
        nock.admin(setup);
        const { checkPageResult } = await new SidekickTest({
          browser,
          page,
          loadModule,
          sleep: 500,
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
        const setup = new Setup('blog');
        nock.sidekick(setup, {
          configJson: '{"pushDown": true, "pushDownSelector":"#topnav"}',
        });
        nock.admin(setup);
        const { checkPageResult } = await new SidekickTest({
          browser,
          page,
          loadModule,
          sleep: 500,
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
        const setup = new Setup('blog');
        nock.sidekick(setup, {
          configJson: '{"pushDown": true, "pushDownSelector":"#topnav"}',
        });
        nock.admin(setup);
        const { checkPageResult } = await new SidekickTest({
          browser,
          page,
          loadModule,
          sleep: 500,
          post: (p) => p.evaluate(() => window.hlx.sidekick.hide()),
          checkPage: (p) => p.evaluate(() => document.documentElement.style.marginTop),
        }).run();
        assert.strictEqual(checkPageResult, 'initial', 'Push down not reverted');
      }).timeout(IT_DEFAULT_TIMEOUT);

      it('Does not push down if gdrive', async () => {
        const setup = new Setup('blog');
        nock.sidekick(setup, {
          configJson: '{"pushDown":false}',
        });
        nock.admin(setup);
        const { checkPageResult } = await new SidekickTest({
          browser,
          page,
          loadModule,
          url: 'https://docs.google.com/document/d/2E1PNphAhTZAZrDjevM0BX7CZr7KjomuBO6xE1TUo9NU/edit',
          checkPage: (p) => p.evaluate(() => document.documentElement.style.marginTop),
        }).run();
        assert.strictEqual(checkPageResult, '', 'Pushed down content');
      }).timeout(IT_DEFAULT_TIMEOUT);

      it('Shows special view for JSON file', async () => {
        const setup = new Setup('blog');
        nock.sidekick(setup);
        nock.admin(setup);
        nock('https://main--blog--adobe.hlx.page')
          .get('/en/bla.json')
          .reply(200, JSON.stringify({
            total: 13,
            offset: 0,
            limit: 1,
            data: [
              {
                date: 44917,
                path: '/en/publish/2022/12/22/test',
                title: 'Test post',
                author: 'Adobe',
                tags: '["Foo","Bar","Digital Transformation"]',
                robots: '0',
                lastModified: '1671668578',
              },
            ],
          }));
        const { checkPageResult } = await new SidekickTest({
          browser,
          page,
          loadModule,
          type: 'json',
          checkPage: (p) => p.evaluate(() => window.hlx.sidekick
            .shadowRoot
            .querySelector('.hlx-sk-special-view')),
        }).run();
        assert.ok(checkPageResult, 'Did not show data view for JSON file');
      }).timeout(IT_DEFAULT_TIMEOUT);

      it('Suppresses special view for /helix-env.json', async () => {
        const setup = new Setup('blog');
        nock.sidekick(setup);
        nock.admin(setup);
        const { checkPageResult } = await new SidekickTest({
          browser,
          page,
          loadModule,
          url: 'https://main--blog--adobe.hlx.page/helix-env.json',
          checkPage: (p) => p.evaluate(() => !window.hlx.sidekick
            .shadowRoot
            .querySelector('.hlx-sk-special-view')),
        }).run();
        assert.ok(checkPageResult, 'Did not suppress data view for JSON file');
      }).timeout(IT_DEFAULT_TIMEOUT);

      it('Shows help content', async () => {
        const { notification } = await new SidekickTest({
          browser,
          page,
          loadModule,
          sleep: 1000,
          post: (p) => p.evaluate(() => {
            window.hlx.sidekick.showHelp({
              id: 'test',
              steps: [
                {
                  message: 'Lorem ipsum dolor sit amet',
                  selector: '.env',
                },
              ],
            });
          }),
        }).run();
        assert.strictEqual(notification.message, 'Lorem ipsum dolor sit ametGot it!', `Did not show the expected message: ${notification.message}`);
        assert.strictEqual(notification.className, 'modal help bottom-left', `Did not have the expected CSS classes: ${notification.className}`);
      }).timeout(IT_DEFAULT_TIMEOUT);

      it('Calls admin API with a specific version', async () => {
        const setup = new Setup('blog');
        nock.sidekick(setup);
        nock.admin(setup);
        const test = new SidekickTest({
          browser,
          page,
          loadModule,
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
        nock('https://admin.hlx.page')
          .get(/.*/)
          .twice()
          .reply(401);
        const { checkPageResult } = await new SidekickTest({
          browser,
          page,
          loadModule,
          checkPage: (p) => p.evaluate(() => window.hlx.sidekick.shadowRoot
            .querySelector('.hlx-sk .feature-container .user .dropdown-container')
            .classList.contains('highlight')),
        }).run();
        assert.ok(checkPageResult, 'Did not show login dialog on 401');
      });
    });
  }
});
