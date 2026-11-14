import { describe, expect, it } from 'vitest';
import { parseTaskDraft, parseStaffTaskCommand, parseTaskQuery, parseTaskHistoryQuery, parseTaskContextQuery, planTaskOccurrences } from './model';
import type { StaffTaskCommand, TaskDraft } from './types';

const id = 'abcdef01-2345-4678-9abc-0123456789ab';
const secondId = 'abcdef02-2345-4678-9abc-0123456789ab';
const identity = { operationId: id, authority: 'a'.repeat(64) };
const draft = (): TaskDraft => ({ title: 'Open shop', description: 'First line\nSecond line', locationId: 'location_1', assigneeId: 'employee-1', checklist: [{ id, label: 'Unlock door' }], schedule: { frequency: 'DAILY', startDate: '2024-02-28', endDate: null, weekdays: [], dueTime: '09:00' }, reminderMinutesBefore: 30 });
const query = () => ({ fromDate: '2024-02-01', toDate: '2024-03-02', view: 'MINE', locationId: null });
const commands: StaffTaskCommand[] = [
  { ...identity, kind: 'CREATE_TEMPLATE', templateId: id, draft: draft() },
  { ...identity, kind: 'REVISE_TEMPLATE', templateId: id, expectedRevision: 1, draft: draft() },
  ...(['ARCHIVE_TEMPLATE', 'SYNC_TEMPLATE'] as const).map(kind => ({ ...identity, kind, templateId: id, expectedRevision: 1 })),
  { ...identity, kind: 'CHECK_ITEM', taskId: id, expectedRevision: 1, itemId: id, checked: true },
  ...(['COMPLETE', 'REOPEN', 'CANCEL', 'ACK_REMINDER'] as const).map(kind => ({ ...identity, kind, taskId: id, expectedRevision: 1 })),
  { ...identity, kind: 'REASSIGN', taskId: id, expectedRevision: 1, assigneeId: 'employee-2' },
  { ...identity, kind: 'COMMENT', taskId: id, expectedRevision: 1, body: 'Ready\nFor review' },
];

