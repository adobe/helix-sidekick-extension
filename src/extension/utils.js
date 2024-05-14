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

export const MANIFEST = chrome.runtime.getManifest();

export const GH_URL = 'https://github.com/';

export const DEV_URL = 'http://localhost:3000';

const DISCOVERY_CACHE_TTL = 7200000;

class Logger {
  constructor(level = 2) {
    this.__LEVEL = level;
    this.config = {
      debug: { level: 3, color: 'grey' },
      info: { level: 2, color: '' },
      warn: { level: 1, color: 'orange' },
      error: { level: 0, color: 'red' },
    };
    this.createMethods();
  }

  get LEVEL() {
    return this.__LEVEL;
  }

  set LEVEL(level) {
    this.__LEVEL = level;
    this.createMethods();
  }

  createMethods() {
    Object.keys(this.config).forEach((method) => {
      const color = `color: ${this.config[method].color}`;
      const prefix = `%c[${method.toUpperCase()}]`;
      this[method] = this.LEVEL > this.config[method].level
        // eslint-disable-next-line no-console
        ? console[method].bind(console, prefix, color)
        : () => {};
    });
  }
}

export const log = new Logger(2);

// shows a window.alert (noop if headless)
function alert(msg) {
  if (typeof window !== 'undefined' && !/HeadlessChrome/.test(window.navigator.userAgent)) {
    // eslint-disable-next-line no-alert
    return window.alert(msg);
  }
  return null;
}

// shorthand for browser.i18n.getMessage()
export function i18n(msg, subs) {
  return chrome.i18n.getMessage(msg, subs);
}

// shorthand for browser.runtime.getURL()
export function url(path) {
  return chrome.runtime.getURL(path);
}

/**
 * Extracts the settings from a GitHub URL.
 * @param {string} giturl The GitHub URL
 * @returns {Objct} The GitHub settings
 */
export function getGitHubSettings(giturl) {
  if (typeof giturl === 'string' && giturl.startsWith(GH_URL)) {
    const [owner, repository,, ref = 'main'] = new URL(giturl).pathname.toLowerCase()
      .substring(1).split('/');
    if (owner && repository) {
      const repo = repository.endsWith('.git') ? repository.split('.git')[0] : repository;
      return {
        owner,
        repo,
        ref,
      };
    }
  }
  return {};
}

/**
 * Retrieves a configuration from a given storage type.
 * @param {string} type The storage type
 * @param {string} prop The property name
 * @returns {Promise<*>} The configuration
 */
export async function getConfig(type, prop) {
  const cfg = await new Promise((resolve) => {
    chrome.storage[type].get(prop, resolve);
  });
  return cfg?.[prop];
}

/**
 * Changes a configuration in a given storage type.
 * @param {string} type The storage type
 * @param {Object} obj The configuration object with the property/properties to change
 * @returns {Promise<void>}
 */
export async function setConfig(type, obj) {
  const p = new Promise((resolve) => {
    chrome.storage[type].set(obj, () => {
      const error = chrome.runtime.lastError;
      if (error) {
        log.error('setConfig failed', error);
      }
      resolve(!error);
    });
  });
  return p;
}

/**
 * Removes a configuration from a given storage type.
 * @param {string} type The storage type
 * @param {string} prop The property name
 * @returns {Promise<void>}
 */
export async function removeConfig(type, prop) {
  return new Promise((resolve) => {
    chrome.storage[type].remove(prop, resolve);
  });
}

/**
 * Removes all configurations from a given storage type.
 * @param {string} type The storage type
 * @returns {Promise<void>}
 */
export async function clearConfig(type) {
  return new Promise((resolve) => {
    chrome.storage[type].clear(resolve);
  });
}

/**
 * Fetches the edit info from Microsoft SharePoint.
 * @todo also use fstab information to figure out the resource path etc.
 * @param {chrome.tabs.Tab} tab The tab
 * @returns {Promise<Object>} The edit info
 */
