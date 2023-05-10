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

import { createTag, i18n } from './ui.js';

/**
 * Adds the bulk plugins to the sidekick.
 * @private
 * @param {Sidekick} sk The sidekick
 */
export function addBulkPlugins(sk) {
  if (sk.isAdmin()) {
    let bulkSelection = [];

    const isSharePoint = (location) => /\w+\.sharepoint.com$/.test(location.host)
      && location.pathname.endsWith('/Forms/AllItems.aspx');

    const toWebPath = (folder, item) => {
      const { path, type } = item;
      const nameParts = path.split('.');
      let [file, ext] = nameParts;
      if (isSharePoint(sk.location) && ext === 'docx') {
        // omit docx extension on sharepoint
        ext = '';
      }
      if (type === 'xlsx' || type.includes('vnd.google-apps.spreadsheet')) {
        // use json extension for spreadsheets
        ext = 'json';
      }
      file = file
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      return `${folder}${folder.endsWith('/') ? '' : '/'}${file}${ext ? `.${ext}` : ''}`;
    };

    const getBulkSelection = () => {
      const { location } = sk;
      if (isSharePoint(location)) {
        const isGrid = document.querySelector('div[class~="ms-TilesList"]');
        return [...document.querySelectorAll('#appRoot [role="presentation"] div[aria-selected="true"]')]
          .filter((row) => !row.querySelector('img').getAttribute('src').includes('/foldericons/')
            && !row.querySelector('img').getAttribute('src').endsWith('folder.svg'))
          .map((row) => ({
            type: isGrid
              ? row.querySelector(':scope i[aria-label]')?.getAttribute('aria-label').trim()
              : new URL(row.querySelector('img').getAttribute('src'), sk.location.href).pathname.split('/').slice(-1)[0].split('.')[0],
            path: isGrid
              ? row.querySelector('div[data-automationid="name"]').textContent.trim()
              : row.querySelector('button')?.textContent.trim(),
          }));
      } else {
        // gdrive
        return [...document.querySelectorAll('#drive_main_page [role="row"][aria-selected="true"]')]
          .filter((row) => row.querySelector(':scope img'))
          .map((row) => ({
            type: new URL(row.querySelector('div > img').getAttribute('src'), sk.location.href).pathname.split('/').slice(-2).join('/'),
            path: row.querySelector(':scope > div > div:nth-of-type(2)').textContent.trim() // list layout
              || row.querySelector(':scope > div > div > div:nth-of-type(4)').textContent.trim(), // grid layout
          }));
      }
    };

    const updateBulkInfo = () => {
      const sel = getBulkSelection(sk);
      bulkSelection = sel;
      // update info
      const label = sk.root.querySelector('#hlx-sk-bulk-info');
      if (sel.length === 0) {
        label.textContent = i18n(sk, 'bulk_selection_empty');
      } else if (sel.length === 1) {
        label.textContent = i18n(sk, 'bulk_selection_single');
      } else {
        label.textContent = i18n(sk, 'bulk_selection_multiple').replace('$1', sel.length);
      }
      // show/hide bulk buttons
      ['preview', 'publish', 'copy-urls'].forEach((action) => {
        sk.get(`bulk-${action}`).classList[sel.length === 0 ? 'add' : 'remove']('hlx-sk-hidden');
      });
      // update copy url button texts based on selection size
      ['', 'preview', 'live', 'prod'].forEach((env) => {
        const text = i18n(sk, `copy_${env}${env ? '_' : ''}url${sel.length === 1 ? '' : 's'}`);
        const button = sk.get(`bulk-copy-${env}${env ? '-' : ''}urls`)?.querySelector('button');
        if (button) {
          button.textContent = text;
          button.title = text;
        }
      });
    };

    const getBulkText = ([num, total], type, action, mod) => {
      let i18nKey = `bulk_${type}`;
      if (num === 0) {
        i18nKey = `${i18nKey}_empty`;
      } else {
        i18nKey = `${i18nKey}_${action}_${(total || num) === 1 ? 'single' : 'multiple'}${mod ? `_${mod}` : ''}`;
      }
      return i18n(sk, i18nKey)
        .replace('$1', num)
        .replace('$2', total);
    };

    const isChangedUrl = () => {
      const $test = document.getElementById('sidekick_test_location');
      if ($test) {
        return $test.value !== sk.location.href;
      }
      return window.location.href !== sk.location.href;
    };

    const doBulkOperation = async (operation, method, concurrency, host) => {
      const { config, status } = sk;
      const sel = bulkSelection.map((item) => toWebPath(status.webPath, item));
      const results = [];
      const total = sel.length;
      const { processQueue } = await import(`${config.scriptRoot}/lib/process-queue.js`);
      await processQueue(sel, async (file) => {
        results.push(await sk[method](file));
        if (total > 1) {
          sk.showModal(getBulkText([results.length, total], 'progress', operation), true);
        }
      }, concurrency);
      const lines = [];
      const ok = results.filter((res) => res.ok);
      if (ok.length > 0) {
        lines.push(getBulkText([ok.length], 'result', operation, 'success'));
        lines.push(createTag({
          tag: 'button',
          text: i18n(sk, ok.length === 1 ? 'copy_url' : 'copy_urls'),
          lstnrs: {
            click: (evt) => {
              evt.stopPropagation();
              navigator.clipboard.writeText(ok.map((item) => `https://${host}${item.path}`)
                .join('\n'));
              sk.hideModal();
            },
          },
        }));
      }
      const failed = results.filter((res) => !res.ok);
      if (failed.length > 0) {
        const failureText = getBulkText([failed.length], 'result', operation, 'failure');
        lines.push(failureText);
        lines.push(...failed.map((item) => {
          if (item.error.endsWith('docx with google not supported.')) {
            item.error = getBulkText([1], 'result', operation, 'error_no_docx');
          }
          if (item.error.endsWith('xlsx with google not supported.')) {
            item.error = getBulkText([1], 'result', operation, 'error_no_xlsx');
          }
          if (item.error.includes('source does not exist')) {
            item.error = getBulkText([1], 'result', operation, 'error_no_source');
          }
          return `${item.path.split('/').pop()}: ${item.error}`;
        }));
      }
      lines.push(createTag({
        tag: 'button',
        text: i18n(sk, 'close'),
      }));
      let level = 2;
      if (failed.length > 0) {
        level = 1;
        if (ok.length === 0) {
          level = 0;
        }
      }
      sk.showModal(
        lines,
        true,
        level,
      );
    };

    const doBulkCopyUrls = async (hostProperty) => {
      const { config, status } = sk;
      const urls = bulkSelection.map((item) => `https://${config[hostProperty]}${toWebPath(status.webPath, item)}`);
      navigator.clipboard.writeText(urls.join('\n'));
      sk.showModal(i18n(sk, `copied_url${urls.length !== 1 ? 's' : ''}`));
    };

    sk.addEventListener('statusfetched', () => {
      // bulk info
      sk.add({
        id: 'bulk-info',
        condition: (sidekick) => sidekick.isAdmin(),
        elements: [{
          tag: 'span',
          attrs: {
            id: 'hlx-sk-bulk-info',
            class: 'hlx-sk-label',
          },
        }],
        callback: () => {
          window.setInterval(() => {
            updateBulkInfo();
          }, 500);
        },
      });

      // bulk preview
      sk.add({
        id: 'bulk-preview',
        condition: (sidekick) => sidekick.isAdmin(),
        button: {
          text: i18n(sk, 'preview'),
          action: async () => {
            const confirmText = getBulkText([bulkSelection.length], 'confirm', 'preview');
            if (bulkSelection.length === 0) {
              sk.showModal(confirmText);
            // eslint-disable-next-line no-alert
            } else if (window.confirm(confirmText)) {
              sk.showWait();
              if (isChangedUrl()) {
                // url changed, refetch status
                sk.addEventListener('statusfetched', () => {
                  doBulkOperation('preview', 'update', 2, sk.config.innerHost);
                }, { once: true });
                sk.fetchStatus(true);
              } else {
                doBulkOperation('preview', 'update', 2, sk.config.innerHost);
              }
            }
          },
          isEnabled: (s) => s.isAuthorized('preview', 'write') && s.status.webPath,
        },
      });

      // bulk publish
      sk.add({
        id: 'bulk-publish',
        condition: (sidekick) => sidekick.isAdmin(),
        button: {
          text: i18n(sk, 'publish'),
          action: async () => {
            const confirmText = getBulkText([bulkSelection.length], 'confirm', 'publish');
            if (bulkSelection.length === 0) {
              sk.showModal(confirmText);
            // eslint-disable-next-line no-alert
            } else if (window.confirm(confirmText)) {
              sk.showWait();
              if (isChangedUrl()) {
                // url changed, refetch status
                sk.addEventListener('statusfetched', () => {
                  doBulkOperation('publish', 'publish', 40, sk.config.host || sk.config.outerHost);
                }, { once: true });
                sk.fetchStatus(true);
              } else {
                doBulkOperation('publish', 'publish', 40, sk.config.host || sk.config.outerHost);
              }
            }
          },
          isEnabled: (s) => s.isAuthorized('live', 'write') && s.status.webPath,
        },
      });

      // bulk copy urls
      sk.add({
        id: 'bulk-copy-urls',
        condition: (sidekick) => sidekick.isAdmin(),
        button: {
          isDropdown: true,
        },
      });
      [{
        env: 'preview',
        hostProperty: 'innerHost',
        condition: (sidekick) => sidekick.isAdmin(),
      }, {
        env: 'live',
        hostProperty: 'outerHost',
        condition: (sidekick) => sidekick.isAdmin(),
        advanced: (sidekick) => !!sidekick.config.host,
      }, {
        env: 'prod',
        hostProperty: 'host',
        condition: (sidekick) => sidekick.isAdmin() && sidekick.config.host,
      }].forEach(({
        env,
        hostProperty,
        condition,
        advanced = () => false,
      }) => {
        sk.add({
          id: `bulk-copy-${env}-urls`,
          container: 'bulk-copy-urls',
          condition,
          advanced,
          button: {
            text: i18n(sk, `copy_${env}_url`),
            action: async () => {
              const emptyText = getBulkText([bulkSelection.length], 'confirm');
              if (bulkSelection.length === 0) {
                sk.showModal(emptyText);
              } else {
                sk.showWait();
                if (isChangedUrl()) {
                  // url changed, refetch status
                  sk.addEventListener('statusfetched', () => {
                    doBulkCopyUrls(hostProperty);
                  }, { once: true });
                  sk.fetchStatus(true);
                } else {
                  doBulkCopyUrls(hostProperty);
                }
              }
            },
          },
        });
      });

      updateBulkInfo();
    }, { once: true });
  }
}
