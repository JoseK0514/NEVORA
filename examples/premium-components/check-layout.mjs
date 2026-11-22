import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
const require = createRequire(import.meta.url);
const runtime = createRequire(
  process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE ||
    new URL('../../tools/ci-browser-runtime/package.json', import.meta.url),
);
const {chromium, webkit} = runtime('playwright');
const url = pathToFileURL(resolve(process.argv[2])).href;
const problems = [];
for (const [engine, width] of [
  [chromium, 1440],
  [webkit, 390],
  [chromium, 320],
  [webkit, 834],
]) {
  const browser = await engine.launch();
  try {
    const page = await browser.newPage({viewport: {width, height: 900}, reducedMotion: 'reduce'});
    page.on('pageerror', error => problems.push(error.message));
    page.on('request', r => {
      if (/^https?:/.test(r.url())) problems.push('Unexpected network request: ' + r.url());
    });
    const pages = {
      overview: 'Component library',
      controls: 'Controls',
      forms: 'Forms and inputs',
      feedback: 'Status and feedback',
      navigation: 'Navigation and menus',
      records: 'People and records',
      clocker: 'Clocker tablet',
    };
    for (const [id, title] of Object.entries(pages)) {
      await page.goto(url + '#' + id);
      await page.getByRole('heading', {level: 1, name: title, exact: true}).waitFor();
      if (id === 'records' && width < 500)
        await page.getByRole('button', {name: 'Español'}).click();
      await page.evaluate(() => document.fonts.ready);
      const dimensions = await page.evaluate(() => [
        document.documentElement.scrollWidth,
        innerWidth,
      ]);
      if (dimensions[0] > dimensions[1])
        problems.push(id + ' ' + width + ' horizontal overflow ' + dimensions.join('/'));
      if (width === 1440 || width === 390) {
        if (!(await page.evaluate(() => !!window.axe)))
          await page.addScriptTag({path: require.resolve('axe-core/axe.min.js')});
        const violations = await page.evaluate(async () =>
          (
            await window.axe.run(document, {
              runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']},
            })
          ).violations.map(v => [v.id, v.nodes.map(n => [n.target, n.failureSummary])]),
        );
        if (violations.length) problems.push(id + ' ' + width + ' ' + JSON.stringify(violations));
      }
    }
    console.log(engine.name(), width, 'seven sections checked');
  } finally {
    await browser.close();
  }
}
assert.deepEqual(problems, []);