async function fetchSharePointEditInfo(tab) {
  return new Promise((resolve) => {
    // inject edit info retriever
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: async (tabUrl) => {
        const encodeSharingUrl = (sharingUrl) => {
          const base64 = btoa(sharingUrl)
            .replace(/=/, '')
            .replace(/\//, '_')
            .replace(/\+/, '-');
          return `u!${base64}`;
        };

        const fetchEditInfo = async (urlFromTab) => {
          // convert `RootFolder` to `id` if present
          const spUrl = new URL(urlFromTab);
          const rootFolder = spUrl.searchParams.get('RootFolder');
          if (rootFolder) {
            spUrl.searchParams.set('id', rootFolder);
            spUrl.searchParams.delete('RootFolder');
          }
          const shareLink = encodeSharingUrl(spUrl.href);
          spUrl.pathname = `/_api/v2.0/shares/${shareLink}/driveItem`;
          spUrl.search = '';
          let resp = await fetch(spUrl, { credentials: 'include' });
          if (!resp.ok) {
            log.warn('unable to resolve edit url: ', resp.status, await resp.text());
            return null;
          }
          const data = await resp.json();

          // get root item
          spUrl.pathname = `/_api/v2.0/drives/${data.parentReference.driveId}`;
          resp = await fetch(spUrl, { credentials: 'include' });
          if (!resp.ok) {
            log.warn('unable to load root url: ', resp.status, await resp.text());
            return null;
          }
          const rootData = await resp.json();

          const info = {
            status: 200,
            name: data.name,
            sourceLocation: `onedrive:/drives/${data.parentReference.driveId}/items/${data.id}`,
            lastModified: data.lastModifiedDateTime,
          };
          if (data.folder) {
            info.url = data.webUrl;
            info.contentType = 'application/folder';
            info.childCount = data.folder.childCount;
          } else {
            const folder = data.parentReference.path.split(':').pop();
            info.url = `${rootData.webUrl}${folder}/${data.name}`;
            info.contentType = data.file.mimeType;
          }
          return info;
        };
        const spEditInfo = await fetchEditInfo(tabUrl);

        chrome.runtime.sendMessage({ spEditInfo });
      },
      args: [tab.url],
    }).catch((e) => {
      log.warn('fetchSharePointEditInfo: failed to inject script', e);
      resolve(null);
    });

    // listen for edit info from tab
    const listener = ({ spEditInfo }, { tab: msgTab }) => {
      // check if message contains edit info and is sent from right tab
      if (typeof spEditInfo !== 'undefined' && tab && tab.id === msgTab.id) {
        chrome.runtime.onMessage.removeListener(listener);
        resolve(spEditInfo);
      }
    };
    chrome.runtime.onMessage.addListener(listener);

    // resolve with null after 1s
    setTimeout(() => {
      log.debug('fetchSharePointEditInfo: timed out');
      chrome.runtime.onMessage.removeListener(listener);
      resolve(null);
    }, 1000);
  });
}

/**
 * Fetches the edit info from Google Drive.
 * @todo implement
 * @param {chrome.tabs.Tab} tab The tab
 * @returns {Promise<Object>} The edit info
 */
async function fetchGoogleDriveEditInfo(tab) {
  return {
    url: tab.url,
  };
}

/**
 * Determines if a URL has a Microsoft SharePoint host.
 * @param {string} tabUrl The tab URL
 * @param {Object[]} projects The project configurations
 * @returns {boolean} {@code true} if SharePoint host, else {@code false}
 */
export function isSharePointHost(tabUrl, projects = []) {
  const { host } = new URL(tabUrl);
  return /^[a-z-]+\.sharepoint\.com$/.test(host)
    || !!projects.find((p) => {
      const mp = p.mountpoints && p.mountpoints[0];
      return !host.endsWith('.google.com') && mp && new URL(mp).host === host;
    });
}

/**
 * Determines if a URL has a Google Drive host.
 * @param {string} tabUrl The tab URL
 * @returns {boolean} {@code true} if Google Drive host, else {@code false}
 */
export function isGoogleDriveHost(tabUrl) {
  const { host } = new URL(tabUrl);
  return /^(docs|drive)\.google\.com$/.test(host);
}

/**
 * Looks up a URL in the URL cache and returns its associated projects.
 * @param {string} tabUrl The tab URL
 * @returns {Object[]} The project results from the cached entry
 */
export async function queryUrlCache(tabUrl) {
  const urlCache = await getConfig('session', 'hlxSidekickUrlCache') || [];
  const entry = urlCache.find((e) => e.url === tabUrl);
  if (entry && (!entry.expiry || entry.expiry > Date.now())) {
    // return results from fresh cache entry
    log.debug(`url cache entry found for ${tabUrl}`, entry);
    return entry.results;
  }
  return [];
}

