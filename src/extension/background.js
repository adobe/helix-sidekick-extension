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
  updateProjectConfigs,
  populateUrlCache,
  queryUrlCache,
  setDisplay,
} from './utils.js';

/**
 * Supported sidekick help languages.
 * @private
 * @type {string[]}
 */
const LANGS = [
  'en', // default language, do not reorder
  'de',
  'es',
  'fr',
  'it',
  'ja',
  'ko-kr',
  'pt-br',
  'zh-cn',
  'zh-tw',
];

/**
 * Tries to retrieve a project config from a tab.
 * @param string} tabUrl The URL of the tab
 * @returns {object} The config object
 */
async function getConfigFromTabUrl(tabUrl) {
  if (!tabUrl) {
    return {};
  }
  const share = getShareSettings(tabUrl);
  if (share.giturl) {
    // share url
    return getGitHubSettings(share.giturl);
  } else if (tabUrl.startsWith(GH_URL)) {
    // github url
    return getGitHubSettings(tabUrl);
  } else {
    try {
      // check if hlx.page, hlx.live, aem.page or aem.live url
      const url = new URL(tabUrl);
      const res = /(.*)--(.*)--(.*)\.(aem|hlx)\.(page|live)/.exec(url.hostname);
      const [, urlRef, urlRepo, urlOwner] = res || [];
      if (urlOwner && urlRepo && urlRef) {
        return {
          owner: urlOwner,
          repo: urlRepo,
          ref: urlRef,
        };
      } else {
        // check if url is known in url cache
        const { owner, repo } = (await queryUrlCache(tabUrl))
          .find((r) => r.originalRepository) || {};
        if (owner && repo) {
          return {
            owner,
            repo,
            ref: 'main',
          };
        }
      }
    } catch (e) {
      // ignore invalid url
    }
  }
  return {};
}

/**
 * Retrieves the proxy URL from a local dev tab.
 * @param {chrome.tabs.Tab} tab The tab
 * @returns {Promise} The proxy URL
 */
