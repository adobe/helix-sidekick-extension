/*
 * Copyright 2020 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
/* global window, document, navigator, fetch, btoa */

'use strict';

(() => {
  /**
   * @typedef {Object.<string, string>} elemAttr
   * @description The name and value of the attribute to set on an element.
   */

  /**
   * @typedef {Object.<string, Function>} elemLstnr
   * @description The event name and listener to register on an element.
   */

  /**
   * @typedef {Object} elemConfig
   * @description The configuration of an element to add.
   * @prop {string}      tag    The tag name (mandatory)
   * @prop {string}      text   The text content (optional)
   * @prop {elemAttr[]}  attrs  The attributes (optional)
   * @prop {elemLstnr[]} lstnrs The event listeners (optional)
   */

  /**
   * @typedef {Object} pluginButton
   * @description The configuration for a plugin button. This can be used as
   * a shorthand for {@link elemConfig}.
   * @prop {string}   text   The button text
   * @prop {Function} action The click listener
   * @prop {boolean|Function} isPressed Determines whether the button is pressed
   */

  /**
   * @typedef {Object} plugin
   * @description The plugin configuration.
   * @prop {string}       id        The plugin ID (mandatory)
   * @prop {pluginButton} button    A button configuration object (optional)
   * @prop {boolean}      override=false  True to replace an existing plugin (optional)
   * @prop {elemConfig[]} elements  An array of elements to add (optional)
   * @prop {Function}     condition Determines whether to show this plugin (optional).
   * This function is expected to return a boolean when called with the sidekick as argument.
   * @prop {Function}     callback  A function called after adding the plugin (optional).
   * This function is called with the sidekick and the newly added plugin as arguments.
   */

  /**
   * @external
   * @name "window.hlx.sidekickConfig"
   * @type {Object}
   * @description The sidekick configuration needs to be defined in this global variable
   * before creating the {@link Sidekick}.
   * @prop {string} owner   The GitHub owner or organization (mandatory)
   * @prop {string} repo    The GitHub owner or organization (mandatory)
   * @prop {string} ref=main The Git reference or branch (optional)
   * @prop {string} host    The production host name (optional)
   * @prop {string} byocdn=false {@code true} if the production host is a 3rd party CDN (optional)
   * @prop {string} project The name of the Helix project (optional)
   */

  /**
   * @typedef {Object} publishResponse
   * @description The response object for a publish action.
   * @prop {boolean} ok     True if publish action was successful, else false
   * @prop {string}  status The status text returned by the publish action
   * @prop {Object}  json   The JSON object returned by the publish action
   * @prop {string}  path   The path of the published page
   */

  /**
   * @external
   * @name "window.hlx.sidekick"
   * @type {Sidekick}
   * @description The global variable referencing the {@link Sidekick} singleton.
   */

  /**
   * Mapping between the plugin IDs that will be treated as environments
   * and their corresponding host properties in the config.
   * @private
   */
  const ENVS = {
    edit: 'editor',
    preview: 'innerHost',
    live: 'outerHost',
    prod: 'host',
  };

  /**
   * Returns the sidekick configuration based on {@link window.hlx.sidekickConfig}.
   * @private
   * @returns {Object} The sidekick configuration
   */
  function initConfig() {
    const cfg = (window.hlx && window.hlx.sidekickConfig
      ? window.hlx.sidekickConfig
      : window.hlxSidekickConfig) || {};
    const {
      owner, repo, ref = 'main', host, project,
    } = cfg;
    const ghDetails = owner && repo
      ? `${repo}--${owner}`
      : null;
    const innerPrefix = ghDetails ? `${ref}--${ghDetails}` : null;
    // host param for purge request must include ref
    const publicHost = host && host.startsWith('http') ? new URL(host).host : host;
    // get hlx domain from script src
    let innerHost;
    let scriptUrl;
    const script = document.querySelector('script[src$="/sidekick/app.js"]');
    if (script) {
      scriptUrl = script.src;
      const scriptHost = new URL(scriptUrl).host;
      if (scriptHost && scriptHost !== 'www.hlx.live') {
        // keep only 1st and 2nd level domain
        innerHost = scriptHost.split('.')
          .reverse()
          .splice(0, 2)
          .reverse()
          .join('.');
      }
    }
    if (!innerHost || innerHost.startsWith('localhost')) {
      innerHost = 'hlx.page';
    }
    innerHost = innerPrefix ? `${innerPrefix}.${innerHost}` : null;
    const outerHost = publicHost && ghDetails ? `${ghDetails}.hlx.live` : null;
    return {
      ...cfg,
      ref,
      innerHost,
      outerHost,
      purgeHost: innerHost, // backward compatibility
      scriptUrl,
      host: publicHost,
      project: project || 'your Helix Pages project',
    };
  }

  /**
   * Returns the location of the current document.
   * @private
   * @returns {Location} The location object
   */
  function getLocation() {
    // first check if there is a test location
    const $test = document.getElementById('sidekick_test_location');
    if ($test) {
      try {
        return new URL($test.value);
      } catch (e) {
        return null;
      }
    }
    // fall back to window location
    const {
      hash, host, hostname, href, origin, pathname, port, protocol, search,
    } = window.location;

    // replace single - with 2
    const makeHostHelixCompliant = (ahost) => {
      if (ahost.match(/^.*?--.*?--.*?\./gm)) {
        return ahost;
      }
      return ahost
        .replace(/^([^-.]+)-([^-.]+)-([^-.]+)\./gm, '$1-$2--$3.')
        .replace(/^([^-.]+)-([^-.]+)\./gm, '$1--$2.');
    };

    const newHost = makeHostHelixCompliant(hostname);

    return {
      hash,
      host: host.replace(hostname, newHost),
      hostname: newHost,
      href: href.replace(hostname, newHost),
      origin: origin.replace(hostname, newHost),
      pathname,
      port,
      protocol,
      search,
    };
  }

  /**
   * Makes the given element accessible by setting a title attribute
   * based on its :before CSS style or text content, and enabling
   * keyboard access.
   * @private
   * @param {HTMLElement} elem The element
   * @returns {HTMLElement} The element
   */
  function makeAccessible(elem) {
    if (elem.tagName === 'A' || elem.tagName === 'BUTTON') {
      const ensureTitle = (tag) => {
        if (!tag.title) {
          // wait for computed style to be available
          setTimeout(() => {
            let title = window.getComputedStyle(tag, ':before').getPropertyValue('content');
            title = title !== 'normal' && title !== 'none'
              ? title.substring(1, title.length - 1)
              : '';
            if (!title) {
              title = tag.textContent;
            }
            tag.setAttribute('title', title);
          }, 200);
        }
      };
      ensureTitle(elem);
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
  function extendTag(tag, config) {
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
  function createTag(config) {
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
   * @param {elemConfig}  config The tag configuration
   * @param {HTMLElement} before The element to insert before (optional)
   * @returns {HTMLElement} The new tag
   */
  function appendTag(parent, config, before) {
    return makeAccessible(before
      ? parent.insertBefore(createTag(config), before)
      : parent.appendChild(createTag(config)));
  }

  /**
   * Returns the share URL for the sidekick bookmarklet.
   * @private
   * @param {Object} config The sidekick configuration
   * @returns {string} The share URL
   */
  function getShareUrl(config) {
    const shareUrl = new URL('https://www.hlx.live/tools/sidekick/');
    shareUrl.search = new URLSearchParams([
      ['project', config.project || ''],
      ['host', config.host || ''],
      ['byocdn', !!config.byocdn],
      ['giturl', `https://github.com/${config.owner}/${config.repo}${config.ref ? `/tree/${config.ref}` : ''}`],
    ]).toString();
    return shareUrl.toString();
  }

  /**
   * Creates a share URL for this sidekick and either invokes the
   * Web Share API or copies it to the clipboard.
   * @private
   * @param {Sidekick} sk The sidekick
   */
  function shareSidekick(sk) {
    const { config } = sk;
    const shareUrl = getShareUrl(config);
    if (navigator.share) {
      navigator.share({
        title: `Sidekick for ${config.project}`,
        text: `Check out this helper bookmarklet for ${config.project}`,
        url: shareUrl,
      });
    } else {
      navigator.clipboard.writeText(shareUrl);
      sk.notify('Sharing URL copied to clipboard');
    }
  }

  /**
   * Checks for updates and informs the user.
   * @private
   * @param {Sidekick} sk The sidekick
   */
  function checkForUpdates(sk) {
    // check for wrong byocdn config
    // https://github.com/adobe/helix-pages/issues/885
    if (sk.config.byocdn && sk.config.host
      && sk.config.host.includes('.adobe.')
      && !sk.config.host.startsWith('www.')) {
      sk.config.byocdn = false;
      sk.updateRequired = true;
    }
    const indicators = [
      // legacy config
      typeof window.hlxSidekickConfig === 'object',
      // legacy script host
      !sk.config.scriptUrl || new URL(sk.config.scriptUrl).host === 'www.hlx.page',
      // update flag
      sk.updateRequired,
    ];
    if (indicators.includes(true)) {
      window.setTimeout(() => {
        // eslint-disable-next-line no-alert
        if (window.confirm('Good news! There is a newer version of the Helix Sidekick Bookmarklet available!\n\nDo you want to install it now? It will only take a minute …')) {
          sk.showModal('Please wait …', true);
          const url = new URL(getShareUrl(sk.config));
          const params = new URLSearchParams(url.search);
          params.set('from', sk.location.href);
          url.search = params.toString();
          window.location.href = url.toString();
        }
      }, 1000);
    }
  }

  /**
   * Determines whether to open a new tab or reuse the existing window.
   * @param {Event} evt The event
   * @returns {@code true} if a new tab should be opened, else {@code false}
   */
  function newTab(evt) {
    return evt.metaKey || evt.shiftKey || evt.which === 2;
  }

  /**
   * Switches to or opens a given environment.
   * @param {Sidekick} sidekick The sidekick
   * @param {string} targetEnv One of the following environments:
   *        {@code edit}, {@code preview}, {@code live} or {@code production}
   * @param {boolean} open=false {@code true} if environment should be opened in new tab
   */
  async function gotoEnv(sidekick, targetEnv, open) {
    const { config, location } = sidekick;
    const { owner, repo, ref } = config;
    const hostType = ENVS[targetEnv];
    if (!hostType) {
      return;
    }
    let url = `https://admin.hlx3.page/${owner}/${repo}/${ref}`;
    if (targetEnv === 'edit') {
      // resolve editor url
      const path = location.pathname;
      const file = path.split('/').pop() || 'index'; // use 'index' if no filename
      let editPath;
      if (file.endsWith('.html')) {
        editPath = path.replace(/\.html$/, '.lnk');
      } else if (!file.includes('.')) {
        editPath = `${path.endsWith(file) ? path : `${path}${file}`}.lnk`;
      }
      url += new URL(editPath, location.href).pathname;
    } else if (sidekick.isEditor()) {
      // resolve target env from editor url
      url += `/hlx_${btoa(location.href).replace(/\+/, '-').replace(/\//, '_')}.lnk`;
      if (targetEnv !== 'preview') {
        // fetch report, extract url and patch host
        try {
          const resp = await fetch(`${url}?hlx_report=true`);
          if (resp.ok) {
            const { webUrl } = await resp.json();
            if (webUrl) {
              const u = new URL(webUrl);
              u.hostname = config[hostType];
              u.pathname = u.pathname === '/index' ? '/' : u.pathname;
              url = u.toString();
            }
          }
        } catch (e) {
          // something went wrong
        }
      }
    } else {
      // resolve target env from any env
      url = `https://${config[hostType]}${location.pathname}`;
    }

    // switch or open env
    if (!url) {
      return;
    }
    if (open) {
      window.open(url);
    } else {
      window.location.href = url;
    }
  }

  /**
   * Adds the following environment plugins to the sidekick:
   * Edit, Preview, Live and Production
   * @private
   * @param {Sidekick} sk The sidekick
   */
  function addEnvPlugins(sk) {
    // edit
    sk.add({
      id: 'edit',
      condition: (sidekick) => sidekick.isEditor() || sidekick.isHelix(),
      button: {
        action: async (evt) => {
          if (evt.target.classList.contains('pressed')) {
            return;
          }
          await gotoEnv(sk, 'edit', newTab(evt));
        },
        isPressed: (sidekick) => sidekick.isEditor(),
      },
    });

    // preview
    sk.add({
      id: 'preview',
      condition: (sidekick) => sidekick.isEditor() || sidekick.isHelix(),
      button: {
        action: async (evt) => {
          if (evt.target.classList.contains('pressed')) {
            return;
          }
          await gotoEnv(sk, 'preview', newTab(evt));
        },
        isPressed: (sidekick) => sidekick.isInner(),
      },
    });

    // live
    sk.add({
      id: 'live',
      condition: (sidekick) => sidekick.config.outerHost
        && (sidekick.isEditor() || sidekick.isHelix()),
      button: {
        action: async (evt) => {
          if (evt.target.classList.contains('pressed')) {
            return;
          }
          await gotoEnv(sk, 'live', newTab(evt));
        },
        isPressed: (sidekick) => sidekick.isOuter(),
      },
    });

    // production
    sk.add({
      id: 'prod',
      condition: (sidekick) => sidekick.config.host
        && sidekick.config.host !== sidekick.config.outerHost
        && (sidekick.isEditor() || sidekick.isHelix()),
      button: {
        action: async (evt) => {
          if (evt.target.classList.contains('pressed')) {
            return;
          }
          await gotoEnv(sk, 'prod', newTab(evt));
        },
        isPressed: (sidekick) => sidekick.isProd(),
      },
    });
  }

  /**
   * Adds the reload plugin to the sidekick.
   * @private
   * @param {Sidekick} sk The sidekick
   */
  function addReloadPlugin(sk) {
    sk.add({
      id: 'reload',
      condition: (s) => s.config.innerHost && (s.isInner() || s.isDev()),
      button: {
        action: async (evt) => {
          const { location } = sk;
          const path = location.pathname;
          sk.showModal('Please wait …', true);
          const resp = await sk.publish(path, true);
          if (resp && resp.ok) {
            if (newTab(evt)) {
              window.open(window.location.href);
              sk.hideModal();
            } else {
              window.location.reload();
            }
          } else {
            sk.showModal([
              `Failed to reload ${path}. Please try again later.`,
              JSON.stringify(resp),
            ], true, 0);
          }
        },
      },
    });
  }

  /**
   * Adds the publish plugin to the sidekick.
   * @private
   * @param {Sidekick} sk The sidekick
   */
  function addPublishPlugin(sk) {
    sk.add({
      id: 'publish',
      condition: (sidekick) => sidekick.isHelix() && sidekick.config.host
        && !(sidekick.config.byocdn && sidekick.location.host === sidekick.config.host),
      button: {
        action: async (evt) => {
          const { config, location } = sk;
          const path = location.pathname;
          sk.showModal(`Publishing ${path}`, true);
          let urls = [path];
          // purge dependencies
          if (Array.isArray(window.hlx.dependencies)) {
            urls = urls.concat(window.hlx.dependencies);
          }

          await Promise.all(urls.map((url) => sk.publish(url)));
          if (config.host) {
            sk.showModal('Please wait …', true);
            // fetch and redirect to production
            const prodURL = `https://${config.byocdn ? config.outerHost : config.host}${path}`;
            await fetch(prodURL, { cache: 'reload', mode: 'no-cors' });
            // eslint-disable-next-line no-console
            console.log(`redirecting to ${prodURL}`);
            if (newTab(evt)) {
              window.open(prodURL);
              sk.hideModal();
            } else {
              window.location.href = prodURL;
            }
          } else {
            sk.notify('Successfully published');
          }
        },
      },
    });
  }

  /**
   * The sidekick provides helper tools for authors.
   */
  class Sidekick {
    /**
     * Creates a new sidekick based on a configuration object in
     * {@link window.hlx.sidekickConfig}.
     */
    constructor() {
      this.root = appendTag(document.body, {
        tag: 'div',
        attrs: {
          class: 'hlx-sk hlx-sk-hidden hlx-sk-empty',
        },
      });
      this.loadContext();
      this.loadCSS();
      // share button
      const share = appendTag(this.root, {
        tag: 'button',
        text: '<',
        attrs: {
          class: 'share',
        },
        lstnrs: {
          click: () => shareSidekick(this),
        },
      });
      appendTag(share, {
        tag: 'span',
        attrs: {
          class: 'dots',
        },
      });
      // close button
      appendTag(this.root, {
        tag: 'button',
        text: '✕',
        attrs: {
          class: 'close',
        },
        lstnrs: {
          click: () => this.toggle(),
        },
      });
      // default plugins
      addEnvPlugins(this);
      addReloadPlugin(this);
      addPublishPlugin(this);
      // custom plugins
      if (this.config.plugins && Array.isArray(this.config.plugins)) {
        this.config.plugins.forEach((plugin) => this.add(plugin));
      }
      if ((this.isHelix() || this.isEditor())
        && (this.config.pluginHost || this.config.innerHost)) {
        const prefix = this.config.pluginHost || (this.isEditor() ? `https://${this.config.innerHost}` : '');
        appendTag(document.head, {
          tag: 'script',
          attrs: {
            src: `${prefix}/tools/sidekick/plugins.js`,
          },
        });
      }
      checkForUpdates(this);
    }

    /**
     * Loads the sidekick configuration based on {@link window.hlx.sidekickConfig}
     * and retrieves the location of the current document.
     * @returns {Sidekick} The sidekick
     */
    loadContext() {
      this.config = initConfig();
      this.location = getLocation();
      return this;
    }

    /**
     * Shows the sidekick.
     * @returns {Sidekick} The sidekick
     */
    show() {
      if (this.root.classList.contains('hlx-sk-hidden')) {
        this.root.classList.remove('hlx-sk-hidden');
      }
      return this;
    }

    /**
     * Hides the sidekick.
     * @returns {Sidekick} The sidekick
     */
    hide() {
      if (!this.root.classList.contains('hlx-sk-hidden')) {
        this.root.classList.add('hlx-sk-hidden');
      }
      this.hideModal();
      return this;
    }

    /**
     * Shows/hides the sidekick.
     * @returns {Sidekick} The sidekick
     */
    toggle() {
      this.root.classList.toggle('hlx-sk-hidden');
      return this;
    }

    /**
     * Adds a plugin to the sidekick.
     * @param {plugin} plugin The plugin configuration.
     * @returns {HTMLElement} The plugin
     */
    add(plugin) {
      if (typeof plugin === 'object') {
        plugin.enabled = typeof plugin.condition === 'undefined'
          || (typeof plugin.condition === 'function' && plugin.condition(this));
        // find existing plugin
        let $plugin = this.get(plugin.id);
        let $pluginContainer = this.root;
        if (ENVS[plugin.id]) {
          // find or create environment plugin container
          $pluginContainer = this.root.querySelector('.env');
          if (!$pluginContainer) {
            $pluginContainer = appendTag(this.root, {
              tag: 'div',
              attrs: {
                class: 'env',
              },
            });
          }
        }
        const pluginCfg = {
          tag: 'div',
          attrs: {
            class: plugin.id,
          },
        };
        if (!$plugin && plugin.enabled) {
          // add new plugin
          $plugin = appendTag($pluginContainer, pluginCfg);
          // remove empty text
          if (this.root.classList.contains('hlx-sk-empty')) {
            this.root.classList.remove('hlx-sk-empty');
          }
        } else if ($plugin) {
          if (!plugin.enabled) {
            // remove existing plugin
            $plugin.remove();
          } else if (plugin.override) {
            // replace existing plugin
            const $existingPlugin = $plugin;
            $plugin = appendTag($existingPlugin.parentElement, pluginCfg, $existingPlugin);
            $existingPlugin.remove();
          }
        }
        if (!plugin.enabled) {
          return null;
        }
        // add elements
        if (Array.isArray(plugin.elements)) {
          plugin.elements.forEach((elem) => appendTag($plugin, elem));
        }
        // add or update button
        if (plugin.button) {
          const buttonCfg = {
            tag: 'button',
            text: plugin.button.text,
            lstnrs: {
              click: plugin.button.action,
              auxclick: plugin.button.action,
            },
          };
          let $button = $plugin ? $plugin.querySelector(buttonCfg.tag) : null;
          if ($button) {
            // extend existing button
            extendTag($button, buttonCfg);
          } else {
            // add button
            $button = appendTag($plugin, buttonCfg);
          }
          // check if button is pressed
          if ((typeof plugin.button.isPressed === 'boolean' && !!plugin.button.isPressed)
            || (typeof plugin.button.isPressed === 'function' && plugin.button.isPressed(this))) {
            $button.classList.add('pressed');
          }
        }
        if (typeof plugin.callback === 'function') {
          plugin.callback(this, $plugin);
        }
        return $plugin;
      }
      return null;
    }

    /**
     * Returns the sidekick plugin with the specified ID.
     * @param {string} id The plugin ID
     * @returns {HTMLElement} The plugin
     */
    get(id) {
      return this.root.querySelector(`.${id}`);
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
      return /.*\.sharepoint\.com/.test(this.location.host)
        || this.location.host === 'docs.google.com';
    }

    /**
     * Checks if the current location is a development URL.
     * @returns {boolean} <code>true</code> if development URL, else <code>false</code>
     */
    isDev() {
      const { location } = this;
      return [
        '', // for unit testing
        'localhost:3000', // for development and browser testing
      ].includes(location.host);
    }

    /**
     * Checks if the current location is an inner CDN URL.
     * @returns {boolean} <code>true</code> if inner CDN URL, else <code>false</code>
     */
    isInner() {
      const { config, location } = this;
      const hasRef = location.host.split('--').length === 3;
      return config.innerHost === location.host
        // match without ref
        || (!hasRef && config.innerHost.endsWith(location.host))
        // match with any ref
        || (hasRef && config.innerHost.endsWith(location.host.substring(location.host.indexOf('--') + 2)));
    }

    /**
     * Checks if the current location is an outer CDN URL.
     * @returns {boolean} <code>true</code> if outer CDN URL, else <code>false</code>
     */
    isOuter() {
      const { config, location } = this;
      return config.outerHost === location.host;
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
     * Checks if the current location is a configured Helix URL.
     * @returns {boolean} <code>true</code> if Helix URL, else <code>false</code>
     */
    isHelix() {
      return this.config.owner && this.config.repo
        && (this.isDev() || this.isInner() || this.isOuter() || this.isProd());
    }

    /**
     * Displays a non-sticky notification.
     * @param {string|string[]} msg The message (lines) to display
     * @param {number}          level error (0), warning (1), of info (2)
     */
    notify(msg, level = 2) {
      this.showModal(msg, false, level);
    }

    /**
     * Displays a modal notification.
     * @param {string|string[]} msg The message (lines) to display
     * @param {boolean}         sticky <code>true</code> if message should be sticky (optional)
     * @param {number}          level error (0), warning (1), of info (2)
     * @returns {Sidekick} The sidekick
     */
    showModal(msg, sticky = false, level = 2) {
      if (!this._modal) {
        const $spinnerWrap = appendTag(document.body, {
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
        this._modal.parentNode.classList.remove('hlx-sk-hidden');
      }
      if (msg) {
        if (Array.isArray(msg)) {
          this._modal.textContent = '';
          msg.forEach((line) => appendTag(this._modal, {
            tag: 'p',
            text: line,
          }));
        } else {
          this._modal.textContent = msg;
        }
        this._modal.className = `modal${level < 2 ? ` level-${level}` : ''}`;
      }
      if (!sticky) {
        const sk = this;
        window.setTimeout(() => {
          sk.hideModal();
        }, 3000);
      } else {
        this._modal.classList.add('wait');
      }
      return this;
    }

    /**
     * Hides the modal if shown.
     * @returns {Sidekick} The sidekick
     */
    hideModal() {
      if (this._modal) {
        this._modal.innerHTML = '';
        this._modal.className = '';
        this._modal.parentNode.classList.add('hlx-sk-hidden');
      }
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
        if (this.config.scriptUrl) {
          href = this.config.scriptUrl.replace('.js', '.css');
        } else {
          const filePath = this.location.pathname;
          href = `${filePath.substring(filePath.lastIndexOf('/') + 1).split('.')[0]}.css`;
        }
      }
      appendTag(document.head, {
        tag: 'link',
        attrs: {
          rel: 'stylesheet',
          href,
        },
      });
      // i18n
      if (!navigator.language.startsWith('en')) {
        // look for language file in same directory
        const langHref = `${href.substring(0, href.lastIndexOf('/'))}/${navigator.language}.css`;
        appendTag(document.head, {
          tag: 'link',
          attrs: {
            rel: 'stylesheet',
            href: langHref,
          },
        });
      }
      return this;
    }

    /**
     * Publishes the page at the specified path if {@code config.host} is defined.
     * @param {string} path The path of the page to publish
     * @param {boolean} innerOnly {@code true} to only refresh inner CDN, else {@code false}
     * @return {publishResponse} The response object
     */
    async publish(path, innerOnly = false) {
      if ((!innerOnly && !this.config.host)
        || (this.config.byocdn && this.location.host === this.config.host)) {
        return null;
      }
      const purgeURL = new URL(path, this.location.href);
      /* eslint-disable no-console */
      console.log(`purging ${purgeURL.href}`);
      const xfh = [this.config.innerHost];
      if (!innerOnly) {
        if (this.config.outerHost) {
          xfh.push(this.config.outerHost);
        }
        if (this.config.host && !this.config.byocdn) {
          xfh.push(this.config.host);
        }
      }
      const resp = await fetch(purgeURL.href, {
        method: 'POST',
        headers: {
          'X-Method-Override': 'HLXPURGE',
          'X-Forwarded-Host': xfh.join(', '),
        },
      });
      const json = await resp.json();
      console.log(JSON.stringify(json));
      /* eslint-enable no-console */
      return {
        ok: resp.ok && Array.isArray(json) && json.every((e) => e.status === 'ok'),
        status: resp.status,
        json,
        path,
      };
    }
  }

  window.hlx = window.hlx || {};
  // launch sidekick
  if (!window.hlx.sidekick) {
    window.hlx.sidekick = new Sidekick().show();
  }
})();
