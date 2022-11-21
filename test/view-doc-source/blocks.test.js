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
  classNameToBlockName,
  metaToDisplay,
  toBlockCSSClassNames,
  blockDivToTable,
  blockTableToDiv,
  createSectionBreaks,
  removeSectionBreaks,
  addMetadataBlock,
} from '../../src/extension/view-doc-source/js/blocks.js';

document.body.innerHTML = '<div id="container"></div>';

describe('blocks util methods', () => {
  it('blocks#classNameToBlockName', () => {
    expect(classNameToBlockName(['block'])).to.equal('Block');
    expect(classNameToBlockName(['section-metadata'])).to.equal('Section Metadata');
    expect(classNameToBlockName(['app-cards-header'])).to.equal('App Cards Header');
    expect(classNameToBlockName(['app-download', 'orange'])).to.equal('App Download (orange)');
    expect(classNameToBlockName(['app-download', 'content-stacked', 'blue'])).to.equal('App Download (content stacked, blue)');
  });

  it('blocks#metaToDisplay', () => {
    expect(metaToDisplay('title')).to.equal('Title');
    expect(metaToDisplay('publication-date')).to.equal('Publication Date');
    expect(metaToDisplay('primary-product-name')).to.equal('Primary Product Name');
  });

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
  const testBlockDivToTable = async (fixture) => {
    const main = document.createElement('div');
    main.innerHTML = await readFile({ path: `./fixtures/${fixture}-div.html` });
    blockDivToTable(main);
    const expected = document.createElement('div');
    expected.innerHTML = await readFile({ path: `./fixtures/${fixture}-table.html` });
    expect(trim(main.innerHTML)).to.equal(trim(expected.innerHTML));
  };

  const testBlockTableToDiv = async (fixture) => {
    const main = document.createElement('div');
    main.innerHTML = await readFile({ path: `./fixtures/${fixture}-table.html` });
    blockTableToDiv(main);
    const expected = document.createElement('div');
    expected.innerHTML = await readFile({ path: `./fixtures/${fixture}-div.html` });
    expect(trim(main.innerHTML)).to.equal(trim(expected.innerHTML));
  };

  // test block as div to table back to div.
  it('blocks#blockDivToTable single', async () => testBlockDivToTable('single'));
  it('blocks#blockDivToTable single', async () => testBlockTableToDiv('single'));
  it('blocks#blockDivToTable blocks', async () => testBlockDivToTable('blocks'));
  it('blocks#blockDivToTable blocks', async () => testBlockTableToDiv('blocks'));
});

describe('blocks section breaks methods', () => {
  it('blocks#createSectionBreaks and blocks#removeSectionBreaks', async () => {
    const main = document.createElement('div');
    main.innerHTML = await readFile({ path: './fixtures/blocks-div.html' });
    const initialSectionCount = main.querySelectorAll(':scope > div').length;
    createSectionBreaks(main);
    expect(main.querySelectorAll(':scope > div').length).to.equal(initialSectionCount);

    removeSectionBreaks(main);
    expect(main.querySelectorAll('hr').length).to.equal(0);
  });
});

describe('blocks metadata methods', () => {
  it('blocks#addMetadataBlock', async () => {
    const head = document.createElement('head');
    head.innerHTML = await readFile({ path: './fixtures/metadata-head.html' });
    // empty main is fine for this test
    const main = document.createElement('div');
    addMetadataBlock(main, head, 'https://example.com');

    const table = main.querySelector('table');
    // eslint-disable-next-line no-unused-expressions
    expect(table).to.not.be.null;

    const expected = await readFile({ path: './fixtures/metadata-table.html' });
    expect(trim(table.outerHTML)).to.equal(trim(expected));
  });
});