async function getProxyUrl({ id, url: tabUrl }) {
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
async function checkContextMenu({ url: tabUrl, id, active }, configs = []) {
  if (!active) return; // ignore inactive tabs to avoid collisions
  if (chrome.contextMenus) {
    // clear context menu
    chrome.contextMenus.removeAll(async () => {
      // check if add project is applicable
      if (configs) {
        const { owner, repo } = await getConfigFromTabUrl(tabUrl);
        if (owner && repo) {
          const config = configs.find((c) => c.owner === owner && c.repo === repo);
          // add context menu item for adding/removing project config
          log.debug(`checkContextMenu: addRemoveProject for ${tabUrl}`);
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
              visible: tabUrl.startsWith(GH_URL),
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
 * Injects the content script into a tab
 * @param {number} tabId The ID of the tab
 * @param {Object[]} matches The project matches found
 */
async function injectContentScript(tabId, matches) {
  try {
    // execute content script
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['./content.js'],
    });
    // send config matches to tab
    await chrome.tabs.sendMessage(tabId, {
      projectMatches: matches,
    });
  } catch (e) {
    log.error('error injecting content script', tabId, e);
  }
}

/**
 * Removes the sidekick from the tab.
 * @param {number} tabId The ID of the tab
 */
async function removeSidekick(tabId) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: () => {
        if (window.hlx && window.hlx.sidekick) {
          window.hlx.sidekick.replaceWith(''); // remove() doesn't work for custom element
          delete window.hlx.sidekick;
        }
      },
    });
  } catch (e) {
    log.error('error destroying sidekick', tabId, e);
  }
}

/**
 * Checks a tab and enables/disables the extension.
 * @param {number} id The ID of the tab
 */
function checkTab(id) {
  getState(({ projects = [] }) => {
    chrome.tabs.get(id, async (tab = {}) => {
      if (!tab.url) return;
      let checkUrl = tab.url;
      // check if active tab has a local dev URL
      const devUrls = [
        DEV_URL,
        ...projects
          .filter((p) => !!p.devOrigin)
          .map((p) => p.devOrigin),
      ];
      if (devUrls.find((devUrl) => checkUrl.startsWith(devUrl))) {
        // retrieve proxy url
        log.debug('local dev url detected, retrieve proxy url');
        checkUrl = await getProxyUrl(tab);
      }
      await populateUrlCache(checkUrl);
      if (tab.active) {
        await checkContextMenu(tab, projects);
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
      if (matches.length > 0) {
        injectContentScript(id, matches);
      } else {
        removeSidekick(id);
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
 * Retrieves the sidekick language preferred by the user.
 * The default language is <code>en</code>.
 * @private
 * @return {string} The language
 */
function getLanguage() {
  return navigator.languages
    .map((prefLang) => LANGS.find((lang) => prefLang.toLowerCase().startsWith(lang)))
    .filter((lang) => !!lang)[0] || LANGS[0];
}

/**
 * Updates the help content according to the browser language
 * while respecting previous user acknowledgements.
 */
async function updateHelpContent() {
  const hlxSidekickHelpContent = await getConfig('sync', 'hlxSidekickHelpContent') || [];
  log.debug('existing help content', hlxSidekickHelpContent);
  const lang = getLanguage();
  const resp = await fetch(`https://www.hlx.live/tools/sidekick/${lang}/help.json`);
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
 * Appends sidekick name and version to the user-agent header for all requests to
 * admin.hlx.page and rum.hlx.page.
 */
async function setUserAgentHeader() {
  const manifest = chrome.runtime.getManifest();
  const ua = `${navigator.userAgent} Sidekick/${manifest.version}`;
  try {
    // remove existing rule first
    await chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: [1] });
    await chrome.declarativeNetRequest.updateDynamicRules({
      addRules: [
        {
          id: 1,
          priority: 1,
          action: {
            type: 'modifyHeaders',
            requestHeaders: [
              {
                operation: 'set',
                header: 'user-agent',
                value: ua,
              },
            ],
          },
          condition: {
            requestDomains: ['admin.hlx.page', 'rum.hlx.page'],
          },
        },
      ],
    });
  } catch (e) {
    log.error(`setUserAgentHeader: ${e.message}`);
  }
}

/**
 * Sets the x-auth-token header for all requests to admin.hlx.page if project config
 * has an auth token.
 */
async function updateAdminAuthHeaderRules() {
  try {
    // remove all rules first
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: (await chrome.declarativeNetRequest.getSessionRules())
        .map((rule) => rule.id),
    });
    // find projects with auth tokens and add rules for each
    let id = 2;
    const projects = await getConfig('sync', 'hlxSidekickProjects') || [];
    const addRules = [];
    const projectConfigs = await Promise.all(projects.map((handle) => getConfig('sync', handle)));
    projectConfigs.forEach(({ owner, repo, authToken }) => {
      if (authToken) {
        addRules.push({
          id,
          priority: 1,
          action: {
            type: 'modifyHeaders',
            requestHeaders: [{
              operation: 'set',
              header: 'x-auth-token',
              value: authToken,
            }],
          },
          condition: {
            regexFilter: `^https://admin.hlx.page/[a-z]+/${owner}/${repo}/.*`,
            requestDomains: ['admin.hlx.page'],
            requestMethods: ['get', 'post', 'delete'],
            resourceTypes: ['xmlhttprequest'],
          },
        });
        id += 1;
        log.debug('added admin auth header rule for ', owner, repo);
      }
    });
    if (addRules.length > 0) {
      await chrome.declarativeNetRequest.updateSessionRules({
        addRules,
      });
      log.debug(`setAdminAuthHeaderRule: ${addRules.length} rule(s) set`);
    }
  } catch (e) {
    log.error(`updateAdminAuthHeaderRules: ${e.message}`);
  }
}

async function storeAuthToken(owner, repo, token) {
  // find config tab with owner/repo
  const project = await getProject({ owner, repo });
  if (project) {
    if (token) {
      project.authToken = token;
    } else {
      delete project.authToken;
    }
    await setProject(project);
    log.debug(`updated auth token for ${owner}--${repo}`);
  } else {
    log.debug(`unable to update auth token for ${owner}--${repo}: no such config`);
  }
  // auth token changed, set/update admin auth header
  updateAdminAuthHeaderRules();
}

/**
 * Actions for external use via messaging API
 * @type {Object}
 */
const externalActions = {
  // updates a project's auth token (admin only)
  updateAuthToken: async ({ authToken, owner, repo }, { url }) => {
    let resp = '';
    try {
      if (!url || new URL(url).origin !== 'https://admin.hlx.page') {
        resp = 'unauthorized sender url';
      } else if (authToken !== undefined && owner && repo) {
        await storeAuthToken(owner, repo, authToken);
        resp = 'close';
      }
    } catch (e) {
      resp = 'invalid message';
    }
    return resp;
  },
  // close palette with given id
  closePalette: async ({ id }, { tab }) => {
    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        args: [id],
        func: (paletteId) => {
          const palette = window.hlx && window.hlx.sidekick
            && window.hlx.sidekick.shadowRoot.getElementById(`hlx-sk-palette-${paletteId}`);
          if (palette) {
            palette.classList.add('hlx-sk-hidden');
          }
        },
      });
    } catch (e) {
      log.error('error closing palette', e);
    }
  },
  // loads the sidekick if the project is configured
  loadSidekick: async ({ owner, repo }, { tab, url }) => {
    let resp = false;
    if (owner && repo) {
      resp = await new Promise((resolve) => {
        getState(async ({ projects }) => {
          const match = projects.find((p) => p.owner === owner && p.repo === repo);
          if (match) {
            log.info(`enabling sidekick for project ${owner}/${repo} on ${url}`);
            await setDisplay(true);
            await populateUrlCache(url, { owner, repo });
            await injectContentScript(tab.id, [match]);
            resolve(true);
          } else {
            log.warn(`unknown project ${owner}/${repo}, not enabling sidekick on ${url}`);
            resolve(false);
          }
        });
      });
    }
    return resp;
  },
  // returns the sidekick status for the current tab
  getStatus: async ({ owner, repo }, { tab }) => {
    let resp = null;
    if (owner && repo && tab?.id) {
      resp = await new Promise((resolve) => {
        // inject status retriever
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const fullStatus = window.hlx && window.hlx.sidekick && window.hlx.sidekick.status;
            const status = JSON.parse(JSON.stringify(fullStatus || {}));
            delete status.profile;
            chrome.runtime.sendMessage({ status });
          },
        });
        // listen for status response from tab
        const listener = ({ status }) => {
          chrome.runtime.onMessage.removeListener(listener);
          if (typeof status === 'object') {
            resolve(status);
          }
        };
        chrome.runtime.onMessage.addListener(listener);
      });
    }
    return resp;
  },
};

