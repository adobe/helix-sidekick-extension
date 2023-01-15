#!/bin/sh

#  ci_pre_xcodebuild.sh
#  helix-sidekick-extension
#

echo node:`which node`
echo brew:`which brew`
echo port:`which port`
echo pkgin:`which pkgin`
cd ../../..
curl "https://nodejs.org/dist/latest/node-${VERSION:-$(wget -qO- https://nodejs.org/dist/latest/ | sed -nE 's|.*>node-(.*)\.pkg</a>.*|\1|p')}.pkg" > "$HOME/Downloads/node-latest.pkg" && sudo installer -store -pkg "$HOME/Downloads/node-latest.pkg" -target "/"
node ./build/build.js safari
