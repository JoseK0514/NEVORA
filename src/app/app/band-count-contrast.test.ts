// G87 (Nov 23, 2026): a segment's count ("Requests 10" on Things to do; Shift requests, Team, Timecards and Requests use
// the same rule) is white on the band's teal. At 62% opacity it measured 2.9:1 at 1440 (axe color-contrast), so every
// rule that styles a segment count must leave it readable: at least 4.5:1 against the lightest band teal axe measured.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {expect, it} from '@rstest/core';

const read = (file: string) => readFileSync(join(__dirname, file), 'utf8');
const sheets = ['b-foundation.css', 'owner-b-desktop.css', 'owner-b-pages.css', 'owner-b-shell.css'];
const BAND = [0x1f, 0x7d, 0x78]; // the band behind the last tab at 1440, as axe measured it
const WHITE = [255, 255, 255];

const luminance = (rgb: number[]) => {
  const [r, g, b] = rgb.map(v => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a: number[], b: number[]) => { const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const blend = (alpha: number) => WHITE.map((w, i) => Math.round(w * alpha + BAND[i] * (1 - alpha)));

// A segment count's rule: a segment container (.b-seg, .q-seg, .c-seg, .b-filters, the band tab navs) and a count class.
const countRules = sheets.flatMap(file => read(file).split('\n')
  .filter(line => /(\.b-seg|\.q-seg|\.c-seg|\.b-filters|c-pay-tabs|c-tc-seg)/.test(line) && /(\.c-count|\.eb-segn|\.c-pins__count|\.b-count)/.test(line))
  .map(line => ({file, line})));

it('G87: finds the segment count rules', () => {
  expect(countRules.length).toBeGreaterThan(2);
});

it('G87: no segment count is dimmed below 4.5:1 on the band teal', () => {
  for (const {line} of countRules) {
    for (const match of line.matchAll(/(?:^|[;{\s])opacity:\s*([\d.]+)/g)) {
      const alpha = Number(match[1]);
      expect(contrast(blend(alpha), BAND)).toBeGreaterThanOrEqual(4.5);
    }
  }
});

it('G87: white on the band teal itself passes, so a full-strength count does', () => {
  expect(contrast(WHITE, BAND)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(blend(0.62), BAND)).toBeLessThan(4.5); // the old value, for the record
});

it('keeps Spanish PIN and recovery back links readable on the desktop hover fill', () => {
  const rule = /html:lang\(es\) body \.app-shell\[data-nv-b\] \.q-page:is\(\.ck-pin, \.wc-recovery\) > \.q-nav \.q-nav__l:hover\s*\{([^}]+)\}/;
  expect(read('owner-b-desktop.css').match(rule)?.[1]).toContain('color: var(--b-on-band) !important');
  const token = read('../b-tokens.css').match(/--b-on-band:\s*#([0-9a-f]{6});/i);
  expect(token).toBeTruthy();
  const ink = token![1].match(/../g)!.map(channel => parseInt(channel, 16));
  const hoverFill = [37, 128, 123]; // Rendered glass over the teal header at 1024 px.
  expect(contrast(ink, hoverFill)).toBeGreaterThanOrEqual(4.5);
});
