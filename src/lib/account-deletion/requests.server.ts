import { randomBytes, randomUUID } from "node:crypto";
import {queryRows} from "@/lib/db";
import {applicationSql} from "@/lib/data/app-sql";
import { dummyPasswordHash, verifyPassword } from "@/lib/auth/password";
import { neonNotificationExecutor } from "@/lib/data/notification-transactions";

/** A person's own account deletion request. A request is only ever created for the server session's person, with
 * the password checked again first. Without a session, checkDeletionRequest returns that person's open request after
 * the same password proof, so a lost reply can still show its reference. See docs/compliance/account-deletion-runbook.md. */
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

/** PostgreSQL rejected a statement, so the transaction rolled back: data (22), integrity (23), access or syntax (42),
 * check option (44), a raised exception (P0), serialization failure or deadlock. Everything else may have followed
 * COMMIT (connection loss 08, shutdown 57P, "completion unknown" 40003, resources, internal errors, socket codes):
 * the caller must treat it as unknown, never as "nothing was saved". */
export function rejectedByDatabase(error: unknown) {
  const code = !!error && typeof error === "object" && "code" in error ? String((error as { code: unknown }).code) : "";
  return /^(22|23|42|44|P0)[0-9A-Z]{3}$/.test(code) || code === "40001" || code === "40P01";
}

type Row = { reference: string; status: DeletionStatus; confirmed_at: string };
const toRequest = (row: Row): DeletionRequest => ({ reference: row.reference, status: row.status, confirmedAt: row.confirmed_at });

/** The person's request that is still open, or null. Before migration 0034 is applied there are none. */
export async function activeDeletionRequest(employeeId: string): Promise<DeletionRequest | null> {
  try {
    const rows = queryRows<Row>(await applicationSql().query(
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
  employeeId: string; sessionTokenHash: string; password: string; channel: DeletionChannel; policyVersion: string;
}): Promise<SubmitResult> {
  const credential = queryRows<{ password_hash: string; password_updated_at: string }>(await applicationSql().query(
    `SELECT c.password_hash, c.password_updated_at::text AS password_updated_at FROM employee_credentials c JOIN employees e ON e.id = c.employee_id
      WHERE c.employee_id = $1 AND e.active LIMIT 1`, [input.employeeId]))[0];
  if (!input.sessionTokenHash || !credential || !input.password || !(await verifyPassword(input.password, credential.password_hash))) return { outcome: "wrong_password" };

  // No early return for an open request: the transaction below still ends every session, so "signed out
  // everywhere" stays true for a duplicate as well.
  const id = randomUUID(), reference = newDeletionReference();
  try {
    // The employee lock serializes acceptance; the partial unique conflict target
    // selects the existing open request on concurrent inserts. Revocations and
    // the winning request are committed together. This records a support workflow;
    // it does not perform the later account/data erasure from the runbook.
    const results = await neonNotificationExecutor().transaction([
      { text: "SELECT id FROM employees WHERE id = $1 FOR UPDATE", values: [input.employeeId] },
      // Match the lifecycle → credential → session lock order used by sign-in/recovery.
      // Recheck in a separate statement after locks: a pre-lock snapshot is not authority.
      { text: "SELECT employee_id FROM employee_credentials WHERE employee_id = $1 FOR SHARE", values: [input.employeeId] },
      { text: "SELECT token_hash FROM employee_sessions WHERE employee_id = $1 AND token_hash = $2 FOR UPDATE", values: [input.employeeId, input.sessionTokenHash] },
      { text: `SELECT (CASE WHEN EXISTS (
          SELECT 1 FROM employees e JOIN employee_credentials c ON c.employee_id = e.id
          WHERE e.id = $1 AND e.active AND c.password_hash = $3 AND c.password_updated_at::text = $4
            AND (EXISTS (SELECT 1 FROM employee_sessions s WHERE s.employee_id = e.id AND s.token_hash = $2 AND s.expires_at > clock_timestamp())
              OR EXISTS (SELECT 1 FROM account_deletion_requests r WHERE r.employee_id = e.id AND r.status IN ('received', 'processing')))
        ) THEN '1' ELSE 'deletion_authority_changed' END)::integer`,
        values: [input.employeeId, input.sessionTokenHash, credential.password_hash, credential.password_updated_at] },
      { text: `INSERT INTO account_deletion_requests
          (id, reference, employee_id, workspace_id, channel, policy_version, status, verified_at, confirmed_at)
        SELECT $1, $2, e.id, l.workspace_id, $4, $5, 'received', clock_timestamp(), clock_timestamp()
          FROM employees e JOIN locations l ON l.id = e.primary_location_id WHERE e.id = $3
        ON CONFLICT (employee_id) WHERE status IN ('received', 'processing') DO NOTHING`,
        values: [id, reference, input.employeeId, input.channel, input.policyVersion] },
      { text: "DELETE FROM employee_sessions WHERE employee_id = $1", values: [input.employeeId] },
      // Fences a sign-in that verified the password before this commit (session issuance compares updated_at),
      // without relying only on the 0035 trigger, which does the same.
      { text: "UPDATE employees SET updated_at = GREATEST(clock_timestamp(),updated_at+interval '1 microsecond') WHERE id = $1", values: [input.employeeId] },
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
  const credential = queryRows<{ password_hash: string }>(await applicationSql().query(
    `SELECT c.password_hash FROM employee_credentials c JOIN employees e ON e.id = c.employee_id
      WHERE c.employee_id = $1 AND e.active LIMIT 1`, [input.employeeId]))[0];
  // Unknown IDs take as long as known ones, so the answer never says whether an account exists.
  const matches = await verifyPassword(input.password, credential?.password_hash ?? await dummyPasswordHash());
  if (!credential || !input.password || !matches) return { outcome: "wrong_password" };
  try {
    const rows = queryRows<Row>(await applicationSql().query(
      `SELECT reference, status, confirmed_at::text AS confirmed_at FROM account_deletion_requests
        WHERE employee_id = $1 AND status IN ('received', 'processing') LIMIT 1`, [input.employeeId]));
    return rows[0] ? { outcome: "found", request: toRequest(rows[0]) } : { outcome: "none" };
  } catch (error) {
    if (schemaMissing(error)) return { outcome: "unavailable" };
    throw error;
  }
}
