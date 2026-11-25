// Regression sweep Z (Nov 23, 2026): the Clocker tablets list (J13) keeps every row's button a 44px target, including the
// "+ Add tablet" row that came in with the shared Settings add pattern (it was 36px).
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {expect, it} from '@rstest/core';

it('gives every Clocker tablet row button, the add row included, a 44px minimum height inside the nv-b layer', () => {
  const css = readFileSync(join(__dirname, 'clocker-owner-b.css'), 'utf8');
  const rule = css.match(/[^\n}]*\.b-row\.ck-trow \.ck-trow__main(?::not\(#ck\d\)){6} \{[^}]*\}/);
  expect(rule?.[0]).toContain('min-height:44px !important');
  // Inside the layer whose rules it must outrank (six id hooks, as the row button's own rule has).
  expect(css.lastIndexOf('@layer nv-b', css.indexOf(rule![0]))).toBeGreaterThan(-1);
});

it('gives each "How staff sign in" choice 44px reach left of and above its circle, without moving what is drawn', () => {
  const css = readFileSync(join(__dirname, 'clocker-owner-b.css'), 'utf8');
  const rule = css.match(/[^\n}]*\.ck-signin \.clk-choice(?::not\(#ck\d\)){6} \{[^}]*\}/);
  expect(rule?.[0]).toContain('margin: -4px 0 0 -12px !important');
  expect(rule?.[0]).toContain('padding-left: 12px !important');
  expect(rule?.[0]).toContain('padding-top: calc(var(--b-space-8) + 4px) !important');
  expect(css.lastIndexOf('@layer nv-b', css.indexOf(rule![0]))).toBeGreaterThan(-1);
});
