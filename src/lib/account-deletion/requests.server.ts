import { randomBytes, randomUUID } from "node:crypto";
import { getDb, queryRows } from "@/lib/db";
import { dummyPasswordHash, verifyPassword } from "@/lib/auth/password";
import { neonNotificationExecutor } from "@/lib/data/notification-transactions";

/** A person's own account deletion request. Identity always comes from the server session; the password is
 * checked again right before the request is accepted. See docs/compliance/account-deletion-runbook.md. */
export type DeletionStatus = "received" | "processing" | "completed" | "withdrawn";
export type DeletionRequest = { reference: string; status: DeletionStatus; confirmedAt: string };
export type DeletionChannel = "web" | "ios" | "android";
export type SubmitResult =
  | { outcome: "received" | "duplicate"; request: DeletionRequest }
  | { outcome: "wrong_password" }
  | { outcome: "unavailable" }
  | { outcome: "failed" };
export type CheckResult = { outcome: "found"; request: DeletionRequest } | { outcome: "none" | "wrong_password" | "unavailable" };

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const DELETION_REFERENCE = /^DEL-[A-HJ-NP-Z2-9]{8}$/;

/** "DEL-" and 8 characters without 0/O/1/I, easy to read out to support. */
export function newDeletionReference(bytes: Uint8Array = randomBytes(8)): string {
  return `DEL-${Array.from(bytes.subarray(0, 8), byte => ALPHABET[byte % ALPHABET.length]).join("")}`;
}

function schemaMissing(error: unknown) {
  return !!error && typeof error === "object" && "code" in error && ["42P01", "42703"].includes(String((error as { code: unknown }).code));
}

/** PostgreSQL answered with an error, so the transaction rolled back. Anything else (a reset connection, a lost
 * HTTP reply) may have been sent after COMMIT: the caller must treat it as unknown, never as "nothing was saved". */
export function rejectedByDatabase(error: unknown) {
  return !!error && typeof error === "object" && "code" in error && /^[0-9A-Z]{5}$/.test(String((error as { code: unknown }).code));
}

type Row = { reference: string; status: DeletionStatus; confirmed_at: string };
const toRequest = (row: Row): DeletionRequest => ({ reference: row.reference, status: row.status, confirmedAt: row.confirmed_at });

/** The person's request that is still open, or null. Before migration 0034 is applied there are none. */
export async function activeDeletionRequest(employeeId: string): Promise<DeletionRequest | null> {
  try {
    const rows = queryRows<Row>(await getDb().query(
      `SELECT reference, status, confirmed_at::text AS confirmed_at FROM account_deletion_requests
        WHERE employee_id = $1 AND status IN ('received', 'processing') LIMIT 1`, [employeeId]));
    return rows[0] ? toRequest(rows[0]) : null;
  } catch (error) {
    if (schemaMissing(error)) return null;
    throw error;
  }
}

/** Accept a deletion request for the signed-in person. Repeated, retried or concurrent confirmations return the
 * same open request. Acceptance is saved before any success is reported; in the same transaction every session
 * of the person ends and their calendar feeds are revoked, so nothing keeps showing their information. */
export async function submitDeletionRequest(input: {
  employeeId: string; password: string; channel: DeletionChannel; policyVersion: string;
}): Promise<SubmitResult> {
  const credential = queryRows<{ password_hash: string }>(await getDb().query(
    `SELECT c.password_hash FROM employee_credentials c JOIN employees e ON e.id = c.employee_id
      WHERE c.employee_id = $1 AND e.active LIMIT 1`, [input.employeeId]))[0];
  if (!credential || !input.password || !(await verifyPassword(input.password, credential.password_hash))) return { outcome: "wrong_password" };

  const existing = await activeDeletionRequest(input.employeeId).catch(() => null);
  if (existing) return { outcome: "duplicate", request: existing };

  const id = randomUUID(), reference = newDeletionReference();
  try {
    // The employee lock serializes acceptance; the partial unique conflict target
    // selects the existing open request on concurrent inserts. Revocations and
    // the winning request are committed together. This records a support workflow;
    // it does not perform the later account/data erasure from the runbook.
    const results = await neonNotificationExecutor().transaction([
      { text: "SELECT id FROM employees WHERE id = $1 FOR UPDATE", values: [input.employeeId] },
      { text: `INSERT INTO account_deletion_requests
          (id, reference, employee_id, workspace_id, channel, policy_version, status, verified_at, confirmed_at)
        SELECT $1, $2, e.id, l.workspace_id, $4, $5, 'received', clock_timestamp(), clock_timestamp()
          FROM employees e JOIN locations l ON l.id = e.primary_location_id WHERE e.id = $3
        ON CONFLICT (employee_id) WHERE status IN ('received', 'processing') DO NOTHING`,
        values: [id, reference, input.employeeId, input.channel, input.policyVersion] },
      { text: "DELETE FROM employee_sessions WHERE employee_id = $1", values: [input.employeeId] },
      { text: `UPDATE calendar_subscriptions SET revoked_at = clock_timestamp(), revocation_reason = 'account_loss'
          WHERE employee_id = $1 AND revoked_at IS NULL`, values: [input.employeeId] },
      { text: `SELECT reference, status, confirmed_at::text AS confirmed_at, (id = $2) AS created FROM account_deletion_requests
          WHERE employee_id = $1 AND status IN ('received', 'processing') LIMIT 1`, values: [input.employeeId, id] },
    ]);
    const row = (results.at(-1) as (Row & { created: boolean })[] | undefined)?.[0];
    if (!row) return { outcome: "unavailable" };
    return { outcome: row.created ? "received" : "duplicate", request: toRequest(row) };
  } catch (error) {
    if (schemaMissing(error)) return { outcome: "unavailable" };
    if (rejectedByDatabase(error)) return { outcome: "failed" };
    throw error;
  }
}

/** After acceptance every session has ended, so a browser that lost the reply can no longer ask with its cookie.
 * The person proves it is them with the password again, exactly as sign-in does (the caller counts the attempt
 * first), and learns only their own open request. Sign-in already reveals the same fact after the same proof. */
export async function checkDeletionRequest(input: { employeeId: string; password: string }): Promise<CheckResult> {
  const credential = queryRows<{ password_hash: string }>(await getDb().query(
    `SELECT c.password_hash FROM employee_credentials c JOIN employees e ON e.id = c.employee_id
      WHERE c.employee_id = $1 AND e.active LIMIT 1`, [input.employeeId]))[0];
  // Unknown IDs take as long as known ones, so the answer never says whether an account exists.
  const matches = await verifyPassword(input.password, credential?.password_hash ?? await dummyPasswordHash());
  if (!credential || !input.password || !matches) return { outcome: "wrong_password" };
  try {
    const rows = queryRows<Row>(await getDb().query(
      `SELECT reference, status, confirmed_at::text AS confirmed_at FROM account_deletion_requests
        WHERE employee_id = $1 AND status IN ('received', 'processing') LIMIT 1`, [input.employeeId]));
    return rows[0] ? { outcome: "found", request: toRequest(rows[0]) } : { outcome: "none" };
  } catch (error) {
    if (schemaMissing(error)) return { outcome: "unavailable" };
    throw error;
  }
}
