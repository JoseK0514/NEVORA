import * as rstestImportedActual0 from "react" with { rstest: 'importActual' };
// Clocker recovery (Phase 6): one designed answer for each result of checking a code, and each state of the help
// requests list. The states are set directly in hooks held here; clocker-recovery-review.test.tsx covers the reads.
import {afterEach, beforeEach, describe, expect, it, rs} from '@rstest/core';

const hooks = rs.hoisted(() => ({states: [] as unknown[], refs: [] as {current: unknown}[], s: 0, r: 0, server: false}));
rs.mock('react', () => ({
  ...rstestImportedActual0,
  useState: (initial: unknown) => {const index = hooks.s++; if (!(index in hooks.states)) hooks.states[index] = initial; return [hooks.states[index], (value: unknown) => {hooks.states[index] = value;}];},
  useRef: (initial: unknown) => {const index = hooks.r++; return hooks.refs[index] ??= {current: initial};},
  useEffect: () => {},
  useCallback: (fn: unknown) => fn,
  useId: () => 'code',
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown, server?: () => unknown) => hooks.server && server ? server() : snapshot(),
}));
import {ClockerRecoveryReview} from './clocker-recovery-review';
import {ClockerOwnerRequests} from './clocker-owner-requests';
import {clockerOwnerCopy, type ClockerOwnerLang} from './clocker-owner-copy';
import type {RecoveryReview} from '../lib/clocker/recovery-review.server';
import type {OwnerReviewRequestsResult} from '../lib/clocker/review-requests.server';

type Node = {type: unknown; props: Record<string, unknown>};
const isNode = (value: unknown): value is Node => !!value && typeof value === 'object' && 'type' in value && 'props' in value;
function expand(value: unknown, skip: unknown[] = []): unknown {
  if (Array.isArray(value)) return value.map(item => expand(item, skip));
  if (!isNode(value)) return value;
  if (typeof value.type === 'function' && !skip.includes(value.type)) { try { return expand((value.type as (props: unknown) => unknown)(value.props), skip); } catch { return {...value, props: {...value.props, children: expand(value.props.children, skip)}}; } }
  return {...value, props: Object.fromEntries(Object.entries(value.props).map(([key, child]) => [key, key === 'children' ? expand(child, skip) : child]))};
}
function all(value: unknown): Node[] { if (Array.isArray(value)) return value.flatMap(all); if (!isNode(value)) return []; return [value, ...all(value.props.children)]; }
const text = (node: unknown): string => Array.isArray(node) ? node.map(text).join(' ') : typeof node === 'string' || typeof node === 'number' ? String(node) : isNode(node) ? text(node.props.children) : '';
const code = '4a9c7ed1-9b42-4dc0-8847-324d7ade7832';
const receipt = (minute: number) => ({employeeId: 'QA-2', employeeName: 'James Ortiz', deviceName: 'Front counter tablet', locationName: 'Calle Loíza', action: 'CLOCK_OUT', performedAt: `2026-11-17T20:0${minute}:00.000Z`, timeEntryId: 't'});
const ready = (receipts: unknown[]): RecoveryReview => ({state: 'ready', observedAt: '2026-11-17T20:10:00.000Z', validForMs: 15000, commandId: code, receipts: receipts as never});

/** Recovery's states in hook order: the code, a selection, the read's result, loading, then the field's error. */
function review(state: RecoveryReview | null, options: {loading?: boolean; invalid?: string; lang?: ClockerOwnerLang} = {}) {
  hooks.s = 0; hooks.r = 0; hooks.states = [code, state !== null || !!options.loading, state, !!options.loading, options.invalid ?? ''];
  return expand(ClockerRecoveryReview({actorId: 'QAOWNER', timeZone: 'America/Puerto_Rico', lang: options.lang}), [ClockerOwnerRequests]);
}
function requests(state: OwnerReviewRequestsResult | null, loading = false, lang: ClockerOwnerLang = 'en', onSelect = rs.fn()) {
  hooks.s = 0; hooks.r = 0; hooks.states = [state, loading];
  return expand(ClockerOwnerRequests({actorId: 'QAOWNER', timeZone: 'America/Puerto_Rico', onSelect, lang}));
}
const card = (tree: unknown, kind: string) => all(tree).find(node => node.props.className === 'b-statecard' && node.props['data-kind'] === kind);
beforeEach(() => { hooks.states = []; hooks.refs = []; hooks.server = false; rs.stubGlobal('window', new EventTarget()); rs.stubGlobal('document', Object.assign(new EventTarget(), {visibilityState: 'visible'})); rs.stubGlobal('navigator', {onLine: true}); });
afterEach(() => {rs.unstubAllGlobals();});

