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
/* eslint-disable no-unused-expressions */
/* eslint-env mocha */

import sinon from 'sinon';
import { expect } from '@esm-bundle/chai';
import { setUserAgent } from '@web/test-runner-commands';
import chromeMock from '../mocks/chromeMock.js';
import fetchMock from '../mocks/fetchMock.js';

const CONFIGS = [
  {
    owner: 'foo',
    repo: 'bar1',
    ref: 'main',
    host: '1.foo.bar',
    mountpoints: ['https://foo.sharepoint.com/sites/foo/Shared%20Documents/root1'],
  },
  {
    owner: 'foo',
    repo: 'bar2',
    ref: 'main',
    host: '2.foo.bar',
    mountpoints: ['https://foo.sharepoint.com/sites/foo/Shared%20Documents/root2'],
    disabled: true,
  },
  {
    owner: 'foo',
    repo: 'bar3',
    ref: 'main',
    host: '3.foo.bar',
    mountpoints: ['https://foo.sharepoint.com/something/boo/Shared%20Documents/root3'],
  },
  {
    owner: 'foo',
    repo: 'bar4',
    ref: 'main',
    host: '4.foo.bar',
    mountpoints: ['https://drive.google.com/drive/folders/1234567890'],
  },
  {
    owner: 'foo',
    repo: 'bar5',
    ref: 'main',
    host: '5.foo.bar',
    mountpoints: ['https://foo.custom/sites/foo/Shared%20Documents/root1'],
  },
  {
    owner: 'foo',
    repo: 'bar6',
    ref: 'main',
    previewHost: '6-preview.foo.bar',
    liveHost: '6-live.foo.bar',
    host: '6.foo.bar',
    mountpoints: ['https://foo.sharepoint.com/sites/foo/Shared%20Documents/root1'],
  },
];

window.chrome = chromeMock;
window.fetch = fetchMock;

