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

'use strict';

import { log, setDisplay } from './utils.js';

export default async function injectSidekick(config, display) {
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
    window.hlx.sidekickConfig = Object.fromEntries(Object.entries(config)
      .filter(([k]) => ['owner', 'repo', 'ref', 'hlx3', 'devMode'].includes(k)));
    log.debug('sidekick.js: curated config', JSON.stringify(window.hlx.sidekickConfig));
    // inject sidekick
    await import('https://www.hlx.live/tools/sidekick/module.js');

    // look for extended config in project
    const {
      owner, repo, ref, devMode,
    } = config;
    let configOrigin = '';
    if (devMode) {
      configOrigin = 'http://localhost:3000';
    } else {
      configOrigin = `https://${ref}--${repo}--${owner}.hlx3.page`;
    }
    try {
      await import(`${configOrigin}/tools/sidekick/config.js`);
    } catch (e) {
      // init sidekick without extended config
      log.info('no extended sidekick config found');
      if (!(window.hlx && window.hlx.sidekick)) {
        window.hlx.initSidekick();
      }
    }

    // wait for sidekick to instrument
    window.hlx.sidekickWait = window.setInterval(() => {
      if (window.hlx.sidekick) {
        window.clearInterval(window.hlx.sidekickWait);
        delete window.hlx.sidekickWait;
        // set display to false if user clicks close button
        window.hlx.sidekick.shadowRoot
          .querySelector('.hlx-sk > button.close')
          .addEventListener('click', () => {
            setDisplay(false);
          });
      }
    }, 200);
  }
}
