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
 * @typedef {Object} HelpStep
 * @description The definition of a help step inside a {@link HelpTopic|help topic}.
 * @prop {string} message The help message
 * @prop {string} selector The CSS selector of the target element
 */

/**
 * @typedef {Object} HelpTopic
 * @description The definition of a help topic.
 * @prop {string} id The ID of the help topic
 * @prop {HelpStep[]} steps An array of {@link HelpStep|help steps}
 */
