/* Owner roster import: the two routes' answers, read into what the screen shows. The contract is
 * docs/handoffs/2026-11-14-owner-simplicity.md ("Import API contract, schemaVersion 1"); the types are the server's own
 * (type-only imports, so no server code reaches the browser). An answer that isn't the contract's shape is never read as
 * an empty list or as success: a preview becomes "couldn't check", an import becomes "couldn't confirm". */
import type { FieldError } from "@/lib/onboarding/contracts";
import type { RosterPerson, RosterRow } from "@/lib/onboarding/roster";
import type { ScopeSelection } from "@/lib/company-access/model";
import { ROSTER_MAX_ROWS } from "./table";

export const PREVIEW_PATH = "/api/onboarding/roster/preview";
export const IMPORT_PATH = "/api/onboarding/roster";

export type RosterDefaults = { primaryLocationId?: string; eligibleLocationIds?: string[]; positionIds?: string[]; initialManagerScope?: ScopeSelection };
export type PreviewReady = { expectedVersion: string; valid: boolean; rows: RosterRow[]; ignoredColumns: string[] };

/** A refusal the server states plainly. Nothing was saved in any of these. */
export type Refusal =
  | { kind: "invalid"; errors: FieldError[] }
  | { kind: "conflict"; reason: "version_changed" | "changed_replay" | "other" }
  | { kind: "signin" }
  | { kind: "denied" }
  | { kind: "limited"; retryAfterMs: number | null }
  | { kind: "too_large" };
export type PreviewOutcome = { kind: "ready"; preview: PreviewReady } | Refusal | { kind: "unavailable" };
/** `unknown`: the import may or may not be saved (a dropped connection, HTTP 202, a service failure). The same command,
 * with the same operation ID, is sent again until the server gives one of the other answers. */
export type ImportOutcome = { kind: "saved"; createdEmployeeIds: string[] } | Refusal | { kind: "unknown" };

const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === "string";
const texts = (value: unknown): value is string[] => Array.isArray(value) && value.every(text);

function fieldErrors(value: unknown): FieldError[] | null {
  if (!Array.isArray(value)) return null;
  const errors: FieldError[] = [];
  for (const item of value) {
    if (!record(item) || !text(item.field) || !text(item.code)) return null;
    errors.push({ field: item.field, code: item.code });
  }
  return errors;
}

function scope(value: unknown): ScopeSelection | null {
  if (!record(value) || !texts(value.locationIds)) return null;
  if (value.mode === "COMPANY") return { mode: "COMPANY", locationIds: [] };
  return value.mode === "LOCATIONS" ? { mode: "LOCATIONS", locationIds: value.locationIds } : null;
}

function person(value: unknown): RosterPerson | null {
  if (!record(value) || !record(value.employee)) return null;
  const e = value.employee;
  const role = e.role === "EMPLOYEE" || e.role === "LEAD" || e.role === "MANAGER" ? e.role : null;
  if (!text(e.id) || !text(e.firstName) || !text(e.lastName) || !text(e.phone) || !(e.email === null || text(e.email))
    || !role || !text(e.primaryLocationId) || !texts(e.eligibleLocationIds) || !texts(e.positionIds)) return null;
  const employee: RosterPerson["employee"] = { id: e.id, firstName: e.firstName, lastName: e.lastName, phone: e.phone, email: e.email, role,
    primaryLocationId: e.primaryLocationId, eligibleLocationIds: e.eligibleLocationIds, positionIds: e.positionIds };
  if (value.initialManagerScope === undefined) return { employee };
  const initialManagerScope = scope(value.initialManagerScope);
  return initialManagerScope ? { employee, initialManagerScope } : null;
}

function rows(value: unknown): RosterRow[] | null {
  if (!Array.isArray(value) || !value.length || value.length > ROSTER_MAX_ROWS) return null;
  const list: RosterRow[] = [];
  for (const item of value) {
    if (!record(item) || !Number.isSafeInteger(item.rowNumber) || !record(item.values) || !Object.values(item.values).every(text)) return null;
    const errors = fieldErrors(item.fieldErrors);
    const who = item.person === null ? null : person(item.person);
    if (!errors || (item.person !== null && !who)) return null;
    list.push({ rowNumber: Number(item.rowNumber), values: item.values as Record<string, string>, person: who, fieldErrors: errors });
  }
  return list;
}

function refusal(status: number, body: unknown): Refusal | null {
  const state = record(body) ? body.state : undefined;
  if (status === 401 || (state === "unavailable" && record(body) && body.reasonCode === "AUTH_REQUIRED")) return { kind: "signin" };
  if (status === 403) return { kind: "denied" };
  if (status === 413) return { kind: "too_large" };
  if (state === "invalid" && record(body)) {
    const errors = fieldErrors(body.fieldErrors);
    if (errors?.some(error => error.code === "BODY_TOO_LARGE")) return { kind: "too_large" };
    return { kind: "invalid", errors: errors ?? [] };
  }
  if (status === 400 || status === 415) return { kind: "invalid", errors: [] };
  if (state === "conflict" && record(body)) return { kind: "conflict", reason: body.reason === "version_changed" || body.reason === "changed_replay" ? body.reason : "other" };
  if (status === 409) return { kind: "conflict", reason: "other" };
  if (state === "limited" || status === 429) return { kind: "limited", retryAfterMs: record(body) && typeof body.retryAfterMs === "number" && body.retryAfterMs >= 0 ? body.retryAfterMs : null };
  return null;
}

/** POST /api/onboarding/roster/preview. HTTP 200 with state "ready" is a review, valid or not; anything that is neither
 * that nor a stated refusal is "unavailable" (the list is kept and the Owner can try again). */
