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
/* global describe before it */

import sinon from 'sinon';
import { expect } from '@esm-bundle/chai';
import chromeMock from './chromeMock.js';

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

describe('Test extension utils', () => {
  let utils = {};

  before(async () => {
    // eslint-disable-next-line no-var
    const exports = await import('../../src/extension/utils.js');
    utils = {
      ...exports,
    };
  });

  it('log', async () => {
    const spy = sinon.spy(console, 'log');
    window.LOG_LEVEL = 4;
    utils.log.error('foo');
    expect(spy.calledWith('ERROR', 'foo')).to.be.true;
    utils.log.warn('foo');
    expect(spy.calledWith('WARN', 'foo')).to.be.true;
    utils.log.info('foo');
    expect(spy.calledWith('INFO', 'foo')).to.be.true;
    utils.log.debug('foo');
    expect(spy.calledWith('DEBUG', 'foo')).to.be.true;
    delete window.LOG_LEVEL;
    spy.restore();
  });

  it('i18n', async () => {
    const spy = sinon.spy(window.chrome.i18n, 'getMessage');
    // simple call
    utils.i18n('hello');
    expect(spy.calledWith('hello')).to.be.true;
    // call with subs
    utils.i18n('hello $1', ['world']);
    expect(spy.calledWith('hello $1', ['world'])).to.be.true;
    spy.restore();
  });

  it('url', async () => {
    const spy = sinon.spy(window.chrome.runtime, 'getURL');
    utils.url('/foo');
    expect(spy.calledWith('/foo')).to.be.true;
    spy.restore();
  });

  it('checkLastError', async () => {
    const lastError = utils.checkLastError();
    expect(lastError).to.exist;
    expect(lastError.message).to.equal('foo');
  });

  it('getMountpoints', async () => {
    // todo: mock
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
  });

  it('getShareSettings', async () => {
    const { giturl, project } = utils.getShareSettings('https://www.hlx.live/tools/sidekick/?giturl=https%3A%2F%2Fgithub.com%2Ffoo%2Fbar&project=bar');
    expect(giturl).to.equal('https://github.com/foo/bar');
    expect(Object.keys(utils.getShareSettings('https://www.hlx.live/tools/sidekick/?giturl=https%3A%2F%2Fgithub.com')).length).to.equal(0);
    expect(project).to.equal('bar');
  });

  it('isValidShareURL', async () => {
    const res = utils.isValidShareURL('https://www.hlx.live/tools/sidekick/?giturl=https%3A%2F%2Fgithub.com%2Ffoo%2Fbar');
    expect(res).to.be.true;
  });

  it('assembleConfig', async () => {
    // todo: mock
    const {
      owner, repo, ref, host,
    } = await utils.assembleConfig({
      giturl: 'https://github.com/adobe/blog',
    });
    expect(owner).to.equal('adobe');
    expect(repo).to.equal('blog');
    expect(ref).to.equal('main');
    expect(host).to.equal('blog.adobe.com');
  });

  it('getConfig', async () => {
    const spy = sinon.spy(window.chrome.storage.sync, 'get');
    await utils.getConfig('sync', 'name');
    expect(spy.calledWith('name')).to.be.true;
    spy.restore();
  });

  it('setConfig', async () => {
    const spy = sinon.spy(window.chrome.storage.sync, 'set');
    const obj = { foo: 'bar' };
    await utils.setConfig('sync', obj);
    expect(spy.calledWith(obj)).to.be.true;
    spy.restore();
  });

  it('addConfig', async () => {
    const added = await new Promise((resolve) => {
      utils.addConfig(0, resolve);
    });
    expect(added).to.be.true;
  });

  it('deleteConfig', async () => {
    const deleted = await new Promise((resolve) => {
      utils.deleteConfig(0, resolve);
    });
    expect(deleted).to.be.true;
  });

  it('clearConfig', async () => {
    const spy = sinon.spy(window.chrome.storage.sync, 'clear');
    await utils.clearConfig('sync', () => {});
    expect(spy.called).to.be.true;
    spy.restore();
  });

  it('getState', async () => {
    const spy = sinon.spy(window.chrome.storage.sync, 'get');
    const state = await new Promise((resolve) => {
      utils.getState((s) => {
        resolve(s);
      });
    });
    expect(spy.called).to.be.true;
    expect(typeof state).to.equal('object');
    expect(Object.keys(state).length).to.equal(7);
    spy.restore();
  });

  it('getConfigMatches', async () => {
    // match sharepoint URL (docx)
    expect(utils.getConfigMatches(CONFIGS, 'https://foo.sharepoint.com/:w:/r/sites/foo/_layouts/15/Doc.aspx?sourcedoc=%7BBFD9A19C-4A68-4DBF-8641-DA2F1283C895%7D&file=index.docx&action=default&mobileredirect=true').length).to.equal(1);
    // match sharepoint URL (pdf)
    expect(utils.getConfigMatches(CONFIGS, 'https://foo.sharepoint.com/sites/HelixProjects/Shared%20Documents/sites/foo/drafts/example.pdf?CT=0657697518721&OR=ItemsView').length).to.equal(1);
    // match custom sharepoint URL
    expect(utils.getConfigMatches(CONFIGS, 'https://foo.custom/:w:/r/sites/foo/_layouts/15/Doc.aspx?sourcedoc=%7BBFD9A19C-4A68-4DBF-8641-DA2F1283C895%7D&file=index.docx&action=default&mobileredirect=true').length).to.equal(1);
    // match gdrive URL
    expect(utils.getConfigMatches(CONFIGS, 'https://docs.google.com/document/d/1234567890/edit').length).to.equal(1);
    // match preview URL
    expect(utils.getConfigMatches(CONFIGS, 'https://main--bar1--foo.hlx.page/').length).to.equal(1);
    // match preview URL with any ref
    expect(utils.getConfigMatches(CONFIGS, 'https://baz--bar1--foo.hlx.page/').length).to.equal(1);
    // match live URL
    expect(utils.getConfigMatches(CONFIGS, 'https://main--bar1--foo.hlx.live/').length).to.equal(1);
    // match production host
    expect(utils.getConfigMatches(CONFIGS, 'https://1.foo.bar/').length).to.equal(1);
    // match proxy url
    expect(utils.getConfigMatches(CONFIGS, 'http://localhost:3000/', 'https://main--bar2--foo.hlx.live/').length).to.equal(0);
    // unsupported sharepoint URL
    expect(utils.getConfigMatches(CONFIGS, 'https://foo.sharepoint.com/:w:/r/sites/boo/_layouts/15/Doc.aspx?sourcedoc=%7BBFD9A19C-4A68-4DBF-8641-DA2F1283C895%7D&file=index.docx&action=default&mobileredirect=true').length).to.equal(0);
    // unsupported sharepoint document type
    expect(utils.getConfigMatches(CONFIGS, 'https://foo.sharepoint.com/:p:/r/sites/foo/_layouts/15/Doc.aspx?sourcedoc=%7BBFD9A19C-4A68-4DBF-8641-DA2F1283C895%7D&file=index.pptx&action=default&mobileredirect=true').length).to.equal(0);
    // invalid sharepoint URL
    expect(utils.getConfigMatches(CONFIGS, 'https://foo.sharepoint.com/:w:/r/sites/foo/_layouts/15/Doc.aspx').length).to.equal(0);
    // invalid gdrive URL
    expect(utils.getConfigMatches(CONFIGS, 'https://drive.google.com/drive/folders/1234567890').length).to.equal(0);
    // ignore disabled config
    expect(utils.getConfigMatches(CONFIGS, 'https://main--bar2--foo.hlx.live/').length).to.equal(0);
  });

  it('setDisplay', async () => {
    const spy = sinon.spy(window.chrome.storage.local, 'set');
    await utils.setDisplay(true);
    expect(spy.calledWith({
      hlxSidekickDisplay: true,
    })).to.be.true;
    spy.restore();
  });

  it('toggleDisplay', async () => {
    const display = await new Promise((resolve) => {
      utils.toggleDisplay((s) => {
        resolve(s);
      });
    });
    expect(display).to.be.true;
  });

  it('setProxyUrl', async () => {
    const spy = sinon.spy(window.chrome.storage.local, 'set');
    const hlxSidekickProxyUrl = 'https://main--bar--foo.hlx.page/';
    await utils.setProxyUrl(hlxSidekickProxyUrl);
    expect(spy.calledWith({
      hlxSidekickProxyUrl,
    })).to.be.true;
    spy.restore();
  });
});
