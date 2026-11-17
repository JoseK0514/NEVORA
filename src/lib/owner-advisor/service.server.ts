import { composeInvestigationFences, type InvestigationFence } from './investigation-fence.server';
import { prepareBusinessInvestigationFence } from './business/fence.server';
import { businessFailure } from './business/store.server';
import type { BusinessInspectionReference } from './business/model-contracts';
import {readFeatureFlags} from '../feature-flags';
import { readOperationalInsights } from "./operational-insights.server";
import { addDays } from "@/lib/date-utils";
import { memoryDay } from "./memory";
import "server-only";
import type { SqlExecutor } from "@/lib/notifications/types";
import type { SessionMutationProof } from "@/lib/shift-changes/types";
import { admitOwner, checkOwner } from "./authority.server";
import { AdvisorStore, commandHash } from "./store.server";
import { AdvisorTools } from "./tools.server";
import { readConfig } from "./config.server";
import { AdvisorError, parseCommand, type AdvisorSnapshot, type AdvisorAnswer } from "./contracts";
import { investigate, type Transport } from "./loop.server";
import { readOwnerAttention } from "./briefing.server";
import { AdvisorMemory } from "./memory.server";
import { ownerMemoryContext } from "./memory";
import { AdvisorNotebook } from "./notebook.server";
import { NotebookError, notebookContext } from "./notebook";
import { coverageAction } from "./coverage-actions.server";
import { readKnowledgeLease } from './company-knowledge.server';
import { CompanyKnowledgeReader } from './company-knowledge-reader.server';
import { prepareWeeklyInvestigationFence } from './weekly-tool.server';
import { weeklyMemoryAdmission } from './weekly-context.server';
import type { WeeklyModelComparison } from './weekly-contracts';
/** Owner-only orchestration for snapshots, saved priorities, review dispositions and
 * bounded provider questions. ask reserves its request ID/daily allowance before
 * provider I/O and persists answer/history together; identical completed requests
 * replay. Final observation rechecks current authority and bounds private display. */
