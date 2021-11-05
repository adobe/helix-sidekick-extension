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

export const SHARE_URL = 'https://www.hlx.live/tools/sidekick/?';

export const GH_URL = 'https://github.com/';

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
      return Object.values(mountpoints);
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
        owner: segs[0],
        repo: segs[1],
        ref: (segs[2] === 'tree' ? segs[3] : undefined) || 'main',
      };
    }
  }
  return {};
}

export async function getState(cb) {
  if (typeof cb === 'function') {
    const { hlxSidekickDisplay = false } = await browser.storage.local.get('hlxSidekickDisplay');
    const { hlxSidekickConfigs = [] } = await browser.storage.sync.get('hlxSidekickConfigs');
    cb({
      display: hlxSidekickDisplay,
      configs: hlxSidekickConfigs,
    });
  }
}

export function getConfigMatches(configs, tabUrl) {
  const matches = [];
  const checkHost = new URL(tabUrl).host;
  configs.forEach((config) => {
    const {
      owner,
      repo,
      host,
      outerHost,
      mountpoints,
      hlx3,
    } = config;
    const match = checkHost === 'localhost:3000' // local development
      || (host && checkHost === host) // production host
      || (checkHost.endsWith(`--${repo}--${owner}.hlx.live`) || checkHost === outerHost) // outer CDN
      || checkHost.endsWith(`--${repo}--${owner}.hlx${hlx3 ? '3' : ''}.page`) // inner CDN with any ref
      || mountpoints // editor
        .map((mp) => {
          const mpUrl = new URL(mp);
          return [mpUrl.host, mpUrl.pathname];
        })
        .some(([mpHost, mpPath]) => {
          if (checkHost === mpHost) {
            if (mpHost.endsWith('sharepoint.com')) {
              if (tabUrl.includes('/AllItems.aspx?')) {
                // sharepoint browser
                return false;
              }
              // sharepoint file, check for site name in path
              const pathSegments = mpPath.split('/');
              pathSegments.shift();
              const site = encodeURIComponent(pathSegments
                .find((s) => s !== 's' && s !== 'sites' && !s.startsWith(':')));
              return new URL(tabUrl).pathname.includes(`/sites/${site}/`);
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
  if (typeof shareurl === 'string' && shareurl.startsWith(SHARE_URL)) {
    try {
      const params = new URL(shareurl).searchParams;
      const giturl = params.get('giturl');
      const hlx3 = params.get('hlx3') !== 'false';
      // check gh url
      if (Object.keys(getGitHubSettings(giturl)).length !== 3) {
        throw new Error();
      }
      return {
        giturl,
        project: params.get('project'),
        hlx3,
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
    const [, host] = /host: ?["']{1}(.*)['"]{1}/.exec(js) || [];
    if (host) {
      cfg.host = host;
    }
  }
  return cfg;
}

export async function assembleConfig({
  giturl,
  mountpoints,
  hlx3,
  project,
  host,
}) {
  const { owner, repo, ref } = getGitHubSettings(giturl);
  const projectConfig = await getProjectConfig(owner, repo, ref);
  return {
    id: `${owner}/${repo}/${ref}`,
    ...projectConfig,
    project,
    host,
    hlx3,
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
    owner, repo, ref, mountpoints,
  } = config;
  getState(({ configs }) => {
    /* eslint-disable no-alert */
    if (!configs.find((cfg) => owner === cfg.owner && repo === cfg.repo && ref === cfg.ref)) {
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

export function setDisplay(display, cb) {
  browser.storage.local
    .set({
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
