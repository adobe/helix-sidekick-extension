# Helix Sidekick Configuration

To customize the [Helix Sidekick Bookmarklet](./index.md) to your project, add configuration to your project's GitHub repository:
1. Add a `/tools/sidekick/config.js` file
2. In there, use the following call to initialize the Sidekick Bookmarklet with your custom configuration:
   ```js
   window.hlx.initSidekick({
     project: 'My Project',
     host: 'www.mydomain.prod',
   });
   ```
3. For available configuration options, see the [Helix Sidekick API documentation](./API.md#windowhlxsidekickconfig--object).
