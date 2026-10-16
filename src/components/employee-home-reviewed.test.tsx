// PREPARED / UNEXECUTED. The application integrator owns actual QA execution.
import {EmployeeTimeView} from './employee-time-panel';
import {projectEmployeeTime} from '../lib/employee-time';
import {Children, isValidElement, type ReactElement, type ReactNode} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {describe, expect, it, vi} from 'vitest';
import {projectEmployeeHome, HOME_SOURCES} from '../lib/employee-home/project';
import type {AttentionItem, EmployeeHomeRead, HomeSnapshot, PublishedAssignment} from '../lib/employee-home/types';
import {EmployeeHomeReviewedView, untilLabel, type EmployeeHomeReviewedViewProps} from './employee-home-reviewed';

const at = '2030-10-07T12:00:00.000Z';
const assignment: PublishedAssignment = {
  shiftId: 'own-shift', assignmentEpisodeId: 'own-episode', termsRevision: 1,
  weekStart: '2030-10-07', date: '2030-10-08',
  startAt: '2030-10-08T12:00:00Z', endAt: '2030-10-08T20:00:00Z',
  locationId: 'own-location', locationLabel: 'Private location', positionLabel: 'Service associate',
  designatedLead: false, publicationRevisionId: 'published-1',
};

function snapshot(extra: Partial<HomeSnapshot> = {}): HomeSnapshot {
  return {
    observedAt: at, authority: 'a'.repeat(64), validForMs: 45000,
    timeZone: 'America/Puerto_Rico', publicationState: 'complete',
    sources: Object.fromEntries(HOME_SOURCES.map(key => [key, {
      state: 'complete', observedAt: at, version: 'source-1', reason: null,
    }])) as HomeSnapshot['sources'],
    nextShift: assignment, currentShift: null, attention: [], ...extra,
  };
}

function item(id: string, extra: Partial<AttentionItem> = {}): AttentionItem {
  return {
    ref: {kind: 'TIME_OFF', id, version: 'item-1'}, label: `Private item ${id}`,
    href: `/app/requests?tab=my&requestId=${id}`, required: false, actionable: false,
    deadlineAt: null, changedAt: at, ...extra,
  };
}

function props(home: EmployeeHomeRead = projectEmployeeHome(snapshot()), extra: Partial<EmployeeHomeReviewedViewProps> = {}): EmployeeHomeReviewedViewProps {
  return {
    home, status: home.state,
    refreshing: false, onRetry: vi.fn(), displayName: 'Alexandra',
    ownTimeSlot: <div data-test-own-time="released">Private own recorded-time slot</div>,
    ...extra,
  };
}

function html(value: EmployeeHomeReviewedViewProps) {
  return renderToStaticMarkup(<EmployeeHomeReviewedView {...value}/>).replaceAll('&#x27;', "'");
}

function group(markup: string, name: 'actions' | 'updates') {
  const match = markup.match(new RegExp(`<section[^>]*data-home-group="${name}"[^>]*>([\\s\\S]*?)</section>`));
  expect(match, `Missing semantic ${name} group`).not.toBeNull();
  return match![1];
}

// Inspect the pure view's native controls without mocking React hooks or claiming DOM interaction.
function nativeElements(node: ReactNode): ReactElement<Record<string, unknown>>[] {
  return Children.toArray(node).flatMap(child => {
    if (!isValidElement<Record<string, unknown>>(child)) return [];
    return [child, ...nativeElements(child.props.children as ReactNode)];
  });
}

