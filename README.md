# Franklin Sidekick Extension

> Browser extension for authoring Franklin projects

## Status
[![codecov](https://img.shields.io/codecov/c/github/adobe/helix-sidekick-extension.svg)](https://codecov.io/gh/adobe/helix-sidekick-extension)
[![CircleCI](https://img.shields.io/circleci/project/github/adobe/helix-sidekick-extension.svg)](https://circleci.com/gh/adobe/helix-sidekick-extension)
[![GitHub license](https://img.shields.io/github/license/adobe/helix-sidekick-extension.svg)](https://github.com/adobe/helix-sidekick-extension/blob/master/LICENSE.txt)
[![GitHub issues](https://img.shields.io/github/issues/adobe/helix-sidekick-extension.svg)](https://github.com/adobe/helix-sidekick-extension/issues)
[![LGTM Code Quality Grade: JavaScript](https://img.shields.io/lgtm/grade/javascript/g/adobe/helix-sidekick-extension.svg?logo=lgtm&logoWidth=18)](https://lgtm.com/projects/g/adobe/helix-sidekick-extension)
[![semantic-release](https://img.shields.io/badge/%20%20%F0%9F%93%A6%F0%9F%9A%80-semantic--release-e10079.svg)](https://github.com/semantic-release/semantic-release)

## Installation

Note: The Sidekick extension and bookmarklet share the same Sidekick module.

#### Installing the bookmarklet
Navigate to https://www.hlx.live/tools/sidekick/ and follow the instructions there.

#### Installing the Chrome extension
1. Go to the [Chrome Web Store](https://chrome.google.com/webstore/detail/helix-sidekick-extension-beta/ccfggkjabjahcjoljmgmklhpaccedipo)
1. Click _Add to Chrome_
1. Confirm by clicking _Add extension_
1. Click the extensions icon next to Chrome's address bar to see a list of all extensions:<br />
![Extensions icon](docs/imgs/install_extensions_icon.png)
1. Verify that there's an icon like this:<br />
![Sidekick extension icon](docs/imgs/install_toolbar_icon.png)<br />
1. Click the pin button next to it to make sure it always stays visible.

##### Adding projects to the Chrome extension
1. Click the extension's icon and select _Options_:<br />
![Extension box](docs/imgs/install_contextmenu_options.png)<br />
On this page, you can add projects by either pasting a share URL* or a GitHub URL in the respective fields and clicking _Add_. This page will also allow you to view, edit and delete existing projects.
   1. Alternatively, you can also navigate to a share URL* or a GitHub project, click the extension's icon and select _Add project_.
1. Navigate to your project's homepage and click on the extension's icon to toggle the Sidekick.

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

### Branch testing a bookmarklet

Every development branch in this repository will be mirrored in https://github.com/adobe/helix-website with a `sidekick-` prefix to enable enable branch testing:

1. Push changes to a branch `issue-77`
2. Note the `sidekick-issue-77` branch in https://github.com/adobe/helix-website/branches
3. Go to `https://sidekick-issue-77--helix-website--adobe.hlx.page/tools/sidekick/` to install a development version of the bookmarklet for your project

_Note: Mirrored development branches in https://github.com/adobe/helix-website/branches must be deleted manually when no longer needed._

### Local testing
#### Testing a local bookmarklet
1. Run `npm start` on your local checkout of this repository
2. Go to `http://localhost:3001/ and follow the instructions.

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

#### Testing a local project config
If you want to test a config file before deploying it to your project:

1. Run `hlx up` on your local checkout of the project repository
1. [Add your project](#adding-projects-to-the-chrome-extension) to the sidekick extension
1. Enable local project configruation:
   1. Click the extension's icon and select _Options_
   1. Click _Advanced_ on the left
   1. Click _Edit_ on the project configuration you want to test locally
   1. Tick the _Test project configuration locally_ checkbox
   1. Click _Save_
1. Navigate to a project URL and activate the sidekick extension

## Deployment

### Deploying the bookmarklet
The Sidekick bookmarklet gets staged automatically each time a pull request is merged into `main`.
1. Go to [`helix-website` pull requests](https://github.com/adobe/helix-website/pulls)
1. Click the _Sidekick Release Candidate_ PR
1. Add a comment listing the `helix-sidekick` PR(s) included in this release
1. Get a team member to review the Sidekick RC. The PR is based on a `sidekick-rc-*` branch (`*` being a random ID) so the RC can be tested at:
   `https://sidekick-rc-*--helix-website--adobe.hlx.page/tools/sidekick/`
1. Once approved, merge the RC PR to deploy the changes into production

### Deploying the Chrome extension
The Chrome extension is built and uploaded automatically each time a pull request is merged into `main` and, once reviewed by Google, auto-published and pushed to users' browsers.

#### CI setup
The following environment variables are required to be set in the CircleCI project settings: `GOOGLE_APP_ID`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_REFRESH_TOKEN`. See [here](https://circleci.com/blog/continuously-deploy-a-chrome-extension/) for detailed instructions how to obtain and generate them.

If you have to re-deploy manually or make changes to the store page, you can gain access to the Chrome Developer Dashboard by following [these instructions](https://adobe.sharepoint.com/sites/Adobe-GooglePartnership/SitePages/Publishing-Chrome-Browser-Plugins.aspx):
1. Go to the [Chrome Developer Dashboard](https://chrome.google.com/webstore/devconsole/3b37cd65-9569-47a0-a13c-da1857a2c9dc)
1. Switch to the _Adobe Inc._ publisher at the top right
1. Click the _Sidekick_ item in the extension list
1. Switch to _Package_
1. Click _Upload new package_
1. Upload `dist > chrome.zip`
1. Click _Submit for review_
