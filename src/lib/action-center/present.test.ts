import {reviewFacts} from './review-facts';
import {describe, expect, it} from '@rstest/core';
import {ATTENDANCE_WORDS, correctionLine, groupHeading, presentItem, spacedRanges, splitNoClockIn} from './present';
import type {ActionItem} from './project';

const plain = (text: string) => text.replace(/ /g, ' ').replace(/‑/g, '-');
const item = (over: Partial<ActionItem>): ActionItem => ({id: 'x', type: 'COVERAGE_GAP', category: 'scheduling', priority: 'URGENT', title: 't', detail: 'd', href: '/app', ...over} as ActionItem);

describe('presented action items (Phase 7)', () => {
  it('puts the person first on requests and says what and when', () => {
    const shown = presentItem(item({type: 'TIME_OFF', category: 'requests', priority: 'REVIEW', title: 'Time-off request', detail: 'Alexandra Rivera is waiting for review.', dateTime: '2026-10-17T20:12:00Z'}), 'Review time off');
    expect(shown.title).toBe('Alexandra Rivera');
    expect(plain(shown.detail)).toBe('Time off · sent Oct 17');
    expect(shown.person).toBe('Alexandra Rivera');
  });
  it('never says "missing" and uses one name for hour targets', () => {
    const target = presentItem(item({type: 'TARGET_MISSING', category: 'scheduling', priority: 'MISSING_INPUT', title: 'Weekly hour target missing', detail: 'Taylor Rivera is not included in hours-balance checks.'}), 'Set hour target');
    expect(target.title).toBe('No weekly hour target');
    expect(target.detail).toBe('Taylor Rivera has no weekly hour target yet.');
    expect(target.action).toBe('Set weekly hour target');
    const gap = presentItem(item({title: 'Position coverage missing at Main Office', detail: 'Sun, Oct 18 · 8:00 AM–4:00 PM · Cashier: 2 missing'}), 'View coverage gap');
    expect(gap.title).toBe('Position not covered at Main Office');
    expect(plain(gap.detail)).toBe('Sun, Oct 18 · 8:00 AM – 4:00 PM · Cashier: 2 open');
    expect(`${target.title} ${target.detail} ${gap.title} ${gap.detail}`).not.toMatch(/missing/i);
  });
  it('keeps each time whole and breaks a range only after its dash', () => {
    expect(spacedRanges('12:00 AM–7:00 AM')).toBe('12:00\u00a0AM\u00a0– 7:00\u00a0AM');
    expect(spacedRanges('4:00 PM–midnight')).toBe('4:00\u00a0PM\u00a0– 12:00\u00a0AM');
    expect(spacedRanges('midnight–6:00 AM')).toBe('12:00\u00a0AM\u00a0– 6:00\u00a0AM');
  });
  it('writes period dates the way people read them (TC-P3-19)', () => {
    const card = presentItem(item({type: 'TIMECARD', category: 'timekeeping', priority: 'REVIEW', title: 'Period timecard needs review', detail: 'Casey Rivera · 2026-10-19–2026-10-25 · Resolve recorded-time exceptions before finalizing.'}), 'Open timecard review');
    expect(plain(card.detail)).toBe('Casey Rivera · Oct 19–25 · Fix recorded-time issues before finalizing.');
    expect(card.detail).not.toMatch(/\d{4}-\d{2}/);
  });
  it('titles a time correction with the person and says what they asked for and when (Phase 3, OW-002)', () => {
    const fix = presentItem(item({type: 'TIME_CORRECTION', category: 'timekeeping', priority: 'REVIEW', title: 'Time correction waiting for review', detail: 'James Ortiz · Recorded time correction.', dateTime: '2026-11-10T22:15:00Z'}), 'Review correction', 'America/Puerto_Rico');
    expect(fix.title).toBe('James Ortiz');
    expect(plain(fix.detail)).toBe('Time correction · sent Nov 10');
    const added = presentItem(item({type: 'TIME_CORRECTION', category: 'timekeeping', priority: 'REVIEW', title: 'Time correction waiting for review', detail: 'Sofía Méndez · Recorded entry not sent yet.'}), 'Review correction');
    expect(added.title).toBe('Sofía Méndez');
    expect(added.detail).toBe('Add unrecorded time');
    // Phase 4 (U03): "yours" is the server's typed concernsActor. The English title alone never makes it yours.
    const titled = presentItem(item({type: 'TIME_CORRECTION', category: 'timekeeping', priority: 'REVIEW', title: 'Your correction needs another reviewer', detail: 'Jose Natal · Recorded time correction.', dateTime: '2026-11-10'}), 'Review correction');
    expect(titled.title).toBe('Jose Natal');
    const own = presentItem(item({type: 'TIME_CORRECTION', category: 'timekeeping', priority: 'REVIEW', title: 'Corrección pendiente', detail: 'Jose Natal · Recorded time correction.', dateTime: '2026-11-10', review: reviewFacts(true, true, 'TIME_CORRECTION')}), 'Review correction');
    expect(own.title).toBe('Your time correction');
    expect(plain(own.detail)).toBe('Time correction · sent Nov 10');
    // A correction sent for someone else (a delegated requester) needs another reviewer, but it is still theirs.
    const delegated = presentItem(item({type: 'TIME_CORRECTION', category: 'timekeeping', priority: 'REVIEW', title: 'Your correction needs another reviewer', detail: 'Ana Ruiz · Recorded time correction.', review: reviewFacts(false, true, 'TIME_CORRECTION')}), 'Review correction');
    expect(delegated.title).toBe('Ana Ruiz');
    expect(`${fix.title} ${fix.detail} ${added.title} ${added.detail}`).not.toMatch(/Recorded time correction|not sent yet|\.$/);
  });
  it('keeps Jose’s attendance words apart: a shift in progress is not clocked in, an ended one is missed', () => {
    expect(ATTENDANCE_WORDS).toEqual({notClockedIn: 'Not clocked in', late: 'Clocked in late', missed: 'Missed'});
    const split = splitNoClockIn([{id: 'a', status: 'not_clocked_in'}, {id: 'b', status: 'no_punches'}, {id: 'c', status: 'not_clocked_in'}]);
    expect(split.running.map(shift => shift.id)).toEqual(['a', 'c']);
    expect(split.ended.map(shift => shift.id)).toEqual(['b']);
  });
  it('heads a group with its count and kind', () => {
    expect(plain(groupHeading('COVERAGE_GAP', 12, 'Coverage gap at Main Office'))).toBe('12 coverage gaps at Main Office');
    expect(plain(groupHeading('TARGET_MISSING', 10, 'Weekly hour target missing'))).toBe('10 people with no weekly hour target');
    expect(plain(groupHeading('AVAILABILITY_MISSING', 1, 'x'))).toBe('1 person hasn’t sent availability');
  });
});

