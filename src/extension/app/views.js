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

import { sampleRUM } from './rum.js';
import { appendTag, i18n } from './ui.js';

/**
 * @typedef {Object} ViewConfig
 * @description A custom view configuration.
 * @prop {string} path The path or globbing pattern where to apply this view
 * @prop {string} css The URL of a CSS file or inline CSS to render this view (optional)
 */

/**
 * Creates and/or returns a special view.
 * @private
 * @param {Sidekick} sk The sidekick
 * @param {boolean} create Create the special view if none exists
 * @returns {HTMLELement} The special view
 */
function getSpecialView(sk, create) {
  const view = sk.shadowRoot.querySelector('.hlx-sk-special-view')
    || (create
      ? appendTag(sk.shadowRoot, {
        tag: 'div',
        attrs: { class: 'hlx-sk-special-view' },
      })
      : null);
  if (create && view) {
    const description = appendTag(view, {
      tag: 'div',
      text: i18n(sk, 'json_view_description'),
      attrs: { class: 'description' },
    });
    appendTag(description, {
      tag: 'button',
      text: i18n(sk, 'close'),
      attrs: { class: 'close' },
      // eslint-disable-next-line no-use-before-define
      lstnrs: { click: () => hideSpecialView(sk) },
    });
    appendTag(view, {
      tag: 'div',
      attrs: {
        class: 'container',
      },
    });
  }
  return view;
}

/**
 * Shows the view.
 * @private
 * @param {Sidekick} sk The sidekick
 */
export async function showSpecialView(sk) {
  const {
    config: {
      specialView,
      pushDownElements,
    },
    location: {
      href,
      pathname,
    },
  } = sk;
  if (specialView && !getSpecialView(sk)) {
    try {
      const resp = await fetch(href);
      if (!resp.ok) {
        return;
      }
      const { js, css, cssLoaded } = specialView;
      if (css && !cssLoaded) {
        if (css.startsWith('https://') || css.startsWith('/')) {
          // load external css file
          sk.loadCSS(css);
        } else {
          // load inline css
          const style = appendTag(sk.shadowRoot, {
            tag: 'style',
            attrs: {
              type: 'text/css',
            },
          });
          style.textContent = css;
        }
        specialView.cssLoaded = true;
      }

      // hide original content
      [...sk.parentElement.children].forEach((el) => {
        if (el !== sk) {
          try {
            el.style.display = 'none';
          } catch (e) {
            // ignore
          }
        }
      });

      const view = getSpecialView(sk, true);
      view.classList.add(pathname.split('.').pop());
      pushDownElements.push(view);

      const data = await resp.text();
      let callback;
      if (typeof js === 'function') {
        callback = js;
      } else if (typeof js === 'string') {
        // load external module
        const mod = await import(js);
        callback = mod.default;
      } else {
        throw new Error('invalid view callback');
      }
      callback(view.querySelector(':scope .container'), data);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log('failed to draw view', e);
    }
  }
}

/**
 * Hides the special view.
 * @private
 * @param {Sidekick} sk The sidekick
 */
export function hideSpecialView(sk) {
  const { config } = sk;
  const view = getSpecialView(sk);
  if (view) {
    config.pushDownElements = config.pushDownElements.filter((el) => el !== view);
    view.replaceWith('');

    // show original content
    [...sk.parentElement.children].forEach((el) => {
      if (el !== sk) {
        try {
          el.style.display = '';
        } catch (e) {
          // ignore
        }
      }
    });

    // log telemetry
    sampleRUM('sidekick:specialviewhidden', {
      source: sk.location.href,
      target: sk.status.webPath,
    });
  }
}
