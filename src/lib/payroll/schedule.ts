import { payrollHistorySql } from "./history";
import { missingPayrollPeriods } from "./backlog";
import type { PayrollSettingsRevision } from "./contracts";
import type { SqlExecutor } from "../notifications/types";
import { neonNotificationExecutor } from "../data/notification-transactions";
import { enabled, locks, statement as q, workspaceSql as ws } from "./store";
import { enqueue } from "./service";
import { duePeriod, day } from "./calendar";
export { duePeriod } from "./calendar";
/** Enqueue the most recent eligible preparation/reminder work using workspace-local
 * today. Business keys collapse repeated invocations; a settings payload guard
 * rejects scheduling decisions made from a revision that changed during the read. */
export async function schedulePayroll(
  ex: SqlExecutor = neonNotificationExecutor(),
) {
  enabled();
  const [state] = await ex.query<{
    today: string;
    overflow: boolean;
    settings: PayrollSettingsRevision | null;
    history: PayrollSettingsRevision[];
    approved: { startDate: string; endDate: string }[];
  }>(q(payrollHistorySql));
  if (!state?.settings) return { queued: 0 };
  const due = duePeriod(state.settings.preferences.schedule, state.today);

  const statements = [];
  if (
    due &&
    due.period.startDate >= state.settings.effectiveFrom &&
    state.settings.preferences.automation.prepare
  )
    statements.push(
      enqueue(
        null,
        "PREPARE",
        `prepare:${due.period.startDate}:${due.period.endDate}:${state.settings.revision}`,
        { ...due, settingsRevision: state.settings.revision },
      ),
    );
  if (!state.overflow && state.settings.preferences.automation.reminders) {
    const candidates = missingPayrollPeriods(
      state.history,
      [],
      state.today,
      600,
    );
    const actionable = candidates.missingPeriods.filter(
      (candidate) =>
        candidate.state === "MISSING" &&
        state.settings!.preferences.automation.reminderLeadDays.some(
          (n) =>
            (day(candidate.payday).getTime() - day(state.today).getTime()) /
              86400000 <=
            n,
        ),
    );
    // One most recent actionable cycle per invocation, including long payday offsets.
    // Lead values are eligibility thresholds, collapsed to one notice per period/revision.
    const target = actionable.at(-1);
    if (
      target &&
      !state.approved.some(
        (p) =>
          p.startDate === target.period.startDate &&
          p.endDate === target.period.endDate,
      )
    )
      statements.push(
        enqueue(
          null,
          "REMINDER",
          `preparation-reminder:${target.period.startDate}:${target.period.endDate}:${state.settings.revision}`,
          {
            phase: "PREPARATION",
            settingsRevision: state.settings.revision,
            period: target.period,
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
