import { createHash, randomBytes } from "node:crypto";
import type { SqlStatement } from "../notifications/types";
/** Exact employee/credential values observed during login verification. Keep the
 * database timestamp text: issuance compares it again after acquiring locks. */
export type ReviewedLoginCredential = { updated_at: string; password_hash: string; password_updated_at: string };
export type PreparedSession = { token: string; tokenHash: string; expiresAt: Date; guards: SqlStatement[]; insert: SqlStatement };

/** Prepare a 14-day bearer and the ordered SQL needed to save only its digest.
 * Execute guards and insert together, as separate statements in one transaction,
 * before exposing the token through a cookie. A lifecycle/password change since
 * verification makes the guard raise and rolls back the insert. No SQL runs here. */
export function prepareSession(employeeId: string, reviewed: ReviewedLoginCredential): PreparedSession {
  if (!employeeId || !reviewed?.updated_at || !reviewed.password_hash || !reviewed.password_updated_at) throw new Error("session_login_changed");
  const token = randomBytes(32).toString("base64url"), tokenHash = createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  return { token, tokenHash, expiresAt, guards: [
    { text: "SELECT id FROM employees WHERE id=$1 ORDER BY id FOR SHARE", values: [employeeId] },
    { text: "SELECT employee_id FROM employee_credentials WHERE employee_id=$1 FOR SHARE", values: [employeeId] },
    { text: `SELECT (CASE WHEN EXISTS (
      SELECT 1 FROM employees e JOIN employee_credentials c ON c.employee_id=e.id
      WHERE e.id=$1 AND e.active AND e.updated_at::text=$2
        AND c.password_hash=$3 AND c.password_updated_at::text=$4
    ) THEN '1' ELSE 'session_login_changed' END)::integer`, values: [employeeId, reviewed.updated_at, reviewed.password_hash, reviewed.password_updated_at] },
  ], insert: { text: "INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,$2,$3)", values: [tokenHash, employeeId, expiresAt.toISOString()] } };
}
