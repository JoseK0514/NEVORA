import 'server-only';
import type { AdvisorStore } from './store.server';
import { AdvisorError, record } from './contracts';
import { ownerGuards } from './authority.server';
import { readFeatureFlags } from '@/lib/feature-flags';
import { generationMutationGuards, generationSourceGuard, type GenerationSource, type GenerationSourceRow } from '@/lib/data/generation-guards';
import { coverageSourceVersion } from './coverage-plan.server';
import { weeklyContextGuards, weeklyFailure, type WeeklyContext } from './weekly-context.server';
import { weeklyDigest } from './weekly-digest.server';
import type { WeeklyComparison } from './weekly-contracts';
import type { WeeklyComparisonDraft, WeeklyPreparedReview } from './weekly-plan.server';
import type { SqlStatement } from '@/lib/notifications/types';

export type WeeklyStoredReview = { comparison_id: string; authority: string; session_hash: string; context: WeeklyContext; context_digest: string;
  source_version: string; terms_digest: string; payload: WeeklyPreparedReview; read_receipt_id: string | null;
  applied_operation: string | null; apply_hash: string | null; receipt: Record<string, unknown> | null;
  created_assignments: GenerationSourceRow[] | null; removed_assignments: GenerationSourceRow[] | null;
  declined_operation: string | null; decline_hash: string | null; expires_at: string };
export type WeeklyStoredComparison = { comparison: WeeklyComparison; sourceVersion: string | null; context: WeeklyContext; contextDigest: string; commandHash: string };
type Operation = { command_kind: string; command_hash: string; authority: string; session_hash: string; context_digest: string;
  state: string; lease_current: boolean; result: string | null };
const encoded = (v: unknown) => JSON.stringify(v);
const size = (v: unknown) => Buffer.byteLength(encoded(v), 'utf8');

function coherentComparison(draft: WeeklyComparisonDraft): boolean {
  try {
    const { comparison, reviews } = draft;
    if (comparison.alternatives.length !== reviews.length || reviews.length > 2 || new Set(reviews.map(p => p.review.id)).size !== reviews.length ||
        new Set(reviews.map(p => p.review.termsDigest)).size !== reviews.length) return false;
    if (comparison.state === 'unavailable') return reviews.length === 0 && comparison.sourceVersion === null && comparison.reason !== null;
    if (!reviews.length || comparison.reason !== null || !comparison.baseline) return false;
    return reviews.every(({ review, terms }, index) => {
      const { changes, weekStart, timeZone, sourceVersion, contextDigest, locationScope, mode, expiresAt,
        observedAt: _at, fairness: _fair, minuteBasis: _basis, ...summary } = review;
      const actual = comparison.alternatives[index];
      const expected = { ...summary, remaining: { ...summary.remaining, items: summary.remaining.items.slice(0, actual.remaining.items.length) },
        issues: { ...summary.issues, items: summary.issues.items.slice(0, actual.issues.items.length) } };
      const additions = changes.additions.map(({ employeeName: _employee, locationName: _location, positionName: _position, ...term }) => term);
      const removals = changes.removals.map(({ employeeName: _employee, locationName: _location, positionName: _position, ...term }) => term);
      const exactAdditions = terms.additions.map(({ generatedClaims: _claims, ...term }) => term);
      return weeklyDigest(expected) === weeklyDigest(actual) && weeklyDigest(additions) === weeklyDigest(exactAdditions) && weeklyDigest(removals) === weeklyDigest(terms.removals) &&
        weekStart === comparison.weekStart && timeZone === comparison.timeZone && sourceVersion === comparison.sourceVersion && mode === comparison.mode &&
        weeklyDigest(locationScope) === weeklyDigest(comparison.locationScope) &&
        review.termsDigest === weeklyDigest({ weekStart, timeZone, sourceVersion, contextDigest, mode, locationScope, expiresAt, terms });
    });
  } catch { return false; }
}

/** Workspace-first writes serialize quotas, cleanup and all terminal transitions.
 * No provider call, solver or business scheduling mutation occurs in this store. */