describe('checking a code', () => {
  it('before any check: what the page is for, one field with its label and help, one filled button', () => {
    hooks.s = 0; hooks.r = 0; hooks.states = ['', false, null, false, ''];
    const tree = expand(ClockerRecoveryReview({actorId: 'QAOWNER', timeZone: 'America/Puerto_Rico'}), [ClockerOwnerRequests]);
    expect(text(tree)).toContain('Checking a code here never changes recorded time.');
    const input = all(tree).find(node => node.type === 'input')!;
    expect(all(tree).find(node => node.type === 'label')?.props.htmlFor).toBe(input.props.id);
    expect(input.props['aria-describedby']).toBe(all(tree).find(node => text(node) === clockerOwnerCopy.en.lookupHelp)?.props.id);
    expect(all(tree).filter(node => node.type === 'button' && String(node.props.className).includes('b-btn--teal')).map(text)).toEqual(['Check code']);
    expect(all(tree).some(node => node.props.className === 'b-statecard')).toBe(false);
  });
  it('a punch that was saved is green, with who, what, when and where', () => {
    const tree = review(ready([receipt(1)]));
    expect(text(card(tree, 'done'))).toContain('This punch was saved');
    expect(text(tree)).toContain('James Ortiz · Clock out'); expect(text(tree)).toContain('Front counter tablet, Calle Loíza'); expect(text(tree)).toMatch(/Nov 17, 4:01 PM/);
    expect(all(tree).find(node => node.props['data-result'])?.props['data-result']).toBe('found');
  });
  it('nothing saved yet is amber "not confirmed": never failed, and it says not to add the time by hand yet', () => {
    const tree = review(ready([]));
    expect(text(card(tree, 'paused'))).toContain('Nothing is saved for this code yet');
    expect(text(tree)).toContain('Don’t add the time by hand yet.'); expect(text(tree)).not.toMatch(/failed|This punch was saved/i);
    expect(card(tree, 'failed')).toBeUndefined();
  });
  it('more than one record for a code is a conflict: amber, each record listed, look before changing anything', () => {
    const tree = review(ready([receipt(1), receipt(2)]));
    expect(text(card(tree, 'paused'))).toContain('This code has more than one record');
    expect(text(tree)).toContain('Look at each one with the person before you change anything in Timecards.');
    expect(all(tree).filter(node => node.props.className === 'b-li')).toHaveLength(3);
    expect(card(tree, 'done')).toBeUndefined();
  });
  it('loading, offline, session ended and failed are each one state card with the next step', () => {
    expect(text(card(review(null, {loading: true}), 'loading'))).toContain('Checking the code…');
    const offline = review({state: 'unavailable', reason: 'offline'});
    expect(text(card(offline, 'offline'))).toContain('Keep the code and check again when you’re back online.'); expect(card(offline, 'offline')?.props.role).toBe('alert');
    const denied = review({state: 'unavailable', reason: 'access_denied'});
    expect(text(card(denied, 'locked'))).toContain('Sign in again, then check this code.'); expect(all(denied).some(node => node.props.href === '/login')).toBe(true);
    expect(text(card(review({state: 'unavailable', reason: 'read_failed'}), 'failed'))).toContain('Couldn’t check the code');
  });
  it('a wrong code shows the one error style on the field', () => {
    const tree = review(null, {invalid: clockerOwnerCopy.en.lookupPattern});
    const error = all(tree).find(node => node.props.className === 'ck-field__e')!;
    expect(text(error).trim()).toBe('Enter the whole code from the tablet, with its dashes'); expect(error.props.role).toBe('alert');
    const input = all(tree).find(node => node.type === 'input')!;
    expect(input.props['aria-invalid']).toBe(true); expect(String(input.props['aria-describedby'])).toContain(String(error.props.id));
  });
  it('Spanish: every result leaks no English sentence', () => {
    const english = Object.values(clockerOwnerCopy.en).filter((value): value is string => typeof value === 'string' && value.length > 12);
    for (const tree of [review(ready([receipt(1)]), {lang: 'es'}), review(ready([]), {lang: 'es'}), review(ready([receipt(1), receipt(2)]), {lang: 'es'}), review(null, {loading: true, lang: 'es'}),
      review({state: 'unavailable', reason: 'offline'}, {lang: 'es'}), review({state: 'unavailable', reason: 'access_denied'}, {lang: 'es'}), review({state: 'unavailable', reason: 'read_failed'}, {lang: 'es'}), review(null, {invalid: clockerOwnerCopy.es.lookupPattern, lang: 'es'})])
      for (const line of english) expect(text(tree), line).not.toContain(line);
    expect(text(review(ready([receipt(1)]), {lang: 'es'}))).toContain('Este ponche se guardó'); expect(text(review(ready([receipt(1)]), {lang: 'es'}))).toContain('James Ortiz · Salida');
  });
});

