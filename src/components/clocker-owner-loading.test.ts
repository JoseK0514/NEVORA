// The Owner's Clocker settings (Phase 6): each route keeps its own frame while it loads.
import {describe, expect, it, vi} from 'vitest';
vi.mock('@/components/owner-b/owner-b.css', () => ({}));
import {loadingShape} from '@/components/owner-b/b-loading';

describe('loading placeholders for the Clocker settings', () => {
  it('Clocker tablets: back row, title and one line on the 224 band, one reading column, rows with a lead slot', () => {
    expect(loadingShape('/app/settings/clocker', false)).toMatchObject({title: 'Clocker tablets', back: true, sub: true, band: 'sub', frame: 'read', lift: false, cards: [{head: true, rows: 2, avatar: true}]});
  });
  it('Clocker PINs: search and tabs on the 296 band, then people', () => {
    expect(loadingShape('/app/settings/clocker/pins', false)).toMatchObject({title: 'Clocker PINs', back: true, strip: true, band: 'strip', frame: 'read', lift: false});
    expect(loadingShape('/app/settings/clocker/pins', false).cards?.[0]).toEqual({head: true, rows: 6, avatar: true});
  });
  it('Punch photos and its review each have their own title', () => {
    expect(loadingShape('/app/settings/clocker/photos', false)).toMatchObject({title: 'Punch photos', band: 'sub', frame: 'read'});
    expect(loadingShape('/app/settings/clocker/photos/review', false)).toMatchObject({title: 'Photo review', band: 'sub', frame: 'read'});
  });
  it('Shift matching has its own title, not the tablets page it sits under', () => {
    expect(loadingShape('/app/settings/clocker/matching', false)).toMatchObject({title: 'Shift matching', band: 'sub', frame: 'read'});
  });
  it('Clocker recovery: help requests, the code form and the Timecards row', () => {
    expect(loadingShape('/app/clocker-recovery', false)).toMatchObject({title: 'Clocker recovery', back: true, sub: true, band: 'sub', frame: 'read', lift: false});
    expect(loadingShape('/app/clocker-recovery', false).cards).toHaveLength(3);
  });
  it('one person’s Clocker PIN is a form card under the person’s name; the person’s own page keeps its entry', () => {
    expect(loadingShape('/app/employees/QA-1/clocker-pin', false)).toMatchObject({title: 'Clocker PIN', back: true, sub: true, band: 'sub', frame: 'read', cards: [{head: true, lines: 4}]});
    expect(loadingShape('/app/employees/QA-1', false).title).toBeUndefined();
    expect(loadingShape('/app/employees/QA-1/restrictions', false).title).toBe('When they can be scheduled');
  });
  it('leaves the other Settings pages as they were', () => {
    expect(loadingShape('/app/settings/locations', false)).toMatchObject({back: true, band: 'short', frame: 'read'});
    expect(loadingShape('/app/settings', false).title).toBe('Settings');
    expect(loadingShape('/app/settings/payroll', false).title).toBe('Payroll settings');
  });
});
