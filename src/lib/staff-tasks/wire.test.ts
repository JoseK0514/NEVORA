import { describe, expect, it } from 'vitest';
import { parseTaskCommandResult, parseTaskResource } from './wire';
import type { StaffTask, StaffTaskCommand, TaskContextResult, TaskDetailResult, TaskDraft, TaskListResult } from './types';

const operationId = 'aaaaaaaa-0000-4000-8000-000000000001';
const templateId = 'aaaaaaaa-0000-4000-8000-000000000002';
const taskId = 'aaaaaaaa-0000-4000-8000-000000000003';
const itemId = 'aaaaaaaa-0000-4000-8000-000000000004';
const otherId = 'aaaaaaaa-0000-4000-8000-000000000005';
const authority = 'a'.repeat(64);
const observedAt = '2026-11-11T12:00:00.000Z';
const envelope = { state: 'ready' as const, authority, observedAt, validForMs: 15000 };
const draft = (): TaskDraft => ({ title: 'Close store', description: 'Check doors\nTurn off lights', locationId: 'location-1', assigneeId: 'employee-1', checklist: [{ id: itemId, label: 'Lock door' }], schedule: { frequency: 'DAILY', startDate: '2026-11-11', endDate: null, weekdays: [], dueTime: '18:00' }, reminderMinutesBefore: 30 });
const task = (): StaffTask => ({ id: taskId, templateId, businessDate: '2026-11-11', locationId: 'location-1', assigneeId: 'employee-1', title: 'Close store', description: 'Check doors\nTurn off lights', checklist: [{ id: itemId, label: 'Lock door' }], checkedItemIds: [], dueAt: '2026-11-11T22:00:00.000Z', revision: 1, status: 'OPEN', completedBy: null, completedAt: null, assigneeActive: true, reminder: { id: taskId + ':1', dueAt: '2026-11-11T21:30:00.000Z', unread: true } });
const context = (): Extract<TaskContextResult, { state: 'ready' }> => ({ ...envelope, management: true, timeZone: 'America/Puerto_Rico', locations: [{ id: 'location-1', name: 'Main Store' }], employees: [{ id: 'employee-1', firstName: 'Ana', lastName: 'Rivera', primaryLocationId: 'location-1', eligibleLocationIds: ['location-1', 'location-2'] }], hasMore: false, nextEmployeeCursor: null, nextLocationCursor: null });
const list = (): Extract<TaskListResult, { state: 'ready' }> => ({ ...envelope, tasks: [task()], templates: [{ id: templateId, revision: 1, draft: draft(), archived: false, nextDate: '2026-11-12' }], timeZone: 'America/Puerto_Rico', hasMore: false, nextTaskCursor: null, nextTemplateCursor: null });
const detail = (): Extract<TaskDetailResult, { state: 'ready' }> => ({ ...envelope, task: task(), events: [{ id: otherId, kind: 'MATERIALIZE', actorId: 'employee-1', createdAt: '2026-11-11T11:59:00.000Z', data: { businessDate: '2026-11-11' } }], historyTruncated: false, nextHistoryCursor: null });
const create: StaffTaskCommand = { operationId, authority, kind: 'CREATE_TEMPLATE', templateId, draft: draft() };
const complete: StaffTaskCommand = { operationId, authority, kind: 'COMPLETE', taskId, expectedRevision: 1 };
const sync: StaffTaskCommand = { operationId, authority, kind: 'SYNC_TEMPLATE', templateId, expectedRevision: 1 };
const receipt = { status: 'committed' as const, operationId, templateId, revision: 2 };
const syncReceipt = { ...receipt, createdCount: 1, nextDate: '2026-11-12', more: false };

function rejectsTask(patch: Record<string, unknown>) {
  expect(() => parseTaskResource({ ...list(), tasks: [{ ...task(), ...patch }] }, authority)).toThrow();
  expect(() => parseTaskResource({ ...detail(), task: { ...task(), ...patch } }, authority)).toThrow();
}

