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
/* eslint-disable no-console, import/no-extraneous-dependencies */

const fs = require('fs-extra');
const shell = require('shelljs');

const manifest = './src/extension/manifest.json';

// run update version script
try {
  const { version } = JSON.parse(fs.readFileSync('package.json'));
  const json = JSON.parse(fs.readFileSync(manifest));
  const { version: oldVersion } = json;
  json.version = version;
  fs.writeJsonSync(manifest, json, { spaces: 2 });
  const msg = `chore(release): update manifest version to ${version} [skip ci]`;
  const { code, stderr } = shell.exec(`git add ${manifest} && git commit -m"${msg}" && git push`);
  if (code > 0) {
    throw new Error(stderr);
  }
  console.log(`manifest version updated from ${oldVersion} to ${version}`);
} catch (e) {
  console.error(`failed to update manifest version: ${e.message}`);
  process.exit(1);
}
