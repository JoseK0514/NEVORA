import "server-only";
import type { SqlExecutor } from "@/lib/notifications/types";
import type { SessionMutationProof } from "@/lib/shift-changes/types";
import { admitOwner, checkOwner } from "./authority.server";
import { AdvisorStore, commandHash } from "./store.server";
import { AdvisorTools } from "./tools.server";
import { readConfig } from "./config.server";
import { AdvisorError, parseCommand, type AdvisorSnapshot } from "./contracts";
import { investigate, type Transport } from "./loop.server";
import { readOwnerAttention } from "./briefing.server";
import { AdvisorNotebook } from "./notebook.server";
import { NotebookError, notebookContext } from "./notebook";
import { coverageAction } from "./coverage-actions.server";
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
  if (env.NEVORA_OWNER_ADVISOR_ENABLED !== "true")
    throw new AdvisorError("disabled");
  const store = new AdvisorStore(proof, admission, ex),
    tools = new AdvisorTools(store, signal),
    notebook = new AdvisorNotebook(store),
    config = readConfig(env);
  const check = async () => {
    signal.throwIfAborted();
    await checkOwner(proof, admission, ex);
  };
  const observation = async () => {
    await check();
    const [row] = await store.transaction<{
      observedAt: string;
      validForMs: number;
    }>(
      {
        text: 'SELECT clock_timestamp()::text AS "observedAt",LEAST(15000,GREATEST(0,floor(EXTRACT(epoch FROM(expires_at-clock_timestamp()))*1000)))::integer AS "validForMs" FROM employee_sessions WHERE token_hash=$1',
        values: [proof.sessionTokenHash],
      },
      signal,
    );
    if (!row || row.validForMs <= 0) throw new AdvisorError("forbidden");
    return { authority: admission.authority, ...row };
  };
  if (value === undefined) {
    const attention = await readOwnerAttention(store);
    const state = await store.read(),
      briefing = await tools.briefing(attention.today);
    return {
      state: "ready",
      connection: config ? "available" : "unavailable",
      ...state,
      briefing,
      attention: attention.briefing,
      notebook: await notebook.read(),
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
      text: command.tool.name === "coverage_plan"
        ? "Compare the jointly checked day plans against the unchanged schedule. Each alternative is a separate hypothetical allocation at the observed source; do not combine them. Review remaining requirements and any excluded locations. Nothing has been saved or published."
        : command.tool.name === "coverage_proposals"
        ? `Prepared ${result.proposals?.length ?? 0} coverage options from the current planning ledger, including drafts. Nothing has been saved. Review each exact replacement in Scheduling; other requirements may remain open.${result.partial ? " Some information or options are unavailable or omitted." : ""}`
        : command.tool.args.language === "es"
          ? "Revise las excepciones registradas del período. La preparación de nómina sigue sin verificar; abra Nómina para comprobar las reglas y los datos actuales. No se modificó ningún registro."
          : "Review the period's recorded exceptions. Payroll readiness remains unverified; open Payroll to verify current rules and inputs. No records were changed.",
      sources: result.sources, ...(result.proposals ? { proposals: result.proposals } : {}), ...(result.periodReview ? { periodReview: result.periodReview } : {}), ...(result.coveragePlans ? { coveragePlans: result.coveragePlans } : {}),
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
  if (command.op === "notebook") {
    const result = await notebook.save(command);
    return { state: "notebook_saved" as const, revision: result.revision, ...(await observation()) };
  }
  if (command.op !== "ask" && command.op !== "ask_task") throw new AdvisorError("invalid");
  if (!config) throw new AdvisorError("unavailable");
  await check();
  const receipt = await store.reserve(
    command.requestId,
    commandHash(command),
    config.dailyLimit,
  );
  if (receipt.replay)
    return {
      state: "answered" as const,
      answer: receipt.replay,
      ...(await observation()),
    };
  try {
    const state = await store.read();
    const saved = await notebook.read();
    if (command.op === "ask_task" && (saved.state !== "ready" || saved.notebook.revision !== command.expectedNotebookRevision)) throw new AdvisorError(saved.state === "ready" ? "conflict" : "unavailable");
    const savedContext = saved.state === "ready" ? notebookContext(saved.notebook, command.op === "ask_task" ? command.taskId : undefined) : undefined;
    const answer = await investigate(
      config,
      state.history,
      state.profile.priorities,
      command.message,
      {
        check,
        tool: (call) => tools.run(call),
        signal,
        ...(savedContext ? { savedContext } : {}),
        ...(testTransport ? { fetch: testTransport } : {}),
      },
    );
    answer.context = { notebookRevision: savedContext?.revision ?? null, taskId: command.op === "ask_task" ? command.taskId : null };
    await check();
    await store.complete(command.requestId, command.message, answer, savedContext?.revision);
    return { state: "answered" as const, answer, ...(await observation()) };
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
    throw error;
  }
}
