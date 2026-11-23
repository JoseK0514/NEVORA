// Final fixes K (Nov 23, 2026): on H1 at 390 with 200% text the period dates cut "Mon, Nov 23" and ran into each other.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from '@rstest/core';

const sheet = readFileSync(join(__dirname, 'advisor.css'), 'utf8');

describe('Rondo date fields at large text', () => {
  it('keep two to a row only while each is at least 8.5rem wide, never more than two, on phones from 360px', () => {
    expect(sheet).toContain('@media (min-width: 360px) and (max-width: 767px) { :is(#c-root, html) .oa .oa-fields { grid-template-columns: repeat(auto-fit, minmax(max(8.5rem, calc((100% - var(--b-space-12)) / 2)), 1fr)); } }');
    // under 360px one field to a row, as before; from 768px three to a row, as before
    expect(sheet).toContain('@media (max-width: 359px) { :is(#c-root, html) .oa .oa-fields { grid-template-columns: minmax(0, 1fr); } }');
    expect(sheet).toMatch(/\.oa \.oa-fields \{ grid-template-columns: repeat\(3, minmax\(0, 1fr\)\); \}/);
  });
});

describe('Rondo task date pair', () => {
  it('its 148px minimum is in rem (9.25rem), so the pair stacks at large text', () => {
    expect(sheet).toContain('.oa .oa-pair { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 9.25rem), 1fr));');
  });
});
