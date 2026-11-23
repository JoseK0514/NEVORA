import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it} from '@rstest/core';
import {Dotted, Range, shiftEndedWhileOpen, shiftUnderway, sinceSpan, wallMinutesSince} from './parts';
import {keepWhole} from '@/lib/keep-whole';
import {compactRange} from '../owner-b/b-kit';

/* Phase 8 (Nov 17, 2026; final review C, rows 10, 14 and 24). Fictional data only. */
describe('Range: one rule for a time range on the Employee screens', () => {
  it('keeps each half whole and puts the break after the dash, whatever form the range arrives in (Nov 23, 2026)', () => {
    for (const text of ['9:00 AM – 5:00 PM', keepWhole('9:00 AM – 5:00 PM'), compactRange('9:00 AM – 5:00 PM')]) {
      const html = renderToStaticMarkup(<Range text={text}/>);
      expect(html).toMatch(/^<span class="eb-nb">9:00[ \u00a0]AM\u00a0–<\/span> <span class="eb-nb">5:00[ \u00a0]PM<\/span>$/);
    }
    // An open entry ("9:02 AM – now") breaks the same way: the dash ends the first line, never starts the second.
    expect(renderToStaticMarkup(<Range text={keepWhole('9:02 AM – now')}/>)).toBe('<span class="eb-nb">9:02\u00a0AM\u00a0–</span> <span class="eb-nb">now</span>');
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

it('Phase 9: a live state says how long it has lasted, from today’s wall times in the workspace zone', () => {
  const zone = 'America/Puerto_Rico', observedAt = '2026-11-17T22:19:00Z'; // 6:19 PM
  const shifts = [{date: '2026-11-17', startTime: '09:00', endTime: '17:00'}, {date: '2026-11-17', startTime: '18:00', endTime: '22:00'}];
  expect(wallMinutesSince({date: '2026-11-17', time: '17:00', zone, observedAt})).toBe(79);
  expect(sinceSpan(79)).toBe('1 h');expect(sinceSpan(19)).toBe('19 min');expect(sinceSpan(-3)).toBe('0 min');expect(sinceSpan(5 * 60 + 40)).toBe('5 h');
  // The 6 PM shift is under way; the 9 AM one has ended; nothing is under way before 9 AM.
  expect(shiftUnderway({shifts, today: '2026-11-17', zone, observedAt})).toEqual(shifts[1]);
  expect(shiftUnderway({shifts, today: '2026-11-17', zone, observedAt: '2026-11-17T12:30:00Z'})).toBeNull();
  expect(shiftUnderway({shifts, today: '2026-11-18', zone, observedAt})).toBeNull();
});

it('Phase 9: Dotted splits a line that was kept whole at its dots, so a time moves to the next line whole', () => {
  const html = renderToStaticMarkup(<Dotted text={keepWhole('Thu, Dec 3 · 9:00 AM – 12:00 PM')}/>);
  expect(html.match(/class="eb-dots__p"/g)).toHaveLength(2);
  expect(html).toContain('<span class="b-sr">, </span>9:00');
});

it.each(['2026-11-17T16:00:00Z','2026-11-17T17:00:00Z','2026-11-17T20:59:00Z'])('does not label a prior shift as forgotten during the next active shift at %s',observedAt=>{
 const shifts=[{date:'2026-11-17',startTime:'09:00',endTime:'12:00'},{date:'2026-11-17',startTime:'12:00',endTime:'17:00'}];
 expect(shiftEndedWhileOpen({shifts,today:'2026-11-17',zone:'America/Puerto_Rico',observedAt,clockInAt:'2026-11-17T13:00:00Z'})).toBeNull();
});