/**
 * Actions for internal use (context menu, install helper)
 * @type {Object}
 */
const internalActions = {
  addRemoveProject: async ({ id, url }) => {
    getState(async ({ projects = [] }) => {
      const cfg = await getConfigFromTabUrl(url);
      const { owner, repo } = cfg;
      const reload = () => chrome.tabs.reload(id, { bypassCache: true });
      const project = projects.find((p) => p.owner === owner && p.repo === repo);
      if (!project) {
        addProject(cfg, reload);
      } else {
        deleteProject(`${owner}/${repo}`, reload);
      }
    });
  },
  enableDisableProject: async ({ id, url }) => {
    const cfg = await getConfigFromTabUrl(url);
    const project = await getProject(cfg);
    if (project) {
      project.disabled = !project.disabled;
      await setProject(project);
      chrome.tabs.reload(id, { bypassCache: true });
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

/**
 * Adds the listeners for the extension.
 */
(async () => {
  // external messaging API for projects to communicate with sidekick
  chrome.runtime.onMessageExternal.addListener(async (message, sender, sendResponse) => {
    const { action } = message;
    let resp = null;
    if (externalActions[action]) {
      resp = await externalActions[action](message, sender);
    }
    sendResponse(resp);
  });

  // add listener for clicks on context menu item
  if (chrome.contextMenus) {
    chrome.contextMenus.onClicked.addListener(async ({ menuItemId }, tab) => {
      if (!tab.url) return;
      internalActions[menuItemId](tab);
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
      && actionFromTab && typeof internalActions[actionFromTab] === 'function') {
      internalActions[actionFromTab](tab);
    }
  });

  // listen for delete auth token calls from the content window
  chrome.runtime.onMessage.addListener(async ({ deleteAuthToken }, { tab }) => {
    // check if message contains project config and is sent from tab
    if (tab && tab.id && typeof deleteAuthToken === 'object') {
      const { owner, repo } = deleteAuthToken;
      await storeAuthToken(owner, repo, '');
    }
  });

  // for local debugging of header modification rules:
  // 1. add "declarativeNetRequestFeedback" to permissions in manifest.json
  // 2. uncomment the following 3 lines:
  // chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(({ request, rule }) => {
  //   console.log('rule matched', request.method, request.url, rule.ruleId);
  // });

  await updateHelpContent();
  await updateProjectConfigs();
  await setUserAgentHeader();
  await updateAdminAuthHeaderRules();
  log.info('sidekick extension initialized');
})();

// announce sidekick display state
getState(({ display }) => {
  log.info(`sidekick now ${display ? 'shown' : 'hidden'}`);
});
