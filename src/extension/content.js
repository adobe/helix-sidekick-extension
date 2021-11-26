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

(async () => {
  // ensure hlx namespace
  window.hlx = window.hlx || {};

  const {
    log,
    getState,
    getConfigMatches,
  } = await import('./utils.js');

  const inject = (config = window.hlx.selectedSidekickConfig) => {
    getState(({
      configs, display, devMode, proxyUrl,
    }) => {
      let matches = [];
      if (!config) {
        // find config matches
        matches = getConfigMatches(configs, window.location.href, proxyUrl);
        log.debug('content.js: found matches', matches.length);
        if (matches.length === 0) {
          // no config matches, do nothing
          return;
        }
        if (matches.length === 1) {
          // single config match
          [config] = matches;
        }
      }
      if (config) {
        log.info('content.js: single config found, inject sidekick', config);
        // user selected config or single match, remember and show sidekick
        window.hlx.selectedSidekickConfig = config;
        import('./sidekick.js')
          .then((mod) => mod.default(config, display, devMode))
          .catch((e) => log.error('failed to load sidekick', e));
      } else if (matches.length > 0) {
        log.info('content.js: multiple configs found, inject config picker', matches);
        // multiple matches, show config picker
        import('./configpicker.js')
          .then((mod) => mod.default(matches, display, inject))
          .catch((e) => log.error('failed to load config picker', e));
      }
    });
  };
  inject();
})();
