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

'use strict';

import {
  log,
  i18n,
  getState,
  getConfigMatches,
  toggleDisplay,
  notify,
  addConfig,
  getShareSettings,
  isValidShareURL,
} from './utils.js';

/**
 * Checks if the URL is a share URL and asks the user
 * to add the config.
 * @param {string} url The URL to check 
 */
async function checkShareUrl(url) {
  if (isValidShareURL(url)) {
    log.info('share URL detected', url);
    if (confirm(i18n('config_shareurl_add_confirm'))) {
      await addConfig(getShareSettings(url), (added) => {
        if (added) {
          notify(i18n('config_shareurl_added'));
        }
      });
    }
  }
}

/**
 * Checks a tab and enables/disables the extension.
 * @param {number} id The ID of the tab
 */
function checkTab(id) {
  getState(({ configs }) => {
    browser.tabs
      .get(id)
      .then(async (tab = {}) => {
        if (!tab.url) return;
        const matches = getConfigMatches(configs, tab.url);
        log.debug('checking', id, tab.url, matches);
        const allowed = matches.length > 0;
        if (allowed) {
          // enable extension for this tab
          browser.pageAction.show(id);
          browser.tabs.executeScript(id, {
            file: './content.js',
          });
        } else {
          // disable extension for this tab
          browser.pageAction.hide(id);
          // check if active tab has share URL and ask to add config
          if (tab.active) {
            checkShareUrl(tab.url);
          }
        }
      })
      .catch((e) => log.error('error checking tab', id, e));
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
(() => {
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
      log.info(`sidekick now ${display ? 'shown' : 'hidden'}`);
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
        .catch((e) => log.error('error propagating display state', e));
    }
  });
})();
