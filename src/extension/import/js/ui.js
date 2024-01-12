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
import {
  html2md, md2html, DOMUtils, Blocks,
} from '../../lib/importer.lib.js';
import sampleRUM from '../../rum.js';
import { getConfig } from '../../utils.js';
import setupImportButton from '../../da/js/da.js';

/**
 * sections mapping importer transformDOM function
 */

function sanitize(str) {
  return str.replace(/[$<>"'`=]/g, '-');
}

function getMetadata(name, document) {
  const attr = name && name.includes(':') ? 'property' : 'name';
  const meta = [...document.head.querySelectorAll(`meta[${attr}="${name}"]`)]
    .map((m) => m.content)
    .join(', ');
  return meta || '';
}

const createMetadata = (main, document) => {
  const meta = {};

  const title = document.querySelector('title');
  if (title) {
    meta.Title = title.textContent.replace(/[\n\t]/gm, '');
  }

  const desc = getMetadata('description', document);
  if (desc) {
    meta.Description = desc;
  }

  const img = getMetadata('og:image', document);
  if (img) {
    const el = document.createElement('img');
    el.src = img;
    meta.Image = el;

    const imgAlt = getMetadata('og:image:alt', document);
    if (imgAlt) {
      el.alt = imgAlt;
    }
  }

  const ogtitle = getMetadata('og:title', document);
  if (ogtitle && ogtitle !== meta.Title) {
    if (meta.Title) {
      meta['og:title'] = ogtitle;
    } else {
      meta.Title = ogtitle;
    }
  }

  const ogdesc = getMetadata('og:description', document);
  if (ogdesc && ogdesc !== meta.Description) {
    if (meta.Description) {
      meta['og:description'] = ogdesc;
    } else {
      meta.Description = ogdesc;
    }
  }

  const ttitle = getMetadata('twitter:title', document);
  if (ttitle && ttitle !== meta.Title) {
    if (meta.Title) {
      meta['twitter:title'] = ttitle;
    } else {
      meta.Title = ttitle;
    }
  }

  const tdesc = getMetadata('twitter:description', document);
  if (tdesc && tdesc !== meta.Description) {
    if (meta.Description) {
      meta['twitter:description'] = tdesc;
    } else {
      meta.Description = tdesc;
    }
  }

  const timg = getMetadata('twitter:image', document);
  if (timg && timg !== img) {
    const el = document.createElement('img');
    el.src = timg;
    meta['twitter:image'] = el;

    const imgAlt = getMetadata('twitter:image:alt', document);
    if (imgAlt) {
      el.alt = imgAlt;
    }
  }

  if (Object.keys(meta).length > 0) {
    const block = Blocks.getMetadataBlock(document, meta);
    main.append(block);
  }

  return meta;
};

const adjustImageUrls = (main, url) => {
  [...main.querySelectorAll('img')].forEach((img) => {
    const src = img.getAttribute('src');
    if (src && (src.startsWith('./') || src.startsWith('/') || src.startsWith('../'))) {
      try {
        const u = new URL(src, url);
        // eslint-disable-next-line no-param-reassign
        img.src = u.toString();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.log(`Unable to adjust image URL ${img.src} - removing image`);
        img.remove();
      }
    }
  });
};

const convertIcons = (main, document) => {
  [...main.querySelectorAll('img')].forEach((img) => {
    const src = img.getAttribute('src');
    if (src && src.endsWith('.svg')) {
      const span = document.createElement('span');
      const name = src.split('/').pop().split('.')[0].toLowerCase().trim().replace(/[^a-z0-9]/g, '-');
      if (name) {
        span.innerHTML = `:${name}:`;
        img.replaceWith(span);
      }
    }
  });
};

const transformBackgroundImages = (main, document) => {
  [...main.querySelectorAll('[style*="background-image: url"]')].forEach((element) => {
    const img = DOMUtils.getImgFromBackground(element, document);
    element.prepend(img);
    element.style.removeProperty('background-image');
  });
};

const transformerCfg = {
  transformDOM: function t({
    // eslint-disable-next-line no-unused-vars
    url, document, html, params,
  }) {
    const main = document.body;

    // attempt to remove non-content elements
    DOMUtils.remove(main, [
      'nav',
      '.nav',
      'iframe',
      'noscript',
      'script',
      'style',
    ]);

    const { sectionsMapping } = params;

    console.log('sectionsMapping', sectionsMapping);

    main.querySelectorAll('div[data-hlx-imp-hidden-div]').forEach((el) => {
      el.remove();
    });

    if (sectionsMapping) {
      if (sectionsMapping.ignore) {
        sectionsMapping.ignore.forEach((ignore) => {
          [...document.querySelectorAll(ignore.selectors.main)].forEach((el) => {
            el.remove();
          });
        });
      }
      if (sectionsMapping.header) {
        sectionsMapping.header.forEach((header) => {
          DOMUtils.remove(main, [header.selectors.main]);
        });
      }
      if (sectionsMapping.footer) {
        sectionsMapping.footer.forEach((footer) => {
          DOMUtils.remove(main, [footer.selectors.main]);
        });
      }
      if (sectionsMapping.carousel) {
        sectionsMapping.carousel.forEach((carousel) => {
          [...document.querySelectorAll(carousel.selectors.main)].forEach((el) => {
            [...el.querySelectorAll('[class]')].forEach((child) => {
              child.removeAttribute('class');
            });
            el.before(DOMUtils.createTable([
              ['carousel'],
              [el.outerHTML],
            ], document));
            el.remove();
          });
        });
      }
      if (sectionsMapping.hero) {
        sectionsMapping.hero.forEach((hero) => {
          [...document.querySelectorAll(hero.selectors.main)].forEach((el) => {
            [...el.querySelectorAll('[class]')].forEach((child) => {
              child.removeAttribute('class');
            });
            el.before(DOMUtils.createTable([
              ['hero'],
              [el.outerHTML],
            ], document));
            el.remove();
          });
        });
      }
    }

    createMetadata(main, document);
    transformBackgroundImages(main, document);
    adjustImageUrls(main, url);
    convertIcons(main, document);

    return main;
  },
};

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

  const u = new URL(url);
  const msg = await sendMessage({ fct: 'getDOM' });

  console.log(msg);
  console.log(`sectionsMapping_${sanitize(u.hostname)}`);
  const sectionsMapping = await getConfig('sync', `sectionsMapping_${sanitize(u.hostname)}`);

  const res = await html2md(url, msg.html, transformerCfg, { sectionsMapping });
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
