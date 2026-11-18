// Shift matching (the Owner's Clocker settings): the early clock-in grace field, its words in both languages, and the
// whole-minute rule the form applies before the server checks it again.
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it, rs} from '@rstest/core';
import {ClockerGraceSettings, graceDraftValid} from './clocker-schedule-grace';
import {englishIn} from './clocker-owner-copy.testkit';

const render = (minutes = 0, lang: 'en' | 'es' = 'en') => renderToStaticMarkup(createElement(ClockerGraceSettings,
  {initial: {earlyClockInGraceMinutes: minutes, version: minutes ? 1 : 0}, saveAction: rs.fn(), readAction: rs.fn(), lang}));

describe('Shift matching', () => {
  it('labels the field and says what it does, that paid time is unchanged and that 0 is strict', () => {
    const html = render();
    expect(html).toContain('<label class="c-field__label" for="clocker-grace-minutes">Early clock-in grace</label>');
    expect(html).toContain('Punches up to this many minutes before a shift start count toward that shift. Paid time still starts at the actual punch. 0 keeps strict matching.');
    expect(html).toContain('Clock-ins already recorded keep how they were matched.');
  });
  it('is a whole-minute field from 0 to 30 tied to its help, with the default 0 and one Save', () => {
    const html = render();
    expect(html).toMatch(/<input[^>]*id="clocker-grace-minutes"[^>]*type="number"[^>]*min="0"[^>]*max="30"[^>]*step="1"/);
    const input = html.match(/<input[^>]*id="clocker-grace-minutes"[^>]*>/)?.[0] ?? '';
    for (const attribute of ['inputMode="numeric"', 'value="0"', 'aria-describedby="clocker-grace-help"', 'name="earlyClockInGraceMinutes"']) expect(input).toContain(attribute);
    expect(html.match(/<button type="submit"/g)).toHaveLength(1);
    expect(html).not.toContain('aria-invalid');
  });
  it('shows the saved value', () => {
    expect(render(10)).toMatch(/<input[^>]*value="10"/);
  });
  it('Spanish leaks no English sentence', () => {
    const html = render(10, 'es');
    expect(englishIn(html)).toEqual([]);
    expect(html).toContain('Margen de entrada anticipada');
    expect(html).toContain('0 mantiene la asociación estricta.');
  });
  it.each(['0', '1', '10', '29', '30'])('accepts %s minutes', draft => expect(graceDraftValid(draft)).toBe(true));
  it.each(['', '-1', '31', '100', '1.5', '1e1', '010', '+5', ' 5', 'ten'])('refuses %j before saving', draft => expect(graceDraftValid(draft)).toBe(false));
});
