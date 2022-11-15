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

import { expect } from '@esm-bundle/chai';
import {
  classNameToBlockName,
  metaToDisplay,
  toBlockCSSClassNames,
} from '../../src/extension/view-source/js/blocks.js';

document.body.innerHTML = '<div id="container"></div>';

describe('blocks tests', () => {
  it('blocks#classNameToBlockName', async () => {
    expect(classNameToBlockName(['block'])).to.equal('Block');
    expect(classNameToBlockName(['section-metadata'])).to.equal('Section Metadata');
    expect(classNameToBlockName(['app-cards-header'])).to.equal('App Cards Header');
    expect(classNameToBlockName(['app-download', 'orange'])).to.equal('App Download (orange)');
    expect(classNameToBlockName(['app-download', 'content-stacked', 'blue'])).to.equal('App Download (content stacked, blue)');
  });

  it('blocks#metaToDisplay', async () => {
    expect(metaToDisplay('title')).to.equal('Title');
    expect(metaToDisplay('publication-date')).to.equal('Publication Date');
    expect(metaToDisplay('primary-product-name')).to.equal('Primary Product Name');
  });

  it('blocks#toBlockCSSClassNames', async () => {
    expect(toBlockCSSClassNames('Block')).to.deep.equal(['block']);
    expect(toBlockCSSClassNames('Section Metadata')).to.deep.equal(['section-metadata']);
    expect(toBlockCSSClassNames('App Cards Header')).to.deep.equal(['app-cards-header']);
    expect(toBlockCSSClassNames('App Download (orange)')).to.deep.equal(['app-download', 'orange']);
    expect(toBlockCSSClassNames('App Download (content-stacked, blue)')).to.deep.equal(['app-download', 'content-stacked', 'blue']);
    expect(toBlockCSSClassNames('App Download (content stacked, blue)')).to.deep.equal(['app-download', 'content-stacked', 'blue']);
  });
});
