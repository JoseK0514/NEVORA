import {beforeEach, expect, it, rs} from '@rstest/core';
import {renderToStaticMarkup} from 'react-dom/server';
const fixture = rs.hoisted(() => ({read: null as unknown, paused: false}));
rs.mock('@/app/app/exchange/actions', () => ({shiftChangeAction: rs.fn(), reconcileShiftChangeAction: rs.fn()}));
rs.mock('@/app/app/employee-planning/actions', () => ({saveEmployeePlanningAction: rs.fn(), checkEmployeePlanningAction: rs.fn()}));
rs.mock('../employee-mobile/use-planning', () => ({usePlanning: () => ({state: {snapshot: fixture.read ? {state: 'ready'} : null, paused: fixture.paused, refreshing: !fixture.read && !fixture.paused}, read: fixture.read, refresh: () => {}, accept: () => {}, allowed: () => true, live: {current: null}})}));
import {IncomingB, MyScheduleCardB, RequestsHubB, bTone} from './requests-b';
import {exchangeChip, OpenShiftsB} from './exchange-b';
import {ArrowsLeftRightIcon} from '@phosphor-icons/react/dist/ssr/ArrowsLeftRight';
import {workCopy} from './work-copy';
import {timeOffRange, timeOffSpan} from './timeoff-b';
import {EmployeeTimeOff} from '../employee-mobile/timeoff';
import {onlyB, withoutB} from '../owner-b/test-support';

const request = (id: string, status: string, startDate: string, endDate: string, times?: [string, string]) => ({id, status, startDate, endDate, startTime: times?.[0] ?? null, endTime: times?.[1] ?? null,
  note: null, createdAt: '2026-11-02T15:00:00Z', reviewedAt: null, reviewer: null});
const plain = (html: string) => html.replace(/\u00a0/g, ' ');
const PENDING = '11111111-1111-4111-8111-111111111111';
beforeEach(() => { fixture.read = null; fixture.paused = false; });

it('reads a time-off request as its dates over its days and length, in today’s words', () => {
  expect(timeOffRange(request('a', 'PENDING', '2026-11-12', '2026-11-14'))).toBe('Nov 12–14');
  expect(timeOffSpan(request('a', 'PENDING', '2026-11-12', '2026-11-14'))).toBe('Thu – Sat · All day · 3 days');
  expect(timeOffRange(request('b', 'PENDING', '2026-10-30', '2026-11-02'))).toBe('Oct 30–Nov 2');
  expect(timeOffRange(request('c', 'PENDING', '2026-11-13', '2026-11-13'))).toBe('Nov 13');
  expect(timeOffSpan(request('c', 'PENDING', '2026-11-13', '2026-11-13'))).toBe('Fri · All day');
  expect(timeOffSpan(request('d', 'PENDING', '2026-11-13', '2026-11-13', ['09:00', '12:00']))).toBe('Fri · 9:00 AM – 12:00 PM');
});

it('maps today’s request tones to the B chips and says when a swap waits on you', () => {
  expect(['teal', 'amber', 'red', 'neutral', 'blue'].map(bTone)).toEqual(['green', 'amber', 'grey', 'grey', 'grey']);
  const row = {id: 'r', kind: 'swap' as const, status: 'EMPLOYEE_PENDING', date: '2026-11-03', createdAt: '2026-10-27T12:00:00Z', counterparty: null, revision: 1, releaseApplies: null};
  expect(exchangeChip({...row, viewer: 'recipient'}, {tone: 'amber', text: 'Waiting on teammate'})).toEqual({tone: 'amber', text: 'Needs your answer'});
  expect(exchangeChip({...row, viewer: 'requester'}, {tone: 'amber', text: 'Waiting on teammate'}).text).toBe('With teammate');
});

