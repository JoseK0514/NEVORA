import {afterEach, beforeEach, expect, it, vi} from 'vitest';

const hooks = vi.hoisted(() => ({
  states: [] as unknown[], refs: [] as {current: unknown}[],
  effects: [] as (() => void | (() => void))[], stateIndex: 0, refIndex: 0,
}));
vi.mock('react', async original => ({
  ...await original<Record<string, unknown>>(),
  useState: (initial: unknown) => {
    const index = hooks.stateIndex++;
    if (!(index in hooks.states)) hooks.states[index] = initial;
    return [hooks.states[index], (value: unknown) => {hooks.states[index] = value;}];
  },
  useRef: (initial: unknown) => {
    const index = hooks.refIndex++;
    return hooks.refs[index] ??= {current: initial};
  },
  useEffect: (effect: () => void | (() => void)) => {hooks.effects.push(effect);},
  useId: () => 'reference-fixture',
  useSyncExternalStore: (_subscribe: unknown, snapshot: () => unknown) => snapshot(),
}));
vi.mock('gsap', () => ({default: {registerPlugin: () => {}}}));
vi.mock('@gsap/react', () => ({useGSAP: () => {}}));

import {ClockerRecoveryReview} from './clocker-recovery-review';

type Element = {type: unknown; props: Record<string, unknown>};
function isElement(value: unknown): value is Element {
  return value !== null && typeof value === 'object' && 'type' in value && 'props' in value;
}
function find(value: unknown, type: string): Element | undefined {
  if (Array.isArray(value)) return value.map(item => find(item, type)).find(Boolean);
  if (!isElement(value)) return;
  return value.type === type ? value : find(value.props.children, type);
}
function render() {
  hooks.stateIndex = 0; hooks.refIndex = 0; hooks.effects = [];
  return ClockerRecoveryReview({actorId: 'QAOWNER', timeZone: 'America/Puerto_Rico'});
}
function change(value: string) {
  const input = find(render(), 'input');
  if (!input) throw Error('Reference input missing');
  (input.props.onChange as (event: {target: {value: string}}) => void)({target: {value}});
}
function submit() {
  const form = find(render(), 'form');
  if (!form) throw Error('Review form missing');
  (form.props.onSubmit as (event: {preventDefault(): void}) => void)({preventDefault() {}});
}
const first = '4a9c7ed1-9b42-4dc0-8847-324d7ade7832';
const second = 'bb8a042e-044c-4205-9aab-23a87511e789';
const requests: string[] = [];
let dispose: (() => void) | void;
beforeEach(() => {
  hooks.states = []; hooks.refs = []; requests.length = 0;
  vi.stubGlobal('window', new EventTarget());
  vi.stubGlobal('document', Object.assign(new EventTarget(), {visibilityState: 'visible'}));
  vi.stubGlobal('navigator', {onLine: true});
  vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
    const {commandId} = JSON.parse(String(init.body));
    requests.push(commandId);
    return {ok: true, status: 200, json: async () => ({
      state: 'ready', commandId, receipts: [], validForMs: 15000, observedAt: new Date().toISOString(),
    })};
  });
  render();
  dispose = hooks.effects[0]();
});
afterEach(() => {dispose?.(); dispose = undefined; vi.unstubAllGlobals();});
const observed = () => hooks.states.some(value => value && typeof value === 'object' && 'state' in value && value.state === 'ready');

it('editing a reference retires its receipt before a lifecycle refresh can read it again', async () => {
  change(first); submit();
  await vi.waitFor(() => expect(observed()).toBe(true));
  expect(requests).toEqual([first]);
  change(second);
  window.dispatchEvent(new Event('storage'));
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  expect(requests).toEqual([first]);
  expect(observed()).toBe(false);
  submit();
  await vi.waitFor(() => expect(requests).toEqual([first, second]));
});

it('uppercase references are normalized to the server command format', async () => {
  change(first.toUpperCase()); submit();
  await vi.waitFor(() => expect(requests).toEqual([first]));
});

it('offline submission explains unavailability without starting a request', async () => {
  change(first);
  vi.stubGlobal('navigator', {onLine: false});
  window.dispatchEvent(new Event('offline'));
  submit();
  expect(requests).toEqual([]);
  expect(hooks.states).toContainEqual({state: 'unavailable', reason: 'offline'});
});
