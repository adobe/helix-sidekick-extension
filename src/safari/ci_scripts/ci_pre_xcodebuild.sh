#!/bin/sh

#  ci_pre_xcodebuild.sh
#  helix-sidekick-extension
#

cd ../../..
brew install node
npm install
npm run build:safari

if [ $CI_BRANCH != "main" ]; then
  # use test version
  PBX_FILE="$CI_PROJECT_FILE_PATH/project.pbxproj"
  VERSION=`cat "$CI_WORKSPACE/src/extension/manifest.json" | grep -e "\"version\"" | sed -n "s/[^0-9.]//gp"`
  TEST_VERSION=`$CI_WORKSPACE/src/safari/ci_scripts/increment_version.sh -p $VERSION`
  echo "VERSION: $VERSION"
  echo "TEST_VERSION: $TEST_VERSION"
  sed -i "" "$VERSION/$TEST_VERSION/g" "$PBX_FILE"
  echo `cat "$PBX_FILE" | grep MARKETING_VERSION`

  # use test icon
  DEFAULT_ICON="$CI_WORKSPACE/src/safari/Shared (App)/Assets.xcassets/AppIcon.appiconset"
  TEST_ICON="$CI_WORKSPACE/src/safari/ci_scripts/AppIcon-Test.appiconset"
  echo "Building from branch $CI_BRANCH, use test icon"
  rm -rf "$DEFAULT_ICON"
  mv "$TEST_ICON" "$DEFAULT_ICON"
fi
