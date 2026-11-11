import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {homedir} from 'node:os';
import {join} from 'node:path';

// Public local routes only: no session, database, provider, or customer fixture.
// The dynamic route catches a document fallback that a plain unknown URL misses.
// Run against an owned `next dev` with Mobile Access off; no server is started here.
const origin = process.argv[2];
assert(origin && /^http:\/\/127\.0\.0\.1:\d+$/.test(origin), 'Pass an owned local Next origin');
const runtime = createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE ?? join(homedir(), '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
const {chromium, webkit} = runtime('playwright');
const choices = [
  {choice: 'dark', device: 'light', expected: 'dark'},
  {choice: 'light', device: 'dark', expected: 'light'},
  {choice: 'system', device: 'dark', expected: 'dark'},
  {choice: 'blocked', device: 'dark', expected: 'light'},
];
for (const [engine, type] of Object.entries({chromium, webkit})) {
  const browser = await type.launch({headless: true});
  try {
    for (const route of ['/access-help/nv174-missing', '/nv174-missing']) {
      for (const {choice, device, expected} of choices) {
        const context = await browser.newContext({colorScheme: device});
        try {
          await context.addInitScript(({choice}) => {
            if (choice === 'blocked') Object.defineProperty(window, 'localStorage', {get() {throw new DOMException('Storage unavailable', 'SecurityError');}});
            else localStorage.setItem('nv-theme', choice);
            window.__nvAppearanceFrames = [];
            function sample() {
              if (document.querySelector('main h1')) {
                const root = document.documentElement;
                window.__nvAppearanceFrames.push({theme: root.dataset.theme, scale: root.style.getPropertyValue('--nv-text-scale'), step: root.dataset.textStep});
              }
              requestAnimationFrame(sample);
            }
            requestAnimationFrame(sample);
          }, {choice});
          const page = await context.newPage();
          const warnings = [], errors = [];
          page.on('console', message => {
            if (message.text().includes('Encountered a script tag while rendering React component')) warnings.push(message.text());
          });
          page.on('pageerror', error => errors.push(String(error)));
          await page.goto(origin + route);
          await page.getByRole('heading', {name: 'Page not found', exact: true}).waitFor();
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          const frames = await page.evaluate(() => window.__nvAppearanceFrames);
          const label = `${engine} ${route} ${choice}`;
          assert(frames.length > 0, `${label}: capture content frames`);
          assert(frames.every(frame => frame.theme === expected && frame.scale === '1' && frame.step === '100'), `${label}: appearance before every initial content frame: ${JSON.stringify(frames.slice(0, 4))}`);
          // A fallback must initialize the live observer on the committed body.
          for (const [fontSize, scale, step] of [['20px', '1.25', '125'], ['24px', '1.5', '150']]) {
            await page.evaluate(fontSize => {document.documentElement.style.fontSize = fontSize;}, fontSize);
            await page.waitForFunction(({scale, step}) => document.documentElement.style.getPropertyValue('--nv-text-scale') === scale && document.documentElement.dataset.textStep === step, {scale, step});
          }
          if (choice === 'system') {
            await page.emulateMedia({colorScheme: 'light'});
            await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
          }
          if (choice !== 'blocked') {
            await page.evaluate(() => {localStorage.setItem('nv-theme', 'dark'); window.dispatchEvent(new StorageEvent('storage', {key: 'nv-theme'}));});
            await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
          }
          // Exercise a real Next Link and its history transition back to missing.
          const timeOrigin = await page.evaluate(() => performance.timeOrigin);
          await page.getByRole('link', {name: 'Go to sign in', exact: true}).click();
          await page.waitForURL(origin + '/login');
          assert.equal(await page.evaluate(() => performance.timeOrigin), timeOrigin, `${label}: Link keeps the document`);
          await page.goBack();
          await page.getByRole('heading', {name: 'Page not found', exact: true}).waitFor();
          if (route.startsWith('/access-help/')) assert.equal(await page.evaluate(() => performance.timeOrigin), timeOrigin, `${label}: matched not-found history keeps the document`);
          // A truly unmatched address uses Next's full-document fallback.
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          assert.equal(await page.locator('body > i[aria-hidden="true"]').count(), 1, `${label}: one text-size observer probe after history`);
          assert.deepEqual(warnings, [], `${label}: no executable scripts recreated by React`);
          assert.deepEqual(errors, [], `${label}: page runtime`);
          console.log(JSON.stringify({engine, route, choice, status: 'passed', firstFrame: frames[0]}));
        } finally { await context.close(); }
      }
    }
  } finally { await browser.close(); }
}