describe('released Home data and navigation', () => {
  it('pairs a released ready view with loading and suppresses every prior private field/slot', () => {
    const ready = props();
    expect(html(ready)).toContain('Private location');
    expect(html(ready)).toContain('Private own recorded-time slot');
    expect(html(ready)).toContain('Hi, Alexandra.');
    const loading = html({...ready, status: 'loading', refreshing: true});
    for (const secret of ['Private location', 'Private own recorded-time slot', 'Alexandra', '2030-10-08', 'Published']) {
      expect(loading).not.toContain(secret);
    }
    expect(loading).toContain('Loading Home');
  });

  it.each(['paused', 'unauthorized', 'unavailable'] as const)('redacts stale ready data immediately when status becomes %s', status => {
    const stale = html(props(undefined, {status}));
    for (const secret of ['Private location', 'Private own recorded-time slot', 'Alexandra', '2030-10-08', 'Checked <time', 'data-home-updated', at]) {
      expect(stale).not.toContain(secret);
    }
    expect(stale).not.toContain("You're all set.");
    if (status === 'unauthorized') expect(stale).toContain('href="/login"');
  });

  it('respects an unavailable/denied read even when the caller supplies a ready status', () => {
    const denied = html(props({state: 'unauthorized', reason: 'access_denied'}, {status: 'ready'}));
    expect(denied).toContain('Sign in');
    expect(denied).not.toContain('Private own recorded-time slot');
    expect(denied).not.toContain('Alexandra');
    const failed = html(props({state: 'unavailable', reason: 'read_failed'}, {status: 'ready'}));
    expect(failed).toContain('Home unavailable');
    expect(failed).not.toContain('Private own recorded-time slot');
  });

  it('uses neutral Home without a released display name and renders no invented product totals', () => {
    const markup = html(props(undefined, {displayName: undefined}));
    expect(markup).toMatch(/<h1[^>]*>Home<\/h1>/);
    for (const fabricated of ['Hi, Alex.', 'Wallet', 'Earnings', 'Start break', 'Clock out', 'Mark read', 'Confirm schedule']) {
      expect(markup).not.toContain(fabricated);
    }
    expect(markup).not.toContain('a'.repeat(64));
  });

  it('preserves assignment context, overnight end date and optional Lead without inferring clock status', () => {
    const current = {...assignment, date: '2030-10-06', startAt: '2030-10-07T02:00:00Z', endAt: '2030-10-07T14:00:00Z', designatedLead: true};
    const markup = html(props(projectEmployeeHome(snapshot({currentShift: current}))));
    expect(markup).toContain('Scheduled now');
    expect(markup).toContain('Ends');
    expect(markup).toContain('Designated lead');
    expect(markup).toContain('week=2030-10-07&amp;day=2030-10-08');
    expect(markup).toContain('clock status is shown separately');
    expect(markup).not.toContain('Clocked in');
    expect(markup.indexOf('Next shift')).toBeLessThan(markup.indexOf('data-test-own-time'));
  });

  it('partitions by authoritative flags and preserves projected href/order rather than title or status wording', () => {
    const rows = [
      item('due', {actionable: true, deadlineAt: '2030-10-07T20:00:00Z'}),
      item('review', {required: true, label: 'Informational-looking title'}),
      item('info', {label: 'Review required is just a title', changedAt: '2030-10-07T11:00:00Z'}),
    ];
    const home = projectEmployeeHome(snapshot({attention: rows}));
    const markup = html(props(home));
    const actions = group(markup, 'actions'), updates = group(markup, 'updates');
    expect(actions).toContain('Informational-looking title');
    expect(actions).not.toContain('Review required is just a title');
    expect(updates).toContain('Review required is just a title');
    expect(actions.indexOf('requestId=due')).toBeLessThan(actions.indexOf('requestId=review'));
    expect(actions).toContain('Respond by');
    expect(updates).not.toContain('Respond by');
    expect(updates).toContain('Recorded');
    expect(markup).toContain('2 actions');
    expect(markup).toContain('1 update');
  });

  it('retains each schedule-review week and communication detail route with no direct acknowledgement action', () => {
    const rows: AttentionItem[] = ['2030-10-07', '2030-10-14'].map(week => item(week, {
      ref: {kind: 'SCHEDULE', id: week, version: 'publication-1'},
      href: `/app/schedule?week=${week}`, required: true, actionable: true, label: 'Review schedule',
    }));
    const id = '00000000-0000-4000-8000-000000000001';
    rows.push(item(id, {ref: {kind: 'COMMUNICATION', id, version: '00000000-0000-4000-8000-000000000002'}, href: `/app/updates/${id}`, required: true}));
    const markup = html(props(projectEmployeeHome(snapshot({attention: rows}))));
    expect(markup).toContain('dateTime="2030-10-07"');
    expect(markup).toContain('dateTime="2030-10-14"');
    expect(markup).toContain(`/app/updates/${id}`);
    expect(markup).not.toContain('Confirm schedule');
    expect(markup).not.toContain('Acknowledge');
  });

  it('keeps every projected row and independent native disclosure in each overflow group', () => {
    const rows = Array.from({length: 9}, (_, index) => item(`i${index}`, {actionable: index < 4}));
    const markup = html(props(projectEmployeeHome(snapshot({attention: rows}))));
    expect(group(markup, 'actions')).toContain('View all actions');
    expect(group(markup, 'updates')).toContain('View all updates');
    expect(markup.match(/<details /g)).toHaveLength(2);
    for (const row of rows) expect(markup).toContain(row.href.replaceAll('&', '&amp;'));
    expect(markup).not.toContain('/app/actions');
  });
});

