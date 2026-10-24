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
  expect(preview).toContain('on shift</b>');
});

it('the clean Overview is "Today", drops the tab row, and Home\'s own views still open from their addresses', () => {
  const html = renderToStaticMarkup(<ManagerDashboard {...previewManagerHome}/>);
  // Clean Manager (v3): no greeting, no week summary, no team tools on Home (they live in More and the sidebar).
  expect(html).toContain('>Today</h1>');
  expect(html).not.toMatch(/Good (morning|afternoon|evening), /);
  expect(html).not.toContain('aria-label="Home views"');
  expect(html).not.toContain('manager-planning-summary');
  expect(html).toContain('Needs you');
  expect(html).not.toContain('Team tools');
  const team = renderToStaticMarkup(<ManagerDashboard {...previewManagerHome} view="team"/>);
  expect(team).toContain('aria-label="Home views"');
  expect(team).toContain('class="nv-masthead__back"');
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
