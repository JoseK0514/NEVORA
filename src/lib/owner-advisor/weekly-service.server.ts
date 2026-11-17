import 'server-only';
import { randomUUID } from 'node:crypto';
import type { SessionMutationProof } from '@/lib/shift-changes/types';
import type { SqlExecutor, SqlStatement } from '@/lib/notifications/types';
import { readFeatureFlags } from '@/lib/feature-flags';
import { mapGenerationSource } from '@/lib/data/schedule-generation-snapshot';
import { generationMutationGuards, generationInsertedSourceGuard, generationSourceGuard, type GenerationSource } from '@/lib/data/generation-guards';
import { prepareReviewedWeeklyDraft, reviewWeeklyDraft, ReviewedWeeklyConflict } from '@/lib/data/reviewed-weekly-draft.server';
import type { GenerationInput } from '@/lib/scheduling/generation/types';
import { deriveGenerationDemand } from '@/lib/scheduling/generation/demand';
import { selectGenerationScope } from '@/lib/scheduling/generation/scope';
import { AdvisorError } from './contracts';
import { admitOwner } from './authority.server';
import { AdvisorStore } from './store.server';
import { captureCoverageSource, coverageSourceVersion, CoverageSourceLimit } from './coverage-plan.server';
import { compareWeeklyPlans, boundWeeklyDraft, weeklySourceLimit, type WeeklyComparisonDraft } from './weekly-plan.server';
import { WeeklyStore, type WeeklyStoredReview } from './weekly-store.server';
import { captureWeeklyContext, weeklyContextGuards, weeklyFailure, type WeeklyOrigin, type WeeklyContext } from './weekly-context.server';
import { weeklyDigest } from './weekly-digest.server';
import { parseWeeklyCommand, type WeeklyCommand, type WeeklyComparison, type WeeklyResult, type WeeklyReceipt, type WeeklyProgress } from './weekly-contracts';

type Body = Omit<WeeklyResult, 'authority' | 'observedAt' | 'validForMs'>;
const body = (state: Body['state'], extra: Partial<Body> = {}): Body => ({ state, comparison: null, review: null, readReceiptId: null, receipt: null, progress: null, ...extra });
const encoded = (v: unknown) => JSON.stringify(v);

/** The planner's coverage status is distinct from hard-rule clearance of all
 * retained work. Project this independent exact-set validation before admission. */
function annotateValidation(draft: WeeklyComparisonDraft, input: GenerationInput, signal: AbortSignal) {
  for (const prepared of draft.reviews) {
    const { review, terms } = prepared;
    let issues: typeof review.issues.items = [], allowed = false;
    try {
      const checked = reviewWeeklyDraft(input, terms, signal); allowed = checked.allowed;
      issues = checked.issues.map(i => ({ code: i.code, message: i.message,
        provenance: i.category === 'RETAINED' ? 'RETAINED_ASSIGNMENT' as const : 'SELECTED_ASSIGNMENT' as const }));
      if (weeklyDigest(checked.coverage) !== weeklyDigest(review.coverage)) allowed = false;
    } catch (error) { if (!(error instanceof ReviewedWeeklyConflict)) throw error; }
    if (!allowed) {
      review.applyEligible = false;
      if (!review.inspectionReasons.includes('VALIDATION_BLOCKER')) review.inspectionReasons.push('VALIDATION_BLOCKER');
    }
    if (issues.length) review.issues = { total: review.issues.total + issues.length, items: [...issues, ...review.issues.items].slice(0, 20) };

  }
}

/** Explicit Owner workflow. A model can invoke only the comparison branch through
 * its own read-only adapter; it cannot issue a read handle or an apply command. */
