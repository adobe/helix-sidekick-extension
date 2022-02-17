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
  SHARE_PREFIX,
  DEV_URL,
  MANIFEST,
  log,
  i18n,
  checkLastError,
  getState,
  getConfigMatches,
  toggleDisplay,
  addConfig,
  getShareSettings,
  getGitHubSettings,
  setProxyUrl,
  setConfig,
  getConfig,
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
  }
  return cfg;
}

/**
 * Enables or disables context menu items for a tab.
 * @param {string} tabUrl The URL of the tab
 * @param {Object[]} configs The existing configurations
 */
async function checkContextMenu(tabUrl, configs) {
  if (chrome.contextMenus) {
    // clear context menu
    chrome.contextMenus.removeAll(() => {
      // check if add project is applicable
      if (configs && (tabUrl.startsWith(GH_URL) || new URL(tabUrl).pathname === SHARE_PREFIX)) {
        const { giturl } = getConfigFromTabUrl(tabUrl);
        if (giturl) {
          const { owner, repo } = getGitHubSettings(giturl);
          const configExists = !!configs.find((c) => c.owner === owner && c.repo === repo);
          const enabled = !configExists;
          const checked = configExists;
          // add context menu item for adding project config
          chrome.contextMenus.create({
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
    });
  }
}

/**
 * Checks a tab and enables/disables the extension.
 * @param {number} id The ID of the tab
 */
function checkTab(id) {
  getState(({ configs, proxyUrl }) => {
    chrome.tabs.get(id, async (tab = {}) => {
      checkLastError();
      if (!tab.url) return;
      checkContextMenu(tab.url, configs);
      if (new URL(tab.url).pathname === SHARE_PREFIX) {
        log.debug('share url detected, inject install helper');
        try {
          // instrument generator page
          chrome.tabs.executeScript(id, {
            file: './installhelper.js',
          });
        } catch (e) {
          log.error('error instrumenting generator page', id, e);
        }
      }
      const matches = getConfigMatches(configs, tab.url, proxyUrl);
      log.debug('checking', id, tab.url, matches);
      const allowed = matches.length > 0;
      if (allowed) {
        try {
          // enable extension for this tab
          if (chrome.pageAction.show) {
            chrome.pageAction.show(id);
          }
          // execute content script
          chrome.tabs.executeScript(id, {
            file: './content.js',
          });
        } catch (e) {
          log.error('error enabling extension', id, e);
        }
      } else {
        try {
          // disable extension for this tab
          if (chrome.pageAction.hide) {
            chrome.pageAction.hide(id);
          }
          // check if active tab has share URL and ask to add config
        } catch (e) {
          log.error('error disabling extension', id, e);
        }
      }
    });
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
 * Updates the help content according to the browser language
 * while respecting previous user acknowledgements.
 */
async function updateHelpContent() {
  const hlxSidekickHelpContent = await getConfig('sync', 'hlxSidekickHelpContent') || [];
  log.debug('existing help content', hlxSidekickHelpContent);
  const lang = navigator.language.startsWith('en') ? '' : `/${navigator.language.split('-')[0]}`;
  const resp = await fetch(`https://www.hlx.live${lang}/tools/sidekick/help.json`);
  if (resp.ok) {
    try {
      const [major, minor, patch] = MANIFEST.version.split('.');
      const json = await resp.json();
      const incomingTopics = (json['help-topics'] && json['help-topics'].data) || [];
      const incomingSteps = (json['help-steps'] && json['help-steps'].data) || [];
      const updatedHelpContent = incomingTopics
        .filter((incoming) => {
          // filter topics by target version
          const { targetVersion } = incoming;
          if (targetVersion) {
            const [targetMajor, targetMinor, targetPatch] = targetVersion.split('.');
            if ((targetMajor && +major < +targetMajor)
              || (targetMinor && +minor < +targetMinor)
              || (targetPatch && +patch < +targetPatch)) {
              return false;
            }
          }
          return true;
        })
        .map((incoming) => {
          const index = hlxSidekickHelpContent.findIndex((existing) => existing.id === incoming.id);
          return {
            ...(index >= 0 ? hlxSidekickHelpContent[index] : {}),
            ...incoming,
            steps: incoming.steps
              .split(',')
              .map((id) => id.trim())
              .map((id) => incomingSteps.find((step) => step.id === id)),
          };
        });
      log.info('updated help content', updatedHelpContent);
      await setConfig('sync', {
        hlxSidekickHelpContent: updatedHelpContent,
      });
    } catch (e) {
      log.error('failed to update help content', e);
    }
  }
}

/**
 * Adds the listeners for the extension.
 */
(() => {
  chrome.runtime.onInstalled.addListener(async ({ reason }) => {
    log.info(`sidekick extension installed (${reason})`);
    await updateHelpContent();
  });

  // actions for context menu items
  const contextMenuActions = {
    addProject: async ({ id, url }) => {
      const cfg = getConfigFromTabUrl(url);
      if (cfg.giturl) {
        await addConfig(cfg, () => {
          chrome.tabs.reload(id, { bypassCache: true });
        });
      }
    },
  };

  if (chrome.contextMenus) {
    // add listener for clicks on context menu item
    chrome.contextMenus.onClicked.addListener(async ({ menuItemId }, tab) => {
      if (!tab.url) return;
      contextMenuActions[menuItemId](tab);
    });
  }

  // toggle the sidekick when the browser action is clicked
  chrome.pageAction.onClicked.addListener(({ id }) => {
    toggle(id);
  });

  // listen for url updates in any tab and inject sidekick if must be shown
  chrome.tabs.onUpdated.addListener((id, info) => {
    // wait until the tab is done loading
    if (info.status === 'complete') {
      checkTab(id);
    }
  });

  // re-check tabs when activated
  chrome.tabs.onActivated.addListener(({ tabId: id }) => {
    checkTab(id);
  });

  // detect and propagate display changes
  chrome.storage.onChanged.addListener(({ hlxSidekickDisplay = null }, area) => {
    if (area === 'local' && hlxSidekickDisplay) {
      const display = hlxSidekickDisplay.newValue;
      log.info(`sidekick now ${display ? 'shown' : 'hidden'}`);
      chrome.tabs.query({
        currentWindow: true,
      }, (tabs) => {
        checkLastError();
        tabs.forEach(({ id, _, active = false }) => {
          if (!active) {
            // skip current tab
            checkTab(id);
          }
        });
      });
    }
  });

  if (chrome.webRequest) {
    // retrieve proxy url from local development
    chrome.webRequest.onHeadersReceived.addListener(
      (details) => {
        chrome.tabs.query({
          currentWindow: true,
          active: true,
        }, async (tabs) => {
          checkLastError();
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
        });
      },
      { urls: [`${DEV_URL}/*`] },
      ['responseHeaders'],
    );
  }
})();

// announce sidekick display state
getState(({ display }) => {
  log.info(`sidekick now ${display ? 'shown' : 'hidden'}`);
});
