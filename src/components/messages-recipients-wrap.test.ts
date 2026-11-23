// Prodcheck (Nov 23, 2026): Update detail (B7), Owner, 390 with 200% text, production build. A recipient row's state in
// words ("This changed while you were looking." and its Refresh) stayed on one line and the card cut it off. The capture
// is the evidence; this guard keeps the page rules that let the line wrap inside the card.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from '@rstest/core';

const css = readFileSync(join(__dirname, 'messages-manager-b.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const ruleFor = (selectorTail: string) => {
  const at = css.indexOf(selectorTail + ' {');
  return at < 0 ? '' : css.slice(at, css.indexOf('}', at) + 1);
};

describe('Update detail: a recipient row state wraps at large text', () => {
  it('the state words wrap', () => {
    expect(ruleFor('#update-recipients :is(.b-rem__tx, .b-rem__tx > span)')).toMatch(/white-space: normal !important/);
  });
  it('on phones a row trail with words takes its own line and can shrink (it was flex: none)', () => {
    const phone = css.slice(css.indexOf('@media (max-width: 767px)', css.indexOf('#update-recipients :is(.b-rem__tx')));
    expect(ruleFor('#update-recipients .b-row__trail:has(.b-rem__tx)')).toMatch(/flex: 1 1 100% !important; min-width: 0 !important/);
    expect(phone.indexOf('#update-recipients .b-row__trail:has(.b-rem__tx)')).toBeGreaterThan(0);
    expect(ruleFor('#update-recipients .b-rem:has(.b-rem__tx)')).toMatch(/flex-wrap: wrap !important/);
  });
  it('the reminder slot keeps to the card width', () => {
    const rule = ruleFor('#update-recipients :is(.b-rem-slot, .b-rem)');
    expect(rule).toMatch(/max-width: 100% !important/);
    expect(rule).toMatch(/min-width: 0 !important/);
  });
});
