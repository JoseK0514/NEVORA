import 'server-only';
import { createHash } from 'node:crypto';
import { readFeatureFlags } from '@/lib/feature-flags';
import { generationMutationGuards, generationSourceGuard, type GenerationSource } from '@/lib/data/generation-guards';
import type { SqlStatement } from '@/lib/notifications/types';
import type { AdvisorStore } from './store.server';
import { checkOwner } from './authority.server';
import { AdvisorError, record, ADVISOR_MAX_TOOL_CALLS, ADVISOR_MAX_ANSWER_SOURCES, type ToolResult } from './contracts';
import { coverageUuid } from './coverage-actions';
import { captureCoverageSource, coverageSourceVersion } from './coverage-plan.server';
import { weeklyService } from './weekly-service.server';
import { WeeklyStore } from './weekly-store.server';
import { weeklyContextGuards, weeklyFailure, type WeeklyOrigin } from './weekly-context.server';
import { weeklyDigest } from './weekly-digest.server';
import type { WeeklyModelComparison, WeeklyToolArgs, WeeklyInspectionReference } from './weekly-contracts';

export type WeeklyToolRuntime = { env: Record<string, string | undefined>; origin: WeeklyOrigin };
export type WeeklyAnswerFence = { before: SqlStatement[]; after: SqlStatement[]; checks: SqlStatement[]; source: GenerationSource;
  expiresAt: string; checkFlags: () => void };
const conflict = (): never => { throw new AdvisorError('conflict'); };
const validOccurrence = (value: number) => Number.isInteger(value) && value >= 0 && value < ADVISOR_MAX_TOOL_CALLS;
const reviewHref = (id: string) => `/app/ai-manager/weekly?review=${id}`;

/** Deterministic operation identity, not a capability token. Session changes must
 * collide with existing custody rather than mint a fresh quota reservation. */
