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

export const MANIFEST = chrome.runtime.getManifest();

export const SHARE_PREFIX = '/tools/sidekick/';

export const GH_URL = 'https://github.com/';

export const DEV_URL = 'http://localhost:3000';

export const log = {
  LEVEL: 2,
  /* eslint-disable no-console */
  debug: (...args) => (window.LOG_LEVEL || log.LEVEL) > 3 && console.log('DEBUG', ...args),
  info: (...args) => (window.LOG_LEVEL || log.LEVEL) > 2 && console.log('INFO', ...args),
  warn: (...args) => (window.LOG_LEVEL || log.LEVEL) > 1 && console.log('WARN', ...args),
  error: (...args) => (window.LOG_LEVEL || log.LEVEL) > 0 && console.log('ERROR', ...args),
  /* eslint-enable no-console */
};

// wraps window.alert, noop if headless
function alert(msg) {
  // eslint-disable-next-line no-alert
  return !/HeadlessChrome/.test(window.navigator.userAgent) ? window.alert(msg) : null;
}

// wraps window.confirm, returns true if headless
function confirm(msg) {
  // eslint-disable-next-line no-alert
  return !/HeadlessChrome/.test(window.navigator.userAgent) ? window.confirm(msg) : true;
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
    return chrome.runtime.lastError;
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
    const segs = new URL(giturl).pathname.substring(1).split('/');
    if (segs.length >= 2) {
      // need at least owner and repo
      return {
        owner: segs[0].toLowerCase(),
        repo: segs[1].toLowerCase(),
        ref: (segs[2] === 'tree' ? segs[3].toLowerCase() : undefined) || 'main',
      };
    }
  }
  return {};
}

export async function getConfig(type, prop) {
  const cfg = await new Promise((resolve) => {
    chrome.storage[type].get(prop, resolve);
  });
  return cfg[prop];
}

export async function setConfig(type, obj, cb) {
  const p = new Promise((resolve) => {
    chrome.storage[type].set(obj, resolve);
  });
  if (typeof cb === 'function') {
    return cb(await p);
  }
  return p;
}

export async function clearConfig(type, cb) {
  chrome.storage[type].clear(() => {
    if (typeof cb === 'function') {
      cb(true);
    }
  });
}

export async function getState(cb) {
  if (typeof cb === 'function') {
    const display = await getConfig('local', 'hlxSidekickDisplay') || false;
    const devMode = await getConfig('local', 'hlxSidekickDevMode') || false;
    const branchName = await getConfig('local', 'hlxSidekickBranchName');
    const adminVersion = await getConfig('local', 'hlxSidekickAdminVersion');
    const proxyUrl = await getConfig('local', 'hlxSidekickProxyUrl');

    const pushDown = await getConfig('sync', 'hlxSidekickPushDown') || false;
    const configs = await getConfig('sync', 'hlxSidekickConfigs') || [];

    cb({
      display,
      devMode,
      branchName,
      adminVersion,
      proxyUrl,
      pushDown,
      configs,
    });
  }
}

function sameSharePointSite(mountpoint, pathname) {
  const match = [
    '/sites/',
    '/:f:/s/',
    '/personal/',
    '/:f:/p/',
  ].find((prefix) => mountpoint.includes(prefix));
  if (match) {
    const site = mountpoint.split(match)[1].split('/').shift();
    return pathname.toLowerCase().includes(`/${site.toLowerCase()}`);
  }
  return false;
}

