import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from 'vitest';
import {Range, shiftEndedWhileOpen} from './parts';
import {keepWhole} from '@/lib/keep-whole';
import {compactRange} from '../owner-b/b-kit';

/* Phase 8 (Nov 17, 2026; final review C, rows 10, 14 and 24). Fictional data only. */
describe('Range: one rule for a time range on the Employee screens', () => {
  it('keeps each half whole and puts the break before the dash, whatever form the range arrives in', () => {
    for (const text of ['9:00 AM – 5:00 PM', keepWhole('9:00 AM – 5:00 PM'), compactRange('9:00 AM – 5:00 PM')]) {
      const html = renderToStaticMarkup(<Range text={text}/>);
      expect(html).toMatch(/^<span class="eb-nb">9(:00)?[ \u00a0]AM<\/span> <span class="eb-nb">–\u00a05(:00)?[ \u00a0]PM<\/span>$/);
    }
    // An open entry ("9:02 AM – now") breaks the same way, so "now" never sits alone after a hanging dash.
    expect(renderToStaticMarkup(<Range text={keepWhole('9:02 AM – now')}/>)).toBe('<span class="eb-nb">9:02 AM</span> <span class="eb-nb">– now</span>');
  });
  it('draws anything that is not a range as it is', () => {
    expect(renderToStaticMarkup(<Range text="12–8 PM"/>)).toBe('12–8 PM');
    expect(renderToStaticMarkup(<Range text="In progress"/>)).toBe('In progress');
  });
});

describe('shiftEndedWhileOpen: Home’s and Time’s one rule for an open punch after the shift', () => {
  const zone = 'America/Puerto_Rico', today = '2026-11-17';
  const shifts = [{date: today, startTime: '09:00', endTime: '17:00'}];
  it('finds today’s ended shift while the person is still clocked in since before its end', () => {
    expect(shiftEndedWhileOpen({shifts, today, zone, observedAt: '2026-11-18T02:20:00Z', clockInAt: '2026-11-17T13:02:00Z'})).toEqual({date: today, startTime: '09:00', endTime: '17:00'});
  });
  it('says nothing before the end, for a clock-in after it, from another day, or when a later shift today has not started', () => {
    expect(shiftEndedWhileOpen({shifts, today, zone, observedAt: '2026-11-17T20:00:00Z', clockInAt: '2026-11-17T13:02:00Z'})).toBeNull();
    expect(shiftEndedWhileOpen({shifts, today, zone, observedAt: '2026-11-18T02:20:00Z', clockInAt: '2026-11-17T21:30:00Z'})).toBeNull();
    expect(shiftEndedWhileOpen({shifts, today, zone, observedAt: '2026-11-18T02:20:00Z', clockInAt: '2026-11-16T13:02:00Z'})).toBeNull();
    expect(shiftEndedWhileOpen({shifts: [...shifts, {date: today, startTime: '23:00', endTime: '23:30'}], today, zone, observedAt: '2026-11-18T02:20:00Z', clockInAt: '2026-11-17T13:02:00Z'})).toBeNull();
  });
});
