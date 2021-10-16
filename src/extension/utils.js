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
/* eslint-disable no-console */

'use strict';

import {} from './lib/polyfills.min.js';

// shorthand for browser.i18n.getMessage()
export function i18n(msg, subs) {
  return browser.i18n.getMessage(msg, subs);
}

// shorthand for browser.runtime.getURL()
export function url(path) {
  return browser.runtime.getURL(path);
}

// shorthand for browser.notifications.create()
export function notify(message) {
  // eslint-disable-next-line no-alert
  window.alert(message);
  // browser.notifications.create('', {
  //   iconUrl: url('icons/helix_logo_32.png'),
  //   title: i18n('title'),
  //   message,
  // });
}

export function getGitHubSettings(giturl) {
  try {
    const segs = new URL(giturl).pathname.substring(1).split('/');
    if (segs.length < 2) {
      // need at least owner and repo
      throw new Error();
    }
    return {
      owner: segs[0],
      repo: segs[1],
      ref: (segs[2] === 'tree' ? segs[3] : undefined) || 'main',
    };
  } catch (e) {
    return {};
  }
}

export async function getMountpoints(owner, repo, ref) {
  const fstab = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/fstab.yaml`;
  const res = await fetch(fstab);
  if (res.ok) {
    const { mountpoints = {} } = jsyaml.load(await res.text());
    return Object.values(mountpoints);
  }
  return [];
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
      ref,
      host,
      mountpoints,
    } = config;
    const match = checkHost === 'localhost:3000' // local development
      || (host && checkHost === host) // production host
      || checkHost === `${ref}--${repo}--${owner}.hlx.live` // outer CDN
      || checkHost === `${ref}--${repo}--${owner}.hlx3.page` // inner CDN
      || mountpoints // editor
        .map((mp) => {
          const mpUrl = new URL(mp);
          return [mpUrl.host, mpUrl.pathname];
        })
        .some(([mpHost, mpPath]) => {
          if (checkHost === mpHost) {
            if (mpHost.includes('sharepoint.com') && mpPath.startsWith('/sites')) {
              // sharepoint, check for site name in path
              const site = encodeURIComponent(mpPath.split('/')[2]);
              return new URL(tabUrl).pathname.includes(`/sites/${site}/`);
            } else {
              return true;
            }
          }
          if (checkHost === 'docs.google.com' && mpHost === 'drive.google.com') {
            // gdrive, for now host matching only
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

export function setDisplay(display, cb) {
  browser.storage.local
    .set({
      hlxSidekickDisplay: display,
    })
    .then(() => {
      if (typeof cb === 'function') cb(display);
    })
    .catch((e) => console.error('error setting display', e));
}

export function toggleDisplay(cb) {
  getState(({ display }) => {
    setDisplay(!display, cb);
  });
}
