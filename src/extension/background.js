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

import {
  GH_URL,
  SHARE_PREFIX,
  DEV_URL,
  MANIFEST,
  log,
  i18n,
  checkLastError,
  getState,
  getProjectMatches,
  toggleDisplay,
  getProject,
  addProject,
  setProject,
  deleteProject,
  getShareSettings,
  getGitHubSettings,
  setConfig,
  getConfig,
  storeAuthToken,
  updateProjectConfigs,
  setAdminAuthHeaderRule,
} from './utils.js';

/**
 * Tries to retrieve a project config from a tab.
 * @param string} tabUrl The URL of the tab
 * @returns {object} The config object
 */
function getConfigFromTabUrl(tabUrl) {
  if (!tabUrl) {
    return {};
  }
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
        // check if message contains proxy url and is sent from right tab
        if (proxyUrlFromTab && tab && tab.url === tabUrl && tab.id === id) {
          chrome.runtime.onMessage.removeListener(listener);
          resolve(proxyUrlFromTab);
        } else {
          // fall back to tab url
          resolve(tabUrl);
        }
      };
      chrome.runtime.onMessage.addListener(listener);
    });
  } else {
    return tabUrl;
  }
}

/**
 * Tries to guess if the current tab is a Franklin site.
 * @param {Object} The tab
 * @returns {Promise<Boolean>} True if the provided tab is a Franklin site
 */
