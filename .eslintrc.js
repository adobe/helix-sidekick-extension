/*
 * Copyright 2019 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

module.exports = {
  root: true,
  extends: '@adobe/helix',
  env: {
    browser: true,
  },
  parserOptions: {
    allowImportExportEverywhere: true,
    sourceType: 'module',
    requireConfigFile: false,
    ecmaVersion: 2022,
  },
  globals: {
    // required for extension
    chrome: true,
    jsyaml: true,
  },
  ignorePatterns: [
    '.vscode/*',
    'coverage/*',
    'debug/*',
    'dist/*',
    'src/extension/lib/*.js',
    'src/safari/*',
  ],
  rules: {
    // allow reassigning param
    'no-param-reassign': 0,
    'import/extensions': ['error', {
      js: 'always',
    }],
    'import/prefer-default-export': 0,
  },
};
