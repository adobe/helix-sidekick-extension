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

/**
 * @typedef {Object} ElemConfig
 * @private
 * @description The configuration of an element to add.
 * @prop {string}      tag    The tag name (mandatory)
 * @prop {string}      text   The text content (optional)
 * @prop {Object[]}  attrs  The attributes (optional)
 * @prop {Object[]} lstnrs The event listeners (optional)
 */

/**
 * Makes the given element accessible by setting a title attribute
 * based on its :before CSS style or text content, and enabling
 * keyboard access.
 * @private
 * @param {HTMLElement} elem The element
 * @returns {HTMLElement} The element
 */
export function makeAccessible(elem) {
  if (elem.tagName === 'A' || elem.tagName === 'BUTTON') {
    if (!elem.title) {
      elem.title = elem.textContent;
    }
    elem.setAttribute('tabindex', '0');
  }
  return elem;
}

/**
 * Extends a tag.
 * @private
 * @param {HTMLElement} tag The tag to extend
 * @param {elemConfig}  config The tag configuration object
 * @returns {HTMLElement} The extended tag
 */
export function extendTag(tag, config) {
  if (typeof config.attrs === 'object') {
    for (const [key, value] of Object.entries(config.attrs)) {
      tag.setAttribute(key, value);
    }
  }
  if (typeof config.lstnrs === 'object') {
    for (const [name, fn] of Object.entries(config.lstnrs)) {
      if (typeof fn === 'function') {
        tag.addEventListener(name, fn);
      }
    }
  }
  if (typeof config.text === 'string') {
    tag.textContent = config.text;
  }
  return tag;
}

/**
 * Creates a tag.
 * @private
 * @param {elemConfig} config The tag configuration
 * @returns {HTMLElement} The new tag
 */
export function createTag(config) {
  if (typeof config.tag !== 'string') {
    return null;
  }
  const el = document.createElement(config.tag);
  return extendTag(el, config);
}

/**
 * Creates a tag with the given name, attributes and listeners,
 * and appends it to the parent element.
 * @private
 * @param {HTMLElement} parent The parent element
 * @param {HTMLElement|elemConfig}  config The tag (configuration)
 * @param {HTMLElement} before The element to insert before (optional)
 * @returns {HTMLElement} The new tag
 */
export function appendTag(parent, config, before) {
  const tag = config instanceof HTMLElement ? config : createTag(config);
  return makeAccessible(before
    ? parent.insertBefore(tag, before)
    : parent.appendChild(tag));
}

/**
 * Retrieves a string from the dictionary in the user's language.
 * @private
 * @param {Sidekick} sk The sidekick
 * @param {string} key The dictionary key
 * @returns {string} The string in the user's language
 */
export function i18n(sk, key) {
  return sk.dict ? (sk.dict[key] || '') : '';
}

/**
 * Listener to collapse all dropdowns when document is clicked.
 * @private
 */
export function collapseDropdowns(sk) {
  sk.root.querySelectorAll('.dropdown').forEach((d) => d.classList.remove('dropdown-expanded'));
}

/**
 * Creates a dropdown as a container for other plugins.
 * @private
 * @param {Sidekick} sk The sidekick
 * @param {pluginConfig} config The plugin configuration
 * @returns {HTMLElement} The dropdown
 */
export function createDropdown(sk, config) {
  const { id = '', button = {}, lstnrs = {} } = config;
  const dropdown = createTag({
    tag: 'div',
    attrs: {
      class: `${id} plugin dropdown`,
    },
  });
  const toggle = appendTag(dropdown, {
    ...button,
    tag: 'button',
    attrs: {
      ...(button.attrs || {}),
      class: 'dropdown-toggle',
      'aria-expanded': false,
    },
    lstnrs: {
      click: (evt) => {
        if (dropdown.classList.contains('dropdown-expanded')) {
          dropdown.classList.remove('dropdown-expanded');
          evt.target.setAttribute('aria-expanded', false);
          return;
        }

        collapseDropdowns(sk);
        dropdown.classList.add('dropdown-expanded');
        evt.target.setAttribute('aria-expanded', true);
        const {
          lastElementChild: container,
        } = dropdown;
        container.style.marginLeft = 'initial';
        const { left: cLeft, width: cWidth } = container.getBoundingClientRect();
        if (cLeft + cWidth > window.innerWidth) {
          const { width: tWidth } = toggle.getBoundingClientRect();
          container.style.marginLeft = `-${cWidth - tWidth}px`;
        }
        evt.stopPropagation();
        if (lstnrs.click) {
          lstnrs.click(evt);
        }
      },
    },
  });
  if (Array.isArray(button.elements)) {
    button.elements.forEach((elem) => appendTag(toggle, elem));
  }

  appendTag(dropdown, {
    tag: 'div',
    attrs: {
      class: 'dropdown-container',
    },
  });
  return dropdown;
}

