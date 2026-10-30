import "server-only";
import type { AdvisorStore } from "./store.server";
import { commandHash } from "./store.server";
import { AdvisorError, record } from "./contracts";
import type { CoverageActionCommand, CoverageActionResult, CoverageDraftReceipt, CoverageDraftReview, CoverageDraftProgress } from "./coverage-actions";
import { captureCoverageSource, coverageSourceVersion } from "./coverage-plan.server";
import { ownerGuards, checkOwner } from "./authority.server";
import { generationMutationGuards } from "../data/generation-guards";
import { coverageDraftInput, coverageMeasure, prepareReviewedCoverageDraft, reviewCoverageDraft, ReviewedDraftConflict } from "../data/reviewed-coverage-draft.server";
import { notificationStateSql, type GuardedWeekState } from "../data/notification-transactions";
import { bindWorkspaceNotificationConfig, readNotificationConfig } from "../notifications/config";
import type { GenerationSourceRow } from "../data/generation-guards";
import { weekStartFor } from "../date-utils";

type ReviewRow = { prepare_hash: string; authority: string; session_hash: string; source_version: string; payload: CoverageDraftReview;
  applied_operation: string | null; apply_hash: string | null; receipt: CoverageDraftReceipt | null; created_assignments: GenerationSourceRow[] | null };
