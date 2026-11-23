import {createElement, type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, rs} from '@rstest/core';
rs.mock('next/link', () => ({default: ({children, scroll: _scroll, prefetch: _prefetch, ...props}: ComponentProps<'a'> & {scroll?: boolean; prefetch?: boolean}) => createElement('a', props, children)}));
import {ScheduleB, type ScheduleBProps} from './schedule-b';

/* Employee Schedule on the phone, Direction B (fictional data): the screen draws what the page passes. */
const base: ScheduleBProps = {sub: 'Main Office', range: 'Nov 9–15', confirmed: false, todayHref: null, prevHref: '/app/schedule?week=2026-11-02', nextHref: '/app/schedule?week=2026-11-16', days: [],
  confirm: {title: 'Confirm this week', detail: 'Your manager asked you to check it', control: <button type="submit" className="employee-action">Confirm</button>},
  celebration: null, changes: null, swap: null, error: null, receipt: null, unavailable: null, unpublished: null,
  open: {count: 2, detail: 'Sat, Nov 14 and Sun, Nov 15', href: '/app/schedule?week=2026-11-09&view=open'},
  list: {label: 'This week', wholeWeekHref: null, rows: null, empty: 'No shifts this week.'}};
const draw = (patch: Partial<ScheduleBProps> = {}) => renderToStaticMarkup(<ScheduleB {...base} {...patch}/>);

it('Confirm is the one filled pill: open shifts are a row with a chevron in the "This week" card (EM-004, then Phase 4 EM-022)', () => {
  const html = draw();
  // Phase 4 (EM-022): the tinted "See open shifts" pill gave way to a plain 64px row that opens the list.
  expect(html).not.toContain('b-btn--ghost');
  // Gaps G66: the row is named by what it shows, so it has no label of its own.
  expect(html).toContain('<a class="b-row b-row--link" href="/app/schedule?week=2026-11-09&amp;view=open">');
  expect(html).toContain('<section class="b-card es-tw" aria-labelledby="b-this-week-h"><div class="b-card__h es-tw__h"><h2 id="b-this-week-h">Open shifts</h2></div>');
  // Below the band, nothing but the page's own Confirm control is a filled teal pill.
  expect(html.slice(html.indexOf('class="b-stack"'))).not.toContain('b-btn--teal');expect(html).not.toContain('>See</a>');
  // None to pick up stays a fact: a grey circle and no link (EM-017: grey is for facts that don't open).
  const none = draw({open: {...base.open!, count: 0, detail: 'None right now'}});
  expect(none).toContain('<span class="b-ico b-ico--grey" aria-hidden="true">');expect(none).not.toContain('view=open');
});

it('Phase 4: what changed is a row of "This week" after open shifts, once, and the week card keeps only its publication note (EM-013, EM-018, EM-022)', () => {
  const changes = <details className="schedule-publication-change"><summary><span>What changed in your schedule</span></summary><ul><li>Added Tue</li></ul></details>;
  const html = draw({changes, unpublished: 'Your Main Office shifts are published. West Office hasn’t published this week yet.',
    weekCard: {summary: 'Your Main Office shifts are published. West Office hasn’t published this week yet.', days: []}});
  expect(html.match(/What changed in your schedule/g)).toHaveLength(1);
  expect(html.indexOf('to pick up')).toBeLessThan(html.indexOf('es-chg'));
  expect(html).toContain('<div class="es-chg"><span class="b-ico b-ico--teal" aria-hidden="true">');
  expect(html).toContain('<p class="eb-cardnote eb-wkc__note">Your Main Office shifts are published.');
  // On a phone the same sentence is the list card's footer, not a note on the canvas.
  expect(html).toContain('<p class="eb-cardnote eb-phone">Your Main Office shifts are published.');
  expect(html).not.toContain('class="b-note"');expect(html).not.toContain('eb-wkc__foot');
});

it('Phase 4: the phone reads a short reason beside Confirm; the desktop day card shows one day (EM-022, EM-013)', () => {
  const html = draw({confirm: {...base.confirm!, detailShort: 'Your manager asked'},
    list: {label: 'Coming up', wholeWeekHref: null, rows: <li className="b-li">row</li>, empty: null, wide: {title: 'Today', meta: 'Tue, Nov 17', empty: 'Day off today.'}}});
  expect(html).toContain('<span class="b-row__s eb-phone">Your manager asked</span><span class="b-row__s eb-desk">Your manager asked you to check it</span>');
  expect(html).toContain('id="b-my-agenda" aria-labelledby="b-my-agenda-h" data-wide="day"');
  expect(html).toContain('<h2 id="b-my-agenda-h"><span class="es-narrow">Coming up</span><span class="es-wide">Today</span></h2><span class="b-card__meta es-wide">Tue, Nov 17</span>');
  expect(html).toContain('<p class="b-state es-empty es-wide">Day off today.</p>');
  // A confirmed week: the phone's line leaves the dates to the strip above, so the row keeps one line.
  const done = draw({confirm: null, done: {title: 'Week confirmed', occurrence: 'week:2026-11-09', detail: 'Nov 9–15 · Your manager can see you checked it', detailShort: 'Your manager can see you checked it'}});
  expect(done).toContain('<span class="eb-phone">Your manager can see you checked it</span><span class="eb-desk">Nov 9–15 · Your manager can see you checked it</span>');
  // Phase 7 (moments): a week that was already confirmed when the page opened shows the shared mark, still.
  expect(done).toContain('<span class="b-ico b-ico--green b-donemark" data-still="" aria-hidden="true">');
  expect(done).toContain('<span role="status" tabindex="-1" data-b-arrival="week-done" class="b-done__t">Week confirmed</span>');
  // A chosen day (or no day card) keeps the plain heading.
  expect(draw()).toContain('<h2 id="b-my-agenda-h">This week</h2>');
});

