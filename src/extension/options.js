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
/* eslint-disable no-use-before-define */

'use strict';

import {
  log,
  getState,
  getMountpoints,
  getGitHubSettings,
  isValidShareURL,
  getShareSettings,
  i18n,
  addConfig,
} from './utils.js';

function getInnerHost(owner, repo, ref, hlx3) {
  return `${ref}--${repo}--${owner}.hlx${hlx3 ? '3' : ''}.page`;
}

function isValidGitHubURL(giturl) {
  return giturl.startsWith('https://github.com')
    && Object.keys(getGitHubSettings(giturl)).length === 3;
}

function drawLink(url) {
  let href = url;
  let text = url;
  if (!url.startsWith('https://')) href = `https://${url}`;
  if (url.includes('sharepoint')) text = 'SharePoint';
  if (url.includes('drive.google.com')) text = 'Google Drive';
  return `<a href="${href}/" title="${href}" target="_blank">${text}</a>`;
}

function drawConfigs() {
  getState(({ configs = [] }) => {
    const container = document.getElementById('configs');
    container.innerHTML = '';
    configs.forEach(({
      owner, repo, ref, mountpoints, project, host, hlx3,
    }, i) => {
      const innerHost = getInnerHost(owner, repo, ref, hlx3);
      const section = document.createElement('section');
      section.id = `config-${i}`;
      section.className = 'config';
      section.innerHTML = `
  <div>
    <h4>${project || 'Helix Project'}</h4>
    <p>${i18n('config_project_innerhost')}: ${drawLink(innerHost)}</p>
    ${mountpoints.length
    ? `<p>${i18n('config_project_mountpoints')}: ${mountpoints.map((mp) => drawLink(mp)).join(' ')}</p>`
    : ''}
    ${host
    ? `<p>${i18n('config_project_host')}: ${drawLink(host)}</p>`
    : ''}
    </div>
  <div>
    <button class="shareConfig" title="${i18n('config_share')}">${i18n('config_share')}</button>
    <button class="editConfig" title="${i18n('config_edit')}">${i18n('config_edit')}</button>
    <button class="deleteConfig" title="${i18n('config_delete')}">${i18n('config_delete')}</button>
  </div>`;
      container.appendChild(section);
    });
    // wire share buttons
    document.querySelectorAll('button.shareConfig').forEach((button, i) => {
      button.addEventListener('click', (evt) => shareConfig(i, evt));
    });
    // wire edit buttons
    document.querySelectorAll('button.editConfig').forEach((button, i) => {
      button.addEventListener('click', (evt) => editConfig(i, evt));
    });
    // wire delete buttons
    document.querySelectorAll('button.deleteConfig').forEach((button, i) => {
      button.addEventListener('click', (evt) => deleteConfig(i, evt));
    });
  });
}

function shareConfig(i, evt) {
  browser.storage.sync
    .get('hlxSidekickConfigs')
    .then(({ hlxSidekickConfigs = [] }) => {
      const config = hlxSidekickConfigs[i];
      const shareUrl = new URL('https://www.hlx.live/tools/sidekick/');
      shareUrl.search = new URLSearchParams([
        ['project', config.project || ''],
        ['giturl', `https://github.com/${config.owner}/${config.repo}${config.ref ? `/tree/${config.ref}` : ''}`],
      ]).toString();
      if (navigator.share) {
        navigator.share({
          title: i18n('config_shareurl_share_title', [config.project || config.innerHost]),
          url: shareUrl.toString(),
        });
      } else {
        navigator.clipboard.writeText(shareUrl.toString());
        evt.target.classList.add('success');
        evt.target.title = i18n('config_shareurl_copied', [config.project || config.innerHost]);
        // notify(i18n('config_shareurl_copied'));
        window.setTimeout(() => {
          evt.target.classList.remove('success');
          evt.target.title = 'Share';
        }, 3000);
      }
    })
    .catch((e) => log.error('error sharing config', e));
}

