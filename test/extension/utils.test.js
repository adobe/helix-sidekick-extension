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
import chromeMock from './chromeMock.js';
import fetchMock from './fetchMock.js';

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
];

window.chrome = chromeMock;
window.fetch = fetchMock;

describe('Test extension utils', () => {
  let utils = {};
  const sandbox = sinon.createSandbox();

  before(async () => {
    // eslint-disable-next-line no-var
    const exports = await import('../../src/extension/utils.js');
    utils = {
      ...exports,
    };
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('log', async () => {
    const spy = sandbox.spy(console, 'log');
    utils.log.error('foo');
    expect(spy.calledWith('ERROR', 'foo')).to.be.true;
    utils.log.warn('foo');
    expect(spy.calledWith('WARN', 'foo')).to.be.true;
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

  it('checkLastError', async () => {
    chrome.runtime.lastError = new Error('foo');
    const lastError = utils.checkLastError();
    expect(lastError).to.exist;
    expect(lastError).to.equal('foo');
    chrome.runtime.lastError = null;
  });

  it('getMountpoints', async () => {
    const [mp] = await utils.getMountpoints('adobe', 'helix-project-boilerplate', 'main');
    expect(mp).to.equal('https://drive.google.com/drive/u/0/folders/1MGzOt7ubUh3gu7zhZIPb7R7dyRzG371j');
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

  it('getShareSettings', async () => {
    const { giturl, project } = utils.getShareSettings('https://www.hlx.live/tools/sidekick/?giturl=https%3A%2F%2Fgithub.com%2Ffoo%2Fbar&project=bar');
    expect(giturl).to.equal('https://github.com/foo/bar');
    expect(project).to.equal('bar');
    expect(Object.keys(utils.getShareSettings('https://www.hlx.live/tools/sidekick/?giturl=https%3A%2F%2Fgithub.com')).length).to.equal(0);
  });

  it('isValidShareURL', async () => {
    const res = utils.isValidShareURL('https://www.hlx.live/tools/sidekick/?giturl=https%3A%2F%2Fgithub.com%2Ffoo%2Fbar');
    expect(res).to.be.true;
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

  it('getProjectMatches', async () => {
    const spy = sandbox.spy(window, 'fetch');
    // match sharepoint URL (docx)
    expect((await utils.getProjectMatches(CONFIGS, 'https://foo.sharepoint.com/:w:/r/sites/foo/_layouts/15/Doc.aspx?sourcedoc=%7BBFD9A19C-4A68-4DBF-8641-DA2F1283C895%7D&file=index.docx&action=default&mobileredirect=true')).length).to.equal(1);
    expect(spy.callCount).to.equal(3);
    // match gdrive URL
    expect((await utils.getProjectMatches(CONFIGS, 'https://docs.google.com/document/d/1234567890/edit')).length).to.equal(1);
    expect(spy.callCount).to.equal(4);
    // reuse match from cache
    await utils.getProjectMatches(CONFIGS, 'https://docs.google.com/document/d/1234567890/edit');
    expect(spy.callCount).to.equal(4);
    // refreshes expired match in cache
    sandbox.stub(Date, 'now').returns(Date.now() + 7205000); // fast-forward 2 days and 5 seconds
    await utils.getProjectMatches(CONFIGS, 'https://docs.google.com/document/d/1234567890/edit');
    expect(spy.callCount).to.equal(5);
    // match preview URL
    expect((await utils.getProjectMatches(CONFIGS, 'https://main--bar1--foo.hlx.page/')).length).to.equal(1);
    // match preview URL with any ref
    expect((await utils.getProjectMatches(CONFIGS, 'https://baz--bar1--foo.hlx.page/')).length).to.equal(1);
    // match live URL
    expect((await utils.getProjectMatches(CONFIGS, 'https://main--bar1--foo.hlx.live/')).length).to.equal(1);
    // match production host
    expect((await utils.getProjectMatches(CONFIGS, 'https://1.foo.bar/')).length).to.equal(1);
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
    } = await utils.assembleProject({
      giturl: 'https://github.com/adobe/business-website/tree/main',
    });
    expect(owner).to.equal('adobe');
    expect(repo).to.equal('business-website');
    expect(ref).to.equal('main');
  });

  it('assembleProject with owner and repo', async () => {
    const {
      giturl,
    } = await utils.assembleProject({
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

  it('deleteProject', async () => {
    const spy = sandbox.spy(window.chrome.storage.sync, 'set');
    const deleted = await new Promise((resolve) => {
      utils.deleteProject('adobe/blog', resolve);
    });
    expect(deleted).to.be.true;
    expect(spy.calledWith({
      hlxSidekickProjects: ['test/project', 'test/auth-project'],
    })).to.be.true;
  });

  it('updateProjectConfigs', async () => {
    sandbox.spy(window.chrome.storage.sync, 'set');
    sandbox.spy(window.chrome.storage.sync, 'remove');
    await utils.removeConfig('sync', 'hlxSidekickProjects');
    await utils.updateProjectConfigs();
    // expect(chrome.storage.sync.remove.calledWith('hlxSidekickConfigs')).to.be.true;
    expect(chrome.storage.sync.set.calledWith({
      hlxSidekickProjects: ['test/legacy-project'],
    })).to.be.true;
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
});
