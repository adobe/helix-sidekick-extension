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

import { fireEvent } from './events.js';
import { initConfig } from './init.js';
import {
  appendTag,
  createDropdown,
  i18n,
  newTab,
} from './ui.js';
import {
  getAdminFetchOptions,
  getAdminUrl,
} from './utils.js';

/* env switcher */

/**
 * Adds the following environment plugins to the sidekick:
 * Debelopment,Preview, Live and Production
 * @private
 * @param {Sidekick} sk The sidekick
 */
export function addEnvFeature(sk) {
  // add env container
  let switchViewText = i18n(sk, 'switch_view');
  if (sk.isDev()) switchViewText = i18n(sk, 'development');
  if (sk.isInner()) switchViewText = i18n(sk, 'preview');
  if (sk.isOuter()) switchViewText = i18n(sk, 'live');
  if (sk.isProd()) switchViewText = i18n(sk, 'production');
  appendTag(sk.featureContainer, createDropdown({
    id: 'env',
    button: {
      text: switchViewText,
      isDropdown: true,
    },
  }));

  // dev
  sk.add({
    id: 'dev',
    container: 'env',
    condition: (sidekick) => sidekick.isEditor() || sidekick.isProject(),
    button: {
      text: i18n(sk, 'development'),
      action: async (evt) => {
        if (evt.target.classList.contains('pressed')) {
          return;
        }
        sk.switchEnv('dev', newTab(evt));
      },
      isPressed: (sidekick) => sidekick.isDev(),
      isEnabled: (sidekick) => sidekick.isDev()
        || (sidekick.status.preview && sidekick.status.preview.lastModified),
    },
    advanced: (sidekick) => !sidekick.isDev(),
  });

  // preview
  sk.add({
    id: 'preview',
    container: 'env',
    condition: (sidekick) => sidekick.isEditor() || sidekick.isProject(),
    button: {
      text: i18n(sk, 'preview'),
      action: async (evt) => {
        if (evt.target.classList.contains('pressed')) {
          return;
        }
        sk.switchEnv('preview', newTab(evt));
      },
      isPressed: (sidekick) => sidekick.isInner(),
      isEnabled: (sidekick) => sidekick.isInner()
        || (sidekick.status.preview && sidekick.status.preview.lastModified),
    },
  });

  // live
  sk.add({
    id: 'live',
    container: 'env',
    condition: (sidekick) => sidekick.config.outerHost
      && (sidekick.isEditor() || sidekick.isProject()),
    button: {
      text: i18n(sk, 'live'),
      action: async (evt) => {
        if (evt.target.classList.contains('pressed')) {
          return;
        }
        sk.switchEnv('live', newTab(evt));
      },
      isPressed: (sidekick) => sidekick.isOuter(),
      isEnabled: (sidekick) => sidekick.isOuter()
        || (sidekick.status.live && sidekick.status.live.lastModified),
    },
    advanced: (sidekick) => !!sidekick.config.host,
  });

  // production
  sk.add({
    id: 'prod',
    container: 'env',
    condition: (sidekick) => sidekick.config.host
      && sidekick.config.host !== sidekick.config.outerHost
      && (sidekick.isEditor() || sidekick.isProject()),
    button: {
      text: i18n(sk, 'production'),
      action: async (evt) => {
        if (evt.target.classList.contains('pressed')) {
          return;
        }
        sk.switchEnv('prod', newTab(evt));
      },
      isPressed: (sidekick) => sidekick.isProd(),
      isEnabled: (sidekick) => sidekick.isProd()
        || (sidekick.status.live && sidekick.status.live.lastModified),
    },
  });

  // keep empty env switcher hidden
  if (sk.root.querySelectorAll(':scope .feature-container .env .dropdown-container > div').length === 0) {
    sk.root.querySelector(':scope .feature-container .env').classList.add('hlx-sk-hidden');
  }
}

/* user dropdown */

async function checkProfileStatus(sk, status) {
  const url = getAdminUrl(sk.config, 'profile');
  const opts = getAdminFetchOptions(sk.config);
  return fetch(url, opts)
    .then((res) => res.json())
    .then((json) => (json.status === status))
    .catch(() => false);
}

/**
 * Logs the user in.
 * @private
 * @param {Sidekick} sk The sidekick
 * @param {boolean} selectAccount <code>true</code> to allow user to select account (optional)
 */
