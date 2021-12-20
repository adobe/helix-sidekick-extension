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

### Bookmarklet

1. Navigate to https://www.hlx.live/tools/sidekick/ and follow the instructions.

### Extension (experimental)

The bookmarklet configures the Sidekick for a single project and needs to be reopened in every new browser tab. Use the browser extension to:
- keep the Sidekick open (or closed) while reloading or navigating multiple browser tabs
- configure Sidekick for multiple projects without cluttering your browser's bookmark bar

Note: The extension loads the same Sidekick module as the bookmarklet.

#### Installing the Chrome extension
1. Go to the [Chrome Web Store](https://chrome.google.com/webstore/detail/helix-sidekick-beta/ccfggkjabjahcjoljmgmklhpaccedipo)
1. Click _Add to Chrome_
1. Confirm by clicking _Add extension_
1. Click the extensions ("puzzle piece") icon next to Chrome's address bar to see a list of all extensions. Verify that there's a grayed out Helix icon like this:<br />
![Extension icon disabled](docs/imgs/install_toolbar_icon.png)<br />
1. Click the pin button next to it to make sure it is always visible.

##### Adding projects to the Chrome extension
1. Click the extension's Helix icon and select _Options_:<br />
![Extension box](docs/imgs/install_contextmenu_options.png)<br />
On this page, you can add Helix projects by either pasting a share URL* or a GitHub URL in the respective fields and clicking _Add_. This page will also allow you to view, edit and delete existing projects.
   1. Alternatively, you can also navigate to a share URL* or a GitHub project, click the extension's Helix icon and select _Add project_.
1. Navigate to your project's homepage and click on the (now colored) Helix icon to toggle the Sidekick.

\* Share URLs start with `https://www.hlx.live/tools/sidekick/...`

## Configuration

Helix Sidekick supports a number of (optional) configuration options developers can add to the project to maximize the Sidekick experience. 

See the [API documentation](docs/API.md#sidekickConfig).

## Usage
Refer to the [Sidekick documentation](https://www.hlx.live/docs/sidekick) to learn more about its features.

## Development

### Build

```bash
$ npm install
$ npm run build
```

### Test

```bash
$ npm test
```

### Lint

```bash
$ npm run lint
```

### Testing a development version of the module or bookmarklet

Every development branch in this repository will be mirrored in https://github.com/adobe/helix-website with a `sidekick-` prefix to enable enable branch testing:

1. Push changes to a branch `issue-77`
2. Note the `sidekick-issue-77` branch in https://github.com/adobe/helix-website/branches
3. Go to `https://sidekick-issue-77--helix-website--adobe.hlx.page/tools/sidekick/` to install a development version of the bookmarklet for your project

_Note: Mirrored development branches in https://github.com/adobe/helix-website/branches must be deleted manually when no longer needed._

### Local testing

You can leverage Helix CLI for local testing. If you haven't already installed it, run: `npm i -g @adobe/helix-cli`

#### Testing a local Sidekick version

1. Run `npm start` on your local checkout of this repository
2. Go to `http://localhost:3001/ and follow the instructions.

#### Testing a local project config

If you want to test a [config](#configuration) file before deploying it to your project:
1. Run `hlx up` on your local checkout of the project repository
2. Install a Sidekick bookmarklet for your project: https://www.hlx.live/tools/sidekick/
3. Edit the bookmarklet URL by appending `,"devMode":"true"` after `"ref":"*"` (`*` being your project branch)
4. Click the bookmarklet to launch Sidekick using your local config

#### Testing a local Chrome extension
1. Run `npm run build:chrome`
1. Open Chrome and navigate to `chrome://extensions`
1. Turn on _Developer mode_ at the top right of the header bar<br />
![Developer mode](docs/imgs/install_developer_mode.png)
1. Click the _Load unpacked_ button in the action bar<br />
![Load unpacked](docs/imgs/install_load_unpacked.png)
1. Navigate to the `dist > chrome` folder and click _Select_ to install and activate the Sidekick extension.
1. Verify that your _Extensions_ page displays a box like this:<br />
![Extension box](docs/imgs/install_extension_box.png)<br />
1. Follow the steps under [Adding projects to the extension](#adding-projects-to-the-extension)

## Deployment

### Deploying the module and bookmarklet
The Sidekick module and bookmarklet gets staged automatically each time a pull request is merged into `main`.
1. Go to [`helix-website` pull requests](https://github.com/adobe/helix-website/pulls)
1. Click the _Sidekick Release Candidate_ PR
1. Add a comment listing the `helix-sidekick` PR(s) included in this release
1. Get a team member to review the Sidekick RC. The PR is based on a `sidekick-rc-*` branch (`*` being a random ID) so the RC can be tested at:
   `https://sidekick-rc-*--helix-website--adobe.hlx.page/tools/sidekick/`
1. Once approved, merge the RC PR to deploy the changes into production

### Deploying the Chrome extension
The Chrome extension is deployed via Chrome Developer Dashboard. Follow [these instructions](https://adobe.sharepoint.com/sites/Adobe-GooglePartnership/SitePages/Play-Store-Accounts-and-Policies.aspx#new-%283-4-2021%29-chrome-plugin-extension-publishing) to obtain access.
1. Update the version in the `src/extension/manifest.json` according to semantic versioning.
1. Run `npm run build-chrome`
1. Go to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/3b37cd65-9569-47a0-a13c-da1857a2c9dc)
1. Switch to the _Adobe Inc._ publisher at the top right
1. Click the _Helix Sidekick_ item in the extension list
1. Switch to _Package_
1. Click _Upload new package_
1. Upload `dist/chrome.zip`
1. Click _Submit for review_
1. Once reviewed by Google, the new version will be auto-published and pushed to users' browsers.
