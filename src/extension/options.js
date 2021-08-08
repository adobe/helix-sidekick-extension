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
/* eslint-disable no-console, no-use-before-define */

'use strict';

import {
  getState,
  getGitHubSettings,
  getMountpoints,
  i18n,
  notify,
} from './utils.js';

function getSidekickSettings(sidekickurl) {
  try {
    const params = new URL(sidekickurl).searchParams;
    const giturl = params.get('giturl');
    // check gh url
    if (!getGitHubSettings(giturl).length === 3) {
      throw new Error();
    }
    return {
      giturl,
      project: params.get('project'),
    };
  } catch (e) {
    return {};
  }
}

async function loadProjectConfig(owner, repo, ref) {
  const configJS = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/tools/sidekick/config.js`;
  const res = await fetch(configJS);
  if (res.ok) {
    const s = document.createElement('script');
    s.textContent = await res.text();
    document.head.append(s);
  }
}

function getInnerHost(owner, repo, ref) {
  return `${ref}--${repo}--${owner}.hlx.page`;
}

function isValidShareURL(shareurl) {
  return Object.keys(getSidekickSettings(shareurl)).length === 3;
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
      owner, repo, ref, mountpoints, project,
    }) => {
      const innerHost = getInnerHost(owner, repo, ref);
      const section = document.createElement('section');
      section.className = 'config';
      section.innerHTML = `
  <div>
    <h4>${project || 'Helix Project'}</h4>
    <p>${i18n('config_project_innerhost')}: ${drawLink(innerHost)}</p>
    ${mountpoints.length
    ? `<p>${i18n('config_project_mountpoints')}: ${mountpoints.map((mp) => drawLink(mp)).join(' ')}</p>`
    : ''}
  </div>
  <div>
    <button class="shareConfig" title="${i18n('config_share')}">${i18n('config_share')}</button>
    <button class="editConfig" title="${i18n('config_edit')}">${i18n('config_edit')}</button>
    <button class="deleteConfig" title="${i18n('config_delete')}">${i18n('config_delete')}</button>
  </div>`;
      container.appendChild(section);
    });
    document.querySelectorAll('button.shareConfig').forEach((button, i) => {
      button.addEventListener('click', (evt) => shareConfig(i, evt));
    });
    document.querySelectorAll('button.editConfig').forEach((button, i) => {
      button.addEventListener('click', (evt) => editConfig(i, evt));
    });
    document.querySelectorAll('button.deleteConfig').forEach((button, i) => {
      button.addEventListener('click', (evt) => deleteConfig(i, evt));
    });
  });
}

async function addConfig({ giturl, project }, cb) {
  const { owner, repo, ref } = getGitHubSettings(giturl);
  await loadProjectConfig(owner, repo, ref);
  const mountpoints = await getMountpoints(owner, repo, ref);
  getState(({ configs }) => {
    if (!configs.find((cfg) => owner === cfg.owner && repo === cfg.repo && ref === cfg.ref)) {
      configs.push({
        id: `${owner}/${repo}@${ref}`,
        giturl,
        owner,
        repo,
        ref,
        mountpoints,
        project,
        ...window.hlx.projectConfig,
      });
      browser.storage.sync
        .set({ hlxSidekickConfigs: configs })
        .then(() => (typeof cb === 'function' ? cb(true) : null))
        .catch((e) => console.error('error adding config', e));
    } else {
      notify(i18n('config_project_exists'));
      if (typeof cb === 'function') cb(false);
    }
  });
}

function shareConfig(i, evt) {
  browser.storage.sync
    .get('hlxSidekickConfigs')
    .then(({ hlxSidekickConfigs = [] }) => {
      const config = hlxSidekickConfigs[i];
      const shareUrl = new URL('https://www.hlx.page/tools/sidekick/');
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
        notify(i18n('config_shareurl_copied'));
        window.setTimeout(() => {
          evt.target.classList.remove('success');
          evt.target.title = 'Share';
        }, 3000);
      }
    })
    .catch((e) => console.error('error sharing config', e));
}

function editConfig(i) {
  browser.storage.sync
    .get('hlxSidekickConfigs')
    .then(({ hlxSidekickConfigs = [] }) => {
      const config = hlxSidekickConfigs[i];
      const pos = document.querySelectorAll('section.config')[i].getBoundingClientRect();
      const editor = document.getElementById('configEditor');
      const close = () => {
        // hide editor and blanket
        editor.classList.add('hidden');
        document.getElementById('blanket').classList.add('hidden');
        // unregister esc handler
        window.removeEventListener('keyup', escHandler);
      };
      const escHandler = (evt) => {
        if (evt.key === 'Escape') {
          close();
        }
      };
      const buttons = editor.querySelectorAll('button');
      // wire save button
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
      buttons[1].addEventListener('click', close);
      document.querySelector('main').appendChild(editor);
      // pre-fill form
      document.getElementById('edit-giturl').value = config.giturl;
      document.getElementById('edit-project').value = config.project;
      // position and show editor
      editor.classList.remove('hidden');
      editor.style.top = `${pos.top - 36}px`;
      editor.style.left = `${pos.left - 10}px`;
      document.getElementById('blanket').classList.remove('hidden');
      // focus first field
      const firstField = editor.querySelector('input, textarea');
      firstField.focus();
      firstField.select();
      // register esc handler
      window.addEventListener('keyup', escHandler);
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
      .catch((e) => console.error('error deleting config', e));
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
        .catch((e) => console.error('error deleting all configs', e));
    }
  });

  document.getElementById('addShareConfigButton').addEventListener('click', async () => {
    const shareurl = document.getElementById('shareurl').value;
    // check share url
    if (isValidShareURL(shareurl)) {
      await addConfig(getSidekickSettings(shareurl), (added) => {
        if (added) {
          drawConfigs();
          clearForms();
        }
      });
    } else {
      notify(i18n('config_invalid_shareurl'));
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
      notify(i18n('config_invalid_giturl'));
    }
  });
});

// capture project config
window.hlx = {
  projectConfig: {},
  initSidekick: (cfg) => {
    window.hlx.projectConfig = {
      ...cfg,
    };
  },
};
