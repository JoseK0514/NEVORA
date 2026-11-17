import {describe, expect, it} from 'vitest';
import {buildCommand, canSend, frozen, initialReminder, parseReminderResponse, reduceReminder, sameReminder, type ReminderCommand, type ReminderOutcome, type ReminderState, type ReminderTarget} from './machine';
import {lookupFlow, sendFlow} from './flows';
import type {ReminderTransport} from './client';

const AUTH = 'a'.repeat(64), ID = '11111111-1111-4111-8111-111111111111', ID2 = '22222222-2222-4222-8222-222222222222', NOTE = '33333333-3333-4333-8333-333333333333';
const target: ReminderTarget = {employeeId: 'fictional-ana', name: 'Ana Colon', source: {kind: 'AVAILABILITY', weekStart: '2026-11-23', expectedDeadline: '2026-11-20T21:00:00.000Z'}};
const command = buildCommand(target, AUTH, ID);
const readyBody = {status: 'ready', canQueue: true, scope: 'COMPANY', targetEmployeeId: 'fictional-ana', observedAt: '2026-11-17T15:00:00.000Z', dueAt: '2026-11-17T15:00:00.000Z', expiresAt: '2026-11-20T21:00:00.000Z', timeZone: 'America/Puerto_Rico'};
const ready: ReminderOutcome = {kind: 'ready', dueAt: readyBody.dueAt, expiresAt: readyBody.expiresAt, timeZone: readyBody.timeZone, observedAt: readyBody.observedAt};
const receipt: ReminderOutcome = {kind: 'committed', operationId: ID, notificationId: NOTE, disposition: 'queued'};
const at = '2026-11-17T19:02:00.000Z';
const run = (events: Parameters<typeof reduceReminder>[1][], from: ReminderState = initialReminder(command)) => events.reduce(reduceReminder, from);
const readyState = () => run([{type: 'eligibility', outcome: ready}]);
const unknownState = () => run([{type: 'send'}, {type: 'sent', outcome: {kind: 'unknown'}, at}], readyState());

describe('reminder command', () => {
  it('builds the closed contract body for each kind and nothing else', () => {
    expect(command).toEqual({kind: 'AVAILABILITY', operationId: ID, authority: AUTH, employeeId: 'fictional-ana', weekStart: '2026-11-23', expectedDeadline: '2026-11-20T21:00:00.000Z'});
    expect(buildCommand({employeeId: 'fictional-ana', name: 'Ana', source: {kind: 'COMMUNICATION', communicationId: ID2, expectedRevisionId: NOTE}}, AUTH, ID))
      .toEqual({kind: 'COMMUNICATION', operationId: ID, authority: AUTH, employeeId: 'fictional-ana', communicationId: ID2, expectedRevisionId: NOTE});
  });
  it('treats the same person, source and session as the same reminder whatever the id', () => {
    expect(sameReminder(command, buildCommand(target, AUTH, ID2))).toBe(true);
    expect(sameReminder(command, buildCommand({...target, source: {kind: 'AVAILABILITY', weekStart: '2026-11-23', expectedDeadline: '2026-11-21T21:00:00.000Z'}}, AUTH, ID2))).toBe(false);
    expect(sameReminder(command, buildCommand(target, 'b'.repeat(64), ID))).toBe(false);
    expect(sameReminder(command, buildCommand({...target, source: {kind: 'COMMUNICATION', communicationId: ID2, expectedRevisionId: NOTE}}, AUTH, ID))).toBe(false);
  });
});

