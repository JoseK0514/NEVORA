import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it} from 'vitest';
import {projectEmployeeHome, HOME_SOURCES} from '../lib/employee-home/project';
import type {AttentionItem, HomeSnapshot, PublishedAssignment} from '../lib/employee-home/types';
import {EmployeeHomeCorpView, homeTodoRows} from './employee-home-corp';
import type {HomeWeek} from './employee-home-quiet';

/* Nov 1 upscale (S3, S4, M7) on fictional data: Sunday, Nov 1, 2026 at 10:00 AM in Puerto Rico. */
const at = '2026-11-01T14:00:00.000Z', zone = 'America/Puerto_Rico';
const monday: PublishedAssignment = {
  shiftId: 'own-mon', assignmentEpisodeId: 'ep', termsRevision: 1, weekStart: '2026-11-02', date: '2026-11-02',
  startAt: '2026-11-02T12:00:00Z', endAt: '2026-11-02T20:00:00Z', locationId: 'condado', locationLabel: 'Condado',
  positionLabel: 'Barista', designatedLead: false, publicationRevisionId: 'pub-1',
};
const confirm = (weekStart: string): AttentionItem => ({
  ref: {kind: 'SCHEDULE', id: weekStart, version: 'r1'}, label: 'Schedule published', href: `/app/schedule?week=${weekStart}`,
  required: true, actionable: true, deadlineAt: null, changedAt: at,
});
const snapshot = (attention: AttentionItem[] = []): HomeSnapshot => ({
  observedAt: at, authority: 'a'.repeat(64), validForMs: 45000, timeZone: zone, publicationState: 'complete',
  sources: Object.fromEntries(HOME_SOURCES.map(key => [key, {state: 'complete', observedAt: at, version: 'v', reason: null}])) as HomeSnapshot['sources'],
  nextShift: monday, currentShift: null, attention,
});
const shift = (id: string, date: string, startTime: string, endTime: string, where: string) => ({id, date, startTime, endTime, where});
const week: HomeWeek = {
  weekStart: '2026-10-26', today: '2026-11-01', dates: Array.from({length: 7}, (_, day) => `2026-${day < 6 ? `10-${26 + day}` : '11-01'}`),
  shifts: [shift('s-27', '2026-10-27', '08:00', '16:00', 'Barista · Condado')],
  next: {weekStart: '2026-11-02', shifts: [
    shift('own-mon', '2026-11-02', '08:00', '16:00', 'Barista · Condado'), shift('s-3', '2026-11-03', '08:00', '16:00', 'Barista · Condado'),
    shift('s-5', '2026-11-05', '08:00', '16:00', 'Barista · Condado'), shift('s-6', '2026-11-06', '10:00', '18:00', 'Barista · Old San Juan'),
    shift('s-7', '2026-11-07', '08:00', '12:00', 'Barista · Condado'),
  ]},
};
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/[   ]/g, ' ').replace(/\s+/g, ' ');
const render = (attention: AttentionItem[] = []) => renderToStaticMarkup(<EmployeeHomeCorpView home={projectEmployeeHome(snapshot(attention))} status="ready" refreshing={false} onRetry={() => {}} ownTimeSlot={null}
  displayName="Alexandra" timeZone={zone} workspaceName="Isla Verde Cafés" week={week} intro={<section className="ma-onboarding">Quick guide</section>}/>);

it('S3: one confirm row per week, nearest first, and a week that is over drops off Home', () => {
  const rows = homeTodoRows([confirm('2026-11-09'), confirm('2026-10-19'), confirm('2026-11-02'), confirm('2026-10-26')], snapshot(), week);
  // Oct 19 – 25 ended; Oct 26 – Nov 1 ends today with no shift still ahead; the rest are nearest first, one row each.
  expect(rows.map(row => row.item.ref.id)).toEqual(['2026-11-02', '2026-11-09']);
  expect(rows.every(row => row.week)).toBe(true);
  // While a shift is still ahead on the week's last day, that week stays.
  const working: HomeWeek = {...week, shifts: [...week.shifts, shift('s-1', '2026-11-01', '12:00', '18:00', 'Barista · Condado')]};
  expect(homeTodoRows([confirm('2026-10-26')], snapshot(), working).map(row => row.item.ref.id)).toEqual(['2026-10-26']);
});

it('S4: the shift card is one left-aligned stack whose body is the link, with the tablet line and Shift details in its footer', () => {
  const html = render(), plain = text(html);
  const card = html.slice(html.indexOf('id="home-shift"'), html.indexOf('</section>', html.indexOf('id="home-shift"')));
  expect(text(card)).toContain('8:00 AM – to 4:00 PM');expect(text(card)).toContain('Mon, Nov 2 · Barista · Condado');
  expect(card).toContain('class="c-card__body c-ehome__shift"');expect(card).toContain('href="/app/schedule?week=2026-11-02&amp;day=2026-11-02&amp;shift=own-mon"');
  expect(card).toContain('class="c-card__foot"');expect(text(card)).toContain('Clock in on the Condado tablet');expect(text(card)).toContain('Shift details');
  expect(plain).not.toContain('View shift');expect(card).not.toContain('c-note--center');
});

it('M7: Coming up lists the next three shifts across the week boundary in place of the Quick guide, and confirm reads next week', () => {
  const html = render([confirm('2026-11-02'), confirm('2026-10-26')]), plain = text(html);
  expect(plain).toContain('Coming up');expect(plain).toContain('See all');
  const up = text(html.slice(html.indexOf('id="home-upcoming"'), html.indexOf('</section>', html.indexOf('id="home-upcoming"'))));
  // Monday is on the card, so Coming up starts Tuesday and stops at three.
  expect(up).toContain('Tue 3');expect(up).toContain('Thu 5');expect(up).toContain('Fri 6');expect(up).toContain('Barista · Old San Juan');
  expect(up).not.toContain('Mon 2');expect(up).not.toContain('Sat 7');
  expect(html).toContain('href="/app/schedule?week=2026-11-02&amp;day=2026-11-03&amp;shift=s-3"');
  // A returning employee's Home has no Quick guide.
  expect(html).not.toContain('ma-onboarding');
  // One confirm row: the week that ends today has dropped off.
  expect(plain).toContain('Confirm next week’s schedule');expect(plain).toContain('Nov 2 – 8 · 5 shifts');expect(plain).not.toContain('Oct 26');
  expect(html.match(/Confirm next week/g)).toHaveLength(1);
});
