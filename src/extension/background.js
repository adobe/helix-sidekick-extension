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
  DEV_URL,
  url,
  log,
  i18n,
  getState,
  getConfigMatches,
  toggleDisplay,
  addConfig,
  getShareSettings,
  getGitHubSettings,
  setProxyUrl,
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
 * Enables or disables context menu items for a tab.
 * @param {string} tabUrl The URL of the tab
 * @param {Object[]} configs The existing configurations
 */
async function checkContextMenu(tabUrl, configs) {
  // clear context menu
  browser.contextMenus.removeAll();
  // check if add project is applicable
  if (configs && (tabUrl.startsWith(GH_URL) || tabUrl.startsWith(SHARE_URL))) {
    const { giturl } = getConfigFromTabUrl(tabUrl);
    if (giturl) {
      const { owner, repo } = getGitHubSettings(giturl);
      const configExists = !!configs.find((c) => c.owner === owner && c.repo === repo);
      const enabled = !configExists;
      const checked = configExists;
      // add context menu item for adding project config
      browser.contextMenus.create({
        id: 'addProject',
        title: i18n('config_project_add'),
        contexts: [
          'page_action',
        ],
        type: 'checkbox',
        enabled,
        checked,
      });
    }
  }
}

/**
 * Checks a tab and enables/disables the extension.
 * @param {number} id The ID of the tab
 */
function checkTab(id) {
  getState(({ configs, proxyUrl }) => {
    browser.tabs
      .get(id)
      .then(async (tab = {}) => {
        if (!tab.url) return;
        checkContextMenu(tab.url, configs);
        const matches = getConfigMatches(configs, tab.url, proxyUrl);
        log.debug('checking', id, tab.url, matches);
        const allowed = matches.length > 0;
        if (allowed) {
          try {
            // enable extension for this tab
            browser.pageAction.show(id);
            browser.tabs.executeScript(id, {
              file: './content.js',
            });
          } catch (e) {
            log.error('error enabling extension', id, e);
          }
        } else {
          try {
            // disable extension for this tab
            browser.pageAction.hide(id);
            // check if active tab has share URL and ask to add config
          } catch (e) {
            log.error('error disabling extension', id, e);
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
  // actions for context menu items
  const contextMenuActions = {
    addProject: async (tabUrl) => {
      const cfg = getConfigFromTabUrl(tabUrl);
      if (cfg.giturl) {
        await addConfig(cfg, (added) => {
          if (added && tabUrl !== url('options.html')) {
            // redirect to options page
            window.open(url('options.html'));
          }
        });
      }
    },
  };

  // add listener for clicks on context menu item
  browser.contextMenus.onClicked.addListener(async ({ menuItemId }, tab) => {
    if (!tab.url) return;
    contextMenuActions[menuItemId](tab.url);
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

  // retrieve proxy url from local development
  browser.webRequest.onHeadersReceived.addListener(
    (details) => {
      browser.tabs
        .query({
          currentWindow: true,
          active: true,
        })
        .then(async (tabs) => {
          if (Array.isArray(tabs) && tabs.length > 0) {
            const rUrl = new URL(details.url);
            const tabUrl = new URL(tabs[0].url);
            if (tabUrl.pathname === rUrl.pathname) {
              setProxyUrl('', async () => {
                const { responseHeaders } = details;
                // try "via" response header
                const via = responseHeaders.find((h) => h.name.toLowerCase() === 'via')?.value;
                const proxyHost = via?.split(' ')[1];
                if (proxyHost && proxyHost !== 'varnish') {
                  const proxyUrl = new URL(tabs[0].url);
                  proxyUrl.hostname = proxyHost;
                  proxyUrl.protocol = 'https';
                  proxyUrl.port = '';
                  await setProxyUrl(
                    proxyUrl.toString(),
                    (purl) => log.info('new proxy url', purl),
                  );
                }
              });
            }
          }
        })
        .catch((e) => log.debug('failed to retrieve proxy url', e));
    },
    { urls: [`${DEV_URL}/*`] },
    ['responseHeaders'],
  );
})();

// announce sidekick display state
getState(({ display }) => {
  log.info(`sidekick now ${display ? 'shown' : 'hidden'}`);
});
