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
/* global describe it */
import { readFile } from '@web/test-runner-commands';
import { expect } from '@esm-bundle/chai';
import {
  toBlockCSSClassNames,
  blockTableToDiv,
} from '../../src/extension/view-doc-source/js/blocks.js';

document.body.innerHTML = '<div id="container"></div>';

describe('blocks util methods', () => {
  it('blocks#toBlockCSSClassNames', () => {
    expect(toBlockCSSClassNames()).to.deep.equal([]);
    expect(toBlockCSSClassNames('Block')).to.deep.equal(['block']);
    expect(toBlockCSSClassNames('Section Metadata')).to.deep.equal(['section-metadata']);
    expect(toBlockCSSClassNames('App Cards Header')).to.deep.equal(['app-cards-header']);
    expect(toBlockCSSClassNames('App Download (orange)')).to.deep.equal(['app-download', 'orange']);
    expect(toBlockCSSClassNames('App Download (content-stacked, blue)')).to.deep.equal(['app-download', 'content-stacked', 'blue']);
    expect(toBlockCSSClassNames('App Download (content stacked, blue)')).to.deep.equal(['app-download', 'content-stacked', 'blue']);
  });
});

const trim = (html) => html
  .replace(/^\s*/gm, '')
  .replace(/\s*$/gm, '')
  .replace(/\n/gm, '')
  .replace(/\/>\s*</gm, '/><');

describe('blocks conversion methods', () => {
  const testBlockTableToDiv = async (fixture) => {
    const main = document.createElement('div');
    main.innerHTML = await readFile({ path: `./fixtures/${fixture}-table.html` });
    blockTableToDiv(main);
    const expected = document.createElement('div');
    expected.innerHTML = await readFile({ path: `./fixtures/${fixture}-div.html` });
    expect(trim(main.innerHTML)).to.equal(trim(expected.innerHTML));
  };

  // test block as div to table back to div.
  it('blocks#blockDivToTable single', async () => testBlockTableToDiv('single'));
  it('blocks#blockDivToTable blocks', async () => testBlockTableToDiv('blocks'));
});