describe('staff task resource wire contract', () => {
  it('bounds nested context eligibility with five-person pages while retaining continuation', () => {
    const five = {...context(), employees: Array.from({length: 5}, (_, n) => ({...context().employees[0], id: 'employee-' + n})), hasMore: true, nextEmployeeCursor: 'employee-4'};
    expect(parseTaskResource(five, authority)).toMatchObject({employees: expect.any(Array), nextEmployeeCursor: 'employee-4'});
    expect(() => parseTaskResource({...five, employees: [...five.employees, {...context().employees[0], id: 'employee-5'}], nextEmployeeCursor: 'employee-5'}, authority)).toThrow();
  });
  it('admits complete context, list and detail fixtures without dropping meaningful nested data', () => {
    expect(parseTaskResource(context(), authority)).toMatchObject({ management: true, employees: [{ id: 'employee-1', eligibleLocationIds: ['location-1', 'location-2'] }], locations: [{ name: 'Main Store' }] });
    expect(parseTaskResource(list(), authority)).toMatchObject({ tasks: [{ checklist: [{ id: itemId, label: 'Lock door' }], reminder: { id: taskId + ':1', unread: true } }], templates: [{ draft: { schedule: { frequency: 'DAILY', dueTime: '18:00' } } }] });
    expect(parseTaskResource(detail(), authority)).toMatchObject({ task: { id: taskId }, events: [{ kind: 'MATERIALIZE', actorId: 'employee-1', data: { businessDate: '2026-11-11' } }] });
  });
  it('preserves explicit roster/list/history truncation and legitimate empty observations', () => {
    expect(parseTaskResource({ ...context(), hasMore: true, nextEmployeeCursor: 'employee-1' }, authority)).toMatchObject({ hasMore: true });
    expect(parseTaskResource({ ...list(), hasMore: true, nextTaskCursor: {businessDate: '2026-11-11', id: taskId} }, authority)).toMatchObject({ hasMore: true });
    expect(parseTaskResource({ ...detail(), historyTruncated: true, nextHistoryCursor: {createdAt: '2026-11-11T11:59:00.000001Z', id: otherId} }, authority)).toMatchObject({ historyTruncated: true });
    expect(parseTaskResource({ ...context(), management: false, employees: [], locations: [] }, authority)).toMatchObject({ employees: [], locations: [], management: false });
    expect(parseTaskResource({ ...list(), tasks: [], templates: [] }, authority)).toMatchObject({ tasks: [], templates: [] });
    expect(parseTaskResource({ ...detail(), events: [] }, authority)).toMatchObject({ events: [] });
  });
  it.each([0, -1, 15001, 1.5, '15000'])('rejects invalid observation lifetime %j', validForMs => expect(() => parseTaskResource({ ...list(), validForMs }, authority)).toThrow());
  it('rejects foreign authority, extra fields, missing ready data and false completeness flags', () => {
    for (const value of [{ ...list(), authority: 'b'.repeat(64) }, { ...list(), privateSecret: 'forged' }, envelope, { ...list(), hasMore: 'false' }, { ...detail(), historyTruncated: 0 }, { ...context(), management: 'true' }]) expect(() => parseTaskResource(value, authority)).toThrow();
    for (const factory of [context, list, detail]) for (const key of Object.keys(factory())) { const value = { ...factory() } as Record<string, unknown>; delete value[key]; expect(() => parseTaskResource(value, authority)).toThrow(); }
  });
  it.each(['', 'Fake/Zone', '+04:00', ' America/Puerto_Rico '])('rejects non-business time zone %j', timeZone => {
    expect(() => parseTaskResource({ ...context(), timeZone }, authority)).toThrow();
    expect(() => parseTaskResource({ ...list(), timeZone }, authority)).toThrow();
  });
  it('rejects invalid context employee/location nested fields', () => {
    const good = context();
    for (const patch of [{ id: '../employee' }, { firstName: 12 }, { lastName: 'x'.repeat(201) }, { primaryLocationId: null }, { eligibleLocationIds: ['../location'] }, { eligibleLocationIds: 'location-1' }, { companyId: 'forged' }]) expect(() => parseTaskResource({ ...good, employees: [{ ...good.employees[0], ...patch }] }, authority)).toThrow();
    for (const patch of [{ id: '' }, { name: null }, { name: 'x'.repeat(201) }, { secret: true }]) expect(() => parseTaskResource({ ...good, locations: [{ ...good.locations[0], ...patch }] }, authority)).toThrow();
  });
  it('rejects invalid template snapshots and cursors', () => {
    const good = list();
    for (const patch of [{ id: 'not-uuid' }, { revision: 0 }, { archived: 0 }, { nextDate: '2026-02-30' }, { draft: { ...draft(), title: '' } }, { draft: { ...draft(), schedule: { ...draft().schedule, timeZone: 'UTC' } } }, { extra: true }]) expect(() => parseTaskResource({ ...good, templates: [{ ...good.templates[0], ...patch }] }, authority)).toThrow();
    expect(parseTaskResource({ ...good, templates: [{ ...good.templates[0], archived: true, nextDate: null }] }, authority)).toMatchObject({ templates: [{ archived: true, nextDate: null }] });
  });
  it.each([
    { id: 'bad' }, { templateId: 'bad' }, { businessDate: '2026-02-30' }, { locationId: '../location' }, { assigneeId: '' }, { title: '' }, { title: 'a'.repeat(121) }, { description: 'a'.repeat(2001) }, { revision: 0 }, { revision: 2147483648 }, { assigneeActive: 1 }, { extra: true },
  ])('rejects malformed task snapshot %j in both list and detail', rejectsTask);
  it('rejects checked IDs outside the checklist, duplicates, and malformed checklist entries', () => {
    for (const patch of [{ checkedItemIds: [otherId] }, { checkedItemIds: [itemId, itemId] }, { checkedItemIds: 'all' }, { checklist: [{ id: itemId, label: '' }] }, { checklist: [{ id: itemId, label: 'A' }, { id: itemId.toUpperCase(), label: 'B' }] }, { checklist: [{ id: itemId, label: 'A', checked: true }] }]) rejectsTask(patch);
    expect(parseTaskResource({ ...detail(), task: { ...task(), status: 'IN_PROGRESS', checkedItemIds: [itemId] } }, authority)).toMatchObject({ task: { status: 'IN_PROGRESS', checkedItemIds: [itemId] } });
  });
  it('requires completion actor/time together and suppresses reminders for completed or cancelled tasks', () => {
    const done = { ...task(), status: 'COMPLETED', completedBy: 'employee-1', completedAt: observedAt, checkedItemIds: [itemId], reminder: null };
    expect(parseTaskResource({ ...detail(), task: done }, authority)).toMatchObject({ task: { status: 'COMPLETED', completedBy: 'employee-1', completedAt: observedAt, reminder: null } });
    for (const patch of [{ ...done, completedBy: null }, { ...done, completedAt: null }, { ...done, reminder: task().reminder }, { completedBy: 'employee-1' }, { completedAt: observedAt }, { status: 'CANCELLED', reminder: task().reminder }]) rejectsTask(patch);
    expect(parseTaskResource({ ...detail(), task: { ...task(), status: 'CANCELLED', reminder: null } }, authority)).toMatchObject({ task: { status: 'CANCELLED' } });
  });
  it.each(['UNKNOWN', ['OPEN'], { toString: () => 'OPEN' }])('rejects invalid/coerced task status %j', status => rejectsTask({ status }));
  it.each([otherId + ':1', taskId + ':0', taskId + ':01', taskId + ':-1', taskId + ':1.5', taskId + ':2147483648', taskId + ':9999999999'])('rejects malformed or out-of-range reminder generation %s', id => rejectsTask({ reminder: { ...task().reminder, id } }));
  it('accepts valid reminder acknowledgement/generation and rejects malformed reminder types', () => {
    expect(parseTaskResource({ ...detail(), task: { ...task(), reminder: { id: taskId + ':2147483647', dueAt: observedAt, unread: false } } }, authority)).toMatchObject({ task: { reminder: { unread: false } } });
    rejectsTask({ reminder: { ...task().reminder, unread: 'false' } });
    rejectsTask({ reminder: { ...task().reminder, extra: true } });
  });
  it.each(['not-a-date', '2026-11-11T12:00:00-04:00', '2026-11-11T12:00:00+00:00', '2026-02-30T12:00:00Z', '2026-11-11T24:00:00Z', '2026-11-11T12:00:60Z'])('rejects invalid or non-Z public instant %s at each nested boundary', instant => {
    expect(() => parseTaskResource({ ...list(), observedAt: instant }, authority)).toThrow();
    rejectsTask({ dueAt: instant });
    rejectsTask({ reminder: { ...task().reminder, dueAt: instant } });
    rejectsTask({ status: 'COMPLETED', checkedItemIds: [itemId], completedBy: 'employee-1', completedAt: instant, reminder: null });
    const good = detail(); expect(() => parseTaskResource({ ...good, events: [{ ...good.events[0], createdAt: instant }] }, authority)).toThrow();
  });
  it.each([{ id: 'bad' }, { actorId: '../outside' }, { kind: 'DELETE' }, { kind: ['COMMENT'] }, { data: [] }, { data: null }, { privateHash: 'forged' }])('rejects malformed event %j', patch => {
    const good = detail(); expect(() => parseTaskResource({ ...good, events: [{ ...good.events[0], ...patch }] }, authority)).toThrow();
  });
  it('enforces bounded lists, context rosters and event histories even with truncation flags', () => {
    const good = context();
    for (const value of [{ ...list(), tasks: Array(101).fill(task()), hasMore: true }, { ...list(), templates: Array(101).fill(list().templates[0]), hasMore: true }, { ...good, employees: Array(101).fill(good.employees[0]), hasMore: true }, { ...good, locations: Array(101).fill(good.locations[0]), hasMore: true }, { ...detail(), events: Array(101).fill(detail().events[0]), historyTruncated: true }]) expect(() => parseTaskResource(value, authority)).toThrow();
  });
});

