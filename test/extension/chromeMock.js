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

class StorageMock {
  constructor(state = {}) {
    this.state = state;
  }

  get(name, callback) {
    callback({
      [name]: this.state[name],
    });
  }

  set(obj, callback) {
    Object.keys(obj).forEach((key) => {
      this.state[key] = obj[key];
    });
    callback();
  }

  remove(name, callback) {
    delete this.state[name];
    callback();
  }

  clear(callback) {
    this.state = {};
    callback();
  }
}

export default {
  i18n: {
    getMessage: () => {},
  },
  runtime: {
    id: ID,
    getManifest: async () => readFile({ path: '../../src/extension/manifest.json' }).then((mf) => JSON.parse(mf)),
    getURL: (path) => `chrome-extension://${ID}${path}`,
    lastError: null,
    sendMessage: () => {},
    onMessageExternal: {
      // simulate external message from admin API with authToken
      addListener: (func) => func({ owner: 'test', repo: 'auth-project', authToken: 'foo' }),
    },
  },
  storage: {
    sync: new StorageMock({
      hlxSidekickConfigs: [{
        giturl: 'https://github.com/test/legacy-project',
        owner: 'test',
        repo: 'legacy-project',
        ref: 'main',
      }],
      hlxSidekickProjects: ['adobe/blog'],
      'adobe/blog': {
        giturl: 'https://github.com/adobe/blog',
        owner: 'adobe',
        repo: 'blog',
        ref: 'main',
      },
    }),
    local: new StorageMock({
      hlxSidekickDisplay: true,
      test: 'test',
    }),
  },
  declarativeNetRequest: {
    getSessionRules: async () => ([]),
    updateSessionRules: async () => undefined,
  },
  tabs: {
    create: async ({ url }) => ({ url, id: 7 }),
    remove: async () => {},
  },
};
