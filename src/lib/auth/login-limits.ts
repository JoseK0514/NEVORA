import { createHash } from "node:crypto";
import { neonNotificationExecutor } from "../data/notification-transactions";
import type { SqlExecutor } from "../notifications/types";

/** Attempts per scope per 15 minutes across every company. It bounds how many subject rows one bucket can create;
 * it is not a per-person limit, so it sits far above a busy shift change (it was 300, which one person could use up
 * and block passkey sign-in for everyone). */
export const AUTH_GLOBAL_CAP = 20000;

/** Count a passkey/auth attempt in a 15-minute database bucket before checking
 * credentials. Each scope has a global cap (AUTH_GLOBAL_CAP) and a hashed subject cap;
 * attempts past the global cap do not create additional subject rows. Storage
 * errors propagate so the caller can choose its unavailable response. */
export async function consumeAuthLimit(scope: string, subject: string, limit: number, executor: SqlExecutor): Promise<boolean> {
  const key = createHash("sha256").update(scope + ":" + subject).digest("hex");
  const result = await executor.transaction([
    { text: "DELETE FROM auth_login_limits WHERE bucket<floor(EXTRACT(epoch FROM clock_timestamp())/900)-96", values: [] },
    { text: `INSERT INTO auth_login_limits(scope,bucket,attempts) VALUES($1,floor(EXTRACT(epoch FROM clock_timestamp())/900),1)
      ON CONFLICT(scope,bucket) DO UPDATE SET attempts=LEAST(auth_login_limits.attempts+1,1000000) RETURNING attempts`, values: [scope + ":global"] },
    { text: `INSERT INTO auth_login_limits(scope,bucket,attempts)
      SELECT $1,floor(EXTRACT(epoch FROM clock_timestamp())/900),1
      WHERE EXISTS(SELECT 1 FROM auth_login_limits WHERE scope=$2 AND bucket=floor(EXTRACT(epoch FROM clock_timestamp())/900) AND attempts<=$3)
      ON CONFLICT(scope,bucket) DO UPDATE SET attempts=LEAST(auth_login_limits.attempts+1,1000000) RETURNING attempts`,
      values: [key, scope + ":global", AUTH_GLOBAL_CAP] },
  ]);
  const global = result[1]?.[0] as { attempts: number } | undefined;
  const individual = result[2]?.[0] as { attempts: number } | undefined;
  return !!global && global.attempts <= AUTH_GLOBAL_CAP && !!individual && individual.attempts <= limit;
}
export function consumeLoginAttempt(employeeId: string, executor: SqlExecutor = neonNotificationExecutor()) {
  return consumeAuthLimit("login", employeeId.trim().toUpperCase(), 10, executor);
}
/** Passkey-enabled password fallback shares the per-ID login budget. The flag
 * off path skips this limiter; storage failures on the enabled path deny. */
export async function passwordLoginAllowed(employeeId: string) {
  if (process.env.NEXT_PUBLIC_NEVORA_PASSKEYS !== "on") return true;
  try { return await consumeLoginAttempt(employeeId); } catch { return false; }
}
