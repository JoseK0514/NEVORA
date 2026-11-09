import {workspaceRuntimeEnvironment} from '../workspace-routing/runtime-config.server';
import { createHash } from "node:crypto";
import { prepareSession, type PreparedSession, type ReviewedLoginCredential } from "./session-issuance";
export type { ReviewedLoginCredential } from "./session-issuance";
import { cache } from "react";
import {workspaceCookies as cookies} from "@/lib/workspace-routing/cookies.server";
import { redirect } from "next/navigation";
import {queryRows} from "@/lib/db";
import {applicationSql} from "@/lib/data/app-sql";
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

/** Commit a session against the credential revision verified by the caller,
 * then set the bearer cookie. Cookie-writing failure can occur after the database
 * commit; callers must not treat this as an atomic database/browser operation. */
export async function createSession(employeeId: string, reviewed: ReviewedLoginCredential) {
  const prepared = prepareSession(employeeId, reviewed);
  // Employee lifecycle precedes credentials/session locks. Separate statements
  // are essential: an INSERT SELECT predicate can retain its pre-lock snapshot.
  await neonNotificationExecutor().transaction([...prepared.guards, prepared.insert]);
  await writeSessionCookie(prepared);
}

/** Browser delivery only; this does not persist or verify a session. Call after
 * the corresponding session transaction has acknowledged its commit. */
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

/** Delegate session/installation cleanup to the logout coordinator and always
 * delete the authentication cookie, including when cleanup rejects. */
export async function destroySession() {
  const store = await cookies();
  try {
    const config = readNotificationConfig(await workspaceRuntimeEnvironment());
    const key = decodePushKey(config.subscriptionEncryptionKey, 32);
    const installation = key ? readInstallationProof(store, key, config.environment) ?? undefined : undefined;
    await terminatePortalSession({ sessionToken: store.get(SESSION_COOKIE)?.value, installation, cookies: store, deps: createLogoutDeps(config) });
  } finally {
    store.delete(SESSION_COOKIE);
  }
}

/** Read the active employee behind this request's unexpired session. This DTO
 * supports rendering/role admission; protected writers still need their own
 * current session and authority checks inside the business transaction. */
export async function getSession(): Promise<SessionEmployee | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return readSessionForToken(token);
}

/** One database read per session token per server render (React cache): the layout, the page and its components
 * share it instead of repeating the query (inspection Oct 24). Keyed on the cookie's token, so a new or removed
 * cookie is never answered from an earlier read. Server Actions run outside the render cache and always read fresh. */
const readSessionForToken = cache(async (token: string): Promise<SessionEmployee | null> => {
  const sql = applicationSql();
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
});

/** Redirect missing/expired/inactive sessions to login; database failures still
 * propagate so an outage is not silently presented as a signed-out state. */
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
  const proof = await readMutationProofForToken(token);
  if (!proof) redirect('/login');
  return proof;
}

/** The same capability, or null when there is no current session. For an action that must answer the page it
 * came from (and keep what that page knows) instead of navigating to sign-in. */
export async function readSessionMutationProof(): Promise<import('../shift-changes/types').SessionMutationProof | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  return token ? readMutationProofForToken(token) : null;
}

/** Same per-render, per-token sharing as readSessionForToken; a missing row still redirects in the caller. */
const readMutationProofForToken = cache(async (token: string): Promise<import('../shift-changes/types').SessionMutationProof | null> => {
  const sessionTokenHash=hashToken(token);
  const rows=queryRows<{id:string;first_name:string;last_name:string;role:UserRole;primary_location_id:string}>(await applicationSql().query(`SELECT e.id,e.first_name,e.last_name,e.role,e.primary_location_id FROM employee_sessions s JOIN employees e ON e.id=s.employee_id WHERE s.token_hash=$1 AND s.expires_at>clock_timestamp() AND e.active LIMIT 1`,[sessionTokenHash]));
  const row=rows[0];
  if(!row) return null;
  return {sessionTokenHash,employee:{id:row.id,firstName:row.first_name,lastName:row.last_name,role:row.role,primaryLocationId:row.primary_location_id}};
});
