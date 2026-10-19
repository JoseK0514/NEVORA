// PREPARED / UNEXECUTED. Root owns adoption and actual QA.
import {Children, isValidElement, type ReactElement, type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {afterEach, describe, expect, it, vi} from 'vitest';
import {EmployeeDashboard} from './employee-dashboard';
import {EmployeeHomeActions, EmployeeHomeReviewedRenderer, createEmployeeHomeController, type HomeLifetime} from './employee-home-actions';
import {EmployeeHomeReviewedView} from './employee-home-reviewed';
import {EmployeeTimePanel, EmployeeTimeView} from './employee-time-panel';
import {HOME_SOURCES, projectEmployeeHome} from '../lib/employee-home/project';
import type {HomeSnapshot} from '../lib/employee-home/types';
import type {PrivatePanelState} from '../lib/private-snapshot-client';

const authority = 'a'.repeat(64), timeAuthority = 'b'.repeat(64);
const at = '2030-10-07T12:00:00.000Z';
const controllers: ReturnType<typeof createEmployeeHomeController>[] = [];
afterEach(() => { for (const controller of controllers.splice(0)) controller.stop(); vi.useRealTimers(); });

function snapshot(extra: Partial<HomeSnapshot> = {}): HomeSnapshot {
  return {
    observedAt: at, authority, validForMs: 45000, timeZone: 'America/Puerto_Rico',
    sources: Object.fromEntries(HOME_SOURCES.map(key => [key, {state: 'complete', observedAt: at, version: 'source-1', reason: null}])) as HomeSnapshot['sources'],
    publicationState: 'complete',
    nextShift: {
      shiftId: 'shift-private', assignmentEpisodeId: 'episode-private', termsRevision: 1,
      weekStart: '2030-10-07', date: '2030-10-08', startAt: '2030-10-08T12:00:00Z', endAt: '2030-10-08T20:00:00Z',
      locationId: 'location-private', locationLabel: 'PRIVATE_ASSIGNMENT_LOCATION', positionLabel: null,
      designatedLead: false, publicationRevisionId: 'published-1',
    },
    currentShift: null,
    attention: [{ref: {kind: 'TIME_OFF', id: 'private-request', version: 'request-1'}, label: 'PRIVATE_ACTION', href: '/app/requests?tab=my&requestId=private-request', required: true, actionable: true, deadlineAt: null, changedAt: at}],
    ...extra,
  };
}

function released(input = snapshot()): PrivatePanelState<HomeLifetime> {
  const home = projectEmployeeHome(input);
  if (!('snapshot' in home)) throw Error('Invalid canonical fixture');
  return {snapshot: {state: 'ready', observedAt: home.snapshot.observedAt, validForMs: home.snapshot.validForMs, home}, refreshing: false, paused: false};
}

function adapter(state: PrivatePanelState<HomeLifetime>, extra: Partial<Parameters<typeof EmployeeHomeReviewedRenderer>[0]> = {}) {
  return EmployeeHomeReviewedRenderer({state, authority, timeAuthority, onRetry: () => {}, ...extra});
}

const html = (state: PrivatePanelState<HomeLifetime>, extra: Partial<Parameters<typeof EmployeeHomeReviewedRenderer>[0]> = {}) => renderToStaticMarkup(adapter(state, extra));
function suppressPrivate(markup: string) {
  for (const value of ['PRIVATE_ASSIGNMENT_LOCATION', 'PRIVATE_ACTION', 'private-request', '2030-10-08', '1 item', 'data-home-updated', at]) expect(markup).not.toContain(value);
  expect(markup).not.toContain('data-home-group=');
  expect(markup).not.toContain('Clocked in');
}
function clockRegion(markup: string) {
  const region = markup.match(/<aside[^>]*aria-label="Own recorded time"[^>]*>([\s\S]*?)<\/aside>/);
  expect(region).not.toBeNull(); return region![1];
}
function elements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  return Children.toArray(node).flatMap(child => isValidElement<Record<string, unknown>>(child) ? [child, ...elements(child.props.children as ReactNode)] : []);
}

