import "server-only";
import type { PayrollPreferences } from "./contracts";
import type { SqlExecutor } from "../notifications/types";
import { neonNotificationExecutor } from "../data/notification-transactions";
import { statement } from "./store";
import { openPeriod } from "./calendar";
import { payrollFeatureEnabled } from "./service";

export type OpenPayPeriod = { period: { startDate: string; endDate: string }; payday: string; frequency?: PayrollPreferences["schedule"]["frequency"] };

/** Jose, 2026-10-19: employees see when the hours they're working now are paid.
 * Reads only the effective pay schedule (frequency, anchor, payday offset) — no amounts, people or runs —
 * and never touches payroll tables while payroll is off. Null when there's no schedule to read. */
export async function currentPayPeriod(ex: SqlExecutor = neonNotificationExecutor()): Promise<OpenPayPeriod | null> {
  if (!payrollFeatureEnabled()) return null;
  try {
    const [row] = await ex.query<{ today: string; schedule: PayrollPreferences["schedule"] | null }>(statement(
      `SELECT to_char(clock_timestamp() AT TIME ZONE w.time_zone,'YYYY-MM-DD') AS today,
        (SELECT s.payload->'preferences'->'schedule' FROM payroll_setting_revisions s
          WHERE s.workspace_id=w.id AND s.effective_from<=(clock_timestamp() AT TIME ZONE w.time_zone)::date
          ORDER BY s.effective_from DESC, s.revision DESC LIMIT 1) AS schedule
       FROM workspaces w WHERE w.singleton AND w.active`,
    ));
    if (!row?.schedule?.frequency || !row.schedule.anchorDate || typeof row.schedule.paydayOffsetDays !== "number") return null;
    // Quiet (v4): Payroll names the frequency under its title ("Weekly").
    const open = openPeriod(row.schedule, row.today);
    return open ? { ...open, frequency: row.schedule.frequency } : null;
  } catch {
    return null;
  }
}
