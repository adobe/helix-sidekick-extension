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

/**
 * Mapping between the plugin IDs that will be treated as environments
 * and their corresponding host properties in the config.
 * @private
 * @type {Object}
 */
export const ENVS = {
  dev: 'localhost',
  preview: 'innerHost',
  live: 'outerHost',
  prod: 'host',
};

/**
 * Array of restricted paths with limited sidekick functionality.
 * @private
 * @type {string[]}
 */
export const RESTRICTED_PATHS = [
  '/helix-env.json',
];

/**
 * The URL of the development environment.
 * @see {@link https://github.com/adobe/helix-cli|AEM CLI}).
 * @private
 * @type {URL}
 */
export const DEV_URL = new URL('http://localhost:3000');

/**
 * Retrieves project details from a host name.
 * @private
 * @param {string} host The host name
 * @returns {string[]} The project details
 * @throws {Error} if host is not a project host
 */
export function getProjectDetails(host) {
  const details = host.split('.')[0].split('--');
  if (details.length < 2) {
    throw new Error('not a project host');
  }
  if (details.length === 3) {
    // lose ref
    details.shift();
  }
  return details;
}

/**
 * Checks if a project host name matches another, regardless of ref.
 * @private
 * @param {string} baseHost The base host
 * @param {string} host The host to match against the base host
 * @returns {boolean} <code>true</code> if the hosts match, else <code>false</code>
 */
export function matchProjectHost(baseHost, host) {
  if (!baseHost || !host) {
    return false;
  }
  // direct match
  if (baseHost === host) {
    return true;
  }
  // matching project domains
  const projectDomains = ['page', 'hlx.live'];
  if (!projectDomains.find((domain) => baseHost.endsWith(domain)
    && host.endsWith(domain))) {
    return false;
  }
  // project details
  try {
    const [baseHostRepo, baseHostOwner] = getProjectDetails(baseHost);
    const [hostRepo, hostOwner] = getProjectDetails(host);
    return baseHostOwner === hostOwner && baseHostRepo === hostRepo;
  } catch (e) {
    // ignore if no project host
  }
  return false;
}

/**
 * Turns a globbing into a regular expression.
 * @private
 * @param {string} glob The globbing
 * @returns The regular expression
 */
export function globToRegExp(glob) {
  if (!glob) {
    glob = '**';
  }
  const reString = glob
    .replace(/\*\*/g, '_')
    .replace(/\*/g, '[0-9a-z-.]*')
    .replace(/_/g, '.*');
  return new RegExp(`^${reString}$`);
}

/**
 * Creates an Admin URL for an API and path.
 * @private
 * @param {Object} config The sidekick configuration
 * @param {string} api The API endpoint to call
 * @param {string} path The current path
 * @returns {URL} The admin URL
 */
export function getAdminUrl({
  owner, repo, ref, adminVersion,
}, api, path = '') {
  const adminUrl = new URL([
    'https://admin.hlx.page/',
    api,
    `/${owner}`,
    `/${repo}`,
    `/${ref}`,
    path,
  ].join(''));
  if (adminVersion) {
    adminUrl.searchParams.append('hlx-admin-version', adminVersion);
  }
  return adminUrl;
}

/**
 * Returns the fetch options for admin requests
 * @returns {object}
 */
export function getAdminFetchOptions() {
  const opts = {
    cache: 'no-store',
    credentials: 'include',
    headers: {},
  };
  return opts;
}

/**
 * Fetches the dictionary for a language.
 * @private
 * @param {Sidekick} sk The sidekick
 * @param {string} lang The language
 * @returns {Object} The dictionary
 */
export async function fetchDict(sk, lang) {
  const dict = {};
  const dictPath = `${sk.config.scriptRoot}/_locales/${lang}/messages.json`;
  try {
    const res = await fetch(dictPath);
    const messages = await res.json();
    Object.keys(messages).forEach((key) => {
      dict[key] = messages[key].message;
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(`failed to fetch dictionary from ${dictPath}`);
  }
  return dict;
}
