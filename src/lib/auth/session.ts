import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb } from "@/lib/db";
import type { UserRole } from "@/lib/domain";

const SESSION_COOKIE = "fuel_session";
const SESSION_DAYS = 14;

export type SessionEmployee = {
  id: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  primaryLocationId: string;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(employeeId: string) {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  const sql = getDb();

  await sql.query(
    `INSERT INTO employee_sessions (token_hash, employee_id, expires_at)
     VALUES ($1, $2, $3)`,
    [tokenHash, employeeId, expiresAt.toISOString()],
  );

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;

  if (token) {
    const sql = getDb();
    await sql.query(
      "DELETE FROM employee_sessions WHERE token_hash = $1",
      [hashToken(token)],
    );
  }

  store.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionEmployee | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const sql = getDb();
  const rows = await sql.query(
    `SELECT
       e.id,
       e.first_name,
       e.last_name,
       e.role,
       e.primary_location_id
     FROM employee_sessions s
     JOIN employees e ON e.id = s.employee_id
     WHERE s.token_hash = $1
       AND s.expires_at > now()
       AND e.active = true
     LIMIT 1`,
    [hashToken(token)],
  );

  const row = rows[0] as
    | {
        id: string;
        first_name: string;
        last_name: string;
        role: UserRole;
        primary_location_id: string;
      }
    | undefined;

  if (!row) return null;

  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    role: row.role,
    primaryLocationId: row.primary_location_id,
  };
}

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
