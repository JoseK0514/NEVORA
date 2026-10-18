import {afterEach, expect, it, vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
import type {ComponentProps} from 'react';

vi.mock('next/link', () => ({default: ({children, ...props}: ComponentProps<'a'>) => <a {...props}>{children}</a>}));
vi.mock('../manager-action-center', () => ({ManagerActionCenter: () => <div data-live-reader="actions"/>,
  HomeActionCenterProvider: ({children}: {children: React.ReactNode}) => <>{children}</>, useHomeSetupSteps: () => null}));
vi.mock('../manager-clock-monitor', () => ({ManagerClockMonitor: () => <div data-live-reader="clock"/>}));
vi.mock('next/navigation', () => ({notFound: () => {throw new Error('preview-disabled');}}));
vi.mock('./home-preview', () => ({HomePreview: () => <div>Sample Home</div>}));

import {ManagerDashboard} from '../manager-dashboard';
import {homePreviewRecords, previewEmployeeHome, previewManagerHome, previewActionCenter} from './home-fixtures';
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
  expect(native).toContain('data-live-reader="actions"');
  expect(native).toContain('data-live-reader="clock"');
  const preview = renderToStaticMarkup(<ManagerDashboard {...previewManagerHome} overviewSlots={{actions: <div>Sample actions</div>, activity: <div>Sample activity</div>}}/>);
  expect(preview).not.toContain('data-live-reader');
  expect(preview).toContain('Sample actions');
  expect(preview).toContain('Sample activity');
});

it('the Gusto-style Overview leads with a greeting, drops the tab row and keeps every team view reachable', () => {
  const html = renderToStaticMarkup(<ManagerDashboard {...previewManagerHome}/>);
  expect(html).toMatch(/Good (morning|afternoon|evening), /);
  expect(html).not.toContain('aria-label="Dashboard views"');
  expect(html).not.toContain('manager-planning-summary');
  expect(html).toContain('This week');
  expect(html).toContain('Shortcuts');
  for (const view of ['attendance', 'team', 'requests', 'activity']) expect(html).toContain(`&amp;view=${view}`);
  const team = renderToStaticMarkup(<ManagerDashboard {...previewManagerHome} view="team"/>);
  expect(team).toContain('aria-label="Dashboard views"');
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
