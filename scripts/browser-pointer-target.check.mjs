import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {test} from 'node:test';
import {measurePointerTarget} from './browser-pointer-target.mjs';

const playwright = createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE ?? resolve('tools/ci-browser-runtime/package.json'))('playwright');
for (const engine of ['chromium', 'webkit']) {
  test(engine + ': actual pointer area accepts expanded targets and rejects absent or clipped hit areas', async () => {
    const browser = await playwright[engine].launch();
    try {
      const page = await browser.newPage();
      const cases = [
        {name: '44px visual box', height: 44, extra: '', expected: true},
        {name: '36px visual with real 44px pseudo target', height: 36, extra: '#target::after{content:"";position:absolute;left:0;right:0;top:50%;height:44px;translate:0 -50%}', expected: true},
        {name: '36px visual without expansion', height: 36, extra: '', expected: false},
        {name: 'declared expansion with disabled pointer events', height: 36, extra: '#target::after{content:"";position:absolute;left:0;right:0;top:50%;height:44px;translate:0 -50%;pointer-events:none}', expected: false},
        {name: 'expansion clipped by parent', height: 36, extra: '#wrap{height:36px;overflow:hidden}#target::after{content:"";position:absolute;left:0;right:0;top:50%;height:44px;translate:0 -50%}', expected: false},
        {name: 'hidden target', height: 44, extra: '#target{visibility:hidden}', expected: false},
      ];
      for (const fixture of cases) {
        await page.setContent(`<style>body{margin:80px}#target{position:relative;display:block;width:120px;height:${fixture.height}px} ${fixture.extra}</style><div id="wrap"><a id="target" href="#next">Target</a></div>`);
        const actual = await page.locator('#target').evaluate(measurePointerTarget, 44);
        assert.equal(actual.meetsMinimum, fixture.expected, fixture.name + ': ' + JSON.stringify(actual));
        if (actual.source === 'verified-hit-area') assert.equal(actual.samples.filter(point => point.owned).length, 9);
      }
    } finally {
      await browser.close();
    }
  });
}