describe('reading the server answers', () => {
  const parse = (request: 'eligibility' | 'send' | 'lookup', status: number, body: unknown, reference: string | null = null) => parseReminderResponse(request, status, body, command, reference);
  it('reads ready, cooldown and a prior receipt from the eligibility read', () => {
    expect(parse('eligibility', 200, readyBody)).toEqual(ready);
    expect(parse('eligibility', 200, {status: 'cooldown', canQueue: false, reason: 'daily_budget_used', nextEligibleAt: '2026-11-18T01:00:00.000Z'})).toEqual({kind: 'cooldown', nextEligibleAt: '2026-11-18T01:00:00.000Z'});
    expect(parse('eligibility', 200, {status: 'cooldown', canQueue: false, reason: 'daily_budget_used', nextEligibleAt: null})).toEqual({kind: 'cooldown', nextEligibleAt: null});
    expect(parse('eligibility', 200, {status: 'committed', operationId: ID, notificationId: NOTE, disposition: 'already_queued'})).toEqual({...receipt, disposition: 'already_queued'});
  });
  it('reads held, module off, blocked, signed out, stale and both conflicts', () => {
    expect(parse('eligibility', 503, {status: 'held', reason: 'activation_held'})).toEqual({kind: 'held', reason: 'activation_held'});
    expect(parse('eligibility', 404, {status: 'unavailable', reason: 'module_off'})).toEqual({kind: 'held', reason: 'module_off'});
    expect(parse('send', 404, {status: 'unavailable', reason: 'module_off'})).toEqual({kind: 'held', reason: 'module_off'});
    expect(parse('eligibility', 403, {status: 'blocked', reason: 'access_denied'})).toEqual({kind: 'blocked', reason: 'access_denied'});
    expect(parse('eligibility', 401, {status: 'blocked', reason: 'access_denied'})).toEqual({kind: 'blocked', reason: 'signed_out'});
    expect(parse('eligibility', 403, {status: 'blocked', reason: 'invalid_command'})).toEqual({kind: 'blocked', reason: 'invalid_command'});
    expect(parse('eligibility', 409, {status: 'conflict', reason: 'source_or_operation_changed'})).toEqual({kind: 'conflict', reason: 'changed'});
    expect(parse('eligibility', 409, {status: 'conflict', reason: 'source_expires_before_delivery'})).toEqual({kind: 'conflict', reason: 'expires_first'});
  });
  it('does not retire a dispatched command on a refusal from the post-commit response fence', () => {
    for (const [status,body] of [[403,{status:'blocked',reason:'access_denied'}],[409,{status:'conflict',reason:'source_or_operation_changed'}]] as const)
      expect(parse('send',status,body)).toEqual({kind:'unknown'});
  });
  it('a failed read is a failed check, with the support reference only when it is a real one', () => {
    expect(parse('eligibility', 503, {status: 'unavailable', reason: 'read_failed'}, NOTE)).toEqual({kind: 'failed', reference: NOTE});
    expect(parse('eligibility', 503, {status: 'unavailable', reason: 'read_failed'}, 'not-a-reference')).toEqual({kind: 'failed', reference: null});
    expect(parse('eligibility', 0, null)).toEqual({kind: 'failed', reference: null});
    expect(parse('eligibility', 200, {...readyBody, targetEmployeeId: 'someone-else'})).toEqual({kind: 'failed', reference: null});
    expect(parse('eligibility', 200, {...readyBody, dueAt: 'soon'})).toEqual({kind: 'failed', reference: null});
  });
  it('a command answer that is lost, unreadable, outcome_unknown or unavailable is unknown, never failed', () => {
    for (const [status, body] of [[0, null], [502, 'bad gateway'], [503, {status: 'outcome_unknown', operationId: ID}], [503, {status: 'unavailable', reason: 'read_failed'}], [200, {status: 'ready'}], [200, []]] as const)
      expect(parse('send', status, body)).toEqual({kind: 'unknown'});
  });
  it('a receipt counts only for the command it was asked about', () => {
    expect(parse('send', 200, {status: 'committed', operationId: ID, notificationId: NOTE, disposition: 'queued'})).toEqual(receipt);
    expect(parse('send', 200, {status: 'committed', operationId: ID2, notificationId: NOTE, disposition: 'queued'})).toEqual({kind: 'unknown'});
    expect(parse('send', 200, {status: 'committed', operationId: ID, notificationId: NOTE, disposition: 'delivered'})).toEqual({kind: 'unknown'});
    expect(parse('lookup', 200, {status: 'committed', operationId: ID2, notificationId: NOTE, disposition: 'queued'})).toEqual({kind: 'unknown'});
  });
  it('a lookup tells "no such command" apart from "could not look"', () => {
    expect(parse('lookup', 503, {status: 'unavailable', reason: 'operation_not_found'})).toEqual({kind: 'not_found'});
    expect(parse('lookup', 503, {status: 'unavailable', reason: 'operation_unavailable'})).toEqual({kind: 'unknown'});
    expect(parse('send', 503, {status: 'unavailable', reason: 'operation_not_found'})).toEqual({kind: 'unknown'});
    expect(parse('lookup', 403, {status: 'blocked', reason: 'access_denied'})).toEqual({kind: 'blocked', reason: 'access_denied'});
  });
});

