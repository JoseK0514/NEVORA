import { Temporal } from '@js-temporal/polyfill';
import type { StaffTaskCommand, TaskDraft, TaskOccurrencePlan, TaskQuery, TaskHistoryQuery, TaskContextQuery } from './types';

const MAX_BYTES = 16384;
const LAST_DATE = '2100-12-31';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SAFE_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
type RecordValue = Record<string, unknown>;

/** Admit only JSON-shaped own data properties, never prototypes or accessors. */
function object(value: unknown, keys: readonly string[], optional: readonly string[] = []): value is RecordValue {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) return false;
  const ownKeys = Reflect.ownKeys(value);
  return keys.every(key => Object.hasOwn(value, key)) && ownKeys.every(key =>
    typeof key === 'string' && (keys.includes(key) || optional.includes(key)) &&
    Object.getOwnPropertyDescriptor(value, key)?.enumerable === true &&
    Object.hasOwn(Object.getOwnPropertyDescriptor(value, key)!, 'value'));
}
function array(value: unknown, maximum: number): value is unknown[] {
  if (!Array.isArray(value) || value.length > maximum || Object.getPrototypeOf(value) !== Array.prototype) return false;
  const keys = Reflect.ownKeys(value);
  return keys.length === value.length + 1 && keys.every(key => key === 'length' || (
    typeof key === 'string' && /^(0|[1-9][0-9]*)$/.test(key) && Number(key) < value.length &&
    Object.getOwnPropertyDescriptor(value, key)?.enumerable === true &&
    Object.hasOwn(Object.getOwnPropertyDescriptor(value, key)!, 'value')));
}
function bounded(value: unknown): boolean {
  const serialized = JSON.stringify(value);
  return serialized !== undefined && new TextEncoder().encode(serialized).byteLength <= MAX_BYTES;
}
function text(value: unknown, maximum: number, multiline = false, empty = false): value is string {
  if (typeof value !== 'string' || value.length > maximum || (!empty && value.length === 0) || value.trim() !== value) return false;
  // LF alone is allowed in descriptions/comments. Reject other whitespace,
  // control/format characters (including bidi overrides), and lone surrogates.
  for (const character of value) {
    if (character === ' ' || (multiline && character === '\n')) continue;
    if (/[\s\p{Cc}\p{Cf}\p{Cs}]/u.test(character)) return false;
  }
  return true;
}
const uuid = (value: unknown): value is string => typeof value === 'string' && UUID.test(value);
const safeId = (value: unknown): value is string => typeof value === 'string' && SAFE_ID.test(value);
const revision = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 1 && Number(value) <= 2147483647;
function date(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01' || value > LAST_DATE) return false;
  try { return Temporal.PlainDate.from(value, { overflow: 'reject' }).toString() === value; } catch { return false; }
}
function draftValue(input: unknown): TaskDraft | null {
  if (!object(input, ['title', 'description', 'locationId', 'assigneeId', 'checklist', 'schedule', 'reminderMinutesBefore']) ||
      !text(input.title, 120) || !text(input.description, 2000, true, true) || !safeId(input.locationId) || !safeId(input.assigneeId) ||
      !array(input.checklist, 30) || (input.reminderMinutesBefore !== null &&
        (!Number.isInteger(input.reminderMinutesBefore) || Number(input.reminderMinutesBefore) < 0 || Number(input.reminderMinutesBefore) > 1440))) return null;
  const checklist: TaskDraft['checklist'] = [];
  const seen = new Set<string>();
  for (const item of input.checklist) {
    if (!object(item, ['id', 'label']) || !uuid(item.id) || !text(item.label, 120) || seen.has(item.id.toLowerCase())) return null;
    seen.add(item.id.toLowerCase());
    checklist.push({ id: item.id.toLowerCase(), label: item.label });
  }
  const schedule = input.schedule;
  if (!object(schedule, ['frequency', 'startDate', 'endDate', 'weekdays', 'dueTime']) ||
      (schedule.frequency !== 'ONCE' && schedule.frequency !== 'DAILY' && schedule.frequency !== 'WEEKLY') ||
      !date(schedule.startDate) || (schedule.endDate !== null && (!date(schedule.endDate) || schedule.endDate < schedule.startDate)) ||
      !array(schedule.weekdays, 7) || typeof schedule.dueTime !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(schedule.dueTime)) return null;
  if (schedule.weekdays.some(day => typeof day !== 'number' || !Number.isInteger(day) || day < 0 || day > 6) ||
      new Set(schedule.weekdays).size !== schedule.weekdays.length ||
      (schedule.frequency === 'WEEKLY' ? schedule.weekdays.length === 0 : schedule.weekdays.length !== 0)) return null;
  return {
    title: input.title, description: input.description, locationId: input.locationId, assigneeId: input.assigneeId,
    checklist, reminderMinutesBefore: input.reminderMinutesBefore as number | null,
    schedule: { frequency: schedule.frequency as TaskDraft['schedule']['frequency'], startDate: schedule.startDate,
      endDate: schedule.endDate as string | null, weekdays: [...schedule.weekdays] as number[], dueTime: schedule.dueTime },
  };
}