export function readPreviewResponse(status: number, body: unknown): PreviewOutcome {
  if (status === 200 && record(body) && body.state === "ready") {
    const list = rows(body.rows);
    if (body.schemaVersion !== 1 || !text(body.expectedVersion) || !/^(0|[1-9][0-9]{0,18})$/.test(body.expectedVersion)
      || typeof body.valid !== "boolean" || !list || !texts(body.ignoredColumns)) return { kind: "unavailable" };
    return { kind: "ready", preview: { expectedVersion: body.expectedVersion, valid: body.valid, rows: list, ignoredColumns: body.ignoredColumns } };
  }
  return refusal(status, body) ?? { kind: "unavailable" };
}

/** POST /api/onboarding/roster. Only HTTP 200 with state "saved" is success. HTTP 202, a service failure (503) and any
 * answer that can't be read leave the outcome unknown. */
export function readImportResponse(status: number, body: unknown): ImportOutcome {
  if (status === 200 && record(body) && body.state === "saved" && texts(body.createdEmployeeIds) && record(body.receipt)) {
    return { kind: "saved", createdEmployeeIds: body.createdEmployeeIds };
  }
  if (status === 200 || status === 202) return { kind: "unknown" };
  return refusal(status, body) ?? { kind: "unknown" };
}

export const rowReady = (row: RosterRow) => row.person !== null && row.fieldErrors.length === 0;

/** The server's `valid`, and nothing less: every row has a person and no error. Confirmation stays blocked otherwise. */
export function canConfirm(preview: PreviewReady): boolean {
  return preview.valid && preview.rows.length > 0 && preview.rows.every(rowReady);
}

export type PreviewSummary = { total: number; ready: number; needFix: number; withoutEmail: number; managers: number; needsManagerScope: boolean };
export function summarizePreview(preview: PreviewReady): PreviewSummary {
  const ready = preview.rows.filter(rowReady);
  return {
    total: preview.rows.length, ready: ready.length, needFix: preview.rows.length - ready.length,
    withoutEmail: ready.filter(row => row.person?.employee.email === null).length,
    managers: preview.rows.filter(row => (row.person?.employee.role ?? (row.values.role ?? "").toUpperCase()) === "MANAGER").length,
    needsManagerScope: preview.rows.some(row => row.fieldErrors.some(error => error.code === "MANAGER_SCOPE_REQUIRED")),
  };
}

/** The three headcounts the handoff keeps apart. Active people includes Owners and Managers; availability is asked of
 * active Employees and Leads; the plan counts active people who are not Owners. The counting rules are the app's own
 * (availability-submissions.ts, migration 0054); these only add the rows that are ready to import. */
export type Headcounts = { activePeople: number; availabilityEligible: number; planCount: number };
export function headcountsOf(people: { active: boolean; role: string }[]): Headcounts {
  const active = people.filter(one => one.active);
  return {
    activePeople: active.length,
    availabilityEligible: active.filter(one => one.role === "EMPLOYEE" || one.role === "LEAD").length,
    planCount: active.filter(one => one.role !== "OWNER").length,
  };
}
export function headcountsAfter(now: Headcounts, preview: PreviewReady | null): Headcounts {
  const adding = (preview?.rows ?? []).filter(rowReady);
  return {
    activePeople: now.activePeople + adding.length,
    availabilityEligible: now.availabilityEligible + adding.filter(row => row.person?.employee.role !== "MANAGER").length,
    planCount: now.planCount + adding.length,
  };
}

/** The preview request. `defaults` carries only what the Owner chose; an unset choice is left out, never guessed. */
export function previewBody(table: string, defaults: RosterDefaults): string {
  const chosen: RosterDefaults = {
    ...(defaults.primaryLocationId ? { primaryLocationId: defaults.primaryLocationId } : {}),
    ...(defaults.eligibleLocationIds ? { eligibleLocationIds: defaults.eligibleLocationIds } : {}),
    ...(defaults.positionIds ? { positionIds: defaults.positionIds } : {}),
    ...(defaults.initialManagerScope ? { initialManagerScope: defaults.initialManagerScope } : {}),
  };
  return JSON.stringify({ schemaVersion: 1, format: "csv", text: table, ...(Object.keys(chosen).length ? { defaults: chosen } : {}) });
}

/** The confirm command: the reviewed person objects exactly as the preview returned them, the preview's version, and
 * one operation ID. The string is built once and sent unchanged on every retry, so a retry can only recover the first
 * result. Null while the review is not valid. */
export function importBody(preview: PreviewReady, operationId: string): string | null {
  if (!canConfirm(preview)) return null;
  return JSON.stringify({ schemaVersion: 1, operationId, expectedVersion: preview.expectedVersion, payload: { people: preview.rows.map(row => row.person) } });
}

/** A commit's CANONICAL_VALIDATION_FAILED names `people.<index>.<field>`; the index is the person's place in the command,
 * which is the preview's row order. Returns the row number and the field, or null for a list-level error. */
export function commitErrorRow(error: FieldError, preview: PreviewReady): { rowNumber: number; field: string } | null {
  const match = /^people\.(\d+)\.(.+)$/.exec(error.field);
  const row = match ? preview.rows[Number(match[1])] : undefined;
  return match && row ? { rowNumber: row.rowNumber, field: match[2] } : null;
}

/** An operation ID in the contract's UUID form. `crypto.randomUUID` needs a secure context, which every portal origin
 * is; the fallback builds a version 4 UUID from `getRandomValues`. */
export function newOperationId(source: Pick<Crypto, "getRandomValues"> & { randomUUID?: () => string } = crypto): string {
  if (typeof source.randomUUID === "function") return source.randomUUID();
  const bytes = source.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128;
  const hex = [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