/**
 * Populates or refreshes the URL cache for the duration of the browser session.
 * Microsoft SharePoint or Google Drive URLs will be looked up in the Franklin Admin Service
 * and expire after 2 hours.
 * @param {chrome.tabs.Tab} tab The tab
 * @param {Object|Object[]} config={} The project config(s) (optional)
 * @param {string} config.owner The owner
 * @param {string} config.repo The repository
 * @returns {Promise<void>}
 */
export async function populateUrlCache(tab, config = {}) {
  const { url: tabUrl } = tab;
  const { owner, repo } = typeof config === 'object' && !Array.isArray(config) ? config : {};
  const createCacheEntry = (cacheUrl, results = [], expiry = false) => {
    const entry = { url: cacheUrl, results };
    if (expiry) {
      entry.expiry = expiry;
    }
    return entry;
  };
  const urlCache = await getConfig('session', 'hlxSidekickUrlCache') || [];
  if (owner && repo) {
    // static entry
    const entry = createCacheEntry(
      tabUrl,
      [{
        owner,
        repo,
        originalRepository: true,
      }],
    );
    const existingIndex = urlCache.findIndex((e) => e.url === tabUrl);
    if (existingIndex >= 0) {
      // update existing entry
      log.debug(`updating sttaic loaded entry for ${tabUrl}`, entry);
      urlCache.splice(existingIndex, 1, entry);
    } else {
      // add new entry
      log.debug(`adding static entry for ${tabUrl}`, entry);
      urlCache.push(entry);
    }
  } else {
    const isSPHost = isSharePointHost(tabUrl, Array.isArray(config) ? config : [config]);
    // lookup (for sharepoint and google drive only)
    if (!isSPHost && !isGoogleDriveHost(tabUrl)) {
      return;
    }
    if ((await queryUrlCache(tabUrl)).length === 0) {
      const info = isSPHost
        ? await fetchSharePointEditInfo(tab)
        : await fetchGoogleDriveEditInfo(tab);
      log.debug('resource edit info', info);

      let results = [];
      // discover project details from edit url
      const discoveryUrl = new URL('https://admin.hlx.page/discover/');
      discoveryUrl.searchParams.append('url', info?.url || tabUrl);
      const resp = await fetch(discoveryUrl);
      if (resp.ok) {
        results = await resp.json();
        if (results.length > 0) {
          // when switching back to a sharepoint tab it can happen that the fetch call to the
          // sharepoint API is no longer authenticated, thus the info returned is null.
          // in this case, we don't want to cache a potentially incomplete discovery response.
          // otherwise cache for 2h.
          const expiry = info ? Date.now() + DISCOVERY_CACHE_TTL : 0;
          const entry = createCacheEntry(tabUrl, results, expiry);
          const existingIndex = urlCache.findIndex((e) => e.url === entry.url);
          if (existingIndex >= 0) {
            // update expired cache entry
            log.debug('updating discovery cache', entry);
            urlCache.splice(existingIndex, 1, entry);
          } else {
            // add cache entry
            log.debug('extending discovery cache', entry);
            urlCache.push(entry);
          }
        }
      }
    } else {
      // existing match in cache
      return;
    }
  }
  await setConfig('session', {
    hlxSidekickUrlCache: urlCache,
  });
  log.debug('url cache', urlCache);
}

/**
 * Checks if a host is a valid project host.
 * @private
 * @param {string} host The base host
 * @param {string} owner The owner (optional)
 * @param {string} host The repo (optional)
 * @returns {boolean} <code>true</code> if project host, else <code>false</code>
 */
export function isValidProjectHost(host, owner, repo) {
  const [third, second, first] = host.split('.');
  const any = '([0-9a-z-]+)';
  return host.endsWith(first)
    && ['page', 'live'].includes(first)
    && ['aem', 'hlx'].includes(second)
    && new RegExp(`--${repo || any}--${owner || any}$`, 'i').test(third);
}

/**
 * Retrieves project details from a host name.
 * @private
 * @param {string} host The host name
 * @returns {string[]} The project details as <code>[ref, repo, owner]</code>
 */
