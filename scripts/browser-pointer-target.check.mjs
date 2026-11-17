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
        {name: '44px visual box clipped around its visible center', height: 44, extra: '#wrap{height:36px;overflow:hidden}#target{top:-4px}', expected: false},
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

// Real rendered focus controls: do not accept a missing, transparent, clipped or
// covered ring merely because a CSS property declares one.
for (const engine of ['chromium', 'webkit']) {
  test(engine + ': native keyboard focus accepts actual outline or inset pseudo edge and rejects invisible paint', async () => {
    const {measureKeyboardFocusIndicator} = await import('./browser-focus-indicator.mjs');
    const browser = await playwright[engine].launch();
    try {
      const page = await browser.newPage();
      const ring = '#target:focus-visible::after{content:"";display:block;position:absolute;inset:0;z-index:2;pointer-events:none;box-shadow:inset 0 0 0 2px rgb(11,110,105)}';
      const cases = [
        {name: 'ordinary opaque2px outline', css: '#target:focus-visible{outline:2px solid rgb(11,110,105)}', expected: true},
        {name: 'current inset pseudo ring', css: ring, expected: true},
        {name: 'transparent outline', css: '#target:focus-visible{outline:2px solid transparent}', expected: false},
        {name: 'transparent pseudo ring', css: ring + '#target:focus-visible::after{box-shadow:inset 0 0 0 2px transparent}', expected: false},
        {name: 'one pixel pseudo ring', css: ring + '#target:focus-visible::after{box-shadow:inset 0 0 0 1px rgb(11,110,105)}', expected: false},
        {name: 'hidden pseudo ring', css: ring + '#target:focus-visible::after{opacity:0}', expected: false},
        {name: 'partial inset geometry', css: ring + '#target:focus-visible::after{top:6px}', expected: false},
        {name: 'covered focus edge', css: ring + '#cover{position:absolute;left:80px;top:80px;width:100px;height:44px;background:white;z-index:3}', cover: true, expected: false},
        {name: 'unfocused declared ring', css: ring, focus: false, expected: false},
        {name: 'one pixel pseudo width', css: ring + '#target:focus-visible::after{width:1px}', expected: false},
        {name: 'one pixel pseudo height', css: ring + '#target:focus-visible::after{height:1px}', expected: false},
        {name: 'fully clipped pseudo paint', css: ring + '#target:focus-visible::after{clip-path:inset(50%)}', expected: false},
        {name: 'translated pseudo paint', css: ring + '#target:focus-visible::after{transform:translateY(80px)}', expected: false},
        {name: 'filtered invisible pseudo paint', css: ring + '#target:focus-visible::after{filter:opacity(0)}', expected: false},
        {name: 'focus ring clipped by parent', css: ring + '#clip{height:36px;overflow:hidden}#target{top:-4px}', clipped: true, expected: false},
      ];
      for (const fixture of cases) {
        await page.setContent(`<style>body{margin:80px}#target{position:relative;display:block;box-sizing:border-box;width:100px;height:44px;outline:none} ${fixture.css}</style>${fixture.clipped ? '<div id="clip">' : ''}<a id="target" href="#time">Time</a>${fixture.clipped ? '</div>' : ''}${fixture.cover ? '<div id="cover"></div>' : ''}`);
        if (fixture.focus !== false) await page.keyboard.press(process.platform === 'darwin' && engine === 'webkit' ? 'Alt+Tab' : 'Tab');
        const actual = await page.locator('#target').evaluate(measureKeyboardFocusIndicator, 2);
        assert.equal(actual.meetsMinimum, fixture.expected, fixture.name + ': ' + JSON.stringify(actual));
      }
    } finally { await browser.close(); }
  });
}