describe('help requests', () => {
  const page = (rows: unknown[]): OwnerReviewRequestsResult => ({state: 'ready', requests: rows as never, nextCursor: null, observedAt: '2026-11-17T20:10:00.000Z', validForMs: 15000});
  const ana = {requestId: 'r-1', commandId: code, requesterId: 'a', requesterName: 'Ana Colon', deviceName: 'Front counter tablet', locationName: 'Calle Loíza', requestedAt: '2026-11-17T20:01:00.000000Z'};
  const luis = {...ana, requestId: 'r-2', commandId: null, requesterName: 'Luis Torres'};
  it('each person is a row: who, where and when, a tinted Check and a quiet Fix in Timecards', () => {
    const onSelect = rs.fn(), tree = requests(page([ana, luis]), false, 'en', onSelect);
    expect(text(tree)).toContain('Ana Colon'); expect(text(tree)).toContain('Calle Loíza · Front counter tablet');
    const check = all(tree).find(node => node.props['aria-label'] === 'Check Ana Colon’s saved punch')!;
    expect(check.props.className).toBe('b-btn b-btn--ghost'); (check.props.onClick as () => void)(); expect(onSelect).toHaveBeenCalledWith(code);
    // Without a code there is nothing to check: the row says so and offers Timecards only.
    expect(all(tree).some(node => node.props['aria-label'] === 'Check Luis Torres’s saved punch')).toBe(false);
    expect(text(tree)).toContain('No code was kept');
    expect(all(tree).filter(node => String(node.props.className) === 'b-btn b-btn--quiet ck-text' && node.props.href === '/app/timecards')).toHaveLength(2);
    // The request's id is never shown.
    expect(text(tree)).not.toContain('r-1');
  });
  it('loading, empty, offline and failed are each designed', () => {
    expect(text(card(requests(null, true), 'loading'))).toContain('Checking for requests…');
    expect(text(card(requests(page([])), 'empty'))).toContain('No one needs help right now');
    expect(text(card(requests({state: 'unavailable', reason: 'offline'}), 'offline'))).toContain('Help requests load again when you’re back online.');
    const failed = requests({state: 'unavailable', reason: 'read_failed'});
    expect(text(card(failed, 'failed'))).toContain('Couldn’t load help requests'); expect(card(failed, 'failed')?.props.role).toBe('alert');
  });
  it('Spanish leaks no English sentence', () => {
    const english = Object.values(clockerOwnerCopy.en).filter((value): value is string => typeof value === 'string' && value.length > 8);
    for (const tree of [requests(page([ana, luis]), false, 'es'), requests(null, true, 'es'), requests(page([]), false, 'es'), requests({state: 'unavailable', reason: 'offline'}, false, 'es'), requests({state: 'unavailable', reason: 'read_failed'}, false, 'es')])
      for (const line of english) expect(text(tree), line).not.toContain(line);
    expect(text(requests(page([ana]), false, 'es'))).toContain('Solicitudes de ayuda');
  });
});
