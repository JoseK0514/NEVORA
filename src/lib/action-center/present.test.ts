import {describe, expect, it} from 'vitest';
import {groupHeading, presentItem, spacedRanges} from './present';
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
    expect(spacedRanges('12:00 AM–7:00 AM')).toBe('midnight\u00a0– 7:00\u00a0AM');
    expect(spacedRanges('4:00 PM–midnight')).toBe('4:00 PM – midnight');
  });
  it('writes period dates the way people read them (TC-P3-19)', () => {
    const card = presentItem(item({type: 'TIMECARD', category: 'timekeeping', priority: 'REVIEW', title: 'Period timecard needs review', detail: 'Casey Rivera · 2026-10-19–2026-10-25 · Resolve recorded-time exceptions before finalizing.'}), 'Open timecard review');
    expect(plain(card.detail)).toBe('Casey Rivera · Oct 19 – Oct 25 · Fix recorded-time issues before finalizing.');
    expect(card.detail).not.toMatch(/\d{4}-\d{2}/);
  });
  it('heads a group with its count and kind', () => {
    expect(plain(groupHeading('COVERAGE_GAP', 12, 'Coverage gap at Main Office'))).toBe('12 coverage gaps at Main Office');
    expect(plain(groupHeading('TARGET_MISSING', 10, 'Weekly hour target missing'))).toBe('10 people with no weekly hour target');
    expect(plain(groupHeading('AVAILABILITY_MISSING', 1, 'x'))).toBe('1 person hasn’t sent availability');
  });
});
