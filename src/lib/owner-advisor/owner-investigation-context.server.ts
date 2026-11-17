import 'server-only';
import type { AdvisorStore } from './store.server';
import { AdvisorError, record } from './contracts';
import { readFeatureFlags } from '@/lib/feature-flags';
import { readKnowledgeLease } from './company-knowledge.server';
import { knowledgeFenceGuards } from './company-knowledge-fence.server';
import type { KnowledgeFence } from './company-knowledge';
import { AdvisorMemory } from './memory.server';
import { localDateTimeToInstant } from '@/lib/business-time';
import { addDays } from '@/lib/date-utils';
import { ownerMemoryContext, memoryDay, type OwnerMemory } from './memory';
import { parseTaskFocus, type TaskFocus } from './notebook';
import { weeklyDigest } from './weekly-digest.server';
import type { SqlStatement } from '@/lib/notifications/types';
import { ownerGuards } from './authority.server';

export type OwnerInvestigationMemoryAdmission = { digest: string; focus: TaskFocus; validUntil: string };
export type OwnerInvestigationOrigin = { requestId: string; profileRevision: number; notebookRevision?: number; memoryRevision?: number;
  memoryAdmission?: OwnerInvestigationMemoryAdmission; knowledge?: KnowledgeFence };
/** Bind exactly the memory projection supplied to this investigation, before
 * provider I/O. A local-day transition changes general applicability even when
 * the stored revision does not; future decisions activate on decisionDate. */
export function ownerInvestigationMemoryAdmission(memory: OwnerMemory, observedAt: string, timeZone: string, focus: TaskFocus = { kind: 'general' }): OwnerInvestigationMemoryAdmission {
  const now = Date.parse(observedAt), selected = parseTaskFocus(focus);
  if (!Number.isFinite(now)) throw new AdvisorError('conflict');
  const boundaries = [Date.parse(localDateTimeToInstant(`${addDays(memoryDay(observedAt, timeZone), 1)}T00:00`, timeZone))];
  for (const row of [...memory.intents, ...memory.decisions]) {
    const activation = 'effectiveDate' in row ? row.effectiveDate : row.decisionDate;
    for (const at of [localDateTimeToInstant(`${activation}T00:00`, timeZone),
      localDateTimeToInstant(`${addDays(row.expiryDate, 1)}T00:00`, timeZone), new Date(Date.parse(row.createdAt) + 365 * 86400000).toISOString()])
      if (Date.parse(at) > now) boundaries.push(Date.parse(at));
  }
  return { digest: weeklyDigest(ownerMemoryContext(memory, observedAt, selected, timeZone)), focus: selected,
    validUntil: new Date(Math.min(...boundaries)).toISOString() };
}
export type OwnerInvestigationContext = { profileRevision: number; notebookRevision: number | null; memoryRevision: number | null; memoryAdmission: OwnerInvestigationMemoryAdmission | null;
  knowledgeEnabled: boolean; knowledge: KnowledgeFence | null; validUntil: string | null };
function revision(value: unknown): value is number { return Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= 2147483647; }
/** Current private context is reduced to revisions/time fences. No text, saved
 * preference, source title or credential is copied into proposal metadata. */
