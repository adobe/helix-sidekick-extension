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
  if (!cfg.giturl) {
    if (tabUrl.startsWith(GH_URL)) {
      cfg.giturl = tabUrl;
    } else {
      try {
        const url = new URL(tabUrl);
        const res = /(.*)--(.*)--(.*)\.hlx\.[page|live]/.exec(url.hostname);
        if (res && res.length === 4) {
          cfg.giturl = `${GH_URL}${res[3]}/${res[2]}/tree/${res[1]}`;
        }
      } catch (e) {
        // ignore invalid url
      }
    }
  }
  return cfg;
}

/**
 * Retrieves the proxy URL from a local dev tab.
 * @param {chrome.tabs.Tab} tab The tab
 * @returns {Promise} The proxy URL
 */
async function getProxyUrl({ id, url: tabUrl }) {
  if (tabUrl.startsWith(DEV_URL)) {
    return new Promise((resolve) => {
      // inject proxy url retriever
      chrome.scripting.executeScript({
        target: { tabId: id },
        func: () => {
          let proxyUrl = null;
          const meta = document.head.querySelector('meta[property="hlx:proxyUrl"]');
          if (meta && meta.content) {
            proxyUrl = meta.content;
          }
          chrome.runtime.sendMessage({ proxyUrl });
        },
      });
      // listen for proxy url from tab
      const listener = ({ proxyUrl: proxyUrlFromTab }, { tab }) => {
        // check if message is from the right tab
        if (tab && tab.url === tabUrl && tab.id === id) {
          chrome.runtime.onMessage.removeListener(listener);
          resolve(proxyUrlFromTab);
        }
      };
      chrome.runtime.onMessage.addListener(listener);
    });
  } else {
    return tabUrl;
  }
}

/**
 * Enables or disables context menu items for a tab.
 * @param {string} tabUrl The URL of the tab
 * @param {Object[]} configs The existing configurations
 */
async function checkContextMenu(tabUrl, configs = []) {
  if (chrome.contextMenus) {
    // clear context menu
    chrome.contextMenus.removeAll(() => {
      // check if add project is applicable
      if (configs && configs.length > 0 && !checkLastError()) {
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
              'action',
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
  getState(({ configs }) => {
    chrome.tabs.get(id, async (tab = {}) => {
      checkLastError();
      if (!tab.url) return;
      let checkUrl = tab.url;
      // check if active tab has a local dev URL
      if (checkUrl.startsWith(DEV_URL)) {
        // retrieve proxy url
        log.debug('local dev url detected, retrieve proxy url');
        checkUrl = await getProxyUrl(tab);
        log.debug('proxy url:', checkUrl);
      }
      checkContextMenu(checkUrl, configs);
      // check if active tab has share URL and ask to add config
      if (new URL(checkUrl).pathname === SHARE_PREFIX) {
        log.debug('share url detected, inject install helper');
        try {
          // instrument generator page
          chrome.scripting.executeScript({
            target: { tabId: id },
            files: ['./installhelper.js'],
          });
        } catch (e) {
          log.error('error instrumenting generator page', id, e);
        }
      }
      const matches = getConfigMatches(configs, checkUrl);
      log.debug('checking', id, checkUrl, matches);
      const allowed = matches.length > 0;
      if (allowed) {
        try {
          // execute content script
          chrome.scripting.executeScript({
            target: { tabId: id },
            files: ['./content.js'],
          }, () => {
            // send config matches to tab
            chrome.tabs.sendMessage(id, {
              configMatches: matches,
            });
          });
        } catch (e) {
          log.error('error enabling extension', id, e);
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

  // register message listener
  chrome.runtime.onMessageExternal.addListener((request, sender, sendResponse) => {
    log.info('sidekick got external message', request);
    log.info('sender', sender);
    // @todo:
    // const { owner, repo, accessToken } = request;
    // await updateConfig(owner, repo, {
    //   accessToken,
    // });

    // sendResponse('close'); // this will close the login window
    // sendResponse('redirect'); // this will cause the redirect
    sendResponse('ok'); // this will do nothing
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
  chrome.action.onClicked.addListener(({ id }) => {
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
    }
  });
})();

// announce sidekick display state
getState(({ display }) => {
  log.info(`sidekick now ${display ? 'shown' : 'hidden'}`);
});
