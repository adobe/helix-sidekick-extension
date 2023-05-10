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

import { RESTRICTED_PATHS, globToRegExp } from './utils.js';
import {
  appendTag,
  createTag,
  i18n,
  newTab,
} from './ui.js';
import { fireEvent } from './events.js';
import { sampleRUM } from './rum.js';

/**
 * @typedef {Object} PluginButton
 * @private
 * @description The configuration for a plugin button. This can be used as
 * a shorthand for {@link elemConfig}.
 * @prop {string}   text   The button text
 * @prop {Function} action The click listener
 * @prop {Function} isPressed=false Determines whether the button is pressed
 * @prop {Function} isEnabled=true Determines whether to enable the button
 * @prop {boolean}  isDropdown=false Determines whether to turn this button into a dropdown
 */

/**
 * @typedef {Object} _Plugin
 * @private
 * @description The internal plugin configuration.
 * @prop {string}       id        The plugin ID (mandatory)
 * @prop {PluginButton} button    A button configuration object (optional)
 * @prop {string}       container The ID of a dropdown to add this plugin to (optional)
 * @prop {boolean}      feature=false Determines whether to group this plugin with the features
 * @prop {boolean}      override=false Determines whether to replace an existing plugin
 * @prop {ElemConfig[]} elements  An array of elements to add (optional)
 * @prop {Function}     condition Determines whether to show this plugin (optional).
 * This function is expected to return a boolean when called with the sidekick as argument.
 * @prop {Function}     advanced  Show this plugin only in advanced mode (optional).
 * This function is expected to return a boolean when called with the sidekick as argument.
 * @prop {Function}     callback  A function called after adding the plugin (optional).
 * This function is called with the sidekick and the newly added plugin as arguments.
 */

/**
 * @typedef {Object} Plugin
 * @description The plugin configuration.
 * @prop {string} id The plugin ID (mandatory)
 * @prop {string} title The button text
 * @prop {Object} titleI18n={} A map of translated button texts
 * @prop {string} url The URL to open when the button is clicked
 * @prop {boolean} passConfig Append additional sk info to the url as query parameters:
 *                          ref, repo, owner, host, project
 * @prop {boolean} passReferrer Append the referrer URL as a query param on new URL button click
 * @prop {string} event The name of a custom event to fire when the button is clicked.
 *                      Note: Plugin events get a custom: prefix, e.g. "foo" becomes "custom:foo".
 * @prop {string} containerId The ID of a dropdown to add this plugin to (optional)
 * @prop {boolean} isContainer Determines whether to turn this plugin into a dropdown
 * @prop {boolean} isPalette Determines whether a URL is opened in a palette instead of a new tab
 * @prop {string} paletteRect The dimensions and position of a palette (optional)
 * @prop {string[]} environments Specifies when to show this plugin
 *                               (admin, edit, dev, preview, live, prod)
 * @prop {string[]} excludePaths Exclude the plugin from these paths (glob patterns supported)
 * @prop {string[]} includePaths Include the plugin on these paths (glob patterns supported)
 */

/**
 * Registers a plugin for re-evaluation if it should be shown or hidden,
 * and if its button should be enabled or disabled.
 * @private
 * @param {Sidekick} sk The sidekick
 * @param {Plugin} plugin The plugin configuration
 * @param {HTMLElement} $plugin The plugin
 * @returns {HTMLElement} The plugin or {@code null}
 */
export function registerPlugin(sk, plugin, $plugin) {
  // re-evaluate plugin when status fetched
  sk.addEventListener('statusfetched', () => {
    if (typeof plugin.condition === 'function') {
      if ($plugin && !plugin.condition(sk)) {
        // plugin exists but condition now false
        sk.remove(plugin.id);
      } else if (!$plugin && plugin.condition(sk)) {
        // plugin doesn't exist but condition now true
        sk.add(plugin);
      }
    }
    const isEnabled = plugin.button && plugin.button.isEnabled;
    if (typeof isEnabled === 'function') {
      const $button = $plugin && $plugin.querySelector(':scope button');
      if ($button) {
        if (isEnabled(sk)) {
          // button enabled
          $plugin.querySelector(':scope button').removeAttribute('disabled');
        } else {
          // button disabled
          $plugin.querySelector(':scope button').setAttribute('disabled', '');
        }
      }
    }
  });
  if (typeof plugin.callback === 'function') {
    plugin.callback(sk, $plugin);
  }
  return $plugin || null;
}