describe('truthful source states and refresh intent', () => {
  it('pairs verified complete empty with partial/capped zero without carrying all-clear forward', () => {
    const complete = projectEmployeeHome(snapshot({nextShift: null}));
    expect(html(props(complete))).toContain("You're all set.");
    const current = snapshot({nextShift: null});
    current.sources.communications = {...current.sources.communications, state: 'partial', reason: 'source_cap'};
    const partial = html(props(projectEmployeeHome(current)));
    expect(partial).not.toContain("You're all set.");
    expect(partial).toContain('0 known actions');
    expect(partial).toContain('partially shown — more records are available');
    expect(partial).toContain('Open communications');
    expect(partial).toContain('href="/app/updates"');
    expect(partial).not.toContain('Day off');
  });

  it('keeps known assignments during partial publication and distinct failed-review recovery', () => {
    const current = snapshot({publicationState: 'partial'});
    current.sources.acknowledgements = {...current.sources.acknowledgements, state: 'unavailable', reason: 'review_unavailable'};
    const markup = html(props(projectEmployeeHome(current)));
    expect(markup).toContain('Private location');
    expect(markup).toContain('Schedule not published yet for all your eligible locations');
    expect(markup).toContain('Schedule reviews unavailable — a changed schedule needs review');
    expect(markup).toContain('Open schedule reviews');
    expect(markup).not.toContain("You're all set.");
  });

  it('does not show unavailable schedule facts or imply an off-clock state', () => {
    const current = snapshot();
    current.sources.schedule = {...current.sources.schedule, state: 'unavailable', reason: 'read_failed'};
    const markup = html(props(projectEmployeeHome(current)));
    expect(markup).toContain('Schedule unavailable');
    expect(markup).not.toContain('Private location');
    expect(markup).not.toContain('Published');
    expect(markup).toContain('Private own recorded-time slot');
    expect(markup).not.toContain('Off clock');
  });

  it('binds the explicit Home retry once without submitting anything during render', () => {
    const onRetry = vi.fn();
    const view = EmployeeHomeReviewedView(props({state: 'unavailable', reason: 'read_failed'}, {status: 'unavailable', onRetry}));
    const button = nativeElements(view).find(element => element.type === 'button' && element.props['data-home-refresh'] === true);
    expect(onRetry).not.toHaveBeenCalled();
    expect(button).toBeDefined();
    expect(button!.props.type).toBe('button');
    expect(button!.props.disabled).toBe(false);
    (button!.props.onClick as () => void)();
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it.each([{status: 'paused' as const, refreshing: false}, {status: 'ready' as const, refreshing: true}])('disables retry for $status/refreshing=$refreshing without removing current released facts', extra => {
    const value = props(undefined, extra), view = EmployeeHomeReviewedView(value);
    const button = nativeElements(view).find(element => element.type === 'button' && element.props['data-home-refresh'] === true);
    expect(button!.props.disabled).toBe(true);
    expect(value.onRetry).not.toHaveBeenCalled();
    if (extra.status === 'ready') expect(html(value)).toContain('Private location');
    else expect(html(value)).not.toContain('Private location');
  });
});

// Root causal preservation/privacy regressions; real original clock projection.
describe('original redacted clock recovery preservation',()=>{
 it.each(['loading','paused','unauthorized','unavailable'] as const)('keeps safe compact clock controls while removing all released data for %s',status=>{
  const time=projectEmployeeTime({observedAt:'2030-10-07T16:00:00Z',expiresAt:'2030-10-08T16:00:00Z',timeZone:'America/Puerto_Rico',recentCount:0,entries:[{id:'recorded',employee_id:'self',location_name:'PRIVATE_CLOCK_LOCATION',clock_in_at:'2030-10-07T12:00:00Z',clock_out_at:null,status:'CLOCKED_IN',history_valid:true,breaks:[]}]},'self');
  const slot=<EmployeeTimeView compact state={{time,paused:false,refreshing:false}} onRefresh={()=>{}}/>;
  const released=props(projectEmployeeHome(snapshot({attention:[item('privacy-item',{actionable:true})]})),{ownTimeSlot:slot});
  const control=html(released);
  for(const field of ['PRIVATE_CLOCK_LOCATION','Private location','Private item privacy-item','1 action','data-home-updated',at,'Hi, Alexandra.'])expect(control).toContain(field);
  const lost=html({...released,status});
  for(const field of ['PRIVATE_CLOCK_LOCATION','Private location','Private item privacy-item','1 action','data-home-updated',at,'Hi, Alexandra.','Clocked In'])expect(lost).not.toContain(field);
  const clock=lost.match(/<aside[^>]*aria-label="Own recorded time"[^>]*>([\s\S]*?)<\/aside>/)![1];
  expect(clock).toContain('href="/app/my-time"');
  if(status==='unauthorized'){expect(clock).toContain('href="/login"');expect(clock).toContain('Sign In');expect(clock).not.toContain('aria-label="Refresh recorded time"');}
  else {expect(clock).toContain('aria-label="Refresh recorded time"');if(status==='paused'||status==='loading')expect(clock).toMatch(/aria-label="Refresh recorded time"[^>]*disabled/);else expect(clock).not.toMatch(/aria-label="Refresh recorded time"[^>]*disabled/);}
 });
});

describe('Today Home (U2)', () => {
  it('shows the next shift as a pass with a relative day, greeting and quick actions', () => {
    const markup = html(props());
    expect(markup).toMatch(/aria-labelledby="employee-reviewed-next-heading"[^>]*data-pass="true"/);
    expect(markup).toContain('<strong>Tomorrow</strong> · <time dateTime="2030-10-08">');
    expect(markup).toContain('Good morning · <time');
    for (const label of ['Quick actions', 'Request time off', 'Swap a shift', 'Update availability', 'My time']) expect(markup).toContain(label);
    expect(markup).toContain('data-home-updated="true">Updated <time');
    // The countdown needs a live clock, so it is absent from server markup.
    expect(markup).not.toContain('Starts in');
  });
  it('keeps the calm card when there is no published shift or the schedule is unavailable', () => {
    expect(html(props(projectEmployeeHome(snapshot({nextShift: null}))))).not.toContain('data-pass');
    expect(html(props(projectEmployeeHome(snapshot({publicationState: 'unavailable', nextShift: null}))))).not.toContain('data-pass');
  });
  it('places quick actions after To do and before recent updates', () => {
    const markup = html(props(projectEmployeeHome(snapshot({attention: [item('todo', {actionable: true}), item('news')]}))));
    const order = ['data-home-group="actions"', 'Quick actions', 'data-home-group="updates"'].map(marker => markup.indexOf(marker));
    expect(order.every(index => index > 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });
  it('words the countdown for a glance', () => {
    expect(untilLabel(25 * 60_000)).toBe('25 min');
    expect(untilLabel(9 * 3_600_000 + 11 * 60_000)).toBe('9 h 11 min');
    expect(untilLabel(5 * 3_600_000)).toBe('5 h');
    expect(untilLabel(30 * 3_600_000)).toBe('1 day');
    expect(untilLabel(80 * 3_600_000)).toBe('3 days');
  });
});
