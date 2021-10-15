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
  setDisplay,
} from './utils.js';

/**
 * Checks a tab and enables/disables the extension.
 * @param {number} id The ID of the tab
 */
function checkTab(id) {
  getState(({ configs }) => {
    browser.tabs
      .get(id)
      .then((tab = {}) => {
        if (!tab.url) return;
        const matches = getConfigMatches(configs, tab.url);
        // console.log('checking', id, tab.url, matches);
        const allowed = matches.length > 0;
        if (allowed) {
          // enable extension for this tab
          browser.pageAction.show(id);
          browser.tabs.executeScript(id, {
            runAt: 'document_start',
            file: './lib/browser-polyfill.min.js',
          })
            .then(() => browser.tabs.executeScript(id, {
              file: './content.js',
            }))
            .catch((e) => console.error('failed to inject scripts', e));
        } else {
          // disable extension for this tab
          browser.pageAction.hide(id);
        }
      })
      .catch((e) => console.error('error checking tab', id, e));
  });
}

/**
 * Toggles the extension for a tab.
 * @param {number} id The ID of the tab
 */
function toggle(id) {
  toggleDisplay(() => {
    checkTab(id);
  });
}

/**
 * Adds the listeners for the extension.
 */
function addListeners() {
  // toggle the sidekick when the browser action is clicked
  browser.pageAction.onClicked.addListener(({ id }) => {
    toggle(id);
  });

  // listen for display updates from content tab
  browser.runtime.onMessage.addListener((msg, sender) => {
    console.log('[background.js] receiving message', msg, sender);
    setDisplay(msg);
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
