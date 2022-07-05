/*
 * Copyright 2021 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

const express = require('express');
const debugServer = express();
const title = 'Helix Sidekick Debug Server';
const port = 3001;

debugServer.get('/', (_, res) => {
  res.redirect(301, '/debug/index.html')
});

debugServer.use(express.static('.', {
  index: false,
  redirect: false,
  setHeaders: (res) => res.set('access-control-allow-origin', '*'),
}));

debugServer.listen(port, () => {
  console.log(`${title} started at http://localhost:${port}/`);
  console.log('Open the above link in a browser for instructions.');
  console.log('Press Ctrl + C to stop server...');
});
