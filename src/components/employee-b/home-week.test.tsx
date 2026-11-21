import {createElement, type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, rs} from '@rstest/core';
rs.mock('next/link', () => ({default: ({children, scroll: _scroll, prefetch: _prefetch, ...props}: ComponentProps<'a'> & {scroll?: boolean; prefetch?: boolean}) => createElement('a', props, children)}));
import type {HomeWeek} from '../employee-home-quiet';
import type {EmployeeTime} from '../../lib/employee-time';
import {HomeWeekCard, weekDays, workedByDay} from './home-week';

/* Your week on fictional data: Wednesday, Nov 18, 2026 in Puerto Rico; shifts Monday to Thursday, 9 to 5. */
type Ready = Extract<EmployeeTime, {state: 'ready'}>;
const shift = (date: string) => ({id: `s-${date}`, date, startTime: '09:00', endTime: '17:00', where: 'Customer Support · Main Office'});
const week: HomeWeek = {weekStart: '2026-11-16', today: '2026-11-18', dates: Array.from({length: 7}, (_, day) => `2026-11-${16 + day}`),
  shifts: ['2026-11-16', '2026-11-17', '2026-11-18', '2026-11-19'].map(shift)};
const entry = (id: string, clockInAt: string, elapsedSeconds: number) => ({id, clockInAt, elapsedSeconds});
const hours = (recent: ReturnType<typeof entry>[], today: ReturnType<typeof entry>[] = [], total = recent.length) =>
  ({state: 'ready', timeZone: 'America/Puerto_Rico', date: '2026-11-18', today: {entries: today}, recent: {entries: recent, total}}) as unknown as Ready;
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

it('adds each day’s worked minutes from the Time read, once per entry, inside this week only', () => {
  const today = entry('c', '2026-11-18T13:02:00Z', 3600);
  const days = workedByDay(hours([entry('a', '2026-11-16T13:00:00Z', 8.5 * 3600), entry('b', '2026-11-17T13:00:00Z', 8 * 3600), today, entry('old', '2026-11-13T13:00:00Z', 8 * 3600)], [today]));
  expect([...days!].sort()).toEqual([['2026-11-16', 510], ['2026-11-17', 480], ['2026-11-18', 60]]);
});

it('says nothing about worked time when the read is missing or cut inside this week', () => {
  expect(workedByDay(null)).toBeNull();
  expect(workedByDay(undefined)).toBeNull();
  expect(workedByDay(hours([entry('b', '2026-11-17T13:00:00Z', 8 * 3600)], [], 4))).toBeNull();
});

it('never shows worked time for a day that hasn’t come', () => {
  const days = weekDays(week, new Map([['2026-11-16', 510]]));
  expect(days.map(day => [day.when, day.scheduled, day.worked])).toEqual([['past', 480, 510], ['past', 480, 0], ['today', 480, 0], ['ahead', 480, null], ['ahead', 0, null], ['ahead', 0, null], ['ahead', 0, null]]);
});

it('writes every day out for screen readers and keeps the bars decorative', () => {
  const html = renderToStaticMarkup(<HomeWeekCard week={week} hours={hours([entry('a', '2026-11-16T13:00:00Z', 8.5 * 3600)])} time/>);
  const read = text(html);
  expect(read).toContain('Monday, November 16: 8.5 hours worked of 8 scheduled');
  expect(read).toContain('Today, Wednesday, November 18: 8 hours scheduled');
  expect(read).toContain('Saturday, November 21: no shift');
  expect(html).toContain('href="/app/my-time"');
  expect(html).toMatch(/class="eb-hw__track" aria-hidden="true"/);
  expect(read).toContain('Hours worked');
});

it('shows the schedule alone without the hours read, and nothing for an empty week', () => {
  const html = renderToStaticMarkup(<HomeWeekCard week={week} hours={undefined} time={false}/>);
  expect(text(html)).not.toContain('Hours worked');
  expect(html).not.toContain('/app/my-time');
  expect(text(html)).toContain('Nov 16–22');
  expect(renderToStaticMarkup(<HomeWeekCard week={{...week, shifts: []}} hours={undefined} time={false}/>)).toBe('');
});
