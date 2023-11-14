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
{
  const DEFAULT_SUPPORTED_STYLES = [{ name: 'background-image', exclude: /none/g }];

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

  chrome.runtime.onMessage.addListener(({ fct, params }, sender, sendResponse) => {
    const handleResponse = async () => {
      let result;
      if (fct === 'getDOM') {
        result = await getDOM(params);
      } else {
        result = { error: 'Unknown function' };
      }

      sendResponse(result);
    };
    handleResponse();
    return true;
  });
}