export class WeeklyStore {
  constructor(readonly advisor: AdvisorStore, readonly env: Record<string, string | undefined>) {}
  get scope() { return [this.advisor.original.workspace.id, this.advisor.proof.employee.id]; }
  owner() { return ownerGuards(this.advisor.proof, this.advisor.original); }
  private checkFlag(context: WeeklyContext) {
    if (context.knowledgeEnabled !== readFeatureFlags(this.env).ownerAdvisorKnowledge || context.knowledgeEnabled !== (context.knowledge !== null)) throw new AdvisorError('conflict');
  }
  async available(signal: AbortSignal) {
    const [row] = await this.advisor.transaction<{ available: boolean }>({ text: "SELECT to_regclass('owner_advisor_weekly_operations') IS NOT NULL AND to_regclass('owner_advisor_weekly_reviews') IS NOT NULL AS available", values: [] }, signal);
    if (!row?.available) throw new AdvisorError('unavailable');
  }
  writeGuards(context?: WeeklyContext): SqlStatement[] {
    if (context) this.checkFlag(context);
    return [{ text: "SET LOCAL lock_timeout='1500ms'", values: [] }, { text: "SET LOCAL statement_timeout='5000ms'", values: [] },
      { text: 'SELECT id FROM workspaces WHERE id=$1 FOR NO KEY UPDATE', values: [this.scope[0]] },
      ...this.owner(), ...(context ? weeklyContextGuards(this.advisor, context) : [])];
  }
  async assertContext(context: WeeklyContext, signal: AbortSignal) {
    try { await this.advisor.ex.transaction([...this.writeGuards(context), ...this.owner(), ...weeklyContextGuards(this.advisor, context)], signal); }
    catch (error) { weeklyFailure(error); }
  }
  private custody(row: { authority: string; session_hash: string }, replay = false) {
    if (row.authority !== this.advisor.original.authority || row.session_hash !== this.advisor.proof.sessionTokenHash) throw new AdvisorError(replay ? 'conflict' : 'forbidden');
  }
  async readReview(reviewId: string, signal: AbortSignal): Promise<WeeklyStoredReview> {
    await this.available(signal);
    const [row] = await this.advisor.transaction<Omit<WeeklyStoredReview, 'payload'> & { payload: string }>({
      text: 'SELECT *,expires_at::text FROM owner_advisor_weekly_reviews WHERE workspace_id=$1 AND owner_id=$2 AND review_id=$3::uuid', values: [...this.scope, reviewId],
    }, signal);
    if (!row) throw new AdvisorError('forbidden');
    this.custody(row);
    try {
      const payload: WeeklyPreparedReview = JSON.parse(row.payload);
      if (!record(payload) || payload.review?.id !== reviewId || payload.review?.termsDigest !== row.terms_digest ||
          payload.review?.sourceVersion !== row.source_version || payload.review?.contextDigest !== row.context_digest) throw Error('Invalid stored weekly review');
      return { ...row, payload };
    } catch { throw new AdvisorError('unavailable'); }
  }
  async readComparison(requestId: string, signal: AbortSignal): Promise<WeeklyStoredComparison> {
    await this.available(signal);
    const [row] = await this.advisor.transaction<{ authority: string; session_hash: string; state: string; command_kind: string; command_hash: string;
      source_version: string | null; context: WeeklyContext; context_digest: string; result: string | null }>({
      text: 'SELECT * FROM owner_advisor_weekly_operations WHERE workspace_id=$1 AND owner_id=$2 AND request_id=$3', values: [...this.scope, requestId],
    }, signal);
    if (!row) throw new AdvisorError('conflict');
    this.custody(row);
    if (row.state !== 'completed' || row.command_kind !== 'compare_week' || !row.result) throw new AdvisorError('conflict');
    try {
      const comparison = JSON.parse(row.result) as WeeklyComparison;
      if (!record(comparison) || !['ready', 'unavailable'].includes(comparison.state) || !Array.isArray(comparison.alternatives) ||
          row.context_digest !== weeklyDigest(row.context) || row.source_version !== null && !/^[a-f0-9]{64}$/.test(row.source_version)) throw Error('Invalid comparison custody');
      return { comparison, sourceVersion: row.source_version, context: row.context, contextDigest: row.context_digest, commandHash: row.command_hash };
    } catch { throw new AdvisorError('unavailable'); }
  }
  async reserveComparison(requestId: string, hash: string, context: WeeklyContext, signal: AbortSignal): Promise<{ admitted: true } | { admitted: false; comparison: WeeklyComparison }> {
    await this.available(signal); this.checkFlag(context);
    const digest = weeklyDigest(context), guards = this.writeGuards(context);
    try {
      const results = await this.advisor.ex.transaction([
        ...guards,
        { text: `DELETE FROM owner_advisor_weekly_reviews WHERE workspace_id=$1 AND owner_id=$2 AND applied_operation IS NULL AND expires_at<clock_timestamp()-interval '24 hours'`, values: this.scope },
        { text: `DELETE FROM owner_advisor_weekly_operations o WHERE workspace_id=$1 AND owner_id=$2 AND created_at<clock_timestamp()-interval '24 hours'
          AND ((command_kind='compare_week' AND NOT EXISTS(SELECT 1 FROM owner_advisor_weekly_reviews r WHERE r.workspace_id=o.workspace_id AND r.owner_id=o.owner_id AND r.comparison_id=o.request_id))
            OR (command_kind='decline_week_plan' AND NOT EXISTS(SELECT 1 FROM owner_advisor_weekly_reviews r WHERE r.workspace_id=o.workspace_id AND r.owner_id=o.owner_id AND r.declined_operation=o.request_id)))`, values: this.scope },
        { text: `SELECT(CASE WHEN EXISTS(SELECT 1 FROM owner_advisor_weekly_operations WHERE workspace_id=$1 AND owner_id=$2 AND request_id=$3::uuid)
          OR ((SELECT count(*) FROM owner_advisor_weekly_reviews WHERE workspace_id=$1 AND owner_id=$2 AND applied_operation IS NULL)<200
          AND (SELECT count(*) FROM owner_advisor_weekly_reviews WHERE workspace_id=$1 AND owner_id=$2 AND applied_operation IS NOT NULL)<1000
          AND (SELECT count(*) FROM owner_advisor_weekly_operations o WHERE workspace_id=$1 AND owner_id=$2 AND command_kind='compare_week'
            AND NOT EXISTS(SELECT 1 FROM owner_advisor_weekly_reviews r WHERE r.workspace_id=o.workspace_id AND r.owner_id=o.owner_id AND r.comparison_id=o.request_id AND r.applied_operation IS NOT NULL))<200
          AND (SELECT count(*) FROM owner_advisor_weekly_reviews WHERE workspace_id=$1 AND owner_id=$2 AND applied_operation IS NULL AND declined_operation IS NULL AND expires_at>clock_timestamp())
            +(SELECT count(*) FROM owner_advisor_weekly_operations WHERE workspace_id=$1 AND owner_id=$2 AND state='running' AND lease_until>clock_timestamp())<20)
          THEN '1' ELSE 'advisor_weekly_limit' END)::integer`, values: [...this.scope, requestId] },
        { text: `WITH inserted AS(INSERT INTO owner_advisor_weekly_operations(workspace_id,owner_id,request_id,command_kind,command_hash,authority,session_hash,context,context_digest)
          VALUES($1,$2,$3,'compare_week',$4,$5,$6,$7::jsonb,$8) ON CONFLICT(workspace_id,owner_id,request_id) DO NOTHING RETURNING *)
          SELECT request_id,(CASE WHEN command_kind='compare_week' AND command_hash=$4 AND authority=$5 AND session_hash=$6 AND context=$7::jsonb AND context_digest=$8
            AND state='running' AND result IS NULL AND source_version IS NULL AND completed_at IS NULL AND created_at>=transaction_timestamp() AND created_at<=clock_timestamp()
            AND lease_until>clock_timestamp() AND lease_until-created_at BETWEEN interval '24 seconds' AND interval '26 seconds'
            THEN '1' ELSE 'advisor_weekly_reservation_custody' END)::integer AS custody FROM inserted`,
          values: [...this.scope, requestId, hash, this.advisor.original.authority, this.advisor.proof.sessionTokenHash, encoded(context), digest] },
        { text: `SELECT *,lease_until>clock_timestamp() AS lease_current FROM owner_advisor_weekly_operations WHERE workspace_id=$1 AND owner_id=$2 AND request_id=$3`, values: [...this.scope, requestId] },
        { text: `SELECT(CASE WHEN EXISTS(SELECT 1 FROM owner_advisor_weekly_operations WHERE workspace_id=$1 AND owner_id=$2 AND request_id=$3
          AND command_kind='compare_week' AND command_hash=$4 AND authority=$5 AND session_hash=$6 AND context=$7::jsonb AND context_digest=$8)
          THEN '1' ELSE 'advisor_weekly_operation_conflict' END)::integer`, values: [...this.scope, requestId, hash, this.advisor.original.authority, this.advisor.proof.sessionTokenHash, encoded(context), digest] },
        ...this.owner(), ...weeklyContextGuards(this.advisor, context),
      ], signal);
      const inserted = results[guards.length + 3] as unknown[];
      const [row] = results[guards.length + 4] as Operation[];
      if (!row) throw new AdvisorError('unavailable');
      this.custody(row, true);
      if (row.command_kind !== 'compare_week' || row.command_hash !== hash || row.context_digest !== digest) throw new AdvisorError('conflict');
      if (inserted.length) return { admitted: true };
      if (row.state === 'running') throw new AdvisorError(row.lease_current ? 'busy' : 'prior_attempt_failed');
      if (row.state !== 'completed' || !row.result) throw new AdvisorError('prior_attempt_failed');
      return { admitted: false, comparison: JSON.parse(row.result) as WeeklyComparison };
    } catch (error) { return weeklyFailure(error); }
  }
  async completeComparison(requestId: string, hash: string, context: WeeklyContext, source: GenerationSource | null, draft: WeeklyComparisonDraft, signal: AbortSignal): Promise<WeeklyComparison> {
    this.checkFlag(context);
    const digest = weeklyDigest(context), version = source ? coverageSourceVersion(source) : null;
    if (!source && (draft.comparison.state !== 'unavailable' || draft.comparison.reason !== 'INPUT_LIMIT' || draft.reviews.length ||
        draft.comparison.locations.length || draft.comparison.baseline !== null) || !coherentComparison(draft) || size(draft.comparison) > 12288 || draft.reviews.some(p => size(p) > 131072 || p.review.contextDigest !== digest || p.review.sourceVersion !== version ||
        draft.comparison.sourceVersion !== version || p.review.weekStart !== draft.comparison.weekStart || p.review.timeZone !== draft.comparison.timeZone)) throw new AdvisorError('conflict');
    try {
      await this.advisor.ex.transaction([
        ...(source ? generationMutationGuards(source, [draft.comparison.weekStart]) : this.writeGuards(context)), ...this.owner(), ...weeklyContextGuards(this.advisor, context),
        { text: 'SELECT request_id FROM owner_advisor_weekly_operations WHERE workspace_id=$1 AND owner_id=$2 AND request_id=$3 FOR UPDATE', values: [...this.scope, requestId] },
        { text: `SELECT(CASE WHEN EXISTS(SELECT 1 FROM owner_advisor_weekly_operations WHERE workspace_id=$1 AND owner_id=$2 AND request_id=$3
          AND command_kind='compare_week' AND command_hash=$4 AND authority=$5 AND session_hash=$6 AND context_digest=$7 AND state='running' AND lease_until>clock_timestamp()) THEN '1' ELSE 'advisor_weekly_operation_conflict' END)::integer`,
          values: [...this.scope, requestId, hash, this.advisor.original.authority, this.advisor.proof.sessionTokenHash, digest] },
        { text: `SELECT(CASE WHEN (SELECT count(*) FROM owner_advisor_weekly_reviews WHERE workspace_id=$1 AND owner_id=$2 AND applied_operation IS NULL)+$4::integer<=200
          AND (SELECT count(*) FROM owner_advisor_weekly_reviews WHERE workspace_id=$1 AND owner_id=$2 AND applied_operation IS NULL AND declined_operation IS NULL AND expires_at>clock_timestamp())
            +(SELECT count(*) FROM owner_advisor_weekly_operations WHERE workspace_id=$1 AND owner_id=$2 AND state='running' AND lease_until>clock_timestamp() AND request_id<>$3::uuid)+$4::integer<=20
          THEN '1' ELSE 'advisor_weekly_limit' END)::integer`, values: [...this.scope, requestId, draft.reviews.length] },
        ...draft.reviews.map(p => ({ text: `INSERT INTO owner_advisor_weekly_reviews(workspace_id,owner_id,review_id,comparison_id,authority,session_hash,context,context_digest,source_version,terms_digest,payload,prepared_at,expires_at)
          VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11,$12,$13)`, values: [...this.scope, p.review.id, requestId, this.advisor.original.authority,
          this.advisor.proof.sessionTokenHash, encoded(context), digest, version, p.review.termsDigest, encoded(p), p.review.observedAt, p.review.expiresAt] })),
        { text: `UPDATE owner_advisor_weekly_operations SET state='completed',completed_at=clock_timestamp(),result=$4,source_version=$5 WHERE workspace_id=$1 AND owner_id=$2 AND request_id=$3 AND state='running'`,
          values: [...this.scope, requestId, encoded(draft.comparison), version] },
        { text: `SELECT(CASE WHEN EXISTS(SELECT 1 FROM owner_advisor_weekly_operations WHERE workspace_id=$1 AND owner_id=$2 AND request_id=$3 AND state='completed' AND result=$4
          AND command_kind='compare_week' AND command_hash=$11 AND context=$7::jsonb AND context_digest=$10 AND authority=$8 AND session_hash=$9 AND source_version IS NOT DISTINCT FROM $12)
          AND (SELECT count(*) FROM owner_advisor_weekly_reviews WHERE workspace_id=$1 AND owner_id=$2 AND comparison_id=$3)=$5::integer
          AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements($6::jsonb) p WHERE NOT EXISTS(SELECT 1 FROM owner_advisor_weekly_reviews r
            WHERE r.workspace_id=$1 AND r.owner_id=$2 AND r.comparison_id=$3 AND r.review_id=(p->'review'->>'id')::uuid AND r.payload::jsonb=p
            AND r.authority=$8 AND r.session_hash=$9 AND r.context=$7::jsonb AND r.context_digest=$10
            AND r.source_version=p->'review'->>'sourceVersion' AND r.terms_digest=p->'review'->>'termsDigest'
            AND r.prepared_at=(p->'review'->>'observedAt')::timestamptz AND r.expires_at=(p->'review'->>'expiresAt')::timestamptz AND r.expires_at>clock_timestamp()
            AND r.read_receipt_id IS NULL AND r.applied_operation IS NULL AND r.declined_operation IS NULL))
          THEN '1' ELSE 'advisor_weekly_completion_custody' END)::integer`, values: [...this.scope, requestId, encoded(draft.comparison), draft.reviews.length, encoded(draft.reviews),
          encoded(context), this.advisor.original.authority, this.advisor.proof.sessionTokenHash, digest, hash, version] },
        ...this.owner(), ...weeklyContextGuards(this.advisor, context), ...(source ? [generationSourceGuard(source)] : []),
      ], signal);
      return draft.comparison;
    } catch (error) { return weeklyFailure(error); }
  }
  async failComparison(requestId: string, hash: string, signal: AbortSignal) {
    try { await this.advisor.ex.transaction([...this.writeGuards(), {
      text: `UPDATE owner_advisor_weekly_operations SET state='failed',completed_at=clock_timestamp() WHERE workspace_id=$1 AND owner_id=$2 AND request_id=$3 AND command_hash=$4 AND authority=$5 AND session_hash=$6 AND state='running'`,
      values: [...this.scope, requestId, hash, this.advisor.original.authority, this.advisor.proof.sessionTokenHash],
    }, ...this.owner()], signal); } catch (error) { weeklyFailure(error); }
  }
}
