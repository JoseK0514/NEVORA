import {createElement, type ComponentProps} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {expect, it, rs} from '@rstest/core';
rs.mock('next/link', () => ({default: ({children, scroll: _scroll, prefetch: _prefetch, ...props}: ComponentProps<'a'> & {scroll?: boolean; prefetch?: boolean}) => createElement('a', props, children)}));
import {HOME_SOURCES} from '../../lib/employee-home/project';
import type {AttentionItem, HomeSnapshot, PublishedAssignment} from '../../lib/employee-home/types';
import type {HomeWeek} from '../employee-home-quiet';
import {EmployeeHomeB, HoursRead, endedShiftStillOpen, homeTodoPreview, placeWhole, type HomeBProps, type HomeTodo} from './home-b';
import {Dotted} from './parts';

/* Phase 4 (Nov 17, 2026), Employee and Lead Home on fictional data: Tuesday, Nov 17, 2026 at 6:00 PM in Puerto Rico. */
const at = '2026-11-17T22:00:00.000Z', zone = 'America/Puerto_Rico';
const tomorrow: PublishedAssignment = {shiftId: 'own-wed', assignmentEpisodeId: 'ep', termsRevision: 1, weekStart: '2026-11-16', date: '2026-11-18',
  startAt: '2026-11-18T13:00:00Z', endAt: '2026-11-18T21:00:00Z', locationId: 'main', locationLabel: 'Main Office', positionLabel: 'Customer Support', designatedLead: false, publicationRevisionId: 'pub-1'};
const snapshot = (patch: Partial<HomeSnapshot> = {}): HomeSnapshot => ({observedAt: at, authority: 'a'.repeat(64), validForMs: 45000, timeZone: zone, publicationState: 'complete',
  sources: Object.fromEntries(HOME_SOURCES.map(key => [key, {state: 'complete', observedAt: at, version: 'v', reason: null}])) as HomeSnapshot['sources'],
  nextShift: tomorrow, currentShift: null, attention: [], ...patch});
const shift = (date: string, startTime: string, endTime: string, lead = false) => ({id: `s-${date}`, date, startTime, endTime, where: 'Customer Support · Main Office', lead});
const week = (lead = false): HomeWeek => ({weekStart: '2026-11-16', today: '2026-11-17', dates: Array.from({length: 7}, (_, day) => `2026-11-${16 + day}`),
  shifts: [shift('2026-11-17', '09:00', '17:00', lead), shift('2026-11-18', '09:00', '17:00', lead), shift('2026-11-19', '09:00', '17:00', lead), shift('2026-11-20', '09:00', '17:00', lead)]});
const item = (id: string, required: boolean, kind: AttentionItem['ref']['kind'] = 'EXCHANGE'): AttentionItem => ({ref: {kind, id, version: 'v1'} as AttentionItem['ref'], label: required ? 'Review update: Holiday hours' : 'Review swap request',
  href: `/app/notifications?item=${id}`, required, actionable: true, deadlineAt: required ? null : '2026-11-23T13:00:00Z', changedAt: at});
const todo = (id: string, required = false): HomeTodo => ({key: `k:${id}`, item: item(id, required, required ? 'COMMUNICATION' : 'EXCHANGE'), week: false});
const props = (patch: Partial<HomeBProps> = {}): HomeBProps => ({snapshot: snapshot(), partial: false, todos: [], week: week(), name: 'James', date: 'Tuesday, Nov 17', place: 'Main Office', waiting: null,
  loading: false, paused: false, denied: false, refreshing: false, onRetry: () => {}, weekTodo: () => ({title: 'Confirm this week’s schedule', detail: 'Nov 16 – 22'}), payday: '2026-11-27', ...patch});
const draw = (patch: Partial<HomeBProps> = {}) => renderToStaticMarkup(<EmployeeHomeB {...props(patch)}/>);
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/[  ]/g, ' ').replace(/\s+/g, ' ');

