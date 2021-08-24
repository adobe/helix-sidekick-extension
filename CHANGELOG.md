## [3.7.4](https://github.com/adobe/helix-sidekick/compare/v3.7.3...v3.7.4) (2021-08-24)


### Bug Fixes

* publish not working in hlx3 without host ([44804ce](https://github.com/adobe/helix-sidekick/commit/44804ce1fd16e9cf3e2619c3ee98ff1ba773e4f5))

## [3.7.3](https://github.com/adobe/helix-sidekick/compare/v3.7.2...v3.7.3) (2021-08-20)


### Bug Fixes

* detect ci build domain for testing ([c6a3b31](https://github.com/adobe/helix-sidekick/commit/c6a3b314f458e620f978762e90dbeff8120b97fe))

## [3.7.2](https://github.com/adobe/helix-sidekick/compare/v3.7.1...v3.7.2) (2021-08-18)


### Bug Fixes

* broken live button on hlx3 without prod host ([6ff36bc](https://github.com/adobe/helix-sidekick/commit/6ff36bce031bc74983f7313fcc426d5c4bd28d38))

## [3.7.1](https://github.com/adobe/helix-sidekick/compare/v3.7.0...v3.7.1) (2021-08-11)


### Bug Fixes

* leave prod hostnames with dashes alone ([2fa7344](https://github.com/adobe/helix-sidekick/commit/2fa7344ee9da176993cf96bf340c1a84fa11d501))

# [3.7.0](https://github.com/adobe/helix-sidekick/compare/v3.6.0...v3.7.0) (2021-08-09)


### Bug Fixes

* auto-update on switch from editor to preview ([ce32f06](https://github.com/adobe/helix-sidekick/commit/ce32f06cf46ad9400aa52e613383cd39b7ac4abd))
* error handling when fetching status fails ([981639f](https://github.com/adobe/helix-sidekick/commit/981639f9736ae8fff3a7a939eb3e0fb9a74b5993))
* load language specific labels ([0d99b3c](https://github.com/adobe/helix-sidekick/commit/0d99b3c6b348dc4d07b5ef1012292a0756c9e137))


### Features

* auto-update preview on hlx3 only ([51495d0](https://github.com/adobe/helix-sidekick/commit/51495d0bff95a2c73be93657c42eb250734f9c80))
* fr translations ([105591b](https://github.com/adobe/helix-sidekick/commit/105591b455ea33784a4a9ace31ba645a432dd439))

# [3.6.0](https://github.com/adobe/helix-sidekick/compare/v3.5.1...v3.6.0) (2021-07-15)


### Features

* add outerHost config property ([467052a](https://github.com/adobe/helix-sidekick/commit/467052ac3022be0f9ed39d568f7192d9ca4bec32))

## [3.5.1](https://github.com/adobe/helix-sidekick/compare/v3.5.0...v3.5.1) (2021-07-13)


### Bug Fixes

* js error ([ccf0bb3](https://github.com/adobe/helix-sidekick/commit/ccf0bb3ca6d5265a2ad1f929e0d6dee8d5b540bb))

# [3.5.0](https://github.com/adobe/helix-sidekick/compare/v3.4.1...v3.5.0) (2021-07-08)


### Bug Fixes

* load config.js from same origin on inner CDN ([3b38e29](https://github.com/adobe/helix-sidekick/commit/3b38e2916f494cca2141b3dd199e57334638f35a))


### Features

* remove byocdn consistency check ([9ad3539](https://github.com/adobe/helix-sidekick/commit/9ad3539f47cac2907f60c57fcf868f21c9c46ef2))
* remove purgeHost config property ([41207ae](https://github.com/adobe/helix-sidekick/commit/41207aeddb3659ab8eaf05a01f1d3c4057a70451))
* remove special hlx3 flag handling ([a572fee](https://github.com/adobe/helix-sidekick/commit/a572feed21cf998b20c9da07e03a862e983d8395))

## [3.4.1](https://github.com/adobe/helix-sidekick/compare/v3.4.0...v3.4.1) (2021-07-07)


### Bug Fixes

* loading config.js fails on byocdn prod host ([57c5980](https://github.com/adobe/helix-sidekick/commit/57c59801baeb264e7594d245f2f529b78af10c2d))

# [3.4.0](https://github.com/adobe/helix-sidekick/compare/v3.3.1...v3.4.0) (2021-07-07)


### Features

* detect outer cdn with and without ref ([46aed97](https://github.com/adobe/helix-sidekick/commit/46aed97c7fd43947f2d7c02ef7a8cf7c6b7bae0b))

## [3.3.1](https://github.com/adobe/helix-sidekick/compare/v3.3.0...v3.3.1) (2021-07-06)


### Bug Fixes

* cors error while loading config.js ([43f2812](https://github.com/adobe/helix-sidekick/commit/43f281238fa177ccd174a4eb45b71ff5a30aac3e))

# [3.3.0](https://github.com/adobe/helix-sidekick/compare/v3.2.1...v3.3.0) (2021-07-06)


### Bug Fixes

* allow empty ref (defaults to main) ([25816d3](https://github.com/adobe/helix-sidekick/commit/25816d3749f940fc3b79cdee1a669d105c8437ed))
* js error ([bd0dbf0](https://github.com/adobe/helix-sidekick/commit/bd0dbf0fedda696b6a64ef5c8dabf83ff782f07c))
* js error ([ad0f24c](https://github.com/adobe/helix-sidekick/commit/ad0f24cfa8f066e244955dc34006cc9c41f10958))
* js error ([c235af3](https://github.com/adobe/helix-sidekick/commit/c235af3b73335ccc7699495c8f88681ff35b86bb))
* js error ([bd1f708](https://github.com/adobe/helix-sidekick/commit/bd1f7083d7baf64b853a4b3b783ee3bd89bfa9c3))
* js error ([8b8baa7](https://github.com/adobe/helix-sidekick/commit/8b8baa7c7c9fb33b74a19adae7447a11ee1cb82c))
* js error ([cc74f8d](https://github.com/adobe/helix-sidekick/commit/cc74f8d8597bda6de29e84444f6c7e0cc50b5040))
* return the sidekick ([#27](https://github.com/adobe/helix-sidekick/issues/27)) ([54873c8](https://github.com/adobe/helix-sidekick/commit/54873c8bc2497298019fa6a133657884c9b9e1c3))
* use compat mode if no config.js found ([78aeb43](https://github.com/adobe/helix-sidekick/commit/78aeb4319a0d14084e65409228f2e71a416370ff))


### Features

* bookmarklet compatibility mode ([2e41573](https://github.com/adobe/helix-sidekick/commit/2e415733f0cc1ba9926e04816b75f916b42f2f0e))
* load config and plugins from project ([17b9ac6](https://github.com/adobe/helix-sidekick/commit/17b9ac6eef8f44d636e620d98578342fa2b9587c))
* load config and plugins from project ([770d763](https://github.com/adobe/helix-sidekick/commit/770d7635a6fefcc683886fd9e05da7005ccc52b1))
* pass sidekick to button actions ([e905ce0](https://github.com/adobe/helix-sidekick/commit/e905ce032430638135eb478d388062fda10095fa))
* use branch in outer cdn host if hlx3 ([cf3199d](https://github.com/adobe/helix-sidekick/commit/cf3199d1e564f356308d132d01d007873d3b4729))

## [3.2.1](https://github.com/adobe/helix-sidekick/compare/v3.2.0...v3.2.1) (2021-06-24)


### Bug Fixes

* return the sidekick ([#27](https://github.com/adobe/helix-sidekick/issues/27)) ([8b1249b](https://github.com/adobe/helix-sidekick/commit/8b1249bb51ef425fde0f3088c069a23b57b9f495))

# [3.2.0](https://github.com/adobe/helix-sidekick/compare/v3.1.0...v3.2.0) (2021-06-21)


### Bug Fixes

* only include path when outside of editor ([bf3fd2d](https://github.com/adobe/helix-sidekick/commit/bf3fd2d5ea8e1ea58472b1209fe2e774e1fa49c4))


### Features

* emit events ([c361f15](https://github.com/adobe/helix-sidekick/commit/c361f15b8ae37f610e47fac449d638a2c8798de0))
* fetch status initially, update preview ([a4b75bc](https://github.com/adobe/helix-sidekick/commit/a4b75bc80d03b17519f6bd032193d1987fdd0d68))
* fetch status initially, update preview ([efce422](https://github.com/adobe/helix-sidekick/commit/efce422bf234ded6b80995ecd9153376a5bcb14e))

# [3.1.0](https://github.com/adobe/helix-sidekick/compare/v3.0.0...v3.1.0) (2021-06-17)


### Features

* switch to admin.hlx3.page ([751b134](https://github.com/adobe/helix-sidekick/commit/751b1348fa930fb6ef4fa228684d8d011dd5c880))


## [3.0.0](https://github.com/adobe/helix-sidekick/compare/v0.0.1...v3.0.0) (2021-06-17)


### Features
* **feat: hlx3 support and new admin api** ([#5](https://github.com/adobe/helix-sidekick/pull/5)) ([bdf71d95006725facfec33de0fba973578e6a67a](https://github.com/adobe/helix-sidekick/commit/bdf71d95006725facfec33de0fba973578e6a67a))
