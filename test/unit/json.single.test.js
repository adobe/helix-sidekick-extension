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
/* eslint-disable no-unused-expressions */
/* global describe it before */

import { expect } from '@esm-bundle/chai';
import fetchMock from '../mocks/fetchMock.js';

window.fetch = fetchMock;
const container = document.body;

const load = async (sheetUrl) => {
  // add sheet url as query parameter
  const testUrl = new URL(window.location.href);
  testUrl.searchParams.set('url', sheetUrl);
  window.history.pushState({}, null, testUrl.toString());
  // clear container
  container.innerHTML = '';
  // import json.js
  await import('../../src/extension/view/json/json.js');
  // wait 0.5s
  await new Promise((resolve) => {
    window.setTimeout(resolve, 500);
  });
};

describe('Test special view for JSON (single sheet)', () => {
  before(async () => {
    await load('https://main--bar--foo.hlx.page/singlesheet.json');
  });

  it('Draws table', async () => {
    expect(container.querySelector('table')).to.exist;
    expect(container.querySelectorAll('tbody > tr').length).to.equal(4);
  });

  it('Detects Excel date and formats as UTC date', async () => {
    const dataContainer = container.querySelector('tbody > tr > td:nth-of-type(1) > div');
    expect(dataContainer.className).to.equal('date');
    expect(dataContainer.textContent).to.equal('Thu, 20 Jan 2022 00:00:00 GMT');
  });

  it('Detects image URL and shows image', async () => {
    const dataContainer = container.querySelector('tbody > tr > td:nth-of-type(2) > div');
    expect(dataContainer.className).to.equal('image');
    expect(dataContainer.querySelector('img').getAttribute('src'))
      .to.equal('/test/fixtures/media_0000.png?width=1200&format=pjpg&optimize=medium');
  });

  it('Detects link and shows as anchor', async () => {
    const dataContainer = container.querySelector('tbody > tr > td:nth-of-type(3) > div');
    expect(dataContainer.querySelector('a').getAttribute('href'))
      .to.equal('/en/publish/2022/01/20/adobe-is-helping-government-agencies-modernize-grants-management');
  });

  it('Detects array and formats as unordered list', async () => {
    const dataContainer = container.querySelector('tbody > tr > td:nth-of-type(7) > div');
    expect(dataContainer.className).to.equal('list');
    expect(dataContainer.querySelector('ul')).to.exist;
    expect(dataContainer.querySelectorAll('ul > li').length).to.equal(8);
  });

  it('Detects number as string', async () => {
    const dataContainer = container.querySelector('tbody > tr > td:nth-of-type(9) > div');
    expect(dataContainer.className).to.equal('number');
    expect(dataContainer.textContent).to.equal('0');
  });

  it('Detects number as number', async () => {
    const dataContainer = container.querySelector('tbody > tr > td:nth-of-type(10) > div');
    expect(dataContainer.className).to.equal('number');
    expect(dataContainer.textContent).to.equal('1234');
  });

  it('Detects timestamp and formats as UTC date', async () => {
    const dataContainer = container.querySelector('tbody > tr > td:nth-of-type(11) > div');
    expect(dataContainer.className).to.equal('date');
    expect(dataContainer.textContent).to.equal('Thu, 20 Jan 2022 01:46:50 GMT');
  });
});