function login(sk, selectAccount) {
  sk.showWait();
  const loginUrl = getAdminUrl(sk.config, 'login');
  const extensionId = window.chrome?.runtime?.id;
  const authHeaderEnabled = extensionId && !window.navigator.vendor.includes('Apple');
  if (authHeaderEnabled) {
    loginUrl.searchParams.set('extensionId', extensionId);
  } else {
    loginUrl.searchParams.set(
      'loginRedirect',
      'https://www.hlx.live/tools/sidekick/login-success',
    );
  }
  if (selectAccount) {
    loginUrl.searchParams.set('selectAccount', true);
  }
  const loginWindow = window.open(loginUrl.toString());

  let attempts = 0;

  async function checkLoggedIn() {
    if (loginWindow.closed) {
      const { config, status, location } = sk;
      attempts += 1;
      // try 5 times after login window has been closed
      if (await checkProfileStatus(sk, 200)) {
        // logged in, stop checking
        delete status.status;
        sk.addEventListener('statusfetched', () => sk.hideModal(), { once: true });
        sk.config = await initConfig(config, location);
        sk.config.authToken = window.hlx.sidekickConfig.authToken;
        sk.fetchStatus();
        fireEvent(sk, 'loggedin');
        return;
      }
      if (attempts >= 5) {
        // give up after 5 attempts
        sk.showModal({
          message: i18n(sk, 'error_login_timeout'),
          sticky: true,
          level: 1,
        });
        return;
      }
    }
    // try again after 1s
    window.setTimeout(checkLoggedIn, 1000);
  }
  window.setTimeout(checkLoggedIn, 1000);
}

/**
 * Logs the user out.
 * @private
 * @param {Sidekick} sk The sidekick
 */
function logout(sk) {
  sk.showWait();
  const logoutUrl = getAdminUrl(sk.config, 'logout');
  const extensionId = window.chrome?.runtime?.id;
  if (extensionId && !window.navigator.vendor.includes('Apple')) { // exclude safari
    logoutUrl.searchParams.set('extensionId', extensionId);
  } else {
    logoutUrl.searchParams.set(
      'logoutRedirect',
      'https://www.hlx.live/tools/sidekick/logout-success',
    );
  }
  const logoutWindow = window.open(logoutUrl.toString());

  let attempts = 0;

  async function checkLoggedOut() {
    if (logoutWindow.closed) {
      attempts += 1;
      // try 5 times after login window has been closed
      if (await checkProfileStatus(sk, 401)) {
        delete sk.status.profile;
        delete sk.config.authToken;
        sk.addEventListener('statusfetched', () => sk.hideModal(), { once: true });
        sk.fetchStatus();
        fireEvent(sk, 'loggedout');
        return;
      }
      if (attempts >= 5) {
        // give up after 5 attempts
        sk.showModal({
          message: i18n(sk, 'error_logout_error'),
          sticky: true,
          level: 1,
        });
        return;
      }
    }
    // try again after 1s
    window.setTimeout(checkLoggedOut, 1000);
  }
  window.setTimeout(checkLoggedOut, 1000);
}

/**
 * Checks if the user needs to log in or updates the user menu.
 * @private
 * @param {Sidekick} sk The sidekick
 */
