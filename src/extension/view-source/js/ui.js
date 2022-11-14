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
 * Runs the copy (to clipboard...) action
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

const htmlSourceToEdition = (main, head, url) => {
  main.querySelectorAll('img').forEach((img) => {
    if (!img.src) return;
    const extension = new URL(window.location.href);
    const content = new URL(url);
    img.src = img.src.replace(extension.origin, content.origin);
  });

  main.querySelectorAll('picture source').forEach((source) => {
    if (!source.srcset) return;
    // const extension = new URL(window.location.href);
    const content = new URL(url);
    if (source.srcset.startsWith('./')) {
      source.srcset = `${content.origin}/${source.srcset.substring(2)}`;
    } else if (source.srcset.startsWith('/')) {
      source.srcset = `${content.origin}${source.srcset}`;
    }
  });

  blockDivToTable(main);
  createSectionBreaks(main);
  addMetadataBlock(main, head);
};

const htmlEditionToSource = () => {
  const editor = getEditorElement();
  const doc = new DOMParser().parseFromString(editor.innerHTML, 'text/html');
  const main = doc.body;

  blockTableToDiv(main);
  removeSectionBreaks(main);

  return main.innerHTML;
};

// required styling for the copy/paste to Word / gdoc to look the same
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
  });

  element.querySelectorAll('th, td').forEach((el) => {
    forceStyles(el, ['background-color', 'text-align', 'vertical-align', 'border', 'padding']);
  });

  element.querySelectorAll('img').forEach((img) => {
    const setDimensions = () => {
      img.setAttribute('width', img.width);
      img.setAttribute('height', img.height);
    };

    if (img.complete) {
      setDimensions();
    } else {
      img.addEventListener('load', setDimensions);
    }
  });
};

const loadEditor = async (tab) => {
  const req = await fetch(tab.url);
  const source = await req.text();

  const doc = new DOMParser().parseFromString(source, 'text/html');
  const { head } = doc;
  const main = doc.querySelector('main');

  htmlSourceToEdition(main, head, tab.url);

  const editor = getEditorElement();
  editor.innerHTML = main.innerHTML;

  makeStylesReadyForCopy(editor);
};

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
    files: ['/view-source/js/content.js'],
  });

  loadEditor(tab);

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
