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

import {
  blockDivToTable,
  blockTableToDiv,
  createSectionBreaks,
  removeSectionBreaks,
  addMetadataBlock,
} from './blocks.js';

/**
 * Returns the current tab
 * @returns {chrome.tabs.Tab} The current tab
 */
const getCurrentTab = async () => {
  const u = new URL(window.location.href);
  const tabId = parseInt(u.searchParams.get('tabId'), 10);
  const tab = await chrome.tabs.get(tabId);
  return tab;
};

/**
 * Sends a message to the content window
 * @param {Object} message The message to send
 * @returns {Promise<Object} The response result
 */
const sendMessage = async (message) => {
  const tab = await getCurrentTab();
  return new Promise((resolve) => {
    chrome.tabs.sendMessage(tab.id, message, resolve);
  });
};

const getEditorElement = () => document.getElementById('editor');

/**
 * Copies the provided HTML to clipboard
 * @param {String} action The html to copy to clipboard
 */
const copyHTMLToClipboard = (html) => {
  const callback = (e) => {
    e.clipboardData.setData('text/html', html);
    e.clipboardData.setData('text/plain', html);
    e.preventDefault();
  };

  document.addEventListener('copy', callback);
  document.execCommand('copy');
  document.removeEventListener('copy', callback);
};

/**
 * Converts the source HTML (~Pipeline output) to HTML friendly for edition.
 * While the header and footer are not needed (only the main is), the head is needed to
 * compute the metadata block.
 * @param {HTMLElement} main The source main element
 * @param {HTMLElement} head The source head element
 * @param {String} url The url of the page
 */
const htmlSourceToEdition = (main, head, url) => {
  main.querySelectorAll('img').forEach((img) => {
    if (!img.src) return;
    const content = new URL(url);
    const pathname = content.pathname.replace(/\/$/, '');
    img.src = `${content.origin}${pathname}${img.src.substring(img.src.lastIndexOf('/'))}`;
  });

  main.querySelectorAll('picture source').forEach((source) => {
    source.remove();
  });

  blockDivToTable(main);
  createSectionBreaks(main);
  addMetadataBlock(main, head, url);
};

/**
 * Converts the HTML friendly for edition to the source HTML (~Pipeline output)
 * @returns {String} The HTML content of the editor
 */
const htmlEditionToSource = () => {
  const editor = getEditorElement();
  const doc = new DOMParser().parseFromString(editor.innerHTML, 'text/html');
  const main = doc.body;

  blockTableToDiv(main);
  removeSectionBreaks(main);

  return main.innerHTML;
};

/**
 * Applies to the element the required styles necessary
 * for the copy/paste to Word / gdoc to look the same
 * @param {*} element The element to apply the styles to
 */
const makeStylesReadyForCopy = (element) => {
  const forceStyles = (el, properties) => {
    const styles = [];
    properties.forEach((property) => {
      const style = window.getComputedStyle(el);
      const value = style.getPropertyValue(property);
      if (value) {
        styles.push(`${property}: ${value}`);
      }
    });
    if (styles.length > 0) {
      el.setAttribute('style', styles.join(';'));
    }
  };

  element.querySelectorAll('table').forEach((table) => {
    table.setAttribute('cellpadding', '0');
    table.setAttribute('cellspacing', '0');
    forceStyles(table, ['border', 'border-spacing', 'border-collapse', 'width']);
    table.after(document.createElement('br'));
  });

  element.querySelectorAll('th, td').forEach((el) => {
    forceStyles(el, ['background-color', 'text-align', 'vertical-align', 'border', 'padding']);
  });

  element.querySelectorAll('img').forEach((img) => {
    const setDimensions = () => {
      img.setAttribute('width', img.width);
      img.setAttribute('height', img.height);
    };

    // gdoc does not seem to support webply
    img.setAttribute('src', img.src.replace('webply', 'png'));

    if (img.complete) {
      setDimensions();
    } else {
      img.addEventListener('load', setDimensions);
    }
  });
};

/**
 * Loads the editor with the HTML content of the given url
 * @param {String} url The url to load
 */
const loadEditor = async (url) => {
  const req = await fetch(url);
  const source = await req.text();

  const doc = new DOMParser().parseFromString(source, 'text/html');
  const { head } = doc;
  const main = doc.querySelector('main');

  htmlSourceToEdition(main, head, url);

  const editor = getEditorElement();
  editor.innerHTML = main.innerHTML;

  makeStylesReadyForCopy(editor);
};

/**
 * Helper debounce function
 * @param {Function} func Function to debounce
 * @param {Integer} wait The debounce time in milliseconds
 * @param {Boolean} immed True to run the function immediately
 * @returns {Function} The debounced function
 */
const debounce = (func, wait, immed) => {
  let timeout;
  return (...args) => {
    const ctx = this;
    const later = () => {
      timeout = null;
      if (!immed) func.apply(ctx, args);
    };
    const callNow = immed && !timeout;
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
    if (callNow) func.apply(ctx, args);
  };
};

/**
 * Initial setup
 */
const load = async () => {
  const tab = await getCurrentTab();

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['/view-doc-source/js/content.js'],
  });

  loadEditor(tab.url);

  const editor = getEditorElement();

  const copyButton = document.getElementById('copy');
  copyButton.addEventListener('click', () => {
    copyHTMLToClipboard(editor.innerHTML);
    copyButton.innerHTML = 'Copied!';
    copyButton.classList.add('copied');
    setTimeout(() => {
      copyButton.innerHTML = 'Copy';
      copyButton.classList.remove('copied');
    }, 2000);
  });

  editor.addEventListener('input', debounce(() => {
    sendMessage({ fct: 'setMain', params: { html: htmlEditionToSource() } });
  }, 500));
};

load();
