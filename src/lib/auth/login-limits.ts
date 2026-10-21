import { createHash } from "node:crypto";
import { neonNotificationExecutor } from "../data/notification-transactions";
import type { SqlExecutor } from "../notifications/types";

export async function consumeAuthLimit(scope: string, subject: string, limit: number, executor: SqlExecutor): Promise<boolean> {
  const key = createHash("sha256").update(scope + ":" + subject).digest("hex");
  const result = await executor.transaction([
    { text: "DELETE FROM auth_login_limits WHERE bucket<floor(EXTRACT(epoch FROM clock_timestamp())/900)-96", values: [] },
    { text: `INSERT INTO auth_login_limits(scope,bucket,attempts) VALUES($1,floor(EXTRACT(epoch FROM clock_timestamp())/900),1)
      ON CONFLICT(scope,bucket) DO UPDATE SET attempts=LEAST(auth_login_limits.attempts+1,1000000) RETURNING attempts`, values: [scope + ":global"] },
    { text: `INSERT INTO auth_login_limits(scope,bucket,attempts)
      SELECT $1,floor(EXTRACT(epoch FROM clock_timestamp())/900),1
      WHERE EXISTS(SELECT 1 FROM auth_login_limits WHERE scope=$2 AND bucket=floor(EXTRACT(epoch FROM clock_timestamp())/900) AND attempts<=300)
      ON CONFLICT(scope,bucket) DO UPDATE SET attempts=LEAST(auth_login_limits.attempts+1,1000000) RETURNING attempts`,
      values: [key, scope + ":global"] },
  ]);
  const global = result[1]?.[0] as { attempts: number } | undefined;
  const individual = result[2]?.[0] as { attempts: number } | undefined;
  return !!global && global.attempts <= 300 && !!individual && individual.attempts <= limit;
}
export function consumeLoginAttempt(employeeId: string, executor: SqlExecutor = neonNotificationExecutor()) {
  return consumeAuthLimit("login", employeeId.trim().toUpperCase(), 10, executor);
}
export async function passwordLoginAllowed(employeeId: string) {
  if (process.env.NEXT_PUBLIC_NEVORA_PASSKEYS !== "on") return true;
  try { return await consumeLoginAttempt(employeeId); } catch { return false; }
}
