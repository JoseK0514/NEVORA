import { describe, expect, it } from 'vitest';
import { finderItems, rankFinder } from './finder';

const data = { people: [{ id: 'E1', name: 'Alexandra Rivera', role: 'Employee' }, { id: 'E2', name: 'Morgan Rivera', role: 'Manager' }, { id: 'AR-9', name: 'Taylor Brooks', role: 'Lead' }], locations: [{ id: 'l1', name: 'Main Office' }] };

describe('finder', () => {
  const items = finderItems('MANAGER', undefined, data);
  it('opens on actions and pages only, never the whole team', () => {
    const results = rankFinder(items, '');
    expect(results.every(item => item.group === 'Actions' || item.group === 'Pages')).toBe(true);
    expect(results[0].label).toBe('Add shift');
  });
  it('ranks label starts, then word starts, then contains, then keywords', () => {
    expect(rankFinder(items, 'riv').filter(i => i.group === 'People').map(i => i.label)).toEqual(['Alexandra Rivera', 'Morgan Rivera']);
    expect(rankFinder(items, 'mor').find(i => i.group === 'People')?.label).toBe('Morgan Rivera');
    expect(rankFinder(items, 'ar-9').map(i => i.label)).toContain('Taylor Brooks');
    // B7 wording (NV-241): finder actions echo the button and page names.
    expect(rankFinder(items, 'hire')[0].label).toBe('Add employee');
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
    expect(rankFinder(owner, 'publish')[0]?.label).toBe('Build and publish');
    expect(rankFinder(owner, 'copy week')[0]?.label).toBe('Copy previous week');
    expect(rankFinder(owner, 'approve time off')[0]?.href).toBe('/app/requests');
    expect(rankFinder(owner, 'pin')[0]?.label).toBe('Set a Clocker PIN');
    expect(rankFinder(owner, '').some(i => i.label === 'Build and publish')).toBe(false);
  });
  it('finds Settings pages for Owners only, and Team tools (UX7)', () => {
    const owner = finderItems('OWNER', undefined, null);
    expect(rankFinder(owner, 'policies')[0]).toMatchObject({ href: '/app/settings/company-policies', detail: 'Settings' });
    expect(rankFinder(owner, 'logo')[0]?.href).toBe('/app/settings/branding');
    expect(rankFinder(owner, 'attendance').some(i => i.href === '/app?view=attendance')).toBe(true);
    expect(finderItems('MANAGER', undefined, null).some(i => i.href.startsWith('/app/settings/'))).toBe(false);
    expect(rankFinder(owner, '').some(i => i.detail === 'Settings')).toBe(false);
  });
  // Review Nov 14 (AR-14, AR-15): Search lists Clocker PINs, Punch photos and Payroll settings, named as the Settings hub names them.
  it('finds Clocker PINs, Punch photos and Payroll settings by their Settings names, for the roles that can open them', () => {
    const payroll = { enabled: true, canConfigure: true, canReview: true, canApprove: true, internalCalculatorAvailable: false, bankCompatibility: 'UNVERIFIED' as const };
    const owner = finderItems('OWNER', payroll, null);
    expect(owner.find(i => i.href === '/app/settings/features')?.label).toBe('Features and team terms');
    expect(rankFinder(owner, 'clocker pins')[0]).toMatchObject({ href: '/app/settings/clocker/pins', label: 'Clocker PINs', detail: 'Settings' });
    expect(rankFinder(owner, 'punch photos')[0]).toMatchObject({ href: '/app/settings/clocker/photos', label: 'Punch photos', detail: 'Settings' });
    expect(rankFinder(owner, 'payroll settings')[0]).toMatchObject({ href: '/app/settings/payroll', label: 'Payroll settings', detail: 'Payroll' });
    expect(owner.filter(i => i.href === '/app/settings/payroll')).toHaveLength(1);
    // Listed for a typed query only, like the other Settings pages.
    expect(rankFinder(owner, '').some(i => i.href.startsWith('/app/settings/'))).toBe(false);
    // Payroll settings follows payroll setup access; Settings pages stay with Owners.
    expect(finderItems('OWNER', undefined, null).some(i => i.href === '/app/settings/payroll')).toBe(false);
    expect(finderItems('OWNER', { ...payroll, canConfigure: false }, null).some(i => i.href === '/app/settings/payroll')).toBe(false);
    expect(finderItems('MANAGER', payroll, null).some(i => i.href.startsWith('/app/settings/'))).toBe(false);
    for (const role of ['EMPLOYEE', 'LEAD'] as const) expect(finderItems(role, payroll, null).some(i => i.href.startsWith('/app/settings/'))).toBe(false);
  });
});
