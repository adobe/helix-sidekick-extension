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
  populateUrlCache,
  queryUrlCache,
  setDisplay,
  isValidShareURL,
  storeAuthToken,
  updateAdminAuthHeaderRules,
  updateProjectAuthorizationHeaderRules,
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
  'ko',
  'pt_BR',
  'zh_CN',
  'zh_TW',
];

/**
 * The IDs of extensions allowed to communicate with the sidekick.
 * These must be defined in the manifest file.
 * @private
 * @type {string[]}
 * @see https://developer.chrome.com/docs/extensions/mv3/manifest/externally_connectable/
 */
const ALLOWED_EXTENSIONS_IDS = MANIFEST.externally_connectable?.ids || [];

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
    return {
      ...share,
      ...getGitHubSettings(share.giturl),
      giturl: undefined,
    };
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
        const urlCache = await queryUrlCache(tabUrl);
        const { org, site } = urlCache.length === 1
          ? urlCache[0]
          : (urlCache.find((r) => r.originalSite) || {});
        if (org && site) {
          return {
            owner: org,
            repo: site,
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
        const isFranklinSite = document.body.querySelector(':scope > main > div') !== null;
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
 * @param {chrome.tabs.Tab} tab The tab
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
      await populateUrlCache(tab, projects);
      if (tab.active) {
        await checkContextMenu(tab, projects);
      }
      if (isValidShareURL(checkUrl)) {
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
 * Retrieves the help language based on the language preferred by the user.
 * The default language is <code>en</code>.
 * @private
 * @return {string} The language
 */
function getHelpLanguage() {
  const uLang = chrome.i18n.getUILanguage();
  const lang = LANGS.find((l) => uLang.replace('-', '_') === l
    || l.startsWith(uLang.split(/[-_]/)[0])) || LANGS[0];
  return lang.replace('_', '-').toLowerCase();
}

/**
 * Updates the help content according to the browser language
 * while respecting previous user acknowledgements.
 */
async function updateHelpContent() {
  // don't fetch new help content for at least 4 hours
  const helpContentFetched = await getConfig('local', 'hlxSidekickHelpContentFetched');
  if ((helpContentFetched || 0) > Date.now() - 14400000) {
    return;
  }
  const helpContent = await getConfig('sync', 'hlxSidekickHelpContent') || [];
  log.debug('existing help content', helpContent);
  const lang = getHelpLanguage();
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
          const index = helpContent.findIndex((existing) => existing.id === incoming.id);
          return {
            ...(index >= 0 ? helpContent[index] : {}),
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
      // remember when help content was last fetched
      await setConfig('local', {
        hlxSidekickHelpContentFetched: Date.now(),
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
 * Actions for external use via messaging API
 * @type {Object}
 */
const externalActions = {
  // updates a project's auth token (admin only)
  updateAuthToken: async ({
    authToken, exp, owner, repo,
  }, { url }) => {
    let resp = '';
    try {
      if (!url || new URL(url).origin !== 'https://admin.hlx.page') {
        resp = 'unauthorized sender url';
      } else if (authToken !== undefined && owner && repo) {
        await storeAuthToken(owner, authToken, exp);
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
            // only load sidekick if not already being loaded for this specific url
            const matches = await queryUrlCache(url);
            if (matches.length === 0) {
              await populateUrlCache(tab, { owner, repo });
              await checkTab(tab.id);
            }
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
  // reveals presence to new sidekick
  ping: (_, { id }) => ALLOWED_EXTENSIONS_IDS.includes(id),
  // sends sidekick projects to new sidekick
  getProjects: async (_, { id }) => {
    if (ALLOWED_EXTENSIONS_IDS.includes(id)) {
      // message coming from new extension
      return new Promise((resolve) => {
        getState(({ projects }) => {
          resolve(projects.map((project) => {
            delete project.authToken;
            return project;
          }));
        });
      });
    }
    return null;
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
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: async (menuItemIdVal) => {
          try {
            const mod = await import(chrome.runtime.getURL('rum.js'));
            const { default: sampleRUM } = mod;

            // Ensure window.hlx and window.hlx.sidekick exists
            window.hlx = window.hlx || {};
            window.hlx.sidekick = window.hlx.sidekick || { location: window.location };

            const checkpoint = `sidekick:context-menu:${menuItemIdVal}`;
            sampleRUM(checkpoint, { source: window.location.href });
          } catch (e) {
            // eslint-disable-next-line no-console
            console.log('Unable to collect RUM data', e);
          }
        },
        args: [menuItemId],
      });
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
    if (tab && tab.url && actionFromTab && typeof internalActions[actionFromTab] === 'function') {
      internalActions[actionFromTab](tab);
    }
  });

  // listen for delete auth token calls from the content window
  chrome.runtime.onMessage.addListener(async ({ deleteAuthToken }, { tab }) => {
    // check if message contains project config and is sent from tab
    if (tab && tab.id && typeof deleteAuthToken === 'object') {
      const { owner } = deleteAuthToken;
      await storeAuthToken(owner, '');
    }
  });

  // for local debugging of header modification rules:
  // 1. add "declarativeNetRequestFeedback" to permissions in manifest.json
  // 2. uncomment the following 3 lines:
  // chrome.declarativeNetRequest.onRuleMatchedDebug.addListener(({ request, rule }) => {
  //   console.log('rule matched', request.method, request.url, rule.ruleId);
  // });

  await updateHelpContent();
  await updateAdminAuthHeaderRules();
  await updateProjectAuthorizationHeaderRules();
  log.info('sidekick extension initialized');
})();

// announce sidekick display state
getState(({ display }) => {
  log.info(`sidekick now ${display ? 'shown' : 'hidden'}`);
});
