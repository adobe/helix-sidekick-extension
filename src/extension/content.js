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
  getState,
  getConfigMatches,
  setDisplay,
  i18n,
  url,
} from './utils.js';

function getSelectedConfig() {
  window.hlx = window.hlx || {};
  return window.hlx.sidekickConfigId;
}

function setSelectedConfig(id) {
  window.hlx = window.hlx || {};
  window.hlx.sidekickConfigId = id;
}

function removeConfigPicker() {
  const picker = document.getElementById('hlx-sk-picker');
  if (picker) picker.remove();
  document.removeEventListener('keyup', pickConfigByKey);
}

function pickConfigByClick({ target }) {
  inject(target.id);
  removeConfigPicker();
}

function pickConfigByKey({ ctrlKey, shiftKey, key, keyCode }) {
  if (!ctrlKey || !shiftKey) return;
  if (keyCode > 48 && keyCode < 58) {
    // number between 1 - 9
    const num = parseInt(key, 10);
    try {
      // get config id from button
      inject(document.querySelectorAll('.hlx-sk > button.config')[num - 1].id);
      removeConfigPicker();
    } catch (e) {
      console.log('Error', e.message);
    }
  } else if (key === 'Escape') {
    setDisplay(false);
    removeConfigPicker();
  }
}

async function injectSidekick(config, display) {
  if (!config) return;
  // reduce config to only include properties relevant for sidekick
  const cfg = Object.fromEntries(Object.entries(config)
    .filter(([k]) => ['owner', 'repo', 'ref'].includes(k)));
  window.hlx = window.hlx || {};
  if (!window.hlx.sidekick && display) {
    // inject sidekick
    const s = document.createElement('script');
    s.id = 'hlx-sk-app';
    s.src = url('../sidekick/app.js');
    s.dataset.config = JSON.stringify(cfg);
    if (document.head.querySelector('script#hlx-sk-app')) {
      document.head.querySelector('script#hlx-sk-app').replaceWith(s);
    } else {
      document.head.append(s);
    }
  } else if (window.hlx.sidekick) {
    // toggle sidekick
    window.hlx.sidekick.loadContext()[`${display ? 'show' : 'hide'}`]();
  }
}

function injectConfigPicker(configs, config, matches, display) {
  // todo: proper UI
  let picker = document.getElementById('hlx-sk-picker');
  if (display && !config && !picker) {
    if (!document.getElementById('hlx-sk-picker-styles')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.id = 'hlx-sk-cfg-picker-styles';
      link.href = 'https://www.hlx.page/tools/sidekick/app.css';
      document.head.appendChild(link);
    }
    picker = document.createElement('div');
    picker.id = 'hlx-sk-picker';
    picker.className = 'hlx-sk';
    const label = document.createElement('span');
    label.textContent = i18n('config_project_pick');
    label.style = 'opacity:0.6;line-height:30px;margin: 10px 10px 0 0';
    picker.appendChild(label);
    matches.splice(0, 8).forEach((match, i) => {
      const { id, project } = configs.find((cfg) => cfg.id === match);
      const btn = document.createElement('button');
      btn.id = `${id}`;
      btn.className = 'config';
      btn.textContent = project || id;
      btn.title = `(Ctrl+Shift+${i+1})`;
      btn.addEventListener('click', pickConfigByClick);
      picker.appendChild(btn);
    });
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close';
    closeBtn.textContent = '✕';
    closeBtn.title = i18n('cancel');
    closeBtn.addEventListener('click', () => {
      setDisplay(false);
      removeConfigPicker();
    });
    picker.appendChild(closeBtn);
    document.body.insertBefore(picker, document.body.firstElementChild);
    picker.querySelector('button').focus();
    document.addEventListener('keyup', pickConfigByKey);
  } else if (!display) {
    removeConfigPicker();
  }
}

function inject(id = getSelectedConfig()) {
  getState(({ configs, display }) => {
    if (id) {
      // remember user choice
      setSelectedConfig(id);
    }
    const matches = id ? [id] : getConfigMatches(configs, window.location.href);
    if (matches.length === 0) {
      // no matching configs
      return;
    }
    // get config if single match
    const config = matches.length === 1
      ? configs.find((cfg) => cfg.id === matches[0])
      : undefined;
    if (config) {
      injectSidekick(config, display);
    } else {
      injectConfigPicker(configs, config, matches, display);
    }
  });
}

inject();
