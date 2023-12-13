#!/bin/sh

#  ci_pre_xcodebuild.sh
#  helix-sidekick-extension
#

cd ../../..
npm install
npm run build:safari

if [ $CI_BRANCH != "main" ]; then
  echo "Building from branch $CI_BRANCH"

  # use test version
  PBX_FILE="$CI_PROJECT_FILE_PATH/project.pbxproj"
  VERSION=`cat "$CI_PRIMARY_REPOSITORY_PATH/src/extension/manifest.json" | grep -e "\"version\"" | sed -n "s/[^0-9.]//gp"`
  TEST_VERSION=`$CI_PRIMARY_REPOSITORY_PATH/src/safari/ci_scripts/increment_version.sh -p $VERSION`
  sed -i "" "s/$VERSION/$TEST_VERSION/g" "$PBX_FILE"
  echo "using test version $TEST_VERSION"

  # use test icon
  DEFAULT_ICON="$CI_PRIMARY_REPOSITORY_PATH/src/safari/Shared (App)/Assets.xcassets/AppIcon.appiconset"
  TEST_ICON="$CI_PRIMARY_REPOSITORY_PATH/src/safari/ci_scripts/AppIcon-Test.appiconset"
  rm -rf "$DEFAULT_ICON"
  mv "$TEST_ICON" "$DEFAULT_ICON"
  echo "using test icon"
fi
