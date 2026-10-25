import {describe, expect, it} from 'vitest';
import {inboxSections, isPastCoverageGap, timeOffRequestId} from './inbox';
import type {ActionItem} from './project';

const item = (id: string, type: ActionItem['type'], category: ActionItem['category'], priority: ActionItem['priority'] = 'REVIEW'): ActionItem =>
  ({id, type, category, priority, title: id, detail: '', href: '/app'} as ActionItem);

describe('inbox sections', () => {
  it('puts urgent first, then exceptions in review order, then requests (a time correction is a request: UX-O-06)', () => {
    const sections = inboxSections([
      item('TIME_OFF:a', 'TIME_OFF', 'requests'), item('TIMECARD:x', 'TIMECARD', 'timekeeping'),
      item('gap', 'COVERAGE_GAP', 'scheduling', 'URGENT'), item('TIME_CORRECTION:c', 'TIME_CORRECTION', 'timekeeping'),
      item('hours', 'HOURS_REVIEW', 'scheduling'), item('EXCHANGE:e', 'EXCHANGE', 'requests'), item('TIME_OFF:b', 'TIME_OFF', 'requests'),
    ]);
    expect(sections.map(section => [section.id, section.items.map(entry => entry.id)])).toEqual([
      ['urgent', ['gap']],
      ['exceptions', ['hours', 'TIMECARD:x']],
      ['requests', ['TIME_OFF:a', 'TIME_OFF:b', 'EXCHANGE:e', 'TIME_CORRECTION:c']],
    ]);
  });
  it('omits empty sections and never invents items', () => {
    expect(inboxSections([])).toEqual([]);
    expect(inboxSections([item('EXCHANGE:e', 'EXCHANGE', 'requests')]).map(section => section.id)).toEqual(['requests']);
  });
  it('finds the time-off request id only on time-off items', () => {
    expect(timeOffRequestId(item('TIME_OFF:req-1', 'TIME_OFF', 'requests'))).toBe('req-1');
    expect(timeOffRequestId(item('TIME_OFF:', 'TIME_OFF', 'requests'))).toBeNull();
    expect(timeOffRequestId(item('EXCHANGE:x', 'EXCHANGE', 'requests'))).toBeNull();
  });
});

describe('inbox grouping', async () => {
  const {groupInboxItems} = await import('./inbox');
  it('collapses three or more of one kind at one place, keeping order and time-off rows separate', () => {
    const gap = (id: string, locationId: string) => ({...item(id, 'COVERAGE_GAP', 'scheduling', 'URGENT'), locationId});
    const entries = groupInboxItems([gap('a', 'main'), gap('b', 'west'), gap('c', 'main'), gap('d', 'main'), item('TIME_OFF:1', 'TIME_OFF', 'requests'), item('TIME_OFF:2', 'TIME_OFF', 'requests'), item('TIME_OFF:3', 'TIME_OFF', 'requests')]);
    expect(entries.map(entry => entry.kind === 'item' ? entry.item.id : `group:${entry.items.map(i => i.id).join(',')}`)).toEqual(['group:a,c,d', 'b', 'TIME_OFF:1', 'TIME_OFF:2', 'TIME_OFF:3']);
  });
});

describe('past coverage gaps (C2)', () => {
  const gap = (id: string, dateTime: string) => ({...item(id, 'COVERAGE_GAP', 'scheduling', 'URGENT'), dateTime});
  it('moves gaps on earlier days into their own last section and keeps today and later as current', () => {
    const sections = inboxSections([gap('mon', '2026-10-12T08:00'), gap('today', '2026-10-18T08:00'), item('TIME_OFF:a', 'TIME_OFF', 'requests')], '2026-10-18');
    expect(sections.map(section => [section.id, section.items.map(entry => entry.id)])).toEqual([
      ['urgent', ['today']], ['requests', ['TIME_OFF:a']], ['past', ['mon']],
    ]);
  });
  it('leaves everything current without a date to compare', () => {
    expect(inboxSections([gap('mon', '2026-10-12T08:00')]).map(section => section.id)).toEqual(['urgent']);
    expect(isPastCoverageGap({...item('x', 'COVERAGE_GAP', 'scheduling')}, '2026-10-18')).toBe(false);
  });
});
