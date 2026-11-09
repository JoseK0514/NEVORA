import {describe, expect, it} from 'vitest';
import {inboxSections, isPastCoverageGap, timeOffRequestId, workspaceNow} from './inbox';
import type {ActionItem} from './project';

const item = (id: string, type: ActionItem['type'], category: ActionItem['category'], priority: ActionItem['priority'] = 'REVIEW'): ActionItem =>
  ({id, type, category, priority, title: id, detail: '', href: '/app'} as ActionItem);

describe('inbox sections', () => {
  it('puts urgent first, then exceptions in review order, then requests', () => {
    const sections = inboxSections([
      item('TIME_OFF:a', 'TIME_OFF', 'requests'), item('TIMECARD:x', 'TIMECARD', 'timekeeping'),
      item('gap', 'COVERAGE_GAP', 'scheduling', 'URGENT'), item('TIME_CORRECTION:c', 'TIME_CORRECTION', 'timekeeping'),
      item('hours', 'HOURS_REVIEW', 'scheduling'), item('EXCHANGE:e', 'EXCHANGE', 'requests'), item('TIME_OFF:b', 'TIME_OFF', 'requests'),
    ]);
    expect(sections.map(section => [section.id, section.items.map(entry => entry.id)])).toEqual([
      ['urgent', ['gap']],
      ['exceptions', ['TIME_CORRECTION:c', 'hours', 'TIMECARD:x']],
      ['requests', ['TIME_OFF:a', 'TIME_OFF:b', 'EXCHANGE:e']],
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

describe('coverage gaps that ended today (Round 5, Nov 7, 2026)', () => {
  const gap = (id: string, start: string, end: string) => ({id, type: 'COVERAGE_GAP', category: 'scheduling', priority: 'URGENT', title: 'Coverage gap', detail: '', href: '/app/schedule', dateTime: start, endDateTime: end}) as ActionItem;
  it('treats a window that ended earlier today as past, and keeps one still running or later today', () => {
    const ended = gap('a', '2026-11-07T00:00', '2026-11-07T12:00'), running = gap('b', '2026-11-07T14:00', '2026-11-07T22:00'), overnight = gap('c', '2026-11-07T22:00', '2026-11-08T06:00');
    expect(isPastCoverageGap(ended, '2026-11-07', '2026-11-07T15:30')).toBe(true);
    expect(isPastCoverageGap(running, '2026-11-07', '2026-11-07T15:30')).toBe(false);
    expect(isPastCoverageGap(overnight, '2026-11-07', '2026-11-07T23:30')).toBe(false);
    // Without the local time (older callers) only earlier days are past, as before.
    expect(isPastCoverageGap(ended, '2026-11-07')).toBe(false);
    const sections = inboxSections([ended, running], '2026-11-07', '2026-11-07T15:30');
    expect(sections.find(s => s.id === 'past')?.items.map(i => i.id)).toEqual(['a']);
    expect(sections.find(s => s.id === 'urgent')?.items.map(i => i.id)).toEqual(['b']);
  });
  it('reads the workspace clock at an observation', () => {
    expect(workspaceNow('2026-11-07T19:30:00Z', 'America/Puerto_Rico')).toBe('2026-11-07T15:30');
  });
  it('keeps a previous-day overnight gap current until its actual end when a clock is supplied', () => {
    const overnight = gap('night', '2026-11-07T22:00', '2026-11-08T06:00');
    expect(isPastCoverageGap(overnight, '2026-11-08', '2026-11-08T02:00')).toBe(false);
    expect(isPastCoverageGap(overnight, '2026-11-08', '2026-11-08T06:00')).toBe(true);
    expect(isPastCoverageGap(overnight, '2026-11-08')).toBe(true);
  });
  it('uses the workspace midnight and DST clock without depending on the browser zone', () => {
    expect(workspaceNow('2026-11-08T04:00:00Z', 'America/Puerto_Rico')).toBe('2026-11-08T00:00');
    expect(workspaceNow('2026-03-08T07:30:00Z', 'America/New_York')).toBe('2026-03-08T03:30');
    expect(workspaceNow('invalid', 'America/Puerto_Rico')).toBeUndefined();
  });
});