export async function advisorService(
  proof: SessionMutationProof,
  ex: SqlExecutor,
  env: Record<string, string | undefined>,
  signal: AbortSignal,
  value?: unknown,
  testTransport?: Transport,
  snapshotOptions: { view?: "lease" | "detail"; responseVersion?: 2 } = {},
) {
  const rawExecutor = ex;
  signal = AbortSignal.any([signal, AbortSignal.timeout(60000)]);
  ex = {
    query: (statement, other) =>
      rawExecutor.query(
        statement,
        other ? AbortSignal.any([signal, other]) : signal,
      ),
    transaction: (statements, other) =>
      rawExecutor.transaction(
        statements,
        other ? AbortSignal.any([signal, other]) : signal,
      ),
  };
  const admission = await admitOwner(proof, ex);
  if (!readFeatureFlags(env).ownerAdvisor)
    throw new AdvisorError("disabled");
  const store = new AdvisorStore(proof, admission, ex),
    notebook = new AdvisorNotebook(store),
    memory = new AdvisorMemory(store, signal, env),
    config = readConfig(env);
  let knowledge: CompanyKnowledgeReader | undefined;
  let tools = new AdvisorTools(store, signal);
  const loadKnowledge = async () => {
    if (!readFeatureFlags(env).ownerAdvisorKnowledge) return;
    knowledge = new CompanyKnowledgeReader(store, await readKnowledgeLease(store));
    tools = new AdvisorTools(store, signal, knowledge);
  };
  const check = async () => {
    signal.throwIfAborted();
    await checkOwner(proof, admission, ex);
    await knowledge?.check();
  };
  const observation = async (weekly?: InvestigationFence) => {
    await check();
    weekly?.checkFlags();
    const statement = {
      text: `WITH observed AS MATERIALIZED (SELECT clock_timestamp() AS at) SELECT observed.at::text AS "observedAt",LEAST(15000,GREATEST(0,floor(EXTRACT(epoch FROM(LEAST(expires_at,coalesce($2::timestamptz,expires_at)${weekly ? ',coalesce($3::timestamptz,expires_at)' : ''})-observed.at))*1000)))::integer AS "validForMs" FROM employee_sessions CROSS JOIN observed WHERE token_hash=$1`,
      values: [proof.sessionTokenHash, knowledge?.lease.validUntil ?? null, ...(weekly ? [weekly.expiresAt] : [])],
    };
    type Stamp = { observedAt: string; validForMs: number };
    let row: Stamp | undefined;
    if (weekly) {
      const results = await ex.transaction([...weekly.before, statement, ...weekly.after], signal).catch(businessFailure);
      [row] = results[weekly.before.length] as Stamp[];
    } else [row] = knowledge ? await store.knowledgeTransaction<Stamp>(statement, knowledge.lease, signal) : await store.transaction<Stamp>(statement, signal);
    if (!row || row.validForMs <= 0) throw new AdvisorError(weekly || knowledge ? 'conflict' : 'forbidden');
    weekly?.checkFlags();
    return { authority: admission.authority, ...row };
  };
  if (value === undefined) {
    await loadKnowledge();
    const attention = await readOwnerAttention(store);
    const savedMemory = await memory.read();
    const state = await store.read(knowledge?.lease.fingerprint),
      briefing = await tools.briefing(attention.today);
    const endDate = attention.today.state === "ready" ? attention.today.today : memoryDay(new Date().toISOString(), admission.workspace.timeZone);
    const operationalInsights = snapshotOptions.view === "detail" ? await readOperationalInsights(store, { startDate: addDays(endDate, -27), endDate }, signal) : undefined;
    return {
      state: "ready",
      ...(operationalInsights ? { operationalInsights } : {}),
      connection: config ? "available" : "unavailable",
      ...state,
      briefing,
      attention: attention.briefing,
      notebook: await notebook.read(),
      memory: savedMemory,
      ...(await observation()),
    } satisfies AdvisorSnapshot;
  }
  const command = parseCommand(value);
  if (command.op === "prepare_coverage_draft" || command.op === "apply_coverage_draft" || command.op === "check_coverage_draft") {
    return { ...(await coverageAction(store, command, signal, env)), ...(await observation()) };
  }
  if (command.op === "inspect") {
    const result = await tools.run(command.tool);
    return { state: "answered" as const, answer: {
      text: command.tool.name === "legal_research" ? "Primary-source research only. Legal applicability and financial readiness remain unverified. Inspect source status, extraction limits and missing facts; a qualified exact-source review is still required." : command.tool.name === "coverage_plan"
        ? "Compare the jointly checked day plans against the observed schedule. Each alternative is a separate hypothetical allocation at that source; do not combine them. Review remaining requirements and any excluded locations. This comparison does not save or publish changes."
        : command.tool.name === "coverage_proposals"
        ? `Prepared ${result.proposals?.length ?? 0} coverage options from the current planning ledger, including drafts. Nothing has been saved. Review each exact replacement in Scheduling; other requirements may remain open.${result.partial ? " Some information or options are unavailable or omitted." : ""}`
        : command.tool.args.language === "es"
          ? "Revise las excepciones registradas del período. La preparación de nómina sigue sin verificar; abra Nómina para comprobar las reglas y los datos actuales. No se modificó ningún registro."
          : "Review the period's recorded exceptions. Payroll readiness remains unverified; open Payroll to verify current rules and inputs. No records were changed.",
      sources: result.sources, ...(result.legalResearch ? { legalResearch: result.legalResearch } : {}), ...(result.proposals ? { proposals: result.proposals } : {}), ...(result.periodReview ? { periodReview: result.periodReview } : {}), ...(result.coveragePlans ? { coveragePlans: result.coveragePlans } : {}),
    }, ...(await observation()) };
  }
  if (command.op === "review_briefing") {
    const replay = await store.briefingReplay(command);
    if (replay) return { state: "briefing_reviewed" as const, revision: replay.revision, ...(await observation()) };
    const attention = await readOwnerAttention(store);
    const issue = attention.issues.find(i => i.id === command.issueId && i.fingerprint === command.fingerprint);
    if (!issue) throw new AdvisorError("conflict");
    const result = await store.reviewBriefing(command, issue);
    return { state: "briefing_reviewed" as const, revision: result.revision, ...(await observation()) };
  }
  if (command.op === "save_priorities") {
    const profile = await store.save(command);
    return { state: "saved" as const, profile, ...(await observation()) };
  }
  if (command.op === "memory") {
    const result = await memory.save(command);
    return { state: "memory_saved" as const, revision: result.revision, ...(await observation()) };
  }
  if (command.op === "notebook") {
    const result = await notebook.save(command);
    return { state: "notebook_saved" as const, revision: result.revision, ...(await observation()) };
  }
  if (command.op !== "ask" && command.op !== "ask_task" && command.op !== "ask_decision") throw new AdvisorError("invalid");
  // Stored receipts retain all revision fences. Existing clients accept only the
  // original context shape; schema2 and explicit decision commands opt in.
  const publicAnswer = (stored: AdvisorAnswer): AdvisorAnswer => {
    const { weeklyInspectionRefs: _privateReferences, businessInspectionRefs: _privateBusinessReferences, ...answer } = stored;
    return snapshotOptions.responseVersion === 2 || command.op === "ask_decision" || !answer.context
      ? answer
      : { ...answer, context: { notebookRevision: answer.context.notebookRevision, taskId: answer.context.taskId } };
  };
  if (!config) throw new AdvisorError("unavailable");
  await loadKnowledge();
  await check();
  // Purge expired context before replay admission, so an expired value cannot
  // survive through an otherwise idempotent completed answer.
  const savedMemory = await memory.read();
  const receipt = await store.reserve(
    command.requestId,
    commandHash(command),
    config.dailyLimit,
    knowledge?.lease,
  );
  if (receipt.replay) {
    if (receipt.replay.weeklyPlans && receipt.replay.weeklyInspectionRefs === undefined) throw new AdvisorError('conflict');
    const weekly = receipt.replay.weeklyInspectionRefs === undefined ? undefined : await prepareWeeklyInvestigationFence(store, receipt.replay.weeklyInspectionRefs,
      env, signal, command.requestId, receipt.replay.weeklyPlans);
    if (receipt.replay.businessEvidence?.length && !receipt.replay.businessInspectionRefs?.length) throw new AdvisorError('conflict');
    const business = receipt.replay.businessInspectionRefs === undefined ? undefined : await prepareBusinessInvestigationFence(store, receipt.replay.businessInspectionRefs, env, signal, command.requestId, receipt.replay.businessEvidence);
    return {
      state: "answered" as const,
      answer: publicAnswer(receipt.replay),
      ...(await observation(composeInvestigationFences(business, weekly))),
    };
  }
  let settlement: InvestigationFence | undefined;
  try {
    const state = await store.read(knowledge?.lease.fingerprint);
    const saved = await notebook.read();
    if (command.op === "ask_task" && (saved.state !== "ready" || saved.notebook.revision !== command.expectedNotebookRevision)) throw new AdvisorError(saved.state === "ready" ? "conflict" : "unavailable");
    const savedContext = saved.state === "ready" ? notebookContext(saved.notebook, command.op === "ask_task" ? command.taskId : undefined) : undefined;
    const memoryFocus = (command.op === 'ask_decision' ? command.focus : savedContext?.selectedTask?.focus) ?? { kind: 'general' as const };
    const memoryAt = savedMemory.state === 'ready' ? await memory.clock() : undefined;
    const memoryContext = savedMemory.state === 'ready' && memoryAt ? ownerMemoryContext(savedMemory.memory, memoryAt, memoryFocus, admission.workspace.timeZone) : undefined;
    const flags = readFeatureFlags(env), weeklyPlanning = flags.ownerAdvisorWeekly, businessRetrieval = flags.ownerAdvisorBusinessRetrieval;
    const origin = { requestId: command.requestId, profileRevision: state.profile.revision,
      ...(savedContext ? { notebookRevision: savedContext.revision } : {}), ...(memoryContext && savedMemory.state === 'ready' && memoryAt ? { memoryRevision: memoryContext.revision,
        memoryAdmission: weeklyMemoryAdmission(savedMemory.memory, memoryAt, admission.workspace.timeZone, memoryFocus) } : {}),
      ...(knowledge ? { knowledge: knowledge.lease } : {}) };
    if (weeklyPlanning || businessRetrieval) tools = new AdvisorTools(store, signal, knowledge, weeklyPlanning ? { env, origin } : undefined, businessRetrieval ? { env, origin } : undefined);
    const weeklyObservations: WeeklyModelComparison[] = [];
    const businessObservations: BusinessInspectionReference[] = [];
    const answer = await investigate(
      config,
      state.history,
      state.profile.priorities,
      command.message,
      {
        check,
        ...(command.op === "ask_decision" ? { decisionContext: { objective: command.objective, focus: command.focus } } : {}),
        tool: async (call, budget) => {
          const result = await tools.run(call, budget);
          if (result.weeklyPlans) weeklyObservations.push(result.weeklyPlans);
          if (result.businessInspectionRef) businessObservations.push(result.businessInspectionRef);
          return result;
        },
        ...(knowledge ? { companyKnowledge: true } : {}),
        ...(weeklyPlanning ? { weeklyPlanning: true } : {}),
        ...(businessRetrieval ? { businessRetrieval: true } : {}),
        signal,
        ...(savedContext ? { savedContext } : {}),
        ...(memoryContext ? { memoryContext } : {}),
        ...(testTransport ? { fetch: testTransport } : {}),
      },
    );
    answer.context = { profileRevision: state.profile.revision, memoryRevision: memoryContext?.revision ?? null, notebookRevision: savedContext?.revision ?? null, taskId: command.op === "ask_task" ? command.taskId : null };
    if (weeklyObservations.length) answer.weeklyInspectionRefs = weeklyObservations.map(p => ({ comparisonId: p.comparisonId, occurrence: p.occurrence }));
    if (answer.weeklyPlans && !answer.weeklyInspectionRefs) throw new AdvisorError('conflict');
    if (businessObservations.length) answer.businessInspectionRefs = businessObservations;
    if (answer.businessEvidence?.length && !answer.businessInspectionRefs?.length) throw new AdvisorError('conflict');
    await check();
    await memory.read(); // Expiry during inference also invalidates settlement.
    const weeklyFence = answer.weeklyInspectionRefs ? await prepareWeeklyInvestigationFence(store, answer.weeklyInspectionRefs, env, signal, command.requestId, answer.weeklyPlans) : undefined;
    const businessFence = answer.businessInspectionRefs ? await prepareBusinessInvestigationFence(store, answer.businessInspectionRefs, env, signal, command.requestId, answer.businessEvidence) : undefined;
    settlement = composeInvestigationFences(businessFence, weeklyFence);
    settlement?.checkFlags();
    await store.complete(command.requestId, command.message, answer, savedContext?.revision, memoryContext?.revision, state.profile.revision, knowledge?.lease, settlement);
    return { state: "answered" as const, answer: publicAnswer(answer), ...(await observation(settlement)) };
  } catch (error) {
    const cleanupSignal = AbortSignal.timeout(1000);
    const cleanup: SqlExecutor = {
      query: (statement) => rawExecutor.query(statement, cleanupSignal),
      transaction: (statements) =>
        rawExecutor.transaction(statements, cleanupSignal),
    };
    await new AdvisorStore(proof, admission, cleanup)
      .fail(command.requestId)
      .catch(() => {});
    if (error instanceof NotebookError) throw new AdvisorError(error.code);
    if (settlement) businessFailure(error);
    throw error;
  }
}
