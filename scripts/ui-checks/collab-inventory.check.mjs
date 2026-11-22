import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { test } from 'node:test';
import { visitInventoryRoute } from './collab-inventory.mjs';

const require = createRequire(new URL('../../tools/ci-browser-runtime/package.json', import.meta.url));
const { chromium } = require('playwright');
const origin = 'https://inventory.example.invalid';

test('captures the rendered page after both the access skeleton and slow-check states clear', async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.route(origin + '/app/schedule', route => route.fulfill({
      contentType: 'text/html',
      body: `<main>
        <div class="c-route-state--checking"><h1>Loading…</h1><div data-checking></div></div>
      </main>
      <script>
        const frame = document.querySelector('.c-route-state--checking');
        setTimeout(() => {
          frame.innerHTML = '<h1>Still checking your access</h1><div class="b-statecard" data-kind="loading">This connection is slow.</div>';
          setTimeout(() => {
            const content = document.createElement('h1');
            content.textContent = 'Schedule';
            frame.replaceWith(content);
          }, 250);
        }, 150);
      </script>`,
    }));
    const result = await visitInventoryRoute(page, origin, '/app/schedule', { id: 'C1', profile: 'M' });
    assert.equal(result.observed, 'rendered');
    assert.deepEqual(result.heading, ['Schedule']);
  } finally {
    await browser.close();
  }
});

test('treats the finished not-found screen as visible with the shared route styling', { timeout: 8000 }, async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    await page.route(origin + '/app/fictional-missing-page', route => route.fulfill({
      status: 404,
      contentType: 'text/html',
      body: `<main><div class="c-notfound c-route-state--checking">
        <h1>Page not found</h1><div class="b-statecard" data-kind="empty">This page doesn’t exist</div>
      </div></main>`,
    }));
    const result = await visitInventoryRoute(page, origin, '/app/fictional-missing-page', { id: 'B11', profile: 'O' });
    assert.equal(result.observed, 'rendered');
    assert.deepEqual(result.heading, ['Page not found']);
  } finally {
    await browser.close();
  }
});
