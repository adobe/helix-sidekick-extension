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
 * Converts a list of css class names into a block name.
 * @param {Array[String]} classList The list of css class names
 * @returns {String} The block name
 */
export const classNameToBlockName = (classList) => {
  if (!classList.length) return '';
  let blockType = classList.shift();
  blockType = blockType.split('-').map((s) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase()).join(' ');
  if (classList.length) {
    blockType += ` (${classList.map((s) => s.split('-').join(' ')).join(', ')})`;
  }
  return blockType;
};

export const metaToDisplay = (meta) => classNameToBlockName([meta]);

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
 * Converts the block as div to block as table inside the main element.
 * @param {HTMLElement} main The main element
 */
export const blockDivToTable = (main) => {
  main.querySelectorAll('div > div[class]').forEach((div) => {
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tr = document.createElement('tr');
    const th = document.createElement('th');
    th.innerHTML = classNameToBlockName(Array.from(div.classList));
    tr.appendChild(th);
    thead.appendChild(tr);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    table.appendChild(tbody);

    let maxCols = 0;
    Array.from(div.children).forEach((row) => {
      if (row.tagName === 'DIV') {
        const rowElement = document.createElement('tr');
        tbody.appendChild(rowElement);
        let numCols = 0;
        Array.from(row.children).forEach((cell) => {
          if (cell.tagName === 'DIV') {
            const cellElement = document.createElement('td');
            rowElement.appendChild(cellElement);
            cellElement.innerHTML = cell.innerHTML;
            numCols += 1;
          }
          maxCols = Math.max(maxCols, numCols);
        });
      }
    });
    th.colSpan = maxCols;

    div.replaceWith(table);
  });
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
 * Creates the visual section breaks (hr) for the provided main element.
 * @param {HTMLElement} main The main element
 */
export const createSectionBreaks = (main) => {
  const divs = main.querySelectorAll(':scope > div');
  divs.forEach((div, index) => {
    if (index < divs.length - 1) {
      const hr = document.createElement('hr');
      div.append(hr);
    }
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

const META_EXCLUDE = ['viewport', 'google-site-verification', 'serp-content-type'];

/**
 * Adds a metadata block (as a table) to the main element based on the provided head.
 * @param {HTMLElement} main The main element to add the metadata block to.
 * @param {HTMLElement} head The head element to extract the metadata from.
 */
export const addMetadataBlock = (main, head, url) => {
  const table = document.createElement('table');

  const thead = document.createElement('thead');
  const tr = document.createElement('tr');
  const th = document.createElement('th');
  th.innerHTML = 'Metadata';
  th.colSpan = 2;
  tr.appendChild(th);
  thead.appendChild(tr);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  table.appendChild(tbody);

  // BEGIN: special cases
  const title = head.querySelector('title');
  if (title) {
    const row = document.createElement('tr');
    tbody.appendChild(row);

    const nameCell = document.createElement('td');
    nameCell.innerHTML = 'Title';
    row.appendChild(nameCell);

    const content = document.createElement('td');
    content.innerHTML = title.innerHTML;
    row.appendChild(content);
  }

  const image = head.querySelector('meta[property="og:image"]');
  if (image) {
    const row = document.createElement('tr');
    tbody.appendChild(row);

    const nameCell = document.createElement('td');
    nameCell.innerHTML = 'Image';
    row.appendChild(nameCell);

    const content = document.createElement('td');
    const img = document.createElement('img');
    img.src = image.content;
    content.appendChild(img);
    row.appendChild(content);
  }

  const tags = head.querySelectorAll('meta[property="article:tag"]');
  if (tags && tags.length > 0) {
    const row = document.createElement('tr');
    tbody.appendChild(row);

    const nameCell = document.createElement('td');
    nameCell.innerHTML = 'Tags';
    row.appendChild(nameCell);

    const content = document.createElement('td');
    content.innerHTML = Array.from(tags).map((tag) => tag.content).join(', ');
    row.appendChild(content);
  }
  // END: special cases

  head.querySelectorAll('meta').forEach((meta) => {
    let name = meta.getAttribute('name');
    if (!name) {
      name = meta.getAttribute('property');
    }

    if (name
      && (name.indexOf(':') === -1)
      && !META_EXCLUDE.includes(name)) {
      const row = document.createElement('tr');
      tbody.appendChild(row);

      const nameCell = document.createElement('td');
      nameCell.innerHTML = metaToDisplay(name);
      row.appendChild(nameCell);

      const content = document.createElement('td');
      const value = meta.getAttribute('content');
      if (value && value.indexOf('media_') !== -1) {
        const img = document.createElement('img');
        const u = new URL(url);
        img.src = `${u.origin}${u.pathname}${value.substring(value.lastIndexOf('/'))}`;
        content.appendChild(img);
      } else {
        content.innerHTML = value || '';
      }
      row.appendChild(content);
    }
  });

  main.append(table);
};
