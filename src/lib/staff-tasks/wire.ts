import {parseTaskDraft} from './model';
import type {StaffTaskCommand, TaskCommandResult, TaskContextResult, TaskListResult, TaskDetailResult} from './types';
type ObjectValue = Record<string, unknown>;
type Resource = Extract<TaskContextResult | TaskListResult | TaskDetailResult, {state: 'ready'}>;
const object = (v: unknown): v is ObjectValue => !!v && typeof v === 'object' && !Array.isArray(v);
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(v);
const id = (v: unknown): v is string => typeof v === 'string' && /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/.test(v);
const integer = (v: unknown, min = 1, max = 2147483647) => typeof v === 'number' && Number.isSafeInteger(v) && v >= min && v <= max;
const text = (v: unknown, max: number) => typeof v === 'string' && v.length <= max;
function instant(v: unknown, precision = 3): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d{1,6})?Z$/.test(v) || (v.match(/\.(\d+)Z$/)?.[1].length ?? 0) > precision) return false;
  const canonical = v.replace(/(?:\.(\d{1,6}))?Z$/, (_match, fraction: string | undefined) => '.' + (fraction ?? '').slice(0, 3).padEnd(3, '0') + 'Z');
  return Number.isFinite(Date.parse(canonical)) && new Date(canonical).toISOString() === canonical;
}
const date = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d\d-\d\d$/.test(v) && Number.isFinite(Date.parse(v + 'T00:00:00Z')) && new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) === v;
const array = (v: unknown, max: number, valid: (item: unknown) => boolean): v is unknown[] => Array.isArray(v) && v.length <= max && v.every(valid);
const keys = (v: ObjectValue, required: string[], optional: string[] = []) => required.every(k => Object.hasOwn(v, k)) && Object.keys(v).every(k => required.includes(k) || optional.includes(k));
function zone(v: unknown): boolean {
  if (typeof v !== 'string' || v.length > 100 || !/^[A-Za-z][A-Za-z0-9_+\-/]*$/.test(v)) return false;
  try { new Intl.DateTimeFormat('en', {timeZone: v}); return true; } catch { return false; }
}
function checklist(v: unknown): v is {id: string; label: string}[] {
  return array(v, 30, x => object(x) && keys(x, ['id', 'label']) && uuid(x.id) && typeof x.label === 'string' && x.label.length > 0 && x.label.length <= 120) && new Set(v.map(x => (x as {id: string}).id.toLowerCase())).size === v.length;
}
function template(v: unknown): boolean {
  return object(v) && keys(v, ['id', 'revision', 'draft', 'archived', 'nextDate']) && uuid(v.id) && integer(v.revision) && parseTaskDraft(v.draft) !== null && typeof v.archived === 'boolean' && (v.nextDate === null || date(v.nextDate));
}
function task(v: unknown): boolean {
  if (!object(v) || !keys(v, ['id', 'templateId', 'businessDate', 'locationId', 'assigneeId', 'title', 'description', 'checklist', 'checkedItemIds', 'dueAt', 'revision', 'status', 'completedBy', 'completedAt', 'assigneeActive', 'reminder']) ||
      !uuid(v.id) || !uuid(v.templateId) || !date(v.businessDate) || !id(v.locationId) || !id(v.assigneeId) || !text(v.title, 120) || v.title === '' || !text(v.description, 2000) || !checklist(v.checklist) ||
      !array(v.checkedItemIds, 30, uuid) || new Set(v.checkedItemIds).size !== v.checkedItemIds.length || !v.checkedItemIds.every(x => v.checklist instanceof Array && v.checklist.some(item => item.id === x)) ||
      !instant(v.dueAt) || !integer(v.revision) || typeof v.status !== 'string' || !['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(v.status) || typeof v.assigneeActive !== 'boolean') return false;
  if (v.status === 'COMPLETED' ? !id(v.completedBy) || !instant(v.completedAt) : v.completedBy !== null || v.completedAt !== null) return false;
  if (v.reminder !== null && (!object(v.reminder) || !keys(v.reminder, ['id', 'dueAt', 'unread']) || typeof v.reminder.id !== 'string' || !v.reminder.id.startsWith(v.id + ':') || !/^[1-9][0-9]{0,9}$/.test(v.reminder.id.slice(37)) || !integer(Number(v.reminder.id.slice(37))) || !instant(v.reminder.dueAt) || typeof v.reminder.unread !== 'boolean' || !['OPEN', 'IN_PROGRESS'].includes(v.status))) return false;
  return true;
}
function event(v: unknown): boolean {
  return object(v) && keys(v, ['id', 'kind', 'actorId', 'createdAt', 'data']) && uuid(v.id) && id(v.actorId) && instant(v.createdAt) &&
    typeof v.kind === 'string' && ['MATERIALIZE', 'CHECK_ITEM', 'COMPLETE', 'REOPEN', 'CANCEL', 'ACK_REMINDER', 'REASSIGN', 'COMMENT'].includes(v.kind) && object(v.data);
}
const taskCursor = (v: unknown) => v === null || (object(v) && keys(v, ['businessDate', 'id']) && date(v.businessDate) && uuid(v.id));
const historyCursor = (v: unknown) => v === null || (object(v) && keys(v, ['createdAt', 'id']) && instant(v.createdAt, 6) && uuid(v.id));
/** Parse the full resource shape before the UI receives a ready observation. */
export function parseTaskResource(value: unknown, authority: string): Resource {
  if (!object(value) || JSON.stringify(value).length > 1_000_000 || !/^[a-f0-9]{64}$/.test(authority) || value.state !== 'ready' || value.authority !== authority || !instant(value.observedAt) || !integer(value.validForMs, 1, 15000)) throw Error('Tasks unavailable');
  const base = ['state', 'authority', 'observedAt', 'validForMs'];
  let valid = false;
  if ('tasks' in value) valid = keys(value, [...base, 'tasks', 'templates', 'hasMore', 'timeZone', 'nextTaskCursor', 'nextTemplateCursor']) && array(value.tasks, 25, task) && array(value.templates, 25, template) && typeof value.hasMore === 'boolean' && zone(value.timeZone) && taskCursor(value.nextTaskCursor) && (value.nextTemplateCursor === null || uuid(value.nextTemplateCursor)) && value.hasMore === (value.nextTaskCursor !== null || value.nextTemplateCursor !== null);
  else if ('task' in value) valid = keys(value, [...base, 'task', 'events', 'historyTruncated', 'nextHistoryCursor']) && task(value.task) && array(value.events, 25, event) && typeof value.historyTruncated === 'boolean' && historyCursor(value.nextHistoryCursor) && value.historyTruncated === (value.nextHistoryCursor !== null);
  else if ('management' in value) valid = keys(value, [...base, 'management', 'locations', 'employees', 'hasMore', 'timeZone', 'nextEmployeeCursor', 'nextLocationCursor']) && typeof value.management === 'boolean' && typeof value.hasMore === 'boolean' && zone(value.timeZone) && (value.nextEmployeeCursor === null || id(value.nextEmployeeCursor)) && (value.nextLocationCursor === null || id(value.nextLocationCursor)) && value.hasMore === (value.nextEmployeeCursor !== null || value.nextLocationCursor !== null) &&
    array(value.locations, 100, x => object(x) && keys(x, ['id', 'name']) && id(x.id) && text(x.name, 200)) &&
    array(value.employees, 5, x => object(x) && keys(x, ['id', 'firstName', 'lastName', 'primaryLocationId', 'eligibleLocationIds']) && id(x.id) && text(x.firstName, 200) && text(x.lastName, 200) && id(x.primaryLocationId) && array(x.eligibleLocationIds, 1000, id));
  if (!valid) throw Error('Tasks unavailable');
  return value as Resource;
}
/** Recovery accepts identity-only receipts; sending also binds the target and
 * command-specific result shape to the original submitted command. */
export function parseTaskCommandResult(value: unknown, operationId: string, command?: StaffTaskCommand): TaskCommandResult | null {
  if (!object(value) || typeof value.status !== 'string') return null;
  if (value.status === 'outcome_unknown') return keys(value, ['status', 'operationId']) && uuid(value.operationId) && value.operationId.toLowerCase() === operationId.toLowerCase() ? value as TaskCommandResult : null;
  if (['invalid', 'blocked', 'conflict', 'unavailable'].includes(String(value.status))) return keys(value, ['status', 'reason']) && typeof value.reason === 'string' && /^[a-z][a-z0-9_]{0,119}$/.test(value.reason) ? value as TaskCommandResult : null;
  if (value.status !== 'committed' || !keys(value, ['status', 'operationId', 'templateId', 'revision'], ['taskId', 'createdCount', 'nextDate', 'more']) || !uuid(value.operationId) || value.operationId.toLowerCase() !== operationId.toLowerCase() || !uuid(value.templateId) || !integer(value.revision) || ('taskId' in value && !uuid(value.taskId))) return null;
  const sync = ['createdCount', 'nextDate', 'more'].some(k => k in value);
  if (sync && (!integer(value.createdCount, 0, 31) || !(value.nextDate === null || date(value.nextDate)) || typeof value.more !== 'boolean' || (value.more && value.nextDate === null) || 'taskId' in value)) return null;
  if (command) {
    if ('templateId' in command && (value.templateId.toLowerCase() !== command.templateId.toLowerCase() || 'taskId' in value)) return null;
    if ('taskId' in command && (!uuid(value.taskId) || value.taskId.toLowerCase() !== command.taskId.toLowerCase())) return null;
    if ((command.kind === 'SYNC_TEMPLATE') !== sync) return null;
  }
  return value as TaskCommandResult;
}
