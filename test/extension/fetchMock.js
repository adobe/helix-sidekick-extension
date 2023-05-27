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
  project: 'Adobe Business Website',
  contentSourceUrl: 'https://adobe.sharepoint.com/:f:/s/Dummy/Alk9MSH25LpBuUWA_N6DOL8BuI6Vrdyrr87gne56dz3QeQ',
  contentSourceType: 'onedrive',
};

const FSTAB_YAML = `mountpoints:
  /: https://drive.google.com/drive/u/0/folders/1MGzOt7ubUh3gu7zhZIPb7R7dyRzG371j
`;

const DISCOVER_JSON = [
  { owner: 'foo', repo: 'bar1' },
];

const DRIVE_ITEM_JSON = {
  webUrl: 'https://foo.sharepoint.com/:w:/r/sites/foo/_layouts/15/Doc.aspx?sourcedoc=%7BBFD9A19C',
  parentReference: {
    driveId: '1234',
    itemId: 'foobar',
    path: '1234/root:/products',
  },
  name: 'index.docx',
  file: {
    mimeType: 'word',
  },
};

const ROOT_ITEM_JSON = {
  webUrl: 'https://foo.sharepoint.com/sites/foo/Shared Documents',
};

class ResponseMock {
  constructor(res) {
    this.body = res.body || res || '';
    this.status = res.status || 200;
    this.ok = this.status === 200;
  }

  async json() {
    return JSON.parse(this.body);
  }

  async text() {
    return this.body;
  }
}

export default async function fetchMock(url, options = {}) {
  const path = new URL(url).pathname;
  if (path.endsWith('/fstab.yaml')) {
    return new ResponseMock(FSTAB_YAML);
  } else if (path.endsWith('/env.json')) {
    if (path.includes('/test/auth-project/')) {
      if (options.headers && options.headers['x-auth-token']) {
        return new ResponseMock(JSON.stringify(HELIX_ENV_JSON));
      } else {
        return new ResponseMock({ status: 401 });
      }
    }
    return new ResponseMock(JSON.stringify(HELIX_ENV_JSON));
  } else if (path.startsWith('/discover')) {
    return new ResponseMock(JSON.stringify(DISCOVER_JSON));
  } else if (path.startsWith('/_api/v2.0/shares/')) {
    return new ResponseMock(JSON.stringify(DRIVE_ITEM_JSON));
  } else if (path.startsWith('/_api/v2.0/drives/1234')) {
    return new ResponseMock(JSON.stringify(ROOT_ITEM_JSON));
  }
  // eslint-disable-next-line no-console
  console.log(`unmocked url, returning empty string for ${url}`);
  return new ResponseMock('');
}