export function parseTaskDraft(input: unknown): TaskDraft | null {
  try { const result = draftValue(input); return result && bounded(input) ? result : null; } catch { return null; }
}

export function parseStaffTaskCommand(input: unknown): StaffTaskCommand | null {
  try {
    if (!input || typeof input !== 'object') return null;
    // Read the discriminator as a descriptor before admitting any caller data.
    const kind = Object.getOwnPropertyDescriptor(input, 'kind')?.value;
    const identityKeys = ['operationId', 'authority', 'kind'];
    const template = kind === 'CREATE_TEMPLATE' || kind === 'REVISE_TEMPLATE' || kind === 'ARCHIVE_TEMPLATE' || kind === 'SYNC_TEMPLATE';
    const fields: Record<string, string[]> = {
      CREATE_TEMPLATE: ['templateId', 'draft'], REVISE_TEMPLATE: ['templateId', 'expectedRevision', 'draft'],
      ARCHIVE_TEMPLATE: ['templateId', 'expectedRevision'], SYNC_TEMPLATE: ['templateId', 'expectedRevision'],
      CHECK_ITEM: ['taskId', 'expectedRevision', 'itemId', 'checked'], COMPLETE: ['taskId', 'expectedRevision'],
      REOPEN: ['taskId', 'expectedRevision'], CANCEL: ['taskId', 'expectedRevision'], ACK_REMINDER: ['taskId', 'expectedRevision'],
      REASSIGN: ['taskId', 'expectedRevision', 'assigneeId'], COMMENT: ['taskId', 'expectedRevision', 'body'],
    };
    if (typeof kind !== 'string' || !Object.hasOwn(fields, kind) || !object(input, [...identityKeys, ...fields[kind]]) ||
        !uuid(input.operationId) || typeof input.authority !== 'string' || !/^[a-f0-9]{64}$/.test(input.authority) ||
        !uuid(input[template ? 'templateId' : 'taskId']) || (kind !== 'CREATE_TEMPLATE' && !revision(input.expectedRevision))) return null;
    const result: RecordValue = { ...input, operationId: input.operationId.toLowerCase() };
    const targetKey = template ? 'templateId' : 'taskId';
    result[targetKey] = (input[targetKey] as string).toLowerCase();
    if (kind === 'CREATE_TEMPLATE' || kind === 'REVISE_TEMPLATE') {
      const draft = draftValue(input.draft);
      if (!draft) return null;
      result.draft = draft;
    }
    if (kind === 'CHECK_ITEM') {
      if (!uuid(input.itemId) || typeof input.checked !== 'boolean') return null;
      result.itemId = input.itemId.toLowerCase();
    }
    if (kind === 'REASSIGN' && !safeId(input.assigneeId)) return null;
    if (kind === 'COMMENT' && !text(input.body, 2000, true)) return null;
    return bounded(input) ? result as StaffTaskCommand : null;
  } catch { return null; }
}

export function parseTaskQuery(input: unknown): TaskQuery | null {
  try {
    if (!object(input, ['fromDate', 'toDate', 'view', 'locationId'], ['taskCursor', 'templateCursor']) || !date(input.fromDate) || !date(input.toDate) ||
        input.toDate < input.fromDate || Temporal.PlainDate.from(input.fromDate).until(input.toDate).days > 30 ||
        (input.view !== 'MINE' && input.view !== 'TEAM') || (input.locationId !== null && !safeId(input.locationId))) return null;
    const result: TaskQuery = { fromDate: input.fromDate, toDate: input.toDate, view: input.view, locationId: input.locationId };
    if (Object.hasOwn(input, 'taskCursor')) {
      const cursor = input.taskCursor;
      if (cursor !== null && (!object(cursor, ['businessDate', 'id']) || !date(cursor.businessDate) ||
          cursor.businessDate < input.fromDate || cursor.businessDate > input.toDate || !uuid(cursor.id))) return null;
      result.taskCursor = cursor === null ? null : { businessDate: cursor.businessDate as string, id: (cursor.id as string).toLowerCase() };
    }
    if (Object.hasOwn(input, 'templateCursor')) {
      if (input.templateCursor !== null && !uuid(input.templateCursor)) return null;
      result.templateCursor = input.templateCursor === null ? null : input.templateCursor.toLowerCase();
    }
    return bounded(input) ? result : null;
  } catch { return null; }
}