function getProjectDetails(host) {
  if (isValidProjectHost(host)) {
    const details = host.split('.')[0].split('--');
    if (details.length >= 2) {
      return details;
    }
  }
  return [];
}

/**
 * Returns matching configured projects for a given URL.
 * @param {Object[]} configs The project configurations
 * @param {string} tabUrl The tab URL
 * @returns {Object[]} The matches
 */
export async function getProjectMatches(configs, tabUrl) {
  const {
    host: checkHost,
  } = new URL(tabUrl);
  const matches = configs.filter(({
    owner,
    repo,
    host: prodHost,
    previewHost,
    liveHost,
  }) => checkHost === prodHost // production host
    || checkHost === previewHost // custom inner
    || checkHost === liveHost // custom outer
    || isValidProjectHost(checkHost, owner, repo)); // inner or outer

  const urlCache = await queryUrlCache(tabUrl);
  urlCache.forEach((e) => {
    // add non-duplicate matches from url cache
    const filteredByUrlCache = configs.filter(({ owner, repo }) => {
      if (e.owner === owner && e.repo === repo) {
        // avoid duplicates
        if (!matches.find((m) => m.owner === owner && m.repo === repo)) {
          return true;
        }
      }
      return false;
    });
    matches.push(...filteredByUrlCache);
  });
  // check if transient match can be derived from url or url cache
  if (matches.length === 0) {
    const [ref, repo, owner] = getProjectDetails(checkHost);
    if (owner && repo && ref) {
      matches.push({
        owner,
        repo,
        ref,
        transient: true,
      });
    }
  }
  if (matches.length === 0) {
    const { owner, repo } = urlCache.find((r) => r.originalRepository) || {};
    if (owner && repo) {
      matches.push({
        owner,
        repo,
        ref: 'main',
        transient: true,
      });
    }
  }
  log.debug(`${matches.length} project match(es) found for ${tabUrl}`, matches);
  return matches
    // exclude disabled configs
    .filter(({ owner, repo }) => !configs
      .find((cfg) => cfg.owner === owner && cfg.repo === repo && cfg.disabled));
}

/**
 * Extracts the settings from a share URL.
 * @param {string} shareurl The share URL
 * @returns {Object} The share settings
 */
export function getShareSettings(shareurl) {
  try {
    const surl = new URL(shareurl);
    if (['www.aem.live', 'www.hlx.live'].includes(surl.host)
      && surl.pathname === '/tools/sidekick/') {
      const params = new URL(shareurl).searchParams;
      const giturl = params.get('giturl');
      if (giturl) {
        // check gh url
        if (Object.keys(getGitHubSettings(giturl)).length !== 3) {
          throw new Error();
        }
        return {
          giturl,
          project: params.get('project'),
        };
      }
    }
  } catch (e) {
    log.error('error getting sidekick settings from share url', e);
  }
  return {};
}

/**
 * Determines whether a URL is a valid sidekick share URL.
 * @param {string} shareurl The share URL
 * @returns {boolean} {@code true} if valid share URL, else {@code false}
 */
export function isValidShareURL(shareurl) {
  return Object.keys(getShareSettings(shareurl)).length > 1;
}

/**
 * Returns the environment configuration for a given project.
 * @param {Object} config The config
 * @param {string} config.owner The owner
 * @param {string} config.repo The repository
 * @param {string} config.ref=main The ref or branch
 * @returns {Promise<Object>} The project environment
 */
export async function getProjectEnv({
  owner,
  repo,
  ref = 'main',
  authToken,
}) {
  const env = {};
  let res;
  try {
    const options = {
      cache: 'no-store',
      credentials: 'include',
      headers: authToken ? { 'x-auth-token': authToken } : {},
    };
    res = await fetch(`https://admin.hlx.page/sidekick/${owner}/${repo}/${ref}/config.json`, options);
  } catch (e) {
    log.warn(`unable to retrieve project config: ${e}`);
  }
  if (res && res.ok) {
    const {
      previewHost,
      liveHost,
      host,
      project,
      mountpoints,
    } = await res.json();
    if (previewHost) {
      env.previewHost = previewHost;
    }
    if (liveHost) {
      env.liveHost = liveHost;
    }
    if (host) {
      env.host = host;
    }
    if (project) {
      env.project = project;
    }
    if (mountpoints) {
      env.mountpoints = mountpoints;
    }
  } else if (res.status === 401) {
    env.unauthorized = true;
  }
  return env;
}

