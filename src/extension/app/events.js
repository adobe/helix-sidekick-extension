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

import { sampleRUM } from './rum.js';

/**
 * @event Sidekick#shown
 * @type {Sidekick} The sidekick
 * @description This event is fired when the sidekick has been shown.
 */

/**
 * @event Sidekick#hidden
 * @type {Sidekick} The sidekick
 * @description This event is fired when the sidekick has been hidden.
 */

/**
 * @event Sidekick#pluginused
 * @type {Object} The plugin used
 * @property {string} id The plugin ID
 * @property {Element} button The button element
 * @description This event is fired when a sidekick plugin has been used.
 */

/**
 * @event Sidekick#contextloaded
 * @type {Object} The context object
 * @property {SidekickConfig} config The sidekick configuration
 * @property {Location} location The sidekick location
 * @description This event is fired when the context has been loaded.
 */

/**
 * @event Sidekick#statusfetched
 * @type {Object} The status object
 * @description This event is fired when the status has been fetched.
 */

/**
 * @event Sidekick#envswitched
 * @type {Object} The environment object
 * @property {string} sourceUrl The URL of the source environment
 * @property {string} targetUrl The URL of the target environment
 * @description This event is fired when the environment has been switched
 */

/**
 * @event Sidekick#updated
 * @type {string} The updated path
 * @description This event is fired when a path has been updated.
 */

/**
 * @event Sidekick#deleted
 * @type {string} The deleted path
 * @description This event is fired when a path has been deleted.
 */

/**
 * @event Sidekick#published
 * @type {string} The published path
 * @description This event is fired when a path has been published.
 */

/**
 * @event Sidekick#unpublished
 * @type {string} The unpublished path
 * @description This event is fired when a path has been unpublished.
 */

/**
 * @event Sidekick#loggedin
 * @type {Sidekick} The sidekick
 * @description This event is fired when a user has logged in.
 */

/**
 * @event Sidekick#loggedout
 * @type {Sidekick} The sidekick
 * @description This event is fired when a user has logged out.
 */

/**
 * @event Sidekick#shared
 * @type {Sidekick} The sidekick
 * @description This event is fired when the sidekick has been shared.
 */

/**
 * @event Sidekick#helpnext
 * @type {string} The help topic
 * @description This event is fired when a user clicks next on a help dialog.
 */

/**
 * @event Sidekick#helpdismissed
 * @type {string} The help topic
 * @description This event is fired when a help dialog has been dismissed.
 */

/**
 * @event Sidekick#helpacknowledged
 * @type {string} The help topic
 * @description This event is fired when a help dialog has been acknowledged.
 */

/**
 * @event Sidekick#helpoptedout
 * @type {string} The help topic
 * @description This event is fired when a user decides to opt out of help content.
 */

/**
 * Fires an event with the given name.
 * @private
 * @param {Sidekick} sk The sidekick
 * @param {string} name The name of the event
 * @param {Object} data The data to pass to event listeners (optional)
 */
export function fireEvent(sk, name, data) {
  try {
    sk.dispatchEvent(new CustomEvent(name, {
      detail: {
        data: data || {
          config: JSON.parse(JSON.stringify(sk.config)),
          location: sk.location,
          status: sk.status,
        },
      },
    }));
    const userEvents = [
      'shown',
      'hidden',
      'updated',
      'published',
      'unpublished',
      'deleted',
      'envswitched',
      'page-info',
      'user',
      'loggedin',
      'loggedout',
      'helpnext',
      'helpdismissed',
      'helpacknowlegded',
      'helpoptedout',
    ];
    if (name.startsWith('custom:') || userEvents.includes(name)) {
      // log telemetry
      sampleRUM(`sidekick:${name}`, {
        source: data?.sourceUrl || sk.location.href,
        target: data?.targetUrl || sk.status.webPath,
      });
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('failed to fire event', name, e);
  }
}
