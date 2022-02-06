/*
 * Copyright 2022 Adobe. All rights reserved.
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
    getGitHubSettings,
    addConfig,
    deleteConfig,
  } = await import('./utils.js');
  const run = () => {
    getState(({
      configs,
    }) => {
      const usp = new URLSearchParams(window.location.search);
      const project = usp.get('project');
      const giturl = usp.get('giturl');
      if (!giturl) {
        log.debug('installhelper.js: no project configured yet, ignoring');
        return;
      }
      log.debug('installhelper.js: run instrumentation', giturl);

      // find bookmarklet container
      const bookmarkletContainer = document.querySelector('#sidekick-generator-bookmarklet');
      if (!bookmarkletContainer) {
        log.debug('installhelper.js: expected content not found, ignoring');
      }

      const { owner, repo } = getGitHubSettings(giturl);
      const configIndex = configs.findIndex((cfg) => cfg.owner === owner && cfg.repo === repo);
      if (configIndex < 0 && owner && repo) {
        log.info('installhelper.js: project not added yet');
        const addProjectContainer = document.querySelector('#sidekick-generator-extension-add-project');
        if (addProjectContainer) {
          // instrument add project button
          const button = addProjectContainer.querySelector('a');
          button.addEventListener('click', () => {
            addConfig({ giturl, project }, () => window.location.reload());
          });
          // show add project container, hide bookmarklet container
          addProjectContainer.parentElement.classList.remove('hidden');
          bookmarkletContainer.parentElement.classList.add('hidden');
        }
      } else {
        log.info('installhelper.js: project added');
        const deleteProjectContainer = document.querySelector('#sidekick-generator-extension-delete-project');
        if (deleteProjectContainer) {
          // instrument delete project button
          const button = deleteProjectContainer.querySelector('a');
          button.addEventListener('click', () => {
            deleteConfig(configIndex, () => window.location.reload());
          });
          // show delete project container, hide bookmarklet container
          deleteProjectContainer.parentElement.classList.remove('hidden');
          bookmarkletContainer.parentElement.classList.add('hidden');
        }
      }
    });
  };
  window.hlx = window.hlx || {};
  if (!window.hlx.sidekickGeneratorInstrumented) {
    window.addEventListener('sidekickGeneratorReady', () => {
      run();
    });
    window.hlx.sidekickGeneratorInstrumented = true;
  }
})();
