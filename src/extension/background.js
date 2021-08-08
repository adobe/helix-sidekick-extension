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
/* eslint-disable no-console */

'use strict';

import {
  getState,
  getConfigMatches,
  toggleDisplay,
} from './utils.js';

export function checkTab(id, cb) {
  getState(({ configs }) => {
    browser.tabs
      .get(id)
      .then((tab = {}) => {
        // if (browser.runtime.lastError) {
        //   console.log('error', chrome.runtime.lastError);
        //   return;
        // }
        const allowed = tab.url && getConfigMatches(configs, tab.url).length;
        if (allowed) {
          // enable extension for this tab
          browser.pageAction.show(id);
          // inject/refresh sidekick in tab
          browser.tabs.executeScript(id, {
            file: 'content.js',
          });
        } else {
          // disable action for this tab
          browser.pageAction.hide(id);
        }
        if (typeof cb === 'function') cb(allowed);
      })
      .catch((e) => console.error('error enabling extension', e));
  });
}

export function toggle(id, cb) {
  toggleDisplay();
  checkTab(id, cb);
}

export function addListeners() {
  // toggle the sidekick when the browser action is clicked
  browser.pageAction.onClicked.addListener(({ id }) => {
    toggle(id);
  });

  // listen for url updates in any tab and inject sidekick if must be shown
  browser.tabs.onUpdated.addListener((id, info) => {
    // wait until the tab is done loading
    if (info.status === 'complete') {
      checkTab(id);
    }
  });

  // re-check tabs when activated
  browser.tabs.onActivated.addListener(({ tabId: id }) => {
    checkTab(id);
  });

  // detect and propagate display changes
  browser.storage.onChanged.addListener(({ hlxSidekickDisplay = null }, area) => {
    if (area === 'local' && hlxSidekickDisplay) {
      const display = hlxSidekickDisplay.newValue;
      console.log(`sidekick now ${display ? 'shown' : 'hidden'}`);
      browser.tabs
        .query({
          currentWindow: true,
        })
        .then((tabs) => {
          tabs.forEach(({ id, _, active = false }) => {
            if (!active) {
              // skip current tab
              checkTab(id);
            }
          });
        })
        .catch((e) => console.error('error propagating display state', e));
    }
  });

  // fetch script and execute in sandbox
  browser.runtime.onConnect.addListener((port) => {
    console.assert(port.name === browser.runtime.id);
    port.onMessage.addListener(({ scriptUrl, cb }) => {
      if (scriptUrl) {
        fetch(scriptUrl)
          .then((response) => response.text())
          .then((code) => browser.tabs.executeScript(port.sender.tab.id, { code }))
          .then(() => (typeof cb === 'function' ? cb() : null))
          .catch((e) => console.error('unable to load script', scriptUrl, e));
      }
    });
  });
}

addListeners();
