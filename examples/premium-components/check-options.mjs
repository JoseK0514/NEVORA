import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {resolve, join} from 'node:path';
import {pathToFileURL} from 'node:url';
const require = createRequire(import.meta.url);
const runtime = createRequire(
  process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE ||
    new URL('../../tools/ci-browser-runtime/package.json', import.meta.url),
);
const {chromium, webkit} = runtime('playwright');
const url = pathToFileURL(resolve(process.argv[2])).href;
const engine = process.argv[3] === 'webkit' ? webkit : chromium;
const width = Number(process.argv[4] || 1440);
const capture = process.env.NEVORA_OPTIONS_CAPTURES;
const issues = [];
const browser = await engine.launch();
try {
  const page = await browser.newPage({
    viewport: {width, height: 960},
    reducedMotion: 'reduce',
    acceptDownloads: true,
  });
  page.setDefaultTimeout(5000);
  page.on('pageerror', e => issues.push(e.message));
  page.on('request', r => {
    if (/^https?:/.test(r.url())) issues.push('Unexpected network request ' + r.url());
  });
  await page.goto(url + '#compare/button');
  await page.getByRole('heading', {name: 'Compare component styles'}).waitFor();
  const family = page.getByLabel('Family', {exact: true}),
    component = page.getByLabel('Component', {exact: true});
  const groups = await family.locator('option').evaluateAll(items => items.map(el => el.value));
  assert.equal(groups.length, 12);
  let count = 0,
    direct = 0,
    composed = 0,
    artwork = 0;
  for (const group of groups) {
    await family.selectOption(group);
    const items = await component.locator('option').evaluateAll(items => items.map(el => el.value));
    for (const item of items) {
      await component.selectOption(item);
      const examples = page.locator('.nv-demo[data-sample="' + item + '"]');
      await examples.first().waitFor();
      assert.equal(await examples.count(), 4);
      const provenance = await page.locator('.nv-option-name>span').first().textContent();
      if (provenance === 'Radix Themes') direct++;
      else if (provenance === 'Built with Radix') composed++;
      else if (provenance === 'Phosphor') artwork++;
      else assert.fail('Missing source for ' + item);
      assert.match(await page.locator('.nv-source a').first().getAttribute('href'), /^https:\/\//);
      if (provenance !== 'Phosphor')
        assert.equal(await examples.first().locator('.radix-themes').count(), 1);

      const cards = page.locator('article.nv-option-card');
      assert.equal(new Set(await cards.locator(':scope > header h3').allTextContents()).size, 4);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth);
      if (overflow) issues.push(group + '/' + item + ' overflow at ' + width);
      if (width === 1440) {
        const hashes = [];
        for (let i = 0; i < 4; i++) {
          const screenshot = await examples.nth(i).screenshot({animations: 'disabled'});
          hashes.push(createHash('sha256').update(screenshot).digest('hex'));
        }
        if (new Set(hashes).size < 4)
          issues.push(
            item + ' repeated specimen image ' + hashes.map(x => x.slice(0, 6)).join('/'),
          );
        if (!(await page.evaluate(() => !!window.axe)))
          await page.addScriptTag({path: require.resolve('axe-core/axe.min.js')});
        const findings = await page.evaluate(async () =>
          (
            await window.axe.run(document, {
              runOnly: {type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']},
            })
          ).violations.map(v => [v.id, v.nodes.map(n => [n.target, n.failureSummary])]),
        );
        if (findings.length) {
          const issue = item + ' ' + JSON.stringify(findings);
          console.error(issue);
          issues.push(issue);
        }
      }
      if (
        capture &&
        ['button', 'switch', 'glass', 'punch', 'notice', 'photo', 'navigation', 'receipt'].includes(
          item,
        )
      ) {
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({path: join(capture, item + '-' + width + '.png')});
      }
      count++;
    }
  }
  assert.equal(count, 43);
  assert.deepEqual([direct, composed, artwork], [22, 20, 1]);
  async function show(id) {
    await page.goto(url + '#compare/' + id);
    await page
      .locator('.nv-demo[data-sample="' + id + '"]')
      .first()
      .waitFor();
  }
  await show('switch');
  const upstreamSwitch = page.locator('.nv-radix').getByRole('switch');
  await upstreamSwitch.click();
  assert.equal(await upstreamSwitch.getAttribute('aria-checked'), 'false');
  await show('pin');
  const pad = page.locator('.nv-radix');
  for (const digit of ['1', '3', '5', '7'])
    await pad.getByRole('button', {name: digit, exact: true}).click();
  await pad.getByRole('button', {name: 'Continue'}).click();
  await pad.getByText('Sample PIN entered').waitFor();
  await show('unconfirmed');
  const receipt = page.locator('.nv-radix');
  await receipt.getByRole('button', {name: 'Check status'}).click();
  await receipt.getByText('Clock-in recorded').waitFor();
  await show('button');
  const choose = label =>
    page.getByRole('button', {name: new RegExp('^Pick(?:ed)? ' + label + '$')});
  await choose('Split icon').click();
  await choose('Inset capsule').click();
  assert.equal(await choose('Inset capsule').getAttribute('aria-pressed'), 'true');
  assert.equal(await choose('Split icon').getAttribute('aria-pressed'), 'false');
  await show('switch');
  await choose('Slim track').click();
  const toggle = page.getByRole('switch').nth(1);
  await toggle.click();
  assert.equal(await toggle.getAttribute('aria-checked'), 'false');
  await show('glass');
  await choose('Teal glass').click();
  await show('switch');
  await page.reload();
  await page.getByRole('heading', {name: 'Compare component styles'}).waitFor();
  assert.equal(await choose('Slim track').getAttribute('aria-pressed'), 'true');
  await page.getByRole('button', {name: /Your picks/}).click();
  const selected = page.getByRole('dialog', {name: 'Your picks'});
  await selected.waitFor();
  assert.equal(await selected.locator('.nv-pick-list>div').count(), 3);
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    selected.getByRole('button', {name: 'Download picks for Claude'}).click(),
  ]);
  const file = await readFile(await download.path(), 'utf8');
  assert.ok(file.includes('Radix Card as shown in radix-patterns.tsx'));
  assert.ok(file.includes('part `button`, treatment `soft`'));
  assert.ok(file.includes('part `switch`, treatment `line`'));
  await selected.getByRole('button', {name: 'Remove Switch', exact: true}).click();
  await selected.getByRole('button', {name: 'Review Action button', exact: true}).click();
  await page.locator('.nv-demo[data-sample=button]').first().waitFor();
  await show('dialog');
  const trigger = page.getByRole('button', {name: 'Open dialog'}).nth(3);
  await trigger.focus();
  await page.keyboard.press('Enter');
  await page.getByRole('dialog', {name: 'Publish schedule?'}).waitFor();
  await page.keyboard.press('Escape');
  assert.ok(await trigger.evaluate(el => el === document.activeElement));
  await show('unconfirmed');
  await page.getByRole('button', {name: 'Check status', exact: true}).nth(2).click();
  await page.getByText('Clock-in recorded', {exact: true}).waitFor();
  await page.goto(url + '#navigation');
  await page.getByRole('link', {name: 'Compare styles', exact: true}).last().click();
  await page.locator('.nv-demo[data-sample=navigation]').first().waitFor();
  console.log(
    engine.name(),
    width,
    count +
      ' components, ' +
      count * 4 +
      ' options, picks, download, modal, recovery and deep link checked',
  );
  if (issues.length) {
    console.error(issues.join('\n'));
    process.exitCode = 1;
  }
} finally {
  await browser.close();
}