describe('reviewed Home renderer uses the original release boundary', () => {
  it('shows the real projected ready data with the original independent keyed compact clock panel', () => {
    const state = released(), view = adapter(state);
    expect(view.type).toBe(EmployeeHomeReviewedView);
    expect(view.props.home).toBe(state.snapshot?.state === 'ready' ? state.snapshot.home : null);
    expect(view.props.status).toBe('ready');
    const slot = view.props.ownTimeSlot;
    expect(isValidElement(slot)).toBe(true);
    if (!isValidElement<{authority: string; compact: boolean}>(slot)) throw Error('Missing original clock panel');
    expect(slot.type).toBe(EmployeeTimePanel); expect(slot.key).toBe(timeAuthority);
    expect(slot.props).toEqual({compact: true, authority: timeAuthority});
    const markup = html(state);
    expect(markup).toContain('PRIVATE_ASSIGNMENT_LOCATION'); expect(markup).toContain('PRIVATE_ACTION');
    expect(markup).toContain('data-home-group="actions"'); expect(markup).toContain('1 item');
    expect(markup).toContain('Loading recorded time'); expect(markup).not.toContain('Clocked in');
    expect(markup).not.toContain(authority); expect(markup).not.toContain(timeAuthority);
  });

  it('suppresses former ready authority before a replacement effect and does not mount its clock slot', () => {
    const state = released(), view = adapter(state, {authority: 'c'.repeat(64)});
    expect(view.props.home).toBeNull(); expect(view.props.status).toBe('loading'); expect(view.props.ownTimeSlot).toBeNull();
    const markup = html(state, {authority: 'c'.repeat(64)}); suppressPrivate(markup);
    expect(markup).toContain('Loading Home'); expect(clockRegion(markup)).toContain('href="/app/my-time"');
    expect(clockRegion(markup)).toMatch(/aria-label="Refresh(?:ing)? recorded time"[^>]*disabled/);
  });

  it('suppresses retained ready data and the clock component immediately on pause', () => {
    const state = {...released(), paused: true}, view = adapter(state);
    expect(view.props.home).toBeNull(); expect(view.props.status).toBe('paused'); expect(view.props.ownTimeSlot).toBeNull();
    const markup = html(state); suppressPrivate(markup); expect(markup).toContain('Paused while you’re away');
    expect(clockRegion(markup)).toContain('Updates paused'); expect(clockRegion(markup)).toContain('href="/app/my-time"');
    expect(clockRegion(markup)).toMatch(/aria-label="Refresh(?:ing)? recorded time"[^>]*disabled/);
  });

  it('uses original access-loss sign-in recovery without releasing prior clock or Home data', () => {
    const state: PrivatePanelState<HomeLifetime> = {snapshot: {state: 'unavailable', reason: 'access_denied'}, refreshing: false, paused: false};
    const view = adapter(state); expect(view.props.status).toBe('unauthorized'); expect(view.props.home).toBeNull(); expect(view.props.ownTimeSlot).toBeNull();
    const markup = html(state); suppressPrivate(markup);
    expect(clockRegion(markup)).toContain('href="/login"'); expect(clockRegion(markup)).toContain('Sign in');
    expect(clockRegion(markup)).toContain('href="/app/my-time"'); expect(clockRegion(markup)).not.toContain('aria-label="Refresh recorded time"');
  });

  it.each([{reason: 'read_failed'}, {reason: 'unexpected-read-failure'}])('keeps original nonprivate recovery on $reason', ({reason}) => {
    const state: PrivatePanelState<HomeLifetime> = {snapshot: {state: 'unavailable', reason}, refreshing: false, paused: false};
    const view = adapter(state); expect(view.props.status).toBe('unavailable'); expect(view.props.home).toBeNull(); expect(view.props.ownTimeSlot).toBeNull();
    const markup = html(state); suppressPrivate(markup); expect(markup).toContain('Try again');
    expect(clockRegion(markup)).toContain('Couldn’t load your time records'); expect(clockRegion(markup)).toContain('href="/app/my-time"');
    expect(clockRegion(markup)).toContain('aria-label="Try again to load your time records"'); expect(clockRegion(markup)).not.toMatch(/aria-label="Try again to load your time records"[^>]*disabled/);
  });

  it('keeps the initial pending state private and preserves disabled recorded-time loading controls', () => {
    const state: PrivatePanelState<HomeLifetime> = {snapshot: null, refreshing: true, paused: false};
    const view = adapter(state); expect(view.props.status).toBe('loading'); expect(view.props.refreshing).toBe(true); expect(view.props.ownTimeSlot).toBeNull();
    const markup = html(state); suppressPrivate(markup); expect(markup).toContain('Loading Home'); expect(markup).toContain('Checking');
    expect(clockRegion(markup)).toContain('Loading recorded time'); expect(clockRegion(markup)).toMatch(/aria-label="Refresh(?:ing)? recorded time"[^>]*disabled/);
  });

  it('keeps a still-released ready snapshot and independent clock while Home refresh is pending', () => {
    const state = {...released(), refreshing: true}, view = adapter(state);
    expect(view.props.status).toBe('ready'); expect(view.props.refreshing).toBe(true); expect(view.props.ownTimeSlot).not.toBeNull();
    const markup = html(state); expect(markup).toContain('PRIVATE_ASSIGNMENT_LOCATION'); expect(markup).toContain('PRIVATE_ACTION');
    expect(markup).toMatch(/data-home-refresh="true"[^>]*disabled/); expect(markup).toContain('Checking');
    const clock = clockRegion(markup); expect(clock).toContain('Loading recorded time'); expect(clock).not.toContain('Clocked in');
  });

  it('preserves canonical partial coverage and its clock without promoting known counts to all-clear', () => {
    const input = snapshot(); input.sources.communications = {...input.sources.communications, state: 'partial', reason: 'source_cap'};
    const state = released(input), view = adapter(state); expect(view.props.status).toBe('partial'); expect(view.props.ownTimeSlot).not.toBeNull();
    const markup = html(state); expect(markup).toContain('PRIVATE_ASSIGNMENT_LOCATION'); expect(markup).toContain('1 known item');
    expect(markup).toContain('partially shown — more records are available'); expect(markup).not.toContain('all set');
    expect(markup).toContain('href="/app/updates"'); expect(markup).toContain('Loading recorded time');
  });

  it('changes only the original clock key when its independent authority changes', () => {
    const state = released(), first = adapter(state), next = adapter(state, {timeAuthority: 'd'.repeat(64)});
    const before = first.props.ownTimeSlot, after = next.props.ownTimeSlot;
    if (!isValidElement<{authority: string; compact: boolean}>(before) || !isValidElement<{authority: string; compact: boolean}>(after)) throw Error('Missing clock slot');
    expect(before.type).toBe(EmployeeTimePanel); expect(after.type).toBe(EmployeeTimePanel);
    expect(before.key).toBe(timeAuthority); expect(after.key).toBe('d'.repeat(64));
    expect(after.props.authority).toBe('d'.repeat(64)); expect(after.props.compact).toBe(true);
    expect(first.props.home).toBe(next.props.home); expect(next.props.status).toBe('ready');
  });

  it('forwards the same explicit retry to Home and original redacted clock controls without invoking it during render', () => {
    const onRetry = vi.fn(), state: PrivatePanelState<HomeLifetime> = {snapshot: {state: 'unavailable', reason: 'read_failed'}, paused: false, refreshing: false};
    const view = adapter(state, {onRetry}); expect(view.props.onRetry).toBe(onRetry);
    const rendered = EmployeeHomeReviewedView(view.props), all = elements(rendered);
    const homeButton = all.find(element => element.type === 'button' && element.props['data-home-refresh'] === true);
    const clock = all.find(element => element.type === EmployeeTimeView);
    expect(homeButton).toBeDefined(); expect(clock).toBeDefined(); expect(onRetry).not.toHaveBeenCalled();
    expect(homeButton!.props.disabled).toBe(false); expect(clock!.props.onRefresh).toBe(onRetry);
    (homeButton!.props.onClick as () => void)();
    (clock!.props.onRefresh as () => void)(); expect(onRetry).toHaveBeenCalledTimes(2);
  });
});

