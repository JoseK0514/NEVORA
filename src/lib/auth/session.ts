import { createHash } from "node:crypto";
import { prepareSession, type PreparedSession, type ReviewedLoginCredential } from "./session-issuance";
export type { ReviewedLoginCredential } from "./session-issuance";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, queryRows } from "@/lib/db";
import type { UserRole } from "@/lib/domain";
import { createLogoutDeps, terminatePortalSession } from "@/lib/notifications/logout";
import { readNotificationConfig, decodePushKey } from "@/lib/notifications/config";
import { readInstallationProof } from "@/lib/notifications/installation";
import { neonNotificationExecutor } from '@/lib/data/notification-transactions';

const SESSION_COOKIE = "fuel_session";

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

export async function createSession(employeeId: string, reviewed: ReviewedLoginCredential) {
  const prepared = prepareSession(employeeId, reviewed);
  // Employee lifecycle precedes credentials/session locks. Separate statements
  // are essential: an INSERT SELECT predicate can retain its pre-lock snapshot.
  await neonNotificationExecutor().transaction([...prepared.guards, prepared.insert]);
  await writeSessionCookie(prepared);
}

export async function writeSessionCookie({ token, expiresAt }: Pick<PreparedSession, "token" | "expiresAt">) {
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
  try {
    const config = readNotificationConfig(process.env);
    const key = decodePushKey(config.subscriptionEncryptionKey, 32);
    const installation = key ? readInstallationProof(store, key, config.environment) ?? undefined : undefined;
    await terminatePortalSession({ sessionToken: store.get(SESSION_COOKIE)?.value, installation, cookies: store, deps: createLogoutDeps(config) });
  } finally {
    store.delete(SESSION_COOKIE);
  }
}

export async function getSession(): Promise<SessionEmployee | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const sql = getDb();
  const rows = queryRows<{
    id: string;
    first_name: string;
    last_name: string;
    role: UserRole;
    primary_location_id: string;
  }>(
    await sql.query(
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
    ),
  );

  const row = rows[0];

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

/** Server-only capability: derive the hash from the actual HttpOnly cookie. Never serialize this proof. */
export async function requireSessionMutationProof(): Promise<import('../shift-changes/types').SessionMutationProof> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) redirect('/login');
  const sessionTokenHash=hashToken(token);
  const rows=queryRows<{id:string;first_name:string;last_name:string;role:UserRole;primary_location_id:string}>(await getDb().query(`SELECT e.id,e.first_name,e.last_name,e.role,e.primary_location_id FROM employee_sessions s JOIN employees e ON e.id=s.employee_id WHERE s.token_hash=$1 AND s.expires_at>clock_timestamp() AND e.active LIMIT 1`,[sessionTokenHash]));
  const row=rows[0];
  if(!row) redirect('/login');
  return {sessionTokenHash,employee:{id:row.id,firstName:row.first_name,lastName:row.last_name,role:row.role,primaryLocationId:row.primary_location_id}};
}
