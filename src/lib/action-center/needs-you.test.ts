import {describe, expect, it} from 'vitest';
import {needsYou, needsYouDetail, needsYouSentence} from './needs-you';
import type {ActionItem} from './project';
import type {TodayShift} from '../today/project';

const item = (id: string, type: ActionItem['type'], category: ActionItem['category'], priority: ActionItem['priority'] = 'REVIEW', dateTime?: string): ActionItem =>
  ({id, type, category, priority, title: id, detail: '', href: '/app', dateTime} as ActionItem);
const shift = (id: string): TodayShift => ({id, employeeId: id, employeeName: id, locationId: 'l', locationName: 'Main', positionName: null,
  startAt: '2026-10-18T12:00:00Z', endAt: '2026-10-18T20:00:00Z', status: 'no_punches', firstClockInAt: null, late: false});

describe('needs you (F1)', () => {
  const items = [
    item('gap-today', 'COVERAGE_GAP', 'scheduling', 'URGENT', '2026-10-18T08:00:00'),
    item('gap-earlier', 'COVERAGE_GAP', 'scheduling', 'URGENT', '2026-10-14T08:00:00'),
    item('TIME_OFF:a', 'TIME_OFF', 'requests'),
    item('target', 'TARGET_MISSING', 'scheduling', 'MISSING_INPUT'),
    item('deadline', 'DEADLINE_MISSING', 'scheduling', 'MISSING_INPUT'),
  ];

  it('counts shifts with no clock-in, urgent items today and requests only', () => {
    const value = needsYou(items, '2026-10-18', [shift('a'), shift('b'), shift('c')]);
    expect(value.count).toBe(5);
    expect(value.now.map(entry => entry.id)).toEqual(['gap-today']);
    expect(value.requests.map(entry => entry.id)).toEqual(['TIME_OFF:a']);
    expect(value.planning.map(entry => entry.id)).toEqual(['target', 'deadline']);
    expect(value.past.map(entry => entry.id)).toEqual(['gap-earlier']);
  });

  it('counts coverage gaps for today only; later gaps are planning (clean Manager v3)', () => {
    const later = item('gap-later', 'COVERAGE_GAP', 'scheduling', 'URGENT', '2026-10-21T17:00:00');
    const value = needsYou([...items, later], '2026-10-18', [shift('a')]);
    expect(value.now.map(entry => entry.id)).toEqual(['gap-today']);
    expect(value.planning.map(entry => entry.id)).toContain('gap-later');
    expect(value.count).toBe(3);
    // Without a workspace day nothing can be called "later", so nothing moves.
    expect(needsYou([later], undefined).now.map(entry => entry.id)).toEqual(['gap-later']);
  });

  it('never counts planning or earlier work, and drops nothing', () => {
    const value = needsYou(items, '2026-10-18');
    expect(value.count).toBe(2);
    expect(value.now.length + value.requests.length + value.planning.length + value.past.length).toBe(items.length);
  });

  it('says the same number in the band and names each kind in the Inbox', () => {
    const value = needsYou(items, '2026-10-18', [shift('a'), shift('b'), shift('c')]);
    const plain = (text: string) => text.replace(/\u00a0/g, ' ').replace(/\u2011/g, '-');
    expect(plain(needsYouSentence(value.count))).toBe('5 things need you today.');
    expect(plain(needsYouSentence(1))).toBe('1 thing needs you today.');
    expect(needsYouSentence(0)).toBe('Nothing needs you right now.');
    expect(plain(needsYouDetail(value))).toBe('3 shifts with no clock-in, 1 coverage gap and 1 request need you.');
    expect(plain(needsYouDetail(needsYou([item('TIME_OFF:a', 'TIME_OFF', 'requests')], '2026-10-18')))).toBe('1 request needs you.');
    expect(plain(needsYouDetail(needsYou([item('x', 'TIME_CORRECTION', 'timekeeping', 'URGENT'), item('g', 'COVERAGE_GAP', 'scheduling', 'URGENT')], '2026-10-18')))).toBe('2 urgent items need you.');
  });

  it('counts an urgent request as a request in the detail line', () => {
    const value = needsYou([item('CALLOUT:x', 'CALLOUT', 'requests', 'URGENT')], '2026-10-18');
    expect(value.count).toBe(1);
    expect(needsYouDetail(value).replace(/\u00a0/g, ' ')).toBe('1 request needs you.');
  });

  it('never blames people in its wording', () => {
    const value = needsYou(items, '2026-10-18', [shift('a')]);
    expect(needsYouDetail(value) + needsYouSentence(value.count)).not.toMatch(/miss/i);
  });
});
