/*
 * Copyright 2023 Adobe. All rights reserved.
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

import {
  DEV_URL,
  RESTRICTED_PATHS,
  getAdminUrl,
  getAdminFetchOptions,
  globToRegExp,
} from './utils.js';

/**
 * Returns the sidekick configuration.
 * @private
 * @param {SidekickConfig} cfg The sidekick config (defaults to {@link window.hlx.sidekickConfig})
 * @param {Location} location The current location
 * @returns {Object} The sidekick configuration
 */
export async function initConfig(cfg, location) {
  let config = cfg || (window.hlx && window.hlx.sidekickConfig) || {};
  const {
    owner,
    repo,
    ref = 'main',
    devMode,
    adminVersion,
    _extended,
  } = config;
  if (owner && repo && !_extended) {
    // look for custom config in project
    const configUrl = devMode
      ? `${DEV_URL.origin}/tools/sidekick/config.json`
      : getAdminUrl(config, 'sidekick', '/config.json');
    try {
      const res = await fetch(configUrl, getAdminFetchOptions());
      if (res.status === 200) {
        config = {
          ...config,
          ...(await res.json()),
          // no overriding below
          owner,
          repo,
          ref,
          devMode,
          adminVersion,
          _extended: Date.now(),
        };
        console.log('extended config found');
      }
    } catch (e) {
      console.log('error retrieving custom sidekick config', e);
    }
  }

  const {
    outerHost,
    host,
    project,
    pushDown,
    pushDownSelector,
    specialViews,
    scriptUrl = 'https://www.hlx.live/tools/sidekick/module.js',
    scriptRoot = scriptUrl.split('/').filter((_, i, arr) => i < arr.length - 1).join('/'),
  } = config;
  const innerPrefix = owner && repo ? `${ref}--${repo}--${owner}` : null;
  const publicHost = host && host.startsWith('http') ? new URL(host).host : host;
  let innerHost = 'hlx.page';
  if (!innerHost && scriptUrl) {
    // get hlx domain from script src (used for branch deployment testing)
    const scriptHost = new URL(scriptUrl).host;
    if (scriptHost && scriptHost !== 'www.hlx.live' && !scriptHost.startsWith(DEV_URL.host)) {
      // keep only 1st and 2nd level domain
      innerHost = scriptHost.split('.')
        .reverse()
        .splice(0, 2)
        .reverse()
        .join('.');
    }
  }
  innerHost = innerPrefix ? `${innerPrefix}.${innerHost}` : null;
  let liveHost = outerHost;
  if (!liveHost && owner && repo) {
    // use default hlx3 outer CDN including the ref
    liveHost = `${ref}--${repo}--${owner}.hlx.live`;
  }
  // define elements to push down
  const pushDownElements = [];
  if (pushDown) {
    document.querySelectorAll(
      `html, iframe#WebApplicationFrame${pushDownSelector ? `, ${pushDownSelector}` : ''}`,
    ).forEach((elem) => pushDownElements.push(elem));
  }
  // default views
  const defaultSpecialViews = [
    {
      path: '**.json',
      js: `${scriptRoot}/view/json.js`,
    },
  ];
  // try custom views first
  const allSpecialViews = Array.isArray(specialViews)
    ? specialViews.concat(defaultSpecialViews)
    : defaultSpecialViews;
  // find view based on path
  const { pathname } = location;
  const specialView = allSpecialViews.find(({
    path,
  }) => !RESTRICTED_PATHS.includes(pathname) && globToRegExp(path).test(pathname));

  return {
    ...config,
    ref,
    innerHost,
    outerHost: liveHost,
    scriptRoot,
    host: publicHost,
    project: project || '',
    pushDownElements,
    specialView,
  };
}

/**
 * Returns the location of the current document.
 * @private
 * @returns {Location} The location object
 */
export function getLocation() {
  // first check if there is a test location
  const $test = document.getElementById('sidekick_test_location');
  if ($test) {
    try {
      return new URL($test.value);
    } catch (e) {
      return null;
    }
  }
  // fall back to window location
  const {
    hash, host, hostname, href, origin, pathname, port, protocol, search,
  } = window.location;

  return {
    hash,
    host,
    hostname,
    href,
    origin,
    pathname,
    port,
    protocol,
    search,
  };
}
