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
/* eslint-disable no-console, import/no-unresolved */

import {} from './lib/polyfills.min.js';
import sampleRUM from './rum.js';
import {
  log,
  url,
  getConfig,
  setConfig,
  setDisplay,
  i18n,
} from './utils.js';

export default async function injectSidekick(config, display, v7Installed) {
  if (typeof config !== 'object') {
    log.warn('sidekick.js: invalid config', config);
    return;
  }
  if (window.hlx && window.hlx.sidekick) {
    // sidekick exists, toggle
    window.hlx.sidekick[display ? 'show' : 'hide']();
  } else if (display) {
    // create sidekick
    log.debug('sidekick.js: no sidekick yet, create it');
    // reduce config to only include properties relevant for sidekick
    const curatedConfig = Object.fromEntries(Object.entries(config)
      .filter(([k]) => [
        'owner',
        'repo',
        'ref',
        'previewHost',
        'liveHost',
        'host',
        'devMode',
        'devOrigin',
        'pushDown',
        'adminVersion',
        'authTokenExpiry',
        'transient',
      ].includes(k)));
    curatedConfig.scriptUrl = url('module.js');
    [curatedConfig.mountpoint] = config.mountpoints || [];
    log.debug('sidekick.js: curated config', curatedConfig);

    // inject sidekick
    await import(curatedConfig.scriptUrl);

    // init sidekick
    window.hlx.initSidekick(curatedConfig);

    const {
      owner, repo,
    } = curatedConfig;

    // todo: improve config change handling. currently we only update the authToken
    chrome.storage.onChanged.addListener((changes) => {
      if (changes[`${owner}/${repo}`]) {
        const { authTokenExpiry } = changes[`${owner}/${repo}`].newValue || {};
        log.debug(`updating auth token expiry for ${owner}/${repo} in sidekick config`);
        window.hlx.sidekickConfig.authTokenExpiry = authTokenExpiry;
      }
    });

    // wait for sidekick to instrument
    window.hlx.sidekickWait = window.setInterval(async () => {
      const sk = window.hlx.sidekick;
      if (sk) {
        window.clearInterval(window.hlx.sidekickWait);
        delete window.hlx.sidekickWait;
        // set display to false if user clicks close button
        sk.addEventListener('hidden', () => {
          setDisplay(false);
        });
        const helpOptOut = await getConfig('sync', 'hlxSidekickHelpOptOut');
        if (!helpOptOut) {
          // find next unacknowledged help topic with matching condition
          const helpContent = await getConfig('sync', 'hlxSidekickHelpContent') || [];
          const topic = helpContent
            .find((t) => (!t.condition || sk[t.condition]()) && t.userStatus !== 'acknowledged');
          if (topic) {
            log.info(`next help topic to show: ${topic.title}`);
            sk.addEventListener('statusfetched', () => {
              sk.showHelp(topic);
            });
          }
          sk.addEventListener('helpoptedout', async () => {
            await setConfig('sync', { hlxSidekickHelpOptOut: true });
            sk.notify(i18n('help_opt_out_alert'));
          });
          sk.addEventListener('helpacknowledged', async ({ detail = {} }) => {
            const { data: id } = detail;
            if (id) {
              const hlxSidekickHelpContent = await getConfig('sync', 'hlxSidekickHelpContent') || [];
              const ackTopic = hlxSidekickHelpContent.find((t) => t.id === id);
              log.debug('help topic acknowledged', hlxSidekickHelpContent, id, ackTopic);
              if (ackTopic) {
                ackTopic.userStatus = 'acknowledged';
                setConfig('sync', {
                  hlxSidekickHelpContent,
                });
              }
            }
          });
        }
        if (curatedConfig.transient) {
          sk.addEventListener('projectadded', () => {
            chrome.runtime.sendMessage({ action: 'addRemoveProject' });
          });
        }

        const isChrome = /Chrome/.test(navigator.userAgent) && /Google/.test(navigator.vendor);
        const lastShownV7Dialog = await getConfig('local', 'hlxSidekickV7DialogShown');
        const showV7Dialog = isChrome
          && (!lastShownV7Dialog || +lastShownV7Dialog < Date.now() - 14400000); // 4h

        if (showV7Dialog) {
          // show v7 hint dialog
          const cover = document.createElement('img');
          cover.src = `${i18n('v7_hint_cover')}?width=1280&format=webply&optimize=medium`;

          const rememberDialogShown = () => setConfig('local', { hlxSidekickV7DialogShown: Date.now() });

          const createInstallButton = () => {
            const installButton = document.createElement('button');
            installButton.textContent = i18n(v7Installed ? 'v7_reinstall' : 'v7_install_now');
            installButton.classList.add(v7Installed ? 'secondary' : 'accent');
            installButton.addEventListener('click', () => {
              window.open(i18n('v7_install_url'));
              rememberDialogShown();
              sampleRUM('sidekick:v7:install-clicked');
            });
            return installButton;
          };

          const createSwitchButton = () => {
            const switchButton = document.createElement('button');
            switchButton.textContent = i18n('v7_switch_now');
            switchButton.classList.add(v7Installed ? 'accent' : 'hlx-sk-hidden');
            switchButton.addEventListener('click', () => {
              sk.hide();
              try {
                chrome.runtime.getManifest().externally_connectable?.ids?.forEach(async (id) => {
                  chrome.runtime.lastError = null;
                  chrome.runtime.sendMessage(
                    id,
                    {
                      action: 'launch',
                      owner: sk.config.owner,
                      repo: sk.config.repo,
                    },
                    () => {
                      if (chrome.runtime.lastError) {
                        throw new Error(chrome.runtime.lastError.message);
                      }
                    },
                  );
                });
              } catch (e) {
                log.info('failed to launch v7', e);
              }
              rememberDialogShown();
              sampleRUM('sidekick:v7:switch-clicked');
            });
            return switchButton;
          };

          const laterCancelButton = document.createElement('button');
          laterCancelButton.textContent = i18n('cancel');
          laterCancelButton.addEventListener('click', () => {
            sk.hideModal();
            rememberDialogShown();
          });

          const laterButtonGroup = document.createElement('span');
          laterButtonGroup.classList.add('hlx-sk-modal-button-group');
          laterButtonGroup.append(laterCancelButton, v7Installed
            ? createSwitchButton()
            : createInstallButton());

          const laterButton = document.createElement('button');
          laterButton.textContent = i18n('v7_install_later');
          laterButton.addEventListener('click', () => {
            sampleRUM('sidekick:v7:later-clicked');
            setTimeout(() => {
              sk.showModal([
                i18n('v7_hint_description_later'),
                laterButtonGroup,
              ], true);
            }, 100);
          });

          const buttonGroup = document.createElement('span');
          buttonGroup.classList.add('hlx-sk-modal-button-group');
          buttonGroup.append(laterButton, v7Installed
            ? createSwitchButton()
            : createInstallButton());

          sk.addEventListener('statusfetched', () => {
            sk.showModal({
              message: [
                cover,
                i18n(v7Installed ? 'v7_hint_title_switch' : 'v7_hint_title'),
                i18n(v7Installed ? 'v7_hint_description_switch' : 'v7_hint_description'),
                buttonGroup,
              ],
              sticky: true,
              css: 'cover',
            });
          }, { once: true });
        }
      }
    }, 200);
  }
}