export function weeklyToolRequestId(value: { workspaceId: string; ownerId: string; requestId: string; occurrence: number }): string {
  if (!value.workspaceId || !value.ownerId || !coverageUuid(value.requestId) || !validOccurrence(value.occurrence)) throw new AdvisorError('invalid');
  const hex = createHash('sha256').update(JSON.stringify(['rondo-weekly-tool-v1', value.workspaceId, value.ownerId, value.requestId.toLowerCase(), value.occurrence])).digest('hex').slice(0, 32).split('');
  hex[12] = '4'; hex[16] = ((parseInt(hex[16], 16) & 3) | 8).toString(16);
  const id = hex.join(''); return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`;
}

/** Read-only preparation of source/context/identity guards for BOTH model answer
 * settlement and replay. Never reserve, compare, issue a handle or run a solver. */
export async function prepareWeeklyAnswerFence(advisor: AdvisorStore, model: WeeklyModelComparison, env: Record<string, string | undefined>, signal: AbortSignal,
  originalRequestId: string): Promise<WeeklyAnswerFence> {
  signal.throwIfAborted();
  if (!record(model) || !coverageUuid(model.comparisonId) || !validOccurrence(model.occurrence) || model.mode !== 'FILL_GAPS_ONLY' ||
      !/^[a-f0-9]{64}$/.test(model.sourceFence) || !Array.isArray(model.alternatives) || model.alternatives.length > 2 ||
      weeklyToolRequestId({ workspaceId: advisor.original.workspace.id, ownerId: advisor.proof.employee.id, requestId: originalRequestId, occurrence: model.occurrence }) !== model.comparisonId) return conflict();
  const store = new WeeklyStore(advisor, env), parent = await store.readComparison(model.comparisonId, signal);
  const { comparisonId, occurrence: _occurrence, expiresAt, sourceFence, alternatives, ...base } = model;
  const comparison = { ...base, alternatives: alternatives.map(({ reviewHref: _href, ...alternative }) => alternative) };
  const expectedExpiry = new Date(Math.min(Date.parse(parent.comparison.observedAt) + 300000,
    parent.context.validUntil ? Date.parse(parent.context.validUntil) : Infinity)).toISOString();
  const expectedHash = weeklyDigest({ op: 'compare_week', requestId: comparisonId, weekStart: model.weekStart, mode: 'FILL_GAPS_ONLY', locationScope: model.locationScope });
  if (!parent.sourceVersion || parent.sourceVersion !== sourceFence || parent.commandHash !== expectedHash ||
      weeklyDigest(comparison) !== weeklyDigest(parent.comparison) || expiresAt !== expectedExpiry ||
      alternatives.some(a => !coverageUuid(a.id) || a.reviewHref !== reviewHref(a.id))) return conflict();
  const checkFlags = () => {
    const flags = readFeatureFlags(env);
    if (!flags.ownerAdvisor || !flags.ownerAdvisorWeekly || flags.ownerAdvisorKnowledge !== parent.context.knowledgeEnabled) return conflict();
  };
  checkFlags(); await store.assertContext(parent.context, signal);
  for (const alternative of alternatives) {
    const row = await store.readReview(alternative.id, signal);
    if (row.comparison_id !== comparisonId || row.context_digest !== parent.contextDigest || row.source_version !== sourceFence || row.terms_digest !== alternative.termsDigest ||
        row.applied_operation || row.declined_operation || Date.parse(row.expires_at) !== Date.parse(expiresAt)) return conflict();
  }
  const { source, observedAt } = await captureCoverageSource(advisor, signal);
  if (Buffer.byteLength(JSON.stringify(source), 'utf8') > 2_000_000) throw new AdvisorError('unavailable');
  if (coverageSourceVersion(source) !== sourceFence || Date.parse(observedAt) >= Date.parse(expiresAt)) return conflict();
  const scope = store.scope, refs = alternatives.map(a => ({ id: a.id, digest: a.termsDigest }));
  const assertion: SqlStatement = {
    text: `SELECT(CASE WHEN $10::timestamptz>clock_timestamp() AND EXISTS(SELECT 1 FROM owner_advisor_weekly_operations WHERE workspace_id=$1 AND owner_id=$2 AND request_id=$3
      AND command_kind='compare_week' AND command_hash=$4 AND authority=$5 AND session_hash=$6 AND context_digest=$7 AND source_version=$8 AND state='completed' AND result=$9)
      AND (SELECT count(*) FROM owner_advisor_weekly_reviews WHERE workspace_id=$1 AND owner_id=$2 AND comparison_id=$3)=jsonb_array_length($11::jsonb)
      AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements($11::jsonb) p WHERE NOT EXISTS(SELECT 1 FROM owner_advisor_weekly_reviews r
        WHERE r.workspace_id=$1 AND r.owner_id=$2 AND r.comparison_id=$3 AND r.review_id=(p->>'id')::uuid AND r.terms_digest=p->>'digest'
        AND r.authority=$5 AND r.session_hash=$6 AND r.context_digest=$7 AND r.source_version=$8 AND r.expires_at=$10::timestamptz
        AND r.applied_operation IS NULL AND r.declined_operation IS NULL)) THEN '1' ELSE 'advisor_weekly_answer_changed' END)::integer`,
    values: [...scope, comparisonId, expectedHash, advisor.original.authority, advisor.proof.sessionTokenHash, parent.contextDigest, sourceFence,
      JSON.stringify(parent.comparison), expiresAt, JSON.stringify(refs)],
  };
  checkFlags();
  const checks = [...store.owner(), ...weeklyContextGuards(advisor, parent.context), assertion];
  return { expiresAt, checkFlags, source, checks,
    before: [...generationMutationGuards(source, [model.weekStart]), ...checks], after: [...checks, generationSourceGuard(source)] };
}

/** Every observed comparison can influence the explanation, including unselected
 * alternatives. Recover immutable metadata only; never re-admit a purged ID. */
export async function prepareWeeklyInvestigationFence(advisor: AdvisorStore, references: WeeklyInspectionReference[], env: Record<string, string | undefined>, signal: AbortSignal,
  originalRequestId: string, visible?: WeeklyModelComparison): Promise<WeeklyAnswerFence> {
  if (!Array.isArray(references) || !references.length || references.length >= ADVISOR_MAX_TOOL_CALLS ||
      new Set(references.map(r => r.comparisonId)).size !== references.length || references.some(r => !record(r) || Object.keys(r).sort().join(',') !== 'comparisonId,occurrence' ||
        !coverageUuid(r.comparisonId) || !validOccurrence(r.occurrence))) return conflict();
  const store = new WeeklyStore(advisor, env), models: WeeklyModelComparison[] = [];
  for (const ref of references) {
    const parent = await store.readComparison(ref.comparisonId, signal); if (!parent.sourceVersion) return conflict();
    models.push({ ...parent.comparison, ...ref, sourceFence: parent.sourceVersion,
      expiresAt: new Date(Math.min(Date.parse(parent.comparison.observedAt) + 300000, parent.context.validUntil ? Date.parse(parent.context.validUntil) : Infinity)).toISOString(),
      alternatives: parent.comparison.alternatives.map(a => ({ ...a, reviewHref: reviewHref(a.id) })) });
  }
  if (visible && !models.some(m => weeklyDigest(m) === weeklyDigest(visible))) return conflict();
  const fences: WeeklyAnswerFence[] = [];
  for (const model of models) fences.push(await prepareWeeklyAnswerFence(advisor, model, env, signal, originalRequestId));
  const source = fences[0].source;
  if (fences.some(f => coverageSourceVersion(f.source) !== coverageSourceVersion(source))) return conflict();
  const checks = fences.flatMap(f => f.checks);
  return { source, checks, expiresAt: new Date(Math.min(...fences.map(f => Date.parse(f.expiresAt)))).toISOString(), checkFlags: () => fences.forEach(f => f.checkFlags()),
    before: [...generationMutationGuards(source, models.map(m => m.weekStart)), ...checks], after: [...checks, generationSourceGuard(source)] };
}

export async function readWeeklyTool(advisor: AdvisorStore, args: WeeklyToolArgs, incoming: AbortSignal, runtime: WeeklyToolRuntime,
  budget: { sourceSlots: number; occurrence: number }): Promise<ToolResult> {
  const signal = AbortSignal.any([incoming, AbortSignal.timeout(20000)]);
  if (!Number.isInteger(budget.sourceSlots) || budget.sourceSlots < 1 || budget.sourceSlots > ADVISOR_MAX_ANSWER_SOURCES) throw new AdvisorError('limit');
  if (!validOccurrence(budget.occurrence)) throw new AdvisorError('invalid');
  await checkOwner(advisor.proof, advisor.original, advisor.ex);
  const comparisonId = weeklyToolRequestId({ workspaceId: advisor.original.workspace.id, ownerId: advisor.proof.employee.id,
    requestId: runtime.origin.requestId, occurrence: budget.occurrence });
  const response = await weeklyService(advisor.proof, advisor.ex, runtime.env, signal,
    { op: 'compare_week', requestId: comparisonId, ...args, mode: 'FILL_GAPS_ONLY' }, runtime.origin);
  if (response.state !== 'ready' || !response.comparison || response.authority !== advisor.original.authority) return conflict();
  const parent = await new WeeklyStore(advisor, runtime.env).readComparison(comparisonId, signal);
  if (!parent.sourceVersion && parent.comparison.state === 'unavailable' && parent.comparison.reason === 'INPUT_LIMIT') throw new AdvisorError('limit');
  if (!parent.sourceVersion || weeklyDigest(parent.comparison) !== weeklyDigest(response.comparison)) return conflict();
  const expiresAt = new Date(Math.min(Date.parse(parent.comparison.observedAt) + 300000,
    parent.context.validUntil ? Date.parse(parent.context.validUntil) : Infinity)).toISOString();
  const weeklyPlans: WeeklyModelComparison = { ...response.comparison, comparisonId, occurrence: budget.occurrence, expiresAt, sourceFence: parent.sourceVersion,
    alternatives: response.comparison.alternatives.map(a => ({ ...a, reviewHref: reviewHref(a.id) })) };
  const result: ToolResult = { observedAt: response.comparison.observedAt, weeklyPlans, partial: response.comparison.partial,
    sources: [{ label: 'Weekly draft comparison', href: weeklyPlans.alternatives[0]?.reviewHref ?? `/app/schedule?week=${args.weekStart}`, observedAt: response.comparison.observedAt }],
    data: { authority: 'READ_ONLY_COMPARISON_NO_APPROVAL_HANDLE' } };
  if (Buffer.byteLength(JSON.stringify(result), 'utf8') > 12288) throw new AdvisorError('limit');
  const fence = await prepareWeeklyAnswerFence(advisor, weeklyPlans, runtime.env, signal, runtime.origin.requestId);
  try { await advisor.ex.transaction([...fence.before, ...fence.after], signal); } catch (error) { weeklyFailure(error); }
  fence.checkFlags(); await checkOwner(advisor.proof, advisor.original, advisor.ex); signal.throwIfAborted(); return result;
}
