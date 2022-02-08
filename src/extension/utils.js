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

import {} from './lib/polyfills.min.js';

export const SHARE_PREFIX = '/tools/sidekick/';

export const GH_URL = 'https://github.com/';

export const DEV_URL = 'http://localhost:3000';

export const log = {
  LEVEL: 2,
  /* eslint-disable no-console */
  debug: (...args) => log.LEVEL > 3 && console.log('DEBUG', ...args),
  info: (...args) => log.LEVEL > 2 && console.log('INFO', ...args),
  warn: (...args) => log.LEVEL > 1 && console.log('WARN', ...args),
  error: (...args) => log.LEVEL > 0 && console.log('ERROR', ...args),
  /* eslint-enable no-console */
};

// shorthand for browser.i18n.getMessage()
export function i18n(msg, subs) {
  return browser.i18n.getMessage(msg, subs);
}

// shorthand for browser.runtime.getURL()
export function url(path) {
  return browser.runtime.getURL(path);
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

export async function getState(cb) {
  if (typeof cb === 'function') {
    const { hlxSidekickDisplay = false } = await browser.storage.local.get('hlxSidekickDisplay');
    const { hlxSidekickDevMode = false } = await browser.storage.local.get('hlxSidekickDevMode');
    const { hlxSidekickAdminVersion = false } = await browser.storage.local.get('hlxSidekickAdminVersion');
    const { hlxSidekickProxyUrl } = await browser.storage.local.get('hlxSidekickProxyUrl');
    const { hlxSidekickConfigs = [] } = await browser.storage.sync.get('hlxSidekickConfigs');
    cb({
      display: hlxSidekickDisplay,
      devMode: hlxSidekickDevMode,
      adminVersion: hlxSidekickAdminVersion,
      proxyUrl: hlxSidekickProxyUrl,
      configs: hlxSidekickConfigs,
    });
  }
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
  configs.forEach((config) => {
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
      || checkHost.endsWith(`--${repo.toLowerCase()}--${owner.toLowerCase()}.hlx3.page`) // inner
      || checkHost.endsWith(`${repo.toLowerCase()}--${owner.toLowerCase()}.hlx.page`) // hlx2 inner
      || mountpoints // editor
        .filter((mp) => !!mp)
        .map((mp) => {
          const mpUrl = new URL(mp);
          return [mpUrl.host, mpUrl.pathname];
        })
        .some(([mpHost, mpPath]) => {
          if (checkHost === mpHost) {
            if (mpHost.endsWith('sharepoint.com')) {
              const res = /^\/:(.):\//.exec(pathname);
              if (res && !'wx'.includes(res[1])) {
                // editor url, but neither word nor excel
                return false;
              } else if (!/\/doc\d?\.aspx$/i.test(pathname) || !searchParams.has('sourcedoc')) {
                // not an editor url
                return false;
              }
              // editor url, check for site name in path
              if (!mpPath.includes('/sites/')) {
                return false;
              }
              const site = mpPath.split('/sites/')[1].split('/').shift();
              return pathname.includes(`/sites/${site}/`);
            } else if (checkHost === 'drive.google.com') {
              // gdrive browser
              return false;
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
      // check gh url
      if (Object.keys(getGitHubSettings(giturl)).length !== 3) {
        throw new Error();
      }
      return {
        giturl,
        project: params.get('project'),
      };
    } catch (e) {
      log.error('error getting sidekick settings from share url', e);
    }
  }
  return {};
}

export function isValidShareURL(shareurl) {
  return Object.keys(getShareSettings(shareurl)).length === 3;
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
    /* eslint-disable no-alert */
    if (!configs.find((cfg) => owner === cfg.owner && repo === cfg.repo)) {
      configs.push(config);
      browser.storage.sync
        .set({ hlxSidekickConfigs: configs })
        .then(() => (typeof cb === 'function' ? cb(true) : null))
        .then(() => log.info('added config', config))
        .catch((e) => log.error('error adding config', e));
      if (!mountpoints[0]) {
        alert(i18n('config_add_no_mountpoint'));
      } else {
        window.alert(i18n('config_add_success'));
      }
    } else {
      window.alert(i18n('config_project_exists'));
      if (typeof cb === 'function') cb(false);
    }
    /* eslint-enable no-alert */
  });
}

export async function deleteConfig(i, cb) {
  // eslint-disable-next-line no-alert
  if (window.confirm(i18n('config_delete_confirm'))) {
    browser.storage.sync
      .get('hlxSidekickConfigs')
      .then(({ hlxSidekickConfigs = [] }) => {
        hlxSidekickConfigs.splice(i, 1);
        return hlxSidekickConfigs;
      })
      .then((hlxSidekickConfigs) => browser.storage.sync.set({ hlxSidekickConfigs }))
      .then(() => {
        if (typeof cb === 'function') cb(true);
      })
      .catch((e) => log.error('error deleting config', e));
  }
}

export async function setDisplay(display, cb) {
  browser.storage.local
    .set({
      hlxSidekickDisplay: display,
    })
    .then(() => {
      if (typeof cb === 'function') cb(display);
    })
    .catch((e) => log.error('error setting display', e));
}

export async function setProxyUrl(proxyUrl, cb) {
  browser.storage.local
    .set({
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