/**
 * Completes a project configuration based on a GitHub URL and/or existing settings.
 * @param {Object} obj The project settings
 * @returns {Object>} The assembled project configuration
 */
export function assembleProject({
  giturl,
  owner,
  repo,
  ref = 'main',
  mountpoints,
  project,
  host,
  previewHost,
  liveHost,
  devMode,
  devOrigin,
  disabled,
  authToken,
}) {
  if (giturl && !owner && !repo) {
    const gh = getGitHubSettings(giturl);
    owner = gh.owner;
    repo = gh.repo;
    ref = gh.ref;
  } else {
    giturl = `https://github.com/${owner}/${repo}/tree/${ref}`;
  }
  const id = `${owner}/${repo}/${ref}`;

  return {
    id,
    project,
    previewHost,
    liveHost,
    host,
    devMode,
    devOrigin,
    disabled,
    giturl,
    owner,
    repo,
    ref,
    mountpoints,
    authToken,
  };
}

/**
 * Returns an existing project configuration.
 * @param {Object} project The project settings
 * @returns {Promise<Object>} The project configuration
 */
export async function getProject(project) {
  const { owner, repo } = project;
  const handle = `${owner}/${repo}`;
  return getConfig('sync', handle);
}

/**
 * Adds or updates a project configuration.
 * @param {Object} project The project settings
 * @param {Function} cb The function to call with the project configuration when done
 * @returns {Promise<void>}
 */
export async function setProject(project, cb) {
  const { owner, repo } = project;
  // sanitize input
  Object.keys(project).forEach((key) => {
    if (!project[key]) {
      delete project[key];
    }
  });
  const handle = `${owner}/${repo}`;
  // update project config
  await setConfig('sync', {
    [handle]: project,
  });
  // update project index
  const projects = await getConfig('sync', 'hlxSidekickProjects') || [];
  if (!projects.includes(handle)) {
    projects.push(handle);
    await setConfig('sync', { hlxSidekickProjects: projects });
  }
  log.info('updated project', project);

  if (typeof cb === 'function') {
    cb(project);
  }
}

/**
 * Adds a project configuration.
 * @param {Object} input The project settings
 * @param {Function} cb The function to call with a boolean when done
 * @returns {Promise<void>}
 */
export async function addProject(input, cb) {
  const config = assembleProject(input);
  const { owner, repo, ref } = config;
  const env = await getProjectEnv(config);
  if (env.unauthorized && !input.authToken) {
    // defer adding project and have user sign in
    const { id: loginTabId } = await chrome.tabs.create({
      url: `https://admin.hlx.page/login/${owner}/${repo}/${ref}?extensionId=${chrome.runtime.id}`,
      active: true,
    });
    // retry adding project after sign in
    const retryAddProjectListener = async (message = {}) => {
      if (message.authToken && owner === message.owner && repo === message.repo) {
        await chrome.tabs.remove(loginTabId);
        config.authToken = message.authToken;
        await addProject(config, cb);
      }
      // clean up
      chrome.runtime.onMessageExternal.removeListener(retryAddProjectListener);
    };
    chrome.runtime.onMessageExternal.addListener(retryAddProjectListener);
    return;
  }
  const project = await getProject(config);
  if (!project) {
    await setProject({ ...config, ...env });
    log.info('added project', config);
    alert(i18n('config_add_success'));
    if (typeof cb === 'function') cb(true);
  } else {
    log.info('project already exists', project);
    alert(i18n('config_project_exists'));
    if (typeof cb === 'function') cb(false);
  }
}

/**
 * Deletes a project configuration.
 * @param {string} handle The project handle ({@code "owner/repo"})
 * @param {Function} cb The function to call with a boolean when done
 * @returns {Promise<void>}
 */
export async function deleteProject(handle, cb) {
  if (handle) {
    const projects = await getConfig('sync', 'hlxSidekickProjects') || [];
    const i = projects.indexOf(handle);
    if (i >= 0) {
      try {
        // delete admin auth header rule
        const [owner, repo] = handle.split('/');
        chrome.runtime.sendMessage({ deleteAuthToken: { owner, repo } });
        // delete the project entry
        await removeConfig('sync', handle);
        // remove project entry from index
        projects.splice(i, 1);
        await setConfig('sync', { hlxSidekickProjects: projects });
        log.info('project deleted', handle);
        if (typeof cb === 'function') cb(true);
      } catch (e) {
        log.error('project deletion failed', handle, e);
        if (typeof cb === 'function') cb(false);
      }
    } else {
      log.warn('project to delete not found', handle);
      if (typeof cb === 'function') cb(false);
    }
  }
}

