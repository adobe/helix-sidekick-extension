/*
 * Copyright 2022 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import { readFile } from '@web/test-runner-commands';

const ID = 'dummy';

export default {
  i18n: {
    getMessage: () => {},
  },
  runtime: {
    id: ID,
    getManifest: async () => readFile({ path: '../../src/extension/manifest.json' }).then((mf) => JSON.parse(mf)),
    getURL: (path) => `chrome-extension://${ID}${path}`,
    lastError: new Error('foo'),
  },
  storage: {
    sync: {
      get: (name, callback) => callback({ name }),
      set: (_, callback) => callback(),
      clear: (callback) => callback(),
    },
    local: {
      get: (name, callback) => callback({ name }),
      set: (_, callback) => callback(),
      clear: (callback) => callback(),
    },
  },
};
