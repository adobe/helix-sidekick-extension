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

import { EventEmitter } from 'events';

import { promises as fs } from 'fs';
import {
  assertPlugin,
  checkEventFired,
  DEBUG_LOGS,
  execPlugin, getNotification, getPlugins,
  Setup,
  sleep,
  toResp, waitFor,
} from './utils.js';

/**
 * @typedef {Object} Page
 * @description The Puppeteer page.
 * @see https://github.com/puppeteer/puppeteer/blob/main/docs/api.md#class-page
 */

/**
 * @typedef {Object} HttpRequest
 * @description The Puppeteer HTTP request.
 * @see https://github.com/puppeteer/puppeteer/blob/main/docs/api.md#class-httprequest
 */

/**
 * @typedef {Object} SidekickTest~Request
 * @description An HTTP request made by the sidekick during the test.
 * @prop {string} method The HTTP method
 * @prop {string} url The URL
 */

/**
 * @typedef {Object} SidekickTest~Event
 * @description An event fired by the sidekick during the test.
 * @prop {Object} detail The detail attached to the event
 */

/**
 * @typedef {Object} SidekickTest~Plugin
 * @description A plugin added to the sidekick.
 * @prop {string} id The plugin's ID
 * @prop {string[]} classes The plugin's CSS classes
 * @prop {string} text The plugin's text content
 * @prop {boolean} buttonPressed The plugin's button state
 */

/**
 * @callback SidekickTest~Pre
 * @description A function to call before loading the sidekick.
 * @param {Page} page The Puppeteer page
 */

/**
 * @callback SidekickTest~Post
 * @description A function to call after loading the sidekick.
 * @param {Page} page The Puppeteer page
 */

/**
 * @callback SidekickTest~CheckPage
 * @description A function to execute after loading the sidekick.
 * @param {Page} page The Puppeteer page
 * @returns A truthy (stored in {@link Sidekick~Result.checkPageResult}) or falsy value
 */

/**
 * @typedef {Object} SidekickTest~Options The test options
 * @param {TestBrowser} o.browser Our test browser
 * @param {Page} o.page The Puppeteer page
 * @param {Setup|string} o.setup The [test setup]{@link Setup}
 * @param {string} o.env=preview The environment (preview or live)
 * @param {string} o.type=html The content type of the requested resource (html, xml or json)
 * @param {string} o.fixture=generic.html The fixture file to use as test bed
 * @param {number} o.sleep=0 The number of milliseconds to wait after loading the sidekick
 * @param {string} o.plugin A plugin to execute after loading the sidekick
 * @param {number} o.pluginSleep=0 The number of milliseconds to wait after executing a plugin
 * @param {boolean} acceptDialogs=false Defines whether dialogs will be accepted or dismissed
 * @param {SidekickTest~Pre} o.pre A function to call before loading the sidekick
 * @param {SidekickTest~Post} o.post A function to call after loading the sidekick
 * @param {SidekickTest~CheckPage} o.checkPage A function to call at the end of the test run
 * @param {string[]} o.checkPlugins An array of plugin IDs to check for
 * @param {string[]} o.checkEvents An array of event names to check for
 * @param {number} o.timeoutSuccess=0 A number of milliseconds to wait before passing the test
 * @param {number} o.timeoutFailure=0 A number of milliseconds to wait before failing the test
 * @param {string} o.url A URL to use as test location (optional setup override)
 * @param {string} o.configJs A project config JS (optional setup override)
 * @param {Object} o.sidekickConfig A sidekick config (optional setup override)
 */