it('draws the Requests tab: the white Request time off, what waits on the manager, then what was decided', () => {
  const html = renderToStaticMarkup(<div className="c-page"><RequestsHubB sub="Time off and shift changes you’ve sent" newHref="/app/requests?tab=new" forManager decidedHref="/app/requests?filter=decided"
    waiting={[{key: 'w', href: '/app/requests?requestId=w', kind: 'timeOff', title: 'Time off', sub: 'Nov 12–14 · 3 days', chip: {tone: 'amber', text: 'Waiting'}}]}
    decided={[{key: 'd', href: '/app/exchange?tab=requests&requestId=d', kind: 'callout', title: 'Can’t work', sub: 'Mon, Sep 28', chip: {tone: 'red', text: 'Declined'}}]}/></div>);
  expect(html).toMatch(/class="b-btn b-btn--white b-btn--full" href="\/app\/requests\?tab=new">.*Request time off</);
  expect(html).toContain('Waiting for your manager<span class="b-pill">1</span>');
  expect(html).not.toContain('aria-label="Time off, Nov 12–14 · 3 days, Waiting"');expect(html).toContain('b-chip--amber">Waiting<');
  expect(html).toContain('href="/app/requests?filter=decided"');expect(html).toContain('b-chip--red">Declined<');
  const empty = renderToStaticMarkup(<RequestsHubB sub="Time off you’ve asked for" newHref={null} forManager decidedHref={null} waiting={[]} decided={[]}/>);
  expect(empty).toContain('Nothing waiting right now');expect(empty).not.toContain('Request time off');expect(empty).not.toContain('Decided');
});

it('draws Time off’s list on the phone with the same rows, links and empty words as the corporate list', () => {
  fixture.read = {view: 'timeoff', enabled: true, timeZone: 'America/New_York', data: {requests: [request(PENDING, 'PENDING', '2026-11-12', '2026-11-14')]}};
  const html = plain(renderToStaticMarkup(<EmployeeTimeOff authority="a" selection="list" filter="waiting"/>)), b = onlyB(html);
  expect(b).toContain('>Time off</h1>');expect(b).toContain('aria-current="page" href="/app/requests"');expect(b).toContain(`href="/app/requests?requestId=${PENDING}"`);
  expect(b).toContain('aria-hidden="true">·</span>Thu – Sat</span>');expect(b).toContain('<span class="b-sr">, </span>3 days</span>');expect(b).toContain('href="/app/requests?tab=new"');
  // Phase 4 (EM-023): a waiting row ends with the amber Waiting chip, and the Waiting tab carries its count.
  expect(b).toContain('b-chip--amber">Waiting<');expect(b).not.toContain('3 days, Waiting"'); // the row's name is its visible text (rule 7)
  expect(b).toContain('Waiting<span class="eb-segn"><span class="b-sr">, </span>1</span>');expect(b).toContain('>Decided</a>');
  // Phase 2 gate (Nov 23): no line that explains how the list works.
  expect(b).not.toContain('Open a request to see its details');
  expect(withoutB(html)).toContain('c-meta">Waiting<');
  fixture.read = {view: 'timeoff', enabled: true, timeZone: 'America/New_York', data: {requests: []}};
  const decided = onlyB(plain(renderToStaticMarkup(<EmployeeTimeOff authority="a" selection="list" filter="decided"/>)));
  expect(decided).toContain('No decisions yet');expect(decided).toContain('Approved, declined and withdrawn requests will appear here.');expect(decided).not.toContain('withdraw it');
});

it('keeps one request form in the page, drawn as the phone screen’s card, and marks the screen as a form (no tab bar)', () => {
  fixture.read = {view: 'timeoff', enabled: true, timeZone: 'America/New_York', data: {requests: []}};
  const html = renderToStaticMarkup(<EmployeeTimeOff authority="a" selection="new" filter="waiting"/>), b = onlyB(html);
  expect(html.match(/<form/g)).toHaveLength(1);expect(html).toContain('class="tof-form b-keep"');expect(b).not.toContain('<form');
  expect(b).toContain('>Request time off</h1>');expect(b).toContain('>Cancel</a>');expect(b).toContain('class="eb-form"');
  expect(html).toMatch(/<textarea[^>]*name="note"[^>]*maxLength="250"/);expect(html).toContain('Your manager approves it');
  // Phase 9 (spec 2.2): the approval note is the kit's teal callout with the wait glyph (HourglassMedium, a title over its
  // line), with no circle in a tint.
  expect(html).toContain('<div class="eb-tof-approve"><div class="b-callout" data-tone="teal"><span class="b-callout__ic" aria-hidden="true">');
  expect(html).toContain('<p class="b-callout__t">Your manager approves it</p><div class="b-callout__b">Keep your scheduled shifts until it is approved.</div>');
  expect(html).toContain('Your manager needs to approve this request. Keep your scheduled shifts until it is approved.');
  expect(html).toMatch(/<button class="c-btn c-btn--full" type="submit">Send request</);
});

