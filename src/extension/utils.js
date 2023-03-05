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

export const SHARE_PREFIX = '/tools/sidekick/';

export const GH_URL = 'https://github.com/';

export const DEV_URL = 'http://localhost:3000';

const DISCOVERY_CACHE = [];
const DISCOVERY_CACHE_TTL = 7200000;

export const log = {
  LEVEL: 2,
  /* eslint-disable no-console */
  debug: (...args) => log.LEVEL > 3 && console.log('DEBUG', ...args),
  info: (...args) => log.LEVEL > 2 && console.log('INFO', ...args),
  warn: (...args) => log.LEVEL > 1 && console.log('WARN', ...args),
  error: (...args) => log.LEVEL > 0 && console.log('ERROR', ...args),
  /* eslint-enable no-console */
};

// shows a window.alert (noop if headless)
function alert(msg) {
  if (typeof window !== 'undefined' && !/HeadlessChrome/.test(window.navigator.userAgent)) {
    // eslint-disable-next-line no-alert
    return window.alert(msg);
  }
  return null;
}

// shows a window.confirm (noop if headless)
function confirm(msg) {
  if (typeof window !== 'undefined' && !/HeadlessChrome/.test(window.navigator.userAgent)) {
    // eslint-disable-next-line no-alert
    return window.confirm(msg);
  }
  return true;
}

// shorthand for browser.i18n.getMessage()
export function i18n(msg, subs) {
  return chrome.i18n.getMessage(msg, subs);
}

// shorthand for browser.runtime.getURL()
export function url(path) {
  return chrome.runtime.getURL(path);
}

export function checkLastError() {
  if (chrome.runtime.lastError) {
    log.debug('chrome.runtime.lastError', chrome.runtime.lastError.message);
    return chrome.runtime.lastError.message;
  }
  return null;
}

export async function getMountpoints(owner, repo, ref) {
  const fstab = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/fstab.yaml`;
  const res = await fetch(fstab);
  if (res.ok) {
    await import('./lib/js-yaml.min.js');
    try {
      const { mountpoints = {} } = jsyaml.load(await res.text());
      return Object.values(mountpoints).map((mp) => {
        if (typeof mp === 'object') {
          return mp.url;
        }
        return mp;
      });
    } catch (e) {
      log.error('error getting mountpoints from fstab.yaml', e);
    }
  }
  return [];
}

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

export async function getConfig(type, prop) {
  const cfg = await new Promise((resolve) => {
    chrome.storage[type].get(prop, resolve);
  });
  return prop ? cfg[prop] : cfg;
}

export async function setConfig(type, obj) {
  const p = new Promise((resolve) => {
    chrome.storage[type].set(obj, () => {
      const error = checkLastError();
      if (error) {
        log.error('setConfig failed', error);
      }
      resolve(!error);
    });
  });
  return p;
}

export async function removeConfig(type, prop) {
  return new Promise((resolve) => {
    chrome.storage[type].remove(prop, resolve);
  });
}

export async function clearConfig(type) {
  return new Promise((resolve) => {
    chrome.storage[type].clear(resolve);
  });
}

export async function getState(cb) {
  if (typeof cb === 'function') {
    const display = await getConfig('local', 'hlxSidekickDisplay') || false;
    const adminVersion = await getConfig('local', 'hlxSidekickAdminVersion');

    const pushDown = await getConfig('sync', 'hlxSidekickPushDown') || false;
    const projects = await Promise.all((await getConfig('sync', 'hlxSidekickProjects') || [])
      .map((handle) => getConfig('sync', handle)));
    cb({
      display,
      adminVersion,
      pushDown,
      projects,
    });
  }
}

export async function getProjectMatches(configs, tabUrl) {
  const {
    host: checkHost,
  } = new URL(tabUrl);
  // exclude disabled configs
  configs = configs.filter((cfg) => !cfg.disabled);
  const matches = configs.filter((cfg) => {
    const {
      owner,
      repo,
      host: prodHost,
      outerHost,
    } = cfg;
    return checkHost === prodHost // production host
      || checkHost === outerHost // custom outer
      || checkHost.split('.hlx.')[0].endsWith(`${repo}--${owner}`); // inner or outer
  });
  if (matches.length === 0
    && (/(docs|drive)\.google\.com$/.test(checkHost) // gdrive
      || /^[a-z-]+\.sharepoint\.com$/.test(checkHost))) { // sharepoint
    let results = [];
    // check cache
    log.debug('discovery cache', DISCOVERY_CACHE);
    const entry = DISCOVERY_CACHE.find((e) => e.url === tabUrl);
    if (entry && entry.expiry > Date.now()) {
      // reuse fresh entry from cache
      results = entry.results;
    } else {
      // discover project details from edit url
      const discoverUrl = new URL('https://admin.hlx.page/discover/');
      discoverUrl.searchParams.append('url', tabUrl);
      const resp = await fetch(discoverUrl);
      if (resp.ok) {
        results = await resp.json();
        if (results.length > 0) {
          // cache for 2h
          const newEntry = {
            url: tabUrl,
            results,
            expiry: Date.now() + DISCOVERY_CACHE_TTL,
          };
          const index = DISCOVERY_CACHE.indexOf(entry);
          if (index >= 0) {
            // update expired cache entry
            log.debug('updating discovery cache', newEntry);
            DISCOVERY_CACHE.splice(index, 1, newEntry);
          } else {
            // add cache entry
            log.debug('extending discovery cache', newEntry);
            DISCOVERY_CACHE.push(newEntry);
          }
        }
      }
    }
    // check results for config matches
    results.forEach(({ owner, repo }) => {
      const match = configs.find((cfg) => cfg.owner === owner && cfg.repo === repo);
      if (match) {
        matches.push(match);
      }
    });
  }
  return matches;
}

export function getShareSettings(shareurl) {
  if (typeof shareurl === 'string' && new URL(shareurl).pathname === SHARE_PREFIX) {
    try {
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
    } catch (e) {
      log.error('error getting sidekick settings from share url', e);
    }
  }
  return {};
}

export function isValidShareURL(shareurl) {
  return Object.keys(getShareSettings(shareurl)).length > 1;
}

async function getProjectConfig(owner, repo, ref = 'main') {
  const cfg = {};
  let res;
  try {
    res = await fetch(`https://${ref}--${repo}--${owner}.hlx.page/helix-env.json`);
  } catch (e) {
    log.warn(`unable to retrieve project config: ${e}`);
  }
  if (res && res.ok) {
    const { prod, project, contentSourceUrl } = await res.json();
    if (prod && prod.host) {
      cfg.host = prod.host;
    }
    if (project) {
      cfg.project = project;
    }
    if (contentSourceUrl) {
      cfg.mountpoints = [contentSourceUrl];
    }
  } else {
    // extract mountpoints from fstab.yaml
    cfg.mountpoints = await getMountpoints(owner, repo, ref);
  }
  return cfg;
}