async function guessIfFranklinSite({ id }) {
  return new Promise((resolve) => {
    chrome.scripting.executeScript({
      target: { tabId: id },
      func: () => {
        const isFranklinSite = document.head.querySelectorAll('script[src*="scripts.js"]').length > 0
          && document.head.querySelectorAll('link[href*="styles.css"]').length > 0
          && document.body.querySelector('main > div') !== null;
        chrome.runtime.sendMessage({ isFranklinSite });
      },
    });
    // listen for response message from tab
    const listener = ({ isFranklinSite }) => {
      if (typeof isFranklinSite === 'boolean') {
        chrome.runtime.onMessage.removeListener(listener);
        resolve(isFranklinSite);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
  });
}

/**
 * Enables or disables context menu items for a tab.
 * @param {Object} tab The tab
 * @param {Object[]} configs The existing configurations
 */
async function checkContextMenu({ url: tabUrl, id }, configs = []) {
  if (chrome.contextMenus) {
    // clear context menu
    chrome.contextMenus.removeAll(() => {
      // check if add project is applicable
      if (configs && !checkLastError()) {
        const { giturl } = getConfigFromTabUrl(tabUrl);
        if (giturl) {
          const { owner, repo } = getGitHubSettings(giturl);
          const config = configs.find((c) => c.owner === owner && c.repo === repo);
          // add context menu item for adding/removing project config
          chrome.contextMenus.create({
            id: 'addRemoveProject',
            title: config ? i18n('config_project_remove') : i18n('config_project_add'),
            contexts: [
              'action',
            ],
          });
          if (config) {
            // add context menu item for enabling/disabling project config
            const { disabled } = config;
            chrome.contextMenus.create({
              id: 'enableDisableProject',
              title: disabled ? i18n('config_project_enable') : i18n('config_project_disable'),
              contexts: [
                'action',
              ],
            });
            // open preview
            chrome.contextMenus.create({
              id: 'openPreview',
              title: i18n('open_preview'),
              contexts: [
                'action',
              ],
            });
          }
        }
      }

      // add the open view doc context menu item only if the current tab is a Franklin site (guess)
      guessIfFranklinSite({ id }).then((isFranklinSite) => {
        if (isFranklinSite) {
          chrome.contextMenus.create({
            id: 'openViewDocSource',
            title: i18n('open_view_doc_source'),
            contexts: [
              'action',
            ],
          });
        }
      });
    });
  }
}

/**
 * Checks a tab and enables/disables the extension.
 * @param {number} id The ID of the tab
 */
function checkTab(id) {
  getState(({ projects = [] }) => {
    chrome.tabs.get(id, async (tab = {}) => {
      checkLastError();
      if (!tab.url) return;
      let checkUrl = tab.url;
      // check if active tab has a local dev URL
      if (checkUrl.startsWith(DEV_URL)) {
        // retrieve proxy url
        log.debug('local dev url detected, retrieve proxy url');
        checkUrl = await getProxyUrl(tab);
      }
      if (tab.active) {
        checkContextMenu(tab, projects);
      }
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
      const matches = await getProjectMatches(projects, checkUrl);
      log.debug('checking', id, checkUrl, matches);
      try {
        // execute content script
        chrome.scripting.executeScript({
          target: { tabId: id },
          files: ['./content.js'],
        }, () => {
          // send config matches to tab
          chrome.tabs.sendMessage(id, {
            projectMatches: matches,
          });
        });
      } catch (e) {
        log.error('error enabling extension', id, e);
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
 * Open the view document source popup
 * @param {String} id The tab id
 */
function openViewDocSource(id) {
  chrome.windows.create({
    url: chrome.runtime.getURL(`/view-doc-source/index.html?tabId=${id}`),
    type: 'popup',
    width: 740,
  });
}

/**
 * Checks if the view document source popup needs to be openeded, and opens it if necessary.
 * @param {*} id The tab ID
 */
function checkViewDocSource(id) {
  chrome.tabs.get(id, (tab = {}) => {
    if (!tab.url || !tab.active) return;
    try {
      const u = new URL(tab.url);
      const vds = u.searchParams.get('view-doc-source');
      if (vds && vds === 'true') {
        openViewDocSource(id);
      }
    } catch (e) {
      log.warn(`Error checking view document source for url: ${tab.url}`, e);
    }
  });
}

/**
 * Adds the listeners for the extension.
 */
(() => {
  chrome.runtime.onInstalled.addListener(async ({ reason }) => {
    log.info(`sidekick extension installed (${reason})`);
    await updateHelpContent();
    await updateProjectConfigs();
  });

  // register message listener
  chrome.runtime.onMessageExternal.addListener(async (message, sender, sendResponse) => {
    log.info('sidekick got external message', message);
    const { owner, repo, authToken } = message;
    await storeAuthToken(owner, repo, authToken);
    // inform caller to close the window
    await sendResponse('close');
  });

  // actions for context menu items and install helper
  const actions = {
    addRemoveProject: async ({ id, url }) => {
      const cfg = getConfigFromTabUrl(url);
      if (cfg.giturl) {
        getState(async ({ projects = [] }) => {
          const { owner, repo } = getGitHubSettings(cfg.giturl);
          const project = projects.find((p) => p.owner === owner && p.repo === repo);
          if (!project) {
            await addProject(cfg);
          } else {
            await deleteProject(`${owner}/${repo}`);
          }
          chrome.tabs.reload(id, { bypassCache: true });
        });
      }
    },
    enableDisableProject: async ({ id, url }) => {
      const cfg = getConfigFromTabUrl(url);
      if (cfg.giturl) {
        const project = await getProject(getGitHubSettings(cfg.giturl));
        if (project) {
          project.disabled = !project.disabled;
          await setProject(project);
          chrome.tabs.reload(id, { bypassCache: true });
        }
      }
    },
    openViewDocSource: async ({ id }) => openViewDocSource(id),
    openPreview: ({ url }) => {
      const { owner, repo, ref = 'main' } = getGitHubSettings(url);
      if (owner && repo) {
        chrome.tabs.create({
          url: `https://${ref}--${repo}--${owner}.hlx.page/`,
        });
      }
    },
  };

  if (chrome.contextMenus) {
    // add listener for clicks on context menu item
    chrome.contextMenus.onClicked.addListener(async ({ menuItemId }, tab) => {
      if (!tab.url) return;
      actions[menuItemId](tab);
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
      checkViewDocSource(id, true);
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

  // listen for add/remove project calls from the install helper
  chrome.runtime.onMessage.addListener(({ action: actionFromTab }, { tab }) => {
    // check if message contains action and is sent from right tab
    if (tab && tab.url && new URL(tab.url).pathname.startsWith(SHARE_PREFIX)
      && actionFromTab && typeof actions[actionFromTab] === 'function') {
      actions[actionFromTab](tab);
    }
  });

  // for each project, listen for admin api requests and add auth to headers where needed
  setAdminAuthHeaderRule();
  // for local debugging, add "declarativeNetRequestFeedback" to permissions in manifest.json
  // and uncomment the following lines:
  // chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(({ request, rule }) => {
  //   console.log('rule matched', request.method, request.url, rule.ruleId);
  // });
})();

// announce sidekick display state
getState(({ display }) => {
  log.info(`sidekick now ${display ? 'shown' : 'hidden'}`);
});
