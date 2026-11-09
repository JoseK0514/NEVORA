import {afterEach, expect, it, vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import type {ComponentProps} from 'react';

vi.mock('next/link', () => ({default: ({children, ...props}: ComponentProps<'a'>) => <a {...props}>{children}</a>}));
vi.mock('../manager-action-center', () => ({ManagerActionCenter: () => <div data-live-reader="actions"/>,
  HomeActionCenterProvider: ({children}: {children: React.ReactNode}) => <>{children}</>, useHomeSetupSteps: () => null,
  useSharedHomeRead: () => null, mobileActionDetail: (detail: string) => detail}));
vi.mock('../manager-clock-monitor', () => ({ManagerClockMonitor: () => <div data-live-reader="clock"/>}));
vi.mock('next/navigation', () => ({notFound: () => {throw new Error('preview-disabled');}}));
vi.mock('./home-preview', () => ({HomePreview: () => <div>Sample Home</div>}));

import {ManagerDashboard} from '../manager-dashboard';
import {withoutB} from '../owner-b/test-support';
import {homePreviewRecords, previewEmployeeHome, previewManagerHome, previewActionCenter, previewToday} from './home-fixtures';
import HomePreviewPage from '@/app/ui-preview/home/page';

afterEach(() => vi.unstubAllEnvs());

it('copies only fictional display fields with the original people, locations and 21 shifts', () => {
  expect(homePreviewRecords.workspace.name).toBe('Northside QA Workforce');
  expect(homePreviewRecords.people).toHaveLength(10);
  expect(homePreviewRecords.shifts).toHaveLength(21);
  expect(homePreviewRecords.locations).toHaveLength(2);
  const forbidden = /password|token|session|secret|credential|email|phone|payroll|pin|device/i;
  const inspect = (value: unknown) => {
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      expect(key).not.toMatch(forbidden);
      inspect(child);
    }
  };
  inspect(homePreviewRecords);
  expect(previewEmployeeHome).toMatchObject({snapshot: {nextShift: {date: '2026-10-14'}}});
  // Ten availability items, coverage periods not configured and three people with no weekly hour target.
  expect(previewActionCenter).toMatchObject({state: 'ready', counts: {total: 14, scheduling: 14}});
});

it('the preview composition replaces private readers while the native Home keeps both readers by default', () => {
  const native = renderToStaticMarkup(<ManagerDashboard {...previewManagerHome}/>);
  expect(native).toContain('data-live-readers="today actions"');
  const preview = renderToStaticMarkup(<ManagerDashboard {...previewManagerHome} overviewSlots={{actions: null, activity: null, snapshots: {today: previewToday, actions: previewActionCenter}}}/>);
  expect(preview).not.toContain('data-live-reader');
  // Release 1 (corporate): the snapshots fill Today's stats.
  expect(preview).toMatch(/Clocked in<\/span><span class="c-stat__value c-num">\d+<span class="c-home__of"> of \d+<\/span><\/span>/);
});

it('the clean Overview is "Today", drops the tab row, and Home\'s own views still open from their addresses', () => {
  // The corporate layout (the Direction B phone screen greets by time of day; tested in owner-home-corp.test.tsx).
  const html = withoutB(renderToStaticMarkup(<ManagerDashboard {...previewManagerHome}/>));
  // Release 1 (corporate board C-Owner): the title is the welcome line; no week summary, no team tools on Home
  // (they live in More and the sidebar). Today, Payday and Things to do are the cards.
  expect(html).toContain('>Welcome back, Fictional</h1>');
  expect(html).not.toMatch(/Good (morning|afternoon|evening), /);
  expect(html).not.toContain('aria-label="Home views"');
  expect(html).not.toContain('manager-planning-summary');
  expect(html).toContain('Things to do');
  expect(html).not.toContain('Team tools');
  const team = renderToStaticMarkup(<ManagerDashboard {...previewManagerHome} view="team"/>);
  // Release 1: Hours this week is a kit page with a Back to Team.
  expect(team).toContain('class="c-page c-teamweek c-page--narrow"');
  expect(team).toMatch(/<a class="c-nav__back" href="\/app\/employees">/);
});

it('the sample route is closed in production and opens only in development or by explicit preview configuration', () => {
  vi.stubEnv('NODE_ENV', 'production');
  vi.stubEnv('NEVORA_UI_PREVIEW_ENABLED', '');
  expect(() => HomePreviewPage()).toThrow('preview-disabled');
  vi.stubEnv('NEVORA_UI_PREVIEW_ENABLED', '1');
  expect(renderToStaticMarkup(HomePreviewPage())).toContain('Sample Home');
  vi.stubEnv('NEVORA_UI_PREVIEW_ENABLED', '');
  vi.stubEnv('NODE_ENV', 'development');
  expect(renderToStaticMarkup(HomePreviewPage())).toContain('Sample Home');
});
