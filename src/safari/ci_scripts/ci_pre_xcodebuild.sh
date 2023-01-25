#!/bin/sh

#  ci_pre_xcodebuild.sh
#  helix-sidekick-extension
#

cd ../../..
brew install node
npm install
npm run build:safari
