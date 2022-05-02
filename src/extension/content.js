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

  const inject = (selectedConfig = window.hlx.selectedSidekickConfig) => {
    getState(({
      configs, display, proxyUrl, adminVersion, pushDown,
    }) => {
      let matches = [];
      let matchingConfig;
      if (!selectedConfig) {
        // find config matches
        matches = getConfigMatches(configs, window.location.href, proxyUrl);
        log.debug('content.js: found matches', matches.length);
        if (matches.length === 0) {
          // no config matches, do nothing
          return;
        }
        if (matches.length === 1) {
          // single config match
          [matchingConfig] = matches;
        }
      }
      if (selectedConfig
        || (matchingConfig && window.location.origin !== 'https://docs.google.com')) {
        log.info('content.js: selected or single matching config found, inject sidekick');
        // user selected config or single match, remember and show sidekick
        window.hlx.selectedSidekickConfig = selectedConfig;
        const config = selectedConfig || matchingConfig;
        if (adminVersion) {
          config.adminVersion = adminVersion;
        }
        if (pushDown) {
          config.pushDown = true;
        }
        import('./sidekick.js')
          .then((mod) => mod.default(config, display))
          .catch((e) => log.error('failed to load sidekick', e));
      } else if (matches.length > 0) {
        log.info('content.js: gdrive or multiple matching configs found, inject config picker', matches);
        // multiple matches, show config picker
        import('./configpicker.js')
          .then((mod) => mod.default(matches, display, pushDown, inject))
          .catch((e) => log.error('failed to load config picker', e));
      }
    });
  };
  inject();
})();
