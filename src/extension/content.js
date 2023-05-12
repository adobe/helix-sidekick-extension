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

(async () => {
  // ensure hlx namespace
  window.hlx = window.hlx || {};

  const {
    log,
    getState,
  } = await import('./utils.js');

  let inject = () => {};
  if (!window.hlx.projectMatches) {
    inject = (selectedProject = window.hlx.selectedSidekickProject) => {
      getState(({
        display, adminVersion, pushDown,
      }) => {
        const matches = window.hlx.projectMatches || [];
        let matchingProject;
        if (!selectedProject) {
          // find config matches
          log.debug('content.js: found matches', matches.length);
          if (matches.length === 0) {
            // no config matches
            if (window.hlx.sidekick) {
              window.hlx.sidekick.replaceWith(''); // remove() doesn't work for custom element
              delete window.hlx.sidekick;
            }
            return;
          }
          if (matches.length === 1) {
            // single config match
            [matchingProject] = matches;
          }
        }
        if (selectedProject || matchingProject) {
          log.info('content.js: selected or single matching config found, inject sidekick');
          // user selected config or single match, remember and show sidekick
          window.hlx.selectedSidekickProject = selectedProject;
          const config = selectedProject || matchingProject;
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
          log.info('content.js: multiple matching configs found, inject config picker', matches);
          // multiple matches, show config picker
          import('./configpicker.js')
            .then((mod) => mod.default(matches, display, pushDown, inject))
            .catch((e) => log.error('failed to load config picker', e));
        }
      });
    };

    log.debug('content.js: waiting for config matches...');
    chrome.runtime.onMessage.addListener(({ projectMatches = [] }, { tab }) => {
      // make sure message is from extension
      if (!tab) {
        window.hlx.projectMatches = projectMatches;
        inject();
      }
    });
  } else {
    log.debug('content.js: reusing project matches', window.hlx.projectMatches);
    inject();
  }
})();
