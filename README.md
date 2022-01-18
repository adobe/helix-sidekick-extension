# Helix Sidekick Extension

> Browser extension for authoring Helix projects

## Status
[![codecov](https://img.shields.io/codecov/c/github/adobe/helix-sidekick-extension.svg)](https://codecov.io/gh/adobe/helix-sidekick-extension)
[![CircleCI](https://img.shields.io/circleci/project/github/adobe/helix-sidekick-extension.svg)](https://circleci.com/gh/adobe/helix-sidekick-extension)
[![GitHub license](https://img.shields.io/github/license/adobe/helix-sidekick-extension.svg)](https://github.com/adobe/helix-sidekick-extension/blob/master/LICENSE.txt)
[![GitHub issues](https://img.shields.io/github/issues/adobe/helix-sidekick-extension.svg)](https://github.com/adobe/helix-sidekick-extension/issues)
[![LGTM Code Quality Grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/adobe/helix-sidekick-extension.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/adobe/helix-sidekick-extension)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

## Installation

Note: The extension loads the same [Sidekick module](https://github.com/adobe/helix-sidekick) as the bookmarklet.

#### Installing the Chrome extension
1. Go to the [Chrome Web Store](https://chrome.google.com/webstore/detail/helix-sidekick-extension-beta/ccfggkjabjahcjoljmgmklhpaccedipo)
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

### Local testing
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

### Deploying the Chrome extension
The Chrome extension is built and uploaded automatically each time a pull request is merged into `main` and, once reviewed by Google, auto-published and pushed to users' browsers.

#### CI setup
The following environment variables are required to be set in the CircleCI project settings: `GOOGLE_APP_ID`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_REFRESH_TOKEN`. See [here](https://circleci.com/blog/continuously-deploy-a-chrome-extension/) for detailed instructions how to obain and generate them.

If you have to re-deploy manually or make changes to the store page, you can gain access to the Chrome Developer Dashboard by following [these instructions](https://adobe.sharepoint.com/sites/Adobe-GooglePartnership/SitePages/Publishing-Chrome-Browser-Plugins.aspx):
1. Go to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/3b37cd65-9569-47a0-a13c-da1857a2c9dc)
1. Switch to the _Adobe Inc._ publisher at the top right
1. Click the _Helix Sidekick_ item in the extension list
1. Switch to _Package_
1. Click _Upload new package_
1. Upload `dist > chrome.zip`
1. Click _Submit for review_
