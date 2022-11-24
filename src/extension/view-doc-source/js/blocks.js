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

/**
 * Converts a block name to a list of css class names.
 * @param {String} text The block name
 * @returns {[String]} A list of css class names
 */
export const toBlockCSSClassNames = (text) => {
  if (!text) {
    return [];
  }
  const names = [];
  const idx = text.lastIndexOf('(');
  if (idx >= 0) {
    names.push(text.substring(0, idx));
    names.push(...text.substring(idx + 1).split(','));
  } else {
    names.push(text);
  }

  return names.map((name) => name
    .toLowerCase()
    .replace(/[^0-9a-z]+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, ''))
    .filter((name) => !!name);
};

/**
 * Converts the block as table to block as div inside the main element.
 * @param {HTMLElement} main The main element
 */
export const blockTableToDiv = (main) => {
  main.querySelectorAll('table').forEach((table) => {
    const div = document.createElement('div');
    div.classList.add(...toBlockCSSClassNames(table.querySelector('th').innerHTML));
    table.querySelectorAll('tbody tr').forEach((row) => {
      const rowDiv = document.createElement('div');
      div.appendChild(rowDiv);
      row.querySelectorAll('td').forEach((cell) => {
        const cellDiv = document.createElement('div');
        rowDiv.appendChild(cellDiv);
        cellDiv.innerHTML = cell.innerHTML;
      });
    });
    table.replaceWith(div);
  });
};

/**
 * Removes the visual section breaks (hr) from the provided main element.
 * @param {HTMLElement} main The main element
 */
export const removeSectionBreaks = (main) => {
  main.querySelectorAll('hr').forEach((hr) => {
    hr.remove();
  });
};
