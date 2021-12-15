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

function pushDownContent(display) {
  if (this.location.host !== 'docs.google.com') {
    document.querySelectorAll('body, iframe#WebApplicationFrame, div#feds-header')
      .forEach((container) => {
        container.style.marginTop = display ? '49px' : 'initial';
      });
  }
}

class ConfigPicker extends HTMLElement {
  constructor(configs, callback) {
    super();
    this.callback = callback || (() => {});
    this.configs = configs;
    const shadow = this.attachShadow({ mode: 'open' });

    // todo: proper UI
    const css = shadow.appendChild(document.createElement('link'));
    css.rel = 'stylesheet';
    css.href = 'https://www.hlx.live/tools/sidekick/app.css';

    const root = shadow.appendChild(document.createElement('div'));
    root.className = 'hlx-sk';

    const label = document.createElement('span');
    label.style.margin = '16px 8px 0 0';
    label.textContent = i18n('config_project_pick');
    root.append(label);

    this.configs.forEach(({ id, project }, i) => {
      const btn = document.createElement('button');
      btn.id = `${id}`;
      btn.innerHTML = `${project || id} <sup style="font-size:0.5rem">${i + 1}</sup>`;
      btn.title = i18n('config_picker_button_title', [i + 1, project || id]);
      btn.addEventListener('click', (evt) => this.pickByClick(evt.target));
      root.append(btn);
    });
    const closeBtn = root.appendChild(document.createElement('button'));
    closeBtn.textContent = '✕';
    closeBtn.className = 'close';
    closeBtn.title = i18n('cancel');
    closeBtn.addEventListener('click', () => {
      setDisplay(false);
      this.destroy();
    });
    window.setTimeout(() => root.querySelector('button').focus(), 200);
    root.addEventListener('keyup', (evt) => this.pickByKey(evt));
  }

  pickByClick(btn) {
    // get config from click target id
    const config = this.configs.find((cfg) => cfg.id === btn.id);
    if (config) {
      this.callback(config);
      this.destroy();
    }
  }

  pickByKey({ key, keyCode }) {
    if (keyCode > 48 && keyCode < 58) {
      // number between 1 - 9
      const num = parseInt(key, 10);
      const buttons = this.shadowRoot.querySelectorAll('button[id]');
      // make sure number is in range
      if (num > buttons.length) {
        return;
      }
      // find button and get config from its id
      const { id } = buttons[num - 1];
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
    // document.body.removeEventListener('keyup', this.pickConfigByKey);
    this.replaceWith('');
    pushDownContent(false);
  }
}

window.customElements.define('helix-sidekick-config-picker', ConfigPicker);

export default function injectConfigPicker(matches, display, inject) {
  const picker = document.querySelector('helix-sidekick-config-picker');
  if (display && !picker) {
    // add config picker
    document.body.prepend(new ConfigPicker(matches, inject));
    pushDownContent(true);
  } else if (picker && !display) {
    picker.destroy();
  }
}