it('round 2 (S2, S4): Confirm this week carries Home’s amber chip when the manager asked; What changed has a short title for narrow phones', () => {
  const asked = draw({confirm: {...base.confirm!, detail: 'Nov 9–15 · 7 shifts', needed: true}}), row = asked.slice(asked.indexOf('es-confirm'), asked.indexOf('es-confirm__act'));
  expect(row).toContain('<span class="b-row__tt" id="b-my-review-title">Confirm this week</span><span class="b-chip b-chip--amber">Action needed</span></span><span class="b-row__s">Nov 9–15 · 7 shifts</span>');
  // The confirm control is the page's own, untouched, after the words.
  expect(asked).toContain('<span class="es-confirm__act"><button type="submit" class="employee-action">Confirm</button></span>');
  // A review nobody asked for has no chip.
  expect(draw().slice(draw().indexOf('es-confirm'), draw().indexOf('es-confirm__act'))).not.toContain('b-chip');
  const changes = <details className="schedule-publication-change"><summary><span>What changed in your schedule</span></summary><ul><li>Added Tue</li></ul></details>;
  const html = draw({changes});
  // The disclosure keeps its own title (screen readers, 360px and wider); the short one is drawn over it and not read.
  expect(html).toContain('<summary><span>What changed in your schedule</span></summary>');
  expect(html).toContain('</details><span class="es-chg__short" aria-hidden="true">What changed</span></div>');
  expect(draw()).not.toContain('es-chg__short');
});

it('Phase 4, Nov 23: a day block prints the range in two whole halves that break only after the dash (EM-014)', () => {
  const day = {date: '2026-11-17', short: 'Tue', day: 17, today: true, selected: true, href: '/app/schedule?week=2026-11-16&day=2026-11-17', label: 'Tuesday, November 17, today',
    shifts: [{key: 's1', time: '9\u00a0AM – 5\u00a0PM', position: 'Barista', place: 'Main Office · 8 h', kind: 'now' as const, chip: null, rest: 'Tuesday, November 17'}]};
  const html = draw({weekCard: {summary: '', days: [day]}});
  expect(html).toContain('<b><span class="eb-nb">9\u00a0AM\u00a0–</span> <span class="eb-nb">5\u00a0PM</span></b>');
});


it('Final review C (rows 4, 5): Confirm this week waits on you (amber) with the confirm glyph; Availability is UserCheck', async () => {
  const {CalendarCheckIcon} = await import('@phosphor-icons/react/dist/ssr/CalendarCheck');
  const {CalendarBlankIcon} = await import('@phosphor-icons/react/dist/ssr/CalendarBlank');
  const {UserCheckIcon} = await import('@phosphor-icons/react/dist/ssr/UserCheck');
  const html = draw(), row = html.slice(html.indexOf('es-confirm'), html.indexOf('es-confirm__act'));
  expect(row).toContain('<span class="b-ico b-ico--amber" aria-hidden="true">');
  expect(row).toContain(renderToStaticMarkup(<CalendarCheckIcon weight="duotone"/>));
  const band = html.slice(html.indexOf('href="/app/availability"'), html.indexOf('Availability</a>'));
  expect(band).toContain(renderToStaticMarkup(<UserCheckIcon size={16} weight="bold" aria-hidden="true"/>));
  expect(band).not.toContain(renderToStaticMarkup(<CalendarBlankIcon size={16} weight="bold" aria-hidden="true"/>));
});

it('gaps G12: each day of the week strip is named by what it shows, then its hidden facts (no aria-label)', () => {
  const html = draw({days: [{date: '2026-11-17', short: 'Tue', day: 17, today: true, past: false, selected: true, assigned: true, href: '/app/schedule?week=2026-11-16&day=2026-11-17', label: 'Tuesday, November 17, today, assigned shift'},
    {date: '2026-11-18', short: 'Wed', day: 18, today: false, past: false, selected: false, assigned: false, href: '/app/schedule?week=2026-11-16&day=2026-11-18', label: 'Wednesday, November 18'}]});
  const strip = html.slice(html.indexOf('class="b-week__days"'), html.indexOf('</nav>'));
  expect(strip).not.toMatch(/class="b-week__d(?: [^"]*)?"[^>]*aria-label/);
  expect(strip).toContain('<span>Tue</span><span class="b-sr"> </span><b>17</b><span class="b-sr">, today, assigned shift</span>');
  expect(strip).toContain('<span>Wed</span><span class="b-sr"> </span><b>18</b><i aria-hidden="true"></i>');
});

it('gaps G66: a week block is named by what it shows, then its date as hidden text (no aria-label that differs)', () => {
  const day = {date: '2026-11-17', short: 'Tue', day: 17, today: true, selected: true, href: '/app/schedule?week=2026-11-16&day=2026-11-17', label: 'Tuesday, November 17, today',
    shifts: [{key: 's1', time: '9\u00a0AM – 5\u00a0PM', position: 'Barista', place: 'Main Office · 8 h', kind: 'now' as const, chip: null, rest: 'Tuesday, November 17'}]};
  const html = draw({weekCard: {summary: '', days: [day]}});
  const block = html.slice(html.indexOf('<a class="eb-wsh eb-wsh--now"'), html.indexOf('</a>', html.indexOf('<a class="eb-wsh eb-wsh--now"')));
  expect(block).not.toContain('aria-label');
  expect(block.endsWith('<span class="b-sr">, Tuesday, November 17</span>')).toBe(true);
});
