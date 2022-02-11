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
  getGitHubSettings,
  isValidShareURL,
  getShareSettings,
  i18n,
  addConfig,
  deleteConfig,
  assembleConfig,
  setConfig,
  getConfig,
} from './utils.js';

function getInnerHost(owner, repo, ref, hlx3) {
  return `${ref}--${repo}--${owner}.hlx${hlx3 ? '3' : ''}.page`;
}

function isValidGitHubURL(giturl) {
  return giturl.startsWith('https://github.com')
    && Object.keys(getGitHubSettings(giturl)).length === 3;
}

function drawLink(url) {
  if (typeof url !== 'string') return '';
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
      const legacy = hlx3 !== undefined && hlx3 === false;
      const innerHost = getInnerHost(owner, repo, ref, hlx3);
      const section = document.createElement('section');
      section.id = `config-${i}`;
      section.className = `config${legacy ? ' unsupported' : ''} `;
      section.innerHTML = `
  <div>
    <h4>${project || 'Helix Project'}${legacy ? `<span>(${i18n('config_unsupported_legacy')})</span>` : ''}</h4>
    <p><span class="property">${i18n('config_project_innerhost')}</span>${drawLink(innerHost)}</p>
    ${mountpoints.length
    ? `<p><span class="property">${i18n('config_project_mountpoints')}</span>${mountpoints.map((mp) => drawLink(mp)).join(' ')}</p>`
    : ''}
    ${host
    ? `<p><span class="property">${i18n('config_project_host')}</span>${drawLink(host)}</p>`
    : ''}
    </div>
  <div>
    <button class="shareConfig" title="${i18n('config_share')}"${legacy ? ' disabled' : ''}>${i18n('config_share')}</button>
    <button class="editConfig" title="${i18n('config_edit')}"${legacy ? ' disabled' : ''}>${i18n('config_edit')}</button>
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
      button.addEventListener('click', () => editConfig(i));
    });
    // wire delete buttons
    document.querySelectorAll('button.deleteConfig').forEach((button, i) => {
      button.addEventListener('click', () => deleteConfig(i, drawConfigs));
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
      // wire save button
      buttons[0].textContent = i18n('save');
      buttons[0].title = i18n('save');
      buttons[0].addEventListener('click', async () => {
        const input = {
          giturl: document.querySelector('#edit-giturl').value,
          mountpoints: [
            document.querySelector('#edit-mountpoints').value,
          ],
          project: document.querySelector('#edit-project').value,
          host: document.querySelector('#edit-host').value,
          devMode: document.querySelector('#edit-devMode').checked,
        };
        hlxSidekickConfigs[i] = {
          ...config,
          ...await assembleConfig(input),
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
      document.querySelectorAll('#configEditor input').forEach((field) => {
        const key = field.id.split('-')[1];
        const value = config[key];
        if (typeof value === 'object') {
          field.value = value[0] || '';
        } else if (typeof value === 'boolean' && value) {
          field.setAttribute('checked', value);
        } else {
          field.value = config[key] || '';
        }
        field.setAttribute('placeholder', i18n(`config_manual_${key}_placeholder`));
        const label = document.querySelector(`#configEditor label[for="${field.id}"]`);
        if (label) {
          label.textContent = i18n(`config_manual_${key}`);
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

function clearForms() {
  document.querySelectorAll('input, textarea').forEach((field) => {
    field.value = '';
  });
}

async function updateHelpTopic(helpContent, topicId, userStatus) {
  let updated = false;
  const newHelpContent = helpContent.map((topic) => {
    if (topic.id === topicId) {
      topic.userStatus = userStatus;
      updated = true;
    }
    return topic;
  });
  if (updated) {
    await setConfig('sync', {
      hlxSidekickHelpContent: newHelpContent,
    });
  }
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

  // config import
  document.getElementById('importFile').addEventListener('change', ({ target }) => {
    const { files } = target;
    if (files.length > 0) {
      // eslint-disable-next-line no-alert
      if (window.confirm(i18n('config_import_confirm'))) {
        const reader = new FileReader();
        reader.addEventListener('load', () => {
          const { configs: importedConfigs } = JSON.parse(reader.result);
          browser.storage.sync
            .set({
              hlxSidekickConfigs: importedConfigs,
            })
            .then(() => {
              // eslint-disable-next-line no-alert
              window.alert(i18n('config_import_success'));
              drawConfigs();
            });
        });
        try {
          reader.readAsText(files[0]);
        } catch (e) {
          // eslint-disable-next-line no-alert
          window.alert(i18n('config_import_failure'));
        }
      }
    } else {
      // eslint-disable-next-line no-alert
      window.alert(i18n('config_invalid_import'));
    }
    // reset file input
    target.value = '';
  });

  // config export
  document.getElementById('exportButton').addEventListener('click', () => {
    getState(({ configs }) => {
      if (configs.length > 0) {
        // prepare export data
        const mf = browser.runtime.getManifest();
        const info = {
          name: mf.name,
          version: mf.version,
          date: new Date().toUTCString(),
        };
        const data = JSON.stringify({ info, configs }, null, '  ');
        // create file link on the fly
        const exportLink = document.createElement('a');
        exportLink.download = `helix-sidekick-backup-${Date.now()}.json`;
        exportLink.href = `data:application/json;charset=utf-8,${encodeURIComponent(data)}`;
        // exportLink.classList.add('hidden');
        document.body.append(exportLink);
        exportLink.click();
        exportLink.remove();
      } else {
        // eslint-disable-next-line no-alert
        window.alert(i18n('config_invalid_export'));
      }
    });
  });

  // nav toggle
  document.getElementById('navToggle').addEventListener('click', () => {
    document.querySelector('nav ul').classList.toggle('appear');
  });
  document.querySelectorAll('nav ul li a').forEach((a) => {
    a.addEventListener('click', () => {
      document.querySelector('nav ul').classList.remove('appear');
    });
  });

  // list help topics and user status
  (async () => {
    const helpContainer = document.getElementById('helpTopics');
    const helpContent = await getConfig('sync', 'hlxSidekickHelpContent') || [];
    const list = helpContainer.appendChild(document.createElement('ul'));
    list.className = 'quiet';
    helpContent.forEach((topic) => {
      const topicContainer = list.appendChild(document.createElement('li'));
      const { id, title, userStatus } = topic;
      const checkbox = topicContainer.appendChild(document.createElement('input'));
      checkbox.id = `help-topic-${id}`;
      checkbox.type = 'checkbox';
      checkbox.checked = userStatus === 'acknowledged';
      checkbox.addEventListener('click', () => {
        const newUserStatus = checkbox.checked ? 'acknowledged' : '';
        updateHelpTopic(helpContent, id, newUserStatus);
      });
      const label = topicContainer.appendChild(document.createElement('label'));
      label.setAttribute('for', checkbox.id);
      label.textContent = title;
    });
    if (helpContent.length > 1) {
      // enable check-all/uncheck-all buttons
      const checkAllButton = document.getElementById('helpTopicsCheckAll');
      checkAllButton.removeAttribute('disabled');
      checkAllButton.addEventListener(
        'click',
        () => {
          helpContent.forEach(async (topic) => {
            updateHelpTopic(helpContent, topic.id, 'acknowledged');
          });
          helpContainer.querySelectorAll(':scope input[type="checkbox"]').forEach((cb) => {
            cb.checked = true;
          });
        },
      );
      const uncheckAllButton = document.getElementById('helpTopicsUncheckAll');
      uncheckAllButton.removeAttribute('disabled');
      uncheckAllButton.addEventListener(
        'click',
        () => {
          helpContent.forEach(async (topic) => {
            updateHelpTopic(helpContent, topic.id, '');
          });
          helpContainer.querySelectorAll(':scope input[type="checkbox"]').forEach((cb) => {
            cb.checked = false;
          });
        },
      );
    }
  })();

  // add devMode link to nav
  const isDevMode = window.location.search === '?devMode';
  const devModeLink = document.createElement('a');
  devModeLink.textContent = i18n(isDevMode ? 'standard' : 'advanced');
  devModeLink.title = i18n(isDevMode ? 'standard' : 'advanced');
  devModeLink.setAttribute('aria-role', 'link');
  devModeLink.setAttribute('tabindex', 0);
  devModeLink.addEventListener('click', ({ target }) => {
    window.location.href = `${window.location.pathname}${isDevMode ? '' : '?devMode'}`;
    target.parentElement.classList.toggle('selected');
  });
  const devModeListItem = document.createElement('li');
  devModeListItem.className = isDevMode ? 'selected' : '';
  devModeListItem.append(devModeLink);
  document.querySelector('nav > ul').append(devModeListItem);

  // area toggles
  document.querySelectorAll('.area > h2').forEach(($title) => {
    $title.addEventListener('click', ({ target }) => {
      const $parent = target.parentElement;
      $parent.classList.toggle('expanded');
      $parent.scrollIntoView();
    });
  });

  // enable dev mode and admin version
  getState(({ devMode, adminVersion = null }) => {
    const devModeEnabled = window.location.search === '?devMode';
    if (devModeEnabled) {
      document.body.classList.add('advanced');
      const input = document.getElementById('devModeSwitch');
      input.checked = devMode;
      input.addEventListener('click', () => setConfig('local', {
        hlxSidekickDevMode: input.checked,
      }));

      const adminVersionField = document.getElementById('adminVersion');
      const adminVersionSave = document.getElementById('adminVersionSave');
      const adminVersionReset = document.getElementById('adminVersionReset');
      adminVersionField.value = adminVersion || '';
      adminVersionSave.addEventListener('click', () => setConfig('local', {
        hlxSidekickAdminVersion: adminVersionField.value,
      }));
      adminVersionReset.addEventListener('click', () => {
        adminVersionField.value = '';
        setConfig('local', {
          hlxSidekickAdminVersion: null,
        });
      });
    }
  });
});