function checkUserState(sk) {
  const toggle = sk.userMenu.firstElementChild;
  toggle.removeAttribute('disabled');
  const updateUserPicture = async (picture, name) => {
    toggle.querySelector('.user-picture')?.remove();
    if (picture) {
      if (picture.startsWith('https://admin.hlx.page/')) {
        // fetch the image with auth token
        const resp = await fetch(picture, {
          headers: {
            'x-auth-token': sk.config.authToken,
          },
        });
        picture = URL.createObjectURL(await resp.blob());
      }
      toggle.querySelector('.user-icon').classList.add('user-icon-hidden');
      appendTag(toggle, {
        tag: 'img',
        attrs: {
          class: 'user-picture',
          src: picture,
        },
      });
      toggle.title = name;
    } else {
      toggle.querySelector('.user-picture')?.remove();
      toggle.querySelector('.user-icon').classList.remove('user-icon-hidden');
      toggle.title = i18n(sk, 'anonymous');
    }
  };
  const { profile } = sk.status;
  if (profile) {
    const { name, email, picture } = profile;
    updateUserPicture(picture, name);
    sk.remove('user-login');

    const info = sk.get('user-info');
    if (!info) {
      sk.add({
        // create user info box
        condition: (sidekick) => sidekick.isAuthenticated(),
        container: 'user',
        id: 'user-info',
        elements: [{
          tag: 'div',
          text: name,
          attrs: {
            class: 'profile-name',
          },
          lstnrs: {
            click: (e) => {
              e.stopPropagation();
            },
          },
        },
        {
          tag: 'div',
          text: email,
          attrs: {
            class: 'profile-email',
          },
          lstnrs: {
            click: (e) => {
              e.stopPropagation();
            },
          },
        }],
      });
    } else {
      // update user info box
      info.querySelector('.profile-name').textContent = name;
      info.querySelector('.profile-email').textContent = email;
    }
    // switch user
    sk.add({
      container: 'user',
      id: 'user-switch',
      condition: (sidekick) => sidekick.isAuthenticated(),
      button: {
        text: i18n(sk, 'user_switch'),
        action: () => login(sk, true),
      },
    });
    // logout
    sk.add({
      container: 'user',
      id: 'user-logout',
      condition: (sidekick) => sidekick.isAuthenticated(),
      button: {
        text: i18n(sk, 'user_logout'),
        action: () => logout(sk),
      },
    });
    // clean up on logout
    sk.addEventListener('loggedout', () => {
      sk.remove('user-info');
      sk.remove('user-switch');
      sk.remove('user-logout');
    });
  } else {
    updateUserPicture();
    // login
    sk.add({
      container: 'user',
      id: 'user-login',
      condition: (sidekick) => !sidekick.status.profile || !sidekick.isAuthenticated(),
      button: {
        text: i18n(sk, 'user_login'),
        action: () => login(sk),
      },
    });
    // clean up on login
    sk.addEventListener('loggedin', () => {
      sk.remove('user-login');
    });
    if (!sk.status.loggedOut && sk.status.status === 401 && !sk.isAuthenticated()) {
      // // encourage login
      toggle.click();
      toggle.nextElementSibling.classList.add('highlight');
    }
  }
}

/**
 * Adds the user feature to the sidekick.
 * @private
 * @param {Sidekick} sk The sidekick
 */
function addUserFeature(sk) {
  sk.userMenu = appendTag(
    sk.featureContainer,
    createDropdown(sk, {
      id: 'user',
      button: {
        attrs: {
          disabled: '',
          title: i18n(sk, 'anonymous'),
        },
        elements: [{
          tag: 'div',
          attrs: {
            class: 'user-icon',
          },
        }],
      },
    }),
  );
}

/* info feature */

function getTimeAgo(sk, dateParam) {
  if (!dateParam) {
    return i18n(sk, 'never');
  }
  const date = typeof dateParam === 'object' ? dateParam : new Date(dateParam);

  const today = new Date();
  const yesterday = new Date(today - 86400000); // 86400000 = ms in a day
  const seconds = Math.round((today - date) / 1000);
  const minutes = Math.round(seconds / 60);
  const isToday = today.toDateString() === date.toDateString();
  const isYesterday = yesterday.toDateString() === date.toDateString();
  const isThisYear = today.getFullYear() === date.getFullYear();
  const timeToday = date.toLocaleTimeString([], {
    timeStyle: 'short',
  });
  const dateThisYear = date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });
  const fullDate = date.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
  });

  if (seconds < 30) {
    return i18n(sk, 'now');
  } else if (seconds < 120) {
    return i18n(sk, 'seconds_ago').replace('$1', seconds);
  } else if (minutes < 60) {
    return i18n(sk, 'minutes_ago').replace('$1', minutes);
  } else if (isToday) {
    return i18n(sk, 'today_at').replace('$1', timeToday);
  } else if (isYesterday) {
    return i18n(sk, 'yesterday_at').replace('$1', timeToday);
  } else if (isThisYear) {
    return dateThisYear;
  }

  return fullDate;
}

function updateModifiedDates(sk) {
  const infoPlugin = sk.get('info');
  if (!infoPlugin) {
    return;
  }

  const editEl = infoPlugin.querySelector('.edit-date');
  const previewEl = infoPlugin.querySelector('.preview-date');
  const publishEl = infoPlugin.querySelector('.publish-date');

  const { status } = sk;
  const editLastMod = (status.edit && status.edit.lastModified) || null;
  const previewLastMod = (status.preview && status.preview.lastModified) || null;
  const liveLastMod = (status.live && status.live.lastModified) || null;

  editEl.innerHTML = getTimeAgo(sk, editLastMod);
  previewEl.innerHTML = getTimeAgo(sk, previewLastMod);
  publishEl.innerHTML = getTimeAgo(sk, liveLastMod);
}

/**
 * Checks info feature based on the latest state.
 * @private
 * @param {Sidekick} sk The sidekick
 */
