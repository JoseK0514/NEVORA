import { businessDate, businessTime, localDateTimeToInstant, shiftBoundaryInstants } from '../business-time';
import { addDays } from '../date-utils';
import { validateWorkspaceProfile } from '../workspace/validation';
import { randomUUID } from 'node:crypto';
import { buildAcknowledgementReminderNotification, buildAvailabilityReminderNotification } from '../assistance/notification-events';
import type { NotificationIntent, NotificationPolicy, ProviderResult } from './types';
export const DEFAULT_NOTIFICATION_POLICY: NotificationPolicy = {
  timeZone: 'America/Puerto_Rico', quietStartHour: 21, quietEndHour: 7,
  availabilityLeadHours: 24, acknowledgementDelayHours: 24, managerCollectionMinutes: 5, urgentLeadHours: 12,
  maxAttempts: 5, retryMinutes: [1, 5, 15, 60], leaseSeconds: 120, batchSize: 10, concurrency: 2, budgetMs: 20000, attemptDeadlineMs: 8000,
};
const HOUR_MS = 3600000;
/** Explicit workspace policy; numeric reliability limits remain unchanged. */
export function notificationPolicyFor(timeZone: string): NotificationPolicy {
  validateWorkspaceProfile({name:'Workspace',timeZone});
  return {...DEFAULT_NOTIFICATION_POLICY,timeZone};
}
/** Invalid legacy wall boundaries are suppressed instead of guessed. */
export function notificationBoundary(local: string, timeZone: string): number {
  try { return Date.parse(localDateTimeToInstant(local,timeZone)); } catch { return NaN; }
}
export function nextRoutineTime(now: Date, policy: NotificationPolicy): Date {
  const hour=Number(businessTime(now,policy.timeZone).slice(0,2));
  if (hour>=policy.quietEndHour && hour<policy.quietStartHour) return new Date(now);
  const day=businessDate(now,policy.timeZone);
  const target=hour>=policy.quietStartHour ? addDays(day,1) : day;
  return new Date(localDateTimeToInstant(`${target}T${String(policy.quietEndHour).padStart(2,'0')}:00`,policy.timeZone));
}
export function notificationEventKey(intent: Pick<NotificationIntent, 'environment' | 'source' | 'effectiveVersion' | 'employeeId' | 'purpose'>): string {
  return [intent.environment, intent.source.kind, intent.source.id, intent.effectiveVersion, intent.employeeId, intent.purpose].map(encodeURIComponent).join(':');
}
export function reminderItemKey(intent: NotificationIntent, day: string): string {
  return [intent.environment, intent.source.kind, intent.source.id, intent.employeeId, day].map(encodeURIComponent).join(':');
}
export function planReminder(input: { intent: NotificationIntent; now: Date; resolved: boolean; policy: NotificationPolicy }): NotificationIntent | null {
  const { intent, now, resolved, policy } = input;
  if (resolved || now.getTime() >= Date.parse(intent.expiresAt)) return null;
  let anchor: number;
  let type: string;
  if (intent.source.kind === 'AVAILABILITY') {
    anchor = Date.parse(intent.expiresAt) - policy.availabilityLeadHours * HOUR_MS;
    type = 'AVAILABILITY_REMINDER';
  } else if (intent.source.kind === 'SCHEDULE') {
    anchor = Date.parse(intent.dueAt) + (intent.purpose === 'REMINDER' ? 0 : policy.acknowledgementDelayHours * HOUR_MS);
    type = 'SCHEDULE_ACKNOWLEDGEMENT_REMINDER';
  } else return null;
  if (!Number.isFinite(anchor)) return null;
  const planned = nextRoutineTime(new Date(anchor), policy);
  const due = nextRoutineTime(new Date(Math.max(planned.getTime(), now.getTime())), policy);
  if (due.getTime() >= Date.parse(intent.expiresAt)) return null;
  const event = type === 'AVAILABILITY_REMINDER'
    ? buildAvailabilityReminderNotification(intent.employeeId, intent.source.id)
    : buildAcknowledgementReminderNotification(intent.employeeId, intent.effectiveVersion);
  const reminder: NotificationIntent = {
    ...intent, ...event, id: intent.purpose === 'REMINDER' ? intent.id : randomUUID(), actionHref: intent.actionHref, purpose: 'REMINDER', urgency: 'normal', dueAt: due.toISOString(),
  };
  // Anchor identity to the original budget, even if materialized after its due day.
  const prefix = `${notificationEventKey(reminder)}:`;
  reminder.eventKey = intent.purpose === 'REMINDER' && intent.eventKey.startsWith(prefix)
    ? intent.eventKey
    : `${prefix}${businessDate(planned,policy.timeZone)}`;
  reminder.itemKeys = [reminderItemKey(reminder, businessDate(due,policy.timeZone))];
  return reminder;
}
export function retryDecision(input: { attempt: number; now: Date; expiresAt: Date; result: ProviderResult; deliveryId: string; policy: NotificationPolicy }): { retryAt?: Date; terminal?: 'failed' | 'expired' } {
  const { attempt, now, expiresAt, result, deliveryId, policy } = input;
  if (result.kind === 'accepted') return {};
  if (now.getTime() >= expiresAt.getTime()) return { terminal: 'expired' };
  if (result.kind !== 'retry' || !Number.isInteger(attempt) || attempt < 1 || attempt >= policy.maxAttempts) return { terminal: 'failed' };
  const base = policy.retryMinutes[attempt - 1] * 60000;
  const retryAfter = Number.isFinite(result.retryAfterSeconds) ? Math.min(3600, Math.max(0, result.retryAfterSeconds!)) * 1000 : 0;
  let hash = 2166136261;
  for (const char of `${deliveryId}:${attempt}`) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  const retryAt = new Date(now.getTime() + Math.max(base, retryAfter) + hash % (Math.min(15000, Math.floor(base * 0.1)) + 1));
  if (retryAt.getTime() >= expiresAt.getTime()) return { terminal: 'expired' };
  return { retryAt };
}

export function notificationShiftStart(shift: {date:string;startTime:string;endTime:string},timeZone:string):number {
  try {return Date.parse(shiftBoundaryInstants(shift,timeZone).startAt);} catch {return NaN;}
}
