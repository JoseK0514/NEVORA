import type { PayrollPreferences, PayrollSettingsRevision } from "./contracts";
import type { SqlExecutor } from "../notifications/types";
import { neonNotificationExecutor } from "../data/notification-transactions";
import { enabled, locks, statement as q, workspaceSql as ws } from "./store";
import { enqueue } from "./service";
const day = (s: string) => new Date(`${s}T00:00:00Z`),
  iso = (d: Date) => d.toISOString().slice(0, 10),
  add = (s: string, n: number) => {
    const d = day(s);
    d.setUTCDate(d.getUTCDate() + n);
    return iso(d);
  };
/** Most recent completed period only. Historical catch-up is an explicit review action. */
export function duePeriod(
  schedule: PayrollPreferences["schedule"],
  today: string,
) {
  const anchor = schedule.anchorDate;
  let start: string, end: string;
  if (schedule.frequency === "WEEKLY" || schedule.frequency === "BIWEEKLY") {
    const length = schedule.frequency === "WEEKLY" ? 7 : 14;
    const elapsed = Math.floor(
      (day(today).getTime() - day(anchor).getTime()) / 86400000,
    );
    if (elapsed < length) return null;
    start = add(anchor, (Math.floor(elapsed / length) - 1) * length);
    end = add(start, length - 1);
  } else {
    const now = day(today);
    if (schedule.frequency === "MONTHLY") {
      start = iso(
        new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)),
      );
      end = iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)));
    } else if (now.getUTCDate() >= 16) {
      start = iso(
        new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)),
      );
      end = iso(
        new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 15)),
      );
    } else {
      start = iso(
        new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 16)),
      );
      end = iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)));
    }
    if (start < anchor) return null;
  }
  return {
    period: { startDate: start, endDate: end },
    payday: add(end, schedule.paydayOffsetDays),
  };
}
export async function schedulePayroll(
  ex: SqlExecutor = neonNotificationExecutor(),
) {
  enabled();
  const [state] = await ex.query<{
    today: string;
    settings: PayrollSettingsRevision | null;
  }>(
    q(
      `SELECT to_char(clock_timestamp() AT TIME ZONE time_zone,'YYYY-MM-DD') AS today,(SELECT payload FROM payroll_setting_revisions WHERE workspace_id=w.id AND effective_from<=(clock_timestamp() AT TIME ZONE w.time_zone)::date ORDER BY effective_from DESC,revision DESC LIMIT 1) AS settings FROM workspaces w WHERE singleton AND active`,
    ),
  );
  if (!state?.settings) return { queued: 0 };
  const due = duePeriod(state.settings.preferences.schedule, state.today);
  if (!due) return { queued: 0 };
  const statements = [];
  if (state.settings.preferences.automation.prepare)
    statements.push(
      enqueue(
        null,
        "PREPARE",
        `prepare:${due.period.startDate}:${due.period.endDate}:${state.settings.revision}`,
        { ...due, settingsRevision: state.settings.revision },
      ),
    );
  if (state.settings.preferences.automation.reminders) {
    const lead = Math.round(
      (day(due.payday).getTime() - day(state.today).getTime()) / 86400000,
    );
    if (state.settings.preferences.automation.reminderLeadDays.includes(lead))
      statements.push(
        enqueue(
          null,
          "REMINDER",
          `preparation-reminder:${due.period.startDate}:${lead}:${state.settings.revision}`,
          {
            phase: "PREPARATION",
            settingsRevision: state.settings.revision,
            period: due.period,
            privatePath: "/app/payroll",
          },
        ),
      );
  }
  if (statements.length)
    await ex.transaction([
      ...locks(),
      q(
        `SELECT (CASE WHEN (SELECT payload FROM payroll_setting_revisions WHERE workspace_id=${ws} AND effective_from<=$1::date ORDER BY effective_from DESC,revision DESC LIMIT 1)=$2::jsonb THEN '1' ELSE 'PAYROLL_CONFLICT' END)::integer`,
        state.today,
        JSON.stringify(state.settings),
      ),
      ...statements,
    ]);
  return { queued: statements.length };
}