function checkInfoState(sk) {
  if (!sk.isAdmin()) {
    const info = sk.get('page-info');
    if (!info) {
      const toggle = sk.get('info').firstElementChild;
      toggle.removeAttribute('disabled');

      sk.add({
        id: 'page-info',
        container: 'info',
        condition: () => true,
        elements: [
          {
            tag: 'div',
            attrs: {
              class: 'edit-date-container',
            },
          },
          {
            tag: 'div',
            attrs: {
              class: 'preview-date-container',
            },
          },
          {
            tag: 'div',
            attrs: {
              class: 'publish-date-container',
            },
          },
        ],
      });
    }
    sk.get('page-info').querySelector('.edit-date-container')
      .innerHTML = `<span>${i18n(sk, 'edit_date')}</span><span class="edit-date"></span>`;
    sk.get('page-info').querySelector('.preview-date-container')
      .innerHTML = `<span>${i18n(sk, 'preview_date')}</span><span class="preview-date"></span>`;
    sk.get('page-info').querySelector('.publish-date-container')
      .innerHTML = `<span>${i18n(sk, 'publish_date')}</span><span class="publish-date"></span>`;
    updateModifiedDates(sk);
  }
}

/**
 * Adds the info feature to the sidekick
 * @private
 * @param {Sidekick} sk The sidekick
 */
function addInfoFeature(sk) {
  appendTag(
    sk.featureContainer,
    createDropdown(sk, {
      id: 'info',
      lstnrs: {
        click: () => {
          sk.fetchStatus();
          updateModifiedDates(sk);
        },
      },
      button: {
        attrs: {
          disabled: '',
          title: i18n(sk, 'info'),
        },
        elements: [{
          tag: 'div',
          attrs: {
            class: 'info-icon',
          },
        }],
      },
    }),
  );
}

/* share */

/**
 * Returns the share URL for the sidekick bookmarklet.
 * @private
 * @param {Object} config The sidekick configuration
 * @param {string} from The URL of the referrer page
 * @returns {string} The share URL
 */
function getShareUrl(config, from) {
  const shareUrl = new URL('https://www.hlx.live/tools/sidekick/');
  shareUrl.search = new URLSearchParams([
    ['project', config.project || ''],
    ['from', from || ''],
    ['giturl', `https://github.com/${config.owner}/${config.repo}/tree/${config.ref}`],
  ]).toString();
  return shareUrl.toString();
}

/**
 * Creates a share URL for this sidekick and either invokes the
 * Web Share API or copies it to the clipboard.
 * @private
 * @param {Sidekick} sk The sidekick
 */
function shareSidekick(sk) {
  const { config } = sk;
  const shareUrl = getShareUrl(config);
  if (navigator.share) {
    navigator.share({
      text: i18n(sk, 'config_shareurl_share_title').replace('$1', config.project),
      url: shareUrl,
    });
  } else {
    navigator.clipboard.writeText(shareUrl);
    sk.showModal(i18n(sk, 'config_shareurl_copied').replace('$1', config.project));
  }
  // log telemetry
  fireEvent(sk, 'shared');
}

/**
 * Adds the share feature to the sidekick
 * @private
 * @param {Sidekick} sk The sidekick
 */
function addShareFeature(sk) {
  const share = appendTag(sk.featureContainer, {
    tag: 'button',
    attrs: {
      class: 'share',
      title: i18n(sk, 'share_description'),
    },
    lstnrs: {
      click: () => shareSidekick(sk),
    },
  });
  appendTag(share, { tag: 'i' });
}

/* close */

/**
 * Adds the close feature to the sidekick
 * @private
 * @param {Sidekick} sk The sidekick
 */
function addCloseFeature(sk) {
  appendTag(sk.featureContainer, {
    tag: 'button',
    attrs: {
      title: i18n(sk, 'close'),
      class: 'close',
    },
    lstnrs: {
      click: () => sk.hide(),
    },
  });
}

/**
 * Adds the default features to the sidekick.
 * @private
 * @param {Sidekick} sk The sidekick
 */
export function addFeatures(sk) {
  addEnvFeature(sk);
  addInfoFeature(sk);
  addUserFeature(sk);
  addShareFeature(sk);
  addCloseFeature(sk);
}

/**
 * Checks the features based on the latest sidekick state.
 * @private
 * @param {Sidekick} sk The sidekick
 */
export function checkFeaturesState(sk) {
  checkInfoState(sk);
  checkUserState(sk);
}
