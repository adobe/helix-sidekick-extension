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

import {
  i18n,
  setDisplay,
} from './utils.js';

class ConfigPicker extends HTMLElement {
  constructor(configs, callback) {
    super();
    this.callback = callback || (() => {});
    this.configs = configs;
    const shadow = this.attachShadow({ mode: 'open' });

    // todo: proper UI
    const root = shadow.append(document.createElement('div'));

    const label = document.createElement('span');
    label.textContent = i18n('config_project_pick');
    root.append(label);

    this.configs.forEach(({ id, project }, i) => {
      const btn = document.createElement('button');
      btn.id = `${id}`;
      btn.textContent = project || id;
      btn.title = `(Ctrl+Shift+${i + 1})`;
      btn.addEventListener('click', this.pickByClick);
      root.append(btn);
    });
    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕';
    closeBtn.title = i18n('cancel');
    closeBtn.addEventListener('click', () => {
      setDisplay(false);
      this.destroy();
    });
    root.append(closeBtn);
    root.querySelector('button').focus();
    document.addEventListener('keyup', this.pickByKey);
  }

  pickByClick({ target }) {
    // get config from click target id
    const config = this.configs.find((cfg) => cfg.id === target.id);
    if (config) {
      this.callback(config);
      this.destroy();
    }
  }

  pickByKey({
    ctrlKey, shiftKey, key, keyCode,
  }) {
    if (!ctrlKey || !shiftKey) return;
    if (keyCode > 48 && keyCode < 58) {
      // number between 1 - 9
      const num = parseInt(key, 10);
      // find button and get config from its id
      const { id } = this.shadowRoot.querySelectorAll('button')[num - 1];
      const config = this.configs.find((cfg) => cfg.id === id);
      if (config) {
        this.callback(config);
        this.destroy();
      }
    } else if (key === 'Escape') {
      setDisplay(false);
      this.destroy();
    }
  }

  destroy() {
    document.removeEventListener('keyup', this.pickConfigByKey);
    this.replaceWith('');
  }
}

export default function injectConfigPicker(matches, display, inject) {
  const picker = document.querySelector('helix-sidekick-config-picker');
  if (display && !picker) {
    // define custom element
    if (!window.customElements.get('helix-sidekick-config-picker')) {
      window.customElements.define('helix-sidekick-config-picker', ConfigPicker);
    }
    // add config picker
    document.body.prepend(window.customElements
      .get('helix-sidekick-config-picker')(matches, inject));
  } else if (picker && !display) {
    picker.destroy();
  }
}
