import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from '@rstest/core';

const sheet = readFileSync(join(process.cwd(), 'src/app/app/b-foundation.css'), 'utf8');

describe('Forced colours: every kit button keeps an edge (Z3)', () => {
  const block = sheet.slice(sheet.indexOf('Z3 (Nov 23, 2026): a filled button'));
  it('draws a ButtonText inset outline on enabled b-btn and c-btn, inside the forced-colors media block', () => {
    const media = sheet.lastIndexOf('@media (forced-colors: active)', sheet.indexOf('Z3 (Nov 23, 2026): a filled button'));
    expect(media).toBeGreaterThan(-1);
    expect(block).toMatch(/:is\(\.b-btn, \.c-btn\):not\(:disabled, \[aria-disabled="true"\]\) \{ outline: 1px solid ButtonText !important; outline-offset: -1px !important; \}/);
  });
  it('uses GrayText for disabled buttons', () => {
    expect(block).toMatch(/:is\(\.b-btn, \.c-btn\):is\(:disabled, \[aria-disabled="true"\]\) \{ outline: 1px solid GrayText !important;/);
  });
});