function editConfig(i) {
  browser.storage.sync
    .get('hlxSidekickConfigs')
    .then(({ hlxSidekickConfigs = [] }) => {
      const config = hlxSidekickConfigs[i];
      const editorFragment = document.getElementById('configEditorTemplate').content.cloneNode(true);
      const editor = editorFragment.querySelector('#configEditor');
      const close = () => {
        // unregister esc handler
        window.removeEventListener('keyup', escHandler);
        // redraw configs
        drawConfigs();
      };
      const escHandler = (evt) => {
        if (evt.key === 'Escape') {
          close();
        }
      };
      const buttons = editor.querySelectorAll('button');
      // set project title
      editorFragment.querySelector('h4').textContent = config.project || config.id;
      // wire save button
      buttons[0].textContent = i18n('save');
      buttons[0].title = i18n('save');
      buttons[0].addEventListener('click', async () => {
        Object.keys(config).forEach((key) => {
          const field = document.getElementById(`edit-${key}`);
          if (field) {
            config[key] = field.value;
          }
        });
        const { owner, repo, ref } = getGitHubSettings(config.giturl);
        const mountpoints = await getMountpoints(owner, repo, ref);
        hlxSidekickConfigs[i] = {
          ...config,
          owner,
          repo,
          ref,
          mountpoints,
        };
        browser.storage.sync
          .set({ hlxSidekickConfigs })
          .then(() => {
            drawConfigs();
            close();
          });
      });
      // wire cancel button
      buttons[1].textContent = i18n('cancel');
      buttons[1].title = i18n('cancel');
      buttons[1].addEventListener('click', close);
      // insert editor in place of config section
      document.getElementById(`config-${i}`).replaceWith(editorFragment);
      // pre-fill form
      Object.keys(config).forEach((key) => {
        const field = document.getElementById(`edit-${key}`);
        if (field) {
          if (typeof config[key] !== 'undefined') {
            field.value = config[key];
          }
          field.setAttribute('placeholder', i18n(`__MSG_config_manual_${key}_placeholder__`));
        }
      });
      // focus first field
      const firstField = editor.querySelector('input, textarea');
      firstField.focus();
      firstField.select();
      // register esc handler
      window.addEventListener('keyup', escHandler);
      // disable other config buttons while editor is shown
      document
        .querySelectorAll('section.config:not(#configEditor) button')
        .forEach((btn) => {
          btn.disabled = true;
        });
    });
}

function deleteConfig(i) {
  // eslint-disable-next-line no-alert
  if (window.confirm(i18n('config_delete_confirm'))) {
    browser.storage.sync
      .get('hlxSidekickConfigs')
      .then(({ hlxSidekickConfigs = [] }) => {
        hlxSidekickConfigs.splice(i, 1);
        return hlxSidekickConfigs;
      })
      .then((hlxSidekickConfigs) => browser.storage.sync.set({ hlxSidekickConfigs }))
      .then(() => drawConfigs())
      .catch((e) => log.error('error deleting config', e));
  }
}

function clearForms() {
  document.querySelectorAll('input, textarea').forEach((field) => {
    field.value = '';
  });
}

window.addEventListener('DOMContentLoaded', () => {
  // i18n
  document.body.innerHTML = document.body.innerHTML
    .replaceAll(/__MSG_([0-9a-zA-Z_]+)__/g, (match, msg) => i18n(msg));
  drawConfigs();

  document.getElementById('resetButton').addEventListener('click', () => {
    // eslint-disable-next-line no-alert
    if (window.confirm(i18n('config_delete_all_confirm'))) {
      browser.storage.sync
        .clear()
        .then(() => browser.storage.local.clear())
        .then(() => drawConfigs())
        .catch((e) => log.error('error deleting all configs', e));
    }
  });

  document.getElementById('addShareConfigButton').addEventListener('click', async () => {
    const shareurl = document.getElementById('shareurl').value;
    // check share url
    if (isValidShareURL(shareurl)) {
      await addConfig(getShareSettings(shareurl), (added) => {
        if (added) {
          drawConfigs();
          clearForms();
        }
      });
    } else {
      // eslint-disable-next-line no-alert
      window.alert(i18n('config_invalid_shareurl'));
    }
  });

  document.getElementById('addManualConfigButton').addEventListener('click', async () => {
    const giturl = document.getElementById('giturl').value;
    if (isValidGitHubURL(giturl)) {
      await addConfig({
        giturl,
        project: document.getElementById('project').value,
      }, (added) => {
        if (added) {
          drawConfigs();
          clearForms();
        }
      });
    } else {
      // eslint-disable-next-line no-alert
      window.alert(i18n('config_invalid_giturl'));
    }
  });
});