/**
 * @typedef {Object} SidekickTest~Result
 * @description The result object returned by {@link SidekickTest#run}.
 * @prop {number} result The result code (defaults to {@link SidekickTest#TEST_COMPLETE})
 * @prop {string} configLoaded The URL of the loaded project config
 * @prop {SidekickTest~Request[]} requestsMade The HTTP requests made by the sidekick
 * @prop {string} popupOpened The URL of a popup opened by the sidekick
 * @prop {string} navigated The URL of the page the sidekick navigated to
 * @prop {Object<SidekickTest~Event>} eventsFired The events fired by the sidekick
 * @prop {Object} sidekick A shallow copy of the sidekick object
 * @prop {Object} sidekick.config A copy of the sidekick's generated configuration
 * @prop {Object} sidekick.location A copy of the sidekick's generated location
 * @prop {Object} sidekick.status A copy of the sidekick's generated status
 * @prop {SidekickTest~Plugin[]} plugins The plugins added to the sidekick
 * @prop {string} notification A notification shown by the sidekick
 * @prop {Object} dialog A dialog displayed by the sidekick
 * @prop {string} dialog.type The dialog type (alert or confirm)
 * @prop {string} dialog.message The dialog message
 * @prop {*} checkPageResult The result of {@link SidekickTest~CheckPage}
 */

/**
 * The sidekick test runner.
 */
export class SidekickTest extends EventEmitter {
  /**
   * Creates a new {@code SidekickTest} instance.
   * @param {SidekickTest~Options} o The options
   */
  constructor(o = {}) {
    super();
    // main options
    /** @type TestBrowser */
    this.browser = o.browser;
    this.page = o.page;
    this.setup = o.setup instanceof Setup ? o.setup : new Setup(o.setup || 'blog');
    this.env = o.env || 'preview';
    this.type = o.type || 'html';
    this.fixture = o.fixture || 'generic.html';
    this.sleep = o.sleep ?? 0;
    this.plugin = o.plugin;
    this.pluginSleep = o.pluginSleep ?? 0;
    this.acceptDialogs = o.acceptDialogs || false;
    this.waitPopup = o.waitPopup ?? 0;
    this.waitNavigation = o.waitNavigation
      ? new Set(Array.isArray(o.waitNavigation) ? o.waitNavigation : [o.waitNavigation])
      : new Set();
    this.waitNavigationTime = 2000;
    this.loadModule = o.loadModule || false;

    // options derived from setup - or overrides
    this.url = o.url || this.setup.getUrl(this.env, this.type);
    this.configJs = o.configJs || this.setup.configJs;
    this.configJson = o.configJson || this.setup.configJson;
    this.sidekickConfig = o.sidekickConfig || JSON.parse(JSON.stringify(this.setup.sidekickConfig));

    // optional pre/post sidekick injection functions
    this.pre = o.pre || (async () => {});
    this.post = o.post || (async () => {});

    // optional checks
    this.checkPlugins = o.checkPlugins;
    this.checkEvents = o.checkEvents;
    this.checkPage = o.checkPage;

    // optional request handler
    this.requestHandler = o.requestHandler;

    // timeout settings
    this.timeoutFailure = o.timeoutFailure || 0;
    this.timeoutSuccess = o.timeoutSuccess || 0;
  }

  // result codes
  static TEST_COMPLETE = 1;

  static TIMED_OUT = 2;

  static CHECK_REQUEST = 3;

  static CHECK_PAGE = 4;

