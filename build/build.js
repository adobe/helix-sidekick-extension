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
/* eslint-disable no-console, import/no-extraneous-dependencies */

const fs = require('fs-extra');
const archiver = require('archiver');

const supportedBrowsers = ['chrome', 'safari', 'firefox'];

async function copyResources(browser) {
  const sourceDir = './src/extension';
  const targetDir = `./dist/${browser}`;
  try {
    await fs.remove(targetDir);
    await fs.ensureDir(targetDir);
    await fs.copy(sourceDir, targetDir, {
      overwrite: true,
      filter: (src) => src.split('/').pop() !== 'manifest.json',
    });
  } catch (e) {
    console.error(`  failed to copy resources: ${e.message}`);
    process.exit(1);
  }
  console.log(`  resources copied to ${targetDir}`);
}

function copyManifestKeys(sourceObj, browser) {
  const targetObj = {};
  Object.keys(sourceObj).forEach((sourceKey) => {
    let targetKey = sourceKey;
    if (sourceKey.startsWith('__')) {
      // only copy key if prefix matches browser
      if (sourceKey.startsWith(`__${browser}__`)) {
        targetKey = sourceKey.split('__').pop();
      } else {
        return;
      }
    }
    if (typeof sourceObj[sourceKey] === 'object') {
      if (Array.isArray(sourceObj[sourceKey])) {
        targetObj[targetKey] = sourceObj[sourceKey].map((key) => key);
      } else {
        targetObj[targetKey] = copyManifestKeys(sourceObj[sourceKey], browser);
      }
    } else {
      targetObj[targetKey] = sourceObj[sourceKey];
    }
  });
  return targetObj;
}

async function buildManifest(browser) {
  const targetPath = `./dist/${browser}/manifest.json`;
  let targetMF = {};
  try {
    const sourceMF = await fs.readJson('./src/extension/manifest.json');
    targetMF = copyManifestKeys(sourceMF, browser);
  } catch (e) {
    throw new Error(`  failed to read source manifest.json: ${e.message}`);
  }
  try {
    await fs.ensureFile(targetPath);
    await fs.writeFile(targetPath, JSON.stringify(targetMF, null, '  '), { encoding: 'utf-8' });
  } catch (e) {
    throw new Error(`  failed to write target manifest.json: ${e.message}`);
  }
  console.log(`  ${browser}-specific manifest.json created at ${targetPath}`);
}

function zipExtension(browser) {
  const dir = `./dist/${browser}`;
  const zip = `${dir}.zip`;
  const output = fs.createWriteStream(zip);
  const archive = archiver('zip', {
    zlib: { level: 9 },
  });
  archive.on('error', (e) => {
    throw new Error(`failed to zip extension: ${e.message}`);
  });

  archive.pipe(output);
  archive.directory(dir, false);
  archive.finalize();

  console.log(`  zip created at ${zip}`);
}

// run build script
const browser = process.argv[2];
if (!browser) {
  console.log(`specify one of the following browers: ${supportedBrowsers.join(', ')}`);
  process.exit(1);
}
if (!supportedBrowsers.includes(browser)) {
  console.error(`unsupported browser ${browser}`);
  process.exit(1);
}

console.log(`building ${browser} extension...`);

copyResources(browser)
  .then(() => buildManifest(browser))
  .then(() => {
    if (browser === 'chrome') {
      zipExtension(browser);
    }
    console.log('done.');
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