export function getConfigMatches(configs, tabUrl, proxyUrl) {
  if (tabUrl.startsWith(DEV_URL) && proxyUrl) {
    log.info('matching against proxy url', proxyUrl);
    tabUrl = proxyUrl;
  }
  const matches = [];
  const {
    host: checkHost,
    pathname,
    searchParams,
  } = new URL(tabUrl);
  configs.filter((cfg) => !cfg.disabled).forEach((config) => {
    const {
      owner,
      repo,
      host,
      outerHost,
      mountpoints,
    } = config;
    const match = (host && checkHost === host) // production host
      || (checkHost.endsWith(`--${repo.toLowerCase()}--${owner.toLowerCase()}.hlx.live`)
        || checkHost === outerHost) // outer
      || checkHost.endsWith(`--${repo.toLowerCase()}--${owner.toLowerCase()}.hlx3.page`) // hlx3
      || checkHost.endsWith(`--${repo.toLowerCase()}--${owner.toLowerCase()}.hlx.page`) // inner
      || mountpoints // editor
        .filter((mp) => !!mp)
        .map((mp) => {
          const mpUrl = new URL(mp);
          return [mpUrl.host, mpUrl.pathname];
        })
        .some(([mpHost, mpPath]) => {
          if (checkHost === mpHost) {
            if (checkHost === 'drive.google.com') {
              // gdrive browser
              return false;
            } else {
              // assume sharepoint
              const res = /^\/:(.):\//.exec(pathname);
              if (res && !'wx'.includes(res[1])) {
                // editor url, but neither word nor excel
                return false;
              } else if (!/\/doc\d?\.aspx$/i.test(pathname) || !searchParams.has('sourcedoc')) {
                // not an editor url
                return false;
              }
              // editor url, check for site name in path
              return sameSharePointSite(mpPath, pathname);
            }
          } else if (checkHost === 'docs.google.com' && mpHost === 'drive.google.com') {
            // gdrive file
            return true;
          }
          return false;
        });
    if (match) {
      matches.push(config);
    }
  });
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

async function getProjectConfig(owner, repo, ref) {
  const configJS = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/tools/sidekick/config.js`;
  const cfg = {};
  const res = await fetch(configJS);
  if (res.ok) {
    const js = await res.text();
    ['project', 'host', 'outerHost'].forEach((prop) => {
      const [, value] = new RegExp(`${prop}: ?["']{1}(.*)['"]{1}`).exec(js) || [];
      if (value) {
        cfg[prop] = value;
      }
    });
  }
  return cfg;
}

export async function assembleConfig({
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
  // allow local project config overrides
  project = project || projectConfig.project;
  host = host || projectConfig.host;
  outerHost = outerHost || projectConfig.outerHost;

  return {
    id: `${owner}/${repo}/${ref}`,
    project,
    host,
    outerHost,
    devMode,
    disabled,
    giturl,
    owner,
    repo,
    ref,
    mountpoints: mountpoints || await getMountpoints(owner, repo, ref),
  };
}

export async function addConfig(input, cb) {
  const config = await assembleConfig(input);
  const {
    owner, repo, mountpoints,
  } = config;
  getState(({ configs }) => {
    if (!configs.find((cfg) => owner === cfg.owner && repo === cfg.repo)) {
      configs.push(config);
      setConfig('sync', { hlxSidekickConfigs: configs })
        .then(() => (typeof cb === 'function' ? cb(true) : null))
        .then(() => log.info('added config', config))
        .catch((e) => log.error('error adding config', e));
      if (!mountpoints[0]) {
        alert(i18n('config_add_no_mountpoint'));
      } else {
        alert(i18n('config_add_success'));
      }
    } else {
      alert(i18n('config_project_exists'));
      if (typeof cb === 'function') cb(false);
    }
  });
}

export async function deleteConfig(i, cb) {
  if (confirm(i18n('config_delete_confirm'))) {
    getConfig('sync', 'hlxSidekickConfigs')
      .then((hlxSidekickConfigs = []) => {
        hlxSidekickConfigs.splice(i, 1);
        return hlxSidekickConfigs;
      })
      .then((hlxSidekickConfigs) => setConfig('sync', { hlxSidekickConfigs }))
      .then(() => {
        if (typeof cb === 'function') cb(true);
      })
      .catch((e) => log.error('error deleting config', e));
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

export async function setProxyUrl(proxyUrl, cb) {
  setConfig('local', {
    hlxSidekickProxyUrl: proxyUrl,
  })
    .then(() => {
      if (typeof cb === 'function') cb(proxyUrl);
    })
    .catch((e) => log.error('error setting proxyUrl', e));
}

export function toggleDisplay(cb) {
  getState(({ display }) => {
    setDisplay(!display, cb);
  });
}

export async function storeAuthToken(owner, repo, token) {
  // find config tab with owner/repo
  const configs = await getConfig('sync', 'hlxSidekickConfigs') || [];
  const config = configs.find((cfg) => cfg.owner === owner && cfg.repo === repo);
  if (config) {
    if (token) {
      config.authToken = token;
    } else {
      delete config.authToken;
    }
    await setConfig('sync', { hlxSidekickConfigs: configs });
    log.debug(`updated auth token for ${owner}--${repo}`);
  } else {
    log.warn(`unable to update auth token for ${owner}--${repo}: no such config`);
  }
}
