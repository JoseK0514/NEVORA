// DEC2 / G68 (Jose, Nov 23, 2026): on phones Team's four filters are two rows of two equal pills while the card is at least
// 21rem wide (so "Off today" isn't alone on a row at 390px); the width is in rem, so at 320px and with 200% text the pills
// keep wrapping to their labels.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {expect, it} from '@rstest/core';

const css = readFileSync(join(__dirname, 'owner-b-home.css'), 'utf8');

it('DEC2: Team filters are a two-column grid only for four filters, inside a rem-sized container query', () => {
  expect(css).toMatch(/\.c-page\.c-team \.b-card:has\(> \.b-filters\) \{ container: g68 \/ inline-size; \}/);
  const block = css.slice(css.indexOf('@container g68 (min-width: 21rem)'));
  expect(block.startsWith('@container g68 (min-width: 21rem)')).toBe(true);
  const rule = block.slice(0, block.indexOf('}') + 1);
  expect(rule).toContain('.b-filters:has(> :nth-child(4))');
  expect(rule).toContain('grid-template-columns: repeat(2, minmax(0, 1fr))');
});
