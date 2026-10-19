'use strict';

// Preload alongside the unchanged screen-check tools. Each context is bound to
// its preview origin; external requests, including redirects, are aborted.
const { createRequire } = require('node:module');
const { join } = require('node:path');

function install(playwright, explicitOrigin = process.env.NEVORA_CHECK_ORIGIN) {
  for (const name of ['chromium', 'webkit']) {
    const type = playwright[name];
    const launch = type.launch.bind(type);
    type.launch = async (...args) => {
      const browser = await launch(...args);
      const newContext = browser.newContext.bind(browser);
      browser.newContext = async options => {
        const context = await newContext({ ...options, serviceWorkers: 'block' });
        let origin = explicitOrigin;
        await context.route('**/*', route => {
          const target = new URL(route.request().url());
          if (!origin && target.protocol === 'http:' && target.hostname === '127.0.0.1' && target.pathname === '/login') origin = target.origin;
          return ['http:', 'https:'].includes(target.protocol) && target.origin === origin ? route.continue() : route.abort();
        });
        if (context.routeWebSocket) await context.routeWebSocket('**/*', socket => {
          const target = new URL(socket.url());
          const httpOrigin = target.origin.replace(/^ws/, 'http');
          if (httpOrigin === origin) socket.connectToServer();
          else socket.close({ code: 1008, reason: 'Preview origin only' });
        });
        return context;
      };
      return browser;
    };
  }
}

module.exports = { install };
if (process.env.PLAYWRIGHT_RUNTIME_ROOT) {
  const runtime = createRequire(join(process.env.PLAYWRIGHT_RUNTIME_ROOT, 'package.json'));
  install(runtime('playwright'));
}