export async function captureOwnerInvestigationContext(store: AdvisorStore, env: Record<string, string | undefined>, origin: OwnerInvestigationOrigin | undefined, signal: AbortSignal): Promise<OwnerInvestigationContext> {
  signal.throwIfAborted();
  const knowledgeEnabled = readFeatureFlags(env).ownerAdvisorKnowledge;
  const context: OwnerInvestigationContext = { profileRevision: (await store.read()).profile.revision, notebookRevision: origin?.notebookRevision ?? null,
    memoryRevision: origin?.memoryRevision ?? null, memoryAdmission: null, knowledgeEnabled, knowledge: null, validUntil: null };
  if (origin && (!revision(origin.profileRevision) || origin.profileRevision !== context.profileRevision ||
      context.notebookRevision !== null && !revision(context.notebookRevision) || context.memoryRevision !== null && !revision(context.memoryRevision))) throw new AdvisorError('conflict');
  const boundaries: number[] = [];
  if (context.memoryRevision !== null) {
    const current = await new AdvisorMemory(store, signal, env).read();
    if (current.state !== 'ready') throw new AdvisorError('unavailable');
    if (current.memory.revision !== context.memoryRevision) throw new AdvisorError('conflict');
    const [clock] = await store.transaction<{ at: string }>({ text: 'SELECT clock_timestamp()::text AS at', values: [] }, signal);
    if (!clock) throw new AdvisorError('unavailable');
    const now = Date.parse(clock.at), admitted = origin?.memoryAdmission;
    if (!admitted || Object.keys(admitted).sort().join(',') !== 'digest,focus,validUntil' || !/^[a-f0-9]{64}$/.test(admitted.digest) ||
        !Number.isFinite(Date.parse(admitted.validUntil)) || Date.parse(admitted.validUntil) <= now) throw new AdvisorError('conflict');
    const fresh = ownerInvestigationMemoryAdmission(current.memory, new Date(clock.at).toISOString(), store.original.workspace.timeZone, admitted.focus);
    if (fresh.digest !== admitted.digest) throw new AdvisorError('conflict');
    context.memoryAdmission = { ...admitted, focus: parseTaskFocus(admitted.focus) };
    boundaries.push(Date.parse(admitted.validUntil), Date.parse(fresh.validUntil));
  }
  if (knowledgeEnabled) {
    const lease = await readKnowledgeLease(store);
    context.knowledge = { revision: lease.revision, fingerprint: lease.fingerprint, validUntil: lease.validUntil };
    if (origin?.knowledge && (origin.knowledge.fingerprint !== lease.fingerprint || origin.knowledge.revision !== lease.revision)) throw new AdvisorError('conflict');
    if (lease.validUntil) boundaries.push(Date.parse(lease.validUntil));
  } else if (origin?.knowledge) throw new AdvisorError('conflict');
  context.validUntil = boundaries.length ? new Date(Math.min(...boundaries)).toISOString() : null;
  try { await store.ex.transaction([...ownerGuards(store.proof, store.original), ...ownerInvestigationContextGuards(store, context),
    ...ownerGuards(store.proof, store.original)], signal); } catch (error) { ownerInvestigationFailure(error); }
  signal.throwIfAborted(); return context;
}
/** Caller takes workspace NO KEY UPDATE before mutation locks. Existing context
 * writers take workspace SHARE before this same advisory lock. No lock upgrade. */
export function ownerInvestigationContextGuards(store: AdvisorStore, context: OwnerInvestigationContext): SqlStatement[] {
  const scope = [store.original.workspace.id, store.proof.employee.id];
  if (context.memoryRevision !== null && (!context.memoryAdmission || !/^[a-f0-9]{64}$/.test(context.memoryAdmission.digest) ||
      !context.validUntil || !Number.isFinite(Date.parse(context.memoryAdmission.validUntil)) || Date.parse(context.validUntil) > Date.parse(context.memoryAdmission.validUntil)))
    throw new AdvisorError('conflict');
  return [
    { text: "SELECT pg_advisory_xact_lock(hashtextextended('owner-advisor:'||$1,0))", values: [scope[0]] },
    { text: `SELECT(CASE WHEN COALESCE((SELECT revision FROM owner_advisor_profiles WHERE workspace_id=$1 AND owner_id=$2),0)=$3
      AND ($4::integer IS NULL OR COALESCE((SELECT revision FROM owner_advisor_notebooks WHERE workspace_id=$1 AND owner_id=$2),0)=$4)
      AND ($5::integer IS NULL OR COALESCE((SELECT revision FROM owner_advisor_memories WHERE workspace_id=$1 AND owner_id=$2),0)=$5)
      AND ($6::timestamptz IS NULL OR $6::timestamptz>clock_timestamp()) THEN '1' ELSE 'advisor_weekly_context_changed' END)::integer`,
      values: [...scope, context.profileRevision, context.notebookRevision, context.memoryRevision, context.validUntil] },
    ...(context.knowledge ? knowledgeFenceGuards(scope[0], context.knowledge) : []),
  ];
}
export function ownerInvestigationFailure(error: unknown): never {
  if (error instanceof AdvisorError) throw error;
  if (record(error)) {
    if (String(error.message).includes('advisor_weekly_limit')) throw new AdvisorError('limit');
    if (/advisor_weekly_|advisor_knowledge_changed|generation_source_conflict/.test(String(error.message)) || ['40001', '40P01', '23505'].includes(String(error.code))) throw new AdvisorError('conflict');
    if (['55P03', '57014'].includes(String(error.code))) throw new AdvisorError('busy');
  }
  throw error;
}