export async function assembleProject({
  giturl,
  mountpoints,
  project,
  host,
  outerHost,
  devMode,
  disabled,
}) {
  const { owner, repo, ref } = getGitHubSettings(giturl);
  const projectConfig = await getProjectConfig(owner, repo, ref);
  const id = `${owner}/${repo}/${ref}`;
  // allow local project config overrides
  project = project || projectConfig.project;
  host = host || projectConfig.host;
  outerHost = outerHost || projectConfig.outerHost;
  mountpoints = mountpoints || projectConfig.mountpoints;

  return {
    id,
    project,
    host,
    outerHost,
    devMode,
    disabled,
    giturl,
    owner,
    repo,
    ref,
    mountpoints,
  };
}

export async function getProject(project) {
  const { owner, repo } = project;
  return getConfig('sync', `${owner}/${repo}`);
}

export async function setProject(project, cb) {
  const { owner, repo } = project;
  const handle = `${owner}/${repo}`;
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

export async function addProject(input, cb) {
  const config = await assembleProject(input);
  const project = await getProject(config);
  if (!project) {
    await setProject(config);
    log.info('added project', config);
    alert(i18n('config_add_success'));
    if (typeof cb === 'function') cb(true);
  } else {
    log.info('project already exists', project);
    alert(i18n('config_project_exists'));
    if (typeof cb === 'function') cb(false);
  }
}

export async function deleteProject(handle, cb) {
  if (handle) {
    const projects = await getConfig('sync', 'hlxSidekickProjects') || [];
    const i = projects.indexOf(handle);
    if (i >= 0) {
      if (confirm(i18n('config_delete_confirm'))) {
        // delete the project entry
        await removeConfig('sync', handle);
        // remove project entry from index
        projects.splice(i, 1);
        await setConfig('sync', { hlxSidekickProjects: projects });
        log.info('project deleted', handle);
        if (typeof cb === 'function') cb(true);
      } else {
        log.info('project deletion aborted', handle);
        if (typeof cb === 'function') cb(false);
      }
    } else {
      log.warn('project to delete not found', handle);
      if (typeof cb === 'function') cb(false);
    }
  }
}

export async function setDisplay(display, cb) {
  setConfig('local', {
    hlxSidekickDisplay: display,
  })
    .then(() => {
      if (typeof cb === 'function') cb(display);
    })
    .catch((e) => log.error('error setting display', e));
}

export function toggleDisplay(cb) {
  getState(({ display }) => {
    setDisplay(!display, cb);
  });
}

export async function storeAuthToken(owner, repo, token) {
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
    log.warn(`unable to update auth token for ${owner}--${repo}: no such config`);
  }
}

export async function updateProjectConfigs() {
  const configs = await getConfig('sync', 'hlxSidekickConfigs');
  const projects = await getConfig('sync', 'hlxSidekickProjects');
  if (configs && !projects) {
    // migrate old to new project configs
    for (let i = 0; i < configs.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await setProject(configs[i]);
    }
    // TODO: remove old project configs
    // await removeConfig('sync', 'hlxSidekickConfigs');
    log.info('project config updated');
  }
}