describe('Test extension utils', () => {
  let utils = {};
  let consoleSpy;
  const sandbox = sinon.createSandbox();

  before(async () => {
    // console spy needs to be called before console.bind in utils.log
    consoleSpy = sandbox.spy(console);
    const exports = await import('../../src/extension/utils.js');
    utils = { ...exports };
    await setUserAgent('HeadlessChrome');
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('log', async () => {
    // Default log Level is 2
    utils.log.warn('foo');
    expect(typeof utils.log.warn).to.equal('function');
    expect(consoleSpy.warn.callCount).to.equal(1);
    expect(consoleSpy.warn.getCall(0).args[0]).to.include('[WARN]');
    expect(consoleSpy.warn.getCall(0).args[1]).to.include('color: orange');
    expect(consoleSpy.warn.calledWith('%c[WARN]', 'color: orange', 'foo')).to.be.true;

    utils.log.error('foo');
    expect(typeof utils.log.error).to.equal('function');
    expect(consoleSpy.error.callCount).to.equal(1);
    expect(consoleSpy.error.getCall(0).args[0]).to.include('[ERROR]');
    expect(consoleSpy.error.getCall(0).args[1]).to.include('color: red');
    expect(consoleSpy.error.calledWith('%c[ERROR]', 'color: red', 'foo')).to.be.true;

    // Should not Log messages below the log level 2
    utils.log.debug('foo');
    utils.log.info('foo');
    expect(consoleSpy.debug.callCount).to.equal(0);
    expect(consoleSpy.info.callCount).to.equal(0);

    // Should not Log messages below the log level 1
    utils.log.LEVEL = 1;
    utils.log.warn('level 1');
    // 1 callCount is from previous log
    expect(consoleSpy.warn.callCount).to.equal(1);
    utils.log.LEVEL = 6;
    utils.log.warn('level 3');
    expect(consoleSpy.warn.callCount).to.equal(2);
    // reset level to default
    utils.log.LEVEL = 2;
  });

  it('i18n', async () => {
    const spy = sandbox.spy(window.chrome.i18n, 'getMessage');
    // simple call
    utils.i18n('hello');
    expect(spy.calledWith('hello')).to.be.true;
    // call with subs
    utils.i18n('hello $1', ['world']);
    expect(spy.calledWith('hello $1', ['world'])).to.be.true;
  });

  it('url', async () => {
    const spy = sandbox.spy(window.chrome.runtime, 'getURL');
    utils.url('/foo');
    expect(spy.calledWith('/foo')).to.be.true;
  });

  it('getGitHubSettings', async () => {
    const { owner, repo, ref } = utils.getGitHubSettings('https://github.com/foo/bar/tree/baz');
    expect(owner).to.equal('foo');
    expect(repo).to.equal('bar');
    expect(ref).to.equal('baz');
    // default ref
    const { ref: defaultRef } = utils.getGitHubSettings('https://github.com/foo/bar');
    expect(defaultRef).to.equal('main');
    // clone url
    const { repo: noDotGit } = utils.getGitHubSettings('https://github.com/foo/bar.git');
    expect(noDotGit).to.equal('bar');
  });

  it('getConfig', async () => {
    const spy = sandbox.spy(window.chrome.storage.local, 'get');
    await utils.getConfig('local', 'test');
    expect(spy.calledWith('test')).to.be.true;
  });

  it('setConfig', async () => {
    const spy = sandbox.spy(window.chrome.storage.local, 'set');
    const obj = { foo: 'bar' };
    await utils.setConfig('local', obj);
    expect(spy.calledWith(obj)).to.be.true;
  });

  it('removeConfig', async () => {
    const spy = sandbox.spy(window.chrome.storage.local, 'remove');
    await utils.removeConfig('local', 'foo');
    expect(spy.calledWith('foo')).to.be.true;
  });

  it('clearConfig', async () => {
    const spy = sandbox.spy(window.chrome.storage.local, 'clear');
    await utils.clearConfig('local');
    expect(spy.called).to.be.true;
  });

  it('getState', async () => {
    const spy = sandbox.spy(window.chrome.storage.sync, 'get');
    const state = await new Promise((resolve) => {
      utils.getState((s) => {
        resolve(s);
      });
    });
    expect(spy.called).to.be.true;
    expect(typeof state).to.equal('object');
    expect(Object.keys(state).length).to.equal(4);
  });

  it('getShareSettings', async () => {
    const { giturl, project } = utils.getShareSettings('https://www.hlx.live/tools/sidekick/?giturl=https%3A%2F%2Fgithub.com%2Ffoo%2Fbar&project=bar');
    expect(giturl).to.equal('https://github.com/foo/bar');
    expect(project).to.equal('bar');
    expect(Object.keys(utils.getShareSettings('https://www.hlx.live/tools/sidekick/?giturl=https%3A%2F%2Fgithub.com')).length).to.equal(0);
  });

  it('isValidShareURL', async () => {
    expect(utils.isValidShareURL('https://www.hlx.live/tools/sidekick/?giturl=https%3A%2F%2Fgithub.com%2Ffoo%2Fbar')).to.be.true;
    expect(utils.isValidShareURL('https://www.example.com/tools/sidekick/?giturl=https%3A%2F%2Fgithub.com%2Ffoo%2Fbar')).to.be.false;
  });

  it('populateUrlCache', async () => {
    const fetchSpy = sandbox.spy(window, 'fetch');
    const storageSpy = sandbox.spy(window.chrome.storage.session, 'set');
    let onMessageListener;
    sandbox.stub(window.chrome.runtime.onMessage, 'addListener').callsFake((listener) => {
      expect(listener).to.be.a('function');
      onMessageListener = listener;
    });
    sandbox.stub(window.chrome.runtime, 'sendMessage').callsFake((message) => {
      expect(onMessageListener).to.be.a('function');
      expect(message).to.be.an('object');
      onMessageListener(message, { tab: { id: 0 } });
    });
    // static url without config: 0 calls
    await utils.populateUrlCache({ id: 0, url: 'https://www.hlx.live/' });
    expect(fetchSpy.callCount).to.equal(0);
    expect(storageSpy.callCount).to.equal(0);
    // sharepoint: 3 fetchSpy calls, 1 storageSpy call
    await utils.populateUrlCache({ id: 0, url: 'https://foo.sharepoint.com/:w:/r/sites/foo/_layouts/15/Doc.aspx?sourcedoc=%7BBFD9A19C-4A68-4DBF-8641-DA2F1283C895%7D&file=index.docx&action=default&mobileredirect=true' });
    // gdrive: 1 fetchSpy call, 1 storageSpy call
    await utils.populateUrlCache({ id: 0, url: 'https://docs.google.com/document/d/1234567890/edit' });
    expect(fetchSpy.callCount).to.equal(4);
    expect(storageSpy.callCount).to.equal(2);
    // cache: add new entry: 1 fetchSpy call, 1 storageSpy call
    await utils.populateUrlCache({ id: 0, url: 'https://docs.google.com/document/d/0987654321/edit' });
    expect(fetchSpy.callCount).to.equal(5);
    expect(storageSpy.callCount).to.equal(3);
    // cache: reuse existing match: 0 calls
    await utils.populateUrlCache({ id: 0, url: 'https://docs.google.com/document/d/0987654321/edit' });
    expect(fetchSpy.callCount).to.equal(5);
    expect(storageSpy.callCount).to.equal(3);
    // cache: refresh expired match: 1 fetchSpy call, 1 storageSpy call
    sandbox.stub(Date, 'now').returns(Date.now() + 7205000); // fast-forward 2 days and 5 seconds
    await utils.populateUrlCache({ id: 0, url: 'https://docs.google.com/document/d/0987654321/edit' });
    expect(fetchSpy.callCount).to.equal(6);
    expect(storageSpy.callCount).to.equal(4);
    // static url with config: 0 fetchSpy calls, 1 storageSpy call
    await utils.populateUrlCache({ id: 0, url: 'https://random.foo.bar/' }, { owner: 'foo', repo: 'random' });
    expect(fetchSpy.callCount).to.equal(6);
    expect(storageSpy.callCount).to.equal(5);
    // update static url with config: 0 fetchSpy calls, 1 storageSpy call
    await utils.populateUrlCache({ id: 0, url: 'https://random.foo.bar/' }, { owner: 'bar', repo: 'random' });
    expect(fetchSpy.callCount).to.equal(6);
    expect(storageSpy.callCount).to.equal(6);
    // 1s timeout: 1 fetchSpy call, 1 storageSpy call
    const executeScriptStub = sandbox.stub(window.chrome.scripting, 'executeScript');
    executeScriptStub.callsFake(() => new Promise((resolve) => {
      setTimeout(resolve, 2000);
    }));
    await utils.populateUrlCache({ id: 0, url: 'https://foo.sharepoint.com/:w:/r/sites/foo/_layouts/15/Doc.aspx?sourcedoc=%7BBFD9A19C-4A68-4DBF-8641-DA2F1283C895%7D&file=foo.docx&action=default&mobileredirect=true' });
    expect(fetchSpy.callCount).to.equal(7);
    expect(storageSpy.callCount).to.equal(7);
    // script injection error: 1 fetchSpy call, 1 storageSpy call
    executeScriptStub.rejects();
    await utils.populateUrlCache({ id: 0, url: 'https://foo.sharepoint.com/:w:/r/sites/foo/_layouts/15/Doc.aspx?sourcedoc=%7BBFD9A19C-4A68-4DBF-8641-DA2F1283C895%7D&file=index.xlsx&action=default&mobileredirect=true' });
    expect(fetchSpy.callCount).to.equal(8);
    expect(storageSpy.callCount).to.equal(8);
  });

  it('queryUrlCache', async () => {
    // known url
    let results = await utils.queryUrlCache('https://foo.sharepoint.com/:w:/r/sites/foo/_layouts/15/Doc.aspx?sourcedoc=%7BBFD9A19C-4A68-4DBF-8641-DA2F1283C895%7D&file=index.docx&action=default&mobileredirect=true');
    expect(results.length).to.equal(2);
    // unknown url
    results = await utils.queryUrlCache('https://foo.sharepoint.com/:x:/r/sites/foo/_layouts/15/Doc.aspx?sourcedoc=%7ABFD9A19C-4A68-4DBF-8641-DA2F1283C895%7D&file=index.xlsx&action=default&mobileredirect=true');
    expect(results.length).to.equal(0);
    // static url
    results = await utils.queryUrlCache('https://random.foo.bar/');
    expect(results.length).to.equal(1);
  });

  it('isValidProjectHost', () => {
    expect(utils.isValidProjectHost('https://main--bar--foo.hlx.page', 'foo', 'bar')).to.be.true;
    expect(utils.isValidProjectHost('https://main--bar--fake.hlx.live', 'foo', 'bar')).to.be.false;
    expect(utils.isValidProjectHost('https://main--bar--foo.hlx.random', 'foo', 'bar')).to.be.false;
  });

  it('getProjectMatches', async () => {
    // match sharepoint URL (docx)
    expect((await utils.getProjectMatches(CONFIGS, 'https://foo.sharepoint.com/:w:/r/sites/foo/_layouts/15/Doc.aspx?sourcedoc=%7BBFD9A19C-4A68-4DBF-8641-DA2F1283C895%7D&file=index.docx&action=default&mobileredirect=true')).length).to.equal(1);
    // match gdrive URL
    expect((await utils.getProjectMatches(CONFIGS, 'https://docs.google.com/document/d/1234567890/edit')).length).to.equal(1);
    // match preview URL
    expect((await utils.getProjectMatches(CONFIGS, 'https://main--bar1--foo.hlx.page/')).length).to.equal(1);
    // match preview URL with any ref
    expect((await utils.getProjectMatches(CONFIGS, 'https://baz--bar1--foo.hlx.page/')).length).to.equal(1);
    // match custom preview URL
    expect((await utils.getProjectMatches(CONFIGS, 'https://6-preview.foo.bar/')).length).to.equal(1);
    // match live URL
    expect((await utils.getProjectMatches(CONFIGS, 'https://main--bar1--foo.hlx.live/')).length).to.equal(1);
    // match custom live URL
    expect((await utils.getProjectMatches(CONFIGS, 'https://6-live.foo.bar/')).length).to.equal(1);
    // match production host
    expect((await utils.getProjectMatches(CONFIGS, 'https://1.foo.bar/')).length).to.equal(1);
    // match transient url
    expect((await utils.getProjectMatches(CONFIGS, 'https://main--bar0--foo.hlx.live/')).length).to.equal(1);
    // match transient url from cache
    await utils.populateUrlCache({ id: 0, url: 'https://transient.foo.bar/' }, { owner: 'bar', repo: 'random' });
    expect((await utils.getProjectMatches(CONFIGS, 'https://transient.foo.bar/')).length).to.equal(1);
    // ignore disabled config
    expect((await utils.getProjectMatches(CONFIGS, 'https://main--bar2--foo.hlx.live/')).length).to.equal(0);
  });

  it('getProjectEnv', async () => {
    const {
      host, project, mountpoints = [],
    } = await utils.getProjectEnv({
      owner: 'adobe',
      repo: 'business-website',
    });
    expect(host).to.equal('business.adobe.com');
    expect(project).to.equal('Adobe Business Website');
    expect(mountpoints[0]).to.equal('https://adobe.sharepoint.com/:f:/s/Dummy/Alk9MSH25LpBuUWA_N6DOL8BuI6Vrdyrr87gne56dz3QeQ');
  });

  it('assembleProject with giturl', async () => {
    const {
      owner, repo, ref,
    } = utils.assembleProject({
      giturl: 'https://github.com/adobe/business-website/tree/main',
    });
    expect(owner).to.equal('adobe');
    expect(repo).to.equal('business-website');
    expect(ref).to.equal('main');
  });

  it('assembleProject with owner and repo', async () => {
    const {
      giturl,
    } = utils.assembleProject({
      owner: 'adobe',
      repo: 'business-website',
      ref: 'test',
    });
    expect(giturl).to.equal('https://github.com/adobe/business-website/tree/test');
  });

  it('addProject', async () => {
    const spy = sandbox.spy(window.chrome.storage.sync, 'set');
    // add project
    const added = await new Promise((resolve) => {
      utils.addProject({
        giturl: 'https://github.com/test/project',
      }, resolve);
    });
    expect(added).to.be.true;
    expect(spy.calledWith({
      hlxSidekickProjects: ['adobe/blog', 'test/project'],
    })).to.be.true;
    // add project with auth enabled
    const addedWithAuth = await new Promise((resolve) => {
      utils.addProject({
        giturl: 'https://github.com/test/auth-project',
      }, resolve);
    });
    expect(addedWithAuth).to.be.true;
    expect(spy.calledWith({
      hlxSidekickProjects: ['adobe/blog', 'test/project', 'test/auth-project'],
    })).to.be.true;
    // add existing
    const addedExisting = await new Promise((resolve) => {
      utils.addProject({
        giturl: 'https://github.com/test/project',
      }, resolve);
    });
    expect(addedExisting).to.be.false;
  });

  it('setProject', async () => {
    const spy = sandbox.spy(window.chrome.storage.sync, 'set');
    // set project
    const project = {
      owner: 'test',
      repo: 'project',
      ref: 'main',
      project: 'Test',
    };
    const updated = await new Promise((resolve) => {
      utils.setProject(project, resolve);
    });
    expect(updated).to.equal(project);
    expect(spy.calledWith({
      'test/project': project,
    })).to.be.true;
  });

  it('deleteProject', async () => {
    const spy = sandbox.spy(window.chrome.storage.sync, 'set');

    await utils.setProjectAuthorizationToken({
      owner: 'adobe',
      repo: 'blog',
    }, '1234');

    const deleted = await new Promise((resolve) => {
      utils.deleteProject('adobe/blog', resolve);
    });
    expect(deleted).to.be.true;
    expect(spy.calledWith({
      hlxSidekickProjects: ['test/project', 'test/auth-project'],
    })).to.be.true;

    const rules = await chrome.declarativeNetRequest.getSessionRules();
    expect(rules).to.deep.equal([]);

    const protectedProject = await utils.getConfig('local', 'hlxSidekickProjects');
    expect(protectedProject).to.deep.equal({});
  });

  it('setDisplay', async () => {
    const spy = sandbox.spy(window.chrome.storage.local, 'set');
    await utils.setDisplay(true);
    expect(spy.calledWith({
      hlxSidekickDisplay: true,
    })).to.be.true;
  });

  it('toggleDisplay', async () => {
    const spy = sandbox.spy(window.chrome.storage.local, 'set');
    const display = await new Promise((resolve) => {
      utils.toggleDisplay((s) => {
        resolve(s);
      });
    });
    expect(spy.calledWith({
      hlxSidekickDisplay: false,
    })).to.be.true;
    expect(display).to.be.false;
  });

  it('isSharePointHost', async () => {
    expect(utils.isSharePointHost('https://foo.sharepoint.com/sites/foo/Shared%20Documents/root1')).to.be.true;
    expect(utils.isSharePointHost('https://foo.custom/sites/foo/Shared%20Documents/root1', CONFIGS)).to.be.true;
  });

  it('isGoogleDriveHost', async () => {
    expect(utils.isGoogleDriveHost('https://drive.google.com/drive/folders/1234567890')).to.be.true;
    expect(utils.isGoogleDriveHost('https://docs.google.com/document/d/1234567890/edit')).to.be.true;
  });

  it('storeAuthToken', async () => {
    const spy = sandbox.spy(window.chrome.storage.session, 'set');
    const token = '1234';
    const exp = (Date.now() / 1000) + 120;
    await utils.storeAuthToken('foo', token, exp);
    expect(spy.calledWith({
      foo: {
        owner: 'foo',
        authToken: token,
        authTokenExpiry: exp * 1000,
      },
    })).to.be.true;
    expect(spy.calledWith({ hlxSidekickProjects: ['foo'] })).to.be.true;
  });

  it('storeAuthToken (delete)', async () => {
    const spy = sandbox.spy(window.chrome.storage.session, 'remove');
    await utils.storeAuthToken('foo', '');
    expect(spy.calledWith('foo')).to.be.true;
  });

  it('setProjectAuthorizationToken (add and remove)', async () => {
    const spy = sandbox.spy(window.chrome.storage.local, 'set');
    await utils.setProjectAuthorizationToken({
      owner: 'foo',
      repo: 'bar',
    }, '1234');

    let protectedProject = await utils.getConfig('local', 'hlxSidekickProjects');
    expect(protectedProject).to.deep.equal({
      'foo/bar': '1234',
    });

    expect(spy.calledWith({
      hlxSidekickProjects: {
        'foo/bar': '1234',
      },
    })).to.be.true;

    await utils.setProjectAuthorizationToken({
      owner: 'foo',
      repo: 'bar',
    }, undefined);

    protectedProject = await utils.getConfig('local', 'hlxSidekickProjects');
    expect(protectedProject).to.deep.equal({});

    expect(spy.calledWith({
      hlxSidekickProjects: {},
    })).to.be.true;
  });

  it('updateProjectAuthorizationHeaderRules adds and removes', async () => {
    const spy = sandbox.spy(chrome.declarativeNetRequest, 'updateSessionRules');
    await utils.setProjectAuthorizationToken({
      owner: 'foo',
      repo: 'bar',
    }, '1234');

    await utils.updateProjectAuthorizationHeaderRules();
    expect(spy.calledWith([
      {
        id: 100,
        priority: 1,
        action: {
          type: 'modifyHeaders',
          requestHeaders: [
            {
              operation: 'set',
              header: 'authorization',
              value: 'token 1234',
            },
          ],
        },
        condition: {
          regexFilter: '^https://[a-z0-9-]+--bar--foo.aem.(page|live)/.*',
          requestMethods: [
            'get',
            'post',
          ],
          resourceTypes: [
            'main_frame',
          ],
        },
      },
    ]));

    await utils.setProjectAuthorizationToken({
      owner: 'foo',
      repo: 'bar',
    }, undefined);

    const rules = await chrome.declarativeNetRequest.getSessionRules();
    expect(rules).to.deep.equal([]);
  });
});
