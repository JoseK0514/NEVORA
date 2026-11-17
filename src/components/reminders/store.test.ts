import {describe, expect, it} from 'vitest';
import {createReminderStore, reminderKey} from './store';
import {lookupFlow, sendFlow} from './flows';
import type {ReminderOutcome, ReminderTarget} from './machine';
import type {ReminderTransport} from './client';

const AUTH = 'a'.repeat(64), NOTE = '33333333-3333-4333-8333-333333333333';
const person = (id: string, deadline = '2026-11-20T21:00:00.000Z'): ReminderTarget => ({employeeId: id, name: id, source: {kind: 'AVAILABILITY', weekStart: '2026-11-23', expectedDeadline: deadline}});
const ids = () => { let n = 0; return () => `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`; };
const ready: ReminderOutcome = {kind: 'ready', dueAt: '2026-11-17T15:00:00.000Z', expiresAt: '2026-11-20T21:00:00.000Z', timeZone: 'America/Puerto_Rico', observedAt: '2026-11-17T15:00:00.000Z'};

describe('the tab-level reminder store', () => {
  it('starts each person at "checking" with their own command id and tells its listeners', () => {
    const store = createReminderStore(), mint = ids();
    let woke = 0; const stop = store.subscribe(() => { woke += 1; });
    const keys = store.adopt([person('ana'), person('luis')], AUTH, mint);
    expect([...keys.keys()]).toEqual(['ana', 'luis']);
    const [a, b] = [...keys.values()].map(key => store.get(key)!);
    expect(a.phase).toBe('checking');
    expect(a.command.operationId).not.toBe(b.command.operationId);
    expect(woke).toBe(1);
    stop(); store.touch();
    expect(woke).toBe(1);
    expect(store.version()).toBe(2);
  });
  it('keys a reminder by session, source and person, not by deadline or revision', () => {
    expect(reminderKey(AUTH, person('ana'))).toBe(reminderKey(AUTH, person('ana', '2026-11-21T21:00:00.000Z')));
    expect(reminderKey(AUTH, person('ana'))).not.toBe(reminderKey('b'.repeat(64), person('ana')));
    expect(reminderKey(AUTH, person('ana'))).not.toBe(reminderKey(AUTH, person('luis')));
    expect(reminderKey(AUTH, {employeeId: 'ana', name: 'ana', source: {kind: 'COMMUNICATION', communicationId: NOTE, expectedRevisionId: NOTE}})).toContain('COMMUNICATION');
  });
  it('a page that goes away forgets what can be read again and re-reads it when it comes back', () => {
    const store = createReminderStore(), mint = ids();
    const key = store.adopt([person('ana')], AUTH, mint).get('ana')!;
    store.apply(key, {type: 'eligibility', outcome: ready});
    expect(store.get(key)?.phase).toBe('ready');
    store.release([key]);
    expect(store.get(key)).toBeUndefined();
    store.adopt([person('ana')], AUTH, mint);
    expect(store.get(key)?.phase).toBe('checking');
  });
  it('a page that is still there re-reads a person but keeps the command id while the source is the same', () => {
    const store = createReminderStore(), mint = ids();
    const key = store.adopt([person('ana')], AUTH, mint).get('ana')!, id = store.get(key)!.command.operationId;
    store.apply(key, {type: 'eligibility', outcome: {kind: 'cooldown', nextEligibleAt: null}});
    store.adopt([person('ana')], AUTH, mint);
    expect(store.get(key)).toMatchObject({phase: 'checking', command: {operationId: id}});
    store.adopt([person('ana', '2026-11-21T21:00:00.000Z')], AUTH, mint);
    expect(store.get(key)?.command.operationId).not.toBe(id);
    expect(store.get(key)?.command).toMatchObject({expectedDeadline: '2026-11-21T21:00:00.000Z'});
  });
  it('an unconfirmed command outlives the page: same body, same id, looked up by that id after the page returns', async () => {
    const store = createReminderStore(), mint = ids(), calls: [string, string][] = [];
    const answers: Record<string, ReminderOutcome[]> = {send: [{kind: 'unknown'}], lookup: [{kind: 'unknown'}, {kind: 'committed', operationId: '', notificationId: NOTE, disposition: 'queued'}]};
    const transport: ReminderTransport = async (request, command) => { calls.push([request, command.operationId]); const next = answers[request]?.shift() ?? {kind: 'unknown'}; return next.kind === 'committed' ? {...next, operationId: command.operationId} : next; };
    const key = store.adopt([person('ana')], AUTH, mint).get('ana')!;
    store.apply(key, {type: 'eligibility', outcome: ready});
    const original = store.get(key)!.command;
    await sendFlow(event => store.apply(key, event), transport);
    expect(store.get(key)).toMatchObject({phase: 'unknown', note: 'first'});
    // The app redraws the page (focus lost, lifetime over), then the page returns, even with a moved deadline.
    store.release([key]);
    expect(store.get(key)?.phase).toBe('unknown');
    store.adopt([person('ana', '2026-11-21T21:00:00.000Z')], AUTH, mint);
    expect(store.get(key)).toMatchObject({phase: 'unknown'});
    expect(store.get(key)!.command).toBe(original);
    await lookupFlow(event => store.apply(key, event), transport);
    expect(store.get(key)).toMatchObject({phase: 'queued', operationId: original.operationId, at: null});
    expect(calls).toEqual([['send', original.operationId], ['lookup', original.operationId], ['lookup', original.operationId]]);
    // Queued stays queued for this tab: it is not offered again.
    store.release([key]); store.adopt([person('ana')], AUTH, mint);
    expect(store.get(key)?.phase).toBe('queued');
  });
  it('a command in flight when the page goes away still lands on its person', async () => {
    const store = createReminderStore(), mint = ids();
    let answer: (outcome: ReminderOutcome) => void = () => {};
    const transport: ReminderTransport = (_request, command) => new Promise(resolve => { answer = outcome => resolve(outcome.kind === 'committed' ? {...outcome, operationId: command.operationId} : outcome); });
    const key = store.adopt([person('ana')], AUTH, mint).get('ana')!;
    store.apply(key, {type: 'eligibility', outcome: ready});
    const flow = sendFlow(event => store.apply(key, event), transport, () => '2026-11-17T19:02:00.000Z');
    expect(store.get(key)?.phase).toBe('sending');
    store.release([key]);
    expect(store.get(key)?.phase).toBe('sending');
    answer({kind: 'committed', operationId: '', notificationId: NOTE, disposition: 'queued'});
    await flow;
    expect(store.get(key)).toMatchObject({phase: 'queued', at: '2026-11-17T19:02:00.000Z'});
  });
  it('another session starts empty', () => {
    const store = createReminderStore(), mint = ids();
    const key = store.adopt([person('ana')], AUTH, mint).get('ana')!;
    store.apply(key, {type: 'eligibility', outcome: ready}); store.apply(key, {type: 'send'}); store.apply(key, {type: 'sent', outcome: {kind: 'unknown'}, at: ''});
    const other = store.adopt([person('ana')], 'b'.repeat(64), mint).get('ana')!;
    expect(other).not.toBe(key);
    expect(store.get(other)?.phase).toBe('checking');
    expect(store.apply('missing', {type: 'recheck'})).toBeUndefined();
  });
});
