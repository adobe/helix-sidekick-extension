#!/bin/sh

#  ci_pre_xcodebuild.sh
#  helix-sidekick-extension
#

cd ../../..
brew install node
npm install
npm run build:safari

if [ $CI_BRANCH != "main" ]; then
  echo "Building from branch $CI_BRANCH, use test icon"
  echo "$CI_WORKSPACE/src/safari/ci_scripts/AppIcon-Test.appiconset > $APP_ICON_PATH
  rm -rf $APP_ICON_PATH
  mv "$CI_WORKSPACE/src/safari/ci_scripts/AppIcon-Test.appiconset" $APP_ICON_PATH
fi
