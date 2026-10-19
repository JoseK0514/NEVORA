import {expect, it, vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import type {ComponentProps} from 'react';

vi.mock('next/link', () => ({default: ({children, ...props}: ComponentProps<'a'>) => <a {...props}>{children}</a>}));

import {HomePreview, previewPayroll, previewSidebar, type PreviewRole} from './home-preview';
import {navigationForRole, sidebarNavigation} from '@/lib/navigation';
import {previewActionCenter, previewMonitor, previewToday, previewObservedAt} from './home-fixtures';

it('the preview sidebar is sidebarNavigation() for Owner, Manager and Employee, with Home lit', () => {
  for (const role of ['OWNER', 'MANAGER', 'EMPLOYEE'] as PreviewRole[]) {
    const {items, active} = previewSidebar(role);
    expect(items).toEqual(sidebarNavigation(role, navigationForRole(role, previewPayroll(role))));
    expect(active).toBe('/app');
  }
  expect(previewSidebar('OWNER').items.map(item => item.label)).toEqual(['Home', 'Inbox', 'Schedule', 'Requests', 'Updates', 'Employees', 'Timecards', 'Insights', 'Payroll', 'Settings']);
  const employee = previewSidebar('EMPLOYEE').items.map(item => item.label);
  expect(employee).not.toContain('Availability');
  expect(employee).not.toContain('Profile');
});

it('the Owner preview renders the D3 sidebar, the search button and the setup card with fictional gaps', () => {
  const html = renderToStaticMarkup(<HomePreview/>);
  const sidebar = html.slice(html.indexOf('aria-label="Primary navigation"'), html.indexOf('</nav>', html.indexOf('aria-label="Primary navigation"')));
  for (const label of ['Home', 'Inbox', 'Schedule', 'Employees', 'Requests', 'Updates', 'Timecards', 'Payroll', 'Insights', 'Settings']) expect(sidebar).toContain(`>${label}<`);
  for (const gone of ['Availability', 'Shift requests', 'Templates', 'Payroll export', 'Scheduling rules']) expect(sidebar).not.toContain(`>${gone}<`);
  expect(html).toContain('aria-label="Search"');
  expect(html).toContain('Finish setting up');
  expect(html).toContain('3 employees have no weekly hour target.');
  expect(html).toContain('href="/app/schedule/settings#coverage-staffing"');
});

it('Today strip and rail read one fixture source at one frozen moment', () => {
  expect(previewMonitor.state).toBe('ready');
  const rows = previewMonitor.state === 'ready' ? previewMonitor.employees.length : -1;
  expect(rows).toBe(4);
  expect(previewToday).toMatchObject({observedAt: previewObservedAt, today: '2026-10-13', timeZone: 'America/Puerto_Rico'});
  expect(previewToday.state === 'ready' && previewToday.counts.clockedIn).toBe(rows);
  expect(previewActionCenter.state === 'ready' && previewActionCenter.observedAt).toBe(previewObservedAt);
  const html = renderToStaticMarkup(<HomePreview/>);
  // Home's Today card reads the frozen moment (the rail's clock card moved to Attendance).
  expect(html.match(/Updated <time[^>]*>4:49 PM<\/time>/g)?.length).toBeGreaterThanOrEqual(1);
  expect(html).not.toContain('No one is clocked in right now');
});