describe('staff task committed wire receipts', () => {
  it('admits CREATE, task mutation, SYNC, and identity-only recovery without private payload data', () => {
    expect(parseTaskCommandResult(receipt, operationId, create)).toEqual(receipt);
    expect(parseTaskCommandResult({ ...receipt, taskId }, operationId, complete)).toEqual({ ...receipt, taskId });
    expect(parseTaskCommandResult(syncReceipt, operationId, sync)).toEqual(syncReceipt);
    expect(parseTaskCommandResult({ ...receipt, createdCount: 0, nextDate: null, more: false }, operationId, sync)).toMatchObject({ createdCount: 0, nextDate: null, more: false });
    expect(parseTaskCommandResult(receipt, operationId)).toEqual(receipt);
    expect(parseTaskCommandResult({ ...receipt, taskId }, operationId)).toEqual({ ...receipt, taskId });
    expect(parseTaskCommandResult({ ...receipt, operationId: operationId.toUpperCase(), templateId: templateId.toUpperCase() }, operationId, create)).toMatchObject({ status: 'committed' });
  });
  it.each(['invalid', 'blocked', 'conflict', 'unavailable'])('preserves explicit %s failure without committing', status => expect(parseTaskCommandResult({ status, reason: 'access_denied' }, operationId)).toEqual({ status, reason: 'access_denied' }));
  it('binds outcome_unknown to the submitted operation without accepting extra data', () => {
    expect(parseTaskCommandResult({ status: 'outcome_unknown', operationId }, operationId)).toEqual({ status: 'outcome_unknown', operationId });
    expect(parseTaskCommandResult({ status: 'outcome_unknown', operationId: otherId }, operationId)).toBeNull();
    expect(parseTaskCommandResult({ status: 'outcome_unknown', operationId, task: task() }, operationId)).toBeNull();
  });
  it.each([{ operationId: otherId }, { operationId: 'bad' }, { templateId: null }, { templateId: 'bad' }, { revision: 0 }, { revision: '2' }, { revision: 2147483648 }, { taskId: 'bad' }, { task: task() }, { status: ['committed'] }])('rejects malformed receipt %j including recovery', patch => {
    expect(parseTaskCommandResult({ ...receipt, ...patch }, operationId)).toBeNull();
    expect(parseTaskCommandResult({ ...receipt, ...patch }, operationId, create)).toBeNull();
  });
  it('requires the full receipt identity and revision', () => {
    for (const key of Object.keys(receipt)) { const value = { ...receipt } as Record<string, unknown>; delete value[key]; expect(parseTaskCommandResult(value, operationId)).toBeNull(); }
  });
  it('rejects wrong command target and receipt group', () => {
    for (const [value, command] of [[{ ...receipt, templateId: otherId }, create], [{ ...receipt, taskId }, create], [{ ...receipt, taskId: otherId }, complete], [receipt, complete], [syncReceipt, create], [receipt, sync], [{ ...syncReceipt, taskId }, complete]] as const) expect(parseTaskCommandResult(value, operationId, command)).toBeNull();
  });
  it.each([{ createdCount: -1 }, { createdCount: 32 }, { createdCount: 1.5 }, { createdCount: '1' }, { nextDate: '2026-02-30' }, { nextDate: observedAt }, { nextDate: null, more: true }, { more: 'false' }, { taskId }])('rejects invalid sync result %j', patch => {
    expect(parseTaskCommandResult({ ...syncReceipt, ...patch }, operationId, sync)).toBeNull();
    expect(parseTaskCommandResult({ ...syncReceipt, ...patch }, operationId)).toBeNull();
  });
  it('requires all sync group fields and permits zero or 31 created occurrences', () => {
    for (const key of ['createdCount', 'nextDate', 'more']) { const value = { ...syncReceipt } as Record<string, unknown>; delete value[key]; expect(parseTaskCommandResult(value, operationId, sync)).toBeNull(); }
    expect(parseTaskCommandResult({ ...syncReceipt, createdCount: 31, more: true }, operationId, sync)).toMatchObject({ createdCount: 31, more: true });
  });
  it.each([{ status: ['blocked'], reason: 'access_denied' }, { status: 'blocked', reason: '' }, { status: 'blocked', reason: 'Unsafe reason' }, { status: 'blocked', reason: 'a'.repeat(121) }, { status: 'blocked', reason: 'access_denied', secret: true }])('rejects malformed failure envelope %j', value => expect(parseTaskCommandResult(value, operationId)).toBeNull());
});