/** Each call visits at most 31 business calendar dates, including unselected
 * weekdays. nextDate is the durable unprocessed cursor, not the next occurrence. */
export function planTaskOccurrences(draft: TaskDraft, fromDate: string, horizonDate: string, timeZone: string): TaskOccurrencePlan {
  const input = parseTaskDraft(draft);
  if (!input || !date(fromDate) || !date(horizonDate) || typeof timeZone !== 'string' ||
      timeZone.length > 100 || !/^[A-Za-z][A-Za-z0-9_+\-/]*$/.test(timeZone)) throw new Error('INVALID_STAFF_TASK_PLAN');
  let zone: string;
  try {
    // Reject offset/date expressions; normalize a real named zone with the same
    // Temporal dependency that will resolve the actual occurrence's local time.
    zone = Temporal.Instant.from('2000-01-01T00:00:00Z').toZonedDateTimeISO(timeZone).timeZoneId;
  } catch { throw new Error('INVALID_STAFF_TASK_PLAN'); }
  const { schedule } = input;
  const last = schedule.frequency === 'ONCE' ? schedule.startDate : schedule.endDate ?? LAST_DATE;
  let cursor = fromDate > schedule.startDate ? fromDate : schedule.startDate;
  const occurrences: TaskOccurrencePlan['occurrences'] = [];
  for (let visited = 0; visited < 31 && cursor <= horizonDate && cursor <= last; visited++) {
    const calendarDate = Temporal.PlainDate.from(cursor);
    if (schedule.frequency !== 'WEEKLY' || schedule.weekdays.includes(calendarDate.dayOfWeek % 7)) {
      const due = calendarDate.toPlainDateTime(schedule.dueTime).toZonedDateTime(zone, { disambiguation: 'compatible' }).toInstant();
      occurrences.push({ businessDate: cursor, dueAt: due.toString(), reminderAt: input.reminderMinutesBefore === null ? null : due.subtract({ minutes: input.reminderMinutesBefore }).toString() });
    }
    cursor = calendarDate.add({ days: 1 }).toString();
  }
  const nextDate = cursor > last ? null : cursor;
  return { occurrences, nextDate, more: nextDate !== null && nextDate <= horizonDate };
}

/** Keep PostgreSQL microseconds intact: Date would truncate the ordering key. */
export function parseTaskHistoryQuery(input: unknown): TaskHistoryQuery | null {
  try {
    if (!object(input, ['taskId', 'beforeCursor']) || !uuid(input.taskId)) return null;
    const cursor = input.beforeCursor;
    if (cursor === null) return { taskId: input.taskId.toLowerCase(), beforeCursor: null };
    if (!object(cursor, ['createdAt', 'id']) || !uuid(cursor.id) || typeof cursor.createdAt !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d(?:\.\d{1,6})?Z$/.test(cursor.createdAt)) return null;
    // Temporal rejects impossible calendar dates; the pattern also excludes
    // leap-second normalization, offsets, and precision PostgreSQL cannot keep.
    Temporal.Instant.from(cursor.createdAt);
    return { taskId: input.taskId.toLowerCase(), beforeCursor: { createdAt: cursor.createdAt, id: cursor.id.toLowerCase() } };
  } catch { return null; }
}

export function parseTaskContextQuery(input: unknown): TaskContextQuery | null {
  try {
    if (!object(input, ['employeeCursor', 'locationCursor']) ||
        (input.employeeCursor !== null && !safeId(input.employeeCursor)) ||
        (input.locationCursor !== null && !safeId(input.locationCursor)) || !bounded(input)) return null;
    // Employee/location primary keys are case-sensitive legacy text, not UUIDs.
    return { employeeCursor: input.employeeCursor, locationCursor: input.locationCursor };
  } catch { return null; }
}
