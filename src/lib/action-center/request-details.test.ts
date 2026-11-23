import {describe, expect, it} from '@rstest/core';
import {requestShift, validateRequestFacts, type ActionRequestFacts} from './request-facts';
import {calloutCoverText, coverOutcome, coverOutcomeText, lateText, otherShiftLine, shiftText, swapShifts} from './request-details';
import {reviewCopy} from '@/components/review-details/copy';

/* Phase 4 (U09): request details from the contract's facts (2026-11-16 backend phase 3, section 4). */
const en = reviewCopy('en'), es = reviewCopy('es');
const base: ActionRequestFacts = {exchangeKind: 'SWAP', startDate: '2030-10-07', endDate: '2030-10-07', lengthText: '8 h', locationName: 'Office', reviewHref: '/app/exchange?tab=pending&requestId=r1'};
const office = requestShift('2030-10-07', '08:00', '16:00', 'Office', 'America/Puerto_Rico');

describe('a swap shows both shifts, or says the second one is not available', () => {
  it('known: each shift with its date, time and place', () => {
    const facts: ActionRequestFacts = {...base, shift: office, counterpartName: 'Marco Silva', counterpartShift: {state: 'ready', ...requestShift('2030-10-09', '12:00', '20:00', 'Condado', 'America/Puerto_Rico')}};
    expect(() => validateRequestFacts(facts)).not.toThrow();
    const shifts = swapShifts(facts, en, '2030');
    expect(shifts.offered).toBe('Mon, Oct 7 · 8:00 AM – 4:00 PM · Office');
    expect(otherShiftLine(shifts, 'Marco', en)).toBe('Marco’s shift: Wed, Oct 9 · 12:00 PM – 8:00 PM · Condado');
    // No name disclosed with the shift: it is "the other shift", never a guessed name.
    expect(otherShiftLine(shifts, undefined, en)).toBe('The other shift: Wed, Oct 9 · 12:00 PM – 8:00 PM · Condado');
  });
  it('sanitized omission: details unavailable is said as such, with no date, time or place', () => {
    const facts: ActionRequestFacts = {...base, shift: office, counterpartName: 'Marco Silva', counterpartShift: {state: 'unavailable', reason: 'details_unavailable'}};
    expect(() => validateRequestFacts(facts)).not.toThrow();
    const line = otherShiftLine(swapShifts(facts, en), 'Marco', en);
    expect(line).toBe('The other shift’s details are not available');
    expect(line).not.toMatch(/\d|Condado|Marco/);
  });
  it('partial: a missing second shift is not "no second shift", and a missing first shift is null, not invented', () => {
    const shifts = swapShifts({...base, counterpartName: 'Marco Silva'}, en);
    expect(shifts).toEqual({offered: null, other: {state: 'missing'}});
    expect(otherShiftLine(shifts, 'Marco', en)).toBe('The other shift is not shown here. Open the request to see it.');
  });
  it('overnight: the contract’s example names the day it ends', () => {
    const night = requestShift('2030-10-07', '22:00', '06:00', 'Office', 'America/Puerto_Rico');
    expect(night.endDate).toBe('2030-10-08');
    expect(shiftText(night, en, '2030')).toBe('Mon, Oct 7 · 10:00 PM – 6:00 AM, ends Tue, Oct 8 · Office');
  });
  it('a midnight end belongs to the same shift day (24:00 occupies no minutes after midnight)', () => {
    const late = requestShift('2030-10-07', '16:00', '24:00', 'Office', 'America/Puerto_Rico');
    expect(late.endDate).toBe('2030-10-08');
    expect(shiftText(late, en, '2030')).toBe('Mon, Oct 7 · 4:00 PM – 12:00 AM · Office');
  });
  it('daylight saving: the schedule’s nominal clocks are shown as written, in the shift’s own place', () => {
    // Spring forward in New York (2030-03-10): 2:30 AM does not exist on the wall clock, and the nominal times are kept.
    const spring = requestShift('2030-03-10', '01:30', '03:30', 'Midtown', 'America/New_York');
    expect(shiftText(spring, en, '2030')).toBe('Sun, Mar 10 · 1:30 AM – 3:30 AM · Midtown');
    // Fall back (2030-11-03), overnight across the repeated hour.
    const fall = requestShift('2030-11-02', '23:00', '02:00', 'Midtown', 'America/New_York');
    expect(shiftText(fall, en, '2030')).toBe('Sat, Nov 2 · 11:00 PM – 2:00 AM, ends Sun, Nov 3 · Midtown');
  });
  it('writes the year only when it is not the workplace’s current year', () => {
    expect(shiftText(office, en, '2029')).toBe('Mon, Oct 7, 2030 · 8:00 AM – 4:00 PM · Office');
  });
});

