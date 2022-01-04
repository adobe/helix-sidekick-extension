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

const fs = require('fs-extra');

const {
  Setup,
  getPage,
  checkPlugin,
  execPlugin,
  checkEventFired,
  sleep,
  toResp,
  getPlugins,
  getNotification,
} = require('./utils.js');

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
 * @callback SidekickTest~CheckRequest
 * @description A function to call if an HTTP request occurs.
 * @param {HttpRequest} req The Puppeteer HTTP request
 * @returns A truthy (stored in {@link Sidekick~Result.checkRequestResult}) or falsy value
 */

/**
 * @callback SidekickTest~CheckPage
 * @description A function to execute after loading the sidekick.
 * @param {Page} page The Puppeteer page
 * @returns A truthy (stored in {@link Sidekick~Result.checkPageResult}) or falsy value
 */

/**
 * @typedef {Object} SidekickTest~Options The test options
 * @param {Page} o.page The Puppeteer page
 * @param {Setup|string} o.setup The [test setup]{@link Setup}
 * @param {string} o.env=preview The environment (preview or live)
 * @param {string} o.type=html The content type of the requested resource (html, xml or json)
 * @param {string} o.fixture=generic.html The fixture file to use as test bed
 * @param {number} o.sleep=1000 The number of milliseconds to wait after loading the sidekick
 * @param {string} o.plugin A plugin to execute after loading the sidekick
 * @param {number} o.pluginSleep=2000 The number of milliseconds to wait after executing a plugin
 * @param {boolean} acceptDialogs=false Defines whether dialogs will be accepted or dismissed
 * @param {boolean} allowNavigation=false Defines whether navigation is allowed
 * @param {SidekickTest~Pre} o.pre A function to call before loading the sidekick
 * @param {SidekickTest~Post} o.post A function to call after loading the sidekick
 * @param {SidekickTest~CheckRequest} o.checkRequest A function to call if an HTTP request occurs
 * @param {SidekickTest~CheckPage} o.checkPage A function to call at the end of the test run
 * @param {string[]} o.checkPlugins An array of plugin IDs to check for
 * @param {string[]} o.checkEvents An array of event names to check for
 * @param {number} o.timeoutSuccess=0 A number of milliseconds to wait before passing the test
 * @param {number} o.timeoutFailure=0 A number of milliseconds to wait before failing the test
 * @param {string} o.url A URL to use as test location (optional setup override)
 * @param {string} o.configJs A project config JS (optional setup override)
 * @param {Object} o.sidekickConfig A sidekick config (optional setup override)
 * @param {Object[]} o.apiResponses An array of API responses (optional setup override)
 * @param {Object[]} o.contentResponses An array of content responses (optional setup override)
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
 * @prop {*} checkRequestResult The result of {@link SidekickTest~CheckRequest}
 * @prop {*} checkPageResult The result of {@link SidekickTest~CheckPage}
 */

/**
 * The sidekick test runner.
 */
