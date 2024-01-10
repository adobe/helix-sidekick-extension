/*
 * Copyright 2023 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */
import { html2md, md2html } from '../../lib/importer.lib.js';
import sampleRUM from '../../rum.js';
import setupImportButton from '../../da/js/da.js';

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

const getHTMLForCopy = (html) => html.replace(/<hr>/gm, '---');

/**
 * Copies the provided HTML to clipboard
 * @param {String} action The html to copy to clipboard
 */
const copyHTMLToClipboard = (html) => {
  html = getHTMLForCopy(html);
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
  // const req = await fetch(url);
  // const source = await req.text();

  const msg = await sendMessage({ fct: 'getDOM' });

  const res = await html2md(url, msg.html);
  const html = await md2html(res.md);

  const editor = getEditorElement();
  editor.innerHTML = html;

  makeStylesReadyForCopy(editor);
};

/**
 * Replaces all i18n messages in an element
 * @param {HTMLElement} elem The element
 */
const localize = (elem) => {
  const find = /__MSG_(.*)__/g;
  const replace = (match, value) => (value ? chrome.i18n.getMessage(value) : '');
  elem.innerHTML = elem.innerHTML.replace(find, replace);
};

/**
 * Initial setup
 */
const load = async () => {
  localize(document.body);

  const tab = await getCurrentTab();

  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ['/import/js/content.js'],
  });

  loadEditor(tab.url);

  const editor = getEditorElement();

  const copyButton = document.getElementById('copy');
  copyButton.addEventListener('click', () => {
    copyHTMLToClipboard(editor.innerHTML);
    copyButton.innerHTML = chrome.i18n.getMessage('import_copied');
    copyButton.classList.add('copied');
    setTimeout(() => {
      copyButton.innerHTML = chrome.i18n.getMessage('copy');
      copyButton.classList.remove('copied');
    }, 2000);

    sampleRUM('sidekick:copyimport', {
      source: tab.url,
    });
  });

  setupImportButton(tab, editor);

  sampleRUM('sidekick:import', {
    source: tab.url,
  });
};

load();
