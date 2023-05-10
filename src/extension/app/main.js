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
/* eslint-disable no-console, no-alert */

import {
  DEV_URL,
  ENVS,
  fetchDict,
  getAdminUrl,
  getAdminFetchOptions,
  matchProjectHost,
} from './utils.js';
import {
  initConfig,
  getLocation,
} from './init.js';
import {
  appendTag,
  collapseDropdowns,
  createDropdown,
  createTag,
  extendTag,
  i18n,
  pushDownContent,
  revertPushDownContent,
  stickTo,
} from './ui.js';
import {
  fireEvent,
} from './events.js';
import {
  addFeatures,
  checkFeaturesState,
} from './features.js';
import {
  addCustomPlugins,
  addPlugins,
  checkPluginsState,
  registerPlugin,
} from './plugins.js';
import {
  hideSpecialView,
  showSpecialView,
} from './views.js';

(() => {
  /**
   * @typedef {Object} SidekickConfig
   * @description The sidekick configuration.
   * @prop {string} owner The GitHub owner or organization (mandatory)
   * @prop {string} repo The GitHub owner or organization (mandatory)
   * @prop {string} ref=main The Git reference or branch (optional)
   * @prop {string} mountpoint The content source URL (optional)
   * @prop {string} project The name of the project used in the sharing link (optional)
   * @prop {Plugin[]} plugins An array of {@link Plugin|plugin configurations} (optional)
   * @prop {string} outerHost The outer CDN's host name (optional)
   * @prop {string} host The production host name to publish content to (optional)
   * @prop {boolean} byocdn=false <pre>true</pre> if the production host is a 3rd party CDN
   * @prop {boolean} devMode=false Loads configuration and plugins from the developmemt environment
   * @prop {boolean} pushDown=false <pre>true</pre> to have the sidekick push down page content
   * @prop {string} pushDownSelector The CSS selector for absolute elements to also push down
   * @prop {ViewConfig[]} specialViews An array of custom {@link ViewConfig|view configurations}
   * @prop {number} adminVersion The specific version of admin service to use (optional)
   */

  /**
   * @external
   * @name "window.hlx.sidekickConfig"
   * @type {SidekickConfig}
   * @description The global variable holding the initial sidekick configuration.
   */

  /**
   * @external
   * @name "window.hlx.sidekick"
   * @type {Sidekick}
   * @description The global variable referencing the {@link Sidekick} singleton.
   */

  /**
   * @external
   * @name "window.hlx.sidekickScript"
   * @type {Element}
   * @description The <pre>script</pre> element which loaded the sidekick module.
   */

  /**
   * The sidekick provides helper tools for authors.
   * @augments HTMLElement
   */
  class Sidekick extends HTMLElement {
    /**
     * Creates a new sidekick.
     * @param {SidekickConfig} cfg The sidekick config
     */
    constructor(cfg) {
      super();
      if (!this.shadowRoot) {
        this.attachShadow({ mode: 'open' });
      }
      this.root = appendTag(this.shadowRoot, {
        tag: 'div',
        attrs: {
          class: 'hlx-sk hlx-sk-hidden',
        },
        lstnrs: {
          keydown: ({ altKey }) => {
            if (altKey) {
              // enable advanced mode
              this.root.classList.add('hlx-sk-advanced');
            }
          },
          keyup: ({ altKey }) => {
            if (!altKey) {
              // disable advanced mode
              this.root.classList.remove('hlx-sk-advanced');
            }
          },
        },
      });
      this.addEventListener('contextloaded', () => {
        this.loadCSS();
        // containers
        this.pluginContainer = appendTag(this.root, {
          tag: 'div',
          attrs: {
            class: 'plugin-container',
          },
        });
        this.pluginContainer.append(createTag({
          tag: 'span',
          text: i18n(this, 'plugins_loading'),
          attrs: {
            class: 'hlx-sk-label',
          },
        }));
        this.featureContainer = appendTag(this.root, {
          tag: 'div',
          attrs: {
            class: 'feature-container',
          },
        });

        addFeatures(this);
        addPlugins(this);
        addCustomPlugins(this);

        // fetch status
        this.fetchStatus();
        // push down content
        pushDownContent(this);
        // show special view
        showSpecialView(this);
      }, { once: true });

      this.addEventListener('statusfetched', () => {
        checkPluginsState(this);
        checkFeaturesState(this);
      });

      this.addEventListener('shown', async () => {
        pushDownContent(this);
      });

      this.addEventListener('hidden', () => {
        hideSpecialView(this);
        revertPushDownContent(this);
      });
      this.status = {};
      this.plugins = [];
      this.config = {};

      this.loadContext(cfg);

      // collapse dropdowns when document is clicked
      document.addEventListener('click', () => collapseDropdowns(this));
    }

    /**
     * Fetches the status for the current resource.
     * @fires Sidekick#statusfetched
     * @param {boolean} refreshLocation Refresh the sidekick's location (optional)
     * @returns {Sidekick} The sidekick
     */
    async fetchStatus(refreshLocation) {
      if (refreshLocation) {
        this.location = getLocation();
      }
      const { owner, repo, ref } = this.config;
      if (!owner || !repo || !ref) {
        return this;
      }
      if (!this.status.apiUrl || refreshLocation) {
        const { href, pathname } = this.location;
        const apiUrl = getAdminUrl(
          this.config,
          'status',
          (this.isEditor() || this.isAdmin()) ? '' : pathname,
        );
        apiUrl.searchParams.append('editUrl', (this.isEditor() || this.isAdmin()) ? href : 'auto');
        this.status.apiUrl = apiUrl.toString();
      }
      fetch(this.status.apiUrl, {
        ...getAdminFetchOptions(this.config),
      })
        .then((resp) => {
          // check for error status
          if (!resp.ok) {
            let errorKey = '';
            switch (resp.status) {
              case 401:
                // unauthorized, ask user to log in
                return {
                  json: () => ({
                    status: 401,
                  }),
                };
              case 404:
                errorKey = this.isEditor()
                  ? 'error_status_404_document'
                  : 'error_status_404_content';
                break;
              default:
                errorKey = `error_status_${resp.status}`;
            }
            throw new Error(errorKey);
          }
          return resp;
        })
        .then(async (resp) => {
          try {
            return resp.json();
          } catch (e) {
            throw new Error('error_status_invalid');
          }
        })
        .then((json) => {
          this.status = json;
          return json;
        })
        .then((json) => fireEvent(this, 'statusfetched', json))
        .catch(({ message }) => {
          this.status.error = message;
          const modal = {
            message: message.startsWith('error_') ? i18n(this, message) : message,
            sticky: true,
            level: 0,
            callback: () => {
              // this error is fatal, hide and delete sidekick
              if (window.hlx.sidekick) {
                window.hlx.sidekick.hide();
                window.hlx.sidekick.replaceWith(''); // remove() doesn't work for custom element
                delete window.hlx.sidekick;
              }
            },
          };
          this.showModal(modal);
        });
      return this;
    }

    /**
     * Loads the sidekick configuration and language dictionary,
     * and retrieves the location of the current document.
     * @param {SidekickConfig} cfg The sidekick config
     * @fires Sidekick#contextloaded
     * @returns {Sidekick} The sidekick
     */
    async loadContext(cfg) {
      this.location = getLocation();
      this.config = await initConfig(cfg, this.location);

      // load dictionary based on user language
      const lang = this.config.lang || navigator.language.split('-')[0];
      this.dict = await fetchDict(this, lang);
      if (!this.dict.title) {
        // unsupported language, default to english
        this.dict = await fetchDict(this, 'en');
      }
      fireEvent(this, 'contextloaded', {
        config: this.config,
        location: this.location,
      });
      return this;
    }

    /**
     * Recalculates the height of the sidekick and pushes down the
     * page content by that amount to make room for the sidekick.
     * @returns {Sidekick} The sidekick
     */
    checkPushDownContent() {
      const sk = this instanceof Sidekick ? this : window.hlx.sidekick;
      const skHeight = parseFloat(window.getComputedStyle(sk.root).height, 10);
      if (sk.hasAttribute('pushdown') && +sk.getAttribute('pushdown') !== skHeight) {
        revertPushDownContent(sk);
        pushDownContent(sk, skHeight);
      }
      return this;
    }

    /**
     * Shows the sidekick.
     * @fires Sidekick#shown
     * @returns {Sidekick} The sidekick
     */
    show() {
      if (this.root.classList.contains('hlx-sk-hidden')) {
        this.root.classList.remove('hlx-sk-hidden');
      }
      fireEvent(this, 'shown');
      return this;
    }

    /**
     * Hides the sidekick.
     * @fires Sidekick#hidden
     * @returns {Sidekick} The sidekick
     */
    hide() {
      if (!this.root.classList.contains('hlx-sk-hidden')) {
        this.root.classList.add('hlx-sk-hidden');
      }
      if (this._modal && !this._modal.parentNode.classList.contains('hlx-sk-hidden')) {
        this.hideModal();
      }
      try {
        this.root.querySelector(':scope .env').classList.remove('expanded');
      } catch (e) {
        // ignore
      }
      fireEvent(this, 'hidden');
      return this;
    }

    /**
     * Shows/hides the sidekick.
     * @returns {Sidekick} The sidekick
     */
    toggle() {
      if (this.root.classList.contains('hlx-sk-hidden')) {
        this.show();
      } else {
        this.hide();
      }
      return this;
    }

    /**
     * Adds a plugin to the sidekick.
     * @param {_plugin} plugin The plugin configuration.
     * @returns {HTMLElement} The plugin
     */
    add(plugin) {
      if (typeof plugin !== 'object') {
        return null;
      }
      // determine if plugin can be shown
      plugin.isShown = typeof plugin.condition === 'undefined'
          || (typeof plugin.condition === 'function' && plugin.condition(this));
      if (!plugin.isShown) {
        return registerPlugin(this, plugin, null);
      }

      // find existing plugin
      let $plugin = this.get(plugin.id);
      // determine container
      const $pluginContainer = (plugin.container && this.root
        .querySelector(`.dropdown.${plugin.container} .dropdown-container`))
        || (plugin.feature && this.root.querySelector('.feature-container'))
        || this.pluginContainer;

      const getPluginCfg = (p) => ({
        tag: 'div',
        attrs: {
          class: `${p.id} plugin`,
        },
      });

      if (!$plugin) {
        // add feature plugins in reverse order
        const $before = !!plugin.feature && this.root.querySelector('.feature-container').firstElementChild;
        if (plugin.button && plugin.button.isDropdown) {
          // add plugin as dropdown
          $plugin = appendTag($pluginContainer, createDropdown(this, plugin), $before);
          if (typeof plugin.callback === 'function') {
            plugin.callback(this, $plugin);
          }
          return $plugin;
        }
        // add plugin
        if ($pluginContainer === this.pluginContainer
          && !$pluginContainer.querySelector(':scope div.plugin')) {
          // first plugin, remove loading text
          $pluginContainer.innerHTML = '';
        }
        $plugin = appendTag($pluginContainer, getPluginCfg(plugin), $before);
      } else if (!plugin.isShown) {
        // remove existing plugin
        $plugin.remove();
        return null;
      } else if (plugin.override) {
        // replace existing plugin
        const $existingPlugin = $plugin;
        $plugin = appendTag($existingPlugin.parentElement, getPluginCfg(plugin), $existingPlugin);
        $existingPlugin.remove();
      }
      // add elements
      if (plugin.elements && Array.isArray(plugin.elements)) {
        plugin.elements.forEach((elem) => appendTag($plugin, elem));
      }
      // add or update button
      if (plugin.button) {
        plugin.button.action = plugin.button.action || (() => {});
        const buttonCfg = {
          tag: 'button',
          text: plugin.button.text,
          lstnrs: {
            click: (e) => plugin.button.action(e, this),
            auxclick: (e) => plugin.button.action(e, this),
          },
        };
        let $button = $plugin ? $plugin.querySelector(':scope button') : null;
        if ($button) {
          // extend existing button
          extendTag($button, buttonCfg);
        } else {
          // add button
          $button = appendTag($plugin, buttonCfg);
        }
        // check if button is enabled
        if (typeof plugin.button.isEnabled === 'function' && !plugin.button.isEnabled(this)) {
          $button.setAttribute('disabled', '');
        }
        // check if button is pressed
        if (typeof plugin.button.isPressed === 'function' && plugin.button.isPressed(this)) {
          $button.classList.add('pressed');
          $button.removeAttribute('tabindex');
        }
        // fire event when plugin button is clicked
        $button.addEventListener('click', () => fireEvent(this, 'pluginused', {
          id: plugin.id,
          button: $button,
        }));
      }
      // check advanced mode
      if (typeof plugin.advanced === 'function' && plugin.advanced(this)) {
        $plugin.classList.add('hlx-sk-advanced-only');
      }
      return registerPlugin(this, plugin, $plugin);
    }

    /**
     * Returns the sidekick plugin with the specified ID.
     * @param {string} id The plugin ID
     * @returns {HTMLElement} The plugin
     */
    get(id) {
      return this.root.querySelector(`:scope div.plugin.${id}`);
    }

    /**
     * Removes the plugin with the specified ID from the sidekick.
     * @param {string} id The plugin ID
     * @returns {Sidekick} The sidekick
     */
    remove(id) {
      const $plugin = this.get(id);
      if ($plugin) {
        $plugin.remove();
      }
      return this;
    }

    /**
     * Checks if the current location is an editor URL (SharePoint or Google Docs).
     * @returns {boolean} <code>true</code> if editor URL, else <code>false</code>
     */
    isEditor() {
      const { config, location } = this;
      const { host, pathname, search } = location;
      return (/.*\.sharepoint\.com$/.test(host)
        && pathname.match(/\/_layouts\/15\/[\w]+.aspx$/)
        && search.includes('sourcedoc='))
        || location.host === 'docs.google.com'
        || (config.mountpoint && new URL(config.mountpoint).host === location.host
          && !this.isAdmin());
    }

    /**
     * Checks if the current location is an admin URL (SharePoint or Google Drive).
     * @returns {boolean} <code>true</code> if admin URL, else <code>false</code>
     */
    isAdmin() {
      const { location } = this;
      return (location.host === 'drive.google.com')
        || (/\w+\.sharepoint.com$/.test(location.host)
        && location.pathname.endsWith('/Forms/AllItems.aspx'));
    }

    /**
     * Checks if the current location is a development URL.
     * @returns {boolean} <code>true</code> if development URL, else <code>false</code>
     */
    isDev() {
      const { location } = this;
      return [
        '', // for unit testing
        DEV_URL.host, // for development and browser testing
      ].includes(location.host);
    }

    /**
     * Checks if the current location is an inner CDN URL.
     * @returns {boolean} <code>true</code> if inner CDN URL, else <code>false</code>
     */
    isInner() {
      const { config, location } = this;
      return matchProjectHost(config.innerHost, location.host);
    }

    /**
     * Checks if the current location is an outer CDN URL.
     * @returns {boolean} <code>true</code> if outer CDN URL, else <code>false</code>
     */
    isOuter() {
      const { config, location } = this;
      return matchProjectHost(config.outerHost, location.host);
    }

    /**
     * Checks if the current location is a production URL.
     * @returns {boolean} <code>true</code> if production URL, else <code>false</code>
     */
    isProd() {
      const { config, location } = this;
      return config.host === location.host;
    }

    /**
     * Checks if the current location is a configured project URL.
     * @returns {boolean} <code>true</code> if project URL, else <code>false</code>
     */
    isProject() {
      return this.config.owner && this.config.repo
        && (this.isDev() || this.isInner() || this.isOuter() || this.isProd());
    }

    /**
     * @deprecated Use {@link isProject} instead
     * Checks if the current location is a configured project URL.
     * @returns {boolean} <code>true</code> if project URL, else <code>false</code>
     */
    isHelix() {
      return this.isProject();
    }

    /**
     * Checks if the current location is a content URL.
     * @returns {boolean} <code>true</code> if content URL, else <code>false</code>
     */
    isContent() {
      const file = this.location.pathname.split('/').pop();
      const ext = file && file.split('.').pop();
      return this.isEditor() || this.isAdmin() || ext === file || ext === 'html'
        || ext === 'json' || ext === 'pdf';
    }

    /**
     * Checks if the user is logged in.
     * @returns {boolean} <code>true</code> if user is logged in (or does not need to be),
     * else <code>false</code>
     */
    isAuthenticated() {
      return !!this.status?.profile;
    }

    /**
     * Checks if the user is allowed to use a feature.
     * @param {string} feature The feature to check
     * @param {string} permission The permission to require
     * @returns {boolean} <code>true</code> if user is allowed, else <code>false</code>
     */
    isAuthorized(feature, permission) {
      if (!this.status[feature]) {
        // unknown feature
        return false;
      }
      if (!this.status[feature].permissions) {
        // feature doesn't require permissions
        return true;
      }
      return this.status[feature].permissions.includes(permission);
    }

    /**
     * Displays a non-sticky notification.
     * @deprecated Use <code>showModal(<Object>)</code> instead
     * @param {string|string[]} message The message (lines) to display
     * @param {number}          level error (0), warning (1), of info (2)
     */
    notify(message, level = 2) {
      this.showModal({
        message,
        level,
      });
    }

    /**
     * Displays a sticky notification asking the user to wait.
     */
    showWait() {
      this.showModal({ message: i18n(this, 'please_wait'), sticky: true });
    }

    /**
     * Displays a modal notification.
     * @param {object|string|string[]} msg The message (object or lines)
     * @param {string} msg.message The message
     * @param {string} msg.css     The CSS class to add
     * @param {boolean} msg.sticky <code>true</code> if message should be sticky (optional)
     * @param {number}  msg.level error (0), warning (1), of info (2, default)
     * @param {Function} msg.callback The function to call when the modal is hidden again
     * @param {boolean} sticky <code>true</code> if message should be sticky (optional)
     * @param {number} level error (0), warning (1), of info (2, default)
     * @param {Function} callback The function to call when the modal is hidden again
     * @fires Sidekick#modalshown
     * @returns {Sidekick} The sidekick
     */
    // eslint-disable-next-line default-param-last
    showModal(msg, sticky = false, level = 2, callback) {
      this._modalCallback = callback;
      if (!this._modal) {
        const $spinnerWrap = appendTag(this.shadowRoot, {
          tag: 'div',
          attrs: {
            class: 'hlx-sk-overlay',
          },
          lstnrs: {
            click: () => this.hideModal(),
          },
        });
        this._modal = appendTag($spinnerWrap, { tag: 'div' });
      } else {
        this._modal.className = '';
        this._modal.parentNode.classList.remove('hlx-sk-hidden');
      }
      if (msg) {
        if (msg instanceof Object && !Array.isArray(msg)) {
          // object notation, use only props from first argument
          const {
            message,
            css,
            sticky: isSticky = false,
            level: hasLevel = 2,
            callback: hasCallback,
          } = msg;
          if (css) {
            this._modal.classList.add(css.split(' ')[0]);
          }
          msg = message || '';
          sticky = isSticky;
          level = hasLevel;
          this._modalCallback = hasCallback;
        }
        if (Array.isArray(msg)) {
          this._modal.textContent = '';
          msg.forEach((line) => {
            if (typeof line === 'string') {
              const isURL = line.startsWith('http');
              const p = appendTag(this._modal, {
                tag: 'p',
                text: !isURL ? line : '',
              });
              if (isURL) {
                appendTag(p, {
                  tag: 'a',
                  text: line,
                  attrs: {
                    href: line,
                    target: '_blank',
                  },
                });
              }
            } else if (line instanceof HTMLElement) {
              appendTag(appendTag(this._modal, { tag: 'p' }), line);
            }
          });
        } else {
          this._modal.textContent = msg;
        }
        this._modal.classList.add('modal');
        if (level < 2) {
          this._modal.classList.add(`level-${level}`);
        }
      }
      if (!sticky) {
        const sk = this;
        window.setTimeout(() => {
          sk.hideModal();
        }, 3000);
      }
      fireEvent(this, 'modalshown', this._modal);
      return this;
    }

    /**
     * Hides the modal if shown.
     * @fires Sidekick#modalhidden
     * @returns {Sidekick} The sidekick
     */
    hideModal() {
      if (this._modal) {
        this._modal.innerHTML = '';
        this._modal.className = '';
        this._modal.style = {};
        this._modal.parentNode.classList.add('hlx-sk-hidden');
        fireEvent(this, 'modalhidden');
      }
      if (typeof this._modalCallback === 'function') {
        this._modalCallback(this);
        delete this._modalCallback;
      }
      return this;
    }

    /**
     * Displays a balloon with help content.
     * @param {HelpTopic} topic The topic
     * @param {number} step The step number to display (starting with 0)
     * @returns {Sidekick} The sidekick
     */
    showHelp(topic, step = 0) {
      const { id, steps } = topic;
      // contextualize and consolidate help steps
      const cSteps = steps.filter(({ selector }) => {
        if (!selector) return true;
        const target = this.shadowRoot.querySelector(selector);
        return target && window.getComputedStyle(target).display !== 'none';
      });
      const numSteps = cSteps.length;
      if (!numSteps) return this;
      const { message, selector } = cSteps[step];
      this.showModal({
        message: [message],
        sticky: true,
      });

      // add controls
      const controls = appendTag(this._modal, {
        tag: 'p',
        attrs: {
          class: 'help-controls',
        },
      });
      const stepControls = appendTag(controls, {
        tag: 'div',
        attrs: {
          class: 'help-steps',
        },
      });
      const buttonControls = appendTag(controls, {
        tag: 'div',
        attrs: {
          class: 'help-actions',
        },
      });
      if (cSteps.length > 1) {
        cSteps.forEach((_, num) => {
          let type = 'current';
          if (num < step) {
            type = 'previous';
          } else if (num > step) {
            type = 'next';
          }
          const stepButton = appendTag(stepControls, {
            tag: 'a',
            attrs: {
              class: `help-step help-${type}`,
              title: i18n(this, `help_${type}`),
            },
            lstnrs: {
              click: (evt) => {
                evt.stopPropagation();
                this.showHelp(topic, num);
              },
            },
          });
          appendTag(stepButton, {
            tag: 'div',
            attrs: {
              class: 'circle',
            },
          });
        });
      }
      if (cSteps[step + 1]) {
        // more help steps to show
        const close = appendTag(buttonControls, createDropdown(this, {
          id: 'help-close',
          button: {
            text: i18n(this, 'close'),
          },
        }));
        appendTag(close.lastElementChild, {
          tag: 'button',
          text: i18n(this, 'help_close_dismiss'),
          lstnrs: {
            click: () => {
              fireEvent(this, 'helpdismissed', id);
            },
          },
        });
        appendTag(close.lastElementChild, {
          tag: 'button',
          text: i18n(this, 'help_close_acknowledge'),
          lstnrs: {
            click: () => {
              fireEvent(this, 'helpacknowledged', id);
            },
          },
        });
        appendTag(close.lastElementChild, {
          tag: 'button',
          text: i18n(this, 'help_close_opt_out'),
          lstnrs: {
            click: () => {
              fireEvent(this, 'helpoptedout', id);
            },
          },
        });
        appendTag(buttonControls, {
          tag: 'button',
          text: i18n(this, 'help_next'),
          attrs: {
            class: 'help-next',
          },
          lstnrs: {
            click: (evt) => {
              evt.stopPropagation();
              this.showHelp(topic, step + 1);
              fireEvent(this, 'helpnext', id);
            },
          },
        });
      } else {
        // last help step
        appendTag(buttonControls, {
          tag: 'button',
          text: i18n(this, 'help_acknowledge'),
          attrs: {
            class: 'help-acknowledge',
          },
          lstnrs: {
            click: () => {
              fireEvent(this, 'helpacknowledged', id);
            },
          },
        });
      }

      this._modal.classList.add('help');
      stickTo(this, '.modal.help', selector);
      return this;
    }

    /**
     * Loads the specified default CSS file, or a sibling of the
     * current JS or HTML file. E.g. when called without argument from
     * /foo/bar.js, it will attempt to load /foo/bar.css.
     * @param {string} path The path to the CSS file (optional)
     * @returns {Sidekick} The sidekick
     */
    loadCSS(path) {
      let href = path;
      if (!href) {
        if (this.config.scriptRoot) {
          href = `${this.config.scriptRoot}/app.css`;
        } else {
          const filePath = this.location.pathname;
          href = `${filePath.substring(filePath.lastIndexOf('/') + 1).split('.')[0]}.css`;
        }
      }
      appendTag(this.shadowRoot, {
        tag: 'link',
        attrs: {
          rel: 'stylesheet',
          href,
        },
      })
        .addEventListener('load', () => {
          fireEvent(this, 'cssloaded');
        });
      return this;
    }

    /**
     * Switches to (or opens) a given environment.
     * @param {string} targetEnv One of the following environments:
     *        <pre>dev</pre>, <pre>preview</pre>, <pre>live</pre> or <pre>prod</pre>
     * @param {boolean} open=false <pre>true</pre> if environment should be opened in new tab
     * @fires Sidekick#envswitched
     * @returns {Sidekick} The sidekick
     */
    async switchEnv(targetEnv, open) {
      const hostType = ENVS[targetEnv];
      if (!hostType) {
        console.error('invalid environment', targetEnv);
        return this;
      }
      if (this.status.error) {
        return this;
      }
      const { config, location: { href, search, hash }, status } = this;
      this.showWait();
      if (!status.webPath) {
        console.log('not ready yet, trying again in a second ...');
        window.setTimeout(() => this.switchEnv(targetEnv, open), 1000);
        return this;
      }
      const envOrigin = targetEnv === 'dev' ? DEV_URL.origin : `https://${config[hostType]}`;
      let envUrl = `${envOrigin}${status.webPath}`;
      if (!this.isEditor()) {
        envUrl += `${search}${hash}`;
      }
      fireEvent(this, 'envswitched', {
        sourceUrl: href,
        targetUrl: envUrl,
      });
      // switch or open env
      if (open || this.isEditor()) {
        window.open(envUrl, open
          ? '' : `hlx-sk-env--${config.owner}/${config.repo}/${config.ref}${status.webPath}`);
        this.hideModal();
      } else {
        window.location.href = envUrl;
      }
      return this;
    }

    /**
     * Updates the preview or code of the current resource.
     * @fires Sidekick#updated
     * @returns {Response} The response object
     */
    async update(path) {
      const { config, status } = this;
      path = path || status.webPath;
      let resp;
      let respPath;
      try {
        // update preview
        resp = await fetch(
          getAdminUrl(config, this.isContent() ? 'preview' : 'code', path),
          {
            method: 'POST',
            ...getAdminFetchOptions(this.config),
          },
        );
        if (resp.ok) {
          if (this.isEditor() || this.isInner() || this.isDev()) {
            // bust client cache
            await fetch(`https://${config.innerHost}${path}`, { cache: 'reload', mode: 'no-cors' });
          }
          respPath = (await resp.json()).webPath;
          fireEvent(this, 'updated', respPath);
        }
      } catch (e) {
        console.error('failed to update', path, e);
      }
      return {
        ok: (resp && resp.ok) || false,
        status: (resp && resp.status) || 0,
        error: (resp && resp.headers.get('x-error')) || '',
        path: respPath || path,
      };
    }

    /**
     * Deletes the preview or code of the current resource.
     * @fires Sidekick#deleted
     * @returns {Response} The response object
     */
    async delete() {
      const { config, status } = this;
      const path = status.webPath;
      let resp;
      try {
        // delete preview
        resp = await fetch(
          getAdminUrl(config, this.isContent() ? 'preview' : 'code', path),
          {
            method: 'DELETE',
            ...getAdminFetchOptions(this.config),
          },
        );
        // also unpublish if published
        if (status.live && status.live.lastModified) {
          await this.unpublish(path);
        }
        fireEvent(this, 'deleted', path);
      } catch (e) {
        console.error('failed to delete', path, e);
      }
      return {
        ok: (resp && resp.ok) || false,
        status: (resp && resp.status) || 0,
        path,
      };
    }

    /**
     * Publishes the page at the specified path if <pre>config.host</pre> is defined.
     * @param {string} path The path of the page to publish
     * @fires Sidekick#published
     * @returns {Response} The response object
     */
    async publish(path) {
      const { config, location } = this;

      // publish content only
      if (!this.isContent()) {
        return null;
      }

      const purgeURL = new URL(path, this.isEditor() ? `https://${config.innerHost}/` : location.href);
      console.log(`publishing ${purgeURL.pathname}`);
      let resp = {};
      try {
        resp = await fetch(
          getAdminUrl(config, 'live', purgeURL.pathname),
          {
            method: 'POST',
            ...getAdminFetchOptions(this.config),
          },
        );
        // bust client cache for live and production
        if (config.outerHost) {
          // reuse purgeURL to ensure page relative paths (e.g. when publishing dependencies)
          purgeURL.hostname = config.outerHost;
          await fetch(purgeURL.href, { cache: 'reload', mode: 'no-cors' });
        }
        if (config.host) {
          // reuse purgeURL to ensure page relative paths (e.g. when publishing dependencies)
          purgeURL.hostname = config.host;
          await fetch(purgeURL.href, { cache: 'reload', mode: 'no-cors' });
        }
        fireEvent(this, 'published', path);
      } catch (e) {
        console.error('failed to publish', path, e);
      }
      resp.path = path;
      resp.error = (resp.headers && resp.headers.get('x-error')) || '';
      return resp;
    }

    /**
     * Unpublishes the current page.
     * @fires Sidekick#unpublished
     * @returns {Response} The response object
     */
    async unpublish() {
      if (!this.isContent()) {
        return null;
      }
      const { config, status } = this;
      const path = status.webPath;
      let resp;
      try {
        // delete live
        resp = await fetch(
          getAdminUrl(config, 'live', path),
          {
            method: 'DELETE',
            ...getAdminFetchOptions(this.config),
          },
        );
        fireEvent(this, 'unpublished', path);
      } catch (e) {
        console.error('failed to unpublish', path, e);
      }
      return resp;
    }
  }

  /**
   * @external
   * @name "window.hlx.initSidekick"
   * @type {Function}
   * @description Initializes the sidekick and stores a reference to it in
   *              {@link window.hlx.sidekick}.
   * @param {SidekickConfig} cfg The sidekick configuration
   *        (extends {@link window.hlx.sidekickConfig})
   * @returns {Sidekick} The sidekick
   */
  function initSidekick(cfg = {}) {
    if (!window.hlx.sidekick) {
      // merge base config with extended config
      window.hlx.sidekickConfig = Object.assign(window.hlx.sidekickConfig || {}, cfg);
      // init and show sidekick
      try {
        window.customElements.define('helix-sidekick', Sidekick);
      } catch (e) {
        // ignore
      }
      // make sure there is only one sidekick
      document.querySelectorAll('helix-sidekick').forEach((sk) => sk.replaceWith(''));
      window.hlx.sidekick = document.createElement('helix-sidekick');
      document.body.prepend(window.hlx.sidekick);
      window.hlx.sidekick.show();

      // announce to the document that the sidekick is ready
      document.dispatchEvent(new CustomEvent('sidekick-ready'));
      document.dispatchEvent(new CustomEvent('helix-sidekick-ready')); // legacy
    } else {
      // toggle sidekick
      window.hlx.sidekick.toggle();
    }
    return window.hlx.sidekick;
  }

  window.hlx = window.hlx || {};
  window.hlx.initSidekick = initSidekick;
})();
