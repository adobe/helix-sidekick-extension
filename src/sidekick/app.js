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
/* global window, document, navigator, fetch, CustomEvent */
/* eslint-disable no-console, no-alert */

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
   * @typedef {Object} publishResponse
   * @description The response object for a publish action.
   * @prop {boolean} ok     True if publish action was successful, else false
   * @prop {string}  status The status text returned by the publish action
   * @prop {Object}  json   The JSON object returned by the publish action
   * @prop {string}  path   The path of the published page
   */

  /**
   * @typedef {Object} sidekickConfig
   * @description The sidekick configuration.
   * before creating the {@link Sidekick}.
   * @prop {string} owner The GitHub owner or organization (mandatory)
   * @prop {string} repo The GitHub owner or organization (mandatory)
   * @prop {string} ref=main The Git reference or branch (optional)
   * @prop {string} project The name of the Helix project used in the sharing link (optional)
   * @prop {plugin[]} plugins An array of plugin configurations (optional)
   * @prop {string} host The production host name to publish content to (optional)
   * @prop {boolean} byocdn=false <pre>true</pre> if the production host is a 3rd party CDN
   * @prop {boolean} hlx3=false <pre>true</pre> if the project is running on Helix 3
   * @prop {boolean} devMode=false Loads configuration and plugins from the developmemt environment
   */

  /**
   * @external
   * @name "window.hlx.sidekickConfig"
   * @type {sidekickConfig}
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
   * @description The <pre>script</pre> element which loaded the sidekick application.
   */

  /**
   * @event Sidekick#shown
   * @type {Sidekick} The sidekick
   * @description This event is fired when the sidekick has been shown.
   */

  /**
   * @event Sidekick#hidden
   * @type {Sidekick} The sidekick
   * @description This event is fired when the sidekick has been hidden.
   */

  /**
   * @event Sidekick#pluginused
   * @type {Object} The plugin used
   * @property {string} id The plugin ID
   * @property {Element} button The button element
   * @description This event is fired when a sidekick plugin has been used.
   */

  /**
   * @event Sidekick#contextloaded
   * @type {Object} The context object
   * @property {sidekickConfig} config The sidekick configuration
   * @property {Location} location The sidekick location
   * @description This event is fired when the context has been loaded.
   */

  /**
   * @event Sidekick#statusfetched
   * @type {Object} The status object
   * @description This event is fired when the status has been fetched.
   */

  /**
   * @event Sidekick#envswitched
   * @type {Object} The environment object
   * @property {string} sourceUrl The URL of the source environment
   * @property {string} targetUrl The URL of the target environment
   * @description This event is fired when the environment has been switched
   */

  /**
   * @event Sidekick#updated
   * @type {string} The updated path
   * @description This event is fired when a path has been updated.
   */

  /**
   * @event Sidekick#published
   * @type {string} The published path
   * @description This event is fired when a path has been published.
   */

  /**
   * Mapping between the plugin IDs that will be treated as environments
   * and their corresponding host properties in the config.
   * @private
   * @type {Object}
   */
  const ENVS = {
    edit: 'editor',
    preview: 'innerHost',
    live: 'outerHost',
    prod: 'host',
  };

  /**
   * The URL of the development environment.
   * @see {@link https://github.com/adobe/helix-cli|Helix CLI}).
   * @private
   * @type {URL}
   */
  const DEV_URL = new URL('http://localhost:3000');

  /**
   * Returns a hash code for the specified string.
   * Source: http://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
   * @param {*} str The source string
   * @returns {number} The hash code
   */
  function hashCode(str = '') {
    let hash = 0;
    let i;
    let chr;
    if (str.length === 0) return hash;
    for (i = 0; i < str.length; i += 1) {
      chr = str.charCodeAt(i);
      /* eslint-disable no-bitwise */
      hash = ((hash << 5) - hash) + chr;
      hash |= 0; // Convert to 32bit integer
      /* eslint-enable no-bitwise */
    }
    return hash;
  }

  /**
   * Returns the sidekick configuration.
   * @private
   * @param {sidekickConfig} cfg The sidekick config (defaults to {@link window.hlx.sidekickConfig})
   * @returns {Object} The sidekick configuration
   */
  function initConfig(cfg) {
    const config = cfg || (window.hlx && window.hlx.sidekickConfig) || {};
    const {
      owner,
      repo,
      ref = 'main',
      host,
      project,
      // if hlx3 flag unset, check for known hlx3 repos
      hlx3 = [974752171, -1149574338].includes(hashCode(repo)),
    } = config;
    const innerPrefix = owner && repo ? `${ref}--${repo}--${owner}` : null;
    const publicHost = host && host.startsWith('http') ? new URL(host).host : host;
    const scriptUrl = window.hlx.sidekickScript && window.hlx.sidekickScript.src;
    let innerHost;
    if (hlx3) {
      innerHost = 'hlx3.page';
    }
    if (!innerHost && scriptUrl) {
      // get hlx domain from script src (used for branch deployment testing)
      const scriptHost = new URL(scriptUrl).host;
      if (scriptHost && scriptHost !== 'www.hlx.live' && !scriptHost.startsWith(DEV_URL.host)) {
        // keep only 1st and 2nd level domain
        innerHost = scriptHost.split('.')
          .reverse()
          .splice(0, 2)
          .reverse()
          .join('.');
      }
    }
    if (!innerHost) {
      // fall back to hlx.page
      innerHost = 'hlx.page';
    }
    innerHost = innerPrefix ? `${innerPrefix}.${innerHost}` : null;
    const outerHost = publicHost && owner && repo ? `${repo}--${owner}.hlx.live` : null;
    return {
      ...cfg,
      ref,
      innerHost,
      outerHost,
      purgeHost: innerHost, // backward compatibility
      scriptUrl,
      host: publicHost,
      project: project || '',
      hlx3,
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
   * @param {string} from The URL of the referrer page
   * @returns {string} The share URL
   */
  function getShareUrl(config, from) {
    const shareUrl = new URL('https://www.hlx.live/tools/sidekick/');
    shareUrl.search = new URLSearchParams([
      ['project', config.project || ''],
      ['from', from || ''],
      ['giturl', `https://github.com/${config.owner}/${config.repo}/tree/${config.ref}`],
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
   * Checks for sidekick updates and informs the user.
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
      typeof window.hlxSidekickConfig === 'object' || sk.config.compatMode,
      // legacy script host
      !sk.config.scriptUrl || new URL(sk.config.scriptUrl).host === 'www.hlx.page',
      // update flag
      sk.updateRequired,
    ];
    if (indicators.includes(true)) {
      window.setTimeout(() => {
        if (window.confirm('Apologies, but we need you to update your Helix Sidekick Bookmarklet before you can continue …\n\nLast time, promised!')) {
          sk.showModal('Please wait …', true);
          window.location.href = getShareUrl(sk.config, sk.location.href);
        }
      }, 1000);
    }
  }

  /**
   * Fires an event with the given name.
   * @private
   * @param {Sidekick} sk The sidekick
   * @param {string} name The name of the event
   * @param {Object} data The data to pass to event listeners (defaults to {@link Sidekick})
   */
  function fireEvent(sk, name, data) {
    try {
      sk.root.dispatchEvent(new CustomEvent(name, {
        detail: {
          data: data || sk,
        },
      }));
    } catch (e) {
      console.warn('failed to fire event', name, data);
    }
  }

  /**
   * Compares source and preview last modified dates.
   * @private
   * @param {Sidekick} sidekick The sidekick
   */
  async function checkLastModified({ detail = {} }) {
    const { data: status = {} } = detail;
    const pLastMod = (status.preview && status.preview.lastModified) || null;
    const sLastMod = (status.source && status.source.lastModified) || null;
    console.log('preview up to date?', new Date(pLastMod) > new Date(sLastMod));
    // TODO: do something with it
  }

  /**
   * Determines whether to open a new tab or reuse the existing window.
   * @private
   * @param {Event} evt The event
   * @returns <pre>true</pre> if a new tab should be opened, else <pre>false</pre>
   */
  function newTab(evt) {
    return evt.metaKey || evt.shiftKey || evt.which === 2;
  }

  /**
   * Creates an Admin URL for an API and path.
   * @private
   * @param {Object} config The sidekick configuration
   * @param {string} api The API endpoint to call
   * @param {string} path The current path
   * @returns {string} The admin URL
   */
  function getAdminUrl({ owner, repo, ref }, api, path) {
    return new URL([
      'https://admin.hlx3.page/',
      api,
      `/${owner}`,
      `/${repo}`,
      `/${ref}`,
      path,
    ].join(''));
  }

  /**
   * Check for Helix 3 related issues.
   * @private
   * @param {Sidekick} sk The sidekick
   */
  async function checkForHelix3(sk) {
    // check if sidekick config needs to be updated to hlx3
    if (!sk.config.hlx3 && sk.location.hostname.endsWith('hlx3.page')) {
      window.setTimeout(() => {
        if (window.confirm('This Helix Sidekick Bookmarklet is unable to deal with a Helix 3 site.\n\nPress OK to install one for Helix 3 now.')) {
          sk.showModal('Please wait …', true);
          // set hlx3 flag temporarily
          sk.config.hlx3 = true;
          window.location.href = getShareUrl(sk.config, sk.location.href);
        }
      }, 1000);
    }
    // check if current inner cdn url is hlx3 url
    if (sk.config.hlx3
      && sk.location.hostname.endsWith('.page')
      && !sk.location.hostname.endsWith('hlx3.page')) {
      if (window.confirm('This Helix Sidekick Bookmarklet can only work on a Helix 3 site.\n\nPress OK to be taken to the Helix 3 version of this page now.')) {
        sk.switchEnv('preview');
      }
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
          sk.switchEnv('edit', newTab(evt));
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
          sk.switchEnv('preview', newTab(evt));
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
          sk.switchEnv('live', newTab(evt));
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
          sk.switchEnv('prod', newTab(evt));
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
          sk.showModal('Please wait …', true);
          try {
            const resp = await sk.update(location.pathname);
            if (!resp.ok && resp.status >= 400) {
              console.error(resp);
              throw new Error(resp);
            }
            console.log(`reloading ${location.href}`);
            if (newTab(evt)) {
              window.open(window.location.href);
              sk.hideModal();
            } else {
              window.location.reload();
            }
          } catch (e) {
            sk.showModal(
              `Failed to reload ${location.pathname}. Please try again later.`,
              true,
              0,
            );
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
          const results = await Promise.all(urls.map((url) => sk.publish(url)));
          if (results.every((res) => res && res.ok)) {
            sk.showModal('Please wait …', true);
            // fetch and redirect to production
            const prodURL = `https://${config.byocdn ? config.outerHost : config.host}${path}`;
            await fetch(prodURL, { cache: 'reload', mode: 'no-cors' });
            console.log(`redirecting to ${prodURL}`);
            if (newTab(evt)) {
              window.open(prodURL);
              sk.hideModal();
            } else {
              window.location.href = prodURL;
            }
          } else {
            console.error(results);
            sk.showModal('Failed to publish page. Please try again later.', true, 0);
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
     * Creates a new sidekick.
     * @param {sidekickConfig} cfg The sidekick config
     */
    constructor(cfg) {
      this.root = appendTag(document.body, {
        tag: 'div',
        attrs: {
          class: 'hlx-sk hlx-sk-hidden hlx-sk-empty',
        },
        lstnrs: {
          statusfetched: checkLastModified,
        },
      });
      this.status = {};
      this.loadContext(cfg);
      this.fetchStatus();
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
          click: () => this.hide(),
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
      if (this.config.compatMode
        && (this.isHelix() || this.isEditor())
        && (this.config.devMode || this.config.innerHost)) {
        // load custom plugins in compatibility mode
        let prefix = (this.isEditor() ? `https://${this.config.innerHost}` : '');
        if (this.config.devMode || this.config.pluginHost) {
          // TODO: remove support for pluginHost
          if (this.config.pluginHost) {
            console.warn('pluginHost is deprecated, use devMode instead');
          }
          prefix = this.config.pluginHost || DEV_URL.origin;
        }
        appendTag(document.head, {
          tag: 'script',
          attrs: {
            src: `${prefix}/tools/sidekick/plugins.js`,
          },
        });
      }
      checkForHelix3(this);
      checkForUpdates(this);
    }

    /**
     * Fetches the status for the current resource.
     * @fires Sidekick#statusfetched
     * @returns {Sidekick} The sidekick
     */
    async fetchStatus() {
      const { owner, repo, ref } = this.config;
      if (!owner || !repo || !ref) {
        return this;
      }
      if (!this.status.apiUrl) {
        const { href, pathname } = this.location;
        const apiUrl = getAdminUrl(this.config, 'preview', this.isEditor() ? '/' : pathname);
        if (this.isEditor()) {
          apiUrl.search = new URLSearchParams([
            ['editUrl', href],
          ]).toString();
        }
        this.status.apiUrl = apiUrl.toString();
      }
      fetch(this.status.apiUrl, { cache: 'no-store' })
        .then((resp) => resp.json())
        .then((json) => Object.assign(this.status, json))
        .then((json) => fireEvent(this, 'statusfetched', json))
        .catch((e) => console.error('failed to fetch status', e));
      return this;
    }

    /**
     * Loads the sidekick configuration and retrieves the location of the current document.
     * @param {sidekickConfig} cfg The sidekick config
     * @fires Sidekick#contextloaded
     * @returns {Sidekick} The sidekick
     */
    loadContext(cfg) {
      this.config = initConfig(cfg);
      this.location = getLocation();
      fireEvent(this, 'contextloaded', {
        config: this.config,
        location: this.location,
      });
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
      this.hideModal();
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
          $pluginContainer = this.root.querySelector(':scope .env');
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
          // check if button is pressed
          if ((typeof plugin.button.isPressed === 'boolean' && !!plugin.button.isPressed)
            || (typeof plugin.button.isPressed === 'function' && plugin.button.isPressed(this))) {
            $button.classList.add('pressed');
          }
          // fire event when plugin button is clicked
          $button.addEventListener('click', () => fireEvent(this, 'pluginused', {
            id: plugin.id,
            button: $button,
          }));
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
      return this.root.querySelector(`:scope .${id}`);
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
        DEV_URL.host, // for development and browser testing
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
     * @fires Sidekick#modalshown
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
        this._modal.parentNode.classList.add('hlx-sk-hidden');
        fireEvent(this, 'modalhidden');
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
     * Switches to (or opens) a given environment.
     * @param {string} targetEnv One of the following environments:
     *        <pre>edit</pre>, <pre>preview</pre>, <pre>live</pre> or <pre>prod</pre>
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
      this.showModal('Please wait …', true);
      if (!this.status.webPath) {
        console.log('not ready yet, trying again in a second ...');
        window.setTimeout(() => this.switchEnv(targetEnv, open), 1000);
        return this;
      }
      let envUrl;
      if (targetEnv === 'edit' && this.status.edit && this.status.edit.url) {
        envUrl = this.status.edit.url;
      } else {
        envUrl = `https://${this.config[hostType]}${this.status.webPath}`;
        if (targetEnv === 'preview' && this.isEditor()) {
          this.update(this.status.webPath);
        }
      }
      if (!envUrl) {
        this.showModal('Failed to switch environment. Please try again later.', true, 0);
        return this;
      }
      fireEvent(this, 'envswitched', {
        sourceUrl: this.location.href,
        targetUrl: envUrl,
      });
      // switch or open env
      if (open) {
        window.open(envUrl);
        this.hideModal();
      } else {
        window.location.href = envUrl;
      }
      return this;
    }

    /**
     * Reloads the page at the specified path.
     * @deprecated since v3.2.0. use {@link update} instead
     * @param {string} path The path of the page to purge
     * @return {Response} The response object
     */
    async reload(path) {
      console.log('reload() is deprecated, use update() instead.');
      return this.update(path);
    }

    /**
     * Updates the preview resource at the specified path.
     * @param {string} path The path of the resource to refresh
     * @fires Sidekick#updated
     * @return {Response} The response object
     */
    async update(path) {
      const { config } = this;
      let resp;
      try {
        if (config.hlx3) {
          // update preview
          resp = await fetch(getAdminUrl(config, 'preview', path), { method: 'POST' });
        } else {
          resp = await this.publish(path, true);
        }
        if (this.isInner() || this.isDev()) {
          // bust client cache
          await fetch(`https://${config.innerHost}${path}`, { cache: 'reload', mode: 'no-cors' });
        }
      } catch (e) {
        console.error('failed to update', path, e);
      }
      fireEvent(this, 'updated', path);
      return {
        ok: (resp && resp.ok) || false,
        status: (resp && resp.status) || 0,
        path,
      };
    }

    /**
     * Publishes the page at the specified path if <pre>config.host</pre> is defined.
     * @param {string} path The path of the page to publish
     * @param {boolean} innerOnly <pre>true</pre> to only refresh inner CDN, else <pre>false</pre>
     * @fires Sidekick#published
     * @return {publishResponse} The response object
     */
    async publish(path, innerOnly = false) {
      const { config, location } = this;

      if ((!innerOnly && !config.host)
        || (config.byocdn && location.host === config.host)) {
        return null;
      }

      const purgeURL = new URL(path, this.isEditor() ? `https://${config.innerHost}/` : location.href);
      let ok;
      let status;
      let json;

      if (config.hlx3) {
        console.log(`publishing ${purgeURL.pathname}`);
        const resp = await fetch(getAdminUrl(config, 'live', purgeURL.pathname), { method: 'POST' });
        ok = resp.ok;
        status = resp.status;
      } else {
        console.log(`purging ${purgeURL.href}`);
        const xfh = [config.innerHost];
        if (!innerOnly) {
          if (config.outerHost) {
            xfh.push(config.outerHost);
          }
          if (config.host && !config.byocdn) {
            xfh.push(config.host);
          }
        }
        const resp = await fetch(purgeURL, {
          method: 'POST',
          headers: {
            'X-Method-Override': 'HLXPURGE',
            'X-Forwarded-Host': xfh.join(', '),
          },
        });
        json = await resp.json();
        console.log(JSON.stringify(json));
        ok = resp.ok && Array.isArray(json) && json.every((e) => e.status === 'ok');
        status = resp.status;
      }
      fireEvent(this, 'published', path);
      return {
        ok,
        status,
        json: json || {},
        path,
      };
    }

    /**
     * Sets up a function that will be called whenever the specified sidekick
     * event is fired.
     * @param {string} type The event type
     * @param {Function} listener The function to call
     */
    addEventListener(type, listener) {
      this.root.addEventListener(type, listener);
    }

    /**
     * Removes an event listener previously registered with {@link addEventListener}.
     * @param {string} type The event type
     * @param {Function} listener The function to remove
     */
    removeEventListener(name, listener) {
      this.root.removeEventListener(name, listener);
    }
  }

  /**
   * @external
   * @name "window.hlx.initSidekick"
   * @type {Function}
   * @description Initializes the sidekick and stores a reference to it in
   *              {@link window.hlx.sidekick}.
   * @param {Object} cfg The sidekick configuration (extends {@link window.hlx.sidekickConfig})
   * @returns {Sidekick} The sidekick
   */
  function initSidekick(cfg = {}) {
    // merge base config with extended config
    window.hlx.sidekickConfig = Object.assign(window.hlx.sidekickConfig || {}, cfg);
    if (!window.hlx.sidekick) {
      // init and show sidekick
      window.hlx.sidekick = new Sidekick(window.hlx.sidekickConfig).show();
    } else {
      // reload context and toggle sidekick
      window.hlx.sidekick.loadContext(window.hlx.sidekickConfig).toggle();
    }
    return window.hlx.sidekick;
  }

  /**
   * Initializes the sidekick in compatibility mode.
   * @private
   * @returns {Sidekick} The sidekick
   */
  function initSidekickCompatMode() {
    window.hlx.sidekickScript = document.querySelector('script[src$="/sidekick/app.js"]');
    window.hlx.sidekickConfig = window.hlx.sidekickConfig || {};
    window.hlx.sidekickConfig.compatMode = true;
    return initSidekick();
  }

  window.hlx = window.hlx || {};
  window.hlx.initSidekick = initSidekick;
  const appScript = document.getElementById('hlx-sk-app');
  if (!appScript) {
    initSidekickCompatMode();
  } else {
    // get base config from script data attribute while
    const baseConfig = appScript
      && appScript.dataset.config
      && JSON.parse(appScript.dataset.config);
    if (typeof baseConfig !== 'object') {
      initSidekickCompatMode();
    } else {
      window.hlx.sidekickScript = appScript;
      // merge base config with potential pre-existing config
      window.hlx.sidekickConfig = Object.assign(
        window.hlx.sidekickConfig || {}, baseConfig,
      );
      // extract and validate base config
      const {
        owner, repo, ref = 'main', devMode,
      } = baseConfig;
      if (owner && repo) {
        // look for extended config in project
        const configOrigin = devMode ? DEV_URL.origin : `https://${ref}--${repo}--${owner}.hlx.page`;
        const configScript = document.createElement('script');
        configScript.id = 'hlx-sk-config';
        configScript.src = `${configOrigin}/tools/sidekick/config.js`;
        configScript.referrerpolicy = 'no-referrer';
        configScript.addEventListener('error', () => {
          // init sidekick without extended config
          console.info(`no sidekick config found at ${configScript.src}`);
          initSidekick();
        });
        // init sidekick via project config
        if (document.getElementById(configScript.id)) {
          document.getElementById(configScript.id).replaceWith(configScript);
        } else {
          document.head.append(configScript);
        }
      }
    }
  }
})();
