import React from 'react';
import {beforeEach, expect, it, vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
const fixture = vi.hoisted(() => ({read: null as unknown, paused: false}));
vi.mock('@/app/app/exchange/actions', () => ({shiftChangeAction: vi.fn(), reconcileShiftChangeAction: vi.fn()}));
vi.mock('@/app/app/employee-planning/actions', () => ({saveEmployeePlanningAction: vi.fn(), checkEmployeePlanningAction: vi.fn()}));
vi.mock('../employee-mobile/use-planning', () => ({usePlanning: () => ({state: {snapshot: fixture.read ? {state: 'ready'} : null, paused: fixture.paused, refreshing: !fixture.read && !fixture.paused}, read: fixture.read, refresh: () => {}, accept: () => {}, allowed: () => true, live: {current: null}})}));
import {RequestsHubB, bTone} from './requests-b';
import {exchangeChip} from './exchange-b';
import {timeOffRange, timeOffSpan} from './timeoff-b';
import {EmployeeTimeOff} from '../employee-mobile/timeoff';
import {onlyB, withoutB} from '../owner-b/test-support';

const request = (id: string, status: string, startDate: string, endDate: string, times?: [string, string]) => ({id, status, startDate, endDate, startTime: times?.[0] ?? null, endTime: times?.[1] ?? null,
  note: null, createdAt: '2026-11-02T15:00:00Z', reviewedAt: null, reviewer: null});
const plain = (html: string) => html.replace(/\u00a0/g, ' ');
const PENDING = '11111111-1111-4111-8111-111111111111';
beforeEach(() => { fixture.read = null; fixture.paused = false; });

it('reads a time-off request as its dates over its days and length, in today’s words', () => {
  expect(timeOffRange(request('a', 'PENDING', '2026-11-12', '2026-11-14'))).toBe('Nov 12 – 14');
  expect(timeOffSpan(request('a', 'PENDING', '2026-11-12', '2026-11-14'))).toBe('Thu – Sat · All day · 3 days');
  expect(timeOffRange(request('b', 'PENDING', '2026-10-30', '2026-11-02'))).toBe('Oct 30 – Nov 2');
  expect(timeOffRange(request('c', 'PENDING', '2026-11-13', '2026-11-13'))).toBe('Nov 13');
  expect(timeOffSpan(request('c', 'PENDING', '2026-11-13', '2026-11-13'))).toBe('Fri · All day');
  expect(timeOffSpan(request('d', 'PENDING', '2026-11-13', '2026-11-13', ['09:00', '12:00']))).toBe('Fri · Part of day · 9:00 AM – 12:00 PM');
});

it('maps today’s request tones to the B chips and says when a swap waits on you', () => {
  expect(['teal', 'amber', 'red', 'neutral', 'blue'].map(bTone)).toEqual(['green', 'amber', 'grey', 'grey', 'grey']);
  const row = {id: 'r', kind: 'swap' as const, status: 'EMPLOYEE_PENDING', date: '2026-11-03', createdAt: '2026-10-27T12:00:00Z', counterparty: null, revision: 1, releaseApplies: null};
  expect(exchangeChip({...row, viewer: 'recipient'}, {tone: 'amber', text: 'Waiting on teammate'})).toEqual({tone: 'amber', text: 'Needs your answer'});
  expect(exchangeChip({...row, viewer: 'requester'}, {tone: 'amber', text: 'Waiting on teammate'}).text).toBe('With teammate');
});

it('draws the Requests tab: the white Request time off, what waits on the manager, then what was decided', () => {
  const html = renderToStaticMarkup(<div className="c-page"><RequestsHubB sub="Time off and shift changes you’ve sent" newHref="/app/requests?tab=new" forManager decidedHref="/app/requests?filter=decided"
    waiting={[{key: 'w', href: '/app/requests?requestId=w', kind: 'timeOff', title: 'Time off', sub: 'Nov 12 – 14 · 3 days', chip: {tone: 'amber', text: 'Waiting'}}]}
    decided={[{key: 'd', href: '/app/exchange?tab=requests&requestId=d', kind: 'callout', title: 'Can’t work', sub: 'Mon, Sep 28', chip: {tone: 'red', text: 'Declined'}}]}/></div>);
  expect(html).toMatch(/class="b-btn b-btn--white b-btn--full" href="\/app\/requests\?tab=new">.*Request time off</);
  expect(html).toContain('Waiting for your manager<span class="b-pill">1</span>');
  expect(html).toContain('aria-label="Time off, Nov 12 – 14 · 3 days, Waiting"');expect(html).toContain('b-chip--amber">Waiting<');
  expect(html).toContain('href="/app/requests?filter=decided"');expect(html).toContain('b-chip--red">Declined<');
  const empty = renderToStaticMarkup(<RequestsHubB sub="Time off you’ve asked for" newHref={null} forManager decidedHref={null} waiting={[]} decided={[]}/>);
  expect(empty).toContain('Nothing waiting right now');expect(empty).not.toContain('Request time off');expect(empty).not.toContain('Decided');
});

it('draws Time off’s list on the phone with the same rows, links and empty words as the corporate list', () => {
  fixture.read = {view: 'timeoff', enabled: true, timeZone: 'America/New_York', data: {requests: [request(PENDING, 'PENDING', '2026-11-12', '2026-11-14')]}};
  const html = plain(renderToStaticMarkup(<EmployeeTimeOff authority="a" selection="list" filter="waiting"/>)), b = onlyB(html);
  expect(b).toContain('>Time off</h1>');expect(b).toContain('aria-current="page" href="/app/requests"');expect(b).toContain(`href="/app/requests?requestId=${PENDING}"`);
  expect(b).toContain('aria-hidden="true">·</span>Thu – Sat</span>');expect(b).toContain('<span class="b-sr">, </span>3 days</span>');expect(b).toContain('href="/app/requests?tab=new"');
  // Review B1 (NV-280): the Waiting tab shows no Waiting chip on its rows; the row's name still ends ", Waiting".
  expect(b).not.toContain('b-chip--amber">Waiting<');expect(b).toContain('3 days, Waiting"');
  expect(b).toContain('Open a request to see its details or withdraw it.');
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
  expect(loading).toContain('Checking your current planning…');expect(loading).not.toContain('Try again');expect(loading).not.toContain('requestId=');
  fixture.paused = true;
  expect(onlyB(renderToStaticMarkup(<EmployeeTimeOff authority="a" selection="new" filter="waiting"/>))).toContain('Your planning is paused.');
  fixture.paused = false;
  fixture.read = {view: 'timeoff', enabled: false, timeZone: 'America/New_York', data: {requests: []}};
  const off = onlyB(renderToStaticMarkup(<EmployeeTimeOff authority="a" selection="list" filter="waiting"/>));
  expect(off).toContain('Time off is turned off for your company.');expect(off).not.toContain('b-seg');
});
