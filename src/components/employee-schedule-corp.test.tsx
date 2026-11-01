import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, vi} from 'vitest';
import {EmployeeScheduleCorp} from './employee-schedule-corp';
import type {EmployeeMyScheduleProps} from './employee-my-schedule';

vi.mock('next/link', () => ({default: ({children, scroll: _scroll, prefetch: _prefetch, ...props}: React.ComponentProps<'a'> & {scroll?: boolean; prefetch?: boolean}) => createElement('a', props, children)}));
vi.mock('next/navigation', () => ({useRouter: () => ({push: vi.fn(), replace: vi.fn()})}));

/* Nov 1 upscale (S12, S5, S13, B12) on fictional data: today is Sunday, Nov 1, 2026. */
const shift = (id: string, date: string, startTime = '08:00', endTime = '16:00') => ({id, scheduleId: 's', employeeId: 'self', employeeName: 'Fictional Employee', locationId: 'condado', date, startTime, endTime,
  positionName: 'Barista', isDesignatedLead: false, isCalloutApproved: false, scheduleStatus: 'PUBLISHED' as const});
const base: EmployeeMyScheduleProps = {weekStart: '2026-10-26', today: '2026-11-01', observedAt: '2026-11-01T14:00:00Z', timeZone: 'America/Puerto_Rico', state: 'published',
  shifts: [shift('a', '2026-10-26'), shift('b', '2026-10-27'), shift('c', '2026-10-29'), shift('d', '2026-10-30')], locations: [{id: 'condado', shortName: 'Condado'}], acknowledged: false,
  modules: {timeOff: true, marketplace: true, payStatements: true} as EmployeeMyScheduleProps['modules'], openShifts: {available: [], requested: []} as unknown as EmployeeMyScheduleProps['openShifts']};
const html = (props: Partial<EmployeeMyScheduleProps> = {}) => renderToStaticMarkup(createElement(EmployeeScheduleCorp, {...base, ...props}));
const days = (output: string) => [...output.matchAll(/<a [^>]*aria-label="(\w+day),[^>]*>/g)].map(match => [match[1], /class="([^"]*)"/.exec(match[0])?.[1] ?? '']);

it('S12: past days are quiet, today is the selected day, and a chosen day is solid while today keeps its ring', () => {
  const strip = days(html());
  expect(strip).toContainEqual(['Monday', 'is-past is-work']);expect(strip).toContainEqual(['Wednesday', 'is-past']);
  expect(strip).toContainEqual(['Sunday', 'is-today is-on']);
  const chosen = days(html({selectedDay: '2026-10-30'}));
  expect(chosen).toContainEqual(['Friday', 'is-past is-work is-on']);expect(chosen).toContainEqual(['Sunday', 'is-today']);
  // Next week: future shift days keep the tint (is-work) and nothing is past.
  const next = days(html({weekStart: '2026-11-02', shifts: [shift('e', '2026-11-03')]}));
  expect(next).toContainEqual(['Tuesday', 'is-work']);expect(next.some(([, cls]) => cls.includes('is-past'))).toBe(false);
});

it('S13/B12: open shifts are one row to the Open shifts page, with no View button even when there are none', () => {
  const output = html();
  expect(output).toContain('href="/app/schedule?week=2026-10-26&amp;view=open"');expect(output).not.toContain('>View<');
  expect(output.replace(/<[^>]+>/g, ' ')).toContain('None right now. New ones show here when a teammate offers a shift');
});

it('M5: an empty Open shifts page is one left-aligned card with a title, a sentence and one next step', () => {
  const output = html({view: 'open'}), plain = output.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
  expect(output).toContain('c-esched__empty');expect(plain).toContain('No open shifts right now');expect(plain).toContain('When a teammate offers a shift you can work, it shows here.');
  expect(output).toContain('href="/app/profile/device-alerts"');expect(output).not.toMatch(/c-btn/);
});

it('S5/S12: the shift panel is titled "Tomorrow, Nov 2" with its details on one line in a card, and no day pill', () => {
  const output = html({weekStart: '2026-11-02', shifts: [shift('m', '2026-11-02')], selectedShift: 'm'});
  const sheet = output.slice(output.indexOf('c-esheet'));
  expect(sheet).toMatch(/id="shift-m-title">Tomorrow, Nov(\s|&nbsp;| )2</);
  expect(sheet).toContain('c-card c-sheet__shift c-esheet__card');
  expect(sheet.replace(/[  ]/g, ' ')).toContain('Barista · Condado · 8 h');
  expect(sheet).not.toContain('c-sheet__facts');expect(sheet.slice(0, sheet.indexOf('c-sheet__actions'))).not.toContain('c-pill');
});
