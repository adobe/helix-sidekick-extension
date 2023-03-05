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

(async () => {
  // ensure hlx namespace
  window.hlx = window.hlx || {};

  const {
    log,
    getState,
    getGitHubSettings,
  } = await import('./utils.js');
  const run = () => {
    getState(({
      projects = [],
    }) => {
      const usp = new URLSearchParams(window.location.search);
      const giturl = usp.get('giturl');
      if (!giturl) {
        log.debug('installhelper.js: no project configured yet, ignoring');
        return;
      }
      log.debug('installhelper.js: run instrumentation', giturl);

      // find containers
      const bookmarkletContainer = document.querySelector('#sidekick-generator-bookmarklet');
      const addProjectContainer = document.querySelector('#sidekick-generator-extension-add-project');
      const deleteProjectContainer = document.querySelector('#sidekick-generator-extension-delete-project');

      if (!bookmarkletContainer) {
        log.debug('installhelper.js: expected content not found, ignoring');
      }

      const { owner, repo } = getGitHubSettings(giturl);
      const project = projects.find((cfg) => cfg.owner === owner && cfg.repo === repo);
      if (!project) {
        log.info('installhelper.js: project not added yet');
        if (addProjectContainer) {
          // instrument add project button
          const button = addProjectContainer.querySelector('a');
          if (button.dataset.sidekickExtension !== giturl) {
            button.onclick = () => {
              chrome.runtime.sendMessage({ action: 'addRemoveProject' });
            };
            button.dataset.sidekickExtension = giturl;
            // show add project container, hide others
            bookmarkletContainer.parentElement.classList.add('hidden');
            addProjectContainer.parentElement.classList.remove('hidden');
            deleteProjectContainer.parentElement.classList.add('hidden');
          }
        }
      } else {
        log.info('installhelper.js: project added');
        if (deleteProjectContainer) {
          // instrument delete project button
          const button = deleteProjectContainer.querySelector('a');
          if (button.dataset.sidekickExtension !== giturl) {
            button.onclick = () => {
              chrome.runtime.sendMessage({ action: 'addRemoveProject' });
            };
            button.dataset.sidekickExtension = giturl;
            // show delete project container, hide bookmarklet container
            bookmarkletContainer.parentElement.classList.add('hidden');
            addProjectContainer.parentElement.classList.add('hidden');
            deleteProjectContainer.parentElement.classList.remove('hidden');
          }
        }
      }
    });
  };
  if (!document.querySelector('#sidekick-generator-bookmarklet')) {
    // wait for sidekick generator ready event
    if (!window.sidekickGeneratorInstrumented) {
      window.addEventListener('sidekickGeneratorReady', (evt) => {
        evt.stopImmediatePropagation();
        run();
      }, true);
      window.sidekickGeneratorInstrumented = true;
    }
  } else {
    run();
  }
})();
