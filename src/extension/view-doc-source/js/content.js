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
  /**
   * Sends the main back to the source window.
   * @param {Object} params Contains the new HTML of the main element
   */
  const setMain = async ({ html }) => {
    // page needs to listen for this event
    window.postMessage({ type: 'refresh-main', html }, '*');
  };

  chrome.runtime.onMessage.addListener(({ fct, params }, sender, sendResponse) => {
    const handleResponse = async () => {
      let result;
      if (fct === 'setMain') {
        result = await setMain(params);
      } else {
        result = { error: 'Unknown function' };
      }

      sendResponse(result);
    };
    handleResponse();
    return true;
  });
}
