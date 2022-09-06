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
const HELIX_ENV_JSON = {
  version: 1,
  prod: {
    host: 'business.adobe.com',
    routes: [],
  },
  project: 'Adobe Business Wesbite',
  contentSourceUrl: 'https://adobe.sharepoint.com/:f:/s/Dummy/Alk9MSH25LpBuUWA_N6DOL8BuI6Vrdyrr87gne56dz3QeQ',
  contentSourceType: 'onedrive',
};

const FSTAB_YAML = `mountpoints:
  /: https://drive.google.com/drive/u/0/folders/1MGzOt7ubUh3gu7zhZIPb7R7dyRzG371j
`;

class ResponseMock {
  constructor(body) {
    this.ok = true;
    this.status = 200;
    this.body = body;
  }

  async json() {
    return JSON.parse(this.body);
  }

  async text() {
    return this.body;
  }
}

export default async function fetchMock(url) {
  const path = new URL(url).pathname;
  if (path.endsWith('/fstab.yaml')) {
    return new ResponseMock(FSTAB_YAML);
  } else if (path === '/helix-env.json') {
    return new ResponseMock(JSON.stringify(HELIX_ENV_JSON));
  }
  return new ResponseMock('');
}
