# Helix Sidekick

> Browser helper for authoring Helix projects

## Status
[![codecov](https://img.shields.io/codecov/c/github/adobe/helix-sidekick.svg)](https://codecov.io/gh/adobe/helix-sidekick)
[![CircleCI](https://img.shields.io/circleci/project/github/adobe/helix-sidekick.svg)](https://circleci.com/gh/adobe/helix-sidekick)
[![GitHub license](https://img.shields.io/github/license/adobe/helix-sidekick.svg)](https://github.com/adobe/helix-sidekick/blob/master/LICENSE.txt)
[![GitHub issues](https://img.shields.io/github/issues/adobe/helix-sidekick.svg)](https://github.com/adobe/helix-sidekick/issues)
[![LGTM Code Quality Grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/adobe/helix-sidekick.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/adobe/helix-sidekick)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

## Installation

https://www.hlx.live/tools/sidekick/

## Confguration

Helix Sidekick supports a number of (optional) configuration options:
https://www.hlx.live/tools/sidekick/config.html

## Usage

See the [API documentation](docs/API.md).

## Development

### Build

```bash
$ npm install
```

### Test

```bash
$ npm test
```

### Lint

```bash
$ npm run lint
```

### Local testing

You can leverage Helix CLI for local testing. If you haven't already installed it, run: `npm i -g @adobe/helix-cli`

#### Test a local Sidekick version

1. Run `hlx up --no-pages-proxy --no-open` on your local checkout of this repository
2. Install a Sidekick bookmarklet for your project: https://www.hlx.live/tools/sidekick/
3. Edit the bookmarklet URL by replacing `https://www.live/tools/sidekick/app.js` with `http://localhost:3000/src/sidekick/app.js`
4. Click the bookmarklet to launch your local version

#### Test a local project config

If you want to test a [config](#configuration) file before deploying it to your project:
1. Run `hlx up --no-pages-proxy --no-open` on your local checkout of the project repository
2. Install a Sidekick bookmarklet for your project: https://www.hlx.live/tools/sidekick/
3. Edit the bookmarklet URL by appending `,"devMode":"true"` after `"ref":"*"` (`*` being your project branch)
4. Click the bookmarklet to launch Sidekick using your local config

## Deployment

The Helix Sidekick gets deployed to https://www.hlx.live/tools/sidekick/. The corresponding repository is https://github.com/adobe/helix-pages. Deployment is fully automated.

### Testing a development version

Every development branch in this repository will be mirrored in https://github.com/adobe/helix-pages with a `sidekick-` prefix. This enables branch testing:

1. Push changes to a branch `issue-77`
2. Note the `sidekick-issue-77` branch in https://github.com/adobe/helix-pages/branches
3. Go to `https://sidekick-issue-77--helix-pages--adobe.hlx.page` to install a development version for your project

_Note: Mirrored development branches in https://github.com/adobe/helix-pages/branches must be deleted manually when no longer needed._

### Releasing a new version

Once a branch is merged to `main` in this repository, a PR will automatically be opened in https://github.com/adobe/helix-pages for final review of the release candidate (RC):

1. Merge your branch to `main`
2. Go to the _Sidekick Release Candidate_ PR in https://github.com/adobe/helix-pages/pulls
3. Pick reviewer(s) and wait for approval(s)
4. The PR is based on a `sidekick-rc-*` branch (`*` being a random ID) so the RC can also be tested:
   `https://sidekick-rc-*--helix-pages--adobe.hlx.page`
5. Once approved, the PR can be merged to deploy the new version into production

_Note: Verify that the_ `purge-code` _GitHub action has run in https://github.com/adobe/helix-pages/actions and that https://www.hlx.live/tools/sidekick/app.js (and/or any other files you changed) returns the latest version. If not, use manual purging:_
```sh
curl -X HLXPURGE https://www.hlx.live/tools/sidekick/app.js
```