describe('staff task validation', () => {
  it('accepts bounded drafts and copies nested caller data', () => {
    const input = draft(); const result = parseTaskDraft(input);
    expect(result).toEqual(input); input.checklist[0].label = 'Changed'; input.schedule.weekdays.push(1);
    expect(result?.checklist[0].label).toBe('Unlock door'); expect(result?.schedule.weekdays).toEqual([]);
    expect(parseTaskDraft({ ...draft(), description: '', checklist: [], reminderMinutesBefore: null })).not.toBeNull();
    expect(parseTaskDraft({ ...draft(), title: 'a'.repeat(120), description: 'a'.repeat(2000), reminderMinutesBefore: 1440 })).not.toBeNull();
  });
  it.each([null, [], '', 1, true, {}, undefined])('rejects non-draft input %j', input => expect(parseTaskDraft(input)).toBeNull());
  it.each(['', ' ', ' leading', 'trailing ', 'a\nb', 'a\tb', 'a\rb', 'a\u0000b', 'a\u007fb', 'a\u0085b', 'a\u202eb', 'a\u2066b', 'a\u200bb', 'a\u00a0b', 'a'.repeat(121)])('rejects unsafe title %j', title => expect(parseTaskDraft({ ...draft(), title })).toBeNull());
  it.each(['\n', ' text', 'text ', 'a\tb', 'a\rb', 'a\u2028b', 'a\u202eb', 'a'.repeat(2001)])('rejects unsafe multiline description %j', description => expect(parseTaskDraft({ ...draft(), description })).toBeNull());
  it.each(['', '../id', 'a b', 'a/b', 'a.b', 'a'.repeat(129), '\u202eid'])('rejects unsafe scope IDs %j', value => {
    expect(parseTaskDraft({ ...draft(), locationId: value })).toBeNull();
    expect(parseTaskDraft({ ...draft(), assigneeId: value })).toBeNull();
  });
  it.each([-1, 1441, 0.5, '30', NaN, Infinity, undefined])('rejects invalid reminder %j', reminderMinutesBefore => expect(parseTaskDraft({ ...draft(), reminderMinutesBefore })).toBeNull());
  it('rejects checklist duplicates including UUID casing and invalid labels/IDs', () => {
    expect(parseTaskDraft({ ...draft(), checklist: [{ id, label: 'A' }, { id: id.toUpperCase(), label: 'B' }] })).toBeNull();
    for (const item of [{ id: 'bad', label: 'A' }, { id, label: '' }, { id, label: 'a'.repeat(121) }, { id, label: 'a\nb' }, { id, label: 'A', checked: true }]) expect(parseTaskDraft({ ...draft(), checklist: [item] })).toBeNull();
    const checklist = Array.from({ length: 30 }, (_, i) => ({ id: `${i.toString(16).padStart(8, '0')}-2345-4678-9abc-0123456789ab`, label: 'A' }));
    expect(parseTaskDraft({ ...draft(), checklist })).not.toBeNull();
    expect(parseTaskDraft({ ...draft(), checklist: [...checklist, { id: secondId, label: 'B' }] })).toBeNull();
  });
  it('rejects missing/extra keys at each object boundary and non-JSON forgery', () => {
    const input = draft();
    for (const key of Object.keys(input)) { const value = { ...input } as Record<string, unknown>; delete value[key]; expect(parseTaskDraft(value)).toBeNull(); }
    for (const value of [{ ...input, completed: true }, { ...input, schedule: { ...input.schedule, timeZone: 'UTC' } }, Object.assign(Object.create({ inherited: true }), input), { ...input, [Symbol('extra')]: true }, { ...input, toJSON: () => draft() }]) expect(parseTaskDraft(value)).toBeNull();
    expect(parseTaskDraft(Object.defineProperty({ ...input }, 'title', { get() { throw Error('getter'); } }))).toBeNull();
    expect(parseTaskDraft({ ...input, checklist: new Array(1) })).toBeNull();
    expect(parseTaskDraft({ ...input, checklist: Object.assign([], { hidden: true }) })).toBeNull();
  });
  it.each(['2023-02-29', '1900-02-29', '2100-02-29', '2024-04-31', '2024-13-01', '2024-00-01', '2024-01-00', '1899-12-31', '2101-01-01', '2024-2-01', '2024-02-28T00:00:00Z'])('rejects invalid exact date %s', startDate => expect(parseTaskDraft({ ...draft(), schedule: { ...draft().schedule, startDate } })).toBeNull());
  it.each(['24:00', '23:60', '1:00', '09:00:00', '09:00Z'])('rejects invalid exact time %s', dueTime => expect(parseTaskDraft({ ...draft(), schedule: { ...draft().schedule, dueTime } })).toBeNull());
  it('requires ordered date ranges and frequency-specific unique weekdays', () => {
    for (const schedule of [ { ...draft().schedule, endDate: '2024-02-27' }, { ...draft().schedule, frequency: 'MONTHLY' }, { ...draft().schedule, weekdays: [1] }, ...[[], [1, 1], [-1], [7], [0.5], ['1']].map(weekdays => ({ ...draft().schedule, frequency: 'WEEKLY', weekdays })) ]) expect(parseTaskDraft({ ...draft(), schedule })).toBeNull();
    expect(parseTaskDraft({ ...draft(), schedule: { ...draft().schedule, frequency: 'WEEKLY', weekdays: [6, 0, 1], endDate: '2024-02-28' } })).not.toBeNull();
  });
  it('rejects coerced frequency objects rather than accepting their string conversion', () => {
    expect(parseTaskDraft({ ...draft(), schedule: { ...draft().schedule, frequency: { toString: () => 'DAILY' } } })).toBeNull();
    expect(parseTaskDraft({ ...draft(), schedule: { ...draft().schedule, frequency: ['DAILY'] } })).toBeNull();
  });
  it('admits exactly 16384 UTF-8 bytes but rejects a larger command envelope', () => {
    const input = { ...draft(), description: '', checklist: Array.from({ length: 30 }, (_, i) => ({ id: `${i.toString(16).padStart(8, '0')}-2345-4678-9abc-0123456789ab`, label: '漢'.repeat(120) })) };
    const remaining = 16384 - new TextEncoder().encode(JSON.stringify(input)).length;
    input.description = '漢'.repeat(Math.floor(remaining / 3)) + 'a'.repeat(remaining % 3);
    expect(input.description.length).toBeLessThanOrEqual(2000);
    expect(new TextEncoder().encode(JSON.stringify(input))).toHaveLength(16384);
    expect(parseTaskDraft(input)).not.toBeNull();
    expect(parseTaskDraft({ ...input, description: input.description + 'a' })).toBeNull();
    expect(parseStaffTaskCommand({ ...identity, kind: 'CREATE_TEMPLATE', templateId: id, draft: input })).toBeNull();
  });
  it('enforces UTF-8 serialized bytes rather than character count', () => {
    const input = { ...draft(), description: '漢'.repeat(2000), checklist: Array.from({ length: 30 }, (_, i) => ({ id: `${i.toString(16).padStart(8, '0')}-2345-4678-9abc-0123456789ab`, label: '漢'.repeat(120) })) };
    expect(JSON.stringify(input).length).toBeLessThan(16384);
    expect(new TextEncoder().encode(JSON.stringify(input)).length).toBeGreaterThan(16384);
    expect(parseTaskDraft(input)).toBeNull();
    expect(parseStaffTaskCommand({ ...identity, kind: 'CREATE_TEMPLATE', templateId: id, draft: input })).toBeNull();
  });
  it.each(commands)('accepts $kind and rejects missing/extra fields', command => {
    expect(parseStaffTaskCommand(command)).toEqual(command);
    for (const key of Object.keys(command)) { const input = { ...command } as Record<string, unknown>; delete input[key]; expect(parseStaffTaskCommand(input)).toBeNull(); }
    expect(parseStaffTaskCommand({ ...command, companyId: 'forged' })).toBeNull();
  });
  it('rejects malformed command identities, revisions and variant fields', () => {
    const base = commands[4];
    for (const patch of [{ operationId: 'bad' }, { authority: 'a'.repeat(63) }, { authority: 'g'.repeat(64) }, { taskId: 'bad' }, { itemId: 'bad' }, { checked: 1 }, { expectedRevision: 0 }, { expectedRevision: -1 }, { expectedRevision: 1.5 }, { expectedRevision: 2147483648 }, { expectedRevision: '1' }, { kind: 'DELETE' }]) expect(parseStaffTaskCommand({ ...base, ...patch })).toBeNull();
    expect(parseStaffTaskCommand({ ...base, expectedRevision: 2147483647, checked: false })).not.toBeNull();
    expect(parseStaffTaskCommand({ ...commands[9], assigneeId: '../outside' })).toBeNull();
    for (const body of ['', ' ', 'a'.repeat(2001), 'a\u202eb']) expect(parseStaffTaskCommand({ ...commands[10], body })).toBeNull();
    expect(parseStaffTaskCommand({ ...commands[10], body: 'a'.repeat(2000) })).not.toBeNull();
  });
  it('normalizes UUID case without mutating inputs', () => {
    expect(parseStaffTaskCommand({ ...commands[4], operationId: id.toUpperCase(), itemId: id.toUpperCase(), taskId: id.toUpperCase() })).toEqual(commands[4]);
    expect(parseTaskDraft({ ...draft(), checklist: [{ id: id.toUpperCase(), label: 'Unlock door' }] })).toEqual(draft());
  });
  it('bounds query ranges inclusively and rejects scope forgery', () => {
    expect(parseTaskQuery(query())).toEqual(query());
    expect(parseTaskQuery({ ...query(), view: 'TEAM', locationId: 'location-1' })).not.toBeNull();
    for (const patch of [{ toDate: '2024-03-03' }, { toDate: '2024-01-31' }, { fromDate: '2023-02-29' }, { view: 'ALL' }, { locationId: '' }, { locationId: '../id' }, { employeeId: 'forged' }]) expect(parseTaskQuery({ ...query(), ...patch })).toBeNull();
    for (const key of Object.keys(query())) { const input = { ...query() } as Record<string, unknown>; delete input[key]; expect(parseTaskQuery(input)).toBeNull(); }
  });
});