describe('original controller lifetime and late-result behavior reaches the reviewed view', () => {
  it('clears released data and clock mounting at the original controller lifetime boundary', async () => {
    vi.useFakeTimers(); let latest: PrivatePanelState<HomeLifetime> = {snapshot: null, refreshing: true, paused: false};
    const read = projectEmployeeHome(snapshot({validForMs: 1000}));
    const controller = createEmployeeHomeController(value => { latest = value; }, async () => read, authority); controllers.push(controller);
    controller.start(); await vi.advanceTimersByTimeAsync(0);
    expect(html(latest)).toContain('PRIVATE_ASSIGNMENT_LOCATION'); expect(adapter(latest).props.ownTimeSlot).not.toBeNull();
    await vi.advanceTimersByTimeAsync(1000);
    expect(latest.snapshot).toEqual({state: 'unavailable', reason: 'read_failed'});
    expect(adapter(latest).props.status).toBe('unavailable'); expect(adapter(latest).props.ownTimeSlot).toBeNull(); suppressPrivate(html(latest));
  });

  it('never releases a reply whose lifetime was consumed by its original round trip', async () => {
    vi.useFakeTimers(); let latest: PrivatePanelState<HomeLifetime> = {snapshot: null, refreshing: true, paused: false};
    let reply!: (value: unknown) => void;
    const controller = createEmployeeHomeController(value => { latest = value; }, () => new Promise(resolve => { reply = resolve; }), authority); controllers.push(controller);
    controller.start(); await vi.advanceTimersByTimeAsync(0); await vi.advanceTimersByTimeAsync(1001);
    reply(projectEmployeeHome(snapshot({validForMs: 1000}))); await vi.advanceTimersByTimeAsync(0);
    expect(latest.snapshot).toEqual({state: 'unavailable', reason: 'read_failed'}); expect(adapter(latest).props.ownTimeSlot).toBeNull(); suppressPrivate(html(latest));
  });

  it('discards a late paused reply then renders denial for a new reply with former authority', async () => {
    vi.useFakeTimers(); let latest: PrivatePanelState<HomeLifetime> = {snapshot: null, refreshing: true, paused: false};
    const replies: ((value: unknown) => void)[] = [];
    const controller = createEmployeeHomeController(value => { latest = value; }, () => new Promise(resolve => { replies.push(resolve); }), authority); controllers.push(controller);
    controller.start(); await vi.advanceTimersByTimeAsync(0); controller.pause();
    replies[0](projectEmployeeHome(snapshot())); await vi.advanceTimersByTimeAsync(0);
    expect(latest).toEqual({snapshot: null, refreshing: false, paused: true}); expect(adapter(latest).props.status).toBe('paused'); suppressPrivate(html(latest));
    controller.start(); await vi.advanceTimersByTimeAsync(0);
    replies[1](projectEmployeeHome(snapshot({authority: 'c'.repeat(64)}))); await vi.advanceTimersByTimeAsync(0);
    expect(latest.snapshot).toEqual({state: 'unavailable', reason: 'access_denied'});
    expect(adapter(latest).props.status).toBe('unauthorized'); expect(adapter(latest).props.ownTimeSlot).toBeNull(); suppressPrivate(html(latest));
  });
});

describe('existing connected selection and Dashboard heading', () => {
  it('selects the reviewed renderer in the actual connected component without introducing a name or alternate reader', () => {
    const markup = renderToStaticMarkup(<EmployeeHomeActions authority={authority} timeAuthority={timeAuthority}/>);
    expect(markup).toContain('data-home-state="loading"'); expect(markup).toContain('data-home-refresh="true"');
    expect(markup).toContain('Loading recorded time'); expect(markup).toContain('href="/app/my-time"');
    expect(markup).not.toContain('Hi,'); suppressPrivate(markup);
  });

  it('has one Home heading owned by the reviewed renderer inside the original Dashboard wrapper', () => {
    const markup = renderToStaticMarkup(<EmployeeDashboard authority={authority} timeAuthority={timeAuthority}/>);
    expect(markup.match(/<h1(?:\s|>)/g)).toHaveLength(1); expect(markup).toMatch(/<h1[^>]*>Home<\/h1>/);
    expect(markup).toContain('class="employee-dashboard employee-home"'); expect(markup).not.toContain('employee-home-heading');
    expect(markup).toContain('data-home-refresh="true"'); expect(markup).toContain('Loading Home'); expect(markup).toContain('Loading recorded time');
  });
});
