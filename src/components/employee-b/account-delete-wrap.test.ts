// Prodcheck (Nov 23, 2026): Delete my account at 390 with 200% text. The confirm card is a .b-keep (the kit's nowrap), so
// "Enter your password to confirm" stayed on one line and ran past the card and the screen for Employees and Leads; the
// end sweep's fix only covered Owners and Managers (`.em-delete--team`). The production capture is the evidence; this
// guard keeps the shared rule that wraps the label for every role.
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import {describe, expect, it} from '@rstest/core';

const css = readFileSync(join(__dirname, 'account.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const rule = (selector: string) => {
  const start = css.indexOf(selector + ' {');
  return start < 0 ? '' : css.slice(start, css.indexOf('}', start) + 1);
};

describe('Delete my account: the password label wraps at large text for every role', () => {
  it('the label wraps inside the card, not only in the Owner and Manager version', () => {
    const label = rule('html body .app-shell[data-nv-b] .eb-delete-keep .c-field__label');
    expect(label).not.toContain('em-delete--team');
    const wrap = css.split('html body .app-shell[data-nv-b] .eb-delete-keep .c-field__label {').slice(1).join('');
    expect(wrap).toMatch(/white-space: normal !important/);
    expect(wrap).toMatch(/max-width: 100% !important/);
  });
  it('the field can shrink to the card width', () => {
    expect(rule('html body .app-shell[data-nv-b] .eb-delete-keep .c-field')).toMatch(/min-width: 0 !important; max-width: 100% !important/);
  });
});