describe('staff task calendar planner', () => {
  it('includes leap day, computes UTC deadlines and subtracts elapsed reminder minutes', () => {
    expect(planTaskOccurrences(draft(), '2024-02-28', '2024-03-01', 'America/Puerto_Rico')).toEqual({ occurrences: [
      { businessDate: '2024-02-28', dueAt: '2024-02-28T13:00:00Z', reminderAt: '2024-02-28T12:30:00Z' },
      { businessDate: '2024-02-29', dueAt: '2024-02-29T13:00:00Z', reminderAt: '2024-02-29T12:30:00Z' },
      { businessDate: '2024-03-01', dueAt: '2024-03-01T13:00:00Z', reminderAt: '2024-03-01T12:30:00Z' },
    ], nextDate: '2024-03-02', more: false });
  });
  it('uses Sunday zero and advances over nonselected weekdays', () => {
    const input = draft(); input.schedule.frequency = 'WEEKLY'; input.schedule.weekdays = [0, 4];
    const result = planTaskOccurrences(input, '2024-02-28', '2024-03-04', 'UTC');
    expect(result.occurrences.map(value => value.businessDate)).toEqual(['2024-02-29', '2024-03-03']);
    expect(result.nextDate).toBe('2024-03-05'); expect(result.more).toBe(false);
  });
  it('limits work to 31 calendar days even when most weekdays are not selected', () => {
    const input = draft(); input.schedule.frequency = 'WEEKLY'; input.schedule.weekdays = [0];
    const result = planTaskOccurrences(input, '2024-02-28', '2024-12-31', 'UTC');
    expect(result.occurrences.map(value => value.businessDate)).toEqual(['2024-03-03', '2024-03-10', '2024-03-17', '2024-03-24']);
    expect(result.nextDate).toBe('2024-03-30'); expect(result.more).toBe(true);
    const next = planTaskOccurrences(input, result.nextDate!, '2024-12-31', 'UTC');
    expect(next.nextDate).toBe('2024-04-30');
    expect(next.occurrences[0].businessDate).toBe('2024-03-31');
  });
  it('finite repeated chunks cover a long stale daily backlog without duplication', () => {
    const input = draft(); input.schedule.startDate = '2023-01-01'; input.schedule.endDate = '2024-03-01';
    let cursor: string | null = input.schedule.startDate; const dates: string[] = []; let calls = 0;
    while (cursor && calls < 20) { const result = planTaskOccurrences(input, cursor, '2024-03-01', 'UTC'); expect(result.occurrences.length).toBeLessThanOrEqual(31); dates.push(...result.occurrences.map(value => value.businessDate)); cursor = result.nextDate; calls++; }
    expect(cursor).toBeNull(); expect(calls).toBe(14); expect(dates).toHaveLength(426); expect(new Set(dates).size).toBe(426); expect(dates.at(-1)).toBe('2024-03-01');
  });
  it('stops at inclusive end date and never rewinds a cursor', () => {
    const input = draft(); input.schedule.endDate = '2024-02-29';
    expect(planTaskOccurrences(input, '2024-02-29', '2024-03-31', 'UTC')).toMatchObject({ occurrences: [{ businessDate: '2024-02-29' }], nextDate: null, more: false });
    expect(planTaskOccurrences(input, '2024-03-01', '2024-03-31', 'UTC')).toEqual({ occurrences: [], nextDate: null, more: false });
    expect(planTaskOccurrences(draft(), '2024-03-02', '2024-03-01', 'UTC')).toEqual({ occurrences: [], nextDate: '2024-03-02', more: false });
    expect(planTaskOccurrences(draft(), '2024-01-01', '2024-02-01', 'UTC')).toEqual({ occurrences: [], nextDate: '2024-02-28', more: false });
  });
  it('materializes ONCE only on start date and finishes its cursor', () => {
    const input = draft(); input.schedule.frequency = 'ONCE'; input.reminderMinutesBefore = null;
    expect(planTaskOccurrences(input, '2024-02-01', '2024-03-01', 'UTC')).toEqual({ occurrences: [{ businessDate: '2024-02-28', dueAt: '2024-02-28T09:00:00Z', reminderAt: null }], nextDate: null, more: false });
    expect(planTaskOccurrences(input, '2024-02-29', '2024-03-01', 'UTC')).toEqual({ occurrences: [], nextDate: null, more: false });
    expect(planTaskOccurrences(input, '2024-02-01', '2024-02-27', 'UTC')).toEqual({ occurrences: [], nextDate: '2024-02-28', more: false });
  });
  it.each([
    ['2024-03-10', '02:30', '2024-03-10T07:30:00Z'],
    ['2024-11-03', '01:30', '2024-11-03T05:30:00Z'],
  ])('resolves DST compatibly for %s %s', (date, time, dueAt) => {
    const input = draft(); input.schedule.startDate = date; input.schedule.dueTime = time; input.reminderMinutesBefore = 0;
    expect(planTaskOccurrences(input, date, date, 'america/new_york').occurrences).toEqual([{ businessDate: date, dueAt, reminderAt: dueAt }]);
  });
  it('keeps a constant business wall time across a DST transition', () => {
    const input = draft(); input.schedule.startDate = '2024-03-09'; input.reminderMinutesBefore = 1440;
    expect(planTaskOccurrences(input, '2024-03-09', '2024-03-11', 'America/New_York').occurrences.map(value => [value.dueAt, value.reminderAt])).toEqual([
      ['2024-03-09T14:00:00Z', '2024-03-08T14:00:00Z'], ['2024-03-10T13:00:00Z', '2024-03-09T13:00:00Z'], ['2024-03-11T13:00:00Z', '2024-03-10T13:00:00Z'],
    ]);
  });
  it.each(['', 'Fake/Zone', '+04:00', ' America/New_York ', '2024-01-01T00:00[UTC]'])('rejects invalid/non-IANA zone %j', zone => expect(() => planTaskOccurrences(draft(), '2024-02-28', '2024-03-01', zone)).toThrow('INVALID_STAFF_TASK_PLAN'));
  it('rejects malformed planner dates/draft and stops at supported date ceiling', () => {
    expect(() => planTaskOccurrences(draft(), '2024-02-30', '2024-03-01', 'UTC')).toThrow('INVALID_STAFF_TASK_PLAN');
    expect(() => planTaskOccurrences({ ...draft(), title: '' }, '2024-02-28', '2024-03-01', 'UTC')).toThrow('INVALID_STAFF_TASK_PLAN');
    expect(planTaskOccurrences(draft(), '2100-12-31', '2100-12-31', 'UTC')).toMatchObject({ nextDate: null, more: false });
  });
});


