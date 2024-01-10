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
import { getState } from '../../utils.js';

/**
 * Import done dialog
 * @param {String} project the project
 * @param {String} path the path of the imported page
 */
const daImportDone = (project, path) => {
  const modalId = 'import-modal';
  let dialogElement = document.getElementById(modalId);
  if (!dialogElement) {
    dialogElement = document.createElement('dialog');
    dialogElement.id = modalId;

    const editUrl = `https://da.live/edit#/${project.owner}/${project.repo}${path}`;
    const previewURl = `https://main--${project.repo}--${project.owner}.hlx.page${path.replaceAll(
      '.html',
      '',
    )}`;
    dialogElement.innerHTML = `<h2>Dark Alley import done</h2><div><button id="da-edit" data-url="${editUrl}">Edit in DA</button> <button id="da-preview"data-url="${previewURl}">View preview</button></p>`;

    dialogElement.querySelectorAll('button').forEach((button) => {
      button.addEventListener('click', () => {
        window.open(button.dataset.url, '_blank');
        window.close();
      });
    });

    document.body.appendChild(dialogElement);
  }
  return dialogElement;
};

const setupImportButton = async (tab, editor) => {
  const importDAButton = document.getElementById('import-da');
  getState(async ({ projects = [] }) => {
    const project = projects.find((p) => tab.url.indexOf(p.host) !== -1);
    if (project) {
      importDAButton.classList.remove('hidden');
      importDAButton.addEventListener('click', async () => {
        importDAButton.innerHTML = chrome.i18n.getMessage('import_da_importing');
        const html = `<html><body><header></header><main><div>${editor.innerHTML}</div></main><footer></footer></body></html>`;
        const blob = new Blob([html], { type: 'text/html' });
        const formData = new FormData();
        formData.append('data', blob);
        const opts = { method: 'PUT', body: formData };
        let importPath = new URL(tab.url).pathname;
        if (!importPath.endsWith('.html')) importPath += '.html';
        const putResp = await fetch(`https://admin.da.live/source/${project.owner}/${project.repo}${importPath}`, opts);
        if (!putResp.ok) return;
        const franklinResp = await fetch(
          `https://admin.hlx.page/preview/${project.owner}/${
            project.repo
          }/main${importPath.replaceAll('.html', '')}`,
          { method: 'POST' },
        );
        if (!franklinResp.ok) return;
        importDAButton.innerHTML = chrome.i18n.getMessage('import_da_done');
        importDAButton.classList.add('done');
        const importModal = daImportDone(project, importPath);
        importModal.showModal();
      });
    }
  });
};

export default setupImportButton;
