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
  // Release 1 (corporate board C-Owner): Inbox reads "Things to do", Timecards reads "Time", and Scheduling rules is
  // reached from Schedule and the Settings hub, not the sidebar (Phase 8: don't overwhelm).
  expect(previewSidebar('OWNER').items.map(item => item.label)).toEqual(['Home', 'Things to do', 'Schedule', 'Updates', 'Team', 'Time', 'Insights', 'Payroll', 'Settings']);
  const employee = previewSidebar('EMPLOYEE').items.map(item => item.label);
  expect(employee).not.toContain('Availability');
  expect(employee).not.toContain('Profile');
});

it('the Owner preview renders the D3 sidebar, the search button and the setup card with fictional gaps', () => {
  const html = renderToStaticMarkup(<HomePreview/>);
  const sidebar = html.slice(html.indexOf('aria-label="Primary navigation"'), html.indexOf('</nav>', html.indexOf('aria-label="Primary navigation"')));
  for (const label of ['Home', 'Things to do', 'Schedule', 'Team', 'Updates', 'Time', 'Payroll', 'Insights', 'Settings']) expect(sidebar).toContain(`>${label}<`);
  // D-4: Requests folds into Inbox on desktop.
  for (const gone of ['Requests', 'Employees', 'Availability', 'Shift requests', 'Templates', 'Payroll export']) expect(sidebar).not.toContain(`>${gone}<`);
  expect(sidebar).not.toContain('>Scheduling rules<');
  expect(html).toContain('aria-label="Search"');
  // Release 1 (corporate): setup is one row inside Things to do, "N of 2 steps done", naming the next step.
  expect(html).toContain('id="home-setup" class="c-home__setup"');
  expect(html).toContain('Finish setting up');
  expect(html).toMatch(/\d of 2 steps done · Next, /);
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
  // Release 1 (corporate): Today's "Clocked in" stat reads the frozen fixture (the four people on the clock).
  expect(html).toMatch(/Clocked in<\/dt><dd class="c-stat__value">4 of \d+<\/dd>/);
  expect(html).not.toContain('No one is clocked in right now');
});
