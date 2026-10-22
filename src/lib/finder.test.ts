import { describe, expect, it } from 'vitest';
import { finderItems, rankFinder } from './finder';

const data = { people: [{ id: 'E1', name: 'Alexandra Rivera', role: 'Employee' }, { id: 'E2', name: 'Morgan Rivera', role: 'Manager' }, { id: 'AR-9', name: 'Taylor Brooks', role: 'Lead' }], locations: [{ id: 'l1', name: 'Main Office' }] };

describe('finder', () => {
  const items = finderItems('MANAGER', undefined, data);
  it('opens on actions and pages only, never the whole team', () => {
    const results = rankFinder(items, '');
    expect(results.every(item => item.group === 'Actions' || item.group === 'Pages')).toBe(true);
    expect(results[0].label).toBe('Add a shift');
  });
  it('ranks label starts, then word starts, then contains, then keywords', () => {
    expect(rankFinder(items, 'riv').filter(i => i.group === 'People').map(i => i.label)).toEqual(['Alexandra Rivera', 'Morgan Rivera']);
    expect(rankFinder(items, 'mor').find(i => i.group === 'People')?.label).toBe('Morgan Rivera');
    expect(rankFinder(items, 'ar-9').map(i => i.label)).toContain('Taylor Brooks');
    expect(rankFinder(items, 'hire')[0].label).toBe('Add an employee');
  });
  it('links people to their record and locations to their schedule', () => {
    expect(rankFinder(items, 'alex')[0]).toMatchObject({ group: 'People', href: '/app/employees/E1', detail: 'Employee' });
    expect(rankFinder(items, 'main').find(i => i.group === 'Locations')).toMatchObject({ href: '/app/schedule?location=l1' });
  });
  it('names the export page Time exports and still finds it by its old name (C1)', () => {
    const owner = finderItems('OWNER', undefined, null);
    const exportPage = owner.find(i => i.href === '/app/payroll-export');
    expect(exportPage?.label).toBe('Time exports');
    expect(rankFinder(owner, 'payroll export').some(i => i.href === '/app/payroll-export')).toBe(true);
    expect(rankFinder(owner, 'time exp')[0]?.href).toBe('/app/payroll-export');
  });
  it('only offers pages the role can open', () => {
    expect(finderItems('MANAGER', undefined, null).some(i => i.href === '/app/settings')).toBe(false);
    expect(finderItems('OWNER', undefined, null).some(i => i.href === '/app/settings')).toBe(true);
  });
  it('finds actions by the words people type, and keeps them out of the opening list (UX7)', () => {
    const owner = finderItems('OWNER', undefined, null);
    expect(rankFinder(owner, 'add shift')[0]?.href).toBe('/app/schedule/new');
    expect(rankFinder(owner, 'new shift')[0]?.href).toBe('/app/schedule/new');
    expect(rankFinder(owner, 'publish')[0]?.label).toBe('Publish the schedule');
    expect(rankFinder(owner, 'copy week')[0]?.label).toBe('Copy previous week');
    expect(rankFinder(owner, 'approve time off')[0]?.href).toBe('/app/requests');
    expect(rankFinder(owner, 'pin')[0]?.label).toBe('Set a Clocker PIN');
    expect(rankFinder(owner, '').some(i => i.label === 'Publish the schedule')).toBe(false);
  });
  it('finds Settings pages for Owners only, and Team tools (UX7)', () => {
    const owner = finderItems('OWNER', undefined, null);
    expect(rankFinder(owner, 'policies')[0]).toMatchObject({ href: '/app/settings/company-policies', detail: 'Settings' });
    expect(rankFinder(owner, 'logo')[0]?.href).toBe('/app/settings/branding');
    expect(rankFinder(owner, 'attendance').some(i => i.href === '/app?view=attendance')).toBe(true);
    expect(finderItems('MANAGER', undefined, null).some(i => i.href.startsWith('/app/settings/'))).toBe(false);
    expect(rankFinder(owner, '').some(i => i.detail === 'Settings')).toBe(false);
  });
});