class SidekickTest {
  /**
   * Creates a new {@code SidekickTest} instance.
   * @param {SidekickTest~Options} o The options
   */
  constructor(o = {}) {
    // main options
    this.page = o.page || getPage();
    this.setup = o.setup instanceof Setup ? o.setup : new Setup(o.setup || 'blog');
    this.env = o.env || 'preview';
    this.type = o.type || 'html';
    this.fixture = o.fixture || 'generic.html';
    this.sleep = o.sleep || 1000;
    this.plugin = o.plugin;
    this.pluginSleep = o.pluginSleep || 2000;
    this.acceptDialogs = o.acceptDialogs || false;
    this.allowNavigation = o.allowNavigation || false;

    // options derived from setup - or overrides
    this.url = o.url || this.setup.getUrl(this.env, this.type);
    this.configJs = o.configJs || this.setup.configJs;
    this.sidekickConfig = o.sidekickConfig || this.setup.sidekickConfig;
    this.apiResponses = o.apiResponses || [this.setup.apiResponse('status', this.type)];
    this.contentResponses = o.contentResponses || [this.setup.contentResponse(this.type)];

    // optional pre/post sidekick injection functions
    this.pre = o.pre || (async () => {});
    this.post = o.post || (async () => {});

    // optional checks
    this.checkRequest = o.checkRequest;
    this.checkPlugins = o.checkPlugins;
    this.checkEvents = o.checkEvents;
    this.checkPage = o.checkPage;

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
   * @param {string} url A URL to use as test location (optional setup override)
   * @returns {SidekickTest~Result} The result object
   */
  async run(url) {
    const requestsMade = [];
    const {
      acceptDialogs,
      allowNavigation,
      checkRequest,
      apiResponses,
      contentResponses,
      configJs,
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
    let checkRequestResult;
    let checkPageResult;

    const result = await new Promise((resolve, reject) => {
      if (!this.hasRun) {
        // set timeouts
        if (this.timeoutFailure || this.timeoutSuccess) {
          setTimeout(() => {
            if (this.timeoutSuccess) {
              resolve(SidekickTest.TIMED_OUT);
            } else {
              reject(new Error('timed out'));
            }
          }, +(this.timeoutFailure || this.timeoutSuccess));
        }
        // instrument popups
        this.page.browser().on('targetcreated', (req) => {
          if (!req.url().startsWith('devtools://')) {
            popupOpened = req.url();
          }
        });
        // instrument dialogs
        this.page.on('dialog', async (d) => {
          dialog = {
            type: d.type(),
            message: d.message(),
          };
          if (acceptDialogs) {
            await d.accept();
          } else {
            await d.dismiss();
          }
        });
        // instrument requests
        this.page.setRequestInterception(true);
        this.page.on('request', async (req) => {
          // console.log(req.url());
          if (req.isNavigationRequest()) {
            if (!pageLoaded) {
              pageLoaded = true;
            } else {
              navigated = req.url();
              if (!allowNavigation) {
                req.abort('aborted');
              }
            }
          }
          if (req.url().startsWith('http')) {
            requestsMade.push({
              method: req.method(),
              url: req.url(),
            });
            if (typeof checkRequest === 'function') {
              checkRequestResult = checkRequest(req);
              if (checkRequestResult) {
                resolve(SidekickTest.CHECK_REQUEST);
                return;
              }
            }
            if (req.url().startsWith('https://admin.hlx.page/')) {
              req.respond(toResp(apiResponses.length === 1
                ? apiResponses[0] : apiResponses.shift()));
            } else if (req.url().endsWith('/tools/sidekick/config.js')) {
              configLoaded = req.url();
              req.respond(toResp(configJs));
            } else if (req.url() === 'https://www.hlx.live/tools/sidekick/module.js') {
              try {
                // return local module.js
                const module = await fs.readFile(`${__dirname}/../src/sidekick/module.js`, 'utf-8');
                req.respond(toResp(module));
              } catch (e) {
                reject(new Error('failed to load local module.js'));
              }
            } else {
              req.respond(toResp(contentResponses.length === 1
                ? contentResponses[0] : contentResponses.shift()));
            }
          } else if (req.url().startsWith('file://')) {
            // let file requests through
            req.continue();
          }
        });
      }
      this.hasRun = true;
      // open fixture and run test
      this.page
        .goto(`file://${__dirname}/fixtures/${this.fixture}`, { waitUntil: 'load' })
        .then(() => this.pre(this.page))
        .then(() => this.page.evaluate((testLocation, skCfg) => {
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
          const s = document.createElement('script');
          s.id = 'hlx-sk-app';
          s.src = '../../src/sidekick/app.js';
          s.dataset.config = JSON.stringify(skCfg);
          if (document.head.querySelector('script#hlx-sk-app')) {
            document.head.querySelector('script#hlx-sk-app').replaceWith(s);
          } else {
            document.head.append(s);
          }
          // wait for sidekick object to instrument
          window.hlx = window.hlx || {};
          window.hlx.sidekickWait = window.setInterval(() => {
            if (window.hlx.sidekick) {
              window.clearInterval(window.hlx.sidekickWait);
              delete window.hlx.sidekickWait;
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
              ].forEach((eventType) => {
                window.hlx.sidekick.addEventListener(eventType, (evt) => {
                  window.hlx.sidekickEvents[eventType] = evt.detail;
                });
              });
            }
          }, 10);
        }, url || this.url, this.sidekickConfig))
        // wait until sidekick is fully loaded
        .then(() => sleep(+this.sleep))
        .then(() => this.post(this.page))
        // perform checks
        .then(() => checkPlugin(this.page, this.checkPlugins))
        .then(() => execPlugin(this.page, this.plugin))
        .then(() => sleep(this.plugin ? +this.pluginSleep : 0))
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
        .catch((e) => reject(e));
    });
    // run test
    return {
      result,
      configLoaded,
      requestsMade,
      popupOpened,
      navigated,
      eventsFired,
      sidekick,
      plugins,
      notification,
      dialog,
      checkRequestResult,
      checkPageResult,
    };
  }
}

module.exports = {
  SidekickTest,
};
