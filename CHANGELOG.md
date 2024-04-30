# [6.43.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.42.0...v6.43.0) (2024-04-18)


### Features

* 20240418 release ([#713](https://github.com/adobe/helix-sidekick-extension/issues/713)) ([d04d3d6](https://github.com/adobe/helix-sidekick-extension/commit/d04d3d6efc0f7ea7120ba92e1da9a4405a1c6bda)), closes [#711](https://github.com/adobe/helix-sidekick-extension/issues/711) [#712](https://github.com/adobe/helix-sidekick-extension/issues/712)

# [6.42.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.41.1...v6.42.0) (2024-04-13)


### Features

* move sharepoint edit info call from service worker to tab ([#702](https://github.com/adobe/helix-sidekick-extension/issues/702)) ([b158aff](https://github.com/adobe/helix-sidekick-extension/commit/b158aff90b416835d80c9d0d55f799830da9a6d4)), closes [#699](https://github.com/adobe/helix-sidekick-extension/issues/699) [#708](https://github.com/adobe/helix-sidekick-extension/issues/708)

## [6.41.1](https://github.com/adobe/helix-sidekick-extension/compare/v6.41.0...v6.41.1) (2024-03-15)


### Bug Fixes

* url cache entry expiry always in the past ([1abffba](https://github.com/adobe/helix-sidekick-extension/commit/1abffbabe2d8b0d3cd68ad1a244560c146daf333))

# [6.41.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.40.3...v6.41.0) (2024-02-29)


### Bug Fixes

* assume folder if sharepoint url without query param ([#677](https://github.com/adobe/helix-sidekick-extension/issues/677)) ([dcc37b8](https://github.com/adobe/helix-sidekick-extension/commit/dcc37b8bbe4e498cec700cb3d499ea465672acdb))
* extra project creation for invalid gitURL ([#662](https://github.com/adobe/helix-sidekick-extension/issues/662)) ([8094ada](https://github.com/adobe/helix-sidekick-extension/commit/8094ada8499a1346cbd52ad6411a7b08b4aab008))
* validate production hostname ([#668](https://github.com/adobe/helix-sidekick-extension/issues/668)) ([b96d0aa](https://github.com/adobe/helix-sidekick-extension/commit/b96d0aaf6131e8955e868039204b2795d2af833b))


### Features

* RUM data collection for context menu items ([#674](https://github.com/adobe/helix-sidekick-extension/issues/674)) ([c5f14b1](https://github.com/adobe/helix-sidekick-extension/commit/c5f14b14355f09cb121bca300ae3cedfe3241675))

## [6.40.3](https://github.com/adobe/helix-sidekick-extension/compare/v6.40.2...v6.40.3) (2024-01-24)


### Bug Fixes

* sharepoint filenames with comma and dot ([#660](https://github.com/adobe/helix-sidekick-extension/issues/660)) ([5d7130b](https://github.com/adobe/helix-sidekick-extension/commit/5d7130bdcc46870f52956616ead7b7664f7fb5ad))

## [6.40.2](https://github.com/adobe/helix-sidekick-extension/compare/v6.40.1...v6.40.2) (2024-01-18)


### Bug Fixes

* **safari:** config export displays json in browser ([1e08819](https://github.com/adobe/helix-sidekick-extension/commit/1e088199fbc01510c8ebcf76523a44ee49eb5c6a))
* single file selection should not trigger bulk opration ([6b52be2](https://github.com/adobe/helix-sidekick-extension/commit/6b52be2808667e1bb3c36b7cdba09457ee46794f))

## [6.40.1](https://github.com/adobe/helix-sidekick-extension/compare/v6.40.0...v6.40.1) (2024-01-12)


### Bug Fixes

* detect sharepoint folder URL with RootFolder param ([62b0874](https://github.com/adobe/helix-sidekick-extension/commit/62b087499eacdd10a87ab466fc8be4326ae665c6))

# [6.40.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.39.0...v6.40.0) (2024-01-09)


### Bug Fixes

* add silent fallback for invalid Log Levels ([ce0ebb5](https://github.com/adobe/helix-sidekick-extension/commit/ce0ebb58f1116eb9375d11656e25e3eb0e1b3652))
* fix logger src file ([fb5135e](https://github.com/adobe/helix-sidekick-extension/commit/fb5135eabeacf098ff2491f3ff83682e6c79ab39))
* Remove unused eslint comment ([e295d2f](https://github.com/adobe/helix-sidekick-extension/commit/e295d2f3580ddc5a06c0fc9f44bf63c94ac05820))
* revert to initial log level (2) ([84b7dee](https://github.com/adobe/helix-sidekick-extension/commit/84b7dee68e1bd94bd1d07b4e642557e4b637dcf4))
* Update logger to have configurable LEVEL. Update logger tests. ([11ea8a7](https://github.com/adobe/helix-sidekick-extension/commit/11ea8a7ab5f4ea00de356e6d001c50731c69dad9))


### Features

* detect hlx5 based on custom preview host ([cf1b5c2](https://github.com/adobe/helix-sidekick-extension/commit/cf1b5c2bfbfeafde29bc72216eb87e2149f8fe52))

# [6.39.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.38.3...v6.39.0) (2023-12-15)


### Features

* transient mode ([4196091](https://github.com/adobe/helix-sidekick-extension/commit/4196091a9fadd270f753fc3c8f16a312b6d80c21))

## [6.38.3](https://github.com/adobe/helix-sidekick-extension/compare/v6.38.2...v6.38.3) (2023-12-13)


### Bug Fixes

* create a minimal config for sampleRUM ([#632](https://github.com/adobe/helix-sidekick-extension/issues/632)) ([62503f4](https://github.com/adobe/helix-sidekick-extension/commit/62503f42193fd0d1a3e0cdfc4f092d47c7aa1d64))
* **safari:** path to zh-CN.lproj/InfoPlist.strings ([#633](https://github.com/adobe/helix-sidekick-extension/issues/633)) [skip ci] ([d4ef0f3](https://github.com/adobe/helix-sidekick-extension/commit/d4ef0f324ffedd90347420a9e739c83899553a5c))

## [6.38.2](https://github.com/adobe/helix-sidekick-extension/compare/v6.38.1...v6.38.2) (2023-12-11)


### Bug Fixes

* language detection ([fa42b8b](https://github.com/adobe/helix-sidekick-extension/commit/fa42b8b4557b8eadab377a3e5b2f810f6cff18dd))

## [6.38.1](https://github.com/adobe/helix-sidekick-extension/compare/v6.38.0...v6.38.1) (2023-12-07)


### Bug Fixes

* 403 error message ([1df1b1d](https://github.com/adobe/helix-sidekick-extension/commit/1df1b1da92df935a9e2f09df49465e275a453d7b))

# [6.38.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.37.0...v6.38.0) (2023-11-30)


### Features

* always fire custom event ([8839ed9](https://github.com/adobe/helix-sidekick-extension/commit/8839ed984a0b10b0ce25a1e35294131a3d24bdc4))

# [6.37.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.36.0...v6.37.0) (2023-11-22)


### Features

* **release:** announce releases on discord ([c6c59e6](https://github.com/adobe/helix-sidekick-extension/commit/c6c59e6f2d8b9e2847593a3c7987e84dc5fda849))

# [6.36.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.35.4...v6.36.0) (2023-11-20)


### Features

* new event "previewed" ([4489ff2](https://github.com/adobe/helix-sidekick-extension/commit/4489ff21bf4866102c1990f0a245e0ed442c1d87))

## [6.35.4](https://github.com/adobe/helix-sidekick-extension/compare/v6.35.3...v6.35.4) (2023-11-17)


### Bug Fixes

* trigger release ([c95c7aa](https://github.com/adobe/helix-sidekick-extension/commit/c95c7aae862a6e1eba47696e2d7cdb188bfaae92))

## [6.35.3](https://github.com/adobe/helix-sidekick-extension/compare/v6.35.2...v6.35.3) (2023-11-17)


### Bug Fixes

* do not change user agent ([f08f6a6](https://github.com/adobe/helix-sidekick-extension/commit/f08f6a6bd7f761050db7763fb2849653c6c3c421))

## [6.35.2](https://github.com/adobe/helix-sidekick-extension/compare/v6.35.1...v6.35.2) (2023-11-07)


### Bug Fixes

* tighter host checks ([e959c8e](https://github.com/adobe/helix-sidekick-extension/commit/e959c8e820038327e6230e9ffd593c599c669d64))

## [6.35.1](https://github.com/adobe/helix-sidekick-extension/compare/v6.35.0...v6.35.1) (2023-11-06)


### Bug Fixes

* **bulk:** pinned files break selection ([5977776](https://github.com/adobe/helix-sidekick-extension/commit/5977776481bbb4a64ca871e6c675c597a168534d))

# [6.35.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.34.0...v6.35.0) (2023-11-03)


### Bug Fixes

* reject illegal file names ([ed6b939](https://github.com/adobe/helix-sidekick-extension/commit/ed6b9390fc300f6882d8bf2178493aed2dce225a))
* tests reveal flow ([cba9f2f](https://github.com/adobe/helix-sidekick-extension/commit/cba9f2f57f6c0c8ab7d9240ee75f08a226d14de0))


### Features

* import rum.js and add missing event ([34d8035](https://github.com/adobe/helix-sidekick-extension/commit/34d80355d190ce170c3c619af5baf66f68fddbaf))
* track info click ([3b0424d](https://github.com/adobe/helix-sidekick-extension/commit/3b0424d992ecfde5bfc334da69527811027d9339))
* **view-doc-source:** add rum instrumentation ([c2f3aea](https://github.com/adobe/helix-sidekick-extension/commit/c2f3aeafca34fa292f217dcdd97a4d5e1b4a1282))

# [6.34.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.33.0...v6.34.0) (2023-11-02)


### Bug Fixes

* localization issues ([ab777eb](https://github.com/adobe/helix-sidekick-extension/commit/ab777ebccd7ec67c79d015be470ca4c165093774))


### Features

* cache help content for 4 hours ([251f828](https://github.com/adobe/helix-sidekick-extension/commit/251f8288c20d7b09211cfb8cba16868eccafff73))

# [6.33.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.32.0...v6.33.0) (2023-10-24)


### Features

* notify user of token expiry ([dbe9651](https://github.com/adobe/helix-sidekick-extension/commit/dbe965144fb6032119daceb1401cffdc97da3e1a))

# [6.32.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.31.0...v6.32.0) (2023-10-18)


### Features

* allow view doc source on custom sites ([f801989](https://github.com/adobe/helix-sidekick-extension/commit/f801989f440906fc0c769fc422c8fb151f0c706c))

# [6.31.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.30.5...v6.31.0) (2023-10-06)


### Features

* support for custom sharepoint domain ([1db320b](https://github.com/adobe/helix-sidekick-extension/commit/1db320b8943cfd0c001fa4fd1b62d0940952ad4c)), closes [#548](https://github.com/adobe/helix-sidekick-extension/issues/548)

## [6.30.5](https://github.com/adobe/helix-sidekick-extension/compare/v6.30.4...v6.30.5) (2023-10-02)


### Bug Fixes

* proper resource check ([268bb1d](https://github.com/adobe/helix-sidekick-extension/commit/268bb1db3e75a9b8641368524f8b5f43df7e7bd3))

## [6.30.4](https://github.com/adobe/helix-sidekick-extension/compare/v6.30.3...v6.30.4) (2023-09-28)


### Bug Fixes

* exclude/includePath not working as expected ([2bd8a5c](https://github.com/adobe/helix-sidekick-extension/commit/2bd8a5c9d78a41a7b554bc7b6ca2efbbfb7b7631))

## [6.30.3](https://github.com/adobe/helix-sidekick-extension/compare/v6.30.2...v6.30.3) (2023-09-28)


### Bug Fixes

* add json to supported file extensions ([a62b57f](https://github.com/adobe/helix-sidekick-extension/commit/a62b57f18f056c9beb4fbb9fbdc7f2901bad30af))
* ignore sharepoint folders in bulk selection ([bb89eb5](https://github.com/adobe/helix-sidekick-extension/commit/bb89eb501d83a722c3488581f9fd716d3a36f26b))

## [6.30.2](https://github.com/adobe/helix-sidekick-extension/compare/v6.30.1...v6.30.2) (2023-09-28)


### Bug Fixes

* custom override of existing plugin ([54fbb58](https://github.com/adobe/helix-sidekick-extension/commit/54fbb582731fb60ab83850b0451d049ba8576a0b))
* custom plugin conditions ([c95e81d](https://github.com/adobe/helix-sidekick-extension/commit/c95e81d1691e1bd7b270c30cd1e2512ade69955b))
* differentiate between file and folder in sharepoint ([dfc1be2](https://github.com/adobe/helix-sidekick-extension/commit/dfc1be2241f2e03173e62c11c05428add16fae5e))
* **extension:** use backslashes, not slashes ([301fc06](https://github.com/adobe/helix-sidekick-extension/commit/301fc06b1c8b815d26ee59fc445f4a8987cf6697))
* **globs:** don't match any character on . ([23be8a8](https://github.com/adobe/helix-sidekick-extension/commit/23be8a8df73dbbc7b4f48845b5a226be84670d80))

## [6.30.1](https://github.com/adobe/helix-sidekick-extension/compare/v6.30.0...v6.30.1) (2023-09-12)


### Bug Fixes

* missing placeholders ([93ad5da](https://github.com/adobe/helix-sidekick-extension/commit/93ad5dae27aceeb09eac8268a7a2b0e1fb7997aa))
* send detail object to custom event listeners ([2d83e34](https://github.com/adobe/helix-sidekick-extension/commit/2d83e34f52e631250b54cc3322a783e28092b2dc))

# [6.30.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.29.2...v6.30.0) (2023-09-06)


### Bug Fixes

* default view on custom view ([5ea036f](https://github.com/adobe/helix-sidekick-extension/commit/5ea036f6094c11a0998ed9299d569efc69a5336c))
* fallback to live if prod host is missing ([b4d54dd](https://github.com/adobe/helix-sidekick-extension/commit/b4d54dd814d720a476df0d469c94a54c7d3f55b7))
* fallback to live if prod host is missing ([e75c346](https://github.com/adobe/helix-sidekick-extension/commit/e75c3464a8b0fbe08b652fea20e512f91afa8f91))
* regex ([4558bf9](https://github.com/adobe/helix-sidekick-extension/commit/4558bf9151d371a83fdf8d9a8a1c49a00c0c6c24))
* sidekick loaded but invisible ([22a8986](https://github.com/adobe/helix-sidekick-extension/commit/22a8986db92d714edceba2e6e3f4feeba19a8b15))
* use path instead of url ([6413a01](https://github.com/adobe/helix-sidekick-extension/commit/6413a019828561a877de8454be593fef64e3d70c))


### Features

* make login more discoverable ([4170d2a](https://github.com/adobe/helix-sidekick-extension/commit/4170d2a162a7af882aa585f40573ce51eacedcc6))
* open url(s) after bulk preview/publish ([3af54ef](https://github.com/adobe/helix-sidekick-extension/commit/3af54eff48c1d344d8db8e3c8a745c8c54855000))
* simplify custom viewers ([d45aeec](https://github.com/adobe/helix-sidekick-extension/commit/d45aeecb6bde5fedbceb6791c488ca51306dabc0))
* support aem.page and aem.live ([82f8775](https://github.com/adobe/helix-sidekick-extension/commit/82f8775201a8cba082be0b7a7b4c042eae9791f3))

## [6.29.2](https://github.com/adobe/helix-sidekick-extension/compare/v6.29.1...v6.29.2) (2023-09-06)


### Bug Fixes

* correct urls in json rendition ([#513](https://github.com/adobe/helix-sidekick-extension/issues/513)) ([0dc20a4](https://github.com/adobe/helix-sidekick-extension/commit/0dc20a46206af2393a13c0836d15ca512adb1081))

## [6.29.1](https://github.com/adobe/helix-sidekick-extension/compare/v6.29.0...v6.29.1) (2023-09-04)


### Bug Fixes

* add test for single sheets being labelled shared-default ([da831ab](https://github.com/adobe/helix-sidekick-extension/commit/da831abaf2227c359b49c63804b3ea9f7c1d6a94))
* do not render a title for single sheet responses ([a403ea9](https://github.com/adobe/helix-sidekick-extension/commit/a403ea97a5e49e9dd6739d58b57c4c157f47fd1d))
* When rendering sheets, name the default sheet shared-default instead of helix-default ([ca90ce2](https://github.com/adobe/helix-sidekick-extension/commit/ca90ce2634ae94a9745634f93b8784783d191d17))

# [6.29.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.28.0...v6.29.0) (2023-08-25)


### Features

* closePalette API ([ff7824f](https://github.com/adobe/helix-sidekick-extension/commit/ff7824fac8c5cb8353461e502ce5a7e5b439a91d))
* closePalette API ([53f3700](https://github.com/adobe/helix-sidekick-extension/commit/53f3700c281cc855d2cf3a1113ca2d157a0fbc43))
* closePalette API ([77b06c9](https://github.com/adobe/helix-sidekick-extension/commit/77b06c9edb6d490da7e5868ae47fe911623c4f83))
* closePalette API ([5100d30](https://github.com/adobe/helix-sidekick-extension/commit/5100d303e4f8a227757ba25857471c217f03f774))
* closePalette API ([08274a3](https://github.com/adobe/helix-sidekick-extension/commit/08274a30305da977963aa156c7226d453cae5b39))

# [6.28.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.27.1...v6.28.0) (2023-08-21)


### Bug Fixes

* don't show delete/unpublish for code ([9e4ffd2](https://github.com/adobe/helix-sidekick-extension/commit/9e4ffd2b954f754ac23a9044d48f0d1d38b3e1ad))


### Features

* make delete/unpublish advanced features ([2d67d2b](https://github.com/adobe/helix-sidekick-extension/commit/2d67d2bf1c6192f135d0b628596bd40961074964))

## [6.27.1](https://github.com/adobe/helix-sidekick-extension/compare/v6.27.0...v6.27.1) (2023-08-17)


### Bug Fixes

* adjust sharelink for rootfolder requests ([#489](https://github.com/adobe/helix-sidekick-extension/issues/489)) ([fce1b16](https://github.com/adobe/helix-sidekick-extension/commit/fce1b16c43050cddf5f2457264cb035d1b130b02)), closes [#488](https://github.com/adobe/helix-sidekick-extension/issues/488)

# [6.27.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.26.0...v6.27.0) (2023-08-14)


### Bug Fixes

* do not close sidekick if loaded externally ([b3ecbac](https://github.com/adobe/helix-sidekick-extension/commit/b3ecbacbca7729679f7da4e242e141a9a1d62a9d))


### Features

* allow direct delete/unpublish if auth'd ([3c5adea](https://github.com/adobe/helix-sidekick-extension/commit/3c5adeadcad77cf73d9c6c260d2002d357aa977e))
* allow direct delete/unpublish if auth'd ([e9087a5](https://github.com/adobe/helix-sidekick-extension/commit/e9087a5b12fc98c00d09b39ffa1a15f13b9ad303))

# [6.26.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.25.2...v6.26.0) (2023-08-04)


### Bug Fixes

* convert hr to 3 dashes on copy ([b933c21](https://github.com/adobe/helix-sidekick-extension/commit/b933c2178aec762e6a22e9fb31ab532e22f45441))
* missing mountpoint causes js error ([82fbad0](https://github.com/adobe/helix-sidekick-extension/commit/82fbad0e4b874b2c87cf2a2ba381fa60eee7d661))


### Features

* display the sidekick when loading via the API ([689a8f5](https://github.com/adobe/helix-sidekick-extension/commit/689a8f5568ee6c0685cfd7b330d5eec713454e13))
* support custom view titles ([0b9980a](https://github.com/adobe/helix-sidekick-extension/commit/0b9980a7cc3d8822353a2c79b654c5bee2ab591e))
* support custom view titles ([df60c99](https://github.com/adobe/helix-sidekick-extension/commit/df60c997a29cec29f3cc54afc51fccd785906ed6))
* support custom viewers ([569ec15](https://github.com/adobe/helix-sidekick-extension/commit/569ec1540562d18c9e640910323b2281bac4ce62))

## [6.25.2](https://github.com/adobe/helix-sidekick-extension/compare/v6.25.1...v6.25.2) (2023-07-28)


### Bug Fixes

* **deps:** downgrade chrome installer ([5db0636](https://github.com/adobe/helix-sidekick-extension/commit/5db0636dac1313904c3d8ae5522c1ec1f7b35616))
* enable mocha-multi ([07dfd8a](https://github.com/adobe/helix-sidekick-extension/commit/07dfd8ad1d9b73ff71b880b8434cfec4497c9097))
* lookup from discovery cache ([9f56ec0](https://github.com/adobe/helix-sidekick-extension/commit/9f56ec095b482aa6ccc54ceb1f5905b8c17d707c))
* refresh discovery cache ([30c693d](https://github.com/adobe/helix-sidekick-extension/commit/30c693d1523210ba2afd6f48c4617ed609fb0db4))
* show user agent ([94b8d2e](https://github.com/adobe/helix-sidekick-extension/commit/94b8d2edec9225177b0143f97a2752a900cea81b))

## [6.25.1](https://github.com/adobe/helix-sidekick-extension/compare/v6.25.0...v6.25.1) (2023-06-29)


### Bug Fixes

* hardcoded english strings in delete/unpublish ([9633403](https://github.com/adobe/helix-sidekick-extension/commit/9633403731465a8861894736ef3da01d61b01c5a))

# [6.25.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.24.0...v6.25.0) (2023-06-27)


### Features

* do not use loginRedirect ([50abdc3](https://github.com/adobe/helix-sidekick-extension/commit/50abdc32bede54bf4da2e0424c44543c58b1c280))

# [6.24.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.23.0...v6.24.0) (2023-06-26)


### Features

* messaging API ([#439](https://github.com/adobe/helix-sidekick-extension/issues/439)) ([92d7a8b](https://github.com/adobe/helix-sidekick-extension/commit/92d7a8b934e2bae703bce40d4fb1efc2d8838875))

# [6.23.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.22.0...v6.23.0) (2023-06-22)


### Bug Fixes

* detect admin env in personal folder ([080a23f](https://github.com/adobe/helix-sidekick-extension/commit/080a23f3a1fb1938e22df5902c46f393ff1a3df8))
* **view-doc-source:** missing i18n ([20371ce](https://github.com/adobe/helix-sidekick-extension/commit/20371cebbbf2f07e29e7e7a530fadc8119576726))


### Features

* encourage user to login ([d992a62](https://github.com/adobe/helix-sidekick-extension/commit/d992a62938c8cb43a52941b55e62fe33b33f5979))

# [6.22.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.21.1...v6.22.0) (2023-06-19)


### Bug Fixes

* missing page encoding [skip ci] ([f066330](https://github.com/adobe/helix-sidekick-extension/commit/f066330845ef341baf95fae4580c31c11f7d04e7))


### Features

* respect preferred user languages ([3a9d977](https://github.com/adobe/helix-sidekick-extension/commit/3a9d9773f8bab90fd0c7808877ca8fadd8349a25))

## [6.21.1](https://github.com/adobe/helix-sidekick-extension/compare/v6.21.0...v6.21.1) (2023-06-08)


### Bug Fixes

* wrong previewHost/liveHost handling ([d5af488](https://github.com/adobe/helix-sidekick-extension/commit/d5af4885a6981d3db631e4241e2f1bf39cf5d039))

# [6.21.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.20.0...v6.21.0) (2023-06-06)


### Bug Fixes

* **admin:** wrong webpath after navigation ([bbe21e3](https://github.com/adobe/helix-sidekick-extension/commit/bbe21e36b00517ae3aa10410df4f04e90e243cb9))
* project matching ignores previewHost/liveHost ([6c21af7](https://github.com/adobe/helix-sidekick-extension/commit/6c21af76a7847450fce5fba75d8e27523e1b222e))
* publish from local dev purges browser cache for wrong url ([a2ca527](https://github.com/adobe/helix-sidekick-extension/commit/a2ca527b9d28ee401d4181f320934011a86c2cfb))


### Features

* **options:** configurable previewHost/liveHost ([6ff0b26](https://github.com/adobe/helix-sidekick-extension/commit/6ff0b2604de502fbd8fc1cd387cfedae199155d0))
* **options:** custom previewHost/liveHost ([4abf167](https://github.com/adobe/helix-sidekick-extension/commit/4abf167c4489f5c8797f010a659a78ee1d56ce4f))

# [6.20.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.19.2...v6.20.0) (2023-05-31)


### Features

* add status attribute to sk custom element ([#400](https://github.com/adobe/helix-sidekick-extension/issues/400)) ([63ca1a6](https://github.com/adobe/helix-sidekick-extension/commit/63ca1a6b77f65dbc1980c4460c48246a7500d090))

## [6.19.2](https://github.com/adobe/helix-sidekick-extension/compare/v6.19.1...v6.19.2) (2023-05-31)


### Bug Fixes

* **regression:** detect drive navigation ([18db4d5](https://github.com/adobe/helix-sidekick-extension/commit/18db4d5b893cd27e66a07ebd4c4c17a6cdce33ee))

## [6.19.1](https://github.com/adobe/helix-sidekick-extension/compare/v6.19.0...v6.19.1) (2023-05-30)


### Bug Fixes

* add project for authenticated sites ([671baef](https://github.com/adobe/helix-sidekick-extension/commit/671baefdf8f014a604f61f55e60b48f01f25bea0))
* cannot override bulk plugins ([d29a2cb](https://github.com/adobe/helix-sidekick-extension/commit/d29a2cb7ff5e717e95c909b171c0b987a62b741b))
* retrieve env from projects with auth ([6a82ade](https://github.com/adobe/helix-sidekick-extension/commit/6a82ade937ef16164f4e7a968e69cf01ffe5d0b8))

# [6.19.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.18.1...v6.19.0) (2023-05-25)


### Features

* **configpicker:** persist user choice for session ([829e4b2](https://github.com/adobe/helix-sidekick-extension/commit/829e4b29e9b7339e0bcbab0f550ba9e13e1f0085))
* fetch status from sharepoint to help discover the correct project ([378db08](https://github.com/adobe/helix-sidekick-extension/commit/378db0827f004df320758aba8f72c7b7fdc4486c))

## [6.18.1](https://github.com/adobe/helix-sidekick-extension/compare/v6.18.0...v6.18.1) (2023-05-23)


### Bug Fixes

* check for empty dev url ([9148a9f](https://github.com/adobe/helix-sidekick-extension/commit/9148a9f34d89587c32c66d26f9f180e83c720d14))

# [6.18.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.17.0...v6.18.0) (2023-05-22)


### Features

* custom dev url ([a3781a3](https://github.com/adobe/helix-sidekick-extension/commit/a3781a3ab3bef2d48945c2d19e4f19c950df803f))

# [6.17.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.16.1...v6.17.0) (2023-05-22)


### Features

* custom preview and live host ([9237065](https://github.com/adobe/helix-sidekick-extension/commit/923706562ca71ebe63a497e1404230e18f41a87a))

## [6.16.1](https://github.com/adobe/helix-sidekick-extension/compare/v6.16.0...v6.16.1) (2023-05-17)


### Bug Fixes

* excel preview can fail the first time ([0a763a8](https://github.com/adobe/helix-sidekick-extension/commit/0a763a84d0f981c6e1a946799e9922b225345b62))

# [6.16.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.15.1...v6.16.0) (2023-05-16)


### Bug Fixes

* handle unavailable sharepoint picture ([57a8cc7](https://github.com/adobe/helix-sidekick-extension/commit/57a8cc75d28da728f098e996811dd5dd244256cf))


### Features

* add project from sharepoint/gdrive url ([b05ac9a](https://github.com/adobe/helix-sidekick-extension/commit/b05ac9a964a30bf6db95421c3f870cab8947c73a))
* excel preview ([a26ddf3](https://github.com/adobe/helix-sidekick-extension/commit/a26ddf327636840b2a9c87c408d07834a1cd8c02))
* excel preview (wip) ([f6f3f66](https://github.com/adobe/helix-sidekick-extension/commit/f6f3f668fdcb8e28439c94e5fecd2a7376e1beb7))

## [6.15.1](https://github.com/adobe/helix-sidekick-extension/compare/v6.15.0...v6.15.1) (2023-05-11)


### Bug Fixes

* custom plugin handling ([8b9dbb0](https://github.com/adobe/helix-sidekick-extension/commit/8b9dbb0c88fc6f6ab234845186f4bd957cdca744))
* don't set credentials:include when in devMode ([c869054](https://github.com/adobe/helix-sidekick-extension/commit/c869054cce97760aa034c83eecb805f26d198abe))
* only set `omit` credentials on calls to `config.json` ([b3dea1e](https://github.com/adobe/helix-sidekick-extension/commit/b3dea1ed83bb8bb9cd454d84646b7927bc6c5f5e))
* remove config param on getAdminFetchOptions ([a71839d](https://github.com/adobe/helix-sidekick-extension/commit/a71839d26637780967a37304fc71b52df73dbdba))
* **safari:** help content not displayed ([f110834](https://github.com/adobe/helix-sidekick-extension/commit/f1108345d50a7a2f4e187894566f8e6d5c92dbb8))

# [6.15.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.14.0...v6.15.0) (2023-05-03)


### Features

* set user agent header ([d05f693](https://github.com/adobe/helix-sidekick-extension/commit/d05f693ee4032fe9bbca597859fbf7cbb494cf44))

# [6.14.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.13.2...v6.14.0) (2023-05-02)


### Bug Fixes

* authToken needed for microsoft profile pic ([3a961e5](https://github.com/adobe/helix-sidekick-extension/commit/3a961e582067ca348cd10a7fc9fc277478ac4347))


### Features

* load sidekick from admin API [skip ci] ([f02764b](https://github.com/adobe/helix-sidekick-extension/commit/f02764b93256a1ec735a8745acd0a3eb8549515a))

## [6.13.2](https://github.com/adobe/helix-sidekick-extension/compare/v6.13.1...v6.13.2) (2023-04-28)


### Bug Fixes

* delete project not working in safari ([9216df8](https://github.com/adobe/helix-sidekick-extension/commit/9216df871d3c4b7387f0c619c1c1f41de8823991))

## [6.13.1](https://github.com/adobe/helix-sidekick-extension/compare/v6.13.0...v6.13.1) (2023-04-28)


### Bug Fixes

* share url instrumentation ([fd732b6](https://github.com/adobe/helix-sidekick-extension/commit/fd732b60a41b56b50d519210760c6d8d0383a9f1))

# [6.13.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.12.5...v6.13.0) (2023-04-28)


### Bug Fixes

* only inject content script if config match ([55f628d](https://github.com/adobe/helix-sidekick-extension/commit/55f628d0565011aad4911f6d86f462de7748fecb))
* only inject content script if config match ([17bdb1b](https://github.com/adobe/helix-sidekick-extension/commit/17bdb1b55bc524fcfa4278047f7d629227a38557))
* safari error on localhost urls ([637e3c2](https://github.com/adobe/helix-sidekick-extension/commit/637e3c2863f684a2f8077d9396ec2b4cd487f379))


### Features

* add auth token to every admin api request ([e11b61d](https://github.com/adobe/helix-sidekick-extension/commit/e11b61df713111484f7f0e684048d0391ca36020))
* add auth token to every admin api request ([1007caf](https://github.com/adobe/helix-sidekick-extension/commit/1007cafb75215f65477262f3bae2b26213b76117))
* new logout flow ([8835ae6](https://github.com/adobe/helix-sidekick-extension/commit/8835ae6e309023439e2c2f92add8cc754b0a2521))

## [6.12.5](https://github.com/adobe/helix-sidekick-extension/compare/v6.12.4...v6.12.5) (2023-04-24)


### Bug Fixes

* add wildcard to clipboard-write permissions ([18bc288](https://github.com/adobe/helix-sidekick-extension/commit/18bc2888e37c8aec04f4554e49f8f414833d5b49))

## [6.12.4](https://github.com/adobe/helix-sidekick-extension/compare/v6.12.3...v6.12.4) (2023-04-15)


### Bug Fixes

* missing please wait message in gdrive ([c9896c2](https://github.com/adobe/helix-sidekick-extension/commit/c9896c296f891e187771ec0592ea3f7ab5b2178f))
* **options:** double uri encoding ([b40f283](https://github.com/adobe/helix-sidekick-extension/commit/b40f283a53387586fd885ef5f8d0976fbbdf212c))

## [6.12.3](https://github.com/adobe/helix-sidekick-extension/compare/v6.12.2...v6.12.3) (2023-04-11)


### Bug Fixes

* bulk actions not working in grid view ([00c3f7a](https://github.com/adobe/helix-sidekick-extension/commit/00c3f7ad14f5e0aac943e9ebd11a31105f607625))
* confusing error message on 404 ([48decc8](https://github.com/adobe/helix-sidekick-extension/commit/48decc802ac77c40bbc939635fe533378df67296))
* dropdown accessibility ([d57dde0](https://github.com/adobe/helix-sidekick-extension/commit/d57dde03601a18a16fd1210b41d093912775f0fa))
* only inject content script if config match ([b6fd3f9](https://github.com/adobe/helix-sidekick-extension/commit/b6fd3f970e5396bc006c7ce6e6e2e6a9e3c82bf8))
* restrict  open preview to github urls ([e6d6fc4](https://github.com/adobe/helix-sidekick-extension/commit/e6d6fc4f829f13675a6de643ea450ab0a0663e92))
* safari error on localhost urls ([2d07f3e](https://github.com/adobe/helix-sidekick-extension/commit/2d07f3e8600a4e4df640f43caf052883f671220d))

## [6.12.2](https://github.com/adobe/helix-sidekick-extension/compare/v6.12.1...v6.12.2) (2023-04-03)


### Bug Fixes

* **bulk:** special chars in folder or file names ([2beafbf](https://github.com/adobe/helix-sidekick-extension/commit/2beafbf38ccac57afd8883d8ee55d9f446e7167f))

## [6.12.1](https://github.com/adobe/helix-sidekick-extension/compare/v6.12.0...v6.12.1) (2023-03-28)


### Bug Fixes

* undefined date should say never ([1fdb096](https://github.com/adobe/helix-sidekick-extension/commit/1fdb09686556fb69be959b15c14580e20aa12e3b))

# [6.12.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.11.1...v6.12.0) (2023-03-28)


### Features

* relax view doc source constraint ([#296](https://github.com/adobe/helix-sidekick-extension/issues/296)) ([04d40f1](https://github.com/adobe/helix-sidekick-extension/commit/04d40f14a5f7615b5d11b1fd71d303c7eea20e9f))

## [6.11.1](https://github.com/adobe/helix-sidekick-extension/compare/v6.11.0...v6.11.1) (2023-03-21)


### Bug Fixes

* iOS display name and typo ([8bb7571](https://github.com/adobe/helix-sidekick-extension/commit/8bb75716f8f479a1719177f8c618f6f890984402))

# [6.11.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.10.0...v6.11.0) (2023-03-20)


### Features

* safari extension icons and styling [skip ci] ([551d103](https://github.com/adobe/helix-sidekick-extension/commit/551d1031f7c6cd100f5b73835c2eb5bb70ef568f))

# [6.10.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.9.1...v6.10.0) (2023-03-19)


### Bug Fixes

* bulk operations can fail after navigation ([9b5fc91](https://github.com/adobe/helix-sidekick-extension/commit/9b5fc917a803cc695e9f6c6ce200aaf8177a2993))
* login fails in admin env ([068d400](https://github.com/adobe/helix-sidekick-extension/commit/068d40035cfb8b076ecf7efb273d428ba761c91b))
* potential insufficient hostname validation ([9bf489d](https://github.com/adobe/helix-sidekick-extension/commit/9bf489d93c04d03aedd63c029a7c80c4fc3c30e9))


### Features

* add telemetry ([df63ea6](https://github.com/adobe/helix-sidekick-extension/commit/df63ea61b6a79b804e5009c457f42b64120becfc))

## [6.9.1](https://github.com/adobe/helix-sidekick-extension/compare/v6.9.0...v6.9.1) (2023-03-14)


### Bug Fixes

* release (version rollback) ([8dd208d](https://github.com/adobe/helix-sidekick-extension/commit/8dd208de074e4ece81ca0fb9ce86d291ba23117d))

## [6.8.5](https://github.com/adobe/helix-sidekick-extension/compare/v6.8.4...v6.8.5) (2023-03-13)


### Bug Fixes

* lower concurrency for bulk preview ([083cce9](https://github.com/adobe/helix-sidekick-extension/commit/083cce983f7c4c7253820e31524081ddc92464d6))

## [6.8.4](https://github.com/adobe/helix-sidekick-extension/compare/v6.8.3...v6.8.4) (2023-03-10)


### Bug Fixes

* sidekick always shows login option ([a22dd25](https://github.com/adobe/helix-sidekick-extension/commit/a22dd2547ac87daa4157bf5101c8e51e7cf4da55))

## [6.8.3](https://github.com/adobe/helix-sidekick-extension/compare/v6.8.2...v6.8.3) (2023-03-09)


### Bug Fixes

* fix the isAuthenticated method ([#271](https://github.com/adobe/helix-sidekick-extension/issues/271)) ([80d592b](https://github.com/adobe/helix-sidekick-extension/commit/80d592be3f21562d2a3ac9633530da81057390b2))

## [6.8.2](https://github.com/adobe/helix-sidekick-extension/compare/v6.8.1...v6.8.2) (2023-03-06)


### Bug Fixes

* language fallback failing ([6cc5f2c](https://github.com/adobe/helix-sidekick-extension/commit/6cc5f2c71c4518f53e344b28ec8964efac0dae8a))

## [6.8.1](https://github.com/adobe/helix-sidekick-extension/compare/v6.8.0...v6.8.1) (2023-03-04)


### Bug Fixes

* pass sk instance to i18n ([8ba6778](https://github.com/adobe/helix-sidekick-extension/commit/8ba6778d0fe1d9530a8a01c4727db655f9e71801))

# [6.8.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.7.7...v6.8.0) (2023-03-03)


### Features

* disable special view on /helix-env.json ([9854055](https://github.com/adobe/helix-sidekick-extension/commit/98540557916c7f4a18b8c76ac6fb70bb44bdd871))
* open preview from github ([36df39c](https://github.com/adobe/helix-sidekick-extension/commit/36df39c406eac88ef09f92b47e2519648c2a8c22))

## [6.7.7](https://github.com/adobe/helix-sidekick-extension/compare/v6.7.6...v6.7.7) (2023-02-09)


### Bug Fixes

* **view-doc-source:** missing image when root path is not '/' ([e397653](https://github.com/adobe/helix-sidekick-extension/commit/e397653b1aa6da861d7f62afe58443d07799cc0f))

## [6.7.6](https://github.com/adobe/helix-sidekick-extension/compare/v6.7.5...v6.7.6) (2023-02-08)


### Bug Fixes

* 404 status error on new documents ([01ea94e](https://github.com/adobe/helix-sidekick-extension/commit/01ea94e2689a23ff0b75382fae31e280ce36205e))

## [6.7.5](https://github.com/adobe/helix-sidekick-extension/compare/v6.7.4...v6.7.5) (2023-01-15)


### Bug Fixes

* page info dropdown misaligned on mobile ([2d80401](https://github.com/adobe/helix-sidekick-extension/commit/2d80401e8252133ee76bbafcb365866d7c5eac5f))

## [6.7.4](https://github.com/adobe/helix-sidekick-extension/compare/v6.7.3...v6.7.4) (2023-01-03)


### Bug Fixes

* **bookmarklet:** relative import prohibited ([5c4e269](https://github.com/adobe/helix-sidekick-extension/commit/5c4e2690812c0fda850751e7c4a6f291e528d853))

## [6.7.3](https://github.com/adobe/helix-sidekick-extension/compare/v6.7.2...v6.7.3) (2023-01-02)


### Bug Fixes

* bulk operations broken  in bookmarklet ([5ad1e7f](https://github.com/adobe/helix-sidekick-extension/commit/5ad1e7f2a66f9df28a33e82b5e421777b7d1b617))
* release script ([dbae6c3](https://github.com/adobe/helix-sidekick-extension/commit/dbae6c32dae783aac445ca2e6e423da5acb7692e))

## [6.7.2](https://github.com/adobe/helix-sidekick-extension/compare/v6.7.1...v6.7.2) (2023-01-01)


### Bug Fixes

* double slash in url if root folder ([c1c2df7](https://github.com/adobe/helix-sidekick-extension/commit/c1c2df71ceef462b92f67cffeece736c909648f7))
* use json extension for spreadsheets ([81f8b8e](https://github.com/adobe/helix-sidekick-extension/commit/81f8b8ea033eec7b082883747bf52ab6727d4355))

## [6.7.1](https://github.com/adobe/helix-sidekick-extension/compare/v6.7.0...v6.7.1) (2023-01-01)


### Bug Fixes

* bool that determines if mime type is neither a doc or a sheet ([dd7ece5](https://github.com/adobe/helix-sidekick-extension/commit/dd7ece5d18d25a88aa821eaea1e0c97c974623bd))

# [6.7.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.6.1...v6.7.0) (2022-12-31)


### Bug Fixes

* add selection publish ([5cda069](https://github.com/adobe/helix-sidekick-extension/commit/5cda0694e2d5358b2ddc7ba13136bbc53d2609f8))
* bulk-publish test ([d427704](https://github.com/adobe/helix-sidekick-extension/commit/d427704564c283f62da115f0661900c4daa5840d))
* getSelection for onedrive ([05da003](https://github.com/adobe/helix-sidekick-extension/commit/05da003a17793b66a4fb84627ce9162e3bdd95ac))
* harmonize messages ([fd85d51](https://github.com/adobe/helix-sidekick-extension/commit/fd85d51f1fcf31587a536b918917b187d16c12a7))
* missing paths ([d52ad02](https://github.com/adobe/helix-sidekick-extension/commit/d52ad02833b8d9b74bb97bfe3ce01b1739b69f60))
* refresh status if location was changed ([2a105e3](https://github.com/adobe/helix-sidekick-extension/commit/2a105e35e1e458421280c26b14c56b411f27d9d3))
* show consistent messages ([a1e9c19](https://github.com/adobe/helix-sidekick-extension/commit/a1e9c194b0f3fe611cfc9c842a09523c1c7a610c))
* test ([40de96f](https://github.com/adobe/helix-sidekick-extension/commit/40de96f169d7622fb52e069ccf8b40932a709e37))
* tests ([4c921e3](https://github.com/adobe/helix-sidekick-extension/commit/4c921e384aec207dbcee3de0849989ce308aa903))
* tests ([d29b545](https://github.com/adobe/helix-sidekick-extension/commit/d29b5456632b7c3114c1ac224b811c3ec2140b28))
* tests ([7723209](https://github.com/adobe/helix-sidekick-extension/commit/77232096c2b3d6d9ff2162d704d517983daf8346))
* toggle sk when navigating admin folders ([fd50e71](https://github.com/adobe/helix-sidekick-extension/commit/fd50e714c611b0cf4df1f8ffd64ddef11ad8f064))
* update location before fetching status ([a4d0b99](https://github.com/adobe/helix-sidekick-extension/commit/a4d0b996c5dd1b163f54ad9b6f4ecb95bd866984))
* user drodown cleanup after logout ([49c3bf4](https://github.com/adobe/helix-sidekick-extension/commit/49c3bf49920c204c3694a44a080c4778cd7236d4))


### Features

* bulk copy preview, live and prod urls ([cf9b715](https://github.com/adobe/helix-sidekick-extension/commit/cf9b715d258ee154553320219fce3d55bf072d2e))
* bulk copy urls ([2f1f690](https://github.com/adobe/helix-sidekick-extension/commit/2f1f69030016ccb50afe20c751dfc9ad294e09a2))
* bulk preview ([ab1552c](https://github.com/adobe/helix-sidekick-extension/commit/ab1552ca8437484ed4a9e448883235b075d637b0))
* bulk preview in gdrive ([cbc8c67](https://github.com/adobe/helix-sidekick-extension/commit/cbc8c67de9aee86fb98abc3e8708b87b5775713f))
* info button for last modified times ([2942c38](https://github.com/adobe/helix-sidekick-extension/commit/2942c38d6d8856eaf7c4b6082868a0653963e3d8)), closes [#179](https://github.com/adobe/helix-sidekick-extension/issues/179)
* parallel execution ([30972cb](https://github.com/adobe/helix-sidekick-extension/commit/30972cb55f72c075c37f2e3230c9e6a9663dfcef))
* throttle, progress update and nicer error messages ([f3fcde4](https://github.com/adobe/helix-sidekick-extension/commit/f3fcde4faa8b1f13243ff6f8f682e75c9f342a05))

## [6.6.1](https://github.com/adobe/helix-sidekick-extension/compare/v6.6.0...v6.6.1) (2022-12-29)


### Bug Fixes

* add project not shown with fresh config ([bddea28](https://github.com/adobe/helix-sidekick-extension/commit/bddea2815439fa703acc0fd80139aa530934e8a5))
* test ([b91486a](https://github.com/adobe/helix-sidekick-extension/commit/b91486a7816767f4a869ec95e0537e5e57c853fb))
* ui glitch on options page ([9f002d2](https://github.com/adobe/helix-sidekick-extension/commit/9f002d23f878b7bbd027929fc3bb1a36cc024d64))

# [6.6.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.5.0...v6.6.0) (2022-12-07)


### Bug Fixes

* remove trailing slash ([#197](https://github.com/adobe/helix-sidekick-extension/issues/197)) ([a8c8ee4](https://github.com/adobe/helix-sidekick-extension/commit/a8c8ee4990367893dfb991f6a0280c1a64029f66))


### Features

* view doc source only for active tab ([#198](https://github.com/adobe/helix-sidekick-extension/issues/198)) ([23026a7](https://github.com/adobe/helix-sidekick-extension/commit/23026a7b76d08c15cd64935605c50f82d48fc1fb))

# [6.5.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.4.0...v6.5.0) (2022-12-05)


### Features

* improved config matching algorithm ([076a37b](https://github.com/adobe/helix-sidekick-extension/commit/076a37bd2cfcf03ca7673864004367b2fe072d9d))

# [6.4.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.3.2...v6.4.0) (2022-11-28)


### Features

* show the View Document Source context menu item if site is a Franklin site ([#188](https://github.com/adobe/helix-sidekick-extension/issues/188)) ([126ba50](https://github.com/adobe/helix-sidekick-extension/commit/126ba50a7765b550c0b08e1fe246191e256cc6b7))

## [6.3.2](https://github.com/adobe/helix-sidekick-extension/compare/v6.3.1...v6.3.2) (2022-11-22)


### Bug Fixes

* **deps:** update external fixes ([eb516d9](https://github.com/adobe/helix-sidekick-extension/commit/eb516d9a70e1a0cc41c35932522276193d4dc82c))

## [6.3.1](https://github.com/adobe/helix-sidekick-extension/compare/v6.3.0...v6.3.1) (2022-11-21)


### Bug Fixes

* sharepoint avatar cannot be loaded ([0f9e8b3](https://github.com/adobe/helix-sidekick-extension/commit/0f9e8b3d06b63e974eefb96640616b6308fc9fcd))

# [6.3.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.2.1...v6.3.0) (2022-11-21)


### Features

* view document source popup ([#177](https://github.com/adobe/helix-sidekick-extension/issues/177)) ([f99d3ba](https://github.com/adobe/helix-sidekick-extension/commit/f99d3ba1b832034f1e938887ad6f88e79644a4a7))

## [6.2.1](https://github.com/adobe/helix-sidekick-extension/compare/v6.2.0...v6.2.1) (2022-11-20)


### Bug Fixes

* login/logout flow ([b133a19](https://github.com/adobe/helix-sidekick-extension/commit/b133a19ddeae2e6b082ff0e9f5aabeea9fdd7396))

# [6.2.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.1.0...v6.2.0) (2022-11-14)


### Bug Fixes

* exclude auth tokens from backup ([04dc8af](https://github.com/adobe/helix-sidekick-extension/commit/04dc8af59a02842bcf15ab3a739cc6d82c78e76f))
* extend existing plugin ([d5bab99](https://github.com/adobe/helix-sidekick-extension/commit/d5bab9908382515efb87b77d5692443522487d3a))


### Features

* detect git clone url when adding project ([eb503f4](https://github.com/adobe/helix-sidekick-extension/commit/eb503f4287ba8ce00ee4106bee75b96e83bfda0a))
* show extension hint to bookmarklet users ([b91b7a3](https://github.com/adobe/helix-sidekick-extension/commit/b91b7a39550f93911e866ecbdf09302d918ba4c0))

# [6.1.0](https://github.com/adobe/helix-sidekick-extension/compare/v6.0.0...v6.1.0) (2022-11-11)


### Features

* add ability to pass additional sk config info to url ([51b47a2](https://github.com/adobe/helix-sidekick-extension/commit/51b47a294632add72d47ac9b0f206bc930cb9c07))

# [6.0.0](https://github.com/adobe/helix-sidekick-extension/compare/v5.10.0...v6.0.0) (2022-11-04)


### Features

* use manifest v3 ([6872930](https://github.com/adobe/helix-sidekick-extension/commit/6872930cb6c8f026c9dc1e15b02b3b05a1252fc9))


### BREAKING CHANGES

* uses manifest v3

# [5.10.0](https://github.com/adobe/helix-sidekick-extension/compare/v5.9.0...v5.10.0) (2022-11-04)


### Features

* migrate to manifest v3 ([78723c7](https://github.com/adobe/helix-sidekick-extension/commit/78723c7d7cc9d1bd42c7862bf04ee813bab6f376))

# [5.9.0](https://github.com/adobe/helix-sidekick-extension/compare/v5.8.0...v5.9.0) (2022-08-22)


### Features

* pdf support ([f057a8f](https://github.com/adobe/helix-sidekick-extension/commit/f057a8fb49c1eaa29256365616155474ca44e47b))

# [5.8.0](https://github.com/adobe/helix-sidekick-extension/compare/v5.7.1...v5.8.0) (2022-08-21)


### Features

* enable/disable project via contxt menu ([38dd70a](https://github.com/adobe/helix-sidekick-extension/commit/38dd70a50215c6c901a6d19c9ef180a145bb5d1f))

## [5.7.1](https://github.com/adobe/helix-sidekick-extension/compare/v5.7.0...v5.7.1) (2022-07-08)


### Bug Fixes

* support custom sharepoint domains ([c2fc845](https://github.com/adobe/helix-sidekick-extension/commit/c2fc845283125cf4615cfe41ec234ffffa037c78))

# [5.7.0](https://github.com/adobe/helix-sidekick-extension/compare/v5.6.2...v5.7.0) (2022-07-05)


### Features

* use cookie-less auth ([12c3143](https://github.com/adobe/helix-sidekick-extension/commit/12c31435267b5cde234aed914039ed55327edf86))

## [5.6.2](https://github.com/adobe/helix-sidekick-extension/compare/v5.6.1...v5.6.2) (2022-05-17)


### Bug Fixes

* add project missing from context menu ([c4fa5e2](https://github.com/adobe/helix-sidekick-extension/commit/c4fa5e217b50459ee8fc7b36431728d437028f81))

## [5.6.1](https://github.com/adobe/helix-sidekick-extension/compare/v5.6.0...v5.6.1) (2022-04-25)


### Bug Fixes

* **regression:** add via sharing url broken ([c152792](https://github.com/adobe/helix-sidekick-extension/commit/c1527924a5e56cc2459f4ddfbbbde9b6edf24dac))

# [5.6.0](https://github.com/adobe/helix-sidekick-extension/compare/v5.5.2...v5.6.0) (2022-04-24)


### Features

* add projects from preview or live, disable projects ([05f57fb](https://github.com/adobe/helix-sidekick-extension/commit/05f57fb46507ca08d00ff8b9ef8350b12a3c2512))

## [5.5.2](https://github.com/adobe/helix-sidekick-extension/compare/v5.5.1...v5.5.2) (2022-04-14)


### Bug Fixes

* more reliable project url detection ([3b8ba38](https://github.com/adobe/helix-sidekick-extension/commit/3b8ba380e63dfc66f6c60d011a0a2187a21f62a1))

## [5.5.1](https://github.com/adobe/helix-sidekick-extension/compare/v5.5.0...v5.5.1) (2022-04-06)


### Bug Fixes

* config picker text too low ([898181e](https://github.com/adobe/helix-sidekick-extension/commit/898181e32426caab38831f8f1c4ec3fcfc4077b2))

# [5.5.0](https://github.com/adobe/helix-sidekick-extension/compare/v5.4.1...v5.5.0) (2022-04-06)


### Features

* user login, permissions and profile ([3453aea](https://github.com/adobe/helix-sidekick-extension/commit/3453aeaf45da7c61692f57f06ae14bc2064b777a))

## [5.4.1](https://github.com/adobe/helix-sidekick-extension/compare/v5.4.0...v5.4.1) (2022-03-26)


### Bug Fixes

* **regression:** use production host if configured in extension ([b453d10](https://github.com/adobe/helix-sidekick-extension/commit/b453d1066ad05bab853e41afe96e33337b292c16))

# [5.4.0](https://github.com/adobe/helix-sidekick-extension/compare/v5.3.0...v5.4.0) (2022-03-22)


### Features

* improve config picker UX ([8734e56](https://github.com/adobe/helix-sidekick-extension/commit/8734e56e408c4aac7e03b993d7f9bfe2a27ba2ca))
* improve help UX ([2895f97](https://github.com/adobe/helix-sidekick-extension/commit/2895f97cdab0220b0cab75642e2a78b59b6746de))

# [5.3.0](https://github.com/adobe/helix-sidekick-extension/compare/v5.2.0...v5.3.0) (2022-03-18)


### Features

* invoke branch version of sidekick ([acd6aa1](https://github.com/adobe/helix-sidekick-extension/commit/acd6aa107201534136b37005965a2bb5a12bc6b0))
* remove legacy support ([8ea58af](https://github.com/adobe/helix-sidekick-extension/commit/8ea58af7af89e4a8badb392c272357ee69c3ccdc))

# [5.2.0](https://github.com/adobe/helix-sidekick-extension/compare/v5.1.5...v5.2.0) (2022-03-15)


### Bug Fixes

* config picker should respect pushDown flag ([7944ca7](https://github.com/adobe/helix-sidekick-extension/commit/7944ca7175d5cb4c3a0e7cf785f109fac843a95f))


### Features

* remember area states in options ([d2dbd7a](https://github.com/adobe/helix-sidekick-extension/commit/d2dbd7a36141f33202aeb77674232b1cf9d1498c))

## [5.1.5](https://github.com/adobe/helix-sidekick-extension/compare/v5.1.4...v5.1.5) (2022-02-25)


### Bug Fixes

* edits of project configs not persisted ([505c2e9](https://github.com/adobe/helix-sidekick-extension/commit/505c2e95f07ba291608899024c2341e53e398756))

## [5.1.4](https://github.com/adobe/helix-sidekick-extension/compare/v5.1.3...v5.1.4) (2022-02-24)


### Bug Fixes

* **regression:** sharepoint url support ([3cb3384](https://github.com/adobe/helix-sidekick-extension/commit/3cb3384c3d17d4d0375d4730d96f9d68651e3224))

## [5.1.3](https://github.com/adobe/helix-sidekick-extension/compare/v5.1.2...v5.1.3) (2022-02-17)


### Bug Fixes

* reload page after adding project via context menu ([129cd59](https://github.com/adobe/helix-sidekick-extension/commit/129cd590df3a60a971b9e776d16ba2591757e8e2))

## [5.1.2](https://github.com/adobe/helix-sidekick-extension/compare/v5.1.1...v5.1.2) (2022-02-17)


### Bug Fixes

* reload page after adding project via context menu ([a74d481](https://github.com/adobe/helix-sidekick-extension/commit/a74d4816a18e80155fce620d3ee77aea5dfa195f))

## [5.1.1](https://github.com/adobe/helix-sidekick-extension/compare/v5.1.0...v5.1.1) (2022-02-15)


### Bug Fixes

* options page shows hlx.page preview urls ([7d65f2b](https://github.com/adobe/helix-sidekick-extension/commit/7d65f2b5b6681bf45cba1edb2bbb01cc0a059dee))
* support mountpoints in personal sharepoint ([42c38f2](https://github.com/adobe/helix-sidekick-extension/commit/42c38f2e10a209e8f138a64bc2c924b65d2b1893))

# [5.1.0](https://github.com/adobe/helix-sidekick-extension/compare/v5.0.3...v5.1.0) (2022-02-14)


### Features

* option to push down content ([c6e1f4a](https://github.com/adobe/helix-sidekick-extension/commit/c6e1f4aad996afc200b015b230decdefb433e548))

## [5.0.3](https://github.com/adobe/helix-sidekick-extension/compare/v5.0.2...v5.0.3) (2022-02-12)


### Bug Fixes

* force patch release for [#34](https://github.com/adobe/helix-sidekick-extension/issues/34) ([56c8ceb](https://github.com/adobe/helix-sidekick-extension/commit/56c8cebf4f12d21df42927f2e51c2119306581fd))

## [5.0.2](https://github.com/adobe/helix-sidekick-extension/compare/v5.0.1...v5.0.2) (2022-02-11)


### Bug Fixes

* **configpicker:** close button regression ([8a608c1](https://github.com/adobe/helix-sidekick-extension/commit/8a608c1c2818f6a38f244ca9a93c04d652f1ae03))

## [5.0.1](https://github.com/adobe/helix-sidekick-extension/compare/v5.0.0...v5.0.1) (2022-02-11)


### Bug Fixes

* i18n description limit ([11f2388](https://github.com/adobe/helix-sidekick-extension/commit/11f238832bf8ee798efd1f9f32ccc9a8e49b6c09))

# [5.0.0](https://github.com/adobe/helix-sidekick-extension/compare/v4.2.3...v5.0.0) (2022-02-11)


### chore

* **ci:** force major release ([9c7113e](https://github.com/adobe/helix-sidekick-extension/commit/9c7113e0e74d35f19b2aec281c2f0eb297716d5d))


### Features

* filter help topics by target version ([00117f1](https://github.com/adobe/helix-sidekick-extension/commit/00117f13f2cd292ccc7d47faa0041d39e6489198))
* show help (wip) ([26a9664](https://github.com/adobe/helix-sidekick-extension/commit/26a9664888fe0bcc37bd64dfa7751c574282524a))
* show help (wip) ([9d376d9](https://github.com/adobe/helix-sidekick-extension/commit/9d376d9e8d87170a16ea6b9e9cf179fbab06ec5e))
* show help content ([aa2fb82](https://github.com/adobe/helix-sidekick-extension/commit/aa2fb820f8dff09bfe70f7e28892641ecd585cee))


### BREAKING CHANGES

* **ci:** major UX changes

## [4.2.3](https://github.com/adobe/helix-sidekick-extension/compare/v4.2.2...v4.2.3) (2022-02-08)


### Bug Fixes

* check for query param ([71fe059](https://github.com/adobe/helix-sidekick-extension/commit/71fe059510b76fa9dbe758febc18d7da6da98b30))

## [4.2.2](https://github.com/adobe/helix-sidekick-extension/compare/v4.2.1...v4.2.2) (2022-02-08)


### Bug Fixes

* unstable share URL instrumentation ([11f1877](https://github.com/adobe/helix-sidekick-extension/commit/11f18774e2ba486525dc2e44d97f04da9dfbe900))

## [4.2.1](https://github.com/adobe/helix-sidekick-extension/compare/v4.2.0...v4.2.1) (2022-02-08)


### Bug Fixes

* share URL instrumentation not run ([c82725e](https://github.com/adobe/helix-sidekick-extension/commit/c82725ef02f10f82cb61bbde5b876015233de291))

# [4.2.0](https://github.com/adobe/helix-sidekick-extension/compare/v4.1.1...v4.2.0) (2022-02-07)


### Features

* simplify adding project from share url ([9d376f8](https://github.com/adobe/helix-sidekick-extension/commit/9d376f8cf10630a15645f592837619b05aa085f7))

## [4.1.1](https://github.com/adobe/helix-sidekick-extension/compare/v4.1.0...v4.1.1) (2022-02-01)


### Bug Fixes

* scroll exapnded option area into view ([b4f26dc](https://github.com/adobe/helix-sidekick-extension/commit/b4f26dc83061195d606e969749cd41ca887050e5))

# [4.1.0](https://github.com/adobe/helix-sidekick-extension/compare/v4.0.0...v4.1.0) (2022-01-31)


### Features

* support admin version ([a2bef98](https://github.com/adobe/helix-sidekick-extension/commit/a2bef98e2ea97714016e7a22367c3b62285b1741))

# [4.0.0](https://github.com/adobe/helix-sidekick-extension/compare/v3.35.3...v4.0.0) (2022-01-24)


### chore

* ensure major release [skip ci] ([444fd72](https://github.com/adobe/helix-sidekick-extension/commit/444fd7247efb85d3bfa76973b85d1627feed06c5))


### Features

* remove hlx2 support ([cb3acd5](https://github.com/adobe/helix-sidekick-extension/commit/cb3acd50b1d223fe1b1b159fe34bb84b0a811f18))


### BREAKING CHANGES

* Older projects will no longer be able to use the sidekick

## [3.35.3](https://github.com/adobe/helix-sidekick-extension/compare/v3.35.2...v3.35.3) (2022-01-21)


### Bug Fixes

* more leniency with URL format in mountpoint ([0642ab0](https://github.com/adobe/helix-sidekick-extension/commit/0642ab03bb77ecf229485373466f2bbb6a64629a))

## [3.35.2](https://github.com/adobe/helix-sidekick-extension/compare/v3.35.1...v3.35.2) (2022-01-21)


### Bug Fixes

* sidekick extension doesn't like uppercase gh ([e73a8cf](https://github.com/adobe/helix-sidekick-extension/commit/e73a8cfd6c0ac39fb83eb883d5a00b599a5fc1f7))
