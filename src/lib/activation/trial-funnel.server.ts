import 'server-only';
type Source<Row> = {
  query(text: string, values: unknown[]): Promise<{ rows: Row[] }>;
};
type Environment = 'test' | 'development' | 'production';
type ControlRow = { verified: boolean; workspaceId: string | null; ownerActivated: boolean };
type CommerceRow = { workspaceId: string; checkoutCreated: boolean; paid: boolean };

const DAY_MS = 86_400_000;
const MIN_CELL = 10;
const MAX_COHORT_SIZE = 50_000;

// The read contracts project only the join key and milestone booleans.
const cohortSql = `
  SELECT r.verified_at IS NOT NULL AS verified, w.id::text AS "workspaceId",
    COALESCE(p.state='ACTIVATED',false) AS "ownerActivated"
  FROM nevora_onboarding.registrations r
  LEFT JOIN nevora_onboarding.workspace_registry w ON w.registration_id=r.id AND w.environment=r.environment
  LEFT JOIN nevora_onboarding.provisioning_operations p ON p.registration_id=r.id AND p.workspace_id=w.id AND p.environment=r.environment
  WHERE r.environment=$1 AND r.created_at >= $2::timestamptz AND r.created_at < $3::timestamptz
  LIMIT ${MAX_COHORT_SIZE + 1}`;

const trialSql = `
  SELECT b.id::text AS "workspaceId", b.paid_through IS NOT NULL AS paid,
    EXISTS(SELECT 1 FROM commerce.checkout_intents i WHERE i.business_id=b.id AND i.session_id IS NOT NULL) AS "checkoutCreated"
  FROM commerce.businesses b
  JOIN commerce.external_installations x ON x.business_id=b.id AND x.environment=$1
  JOIN commerce.accounts a ON a.id=b.id AND a.enrollment_source='onboarding'
  WHERE b.id=ANY($2::uuid[]) AND b.trial_started_at IS NOT NULL`;

type Counts = {
  requested: number;
  verified: number;
  workspaceReserved: number;
  trialStarted: number;
  ownerActivated: number;
  checkoutCreated: number;
  paid: number;
};

type FunnelReport =
  | { state: 'unavailable' }
  | { state: 'suppressed'; cohortStart: string; cohortEndExclusive: string }
  | {
      state: 'ready';
      cohortStart: string;
      cohortEndExclusive: string;
      observedOn: string;
      counts: Counts;
      requestToPaidRate: number;
      trialToPaidRate: number | null;
    };

function weekBounds(date: string) {
  if (!/^20\d\d-\d\d-\d\d$/.test(date)) throw Error('Invalid UTC cohort week');
  const start = new Date(date + 'T00:00:00Z');
  if (!Number.isFinite(start.getTime()) || start.toISOString().slice(0, 10) !== date || start.getUTCDay() !== 1) {
    throw Error('Invalid UTC cohort week');
  }
  const end = new Date(start.getTime() + 7 * DAY_MS);
  if (end.getTime() > Date.now()) throw Error('Incomplete UTC cohort week');
  return { start, end };
}

/** Prepared for privacy review. Unwired from HTTP, jobs, product telemetry,
 * and any connector to live data. Callers must supply read-only sources. */
export async function readTrialFunnel(
  control: Source<ControlRow>,
  commerce: Source<CommerceRow>,
  environment: Environment,
  cohortStart: string,
): Promise<FunnelReport> {
  const { start, end } = weekBounds(cohortStart);
  const cohortEndExclusive = end.toISOString().slice(0, 10);
  const suppressed = { state: 'suppressed', cohortStart, cohortEndExclusive } as const;
  const unavailable = { state: 'unavailable' } as const;

  try {
    const { rows: registrations } = await control.query(cohortSql, [environment, start, end]);
    if (registrations.length < MIN_CELL) return suppressed;
    if (registrations.length > MAX_COHORT_SIZE) return unavailable;

    const workspaceIds = registrations.flatMap(row => row.workspaceId ? [row.workspaceId] : []);
    const trials = workspaceIds.length
      ? (await commerce.query(trialSql, [environment, workspaceIds])).rows
      : [];
    const trialByWorkspace = new Map(trials.map(trial => [trial.workspaceId, trial]));
    const counts: Counts = {
      requested: registrations.length, verified: 0, workspaceReserved: 0,
      trialStarted: 0, ownerActivated: 0, checkoutCreated: 0, paid: 0,
    };

    // Suppress the whole row if any nonempty combination of stages contains
    // fewer than MIN_CELL subjects. Differences between counts can reveal cells.
    const cells = new Map<string, number>();
    for (const registration of registrations) {
      const { verified, workspaceId, ownerActivated } = registration;
      const trial = workspaceId ? trialByWorkspace.get(workspaceId) : undefined;
      const flags = {
        verified,
        workspaceReserved: workspaceId !== null,
        trialStarted: trial !== undefined,
        ownerActivated,
        checkoutCreated: trial?.checkoutCreated ?? false,
        paid: trial?.paid ?? false,
      };
      const key = Object.values(flags).map(value => value ? '1' : '0').join('');
      cells.set(key, (cells.get(key) ?? 0) + 1);
      for (const stage of Object.keys(flags) as Array<keyof typeof flags>) {
        if (flags[stage]) counts[stage]++;
      }
    }
    if ([...cells.values()].some(count => count < MIN_CELL)) return suppressed;

    return {
      state: 'ready', cohortStart, cohortEndExclusive, observedOn: new Date().toISOString().slice(0, 10), counts,
      requestToPaidRate: counts.paid / counts.requested,
      trialToPaidRate: counts.trialStarted ? counts.paid / counts.trialStarted : null,
    };
  } catch {
    return unavailable;
  }
}