it('EM-002: Home keeps the server’s order and never drops the first required row out of sight', () => {
  const todos = [todo('a'), todo('b'), todo('c'), todo('d'), todo('req', true), todo('f')];
  // Nothing is re-ranked: the first three, then the required row from further down, in its own place.
  expect(homeTodoPreview(todos, 3).map(row => row.key)).toEqual(['k:a', 'k:b', 'k:c', 'k:req']);
  expect(homeTodoPreview(todos, 5).map(row => row.key)).toEqual(['k:a', 'k:b', 'k:c', 'k:d', 'k:req']);
  // A required row already inside the preview adds nothing; no required row adds nothing.
  expect(homeTodoPreview([todo('a'), todo('req', true), todo('c'), todo('r2', true)], 3)).toHaveLength(3);
  expect(homeTodoPreview(todos.filter(row => !row.item.required), 3)).toHaveLength(3);
  const html = draw({todos}), card = html.slice(html.indexOf('id="b-home-todo"'), html.indexOf('</section>', html.indexOf('id="b-home-todo"')));
  // Phones and tablets: a, b, c and the required row; desktop adds d between them (its own list, desktop only).
  const lists = [...card.matchAll(/<ul class="(b-list(?: eb-desk)?)">(.*?)<\/ul>/g)].map(match => [match[1], [...match[2].matchAll(/item=(\w+)" aria-label|item=(\w+)">/g)].map(found => found[1] ?? found[2])]);
  expect(lists.map(list => list[0])).toEqual(['b-list', 'b-list eb-desk', 'b-list']);
  expect(card.indexOf('item=d')).toBeGreaterThan(card.indexOf('item=c'));expect(card.indexOf('item=req')).toBeGreaterThan(card.indexOf('item=d'));
  expect(card).not.toContain('item=f');
  // The required row keeps the one teal Review pill and the amber chip; a lead is the teal circle (EM-008, EM-017), and
  // amber for the one that waits on you (Phase 9, spec 3.2, as in Notifications).
  expect(card.match(/b-btn--teal/g)).toHaveLength(1);expect(card).toContain('b-chip--amber');
  expect(card).not.toContain('b-ico--grey');expect(card.match(/b-ico--teal/g)).toHaveLength(4);expect(card.match(/b-ico--amber/g)).toHaveLength(1);
});

it('EM-007, EM-025: the hours read as one sentence, the payday is one format, and the shift ahead is the first figure', () => {
  const html = draw(), strip = html.slice(html.indexOf('class="b-live b-glass"'), html.indexOf('</ul>', html.indexOf('class="b-live b-glass"')));
  const plain = text(strip);
  expect(plain).toContain('Next shift Tomorrow 9 AM Customer Support · Main Office');
  expect(strip).toContain('aria-label="Next shift, Tomorrow, 9:00 AM to 5:00 PM"'.replace(/ /g, strip.includes('9:00 AM') ? ' ' : ' '));
  // No hours read in this render: scheduled hours stand alone with their caption.
  expect(plain).toContain('Hours 32 h scheduled this week');
  expect(plain).toContain('Scheduled payday Fri, Nov 27 in 10 days');
  expect(strip).not.toContain('eb-phone');expect(strip).not.toContain('/32');
});

it('EM-015: a Lead who leads every listed shift reads it once beside the title; otherwise the row says it, short on phones', () => {
  const all = draw({lead: true, week: week(true)}), card = all.slice(all.indexOf('id="b-home-upcoming"'));
  // Wednesday is on the shift card, so Thursday and Friday are listed.
  expect(card).toContain('Coming up<span class="eb-hmeta">You lead all 2</span>');expect(text(card)).not.toContain('Shift lead');
  const mixedWeek = week(true); (mixedWeek.shifts as unknown as {lead?: boolean}[])[3].lead = false;
  const mixed = draw({lead: true, week: mixedWeek}), mixedCard = mixed.slice(mixed.indexOf('id="b-home-upcoming"'));
  expect(mixedCard).not.toContain('eb-hmeta');
  expect(mixedCard).toContain('<span class="eb-lead-l">Shift lead</span><span class="eb-lead-s">Lead</span>');
  expect(renderToStaticMarkup(<Dotted text="Barista · Condado"/>)).not.toContain('eb-lead');
  // An Employee's rows never carry the marker.
  expect(draw({week: week(true)})).not.toContain('eb-lead-l');
});

it('EM-016: Today’s team is a plain row that opens the compose page, with its note as the card’s footer', () => {
  const html = draw({lead: true, team: true}), card = html.slice(html.indexOf('id="b-home-team"'), html.indexOf('</section>', html.indexOf('id="b-home-team"')));
  expect(card).toContain('<a class="b-row b-row--link" href="/app/updates/compose" aria-label="Message today’s team, everyone on shift today">');
  expect(card).not.toContain('b-btn');expect(card).toContain('class="b-chev"');
  expect(card).toContain('<p class="eb-cardnote">Your message goes to everyone on today’s published schedule. They don’t have to acknowledge it.</p>');
});

