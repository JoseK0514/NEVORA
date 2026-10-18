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
});
