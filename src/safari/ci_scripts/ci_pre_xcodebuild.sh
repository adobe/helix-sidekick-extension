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
  PBX_FILE="$CI_WORKSPACE/src/safari/helix-sidekick-extension.xcodeproj/project.pbxproj"
  sed -E -i "" "s/[0-9]+\.[0-9]+\.[0-9]+/99.99.99/g" "$PBX_FILE"
  echo `cat "$PBX_FILE" | grep MARKETING_VERSION`

  # use test icon
  DEFAULT_ICON="$CI_WORKSPACE/src/safari/Shared (App)/Assets.xcassets/AppIcon.appiconset"
  TEST_ICON="$CI_WORKSPACE/src/safari/ci_scripts/AppIcon-Test.appiconset"
  echo "Building from branch $CI_BRANCH, use test icon"
  rm -rf "$DEFAULT_ICON"
  mv "$TEST_ICON" "$DEFAULT_ICON"
fi