// Backend contract (Nov 15, 2026): a correction item carries workDate, the workplace zone and both intervals.
describe('a time correction says what changes, in the workplace clock', () => {
  const zone = 'America/Puerto_Rico'; // UTC−4, no daylight saving
  const fix = (correction: Partial<NonNullable<ActionItem['correction']>>): ActionItem => ({id: 'TIME_CORRECTION:c1', type: 'TIME_CORRECTION', category: 'timekeeping', priority: 'REVIEW',
    title: 'Time correction waiting for review', detail: 'James Ortiz · Recorded time correction.', dateTime: '2026-11-12T15:00:00Z', href: '/app?view=attendance#correction-c1',
    correction: {workDate: '2026-11-11', timeZone: zone, recordedStartAt: '2026-11-11T13:00:00Z', recordedEndAt: '2026-11-11T21:00:00Z', requestedStartAt: '2026-11-11T12:30:00Z', requestedEndAt: '2026-11-11T21:00:00Z', ...correction}} as ActionItem);
  const plain = (text: string) => text.replace(/[  ]/g, ' ');
  it('gives the requested time, what was recorded and the difference in length', () => {
    const shown = presentItem(fix({}), 'Review', zone);
    expect(shown.title).toBe('James Ortiz');
    expect(plain(shown.detail)).toBe('Wed, Nov 11 · 8:30 AM – 5:00 PM, was 9:00 AM – 5:00 PM · +30 min');
    expect(plain(correctionLine(fix({requestedStartAt: '2026-11-11T13:15:00Z', requestedEndAt: '2026-11-11T20:00:00Z'}).correction!)!)).toBe('Wed, Nov 11 · 9:15 AM – 4:00 PM, was 9:00 AM – 5:00 PM · −1 h 15 min');
    expect(plain(correctionLine(fix({requestedStartAt: '2026-11-11T14:00:00Z', requestedEndAt: '2026-11-11T22:00:00Z'}).correction!)!)).toMatch(/· same length$/);
  });
  it('never invents a zero-minute recorded entry or a difference it cannot know', () => {
    expect(plain(correctionLine(fix({recordedStartAt: null, recordedEndAt: null}).correction!)!)).toBe('Wed, Nov 11 · Add 8:30 AM – 5:00 PM');
    const open = plain(correctionLine(fix({recordedEndAt: null}).correction!)!);
    expect(open).toBe('Wed, Nov 11 · 8:30 AM – 5:00 PM, was 9:00 AM with no clock-out');
    expect(open).not.toMatch(/min|same length/);
  });
  it('reads times in the workplace zone, not the device or UTC', () => {
    expect(plain(correctionLine(fix({timeZone: 'America/Los_Angeles'}).correction!)!)).toBe('Wed, Nov 11 · 4:30 AM – 1:00 PM, was 5:00 AM – 1:00 PM · +30 min');
  });
  it('keeps the earlier line when the facts are absent or unreadable', () => {
    const none = {...fix({}), correction: undefined} as ActionItem;
    expect(plain(presentItem(none, 'Review', zone).detail)).toBe('Time correction · sent Nov 12');
    expect(correctionLine(fix({requestedEndAt: '2026-11-11T12:00:00Z'}).correction!)).toBeNull();
    expect(correctionLine(fix({timeZone: 'Not/AZone'}).correction!)).toBeNull();
    expect(plain(presentItem(fix({timeZone: 'Not/AZone'}), 'Review', zone).detail)).toBe('Time correction · sent Nov 12');
  });
});

