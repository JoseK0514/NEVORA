'use strict';

// Preload alongside the unchanged screen-check tools. Each context is bound to
// its preview origin; external requests, including redirects, are aborted.
const { createRequire } = require('node:module');
const { join } = require('node:path');
const { appendFileSync } = require('node:fs');

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
        if (context.on && process.env.NEVORA_CHECK_DIAGNOSTICS) context.on('page', page => {
          page.on('response', response => {
            if (response.status() < 400) return;
            const item = { at: new Date().toISOString(), account: process.env.NEVORA_CHECK_ACCOUNT, page: new URL(page.url()).pathname, path: new URL(response.url()).pathname, status: response.status() };
            appendFileSync(process.env.NEVORA_CHECK_DIAGNOSTICS, JSON.stringify(item) + '\n');
          });
        });
        if (context.newPage && process.env.NEVORA_CHECK_VERIFY_ROUTE === '1') {
          const newPage = context.newPage.bind(context);
          context.newPage = async (...args) => {
            const page = await newPage(...args);
            const goto = page.goto.bind(page);
            page.goto = async (url, options) => {
              const response = await goto(url, options);
              const expected = new URL(url).pathname, actual = new URL(page.url()).pathname;
              if (expected !== actual) throw Error('Unexpected redirect: ' + expected + ' -> ' + actual);
              return response;
            };
            return page;
          };
        }
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