/**
 * Aligns an element with another and keeps it there.
 * @private
 * @param {Sidekick} sk The sidekick
 * @param {string} elemSelector The CSS selector for the element to align
 * @param {string} targetSelector The CSS selector for the target element
 */
export function stickTo(sk, elemSelector, targetSelector) {
  // if no selector, stick to sidekick root
  if (!targetSelector) targetSelector = `.${sk.root.className}`;
  const listener = () => {
    const elem = sk.shadowRoot.querySelector(elemSelector);
    const target = sk.shadowRoot.querySelector(targetSelector);
    if (elem && target) {
      const elemRect = elem.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      // define alignment
      const alignments = [
        'bottom-center',
        'bottom-left',
        'bottom-right',
      ];
      let align = target === sk.root ? alignments[0] : alignments[1];
      if (targetRect.left + elemRect.width >= window.innerWidth) {
        [, , align] = alignments;
      }
      alignments.forEach((a) => elem.classList.remove(a));
      elem.classList.add(align);
      elem.style.top = `${Math.round(targetRect.bottom)}px`;
      switch (align) {
        case alignments[0]:
          elem.style.left = '';
          break;
        case alignments[1]:
          elem.style.left = `${Math.round(targetRect.left) + (targetRect.width / 2) - 45}px`;
          break;
        case alignments[2]:
        default:
          elem.style.left = `${Math.round(targetRect.left) + (targetRect.width / 2)
            - (elemRect.width - 45)}px`;
      }
    } else {
      window.removeEventListener('resize', listener);
    }
  };
  listener();
  window.addEventListener('resize', listener);
}

/**
 * Determines whether to open a new tab or reuse the existing window.
 * @private
 * @param {Event} evt The event
 * @returns <pre>true</pre> if a new tab should be opened, else <pre>false</pre>
 */
export function newTab(evt) {
  return evt.metaKey || evt.shiftKey || evt.which === 2;
}

/**
 * Pushes down the page content to make room for the sidekick.
 * @private
 * @see {@link SidekickConfig.noPushDown}
 * @param {Sidekick} sk The sidekick
 * @param {number} skHeight The current height of the sidekick (optional)
 */
export function pushDownContent(sk, skHeight) {
  const { config, location } = sk;
  if (config.pushDown
    && !sk.hasAttribute('pushdown')
    && !location.host.endsWith('.google.com')) {
    window.setTimeout(() => {
      if (!skHeight) {
        skHeight = parseFloat(window.getComputedStyle(sk.root).height, 10);
      }
      sk.setAttribute('pushdown', skHeight);
      config.pushDownElements.forEach((elem) => {
        // sidekick shown, push element down
        const currentMarginTop = parseInt(elem.style.marginTop, 10);
        let newMarginTop = skHeight;
        if (!Number.isNaN(currentMarginTop)) {
          // add element's non-zero top value
          newMarginTop += currentMarginTop;
        }
        elem.style.marginTop = `${newMarginTop}px`;
        if (elem.id === 'WebApplicationFrame') {
          // adjust height of office online frame
          elem.style.height = `calc(100% - ${newMarginTop}px)`;
        }
      });
    }, 100);
    window.addEventListener('resize', sk.checkPushDownContent);
  }
}

/**
 * Reverts the pushing down of page content.
 * @private
 * @param {Sidekick} sk The sidekick
 */
export function revertPushDownContent(sk) {
  const { config, location } = sk;
  if (config.pushDown
    && sk.hasAttribute('pushdown')
    && !location.host.endsWith('.google.com')) {
    sk.removeAttribute('pushdown');
    config.pushDownElements.forEach((elem) => {
      elem.style.marginTop = 'initial';
      if (elem.id === 'WebApplicationFrame') {
        // adjust height of office online frame
        elem.style.height = '';
      }
    });
    window.removeEventListener('resize', sk.checkPushDownContent);
  }
}
