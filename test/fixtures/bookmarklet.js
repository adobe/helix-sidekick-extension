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
/* global document */

/* ** Helix Sidekick Bookmarklet (Mock) ** */
(() => {
  const s = document.createElement('script');
  s.id = 'hlx-sk-app';
  s.src = '../../src/sidekick/app.js';
  if (document.getElementById('hlx-sk-test').dataset.config) {
    s.dataset.config = document.getElementById('hlx-sk-test').dataset.config;
  }
  if (document.head.querySelector('script#hlx-sk-app')) {
    document.head.querySelector('script#hlx-sk-app').replaceWith(s);
  } else {
    document.head.append(s);
  }
})();