describe('a cover request’s result', () => {
  it('has one distinct phrase per state, and "not known" is not "nobody"', () => {
    const outcomes = (['OPEN', 'EMPLOYEE_PENDING', 'MANAGER_PENDING', 'APPROVED', 'DENIED', 'CANCELLED', 'EXPIRED', undefined] as const).map(status => coverOutcomeText({status, counterpartName: status === 'MANAGER_PENDING' || status === 'APPROVED' ? 'Marco Silva' : undefined}, en));
    expect(outcomes).toEqual(['Nobody has picked it up yet', 'Waiting for an answer', 'Picked up by Marco Silva', 'Approved · Picked up by Marco Silva', 'Declined', 'Withdrawn', 'Expired', 'Result not known']);
    expect(new Set(outcomes).size).toBe(outcomes.length);
    expect(coverOutcome({})).toBe('unknown');
    expect(coverOutcome({status: 'OPEN'})).toBe('nobody_yet');
  });
  it('never invents who picked it up', () => {
    expect(coverOutcomeText({status: 'MANAGER_PENDING'}, en)).toBe('Picked up. The person is not shown here.');
    expect(coverOutcomeText({status: 'EMPLOYEE_PENDING', counterpartName: 'Ana Ruiz'}, en)).toBe('Waiting for Ana Ruiz to answer');
  });
});

describe('a can’t-work request’s cover is history, not today’s staffing', () => {
  const state = (value: 'not_requested' | 'pending' | 'completed' | 'closed' | 'unavailable') => ({state: value, basis: 'linked_request_history_v1' as const});
  it('has one phrase per recorded state and names nobody', () => {
    const texts = (['not_requested', 'pending', 'completed', 'closed', 'unavailable'] as const).map(value => calloutCoverText(state(value), en));
    expect(texts).toEqual(['No cover request was made', 'Cover was asked for. Nobody is confirmed yet.', 'Someone took the shift', 'The cover request closed with nobody taking it', 'Not known']);
    expect(new Set(texts).size).toBe(5);
  });
  it('a missing history is "Not known", never "No cover request was made"', () => {
    expect(calloutCoverText(undefined, en)).toBe('Not known');
    expect(calloutCoverText({state: 'completed', basis: 'other' as 'linked_request_history_v1'}, en)).toBe('Not known');
  });
});

describe('lateness uses the server’s minutes or none', () => {
  it('says the minutes when present, and the words alone when null or absent', () => {
    expect(lateText({late: true, lateMinutes: 12}, 'Clocked in late', en)).toBe('Clocked in late · 12 min');
    expect(lateText({late: true, lateMinutes: 75}, 'Clocked in late', en)).toBe('Clocked in late · 1 h 15 min');
    expect(lateText({late: true, lateMinutes: null}, 'Clocked in late', en)).toBe('Clocked in late');
    expect(lateText({late: true}, 'Clocked in late', en)).toBe('Clocked in late');
    // On time or early (0), or not late: no minutes are shown.
    expect(lateText({late: false, lateMinutes: 0}, 'Clocked in late', en)).toBe('Clocked in late');
  });
});

describe('Spanish', () => {
  it('renders every request-detail state without an English phrase', () => {
    const facts: ActionRequestFacts = {...base, shift: office, counterpartShift: {state: 'ready', ...requestShift('2030-10-07', '22:00', '06:00', 'Condado', 'America/Puerto_Rico')}};
    const lines = [
      otherShiftLine(swapShifts(facts, es, '2030'), 'Marco', es), otherShiftLine(swapShifts({...base}, es), undefined, es),
      otherShiftLine(swapShifts({...base, counterpartShift: {state: 'unavailable', reason: 'details_unavailable'}}, es), undefined, es),
      ...(['OPEN', 'EMPLOYEE_PENDING', 'MANAGER_PENDING', 'APPROVED', 'DENIED', 'CANCELLED', 'EXPIRED', undefined] as const).map(status => coverOutcomeText({status}, es)),
      ...(['not_requested', 'pending', 'completed', 'closed', 'unavailable'] as const).map(value => calloutCoverText({state: value, basis: 'linked_request_history_v1'}, es)),
      lateText({late: true, lateMinutes: 12}, 'Entrada tardía', es),
    ];
    for (const line of lines) expect(line).not.toMatch(/\b(shift|Picked|Nobody|Waiting|Approved|Declined|Withdrawn|Expired|known|cover|ends|late)\b/i);
    expect(lines[0]).toBe('Turno de Marco: Mon, Oct 7 · 10:00 PM – 6:00 AM, termina el Tue, Oct 8 · Condado');
  });
});