describe('staff task keyset queries', () => {
  it('keeps the old four-field output when cursors are absent', () => {
    expect(parseTaskQuery(query())).toEqual(query());
    expect(Object.keys(parseTaskQuery(query())!)).toHaveLength(4);
  });
  it('round-trips optional null cursors and independently supplied cursor fields', () => {
    expect(parseTaskQuery({ ...query(), taskCursor: null })).toEqual({ ...query(), taskCursor: null });
    expect(parseTaskQuery({ ...query(), templateCursor: null })).toEqual({ ...query(), templateCursor: null });
    expect(parseTaskQuery({ ...query(), taskCursor: null, templateCursor: null })).toEqual({ ...query(), taskCursor: null, templateCursor: null });
    expect(parseTaskQuery({ ...query(), templateCursor: id.toUpperCase() })).toEqual({ ...query(), templateCursor: id });
  });
  it('copies the task keyset and normalizes both cursor UUIDs', () => {
    const input = { ...query(), taskCursor: { businessDate: '2024-02-29', id: id.toUpperCase() }, templateCursor: secondId.toUpperCase() };
    const parsed = parseTaskQuery(input);
    expect(parsed).toEqual({ ...query(), taskCursor: { businessDate: '2024-02-29', id }, templateCursor: secondId });
    input.taskCursor.businessDate = '2024-03-01';
    expect(parsed?.taskCursor?.businessDate).toBe('2024-02-29');
  });
  it.each(['2024-02-01', '2024-03-02'])('allows inclusive query cursor boundary %s', businessDate => {
    expect(parseTaskQuery({ ...query(), taskCursor: { businessDate, id } })).toEqual({ ...query(), taskCursor: { businessDate, id } });
  });
  it.each([
    undefined, 'cursor', [], {}, { businessDate: '2024-02-29' }, { id },
    { businessDate: '2024-02-30', id }, { businessDate: '2024-01-31', id }, { businessDate: '2024-03-03', id },
    { businessDate: '2024-02-29T00:00:00Z', id }, { businessDate: '2024-02-29', id: '../task' },
    { businessDate: '2024-02-29', id, extra: true },
  ])('rejects malformed or out-of-period task cursor %j', taskCursor => expect(parseTaskQuery({ ...query(), taskCursor })).toBeNull());
  it.each([undefined, '', '../template', {}, 1])('rejects malformed explicit template cursor %j', templateCursor => expect(parseTaskQuery({ ...query(), templateCursor })).toBeNull());
  it('retains exact top-level admission with optional cursor fields', () => {
    expect(parseTaskQuery({ ...query(), taskCursor: null, templateCursor: null, cursor: id })).toBeNull();
    const input = { ...query(), taskCursor: null } as Record<string, unknown>; delete input.view;
    expect(parseTaskQuery(input)).toBeNull();
    expect(parseTaskQuery({ ...query(), taskCursor: Object.assign(Object.create({ inherited: true }), { businessDate: '2024-02-29', id }) })).toBeNull();
    expect(parseTaskQuery(Object.defineProperty({ ...query() }, 'taskCursor', { enumerable: true, get() { throw Error('getter'); } }))).toBeNull();
  });
  it('rejects cursor accessors without evaluating caller code during size measurement', () => {
    let calls = 0;
    const taskCursor = Object.defineProperty({ id }, 'businessDate', { enumerable: true, get() { calls++; return '2024-02-29'; } });
    expect(parseTaskQuery({ ...query(), taskCursor })).toBeNull();
    expect(calls).toBe(0);
  });
  it('admits the first history page without a cursor and canonicalizes its task ID', () => {
    expect(parseTaskHistoryQuery({ taskId: id.toUpperCase(), beforeCursor: null })).toEqual({ taskId: id, beforeCursor: null });
  });
  it.each(['2026-11-11T12:00:00Z', '2026-11-11T12:00:00.1Z', '2026-11-11T12:00:00.12Z', '2026-11-11T12:00:00.123Z', '2026-11-11T12:00:00.1234Z', '2026-11-11T12:00:00.12345Z', '2026-11-11T12:00:00.123456Z', '2026-11-11T12:00:00.000001Z', '2026-11-11T12:00:00.123000Z', '2024-02-29T23:59:59.999999Z'])('preserves exact SQL history cursor precision %s', createdAt => {
    const beforeCursor = { createdAt, id: secondId.toUpperCase() };
    const parsed = parseTaskHistoryQuery({ taskId: id, beforeCursor });
    expect(parsed).toEqual({ taskId: id, beforeCursor: { createdAt, id: secondId } });
    beforeCursor.createdAt = '2026-11-12T00:00:00Z';
    expect(parsed?.beforeCursor?.createdAt).toBe(createdAt);
  });
  it.each(['2026-02-30T12:00:00Z', '2023-02-29T12:00:00Z', '2026-11-11T24:00:00Z', '2026-11-11T12:60:00Z', '2026-11-11T12:00:60Z', '2026-11-11T12:00:00.1234567Z', '2026-11-11T12:00:00.Z', '2026-11-11T12:00:00+00:00', '2026-11-11T12:00:00-04:00', '2026-11-11T12:00:00z', '2026-11-11T12:00:00', '2026-11-11'])('rejects invalid or noncanonical history timestamp %s', createdAt => {
    expect(parseTaskHistoryQuery({ taskId: id, beforeCursor: { createdAt, id: secondId } })).toBeNull();
  });
  it.each([null, [], {}, { taskId: id }, { beforeCursor: null }, { taskId: '../task', beforeCursor: null }, { taskId: id, beforeCursor: undefined }, { taskId: id, beforeCursor: null, extra: true }, { taskId: id, beforeCursor: {} }, { taskId: id, beforeCursor: { createdAt: '2026-11-11T12:00:00Z', id: 'bad' } }, { taskId: id, beforeCursor: { createdAt: '2026-11-11T12:00:00Z', id: secondId, extra: true } }])('rejects malformed history query %j', input => expect(parseTaskHistoryQuery(input)).toBeNull());
});