export async function weeklyService(proof: SessionMutationProof, raw: SqlExecutor, env: Record<string, string | undefined>, incoming: AbortSignal,
  value: unknown, origin?: WeeklyOrigin): Promise<WeeklyResult> {
  const signal = AbortSignal.any([incoming, AbortSignal.timeout(20000)]);
  const ex: SqlExecutor = { query: (statement, other) => raw.query(statement, other ? AbortSignal.any([signal, other]) : signal),
    transaction: (statements, other) => raw.transaction(statements, other ? AbortSignal.any([signal, other]) : signal) };
  let command: WeeklyCommand;
  try { command = parseWeeklyCommand(value); } catch { throw new AdvisorError('invalid'); }
  const admission = await admitOwner(proof, ex), advisor = new AdvisorStore(proof, admission, ex), store = new WeeklyStore(advisor, env);
  const flags = readFeatureFlags(env), enabled = () => readFeatureFlags(env).ownerAdvisorWeekly;
  if (!flags.ownerAdvisor) throw new AdvisorError('disabled');
  if (!enabled() && command.op !== 'check_week_plan' && command.op !== 'apply_week_plan') throw new AdvisorError('disabled');
  await store.available(signal);
  const hash = weeklyDigest(command), scope = store.scope;
  const map = (source: GenerationSource, at: string, review: WeeklyStoredReview['payload']['review']) => mapGenerationSource({ workspaceId: scope[0],
    actorEmployeeId: scope[1], weekStart: review.weekStart, locationScope: review.locationScope, mode: review.mode }, source, at).input;
  const capture = async () => {
    const snapshot = await captureCoverageSource(advisor, signal);
    if (Buffer.byteLength(encoded(snapshot.source), 'utf8') > 2_000_000) throw new AdvisorError('unavailable');
    return snapshot;
  };
  const guards = (source: GenerationSource, week: string, context: WeeklyContext) => [
    ...generationMutationGuards(source, [week]), ...store.owner(), ...weeklyContextGuards(advisor, context)];
  const currentContext = async (context: WeeklyContext) => {
    try { await store.assertContext(context, signal); return true; }
    catch (error) { if (error instanceof AdvisorError && error.code === 'conflict') return false; throw error; }
  };
  const finish = async (result: Body, context?: WeeklyContext, source?: GenerationSource, week?: string, expiresAt?: string, assertions: SqlStatement[] = []): Promise<WeeklyResult> => {
    signal.throwIfAborted();
    const start = source && week ? guards(source, week, context!) : store.writeGuards(context);
    const rows = await ex.transaction([...start, ...store.owner(), ...(context ? weeklyContextGuards(advisor, context) : []), ...assertions, {
      text: `WITH observed AS MATERIALIZED(SELECT clock_timestamp() at)
        SELECT observed.at::text AS "observedAt",LEAST(15000,GREATEST(0,floor(EXTRACT(epoch FROM(
        LEAST(expires_at,COALESCE($2::timestamptz,expires_at),COALESCE($3::timestamptz,expires_at))-observed.at))*1000)))::integer AS "validForMs"
        FROM employee_sessions CROSS JOIN observed WHERE token_hash=$1`, values: [proof.sessionTokenHash, context?.validUntil ?? null, expiresAt ?? null],
    }], signal).catch(weeklyFailure);
    const [stamp] = rows[rows.length - 1] as { observedAt: string; validForMs: number }[];
    if (!stamp || stamp.validForMs <= 0) throw new AdvisorError(context ? 'conflict' : 'forbidden');
    const currentFlags = readFeatureFlags(env);
    if (!currentFlags.ownerAdvisor) throw new AdvisorError('disabled');
    if (context && context.knowledgeEnabled !== currentFlags.ownerAdvisorKnowledge) throw new AdvisorError('conflict');
    if (!currentFlags.ownerAdvisorWeekly) {
      if (result.state === 'ready') throw new AdvisorError('disabled');
      if (result.state === 'saved') result = body('saved', { receipt: result.receipt });
      if (result.state === 'not_saved') result = body('unavailable');
    }
    return { ...result, authority: admission.authority, ...stamp, observedAt: new Date(stamp.observedAt).toISOString() };
  };
  const lockReview = (id: string): SqlStatement => ({ text: 'SELECT review_id FROM owner_advisor_weekly_reviews WHERE workspace_id=$1 AND owner_id=$2 AND review_id=$3 FOR UPDATE', values: [...scope, id] });
  const reviewGuard = (row: WeeklyStoredReview, requireHandle?: string): SqlStatement => ({
    text: `SELECT(CASE WHEN EXISTS(SELECT 1 FROM owner_advisor_weekly_reviews WHERE workspace_id=$1 AND owner_id=$2 AND review_id=$3
      AND authority=$4 AND session_hash=$5 AND terms_digest=$6 AND source_version=$7 AND context_digest=$8
      AND applied_operation IS NULL AND declined_operation IS NULL AND expires_at>clock_timestamp()
      AND ($9::uuid IS NULL OR read_receipt_id=$9::uuid)) THEN '1' ELSE 'advisor_weekly_review_conflict' END)::integer`,
    values: [...scope, row.payload.review.id, admission.authority, proof.sessionTokenHash, row.terms_digest, row.source_version, row.context_digest, requireHandle ?? null],
  });
  const actionIdentity = (row: WeeklyStoredReview): SqlStatement[] => [{
    text: `INSERT INTO owner_advisor_weekly_operations(workspace_id,owner_id,request_id,command_kind,command_hash,authority,session_hash,context,context_digest,state,completed_at,result)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,'completed',clock_timestamp(),$10)`,
    values: [...scope, command.requestId, command.op, hash, admission.authority, proof.sessionTokenHash, encoded(row.context), row.context_digest, encoded({ reviewId: row.payload.review.id })],
  }, {
    text: `SELECT(CASE WHEN EXISTS(SELECT 1 FROM owner_advisor_weekly_operations WHERE workspace_id=$1 AND owner_id=$2 AND request_id=$3
      AND command_kind=$4 AND command_hash=$5 AND authority=$6 AND session_hash=$7 AND context=$8::jsonb AND context_digest=$9 AND state='completed'
      AND result=$10 AND completed_at IS NOT NULL) THEN '1' ELSE 'advisor_weekly_action_custody' END)::integer`,
    values: [...scope, command.requestId, command.op, hash, admission.authority, proof.sessionTokenHash, encoded(row.context), row.context_digest, encoded({ reviewId: row.payload.review.id })],
  }];
  const parent = async (row: WeeklyStoredReview): Promise<WeeklyComparison> => {
    const [p] = await advisor.transaction<{ result: string }>({ text: `SELECT result FROM owner_advisor_weekly_operations WHERE workspace_id=$1 AND owner_id=$2
      AND request_id=$3 AND authority=$4 AND session_hash=$5 AND state='completed' AND command_kind='compare_week'`,
      values: [...scope, row.comparison_id, admission.authority, proof.sessionTokenHash] }, signal);
    if (!p?.result) throw new AdvisorError('unavailable');
    const comparison: WeeklyComparison = JSON.parse(p.result);
    if (!comparison.alternatives.some(a => a.id === row.payload.review.id && a.termsDigest === row.terms_digest)) throw new AdvisorError('unavailable');
    return comparison;
  };
  const assertActionCustody = async (row: WeeklyStoredReview, kind: 'apply_week_plan' | 'decline_week_plan') => {
    const id = kind === 'apply_week_plan' ? row.applied_operation : row.declined_operation;
    const originalHash = kind === 'apply_week_plan' ? row.apply_hash : row.decline_hash;
    const [operation] = await advisor.transaction<{ valid: boolean }>({
      text: `SELECT command_kind=$4 AND command_hash=$5 AND authority=$6 AND session_hash=$7 AND context=$8::jsonb
        AND context_digest=$9 AND state='completed' AND result=$10 AS valid FROM owner_advisor_weekly_operations
        WHERE workspace_id=$1 AND owner_id=$2 AND request_id=$3`,
      values: [...scope, id, kind, originalHash, admission.authority, proof.sessionTokenHash, encoded(row.context), row.context_digest, encoded({ reviewId: row.payload.review.id })],
    }, signal);
    if (!operation?.valid) throw new AdvisorError('unavailable');
  };

  if (command.op === 'compare_week') {
    const context = await captureWeeklyContext(advisor, env, origin, signal);
    const reservation = await store.reserveComparison(command.requestId, hash, context, signal);
    if (!reservation.admitted) {
      const { comparison } = reservation;
      const originalComparison = await store.readComparison(command.requestId, signal);
      if (!originalComparison.sourceVersion && comparison.state === 'unavailable' && comparison.reason === 'INPUT_LIMIT') {
        const expiry = new Date(Math.min(Date.parse(comparison.observedAt) + 300000, context.validUntil ? Date.parse(context.validUntil) : Infinity)).toISOString();
        const [clock] = await advisor.transaction<{ at: string }>({ text: 'SELECT clock_timestamp()::text AS at', values: [] }, signal);
        if (!clock || Date.parse(clock.at) >= Date.parse(expiry)) return finish(body('stale'));
        // Historical admission failure only: no re-capture, re-plan or assertion
        // that the company's current input is still over the limit.
        return finish(body('ready', { comparison }), context, undefined, command.weekStart, expiry);
      }
      const { source, observedAt } = await capture();
      if (!originalComparison.sourceVersion || coverageSourceVersion(source) !== originalComparison.sourceVersion || comparison.alternatives.some(a => !a.id)) return finish(body('stale'));
      for (const alternative of comparison.alternatives) {
        const row = await store.readReview(alternative.id, signal);
        if (row.applied_operation || row.declined_operation || Date.parse(row.expires_at) <= Date.parse(observedAt)) return finish(body('stale'));
      }
      const expiry = comparison.alternatives.length ? (await store.readReview(comparison.alternatives[0].id, signal)).expires_at : undefined;
      const assertions = await Promise.all(comparison.alternatives.map(async a => reviewGuard(await store.readReview(a.id, signal))));
      return finish(body('ready', { comparison }), context, source, command.weekStart, expiry, assertions);
    }
    try {
      if (command.locationScope.kind === 'SELECTED') {
        const [selection] = await advisor.transaction<{ n: number }>({ text: 'SELECT count(*)::integer AS n FROM locations WHERE workspace_id=$1 AND active=true AND id=ANY($2::text[])',
          values: [scope[0], command.locationScope.locationIds] }, signal);
        if (selection?.n !== command.locationScope.locationIds.length) throw new AdvisorError('invalid');
      }
      let captured: Awaited<ReturnType<typeof capture>>;
      try { captured = await capture(); }
      catch (error) {
        if (!(error instanceof CoverageSourceLimit)) throw error;
        const draft = weeklySourceLimit({ weekStart: command.weekStart, timeZone: admission.workspace.timeZone, observedAt: error.observedAt,
          locationScope: command.locationScope, mode: command.mode });
        if (!enabled() || !readFeatureFlags(env).ownerAdvisor) throw new AdvisorError('disabled');
        const comparison = await store.completeComparison(command.requestId, hash, context, null, draft, signal);
        const expiry = new Date(Math.min(Date.parse(comparison.observedAt) + 300000, context.validUntil ? Date.parse(context.validUntil) : Infinity)).toISOString();
        return finish(body('ready', { comparison }), context, undefined, command.weekStart, expiry);
      }
      const { source, observedAt } = captured;
      if (command.locationScope.kind === 'SELECTED' && command.locationScope.locationIds.some(id => !source.locations.some(l =>
        l.id === id && l.workspace_id === scope[0] && l.active === true))) throw new AdvisorError('invalid');
      const { input } = mapGenerationSource({ workspaceId: scope[0], actorEmployeeId: scope[1], weekStart: command.weekStart,
        locationScope: command.locationScope, mode: command.mode }, source, observedAt);
      let draft = await compareWeeklyPlans(input, { weekStart: command.weekStart, observedAt, sourceVersion: coverageSourceVersion(source),
        contextDigest: weeklyDigest(context), validUntil: context.validUntil }, signal);
      annotateValidation(draft, input, signal);
      draft = boundWeeklyDraft(draft);
      if (!enabled() || !readFeatureFlags(env).ownerAdvisor) throw new AdvisorError('disabled');
      const comparison = await store.completeComparison(command.requestId, hash, context, source, draft, signal);
      const assertions = await Promise.all(comparison.alternatives.map(async a => reviewGuard(await store.readReview(a.id, signal))));
      return finish(body('ready', { comparison }), context, source, command.weekStart, draft.reviews[0]?.review.expiresAt, assertions);
    } catch (error) { try { await store.failComparison(command.requestId, hash, signal); } catch { /* Preserve the original failure and reservation identity. */ } throw error; }
  }

  let row = await store.readReview(command.reviewId, signal);
  const checkSaved = async (saved: WeeklyStoredReview): Promise<WeeklyResult> => {
    await assertActionCustody(saved, 'apply_week_plan');
    const receipt = saved.receipt as WeeklyReceipt | null;
    if (!receipt || !saved.read_receipt_id || !saved.created_assignments || !saved.removed_assignments || receipt.operationId !== saved.applied_operation ||
        receipt.reviewId !== saved.payload.review.id || receipt.termsDigest !== saved.terms_digest || receipt.added !== saved.created_assignments.length ||
        receipt.removed !== saved.removed_assignments.length || receipt.preservedAssignments !== saved.payload.review.preservedAssignments) throw new AdvisorError('unavailable');
    // Disabled/withdrawn context can reveal historical counts/hash only.
    if (!enabled() || !await currentContext(saved.context)) return finish(body('saved', { receipt }));
    let progress: WeeklyProgress, observed: Awaited<ReturnType<typeof capture>> | undefined;
    try {
      observed = await capture(); const input = map(observed.source, observed.observedAt, saved.payload.review);
      const keys = ['id', 'assignment_episode_id', 'schedule_id', 'employee_id', 'date', 'start_time', 'end_time', 'position_id', 'is_designated_lead', 'assignment_origin', 'generated_claims'];
      const present = saved.created_assignments.filter(old => {
        const reviewed = saved.payload.terms.additions.find(a => a.employeeId === old.employee_id && a.date === old.date && a.startTime === String(old.start_time).slice(0, 5) &&
          a.endTime === String(old.end_time).slice(0, 5) && a.positionId === (old.position_id ?? null) && a.isDesignatedLead === old.is_designated_lead);
        const p = input.schedules.find(s => s.id === old.schedule_id);
        return reviewed && p && p.locationId === reviewed.locationId && p.weekStart === saved.payload.review.weekStart && p.status !== 'ARCHIVED' &&
          // Canonical parent publication increments every child's material
          // revision once. Further revisions still detect edit-away/edit-back.
          observed!.source.shifts.some(s => Number(s.terms_revision) === Number(old.terms_revision) + (p.status === 'PUBLISHED' ? 1 : 0) &&
            keys.every(k => weeklyDigest(s[k] ?? null) === weeklyDigest(old[k] ?? null))) &&
          input.ledger.some(s => s.id === old.id && !s.isCalloutApproved);
      });
      const published = present.filter(s => input.schedules.some(p => p.id === s.schedule_id && p.status === 'PUBLISHED')).length;
      const original = await parent(saved);
      const includedLocationIds = original.locations.filter(l => l.state === 'INCLUDED').map(l => l.id).sort();
      // Publication of an originally included site is an expected outcome. Sites
      // excluded from the comparison never silently join its recovery denominator.
      const targetable = selectGenerationScope(input).locationIds.filter(id => {
        const schedule = input.schedules.find(s => s.locationId === id && s.weekStart === input.weekStart);
        return schedule?.status !== 'ARCHIVED' && (schedule?.status !== 'PUBLISHED' || includedLocationIds.includes(id));
      }).sort();
      const scopeChanged = weeklyDigest(targetable) !== weeklyDigest(includedLocationIds);
      const measurable = includedLocationIds.every(id => targetable.includes(id));
      const demand = deriveGenerationDemand({ ...input, scope: { kind: 'SELECTED', locationIds: includedLocationIds } });
      const removedAbsent = saved.removed_assignments.every(old => !observed!.source.shifts.some(s => s.id === old.id));
      progress = { state: scopeChanged || present.length !== saved.created_assignments.length || !removedAbsent || input.workspace.timeZone !== saved.payload.review.timeZone ? 'changed' :
        published === present.length ? 'published' : published ? 'mixed' : 'draft', observedAt: observed.observedAt,
        assignmentsPresent: present.length, assignmentsTotal: saved.created_assignments.length, publishedAssignments: published,
        coverageScope: { includedLocationIds, changed: scopeChanged },
        coverage: measurable ? { requiredMinutes: demand.coverage.requiredMinutes, coveredMinutes: demand.coverage.coveredMinutes,
          requiredObligationMinutes: demand.score.requiredObligationMinutes, fulfilledObligationMinutes: demand.score.fulfilledObligationMinutes, remainingBlocks: demand.blocks.filter(b => !b.covered).length } : null };
    } catch (error) {
      signal.throwIfAborted(); if (error instanceof AdvisorError && error.code === 'forbidden') throw error;
      observed = undefined; progress = { state: 'unavailable', observedAt: new Date().toISOString(), assignmentsPresent: 0,
        assignmentsTotal: receipt.added, publishedAssignments: 0, coverage: null };
    }
    return finish(body('saved', { receipt, progress }), saved.context, observed?.source, saved.payload.review.weekStart);
  };
  const replay = async (saved: WeeklyStoredReview) => {
    if (command.op === 'apply_week_plan' && saved.applied_operation) {
      if (saved.applied_operation !== command.requestId || saved.apply_hash !== hash) throw new AdvisorError('conflict');
      return checkSaved(saved);
    }
    if (command.op === 'decline_week_plan' && saved.declined_operation) {
      if (saved.declined_operation !== command.requestId || saved.decline_hash !== hash) throw new AdvisorError('conflict');
      await assertActionCustody(saved, 'decline_week_plan');
      return finish(body('declined'));
    }
    return null;
  };
  const repeated = await replay(row); if (repeated) return repeated;
  if (command.op === 'check_week_plan') {
    if (row.applied_operation) return checkSaved(row);
    if (!enabled()) return finish(body('unavailable'));
    if (row.declined_operation) { await assertActionCustody(row, 'decline_week_plan'); return finish(body('declined')); }
    // Observe the same terminal state under the workspace lock. Never label an
    // unavailable database/source observation as proof of no save.
    try {
      const snapshot = await capture();
      const result = await ex.transaction([...store.writeGuards(), lockReview(command.reviewId), {
        text: 'SELECT applied_operation,declined_operation FROM owner_advisor_weekly_reviews WHERE workspace_id=$1 AND owner_id=$2 AND review_id=$3', values: [...scope, command.reviewId],
      }, ...store.owner()], signal);
      const [terminal] = result[result.length - store.owner().length - 1] as { applied_operation: string | null; declined_operation: string | null }[];
      if (!terminal) return finish(body('unavailable'));
      if (terminal.applied_operation) return checkSaved(await store.readReview(command.reviewId, signal));
      if (terminal.declined_operation) {
        await assertActionCustody(await store.readReview(command.reviewId, signal), 'decline_week_plan'); return finish(body('declined'));
      }
      void snapshot; return await finish(body('not_saved'), undefined, undefined, undefined, undefined, [{
        text: `SELECT(CASE WHEN EXISTS(SELECT 1 FROM owner_advisor_weekly_reviews WHERE workspace_id=$1 AND owner_id=$2 AND review_id=$3
          AND applied_operation IS NULL AND declined_operation IS NULL) THEN '1' ELSE 'advisor_weekly_observation_changed' END)::integer`, values: [...scope, command.reviewId],
      }]);
    } catch (error) { signal.throwIfAborted(); if (error instanceof AdvisorError && error.code === 'forbidden') throw error; return finish(body('unavailable')); }
  }
  if (!enabled()) throw new AdvisorError('disabled');
  if (row.applied_operation || row.declined_operation) throw new AdvisorError('conflict');
  if (command.op === 'decline_week_plan') {
    // Declining uses no planning evidence and cannot mutate the business ledger.
    // Current authority and original custody suffice even after a plan is stale.
    try {
      const snapshot = await capture();
      if (!enabled() || !readFeatureFlags(env).ownerAdvisor) throw new AdvisorError('disabled');
      await ex.transaction([...generationMutationGuards(snapshot.source, [row.payload.review.weekStart]), ...store.owner(), lockReview(command.reviewId), {
        text: `SELECT(CASE WHEN EXISTS(SELECT 1 FROM owner_advisor_weekly_reviews WHERE workspace_id=$1 AND owner_id=$2 AND review_id=$3
          AND authority=$4 AND session_hash=$5 AND applied_operation IS NULL AND declined_operation IS NULL)
          THEN '1' ELSE 'advisor_weekly_decline_conflict' END)::integer`, values: [...scope, command.reviewId, admission.authority, proof.sessionTokenHash],
      }, ...actionIdentity(row), {
        text: 'UPDATE owner_advisor_weekly_reviews SET declined_operation=$4,decline_hash=$5 WHERE workspace_id=$1 AND owner_id=$2 AND review_id=$3 AND applied_operation IS NULL AND declined_operation IS NULL',
        values: [...scope, command.reviewId, command.requestId, hash],
      }, { text: `SELECT(CASE WHEN EXISTS(SELECT 1 FROM owner_advisor_weekly_reviews WHERE workspace_id=$1 AND owner_id=$2 AND review_id=$3 AND declined_operation=$4 AND decline_hash=$5 AND applied_operation IS NULL)
        THEN '1' ELSE 'advisor_weekly_decline_custody' END)::integer`, values: [...scope, command.reviewId, command.requestId, hash] }, ...store.owner(), generationSourceGuard(snapshot.source)], signal);
      return finish(body('declined'));
    } catch (error) {
      signal.throwIfAborted();
      const saved = await replay(await store.readReview(command.reviewId, signal)); if (saved) return saved;
      return weeklyFailure(error);
    }
  }
  if (!await currentContext(row.context)) {
    if (command.op === 'read_week_plan') return finish(body('stale'));
    throw new AdvisorError('conflict');
  }
  const { source, observedAt } = await capture();
  if (coverageSourceVersion(source) !== row.source_version || Date.parse(row.expires_at) <= Date.parse(observedAt)) {
    row = await store.readReview(command.reviewId, signal); const saved = await replay(row); if (saved) return saved;
    if (command.op === 'read_week_plan') return finish(body('stale'));
    throw new AdvisorError('conflict');
  }
  const input = map(source, observedAt, row.payload.review);
  try {
    if (command.op === 'read_week_plan') {
      const eligible = row.payload.review.applyEligible && reviewWeeklyDraft(input, row.payload.terms, signal).allowed;
      const id = row.read_receipt_id ?? randomUUID();
      await ex.transaction([...guards(source, row.payload.review.weekStart, row.context), lockReview(command.reviewId), reviewGuard(row),
        ...(eligible ? [{ text: `WITH issued AS(UPDATE owner_advisor_weekly_reviews SET read_receipt_id=$4::uuid WHERE workspace_id=$1 AND owner_id=$2 AND review_id=$3 AND read_receipt_id IS NULL RETURNING read_receipt_id)
          SELECT(CASE WHEN read_receipt_id=$4::uuid THEN '1' ELSE 'advisor_weekly_read_custody' END)::integer FROM issued`, values: [...scope, command.reviewId, id] },
          { text: `SELECT(CASE WHEN EXISTS(SELECT 1 FROM owner_advisor_weekly_reviews WHERE workspace_id=$1 AND owner_id=$2 AND review_id=$3 AND read_receipt_id IS NOT NULL)
            THEN '1' ELSE 'advisor_weekly_read_custody' END)::integer`, values: [...scope, command.reviewId] }] : []),
        ...store.owner(), ...weeklyContextGuards(advisor, row.context), generationSourceGuard(source)], signal);
      row = await store.readReview(command.reviewId, signal);
      return finish(body('ready', { review: row.payload.review, comparison: await parent(row), readReceiptId: eligible ? row.read_receipt_id : null }),
        row.context, source, row.payload.review.weekStart, row.expires_at, [reviewGuard(row)]);
    }
    if (command.op !== 'apply_week_plan') throw new AdvisorError('invalid');
    if (command.termsDigest !== row.terms_digest || !row.read_receipt_id || command.readReceiptId !== row.read_receipt_id || !row.payload.review.applyEligible) throw new AdvisorError('conflict');
    const prepared = prepareReviewedWeeklyDraft({ source, input, terms: row.payload.terms, proof, observedAt, signal });
    const exact = { added: prepared.insertedIds.length, removed: prepared.removedIdentityCustody.length,
      preservedAssignments: row.payload.review.preservedAssignments, createdParentIds: prepared.createdParentIds };
    const removedRows = source.shifts.filter(s => prepared.removedIdentityCustody.some(r => r.shiftId === s.id));
    if (!enabled() || !readFeatureFlags(env).ownerAdvisor) throw new AdvisorError('disabled');
    await ex.transaction([...prepared.guards, ...store.owner(), lockReview(command.reviewId), ...weeklyContextGuards(advisor, row.context), reviewGuard(row, command.readReceiptId),
      { text: `SELECT(CASE WHEN (SELECT count(*) FROM owner_advisor_weekly_reviews WHERE workspace_id=$1 AND owner_id=$2 AND applied_operation IS NOT NULL)<1000 THEN '1' ELSE 'advisor_weekly_limit' END)::integer`, values: scope },
      ...actionIdentity(row), ...prepared.statements, {
        text: `UPDATE owner_advisor_weekly_reviews SET applied_operation=$4,apply_hash=$5,
          receipt=$6::jsonb||jsonb_build_object('operationId',($4::uuid)::text,'reviewId',($3::uuid)::text,'termsDigest',terms_digest,'savedAt',to_jsonb(clock_timestamp())),
          created_assignments=(SELECT jsonb_agg(to_jsonb(s) ORDER BY s.id COLLATE "C") FROM shifts s WHERE s.id=ANY($7::text[])),removed_assignments=$8::jsonb
          WHERE workspace_id=$1 AND owner_id=$2 AND review_id=$3 AND applied_operation IS NULL AND declined_operation IS NULL`,
        values: [...scope, command.reviewId, command.requestId, hash, encoded(exact), prepared.insertedIds, encoded(removedRows)],
      }, {
        text: `SELECT(CASE WHEN EXISTS(SELECT 1 FROM owner_advisor_weekly_reviews WHERE workspace_id=$1 AND owner_id=$2 AND review_id=$3 AND applied_operation=$4 AND apply_hash=$5
          AND receipt-'savedAt'=$6::jsonb AND (receipt->>'savedAt')::timestamptz BETWEEN transaction_timestamp() AND clock_timestamp()
          AND created_assignments=(SELECT jsonb_agg(to_jsonb(s) ORDER BY s.id COLLATE "C") FROM shifts s WHERE s.id=ANY($7::text[]))
          AND jsonb_array_length(created_assignments)=cardinality($7::text[]) AND removed_assignments=$8::jsonb
          AND read_receipt_id=$9::uuid AND declined_operation IS NULL AND expires_at>clock_timestamp()) THEN '1' ELSE 'advisor_weekly_receipt_custody' END)::integer`,
        values: [...scope, command.reviewId, command.requestId, hash, encoded({ ...exact, operationId: command.requestId, reviewId: command.reviewId, termsDigest: command.termsDigest }), prepared.insertedIds, encoded(removedRows), command.readReceiptId],
      }, ...store.owner(), ...weeklyContextGuards(advisor, row.context),
      generationInsertedSourceGuard(prepared.expectedAfterSource, prepared.insertedIds, source.shifts.map(s => String(s.assignment_episode_id)))], signal);
    return checkSaved(await store.readReview(command.reviewId, signal));
  } catch (error) {
    signal.throwIfAborted();
    const concurrent = await store.readReview(command.reviewId, signal); const saved = await replay(concurrent); if (saved) return saved;
    if (error instanceof ReviewedWeeklyConflict) throw new AdvisorError('conflict');
    return weeklyFailure(error);
  }
}