  /**
   * Runs the sidekick test.
   * @param {string} pageUrl A URL to use as test location (optional setup override)
   * @returns {SidekickTest~Result} The result object
   */
  async run(pageUrl) {
    const requestsMade = [];
    const {
      acceptDialogs,
      configJs,
      configJson,
    } = this;
    let pageLoaded = false;
    let navigated;
    let popupOpened;
    let eventsFired = {};
    let configLoaded = false;
    let sidekick;
    let plugins;
    let notification;
    let dialog;
    let checkPageResult;
    let popupTarget;

    async function recordTargetCreated(target) {
      const targetUrl = target.url();
      if (targetUrl !== 'about:blank' && !targetUrl.startsWith('devtools://')) {
        popupOpened = targetUrl;
        popupTarget = target;
        if (DEBUG_LOGS) {
          // eslint-disable-next-line no-console
          console.log('created new page', targetUrl);
        }
      }
    }

    async function printConsole(msg) {
      // eslint-disable-next-line no-console
      if (DEBUG_LOGS) {
        // eslint-disable-next-line no-console
        console.log(`> [${msg.type()}] ${msg.text()}`);
      }
    }

    async function handleDialogs(d) {
      dialog = {
        type: d.type(),
        message: d.message(),
      };
      if (acceptDialogs) {
        await d.accept();
      } else {
        await d.dismiss();
      }
    }

    let browserRequestHandler = async (req) => {
      const { url } = req;
      if (DEBUG_LOGS) {
        // eslint-disable-next-line no-console
        console.log(`[pup]${req.isNavigationRequest ? ' navigation' : ''} request`, req.method, url);
      }
      const reqObj = {
        method: req.method,
        headers: req.headers,
        url,
      };
      if (this.requestHandler) {
        const r = await this.requestHandler(reqObj);
        if (r) {
          return r;
        }
      }

      if (req.isNavigationRequest) {
        if (!pageLoaded) {
          pageLoaded = true;
        } else {
          navigated = url;
        }
        if (this.waitNavigation.delete(url)) {
          requestsMade.push(reqObj);
          return -1;
        }
      }
      if (url.startsWith('http')) {
        if (url.startsWith('https://rum.hlx.page/')) {
          // dummy response for rum requests
          return toResp('');
        } else {
          requestsMade.push(reqObj);
          if (url.endsWith('/tools/sidekick/config.json')) {
            configLoaded = url;
            return toResp(configJson);
          } else if (url.endsWith('/tools/sidekick/config.js')) {
            configLoaded = url;
            return toResp(configJs);
          } else if (url.startsWith('https://www.hlx.live/tools/sidekick/')) {
            // return local source file
            const { pathname, search } = new URL(url);
            if (pathname === '/tools/sidekick/' && search) {
              // share url
              return toResp('Share URL', 'foo.html');
            }
            const path = `${__rootdir}/src/extension/${pathname.split('/').slice(3).join('/')}`;
            try {
              const file = await fs.readFile(path, 'utf-8');
              return toResp(file, pathname);
            } catch (e) {
              throw new Error('failed to load local module.js');
            }
          } else if (url.startsWith('https://www.hlx.live/')) {
            // dummy content for anything else on www.hlx.live
            return toResp('', url);
          }
        }
      } else if (url.startsWith('file://') && url.indexOf('/bookmarklet/') > 0 && !url.endsWith('/app.js')) {
        // rewrite all `/bookmarklet/` requests (except app.js)
        if (DEBUG_LOGS) {
          // eslint-disable-next-line no-console
          console.log('[pup] rewriting', url);
        }
        req.url = req.url.replace('/bookmarklet/', '/extension/');
      }
      return null;
    };
    browserRequestHandler = browserRequestHandler.bind(this);

    let timeOutHandle;
    const result = await new Promise((resolve, reject) => {
      // set timeouts
      if (this.timeoutFailure || this.timeoutSuccess) {
        timeOutHandle = setTimeout(() => {
          timeOutHandle = null;
          if (this.timeoutSuccess) {
            resolve(SidekickTest.TIMED_OUT);
          } else {
            reject(new Error('timed out'));
          }
        }, +(this.timeoutFailure || this.timeoutSuccess));
      }
      // instrument popups
      this.page.browser().on('targetcreated', recordTargetCreated);
      this.page.on('dialog', handleDialogs);
      this.page.on('console', printConsole);
      this.browser.onRequestHandler(browserRequestHandler);

      // open fixture and run test
      this.page
        .goto(`file://${__testdir}/fixtures/${this.fixture}`, { waitUntil: 'load' })
        .then(() => this.pre(this.page))
        .then(() => this.page.evaluate(async (
          testLocation,
          skCfg,
          isBookmarklet,
          checkEvents = [],
        ) => {
          // set test location
          if (testLocation) {
            let input = document.getElementById('sidekick_test_location');
            if (!input) {
              input = document.body.appendChild(document.createElement('input'));
              input.id = 'sidekick_test_location';
              input.type = 'hidden';
            }
            input.value = testLocation;
          }
          // inject sidekick
          if (isBookmarklet) {
            const s = document.createElement('script');
            s.id = 'hlx-sk-app';
            s.src = '../../src/bookmarklet/app.js';
            skCfg.scriptRoot = 'https://www.hlx.live/tools/sidekick';
            s.dataset.config = JSON.stringify(skCfg);
            if (document.head.querySelector('script#hlx-sk-app')) {
              document.head.querySelector('script#hlx-sk-app').replaceWith(s);
            } else {
              document.head.append(s);
            }
          } else {
            const moduleScript = document.createElement('script');
            moduleScript.id = 'hlx-sk-module';
            moduleScript.src = '../../src/extension/module.js';
            moduleScript.addEventListener('load', async () => {
              skCfg.scriptUrl = 'https://www.hlx.live/tools/sidekick/module.js';
              window.hlx.sidekickConfig = skCfg;
              const {
                owner,
                repo,
                ref,
                devMode,
              } = skCfg;
              const configOrigin = devMode
                ? 'http://localhost:3000'
                : `https://${ref}--${repo}--${owner}.hlx.live`;
              try {
                const res = await fetch(`${configOrigin}/tools/sidekick/config.json`);
                if (res.ok) {
                  skCfg = {
                    ...skCfg,
                    ...(await res.json()),
                    // no overriding below
                    owner,
                    repo,
                    ref,
                  };
                }
              } catch (e) {
                // init sidekick without extended config
              }
              // init sidekick
              window.hlx.initSidekick(skCfg);
            });
            if (document.head.querySelector('script#hlx-sk-module')) {
              document.head.querySelector('script#hlx-sk-module').replaceWith(moduleScript);
            } else {
              document.head.append(moduleScript);
            }
          }

          // wait for sidekick to initialize
          await new Promise((res) => {
            document.addEventListener('helix-sidekick-ready', res);
          });

          // listen for all sidekick events
          window.hlx.sidekickEvents = {};
          [
            'shown',
            'hidden',
            'contextloaded',
            'statusfetched',
            'pluginused',
            'envswitched',
            'updated',
            'published',
            'unpublished',
            'deleted',
            'cssloaded',
            'pluginsloaded',
            ...checkEvents,
          ].forEach((eventType) => {
            window.hlx.sidekick.addEventListener(eventType, (evt) => {
              window.hlx.sidekickEvents[eventType] = evt.detail;
              // eslint-disable-next-line no-console
              console.log(`event fired: ${eventType}`, JSON.stringify(evt));
            });
          });
          // wait for some events
          await new Promise((res) => {
            const events = new Set(['cssloaded']);
            events.forEach((evt) => {
              window.hlx.sidekick.addEventListener(evt, () => {
                events.delete(evt);
                if (events.size === 0) {
                  res();
                }
              });
            });
          });
        }, pageUrl || this.url, this.sidekickConfig, !this.loadModule, this.checkEvents))
        // wait until sidekick is fully loaded
        .then(() => sleep(+this.sleep))
        .then(() => this.post(this.page))
        // perform checks
        .then(() => assertPlugin(this.page, this.checkPlugins))
        .then(() => execPlugin(this.page, this.plugin))
        .then(() => sleep(this.pluginSleep))
        .then(() => waitFor(() => popupOpened, this.waitPopup))
        .then(() => waitFor(() => this.waitNavigation.size === 0, this.waitNavigationTime))
        .then(() => checkEventFired(this.page, this.checkEvents))
        .then(async () => {
          sidekick = await this.page.evaluate(() => window.hlx.sidekick);
          eventsFired = await this.page.evaluate(() => window.hlx.sidekickEvents);
          plugins = await getPlugins(this.page);
          notification = await getNotification(this.page);
          if (typeof this.checkPage === 'function') {
            checkPageResult = await this.checkPage(this.page);
            if (checkPageResult) {
              resolve(SidekickTest.CHECK_PAGE);
              return;
            }
          }
          if (!this.timeoutFailure && !this.timeoutSuccess) {
            resolve(SidekickTest.TEST_COMPLETE);
          }
        })
        .catch((e) => reject(e))
        .finally(() => {
          if (timeOutHandle) {
            clearTimeout(timeOutHandle);
          }
          this.browser.offRequestHandler(browserRequestHandler);
          this.page.browser().off('targetcreated', recordTargetCreated);
          this.page.off('console', printConsole);
          this.page.off('dialog', handleDialogs);
        });
    });
    // run test
    return {
      result,
      configLoaded,
      requestsMade,
      popupOpened,
      popupTarget,
      navigated,
      eventsFired,
      sidekick,
      plugins,
      notification,
      dialog,
      checkPageResult,
    };
  }
}
