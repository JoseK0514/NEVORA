import type { ReactElement, ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const host = vi.hoisted(() => ({ cursor: 0, mounted: false, slots: [] as { value: unknown }[], effects: [] as (() => void | (() => void))[] }));
vi.mock('react', async () => ({ ...await vi.importActual<typeof import('react')>('react'),
  useState: (initial: unknown) => { const i = host.cursor++; const slot = host.slots[i] ?? (host.slots[i] = { value: initial }); return [slot.value, (next: unknown) => { slot.value = next; }]; },
  useRef: (initial: unknown) => { const i = host.cursor++; return (host.slots[i] ?? (host.slots[i] = { value: { current: initial } })).value; },
  useCallback: (callback: unknown) => callback,
  useEffect: (effect: () => void | (() => void)) => { if (!host.mounted) host.effects.push(effect); },
}));
import { PeriodCloseHistory } from './period-close-history';
const period = { startDate: '2026-09-21', endDate: '2026-09-27' };
const body = () => ({ state: 'ready', result: { period, events: [{ id: 'event-1', manifestId: 'manifest-1', kind: 'ARTIFACT_SERVED', payload: { filename: 'PRIVATE-file.csv' }, actorId: 'PRIVATE-actor', createdAt: '2026-09-28' }], nextCursor: null, coverage: { kind: 'PAGE', order: 'createdAt DESC, id DESC', totalEvents: 1, returnedEvents: 1, hasMore: false, complete: true, through: { at: '2026-09-28', id: 'event-1' } } } });
let cleanup: void | (() => void);
function render() { host.cursor = 0; return PeriodCloseHistory({ period, actorId: 'OWNER' }); }
function nodes(v: ReactNode): ReactElement<Record<string, unknown>>[] { if (Array.isArray(v)) return v.flatMap(nodes); if (!v || typeof v !== 'object' || !('props' in v)) return []; const n = v as ReactElement<Record<string, unknown>>; return [n, ...nodes(n.props.children as ReactNode)]; }
const html = () => renderToStaticMarkup(render());
function load() { const button = nodes(render()).find(n => n.type === 'button' && n.props.children === 'Load history'); return (button!.props.onClick as () => unknown)(); }
async function mount() { render(); host.mounted = true; cleanup = host.effects[0](); }
const flush = () => vi.advanceTimersByTimeAsync(0);
beforeEach(() => { host.cursor = 0; host.mounted = false; host.slots = []; host.effects = []; vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] }); vi.stubGlobal('window', new EventTarget()); vi.stubGlobal('document', Object.assign(new EventTarget(), { visibilityState: 'visible' })); vi.stubGlobal('navigator', { onLine: true }); });
afterEach(() => { cleanup?.(); cleanup = undefined; vi.unstubAllGlobals(); vi.useRealTimers(); });

it.each(['blur', 'offline', 'pagehide', 'hidden'])('%s withdraws history and fences a pending response', async event => {
  let resolve!: (value: Response) => void;
  vi.stubGlobal('fetch', () => new Promise<Response>(r => { resolve = r; }));
  await mount(); load(); await flush();
  if (event === 'hidden') { Object.assign(document, { visibilityState: 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); } else window.dispatchEvent(new Event(event));
  resolve(Response.json(body())); await flush();
  expect(html()).not.toContain('PRIVATE'); expect(html()).toContain('History paused');
});
it('counts transit against the request-start deadline and never restores an expired response', async () => {
  let resolve!: (value: Response) => void;
  vi.stubGlobal('fetch', () => new Promise<Response>(r => { resolve = r; }));
  await mount(); load(); await vi.advanceTimersByTimeAsync(15001); resolve(Response.json(body())); await flush();
  expect(html()).not.toContain('PRIVATE'); expect(html()).toContain('History expired');
});
it('withdraws accepted history at its request-start lifetime', async () => {
  vi.stubGlobal('fetch', async () => Response.json(body())); await mount(); load(); await flush();
  expect(html()).toContain('PRIVATE'); await vi.advanceTimersByTimeAsync(15001);
  expect(html()).not.toContain('PRIVATE'); expect(html()).toContain('History expired');
});