it('draws one request with its decision, and keeps the withdraw step once in the page', () => {
  fixture.read = {view: 'timeoff', enabled: true, timeZone: 'America/New_York', data: {requests: [request(PENDING, 'PENDING', '2026-11-12', '2026-11-14')]}};
  const html = plain(renderToStaticMarkup(<EmployeeTimeOff authority="a" selection={PENDING} filter="waiting"/>)), b = onlyB(html);
  expect(b).toContain('Sent Mon, Nov 2');expect(b).toContain('Thu, Nov 12 – Sat, Nov 14');expect(b).toContain('Waiting for your manager');expect(b).toContain('href="/app/requests/hub"');
  expect(b).not.toContain('Withdraw request');expect(html.match(/>Withdraw request</g)).toHaveLength(1);expect(html).toContain('class="c-card tof-withdraw b-keep"');
});

it('shows each planning read state in the phone screen with its own action, and no private rows', () => {
  const loading = onlyB(renderToStaticMarkup(<EmployeeTimeOff authority="a" selection="list" filter="waiting"/>));
  /* B7 wording (NV-148): plain loading and paused lines */expect(loading).toContain('Loading your time off…');expect(loading).not.toContain('Try again');expect(loading).not.toContain('requestId=');
  fixture.paused = true;
  expect(onlyB(renderToStaticMarkup(<EmployeeTimeOff authority="a" selection="new" filter="waiting"/>))).toContain('Time off is paused.');
  fixture.paused = false;
  fixture.read = {view: 'timeoff', enabled: false, timeZone: 'America/New_York', data: {requests: []}};
  const off = onlyB(renderToStaticMarkup(<EmployeeTimeOff authority="a" selection="list" filter="waiting"/>));
  expect(off).toContain('Your workplace doesn’t use time off in NEVORA.');expect(off).not.toContain('b-seg');
});

/* Final polish, round 2 (R3 to R7). */
const openShift = (id: string, check: 'eligible' | 'refused', notice: string | null = null) => ({id, revision: 1, date: '2026-11-24', startTime: '12:00', endTime: '20:00', location: 'Main Office', position: 'Customer Support',
  check, notice, outcome: check === 'eligible' ? 'completed' as const : null});
const openScreen = (over: Partial<Parameters<typeof OpenShiftsB>[0]> = {}) => plain(renderToStaticMarkup(<OpenShiftsB state={null} enabled failed={false} refreshing={false} onRefresh={() => {}} results={null}
  rows={[{shift: openShift('a', 'eligible'), hours: '8 h', nextWeek: true, selected: false, action: <button type="button">Pick up</button>, status: null}]} unconfirmed={[]} refused={[]} note="Yours right away." {...over}/>));
const POSTED = /<p class="eb-cardfoot"><a class="b-link" href="\/app\/exchange\/open-shifts">See every posted shift<svg/;

it('leads Pick up and swap with the list and ends its card with the way to every posted shift (R3)', () => {
  const html = openScreen(), stack = html.slice(html.indexOf('class="b-stack"'));
  // The first card under the band is "You can pick up"; no lone "Posted open shifts" card.
  expect(stack.indexOf('<section')).toBe(stack.indexOf('<section class="b-card" id="b-open-eligible"'));
  expect(html).not.toContain('Posted open shifts');expect(html.match(/href="\/app\/exchange\/open-shifts"/g)).toHaveLength(1);
  const card = stack.slice(0, stack.indexOf('</section>'));
  expect(card).toMatch(POSTED);expect(card.indexOf('Yours right away.')).toBeLessThan(card.indexOf('eb-cardfoot'));
});