describe('reminder state machine', () => {
  it('starts by checking and takes each eligibility answer to its state', () => {
    expect(initialReminder(command)).toEqual({phase: 'checking', command});
    expect(readyState()).toEqual({phase: 'ready', command, dueAt: ready.dueAt, expiresAt: ready.expiresAt, timeZone: ready.timeZone});
    expect(run([{type: 'eligibility', outcome: {kind: 'cooldown', nextEligibleAt: null}}])).toEqual({phase: 'cooldown', command, nextEligibleAt: null});
    expect(run([{type: 'eligibility', outcome: receipt}])).toEqual({phase: 'queued', command, operationId: ID, notificationId: NOTE, disposition: 'queued', at: null});
    expect(run([{type: 'eligibility', outcome: {kind: 'held', reason: 'activation_held'}}])).toEqual({phase: 'held', command, reason: 'activation_held', kept: false});
    expect(run([{type: 'eligibility', outcome: {kind: 'blocked', reason: 'access_denied'}}])).toEqual({phase: 'blocked', command, reason: 'access_denied'});
    expect(run([{type: 'eligibility', outcome: {kind: 'conflict', reason: 'changed'}}])).toEqual({phase: 'conflict', command, reason: 'changed'});
    expect(run([{type: 'eligibility', outcome: {kind: 'failed', reference: NOTE}}])).toEqual({phase: 'error', command, reference: NOTE});
    expect(run([{type: 'eligibility', outcome: {kind: 'unknown'}}])).toEqual({phase: 'error', command, reference: null});
  });
  it('only a ready person counts and can be sent', () => {
    expect(canSend(readyState())).toBe(true);
    for (const outcome of [{kind: 'cooldown', nextEligibleAt: null}, {kind: 'held', reason: 'activation_held'}, {kind: 'blocked', reason: 'access_denied'}, {kind: 'conflict', reason: 'changed'}, {kind: 'failed', reference: null}] as ReminderOutcome[]) {
      const state = run([{type: 'eligibility', outcome}]);
      expect(canSend(state)).toBe(false);
      expect(reduceReminder(state, {type: 'send'})).toBe(state);
    }
    expect(canSend(initialReminder(command))).toBe(false);
    expect(canSend(undefined)).toBe(false);
  });
  it('send freezes the command; each definite answer lands on its state', () => {
    const sending = run([{type: 'send'}], readyState());
    expect(sending).toEqual({phase: 'sending', command});
    expect(frozen(sending)).toBe(true);
    expect(reduceReminder(sending, {type: 'sent', outcome: receipt, at})).toEqual({phase: 'queued', command, operationId: ID, notificationId: NOTE, disposition: 'queued', at});
    expect(reduceReminder(sending, {type: 'sent', outcome: {...receipt, disposition: 'already_queued'} as ReminderOutcome, at})).toMatchObject({phase: 'queued', disposition: 'already_queued', at: null});
    expect(reduceReminder(sending, {type: 'sent', outcome: {kind: 'held', reason: 'module_off'}, at})).toEqual({phase: 'held', command, reason: 'module_off', kept: false});
    expect(reduceReminder(sending, {type: 'sent', outcome: {kind: 'blocked', reason: 'signed_out'}, at})).toEqual({phase: 'blocked', command, reason: 'signed_out'});
    expect(reduceReminder(sending, {type: 'sent', outcome: {kind: 'conflict', reason: 'expires_first'}, at})).toEqual({phase: 'conflict', command, reason: 'expires_first'});
  });
  it('an uncertain send is unknown and keeps the original command and id', () => {
    for (const outcome of [{kind: 'unknown'}, {kind: 'failed', reference: null}, {kind: 'not_found'}, ready] as ReminderOutcome[]) {
      const state = run([{type: 'send'}, {type: 'sent', outcome, at}], readyState());
      expect(state).toEqual({phase: 'unknown', command, looking: false, note: 'first'});
      expect(state.command.operationId).toBe(ID);
    }
  });
  it('while unknown nothing can replace, resend or re-read the command: only its lookup moves it', () => {
    const unknown = unknownState();
    expect(frozen(unknown)).toBe(true);
    expect(reduceReminder(unknown, {type: 'send'})).toBe(unknown);
    expect(reduceReminder(unknown, {type: 'recheck'})).toBe(unknown);
    expect(reduceReminder(unknown, {type: 'eligibility', outcome: ready})).toBe(unknown);
    expect(reduceReminder(unknown, {type: 'source', command: buildCommand({...target, source: {kind: 'AVAILABILITY', weekStart: '2026-11-23', expectedDeadline: '2026-11-21T21:00:00.000Z'}}, AUTH, ID2)})).toBe(unknown);
    expect(reduceReminder(unknown, {type: 'looked', outcome: receipt})).toBe(unknown);
  });
  it('the lookup resolves unknown to queued, not sent or held, or leaves it unknown', () => {
    const looking = reduceReminder(unknownState(), {type: 'lookup', asked: true});
    expect(looking).toEqual({phase: 'unknown', command, looking: true, note: 'first', asked: true});
    expect(reduceReminder(looking, {type: 'lookup'})).toBe(looking);
    expect(reduceReminder(looking, {type: 'looked', outcome: receipt})).toEqual({phase: 'queued', command, operationId: ID, notificationId: NOTE, disposition: 'queued', at: null});
    expect(reduceReminder(looking, {type: 'looked', outcome: {kind: 'not_found'}})).toEqual({phase: 'not_sent', command});
    expect(reduceReminder(looking, {type: 'looked', outcome: {kind: 'held', reason: 'activation_held'}})).toEqual({phase: 'held', command, reason: 'activation_held', kept: true});
    expect(reduceReminder(looking, {type: 'looked', outcome: {kind: 'unknown'}})).toEqual({phase: 'unknown', command, looking: false, note: 'still'});
    expect(reduceReminder(looking, {type: 'looked', outcome: {kind: 'conflict', reason: 'changed'}})).toEqual({phase: 'unknown', command, looking: false, note: 'still'});
    expect(reduceReminder(looking, {type: 'looked', outcome: {kind: 'blocked', reason: 'signed_out'}})).toEqual({phase: 'unknown', command, looking: false, note: 'access'});
    const auto = reduceReminder(unknownState(), {type: 'lookup', asked: false});
    expect(reduceReminder(auto, {type: 'looked', outcome: {kind: 'unknown'}})).toEqual({phase: 'unknown', command, looking: false, note: 'first'});
  });
  it('a confirmed "nothing was queued" replays the exact original body and id', () => {
    const notSent: ReminderState = {phase: 'not_sent', command};
    expect(frozen(notSent)).toBe(true);
    const again = reduceReminder(notSent, {type: 'send'});
    expect(again).toEqual({phase: 'sending', command});
    expect(again.command).toBe(command);
    expect(reduceReminder(notSent, {type: 'source', command: buildCommand(target, 'b'.repeat(64), ID2)})).toBe(notSent);
  });
  it('a hold that answered a lookup keeps the id through a re-check', () => {
    const held: ReminderState = {phase: 'held', command, reason: 'activation_held', kept: true};
    expect(frozen(held)).toBe(true);
    const checking = reduceReminder(held, {type: 'recheck'});
    expect(checking).toEqual({phase: 'checking', command, kept: true});
    expect(reduceReminder(checking, {type: 'source', command: buildCommand({...target, source: {kind: 'AVAILABILITY', weekStart: '2026-11-23', expectedDeadline: '2026-11-21T21:00:00.000Z'}}, AUTH, ID2)})).toBe(checking);
    expect(reduceReminder(checking, {type: 'eligibility', outcome: receipt})).toMatchObject({phase: 'queued', operationId: ID});
    expect(reduceReminder(checking, {type: 'eligibility', outcome: {kind: 'held', reason: 'activation_held'}})).toEqual(held);
  });
  it('queued is final here: no resend, no re-read, no replacement', () => {
    const queued = run([{type: 'send'}, {type: 'sent', outcome: receipt, at}], readyState());
    for (const event of [{type: 'send'}, {type: 'recheck'}, {type: 'lookup'}, {type: 'source', command: buildCommand(target, 'b'.repeat(64), ID2)}] as const) expect(reduceReminder(queued, event)).toBe(queued);
  });
  it('a re-check reads the same command again; a changed source is a new reminder with a new id', () => {
    const conflict = run([{type: 'eligibility', outcome: {kind: 'conflict', reason: 'changed'}}]);
    expect(reduceReminder(conflict, {type: 'recheck'})).toEqual({phase: 'checking', command, kept: false});
    const moved = buildCommand({...target, source: {kind: 'AVAILABILITY', weekStart: '2026-11-23', expectedDeadline: '2026-11-21T21:00:00.000Z'}}, AUTH, ID2);
    expect(reduceReminder(conflict, {type: 'source', command: moved})).toEqual({phase: 'checking', command: moved});
    // The same source keeps its command (and id) through a page refresh.
    expect(reduceReminder(readyState(), {type: 'source', command: buildCommand(target, AUTH, ID2)}).command.operationId).toBe(ID);
    expect(reduceReminder(run([{type: 'eligibility', outcome: {kind: 'failed', reference: null}}]), {type: 'recheck'})).toMatchObject({phase: 'checking'});
  });
  it('ignores answers that arrive in the wrong state', () => {
    const state = readyState();
    expect(reduceReminder(state, {type: 'eligibility', outcome: {kind: 'cooldown', nextEligibleAt: null}})).toBe(state);
    expect(reduceReminder(state, {type: 'sent', outcome: receipt, at})).toBe(state);
    expect(reduceReminder(state, {type: 'lookup'})).toBe(state);
    expect(reduceReminder(state, {type: 'looked', outcome: receipt})).toBe(state);
  });
});