it('a punch left open after today’s shift ended is found from the two reads Home already has', () => {
  const still = endedShiftStillOpen(week(), snapshot(), '2026-11-17T13:02:00Z');
  expect(still).toEqual({startTime: '09:00', endTime: '17:00'});
  // Not while a shift is under way, not for a punch from another day, not when clocked in after the shift ended, and
  // not while a later shift today is still ahead.
  expect(endedShiftStillOpen(week(), snapshot({currentShift: tomorrow}), '2026-11-17T13:02:00Z')).toBeNull();
  expect(endedShiftStillOpen(week(), snapshot(), '2026-11-16T13:02:00Z')).toBeNull();
  expect(endedShiftStillOpen(week(), snapshot(), '2026-11-17T21:30:00Z')).toBeNull();
  const later = week(); (later.shifts as unknown as unknown[]).push(shift('2026-11-17', '19:00', '23:00'));
  expect(endedShiftStillOpen(later, snapshot(), '2026-11-17T13:02:00Z')).toBeNull();
  expect(endedShiftStillOpen(null, snapshot(), '2026-11-17T13:02:00Z')).toBeNull();
});

it('Phase 9: the shift card says its time fact as header meta, your clock state as quiet words, an open punch as a callout', () => {
  const html = draw(), card = html.slice(html.indexOf('id="b-home-shift"'), html.indexOf('</section>', html.indexOf('id="b-home-shift"')));
  // "Tomorrow" is quiet meta, not a teal chip; where to clock in stays the plain information line (NV-295).
  expect(card).toContain('<span class="b-card__meta">Tomorrow</span>');expect(card).not.toContain('b-chip');
  expect(card).toContain('class="eb-tint"');expect(card).not.toContain('b-callout');
  // Still clocked in after today's shift ended: an amber callout with the Warning glyph, a title and its line.
  const read = {current: {state: 'CLOCKED_IN', clockInAt: '2026-11-17T13:02:00Z', locationName: 'Main Office'}} as unknown as Parameters<typeof HoursRead.Provider>[0]['value'];
  const late = renderToStaticMarkup(<HoursRead.Provider value={read}><EmployeeHomeB {...props()}/></HoursRead.Provider>);
  // Final polish (Nov 20, 2026): it is its own Right now card, first on Home, so it reads as about now; the shift card
  // under it stays about the shift ahead and says only where to clock.
  const lateCard = late.slice(late.indexOf('id="b-home-now"'), late.indexOf('</section>', late.indexOf('id="b-home-now"')));
  const lateShift = late.slice(late.indexOf('id="b-home-shift"'), late.indexOf('</section>', late.indexOf('id="b-home-shift"')));
  expect(late.indexOf('id="b-home-now"')).toBeGreaterThan(-1);expect(late.indexOf('id="b-home-now"')).toBeLessThan(late.indexOf('id="b-home-shift"'));
  expect(lateCard).toContain('>Right now</h2>');expect(lateCard).toContain('href="/app/my-time"');
  expect(lateShift).not.toContain('b-callout');expect(text(lateShift)).toContain('Clock in on the Main Office tablet');expect(text(lateShift)).not.toContain('Clocked in at');
  expect(html).not.toContain('id="b-home-now"');
  expect(lateCard).toContain('<div class="b-callout" data-tone="amber" role="status">');
  expect(lateCard).toContain('<p class="b-callout__t">Still clocked in since 9:02 AM</p>');
  expect(text(lateCard)).toContain('Your 9 AM – 5 PM shift has ended. Clock out on the Main Office tablet.');
  expect(lateCard).not.toContain('b-ico--amber');expect(lateCard).not.toContain('eb-tint');
  // Clocked in during a shift: the state leads the line with the green live dot (final review C, row 9: the first line,
  // ink 600), over where to clock as the grey second line (no green tint, no callout). "Main Office" stays whole.
  const current = snapshot({currentShift: {...tomorrow, date: '2026-11-17', startAt: '2026-11-17T13:00:00Z', endAt: '2026-11-18T01:00:00Z'}});
  const on = renderToStaticMarkup(<HoursRead.Provider value={read}><EmployeeHomeB {...props({snapshot: current})}/></HoursRead.Provider>);
  const onCard = on.slice(on.indexOf('id="b-home-shift"'), on.indexOf('</section>', on.indexOf('id="b-home-shift"')));
  expect(onCard).not.toContain('b-callout');expect(onCard).not.toContain('data-tone="green"><svg');
  expect(onCard).toMatch(/<span class="b-notice__t eb-state"><span class="b-status" data-dot="green"><span class="b-ldot" data-tone="green" aria-hidden="true"><\/span>Clocked in at 9:02\sAM<\/span><\/span><span class="b-notice__s">Breaks and clock out on the Main\u00a0Office tablet<\/span>/);
  expect(on).toContain('<span class="b-card__meta">Until 9:00 PM</span>');
  // On break: amber live dot. A shift under way with no punch: Time's words from work-copy, "Not clocked in · 9 h" (the
  // shift started at 9 AM, Home was read at 6 PM), with the amber dot.
  const pause = renderToStaticMarkup(<HoursRead.Provider value={{current: {...(read as {current: object}).current, state: 'ON_BREAK'}} as typeof read}><EmployeeHomeB {...props({snapshot: current})}/></HoursRead.Provider>);
  expect(pause).toContain('<span class="b-status" data-dot="amber"><span class="b-ldot" data-tone="amber" aria-hidden="true"></span>On break</span>');
  const none = renderToStaticMarkup(<HoursRead.Provider value={{current: null} as unknown as typeof read}><EmployeeHomeB {...props({snapshot: current})}/></HoursRead.Provider>);
  expect(none).toMatch(/<span class="b-notice__t eb-state"><span class="b-status" data-dot="amber"><span class="b-ldot" data-tone="amber" aria-hidden="true"><\/span>Not clocked in · 9 h<\/span><\/span><span class="b-notice__s">Clock in on the Main\u00a0Office tablet<\/span>/);
  expect(none).not.toContain('Not clocked in yet');
});

