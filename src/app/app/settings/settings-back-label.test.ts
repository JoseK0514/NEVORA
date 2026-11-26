import { readFileSync } from 'node:fs';
import { expect, it } from '@rstest/core';

it('contains the hidden destination within the compact label at enlarged text sizes', () => {
  const css = readFileSync(new URL('./settings-b.css', import.meta.url), 'utf8');
  const compactRule = css.match(/\.settings-back-label\[data-compact\]\s*\{([^}]+)\}/)?.[1];
  expect(compactRule).toContain('overflow: clip');
});