it('a shift request names a swap or a cover when the read says which (backend, Nov 15, 2026)', () => {
  const request = (exchangeKind?: 'SWAP' | 'COVERAGE') => ({id: 'EXCHANGE:x1', type: 'EXCHANGE', category: 'requests', priority: 'REVIEW', title: 'Shift request', detail: 'Ana Colon is waiting for review.',
    dateTime: '2026-11-12T15:00:00Z', href: '/app/exchange?tab=requests&requestId=x1', request: {...(exchangeKind ? {exchangeKind} : {}), startDate: '2026-11-18', endDate: '2026-11-18', lengthText: '8 h', locationName: 'Condado', reviewHref: '/app/exchange?tab=requests&requestId=x1'}} as ActionItem);
  expect(presentItem(request('SWAP'), 'Review', 'UTC').detail.replace(/ /g, ' ')).toBe('Shift swap · sent Nov 12');
  expect(presentItem(request('COVERAGE'), 'Review', 'UTC').detail.replace(/ /g, ' ')).toBe('Cover request · sent Nov 12');
  expect(presentItem(request(), 'Review', 'UTC').detail.replace(/ /g, ' ')).toBe('Shift request · sent Nov 12');
});

it('keeps each time in a correction line whole with a narrow no-break space', () => {
  const line = correctionLine({workDate: '2026-11-02', timeZone: 'America/Puerto_Rico', recordedStartAt: '2026-11-02T14:55:00Z', recordedEndAt: '2026-11-02T22:01:00Z', requestedStartAt: '2026-11-02T14:55:00Z', requestedEndAt: '2026-11-02T21:21:00Z'})!;
  expect(line).toContain('10:55 AM – 5:21 PM, was 10:55 AM – 6:01 PM');
});

it('a recorded end that is not after its start is not described; the line gives the requested time alone', () => {
  const line = correctionLine({workDate: '2026-11-11', timeZone: 'UTC', recordedStartAt: '2026-11-11T17:00:00Z', recordedEndAt: '2026-11-11T09:00:00Z', requestedStartAt: '2026-11-11T09:00:00Z', requestedEndAt: '2026-11-11T17:00:00Z'})!;
  expect(line.replace(/[\u00a0\u202f]/g, ' ')).toBe('Wed, Nov 11 · 9:00 AM – 5:00 PM');
  expect(correctionLine({workDate: '2026-11-11', timeZone: 'UTC', recordedStartAt: null, recordedEndAt: '2026-11-11T17:00:00Z', requestedStartAt: '2026-11-11T09:00:00Z', requestedEndAt: '2026-11-11T17:00:00Z'})!.replace(/[\u00a0\u202f]/g, ' ')).toBe('Wed, Nov 11 · 9:00 AM – 5:00 PM');
});

it('writes its own words in Spanish when asked, and English as before (signed-in Spanish)', () => {
  const item = {id: 'TIME_OFF:r9', type: 'TIME_OFF', category: 'requests', priority: 'REVIEW', title: 'Time off', detail: 'Ana Ruiz is waiting for review.', href: '/app/requests', dateTime: '2026-11-12'} as Parameters<typeof presentItem>[0];
  expect(presentItem(item, 'Review', 'UTC').detail).toBe('Time off · sent Nov 12');
  expect(presentItem(item, 'Revisar', 'UTC', 'es').detail).toBe('Días libres · enviada el 12 nov');
  const target = {...item, id: 'TARGET_MISSING:e1', type: 'TARGET_MISSING', category: 'scheduling', title: 'Target missing', detail: 'Ana Ruiz has no weekly hour target'} as Parameters<typeof presentItem>[0];
  expect(presentItem(target, 'Fijar meta de horas', 'UTC', 'es')).toMatchObject({title: 'Sin meta de horas semanal', detail: 'Ana Ruiz todavía no tiene meta de horas semanal.', action: 'Fijar meta de horas semanal'});
});
