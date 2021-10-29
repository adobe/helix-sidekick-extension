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
  GH_URL,
  SHARE_URL,
  url,
  log,
  i18n,
  getState,
  getConfigMatches,
  toggleDisplay,
  addConfig,
  getShareSettings,
  getGitHubSettings,
} from './utils.js';

/**
 * Tries to retrieve a project config from a tab.
 * @param string} tabUrl The URL of the tab
 * @returns {object} The config object
 */
function getConfigFromTabUrl(tabUrl) {
  const cfg = getShareSettings(tabUrl);
  if (!cfg.giturl && tabUrl.startsWith(GH_URL)) {
    cfg.giturl = tabUrl;
    cfg.hlx3 = true;
  }
  return cfg;
}

/**
 * Enables or disables the context menu item for a tab.
 * @param {string} tabUrl The URL of the tab
 * @param {Object[]} configs The existing configurations
 */
async function checkContextMenu(tabUrl, configs) {
  const visible = tabUrl.startsWith(GH_URL) || tabUrl.startsWith(SHARE_URL);
  let enabled = visible;
  let checked = false;
  if (enabled && configs) {
    const cfg = getConfigFromTabUrl(tabUrl);
    if (cfg.giturl) {
      const { owner, repo } = getGitHubSettings(cfg.giturl);
      const exists = configs.find((c) => c.owner === owner && c.repo === repo);
      enabled = !exists;
      checked = !!exists;
    }
  }
  browser.contextMenus.update('add-project', {
    visible,
    enabled,
    checked,
  });
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
        checkContextMenu(tab.url, configs);
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
  // context menu item for adding project config
  browser.contextMenus.create({
    id: 'add-project',
    title: i18n('config_project_add'),
    contexts: [
      'page_action',
      'all',
    ],
    type: 'checkbox',
    visible: false,
  });

  browser.contextMenus.onClicked.addListener(async (_, tab) => {
    if (!tab.url) return;
    const cfg = getConfigFromTabUrl(tab.url);
    if (!cfg.giturl) {
      return;
    }
    await addConfig(cfg, (added) => {
      if (added && tab.url !== url('options.html')) {
        // redirect to options page
        window.open(url('options.html'));
      }
    });
  });

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

// announce sidekick display state
getState(({ display }) => {
  log.info(`sidekick now ${display ? 'shown' : 'hidden'}`);
});