const conflictCodes = new Set(["22P02", "40001", "40P01", "55P03", "57014", "23505"]);
export async function coverageAction(store: AdvisorStore, command: CoverageActionCommand, signal: AbortSignal, env: Record<string, string | undefined>): Promise<CoverageActionResult> {
  const scope = [store.original.workspace.id, store.proof.employee.id];
  const [schema] = await store.transaction<{ available: boolean }>({ text: "SELECT to_regclass('owner_advisor_coverage_reviews') IS NOT NULL AS available", values: [] }, signal);
  if (!schema?.available) throw new AdvisorError("unavailable");
  const reviewId = command.op === "prepare_coverage_draft" ? command.requestId : command.reviewId;
  const hash = commandHash(command);
  const read = async () => {
    const [row] = await store.transaction<ReviewRow>({ text: "SELECT * FROM owner_advisor_coverage_reviews WHERE workspace_id=$1 AND owner_id=$2 AND review_id=$3", values: [...scope, reviewId] }, signal);
    if (row && (row.authority !== store.original.authority || row.session_hash !== store.proof.sessionTokenHash)) throw new AdvisorError("forbidden");
    return row;
  };
  const result = (row: ReviewRow, state: CoverageActionResult["state"], progress: CoverageDraftProgress | null = null): CoverageActionResult => ({ state, review: row.payload, receipt: row.receipt, progress });
  const replay = (row: ReviewRow) => {
    if (command.op !== "apply_coverage_draft" || !row.applied_operation) return null;
    if (row.applied_operation !== command.requestId || row.apply_hash !== hash || !row.receipt) throw new AdvisorError("conflict");
    return result(row, "coverage_saved");
  };
  const initial = await read();
  if (command.op === "prepare_coverage_draft" && initial) {
    if (initial.prepare_hash !== hash) throw new AdvisorError("conflict");
    return result(initial, "coverage_review");
  }
  if (command.op !== "prepare_coverage_draft" && !initial) throw new AdvisorError("forbidden");
  if (initial) { const saved = replay(initial); if (saved) return saved; }

  if (command.op === "check_coverage_draft") {
    if (!initial!.receipt || !initial!.created_assignments) throw new AdvisorError("conflict");
    let progress: CoverageDraftProgress;
    try {
      const { source, observedAt } = await captureCoverageSource(store, signal);
      const input = coverageDraftInput(source, scope[0], scope[1], initial!.payload.date, observedAt);
      const keys = ["id", "assignment_episode_id", "schedule_id", "employee_id", "date", "start_time", "end_time", "position_id", "is_designated_lead"];
      const present = initial!.created_assignments!.filter(old => {
        // Raw shift custody lacks parent location/week. Reconstruct those exact
        // terms from the immutable reviewed assignment, not the current parent.
        const reviewed = initial!.payload.assignments.find(a => a.employeeId === old.employee_id &&
          a.startTime === String(old.start_time).slice(0, 5) && a.endTime === String(old.end_time).slice(0, 5) &&
          a.positionId === (old.position_id ?? null) && a.isDesignatedLead === old.is_designated_lead);
        const parent = input.schedules.find(s => s.id === old.schedule_id);
        if (!reviewed || !parent || parent.locationId !== reviewed.locationId || parent.weekStart !== weekStartFor(initial!.payload.date) || parent.status === "ARCHIVED") return false;
        return source.shifts.some(current => keys.every(k => (current[k] ?? null) === (old[k] ?? null)) &&
          input.ledger.some(s => s.id === current.id && s.locationId === reviewed.locationId && !s.isCalloutApproved));
      });
      const measure = coverageMeasure(input, initial!.payload.date);
      progress = { state: present.length === initial!.created_assignments!.length && input.workspace.timeZone === initial!.payload.timeZone ? "current" : "changed", observedAt, timeZone: input.workspace.timeZone,
        assignmentsPresent: present.length, assignmentsTotal: initial!.created_assignments!.length,
        publishedAssignments: present.filter(s => input.schedules.some(p => p.id === s.schedule_id && p.status === "PUBLISHED")).length,
        coverage: measure.coverage, scopeComplete: measure.scopeComplete };
    } catch (error) {
      signal.throwIfAborted();
      // Authorization is not an unavailable scheduling observation.
      await checkOwner(store.proof, store.original, store.ex);
      if (error instanceof AdvisorError && error.code === "forbidden") throw error;
      progress = { state: "unavailable", observedAt: new Date().toISOString(), timeZone: store.original.workspace.timeZone,
        assignmentsPresent: 0, assignmentsTotal: initial!.receipt!.count, publishedAssignments: 0, coverage: null, scopeComplete: false };
    }
    return result(initial!, "coverage_checked", progress);
  }

  const { source, observedAt } = await captureCoverageSource(store, signal);
  const date = command.op === "prepare_coverage_draft" ? command.date : initial!.payload.date;
  const version = coverageSourceVersion(source);
  if (version !== (command.op === "prepare_coverage_draft" ? command.sourceVersion : initial!.source_version)) {
    // A competing identical save may have committed since the first read.
    const row = await read(); if (row) { const saved = replay(row); if (saved) return saved; }
    throw new AdvisorError("conflict");
  }
  const input = coverageDraftInput(source, scope[0], scope[1], date, observedAt);
  const terms = command.op === "prepare_coverage_draft" ? command.assignments : initial!.payload.assignments.map(({ employeeId, locationId, startTime, endTime, positionId, isDesignatedLead }) => ({ employeeId, locationId, startTime, endTime, positionId, isDesignatedLead }));
  try {
    const exact = reviewCoverageDraft(input, date, terms);
    if (command.op === "prepare_coverage_draft") {
      const review: CoverageDraftReview = { id: reviewId, date, timeZone: input.workspace.timeZone, sourceVersion: version,
        preparedAt: observedAt, expiresAt: new Date(Date.parse(observedAt) + 300000).toISOString(), ...exact };
      await store.ex.transaction([
        ...generationMutationGuards(source, [input.weekStart]), ...ownerGuards(store.proof, store.original),
        { text: "INSERT INTO owner_advisor_coverage_reviews(workspace_id,owner_id,review_id,prepare_hash,authority,session_hash,source_version,payload,prepared_at,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10) ON CONFLICT(workspace_id,owner_id,review_id) DO NOTHING",
          values: [...scope, reviewId, hash, store.original.authority, store.proof.sessionTokenHash, version, JSON.stringify(review), observedAt, review.expiresAt] },
        ...ownerGuards(store.proof, store.original),
      ], signal);
      const row = await read();
      if (!row || row.prepare_hash !== hash) throw new AdvisorError("conflict");
      return result(row, "coverage_review");
    }
    const [snapshot] = await store.transaction<{ state: GuardedWeekState }>({ text: `SELECT ${notificationStateSql} AS state`, values: [[weekStartFor(date)]] }, signal);
    if (!snapshot) throw new AdvisorError("unavailable");
    const prepared = prepareReviewedCoverageDraft({ source, input, terms, date, observedAt, state: snapshot.state, proof: store.proof,
      config: bindWorkspaceNotificationConfig(readNotificationConfig(env), input.workspace) });
    await store.ex.transaction([
      ...prepared.guards, ...ownerGuards(store.proof, store.original),
      { text: "SELECT review_id FROM owner_advisor_coverage_reviews WHERE workspace_id=$1 AND owner_id=$2 AND review_id=$3 FOR UPDATE", values: [...scope, reviewId] },
      { text: "SELECT(CASE WHEN EXISTS(SELECT 1 FROM owner_advisor_coverage_reviews WHERE workspace_id=$1 AND owner_id=$2 AND review_id=$3 AND authority=$4 AND session_hash=$5 AND applied_operation IS NULL AND expires_at>clock_timestamp()) THEN '1' ELSE 'coverage_review_conflict' END)::integer", values: [...scope, reviewId, store.original.authority, store.proof.sessionTokenHash] },
      ...prepared.statements,
      { text: `UPDATE owner_advisor_coverage_reviews SET applied_operation=$4::uuid,apply_hash=$5,receipt=jsonb_build_object('operationId',($4::uuid)::text,'reviewId',($3::uuid)::text,'savedAt',to_jsonb(clock_timestamp()),'count',cardinality($6::text[])),created_assignments=(SELECT jsonb_agg(to_jsonb(sh) ORDER BY sh.id) FROM shifts sh WHERE sh.id=ANY($6::text[])) WHERE workspace_id=$1 AND owner_id=$2 AND review_id=$3 AND applied_operation IS NULL`, values: [...scope, reviewId, command.requestId, hash, prepared.insertedIds] },
      // A successful statement can still affect zero rows (e.g. a suppressing
      // trigger). Assert receipt custody before commit, alongside business rows.
      { text: `SELECT(CASE WHEN EXISTS(SELECT 1 FROM owner_advisor_coverage_reviews WHERE workspace_id=$1 AND owner_id=$2 AND review_id=$3::uuid AND applied_operation=$4::uuid AND apply_hash=$5
        AND receipt->>'operationId'=($4::uuid)::text AND receipt->>'reviewId'=($3::uuid)::text
        AND receipt->>'savedAt' IS NOT NULL AND receipt->>'count'=cardinality($6::text[])::text
        AND jsonb_array_length(created_assignments)=cardinality($6::text[])
        AND created_assignments=(SELECT jsonb_agg(to_jsonb(sh) ORDER BY sh.id) FROM shifts sh WHERE sh.id=ANY($6::text[]))) THEN '1' ELSE 'coverage_receipt_conflict' END)::integer`, values: [...scope, reviewId, command.requestId, hash, prepared.insertedIds] },
      ...ownerGuards(store.proof, store.original),
    ], signal);
    const row = await read(); if (!row) throw new AdvisorError("unavailable");
    const saved = replay(row); if (!saved) throw new AdvisorError("unavailable"); return saved;
  } catch (error) {
    if (error instanceof ReviewedDraftConflict) throw new AdvisorError("conflict");
    if (record(error) && conflictCodes.has(String(error.code))) {
      const row = await read(); if (row) { const saved = replay(row); if (saved) return saved; }
      throw new AdvisorError("conflict");
    }
    throw error;
  }
}
