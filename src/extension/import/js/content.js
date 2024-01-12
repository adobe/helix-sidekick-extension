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

import { BlocksMapping, Box } from '../../lib/blocks-mapping-lib.js';
import { getConfig, setConfig } from '../../utils.js';

function sanitize(str) {
  return str.replace(/[$<>"'`=]/g, '-');
}

let ALL_BOXES = [];

async function getDOMElementFromUserInteraction() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.id = 'hlx-imp-overlay';
    overlay.style.position = 'fixed';
    overlay.style.backgroundColor = 'rgba(255, 0, 0, 0.2)';
    overlay.style.border = '2px solid red';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '2999999999';
    overlay.style.top = '0px';
    overlay.style.left = '0px';
    overlay.style.width = '0px';
    overlay.style.height = '0px';
    document.body.appendChild(overlay);

    const mouseMoveHandler = (e) => {
      const { target } = e;
      const {
        top, left, width, height,
      } = target.getBoundingClientRect();
      // draw a rectangle around the element
      overlay.style.top = `${top}px`;
      overlay.style.left = `${left}px`;
      overlay.style.width = `${width}px`;
      overlay.style.height = `${height}px`;
    };

    const mouseClickHandler = (e) => {
      // e.stopImmediatePropagation();
      if (e.target !== document.querySelector('.xp-ui')) {
        document.removeEventListener('mousemove', mouseMoveHandler);
        document.removeEventListener('click', mouseClickHandler);
        overlay.remove();
        resolve(e.srcElement);
      }
    };

    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('click', mouseClickHandler);
  });
}

{
  const DEFAULT_SUPPORTED_STYLES = [{ name: 'background-image', exclude: /none/g }];

  const storeSectionsMapping = async () => {
    const url = new URL(window.location.href);
    const configKey = `sectionsMapping_${sanitize(url.hostname)}`;

    const sm = {};
    sm[configKey] = {};

    ALL_BOXES.children.forEach((box) => {
      if (box.prediction && box.prediction.fingerPrint) {
        if (!sm[configKey][box.prediction.sectionType]) {
          sm[configKey][box.prediction.sectionType] = [];
        }
        sm[configKey][box.prediction.sectionType].push(box.prediction.fingerPrint);
      }
    });

    await setConfig('sync', sm);
  };

  // deep clone a document
  // and port over predfined styles (i.e. write inline style attribute to not rely on CSS)
  const deepCloneWithStyles = (window, document, styles = DEFAULT_SUPPORTED_STYLES) => {
    const clone = document.cloneNode(true);

    const applyStyles = (nodeSrc, nodeDest) => {
      const style = window.getComputedStyle(nodeSrc, null);

      styles.forEach((s) => {
        if (style[s.name]) {
          if (!s.exclude || !(style[s.name].match(s.exclude))) {
            nodeDest.style[s.name] = style[s.name];
          }
        }
      });

      if (nodeSrc.children && nodeSrc.children.length > 0) {
        const destChildren = [...nodeDest.children];
        [...nodeSrc.children].forEach((child, i) => {
          applyStyles(child, destChildren[i]);
        });
      }
    };
    applyStyles(document.body, clone.body);

    // mark hidden divs + add bounding client rect data to all "visible" divs
    document.querySelectorAll('div').forEach((div) => {
      if (div && /none/i.test(window.getComputedStyle(div).display.trim())) {
        div.setAttribute('data-hlx-imp-hidden-div', '');
      } else {
        const domRect = div.getBoundingClientRect().toJSON();
        Object.keys(domRect).forEach((p) => {
          domRect[p] = Math.round(domRect[p]);
        });
        if (domRect.width > 0 && domRect.height > 0) {
          div.setAttribute('data-hlx-imp-rect', JSON.stringify(domRect));
        }
        const bgImage = window.getComputedStyle(div).getPropertyValue('background-image');
        if (bgImage && bgImage !== 'none') {
          div.setAttribute('data-hlx-background-image', bgImage);
        }
        const bgColor = window.getComputedStyle(div).getPropertyValue('background-color');
        if (bgColor && bgColor !== 'rgb(0, 0, 0)' && bgColor !== 'rgba(0, 0, 0, 0)') {
          div.setAttribute('data-hlx-imp-bgcolor', bgColor);
        }
        const color = window.getComputedStyle(div).getPropertyValue('color');
        if (color && color !== 'rgb(0, 0, 0)') {
          div.setAttribute('data-hlx-imp-color', color);
        }
      }
    });

    return clone;
  };

  /**
   * Sends the main back to the source window.
   * @param {Object} params Contains the new HTML of the main element
   */
  const getDOM = async () => {
    const documentClone = deepCloneWithStyles(window, document);
    const html = documentClone.documentElement.outerHTML;
    return { html };
  };

  const setHTML = (params) => {
    const { content, origin } = params;
    const importMain = document.querySelector('main');
    const textArea = document.createElement('textarea');
    textArea.id = 'source-html';
    textArea.style.display = 'none';
    textArea.textContent = content;
    textArea.setAttribute('data-origin', origin);
    importMain.appendChild(textArea);
  };

  const blocksMappingTestHandler = async () => {
    document.addEventListener('sm:Event', async (event) => {
      switch (event.detail.type) {
        case 'analysePage': {
          ALL_BOXES = await BlocksMapping.analysePage(window);
          console.log(ALL_BOXES);
          storeSectionsMapping();
          break;
        }
        case 'ignoreElement': {
          const el = await getDOMElementFromUserInteraction();
          console.log('ignoreElement', el);
          ALL_BOXES.addChild(new Box(0, 0, 0, 0, el, true));
          storeSectionsMapping();
          break;
        }
        case 'clearElementsCache': {
          const url = new URL(window.location.href);
          const configKey = `sectionsMapping_${sanitize(url.hostname)}`;

          console.log(configKey);
          console.log(await getConfig('sync', configKey));

          const sm = {};
          sm[configKey] = {};
          await setConfig('sync', sm);
          break;
        }
        case 'logElementsCache': {
          const url = new URL(window.location.href);
          const configKey = `sectionsMapping_${sanitize(url.hostname)}`;
          console.log(await getConfig('sync', configKey));
          break;
        }
        default:
          break;
      }
    });
  };

  chrome.runtime.onMessage.addListener(({ fct, params }, sender, sendResponse) => {
    const handleResponse = async () => {
      let result;
      if (fct === 'getDOM') {
        result = await getDOM(params);
      } else if (fct === 'setHTML') {
        await setHTML(params);
      } else if (fct === 'blocksMapping:analysePage') {
        await blocksMappingTestHandler(params);
      } else {
        result = { error: 'Unknown function' };
      }

      sendResponse(result);
    };
    handleResponse();
    return true;
  });
}