it('keeps the link in Open shifts’ other states: failed, nothing to pick up, still checking, and leaves it out when pickup is off (R3)', () => {
  const failed = openScreen({failed: true, rows: []});
  expect(failed).toContain('Open shifts couldn’t be checked.');expect(failed).toContain('>Try again</button>');expect(failed).toMatch(POSTED);
  const empty = openScreen({rows: [], note: null});
  expect(empty).toContain('No open shifts right now');expect(empty).toMatch(POSTED);
  const checking = openScreen({rows: [], note: null, unconfirmed: [openShift('u', 'refused')]});
  expect(checking).toContain('>Refresh</button>');expect(checking).toMatch(POSTED);expect(checking.match(/eb-cardfoot/g)).toHaveLength(1);
  const refreshing = openScreen({failed: true, rows: [], refreshing: true});
  expect(refreshing).toMatch(/<button[^>]*disabled=""[^>]*>Try again</);
  expect(openScreen({enabled: false})).not.toContain('eb-cardfoot');
  expect(openScreen({state: <p>Checking…</p>})).not.toContain('eb-cardfoot');
});

it('names the refused shifts in one short line and says what the row opens (R7)', () => {
  const html = openScreen({refused: [openShift('r1', 'refused', 'You have approved time off then'), openShift('r2', 'refused', 'It’s outside your availability')]});
  expect(html).toContain('aria-label="Shifts you can’t take"');expect(html).toContain('<span class="b-row__tt">Shifts you can’t take</span>');
  expect(html).toContain('<span class="b-row__s">2 shifts, with the reason</span>');expect(html).not.toContain('Why other shifts');
  expect(html).toContain('You have approved time off then');
  expect(workCopy('en').cantTake(1)).toBe('1 shift, with the reason');
  expect(workCopy('es').cantTakeTitle).toBe('Turnos que no puedes tomar');expect(workCopy('es').cantTake(1)).toBe('1 turno, con el motivo');expect(workCopy('es').cantTake(3)).toBe('3 turnos, con el motivo');
});

it('says a swap needs your answer once: the title, the amber chip and Review, with no filler line (R4)', () => {
  const one = renderToStaticMarkup(<IncomingB count={1} onRetry={() => {}}/>);
  expect(one).toContain('<span class="b-row__tt">Swap request waiting for you</span>');expect(one).toContain('b-chip--amber">Needs your answer<');
  expect(one).toContain('aria-label="Review the swap request"');expect(one).not.toContain('b-row__s');expect(one).not.toContain('before responding');
  expect(renderToStaticMarkup(<IncomingB count={3} onRetry={() => {}}/>)).toContain('3 swaps need your answer');
  expect(renderToStaticMarkup(<IncomingB count={null} onRetry={() => {}}/>)).toContain('Swaps for you couldn’t be checked.');
  expect(renderToStaticMarkup(<IncomingB count={0} onRetry={() => {}}/>)).toBe('');
});

it('draws both Shift requests rows, and My requests’ start row, as teal circles with the swap arrows (R5)', () => {
  const arrows = '<span class="b-ico b-ico--teal" aria-hidden="true">' + renderToStaticMarkup(<ArrowsLeftRightIcon weight="duotone"/>);
  const hub = renderToStaticMarkup(<RequestsHubB sub="s" newHref={null} forManager decidedHref={null} waiting={[]} decided={[]} shiftRequests/>);
  const card = hub.slice(hub.indexOf('eb-shiftreq'));
  expect(card.split(arrows)).toHaveLength(3);expect(card).not.toContain('b-ico--grey');
  expect(card).toMatch(/href="\/app\/exchange".*Pick up and swap.*href="\/app\/schedule\?intent=swap".*Swap or give away a shift/);
  const mine = renderToStaticMarkup(<MyScheduleCardB/>);
  expect(mine).toContain(arrows);expect(mine).not.toContain('b-ico--grey');
});
