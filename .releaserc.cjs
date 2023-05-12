module.exports = {
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    ['semantic-release-react-native', {
      'versionStrategy': {
        'ios': { 'buildNumber': 'semantic' },
      },
      'iosPath': 'src/safari',
      'skipAndroid': true,
    }],
    ['@semantic-release/changelog', {
      'changelogFile': 'CHANGELOG.md',
    }],
    ["@semantic-release/npm", {
      npmPublish: false,
    }],
    ['@semantic-release/git', {
      'assets': [
        'package.json',
        'CHANGELOG.md',
        'src/safari/helix-sidekick-extension.xcodeproj/project.pbxproj'
      ],
      'message': 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
    }],
    ['@semantic-release/github', {}],
    ['@semantic-release/exec', {
      publishCmd: 'npm run release:chrome',
    }],
  ],
  branches: ['main'],
};