describe('send and lookup sequences', () => {
  function harness(answers: Partial<Record<'send' | 'lookup', ReminderOutcome[]>>) {
    let state: ReminderState = readyState();
    const calls: {request: string; command: ReminderCommand}[] = [];
    const transport: ReminderTransport = async (request, sent) => { calls.push({request, command: sent}); return answers[request as 'send' | 'lookup']?.shift() ?? {kind: 'unknown'}; };
    const apply = (event: Parameters<typeof reduceReminder>[1]) => (state = reduceReminder(state, event));
    return {calls, transport, apply, get: () => state};
  }
  it('queues with one request and stamps the time', async () => {
    const h = harness({send: [receipt]});
    await sendFlow(h.apply, h.transport, () => at);
    expect(h.get()).toMatchObject({phase: 'queued', at, operationId: ID});
    expect(h.calls.map(call => call.request)).toEqual(['send']);
  });
  it('unknown path: keeps the original id, looks it up once on its own, then only when asked, and never posts again', async () => {
    const h = harness({send: [{kind: 'unknown'}], lookup: [{kind: 'unknown'}, {kind: 'unknown'}, receipt]});
    await sendFlow(h.apply, h.transport, () => at);
    expect(h.get()).toEqual({phase: 'unknown', command, looking: false, note: 'first'});
    await lookupFlow(h.apply, h.transport);
    expect(h.get()).toMatchObject({phase: 'unknown', note: 'still'});
    await lookupFlow(h.apply, h.transport);
    expect(h.get()).toMatchObject({phase: 'queued', at: null, operationId: ID});
    expect(h.calls.map(call => call.request)).toEqual(['send', 'lookup', 'lookup', 'lookup']);
    expect(h.calls.every(call => call.command === command && call.command.operationId === ID)).toBe(true);
    // Nothing more to do once it is queued.
    await sendFlow(h.apply, h.transport); await lookupFlow(h.apply, h.transport);
    expect(h.calls).toHaveLength(4);
  });
  it('unknown path: "no such command" becomes not sent, and Send again replays the same body and id', async () => {
    const h = harness({send: [{kind: 'unknown'}, receipt], lookup: [{kind: 'not_found'}]});
    await sendFlow(h.apply, h.transport, () => at);
    expect(h.get()).toEqual({phase: 'not_sent', command});
    await sendFlow(h.apply, h.transport, () => at);
    expect(h.get()).toMatchObject({phase: 'queued', operationId: ID});
    expect(h.calls.map(call => [call.request, call.command.operationId])).toEqual([['send', ID], ['lookup', ID], ['send', ID]]);
    expect(h.calls[2].command).toEqual(h.calls[0].command);
  });
  it('unknown path: a hold on the lookup shows held and keeps the id', async () => {
    const h = harness({send: [{kind: 'unknown'}], lookup: [{kind: 'held', reason: 'activation_held'}]});
    await sendFlow(h.apply, h.transport, () => at);
    expect(h.get()).toEqual({phase: 'held', command, reason: 'activation_held', kept: true});
  });
  it('does nothing unless the person is ready', async () => {
    const h = harness({});
    h.apply({type: 'send'}); h.apply({type: 'sent', outcome: {kind: 'blocked', reason: 'access_denied'}, at});
    await sendFlow(h.apply, h.transport); await lookupFlow(h.apply, h.transport);
    expect(h.calls).toHaveLength(0);
    expect(h.get()).toMatchObject({phase: 'blocked'});
  });
});
