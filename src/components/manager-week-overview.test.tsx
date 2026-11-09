import {createElement, type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, vi} from 'vitest';
import {ManagerWeekOverview} from './manager-week-overview';
vi.mock('next/link', () => ({default: ({children, ...props}: ComponentProps<'a'>) => createElement('a', props, children)}));

it('keeps selected-week planning distinct from attendance and does not invent a schedule status', () => {
  const html = renderToStaticMarkup(<ManagerWeekOverview
    weekStart="2026-10-05" weekLabel="Oct 5–11" coverageConfigured
    days={[{date:'2026-10-05',weekday:'Mon',day:'5',shiftCount:3,gapCount:6}, {date:'2026-10-06',weekday:'Tue',day:'6',shiftCount:1,gapCount:2}]}
    locations={[{locationId:'west',locationName:'West Office',state:'NOT_STARTED',totalBlocks:8,coveredBlocks:0,uncoveredBlocks:8}]}
  />);
  expect(html).toContain('>4</strong> scheduled shifts');
  expect(html).toContain('Planned shifts, including drafts');
  expect(html).toContain('Planning only. Recorded clock activity is shown above.');
  expect(html).toContain('data-shift-count="3"');
  expect(html).toContain('Not started');
  expect(html).not.toContain('>Draft<');
  expect(html).not.toContain('On Floor');
  expect(html).toContain('/app/schedule?week=2026-10-05');
});

it('explains absent planning data and missing configuration without successful readiness claims', () => {
  const html = renderToStaticMarkup(<ManagerWeekOverview days={[]} locations={[]} weekStart="2026-10-05" weekLabel="Oct 5–11" coverageConfigured={false}/>);
  expect(html).toContain('No daily planning data is available');
  expect(html).toContain('No locations are available');
  expect(html).toContain('Coverage rules need setup');
  expect(html).not.toContain('Ready to publish');
});