/**
 * Assembles a state object from multiple storage types.
 * @param {Function} cb The function to call with the state object
 * @returns {Promise<void>}
 */
export async function getState(cb) {
  if (typeof cb === 'function') {
    const display = await getConfig('local', 'hlxSidekickDisplay') || false;
    const adminVersion = await getConfig('local', 'hlxSidekickAdminVersion');

    const pushDown = await getConfig('sync', 'hlxSidekickPushDown') || false;
    const projects = await Promise.all((await getConfig('sync', 'hlxSidekickProjects') || [])
      .map((handle) => {
        const [owner, repo] = handle.split('/');
        return getProject({ owner, repo });
      }));
    cb({
      display,
      adminVersion,
      pushDown,
      projects,
    });
  }
}

/**
 * Changes the sidekick's display status.
 * @param {boolean} display {@code true} if sidekick should be shown, else {@code false}
 * @param {Function} cb The function to call with the display value when done
 * @returns {Promise<void>}
 */
export async function setDisplay(display, cb) {
  setConfig('local', {
    hlxSidekickDisplay: display,
  })
    .then(() => {
      if (typeof cb === 'function') cb(display);
    })
    .catch((e) => log.error('error setting display', e));
}

/**
 * Toggles the sidekick's display status.
 * @param {Function} cb The function to call with the display value when done
 * @returns {Promise<void>}
 */
export function toggleDisplay(cb) {
  getState(({ display }) => {
    setDisplay(!display, cb);
  });
}

/**
 * Sets the x-auth-token header for all requests to admin.hlx.page if project config
 * has an auth token.
 */
export async function updateAdminAuthHeaderRules() {
  try {
    // remove all rules first
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: (await chrome.declarativeNetRequest.getSessionRules())
        .map((rule) => rule.id),
    });
    // find projects with auth tokens and add rules for each
    let id = 2;
    const projects = await getConfig('session', 'hlxSidekickProjects') || [];
    const addRules = [];
    const projectConfigs = (await Promise.all(projects
      .map((handle) => getConfig('session', handle))))
      .filter((cfg) => !!cfg);
    projectConfigs.forEach(({ owner, authToken }) => {
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
            regexFilter: `^https://admin.hlx.page/[a-z]+/${owner}/.*`,
            requestDomains: ['admin.hlx.page'],
            requestMethods: ['get', 'post', 'delete'],
            resourceTypes: ['xmlhttprequest'],
          },
        });
        id += 1;
        log.debug('added admin auth header rule for ', owner);
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

export async function storeAuthToken(owner, token, exp) {
  const handle = owner;
  const projects = await getConfig('session', 'hlxSidekickProjects') || [];
  const projectIndex = projects.indexOf(handle);
  if (token) {
    // store auth token in session storage
    await setConfig('session', {
      [handle]: {
        owner,
        authToken: token,
        authTokenExpiry: exp ? exp * 1000 : 0, // store expiry in milliseconds
      },
    });
    if (projectIndex < 0) {
      projects.push(handle);
    }
  } else {
    await removeConfig('session', handle);
    if (projectIndex >= 0) {
      projects.splice(projectIndex, 1);
    }
  }
  await setConfig('session', { hlxSidekickProjects: projects });
  log.debug(`updated auth token for ${owner}`);
  // auth token changed, set/update admin auth header
  updateAdminAuthHeaderRules();
}

/**
 * Removes the cache buster from the URL.
 */
export function removeCacheParam() {
  const location = new URL(window.location);
  const params = location.searchParams;

  // Check if 'nocache' parameter exists
  if (params.has('nocache')) {
    // Remove 'nocache' parameter
    params.delete('nocache');

    // // Update the URL without changing the browser history
    window.history.replaceState(null, '', location);

    // Now we are on same origin we are safe to reload the cache
    fetch(location, { cache: 'reload' });
  }
}
