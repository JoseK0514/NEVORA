import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, rs} from '@rstest/core';
import {EmployeeScheduleCorp} from './employee-schedule-corp';
import type {EmployeeMyScheduleProps} from './employee-my-schedule';

rs.mock('next/link', () => ({default: ({children, scroll: _scroll, prefetch: _prefetch, ...props}: React.ComponentProps<'a'> & {scroll?: boolean; prefetch?: boolean}) => createElement('a', props, children)}));
rs.mock('next/navigation', () => ({useRouter: () => ({push: rs.fn(), replace: rs.fn()})}));

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
  // QA D10: the detail is short enough for one line at 320px.
  const plain = output.replace(/<[^>]+>/g, ' ');expect(plain).toContain('None right now');expect(plain).not.toContain('New ones show here');
  // Gaps G66: the row is named by what it shows ("Open shifts None right now"), with no label of its own.
  expect(output).not.toContain('aria-label="Open shifts, none right now"');
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

it('Phase 9 (spec 1.4): a shift row says its time fact as quiet text beside the time, not as a teal chip', () => {
  const output = html({weekStart: '2026-11-02', shifts: [shift('m', '2026-11-02'), shift('n', '2026-11-04')]});
  const agenda = output.slice(output.indexOf('id="b-my-agenda"'), output.indexOf('</section>', output.indexOf('id="b-my-agenda"')));
  expect(agenda).toMatch(/<span class="b-row__tt">[^<]*<\/span><span class="b-status">Tomorrow<\/span><\/span>/);
  expect(agenda).not.toContain('b-chip--teal');
});

it('gaps G66: no Schedule row or open-shifts row carries a label that differs from what it shows', () => {
  const output = html({openShifts: {available: [{id: 'o1', date: '2026-10-31', startTime: '09:00', endTime: '13:00', position: 'Barista', location: 'Condado', href: '/app/exchange/o1'}], requested: []} as unknown as EmployeeMyScheduleProps['openShifts'],
    weekStart: '2026-11-02', shifts: [shift('m', '2026-11-02'), shift('n', '2026-11-04')]});
  // Rows that open a shift or the Open shifts page have no aria-label.
  for (const match of output.matchAll(/<a [^>]*class="(?:b-row b-row--link|c-row)"[^>]*>/g)) expect(match[0]).not.toContain('aria-label');
  expect(output).toContain('1 open shift you can pick up');
  // The phone row's day is spoken: the day lead isn't hidden, and a space keeps "Mon" and "2" apart.
  expect(output).toMatch(/<span class="b-day eb-day[^"]*"><span>Mon<\/span><span class="b-sr"> <\/span><b>2<\/b><\/span>/);
});

it('shows the address for a visible assignment and drops it on an unavailable week', () => {
  const row = {...shift('qa-address', '2026-11-01'), locationAddress: '21 Calle Norte\nLocal <B>'};
  const ready = html({shifts: [row]});
  expect(ready).toContain('21 Calle Norte\nLocal &lt;B&gt;');
  expect(html({state: 'unavailable', shifts: [row]})).not.toContain('21 Calle Norte');
  expect(html({shifts: [{...row, locationAddress: null}]})).not.toContain('class="assignment-address"');
});