/**
 * Adds the edit plugin to the sidekick.
 * @private
 * @param {Sidekick} sk The sidekick
 */
function addEditPlugin(sk) {
  sk.add({
    id: 'edit',
    condition: (sidekick) => !sidekick.isEditor() && sidekick.isProject(),
    button: {
      text: i18n(sk, 'edit'),
      action: async () => {
        const { config, status } = sk;
        const editUrl = status.edit && status.edit.url;
        window.open(
          editUrl,
          `hlx-sk-edit--${config.owner}/${config.repo}/${config.ref}${status.webPath}`,
        );
      },
      isEnabled: (sidekick) => sidekick.status.edit && sidekick.status.edit.url,
    },
  });
}

/**
 * Adds the preview plugin to the sidekick.
 * @private
 * @param {Sidekick} sk The sidekick
 */
function addPreviewPlugin(sk) {
  sk.add({
    id: 'edit-preview',
    condition: (sidekick) => sidekick.isEditor(),
    button: {
      text: i18n(sk, 'preview'),
      action: async (evt) => {
        const { status } = sk;
        sk.showWait();
        const updatePreview = async (ranBefore) => {
          const resp = await sk.update();
          if (!resp.ok) {
            if (!ranBefore) {
              // assume document has been renamed, re-fetch status and try again
              sk.addEventListener('statusfetched', async () => {
                updatePreview(true);
              }, { once: true });
              sk.fetchStatus();
            } else if (status.webPath.startsWith('/.helix/') && resp.error) {
              // show detail message only in config update mode
              sk.showModal({
                message: `${i18n(sk, 'error_config_failure')}${resp.error}`,
                sticky: true,
                level: 0,
              });
            } else {
              console.error(resp);
              sk.showModal({
                message: i18n(sk, 'error_preview_failure'),
                sticky: true,
                level: 0,
              });
            }
            return;
          }
          // handle special case /.helix/*
          if (status.webPath.startsWith('/.helix/')) {
            sk.showModal({
              message: i18n(sk, 'preview_config_success'),
            });
            return;
          }
          sk.switchEnv('preview', newTab(evt));
        };
        if (status.edit && status.edit.sourceLocation
          && status.edit.sourceLocation.startsWith('onedrive:')
          && status.edit.contentType && status.edit.contentType.includes('word')) {
          // show ctrl/cmd + s hint on onedrive docs
          const mac = navigator.platform.toLowerCase().includes('mac') ? '_mac' : '';
          sk.showModal(i18n(sk, `preview_onedrive${mac}`));
        } else if (status.edit.sourceLocation?.startsWith('gdrive:')) {
          const { contentType } = status.edit;

          const isGoogleDocMime = contentType === 'application/vnd.google-apps.document';
          const isGoogleSheetMime = contentType === 'application/vnd.google-apps.spreadsheet';
          const neitherGdocOrGSheet = !isGoogleDocMime && !isGoogleSheetMime;

          if (neitherGdocOrGSheet) {
            const isMsDocMime = contentType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
            const isMsExcelSheet = contentType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            let errorKey = 'error_preview_not_gdoc_generic'; // show generic message by default
            if (isMsDocMime) {
              errorKey = 'error_preview_not_gdoc_ms_word';
            } else if (isMsExcelSheet) {
              errorKey = 'error_preview_not_gsheet_ms_excel';
            }
            sk.showModal({
              message: i18n(sk, errorKey),
              sticky: true,
              level: 0,
            });

            return;
          }
        }
        updatePreview();
      },
      isEnabled: (sidekick) => sidekick.isAuthorized('preview', 'write')
        && sidekick.status.webPath,
    },
    callback: (sidekick, plugin) => {
      sk.addEventListener('statusfetched', () => {
        // show update indicator if source newer than preview
        const { status } = sidekick;
        const editLastMod = (status.edit && status.edit.lastModified) || null;
        const previewLastMod = (status.preview && status.preview.lastModified) || null;
        if (plugin && editLastMod
          && (!previewLastMod || new Date(editLastMod) > new Date(previewLastMod))) {
          plugin.classList.add('update');
        }
      });
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
      text: i18n(sk, 'reload'),
      action: async (evt) => {
        sk.showWait();
        try {
          const resp = await sk.update();
          if (!resp.ok && resp.status >= 400) {
            console.error(resp);
            throw new Error(resp);
          }
          console.log(`reloading ${window.location.href}`);
          if (newTab(evt)) {
            window.open(window.location.href);
            sk.hideModal();
          } else {
            window.location.reload();
          }
        } catch (e) {
          sk.showModal({
            message: i18n(sk, 'reload_failure'),
            sticky: true,
            level: 0,
          });
        }
      },
      isEnabled: (s) => s.isAuthorized('preview', 'write')
        && s.status.edit && s.status.edit.url, // enable only if edit url exists
    },
    callback: (sidekick, plugin) => {
      sk.addEventListener('statusfetched', () => {
        // show update indicator if source newer than preview
        const { status } = sidekick;
        const editLastMod = (status.edit && status.edit.lastModified) || null;
        const previewLastMod = (status.preview && status.preview.lastModified) || null;
        if (plugin && editLastMod
          && (!previewLastMod || new Date(editLastMod) > new Date(previewLastMod))) {
          plugin.classList.add('update');
        }
      });
    },
  });
}

