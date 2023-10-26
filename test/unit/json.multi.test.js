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

describe('Test special view for JSON (multi sheet)', () => {
  before(async () => {
    await load('https://main--bar--foo.hlx.page/multisheet.json');
  });

  it('Draws tables for multiple sheets', async () => {
    expect(container.querySelectorAll('table').length).to.equal(2);
    expect(container.querySelector('h2')?.textContent).to.equal('sheet1');
  });
});
