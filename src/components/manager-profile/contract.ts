/* Phase 3.5 Profile: the Owner and Manager Profile read and the alert-topic save.
 * Neither exists on the server yet. Codex builds both from docs/product/specs/p35-profile/CODEX.md;
 * this file is the UI's side of that contract and rejects anything outside it. */

export const MANAGER_PROFILE_ENDPOINT = '/api/management/profile';
export const MANAGER_ALERTS_ENDPOINT = '/api/management/profile/alerts';

export type ManagerAlertTopic = { id: string; label: string; detail: string; on: boolean };

/** The role's topic set as Jose approved it (CODEX.md, Oct 19): the Owner's last topic only when payroll is on. Used only to size the loading and failed rows (as hidden or skeleton
 * text), so they take the ready list's space at every width and text size; what is shown always comes from the read. */
const TOPICS: ManagerAlertTopic[] = [
  { id: 'time-off', label: 'Time-off requests', detail: 'When someone asks for time off', on: false },
  { id: 'shift-changes', label: 'Shift requests', detail: 'When someone asks to swap or give up a shift', on: false },
  { id: 'unable-to-work', label: 'Can’t work', detail: 'When someone can’t make a shift', on: false },
  { id: 'clock-review', label: 'Clock-ins to review', detail: 'When a clock-in needs your review', on: false },
  { id: 'payroll-ready', label: 'Payroll ready to review', detail: 'When a pay period is ready for you', on: false },
];
export const ALERT_TOPIC_SIZING = { owner: TOPICS, manager: TOPICS.slice(0, 4) } as const;
export type ManagerProfileLocations = { scope: 'all' | 'assigned'; names: string[] };
export type ManagerProfileSnapshot =
  | { state: 'ready'; observedAt: string; validForMs: number; contact: { email: string | null; phone: string | null }; locations: ManagerProfileLocations; alerts: ManagerAlertTopic[] }
  | { state: 'unavailable'; reason: string };

const LIMIT = { text: 200, locations: 500, topics: 20 };

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Unavailable profile');
  return value as Record<string, unknown>;
}
function text(value: unknown): string {
  if (typeof value !== 'string') throw Error('Unavailable profile');
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > LIMIT.text) throw Error('Unavailable profile');
  return trimmed;
}
function optionalText(value: unknown): string | null {
  return value === null || value === undefined || value === '' ? null : text(value);
}

/** Accepts only the documented shape. Anything else reads as a failed read, never as partial data. */
export function parseManagerProfile(value: unknown): ManagerProfileSnapshot {
  const v = record(value);
  if (v.state === 'unavailable') return { state: 'unavailable', reason: text(v.reason) };
  if (v.state !== 'ready' || v.kind !== 'management-profile') throw Error('Unavailable profile');
  const observedAt = text(v.observedAt);
  if (Number.isNaN(Date.parse(observedAt))) throw Error('Unavailable profile');
  const validForMs = Number(v.validForMs);
  if (!Number.isFinite(validForMs) || validForMs <= 0) throw Error('Unavailable profile');
  const contact = record(v.contact), locations = record(v.locations);
  if (locations.scope !== 'all' && locations.scope !== 'assigned') throw Error('Unavailable profile');
  if (!Array.isArray(locations.names) || locations.names.length > LIMIT.locations) throw Error('Unavailable profile');
  if (!Array.isArray(v.alerts) || v.alerts.length > LIMIT.topics) throw Error('Unavailable profile');
  const alerts = v.alerts.map(item => {
    const topic = record(item);
    if (typeof topic.on !== 'boolean') throw Error('Unavailable profile');
    return { id: text(topic.id), label: text(topic.label), detail: text(topic.detail), on: topic.on };
  });
  if (new Set(alerts.map(topic => topic.id)).size !== alerts.length) throw Error('Unavailable profile');
  return {
    state: 'ready', observedAt, validForMs,
    contact: { email: optionalText(contact.email), phone: optionalText(contact.phone) },
    locations: { scope: locations.scope, names: locations.names.map(text) },
    alerts,
  };
}
