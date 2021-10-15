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

function runCtl(code) {
  if (code) {
    const newScript = document.createElement('script');
    newScript.id = 'hlx-sk-ctl';
    newScript.textContent = `
    window.hlx = window.hlx || {};
    if (window.hlx.sidekick) {
      // console.log('[sidekick-ctl.js] sidekick found, running ctl');
      ${code}
    } else {
      window.hlx.sidekickWait = window.setInterval(() => {
        // console.log('[sidekick.js] waiting for sidekick...');
        if (window.hlx.sidekick) {
          // console.log('[sidekick-ctl.js] sidekick found');
          window.clearInterval(window.hlx.sidekickWait);
          delete window.hlx.sidekickWait;
          // console.log('[sidekick-ctl.js] running ctl');
          ${code}
        }
      }, 500);
    }
    `;
    const ctlScript = document.querySelector('script#hlx-sk-ctl');
    if (ctlScript) {
      ctlScript.replaceWith(newScript);
    } else {
      document.head.append(newScript);
    }
  }
}

export default async function injectSidekick(config, display) {
  if (typeof config !== 'object') {
    console.warn('[sidekick.js] no valid config', config);
    return;
  }
  if (document.querySelector('script#hlx-sk-app')) {
    // sidekick exists, toggle
    runCtl(`window.hlx.sidekick.${display ? 'show' : 'hide'}();`);
  } else if (display) {
    // create sidekick
    // console.log('[sidekick.js] create sidekick');
    // reduce config to only include properties relevant for sidekick
    config = Object.fromEntries(Object.entries(config)
      .filter(([k]) => ['owner', 'repo', 'ref', 'hlx3'].includes(k)));
    // console.log('[sidekick.js] curated config', config);
    // inject sidekick
    const appScript = document.createElement('script');
    appScript.id = 'hlx-sk-app';
    appScript.type = 'module';
    appScript.dataset.config = JSON.stringify(config);
    appScript.src = 'https://www.hlx.live/tools/sidekick/app.js';
    // appScript.src = url('./app.js');
    document.head.append(appScript);
    runCtl('window.hlx.sidekick.shadowRoot.querySelectorAll(".hlx-sk > button").forEach((b) => b.remove());');
  }
}