describe('staff task context keyset query', () => {
  it('accepts initial null cursors and independent legacy text cursor IDs', () => {
    for (const input of [
      { employeeCursor: null, locationCursor: null },
      { employeeCursor: 'Employee_101', locationCursor: null },
      { employeeCursor: null, locationCursor: 'Location-101' },
      { employeeCursor: 'Employee_101', locationCursor: 'Location-101' },
      { employeeCursor: id.toUpperCase(), locationCursor: 'A'.repeat(128) },
    ]) expect(parseTaskContextQuery(input)).toEqual(input);
  });
  it('preserves case-sensitive text IDs and copies the query', () => {
    const input = { employeeCursor: 'Employee_UPPER', locationCursor: 'Location_UPPER' };
    const parsed = parseTaskContextQuery(input); input.employeeCursor = 'changed';
    expect(parsed).toEqual({ employeeCursor: 'Employee_UPPER', locationCursor: 'Location_UPPER' });
  });
  it.each([undefined, '', '../id', 'id/part', 'id.part', ' id', 'id ', 'id with space', 'id\u202e', 'a'.repeat(129), 123, {}, []])('rejects invalid or oversized safe cursor ID %j', value => {
    expect(parseTaskContextQuery({ employeeCursor: value, locationCursor: null })).toBeNull();
    expect(parseTaskContextQuery({ employeeCursor: null, locationCursor: value })).toBeNull();
  });
  it.each([null, [], '', {}, { employeeCursor: null }, { locationCursor: null }, { employeeCursor: null, locationCursor: null, authority: 'forged' }])('requires exactly both context cursor keys %j', input => expect(parseTaskContextQuery(input)).toBeNull());
  it('rejects prototype, symbol and accessor forgery without invoking accessors', () => {
    const good = { employeeCursor: null, locationCursor: null };
    expect(parseTaskContextQuery(Object.assign(Object.create({ inherited: true }), good))).toBeNull();
    expect(parseTaskContextQuery({ ...good, [Symbol('hidden')]: true })).toBeNull();
    let calls = 0;
    expect(parseTaskContextQuery(Object.defineProperty({ ...good }, 'employeeCursor', { enumerable: true, get() { calls++; return 'Employee_101'; } }))).toBeNull();
    expect(calls).toBe(0);
  });
});
