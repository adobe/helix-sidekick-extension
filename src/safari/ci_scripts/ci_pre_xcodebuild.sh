#!/bin/sh

#  ci_pre_xcodebuild.sh
#  helix-sidekick-extension
#

cd ../..
pwd
echo `which node`
`which node` ./build/build.js safari