it('Final review C (rows 4, 9): a short place name stays whole; fixing your time is the pencil on Home as on Time', async () => {
  expect(placeWhole('Main Office')).toBe('Main\u00a0Office');
  // A long name keeps its spaces, so a narrow phone can still wrap it.
  expect(placeWhole('Northside Distribution Center')).toBe('Northside Distribution Center');
  const {PencilSimpleIcon} = await import('@phosphor-icons/react/dist/ssr/PencilSimple');
  const {ClockIcon} = await import('@phosphor-icons/react/dist/ssr/Clock');
  const fix: HomeTodo = {key: 'k:fix', item: item('fix', false, 'TIME_CORRECTION'), week: false};
  const html = draw({todos: [fix]}), card = html.slice(html.indexOf('id="b-home-todo"'), html.indexOf('</section>', html.indexOf('id="b-home-todo"')));
  expect(card).toContain(renderToStaticMarkup(<PencilSimpleIcon weight="bold"/>));
  expect(card).not.toContain(renderToStaticMarkup(<ClockIcon weight="bold"/>));
});

it('privacy: while Home is not released (offline, paused) no private row is drawn', () => {
  const html = draw({snapshot: null, paused: true, waiting: 'You’re offline.', todos: [todo('a')], name: undefined});
  expect(html).not.toContain('b-home-todo');expect(html).not.toContain('b-home-upcoming');expect(html).not.toContain('b-live');
  expect(text(html)).toContain('You’re offline.');
});

it('final polish: Home’s shortcuts open the page that starts each request, and a module that is off has none', () => {
  const nav = (html: string) => html.match(/<nav class="eb-qa" aria-label="Shortcuts">.*?<\/nav>/)?.[0] ?? '';
  const all = nav(draw({shortcuts: ['timeOff', 'callout', 'swap', 'fixTime']}));
  expect([...all.matchAll(/href="([^"]+)"/g)].map(match => match[1].replace(/&amp;/g, '&'))).toEqual(['/app/requests?tab=new', '/app/schedule?intent=callout', '/app/schedule?intent=swap', '/app/my-time?view=corrections&edit=new']);
  expect(text(all).trim()).toBe('Time off Can’t work Swap shift Fix my time');
  // The short labels keep their words inside the spoken name.
  expect(all).toContain('aria-label="Request time off"');
  // They lead the right column, over Your week and Coming up.
  const html = draw({shortcuts: ['fixTime']});
  expect(html.indexOf('class="eb-qa"')).toBeGreaterThan(html.indexOf('id="b-home-side"'));
  expect(html.indexOf('class="eb-qa"')).toBeLessThan(html.indexOf('id="b-home-upcoming"'));
  expect(text(nav(html)).trim()).toBe('Fix my time');
  expect(nav(draw())).toBe('');
  expect(nav(draw({shortcuts: []}))).toBe('');
});