/**
 * Adds the delete plugin to the sidekick.
 * @private
 * @param {Sidekick} sk The sidekick
 */
function addDeletePlugin(sk) {
  sk.add({
    id: 'delete',
    condition: (sidekick) => sidekick.isAuthorized('preview', 'delete') && sidekick.isProject()
      && (!sidekick.status.edit || !sidekick.status.edit.url) // show only if no edit url and
      && (sidekick.status.preview && sidekick.status.preview.status !== 404) // preview exists
      && !RESTRICTED_PATHS.includes(sidekick.location.pathname),
    button: {
      text: i18n(sk, 'delete'),
      action: async () => {
        const { location, status } = sk;
        // double check
        if (status.edit && status.edit.url) {
          window.alert(sk.isContent()
            ? 'This page still has a source document and cannot be deleted.'
            : 'This file still exists in the repository and cannot be deleted.');
          return;
        }
        // have user confirm deletion
        if (window.confirm(`${sk.isContent()
          ? 'This page no longer has a source document'
          : 'This file no longer exists in the repository'}, deleting it cannot be undone!\n\nAre you sure you want to delete it?`)) {
          try {
            const resp = await sk.delete();
            if (!resp.ok && resp.status >= 400) {
              console.error(resp);
              throw new Error(resp);
            }
            console.log(`redirecting to ${location.origin}/`);
            window.location.href = `${location.origin}/`;
          } catch (e) {
            sk.showModal({
              message: i18n(sk, 'delete_failure'),
              sticky: true,
              level: 0,
            });
          }
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
    condition: (sidekick) => sidekick.isProject() && sk.isContent(),
    button: {
      text: i18n(sk, 'publish'),
      action: async (evt) => {
        const { config, location } = sk;
        const path = location.pathname;
        sk.showWait();
        let urls = [path];
        // purge dependencies
        if (Array.isArray(window.hlx.dependencies)) {
          urls = urls.concat(window.hlx.dependencies);
        }
        const results = await Promise.all(urls.map((url) => sk.publish(url)));
        if (results.every((res) => res && res.ok)) {
          // fetch and redirect to production
          const redirectHost = config.host || config.outerHost;
          const prodURL = `https://${redirectHost}${path}`;
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
          sk.showModal({
            message: i18n(sk, 'publish_failure'),
            sticky: true,
            level: 0,
          });
        }
      },
      isEnabled: (sidekick) => sidekick.isAuthorized('live', 'write') && sidekick.status.edit
        && sidekick.status.edit.url, // enable only if edit url exists
    },
    callback: (sidekick, plugin) => {
      sk.addEventListener('statusfetched', () => {
        // show update indicator if preview newer than live
        const { status } = sidekick;
        const previewLastMod = (status.preview && status.preview.lastModified) || null;
        const liveLastMod = (status.live && status.live.lastModified) || null;
        if (plugin && (!liveLastMod
          || (previewLastMod && new Date(liveLastMod) < new Date(previewLastMod)))) {
          plugin.classList.add('update');
        }
      });
    },
  });
}

/**
 * Adds the unpublish plugin to the sidekick.
 * @private
 * @param {Sidekick} sk The sidekick
 */
function addUnpublishPlugin(sk) {
  sk.add({
    id: 'unpublish',
    condition: (sidekick) => sidekick.isAuthorized('live', 'delete') && sidekick.isProject()
      && (!sidekick.status.edit || !sidekick.status.edit.url) // show only if no edit url and
      && sidekick.status.live && sidekick.status.live.lastModified // published
      && sk.isContent() && !RESTRICTED_PATHS.includes(sidekick.location.pathname),
    button: {
      text: i18n(sk, 'unpublish'),
      action: async () => {
        const { status } = sk;
        // double check
        if (status.edit && status.edit.url) {
          window.alert('This page has a source document and cannot be unpublished.');
          return;
        }
        // have user confirm unpublishing
        if (window.confirm('This page no longer has a source document, unpublishing it cannot be undone!\n\nAre you sure you want to unpublish it?')) {
          const path = status.webPath;
          try {
            const resp = await sk.unpublish();
            if (!resp.ok && resp.status >= 400) {
              console.error(resp);
              throw new Error(resp);
            }
            if (!sk.isInner()) {
              const newPath = `${path.substring(0, path.lastIndexOf('/'))}/`;
              console.log(`redirecting to ${newPath}`);
              window.location.href = newPath;
            }
          } catch (e) {
            sk.showModal({
              message: i18n(sk, 'unpublish_failure'),
              sticky: true,
              level: 0,
            });
          }
        }
      },
    },
  });
}

/**
 * Adds the default plugins to the sidekick.
 * @private
 * @param {Sidekick} sk The sidekick
 */
export async function addPlugins(sk) {
  addEditPlugin(sk);
  addPreviewPlugin(sk);
  addReloadPlugin(sk);
  addPublishPlugin(sk);
  addDeletePlugin(sk);
  addUnpublishPlugin(sk);
  if (sk.isAdmin()) {
    const { addBulkPlugins } = await import('./bulk.js');
    addBulkPlugins(sk);
  }
}

/**
 * Checks the plugins based on the status of the current resource.
 * @private
 * @param {Sidekick} sk The sidekick
 */
export function checkPluginsState(sk) {
  window.setTimeout(() => {
    if (!sk.pluginContainer.querySelector(':scope div.plugin')) {
      // add empty text
      sk.pluginContainer.innerHTML = '';
      sk.pluginContainer.append(createTag({
        tag: 'span',
        text: i18n(sk, 'plugins_empty'),
        attrs: {
          class: 'hlx-sk-label',
        },
      }));
      sk.checkPushDownContent();
    }
  }, 5000);
  sk.checkPushDownContent();
}

/**
 * Adds custom plugins to the sidekick.
 * @private
 * @param {Sidekick} sk The sidekick
 */
export function addCustomPlugins(sk) {
  const { location, config: { plugins, innerHost } = {} } = sk;
  const language = navigator.language.split('-')[0];
  if (plugins && Array.isArray(plugins)) {
    plugins.forEach((cfg, i) => {
      if (typeof (cfg.button && cfg.button.action) === 'function'
        || typeof cfg.condition === 'function') {
        // add legacy plugin
        sk.add(cfg);
      } else {
        const {
          id,
          title,
          titleI18n,
          url,
          passConfig,
          passReferrer,
          isPalette,
          paletteRect,
          event: eventName,
          environments,
          excludePaths,
          includePaths,
          containerId,
          isContainer,
        } = cfg;
        const condition = (s) => {
          let excluded = false;
          const pathSearchHash = location.href.replace(location.origin, '');
          if (excludePaths && Array.isArray(excludePaths)
            && excludePaths.some((glob) => globToRegExp(glob).test(pathSearchHash))) {
            excluded = true;
          }
          if (includePaths && Array.isArray(includePaths)
            && includePaths.some((glob) => globToRegExp(glob).test(pathSearchHash))) {
            excluded = false;
          }
          if (excluded) {
            // excluding plugin
            return false;
          }
          if (!environments || environments.includes('any')) {
            return true;
          }
          const envChecks = {
            dev: s.isDev,
            edit: s.isEditor,
            preview: s.isInner,
            live: s.isOuter,
            prod: s.isProd,
          };
          return environments.some((env) => envChecks[env] && envChecks[env].call(s));
        };
        const existingPlugin = sk.get(id);
        if (existingPlugin) {
          // extend existing plugin
          if (!condition(sk)) {
            sk.remove(id);
          }
        } else {
          // check mandatory properties
          let missingProperty = '';
          // plugin config not extending existing plugin
          if (!title) {
            missingProperty = 'title';
          } else if (!(url || eventName || isContainer)) {
            missingProperty = 'url, event, or isContainer';
          }
          if (missingProperty) {
            console.log(`plugin config missing required property: ${missingProperty}`, cfg);
            return;
          }
        }
        // assemble plugin config
        const plugin = {
          id: id || `custom-plugin-${i}`,
          condition,
          button: {
            text: (titleI18n && titleI18n[language]) || title,
            action: () => {
              if (url) {
                const target = url.startsWith('/') ? new URL(url, `https://${innerHost}/`) : new URL(url);
                if (passConfig) {
                  target.searchParams.append('ref', sk.config.ref);
                  target.searchParams.append('repo', sk.config.repo);
                  target.searchParams.append('owner', sk.config.owner);
                  if (sk.config.host) target.searchParams.append('host', sk.config.host);
                  if (sk.config.project) target.searchParams.append('project', sk.config.project);
                }
                if (passReferrer) {
                  target.searchParams.append('referrer', location.href);
                }
                if (isPalette) {
                  let palette = sk.shadowRoot.getElementById(`hlx-sk-palette-${id}`);
                  const togglePalette = () => {
                    const button = sk.get(id).querySelector('button');
                    if (!palette.classList.contains('hlx-sk-hidden')) {
                      palette.classList.add('hlx-sk-hidden');
                      button.classList.remove('pressed');
                    } else {
                      palette.classList.remove('hlx-sk-hidden');
                      button.classList.add('pressed');
                      // log telemetry
                      sampleRUM('sidekick:paletteclosed', {
                        source: sk.location.href,
                        target: sk.status.webPath,
                      });
                    }
                  };
                  if (!palette) {
                    // draw palette
                    palette = appendTag(sk.root, {
                      tag: 'div',
                      attrs: {
                        id: `hlx-sk-palette-${id}`,
                        class: 'hlx-sk-palette hlx-sk-hidden',
                        style: paletteRect || '',
                      },
                    });
                    const titleBar = appendTag(palette, {
                      tag: 'div',
                      text: (titleI18n && titleI18n[language]) || title,
                      attrs: {
                        class: 'palette-title',
                      },
                    });
                    appendTag(titleBar, {
                      tag: 'button',
                      attrs: {
                        title: i18n(sk, 'close'),
                        class: 'close',
                      },
                      lstnrs: {
                        click: togglePalette,
                      },
                    });
                    const container = appendTag(palette, {
                      tag: 'div',
                      attrs: {
                        class: 'palette-content',
                      },
                    });
                    appendTag(container, {
                      tag: 'iframe',
                      attrs: {
                        src: target,
                        allow: 'clipboard-write *',
                      },
                    });
                  }
                  togglePalette();
                } else {
                  // open url in new window
                  window.open(target, `hlx-sk-${id || `custom-plugin-${i}`}`);
                }
              } else if (eventName) {
                // fire custom event
                fireEvent(sk, `custom:${eventName}`);
              }
            },
            isDropdown: isContainer,
          },
          container: containerId,
        };
        // add plugin
        sk.add(plugin);
      }
    });
  }
}
