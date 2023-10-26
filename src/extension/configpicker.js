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

import {} from './lib/polyfills.min.js';

import {
  i18n,
  url,
  setDisplay,
} from './utils.js';

function pushDownContent(display) {
  if (window.location.host !== 'docs.google.com') {
    document.querySelectorAll('html, iframe#WebApplicationFrame')
      .forEach((container) => {
        container.style.marginTop = display ? '49px' : 'initial';
      });
  }
}

function getDropdownContainer(parent) {
  let dropdown = parent.querySelector(':scope > .dropdown');
  if (dropdown) {
    return dropdown.lastElementChild;
  }
  dropdown = document.createElement('div');
  dropdown.className = 'dropdown';
  const toggle = dropdown.appendChild(document.createElement('button'));
  toggle.setAttribute('tabindex', 0);
  toggle.classList = 'dropdown-toggle';
  toggle.title = i18n('config_project_pick_more');
  toggle.textContent = i18n('config_project_pick_more');
  toggle.addEventListener('click', (evt) => {
    // collapse dropdown listener
    const collapseDropdown = () => {
      dropdown.classList.remove('dropdown-expanded');
      document.removeEventListener('click', collapseDropdown);
    };
    dropdown.classList.toggle('dropdown-expanded');
    if (dropdown.classList.contains('dropdown-expanded')) {
      evt.stopPropagation();
      window.setTimeout(() => {
        document.addEventListener('click', collapseDropdown);
      }, 100);
    }
  });
  const dropdownContainer = dropdown.appendChild(document.createElement('div'));
  dropdownContainer.className = 'dropdown-container';
  parent.appendChild(dropdown);
  return dropdownContainer;
}

class ConfigPicker extends HTMLElement {
  constructor(configs, pushDown, callback) {
    super();
    this.callback = callback || (() => {});
    this.configs = configs;
    this.pushDown = pushDown;
    const shadow = this.attachShadow({ mode: 'open' });

    // todo: proper UI
    const css = shadow.appendChild(document.createElement('link'));
    css.rel = 'stylesheet';
    css.href = url('app.css');

    const root = shadow.appendChild(document.createElement('div'));
    root.className = 'hlx-sk';

    const pluginContainer = root.appendChild(document.createElement('div'));
    pluginContainer.className = 'plugin-container';
    let configContainer = pluginContainer;

    const label = document.createElement('span');
    label.className = 'hlx-sk-label';
    label.textContent = `${i18n('config_project_pick')}:`;
    root.prepend(label);

    this.configs.forEach(({ id, project }, i) => {
      const btn = document.createElement('button');
      btn.id = `${id}`;
      btn.innerHTML = `${project || id}`;
      btn.title = i18n('config_picker_button_title', [i + 1, project || id]);
      btn.addEventListener('click', (evt) => this.pickByClick(evt.target));
      if (i >= 3) {
        configContainer = getDropdownContainer(pluginContainer);
      }
      configContainer.append(btn);
    });
    const featureContainer = root.appendChild(document.createElement('div'));
    featureContainer.className = 'feature-container';
    const closeBtn = featureContainer.appendChild(document.createElement('button'));
    closeBtn.className = 'close';
    closeBtn.title = i18n('cancel');
    closeBtn.addEventListener('click', () => {
      setDisplay(false);
      this.destroy();
    });
    window.setTimeout(() => root.querySelector('button').focus(), 200);
    root.addEventListener('keyup', (evt) => this.pickByKey(evt));
    if (this.pushDown) {
      pushDownContent(true);
    }
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
    if (this.pushDown) {
      pushDownContent(false);
    }
  }
}

window.customElements.define('helix-sidekick-config-picker', ConfigPicker);

export default function injectConfigPicker(matches, display, pushDown, inject) {
  const picker = document.querySelector('helix-sidekick-config-picker');
  if (display && !picker) {
    // add config picker
    document.body.prepend(new ConfigPicker(matches, pushDown, inject));
  } else if (picker && !display) {
    picker.destroy();
  }
}
