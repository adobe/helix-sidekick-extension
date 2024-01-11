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

import { BlocksMapping } from '../../lib/blocks-mapping-lib.js';
import { setConfig } from '../../utils.js';

function sanitize(str) {
  return str.replace(/[$<>"'`=]/g, '-');
}

{
  const DEFAULT_SUPPORTED_STYLES = [{ name: 'background-image', exclude: /none/g }];

  const storeSectionsMapping = async (boxes) => {
    const url = new URL(window.location.href);
    const configKey = `sectionsMapping_${sanitize(url.hostname)}`;

    const sm = {};
    sm[configKey] = {};

    boxes.children.forEach((box) => {
      if (box.prediction && box.prediction.fingerPrint) {
        sm[configKey][box.prediction.sectionType] = box.prediction.fingerPrint;
      }
    });

    await setConfig('sync', sm);
  };

  // deep clone a document
  // and port over predfined styles (i.e. write inline style attribute to not rely on CSS)
  const deepCloneWithStyles = (document, styles = DEFAULT_SUPPORTED_STYLES) => {
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
    return clone;
  };

  /**
   * Sends the main back to the source window.
   * @param {Object} params Contains the new HTML of the main element
   */
  const getDOM = async () => {
    const documentClone = deepCloneWithStyles(document);
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
    const boxes = await BlocksMapping.analysePage(window);

    storeSectionsMapping(boxes);
  };

  const blocksMappingMapElementHandler = () => {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.border = '2px solid red';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '100000';
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

    document.addEventListener('mousemove', mouseMoveHandler);

    document.addEventListener('click', () => {
      document.removeEventListener('mousemove', mouseMoveHandler);
      overlay.remove();
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
      } else if (fct === 'blocksMapping:mapElement') {
        await blocksMappingMapElementHandler(params);
      } else {
        result = { error: 'Unknown function' };
      }

      sendResponse(result);
    };
    handleResponse();
    return true;
  });
}
