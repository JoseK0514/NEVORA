import "server-only";
import { createHash } from "node:crypto";
import type { SessionMutationProof } from "@/lib/shift-changes/types";
import type { SqlExecutor, SqlStatement } from "@/lib/notifications/types";
import { ownerGuards, type OwnerAdmission } from "./authority.server";
import type { AttentionReview, InternalAttention } from "./briefing";
import type { KnowledgeFence } from './company-knowledge';
import { knowledgeFenceGuards } from './company-knowledge-fence.server';
import {
  AdvisorError,
  record,
  type AdvisorErrorCode,
  type AdvisorMessage,
  type AdvisorProfile,
  type AdvisorAnswer,
  type AdvisorCommand,
} from "./contracts";
export const commandHash = (command: AdvisorCommand) =>
  createHash("sha256").update(JSON.stringify(command)).digest("hex");
/** Owner/workspace-scoped persistence. Each single-statement helper wraps current
 * original admission guards on both sides; multi-statement completion applies the
 * same guards plus request lease checks. Provider side effects cannot be rolled back
 * by a database failure, so failed/ambiguous requests retain their recorded identity. */
export class AdvisorStore {
  private hasKnowledgeColumn = false;
  constructor(
    readonly proof: SessionMutationProof,
    readonly original: OwnerAdmission,
    readonly ex: SqlExecutor,
  ) {}
  private get scope() {
    return [this.original.workspace.id, this.proof.employee.id];
  }
  async transaction<T>(
    statement: SqlStatement,
    signal?: AbortSignal,
  ): Promise<T[]> {
    const guards = ownerGuards(this.proof, this.original);
    const result = await this.ex.transaction(
      [...guards, statement, ...ownerGuards(this.proof, this.original)],
      signal,
    );
    return result[guards.length] as T[];
  }
  async knowledgeTransaction<T>(statement: SqlStatement, fence: KnowledgeFence, signal?: AbortSignal): Promise<T[]> {
    const guards = [...knowledgeFenceGuards(this.scope[0], fence), ...ownerGuards(this.proof, this.original)];
    try {
      const results = await this.ex.transaction([...guards, statement, ...ownerGuards(this.proof, this.original), ...knowledgeFenceGuards(this.scope[0], fence)], signal);
      return results[guards.length] as T[];
    } catch (error) {
      if (record(error) && typeof error.message === 'string' && error.message.includes('advisor_knowledge_changed')) throw new AdvisorError('conflict');
      throw error;
    }
  }
  async read(knowledgeFingerprint: string | null = null) {
    const [row] = await this.transaction<{
      priorities: string;
      revision: number;
      history: AdvisorMessage[];
      knowledgeFingerprint: string | null;
      hasKnowledgeColumn: boolean;
    }>({
      text: "SELECT priorities,revision,history,to_jsonb(p)->>'knowledge_fingerprint' AS \"knowledgeFingerprint\",to_jsonb(p)?'knowledge_fingerprint' AS \"hasKnowledgeColumn\" FROM owner_advisor_profiles p WHERE workspace_id=$1 AND owner_id=$2",
      values: this.scope,
    });
    this.hasKnowledgeColumn = row?.hasKnowledgeColumn ?? false;
    return {
      profile: row
        ? { priorities: row.priorities, revision: row.revision }
        : { priorities: "", revision: 0 },
      history: row && row.knowledgeFingerprint === knowledgeFingerprint ? row.history : [],
    };
  }
  async save(
    command: Extract<AdvisorCommand, { op: "save_priorities" }>,
  ): Promise<AdvisorProfile> {
    const [row] = await this.transaction<{
      result: AdvisorProfile & { error?: AdvisorErrorCode };
    }>({
      text: "SELECT owner_advisor_save($1,$2,$3,$4,$5,$6) AS result",
      values: [
        ...this.scope,
        command.requestId,
        commandHash(command),
        command.expectedRevision,
        command.priorities,
      ],
    });
    if (row.result.error) throw new AdvisorError(row.result.error);
    return row.result;
  }
  async reserve(requestId: string, hash: string, cap: number, knowledge?: KnowledgeFence) {
    const statement = {
      // JSON projection also works on the pre-knowledge schema. In feature-off
      // mode a previously tagged answer must not become an unfenced replay.
      text: `SELECT CASE WHEN EXISTS(SELECT 1 FROM owner_advisor_requests r WHERE workspace_id=$1 AND owner_id=$2 AND request_id=$3 AND state='completed' AND (to_jsonb(r)->>'knowledge_fingerprint') IS DISTINCT FROM $6::text) THEN jsonb_build_object('error','conflict') ELSE owner_advisor_reserve($1,$2,$3,$4,$5) END AS result`,
      values: [...this.scope, requestId, hash, cap, knowledge?.fingerprint ?? null],
    };
    type Reservation = {
      result: {
        error?: AdvisorErrorCode;
        replay?: AdvisorAnswer;
        admitted?: boolean;
      };
    };
    let row: Reservation;
    try {
      const guards = [...(knowledge ? knowledgeFenceGuards(this.scope[0], knowledge) : []), ...ownerGuards(this.proof, this.original)];
      const results = await this.ex.transaction([
        ...guards,
        // Separate statement: the fingerprint CASE must observe a completion
        // committed while we were waiting for the reservation/settlement lock.
        { text: "SELECT pg_advisory_xact_lock(hashtextextended('owner-advisor:'||$1,0))", values: [this.scope[0]] },
        statement, ...ownerGuards(this.proof, this.original), ...(knowledge ? knowledgeFenceGuards(this.scope[0], knowledge) : []),
      ]);
      [row] = results[guards.length + 1] as Reservation[];
    } catch (error) {
      if (record(error) && typeof error.message === 'string' && error.message.includes('advisor_knowledge_changed')) throw new AdvisorError('conflict');
      throw error;
    }
    if (row.result.error) throw new AdvisorError(row.result.error);
    return row.result;
  }
  async briefingReviews(): Promise<AttentionReview[]> {
    return this.transaction<AttentionReview>({
      text: `SELECT issue_id AS id,fingerprint,kind,issue_date::text AS date,location_id AS "locationId",proof,disposition,deferred_until::text AS "deferredUntil",revision FROM owner_advisor_briefing_reviews WHERE workspace_id=$1 AND owner_id=$2 ORDER BY updated_at DESC,issue_id LIMIT 50`,
      values: this.scope,
    });
  }
  async briefingReplay(command: Extract<AdvisorCommand, {op: "review_briefing"}>) {
    const [row] = await this.transaction<{command_hash: string; kind: string; result: {revision: number}}>(
      {text: "SELECT command_hash,kind,result FROM owner_advisor_requests WHERE workspace_id=$1 AND owner_id=$2 AND request_id=$3", values: [...this.scope, command.requestId]});
    if (!row) return null;
    if (row.kind !== "review_briefing" || row.command_hash !== commandHash(command)) throw new AdvisorError("conflict");
    return row.result;
  }
  async reviewBriefing(command: Extract<AdvisorCommand, {op: "review_briefing"}>, issue: InternalAttention) {
    if (issue.proof.length > 10000) throw new AdvisorError("limit");
    const [row] = await this.transaction<{result: {revision: number; error?: AdvisorErrorCode}}>({
      text: "SELECT owner_advisor_review_briefing($1,$2,$3,$4,$5,$6,$7::date,$8,$9,$10::jsonb,$11,$12) AS result",
      values: [...this.scope, command.requestId, commandHash(command), issue.id, issue.fingerprint, issue.date, issue.kind, issue.locationId, JSON.stringify(issue.proof), command.expectedRevision, command.disposition],
    });
    if (row.result.error) throw new AdvisorError(row.result.error);
    return row.result;
  }
  async fail(requestId: string) {
    await this.transaction({
      text: "UPDATE owner_advisor_requests SET state='failed' WHERE workspace_id=$1 AND owner_id=$2 AND request_id=$3 AND state='running'",
      values: [...this.scope, requestId],
    });
  }
  /** Commit bounded recent chat history and its recoverable answer while the running
   * request lease is current; retain only the six latest completed ask payloads. */
  async complete(requestId: string, message: string, answer: AdvisorAnswer, notebookRevision?: number, memoryRevision?: number, profileRevision?: number, knowledge?: KnowledgeFence,
    settlement?: { before: SqlStatement[]; after: SqlStatement[] }) {
    const guards = ownerGuards(this.proof, this.original);
    // Weekly and business evidence are session/source/time-bound. Its direct answer remains in
    // the fenced request receipt; neither turn may enter ordinary reusable history.
    // Capture the unrelated history and assert it unchanged inside/after settlement.
    const priorHistory = settlement ? (await this.transaction<{ history: AdvisorMessage[] }>({
      text: 'SELECT history FROM owner_advisor_profiles WHERE workspace_id=$1 AND owner_id=$2', values: this.scope,
    }))[0]?.history ?? [] : undefined;
    try { await this.ex.transaction([
      ...(settlement?.before ?? []),
      ...(knowledge ? knowledgeFenceGuards(this.scope[0], knowledge) : []),
      ...guards,
      {
        text: "SELECT pg_advisory_xact_lock(hashtextextended('owner-advisor:'||$1,0))",
        values: [this.scope[0]],
      },
      {
        text: "SELECT(CASE WHEN EXISTS(SELECT 1 FROM owner_advisor_requests WHERE workspace_id=$1 AND owner_id=$2 AND request_id=$3 AND state='running' AND lease_until>clock_timestamp()) THEN '1' ELSE 'advisor_lease_expired' END)::integer",
        values: [...this.scope, requestId],
      },
      // The same workspace advisory lock serializes notebook saves and answer
      // settlement. A changed context rolls back history and the answer together.
      ...(notebookRevision === undefined ? [] : [{
        text: "SELECT(CASE WHEN COALESCE((SELECT revision FROM owner_advisor_notebooks WHERE workspace_id=$1 AND owner_id=$2),0)=$3 THEN '1' ELSE 'advisor_notebook_changed' END)::integer",
        values: [...this.scope, notebookRevision],
      }]),
      ...(memoryRevision === undefined ? [] : [{
        text: "SELECT(CASE WHEN COALESCE((SELECT revision FROM owner_advisor_memories WHERE workspace_id=$1 AND owner_id=$2),0)=$3 THEN '1' ELSE 'advisor_context_changed' END)::integer",
        values: [...this.scope, memoryRevision],
      }]),
      ...(profileRevision === undefined ? [] : [{
        text: "SELECT(CASE WHEN COALESCE((SELECT revision FROM owner_advisor_profiles WHERE workspace_id=$1 AND owner_id=$2),0)=$3 THEN '1' ELSE 'advisor_context_changed' END)::integer",
        values: [...this.scope, profileRevision],
      }]),
      {
        text: "INSERT INTO owner_advisor_profiles(workspace_id,owner_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
        values: this.scope,
      },
      ...(settlement ? [{ text: `SELECT(CASE WHEN EXISTS(SELECT 1 FROM owner_advisor_profiles WHERE workspace_id=$1 AND owner_id=$2 AND history=$3::jsonb)
        THEN '1' ELSE 'advisor_weekly_history_changed' END)::integer`, values: [...this.scope, JSON.stringify(priorHistory)] }] : [{
        text: `UPDATE owner_advisor_profiles SET history=(SELECT jsonb_agg(item ORDER BY n) FROM (SELECT item,n FROM jsonb_array_elements((CASE WHEN (to_jsonb(owner_advisor_profiles)->>'knowledge_fingerprint') IS NOT DISTINCT FROM $4::text THEN history ELSE '[]'::jsonb END)||$3::jsonb) WITH ORDINALITY a(item,n) ORDER BY n DESC LIMIT 12)t)${knowledge || this.hasKnowledgeColumn ? ',knowledge_fingerprint=$4' : ''} WHERE workspace_id=$1 AND owner_id=$2`,
        values: [
          ...this.scope,
          JSON.stringify([
            { role: "user", content: message },
            { role: "assistant", content: answer.text },
          ]),
          knowledge?.fingerprint ?? null,
        ],
      },]),
      {
        text: `UPDATE owner_advisor_requests SET state='completed',result=$4::jsonb${knowledge ? ',knowledge_fingerprint=$5' : ''} WHERE workspace_id=$1 AND owner_id=$2 AND request_id=$3`,
        values: [...this.scope, requestId, JSON.stringify(answer), ...(knowledge ? [knowledge.fingerprint] : [])],
      },
      {
        text: "UPDATE owner_advisor_requests SET result=NULL WHERE workspace_id=$1 AND owner_id=$2 AND request_id IN(SELECT request_id FROM owner_advisor_requests WHERE workspace_id=$1 AND owner_id=$2 AND kind='ask' AND state='completed' ORDER BY created_at DESC,request_id DESC OFFSET 6)",
        values: this.scope,
      },
      ...ownerGuards(this.proof, this.original),
      ...(knowledge ? knowledgeFenceGuards(this.scope[0], knowledge) : []),
      ...(settlement?.after ?? []),
      ...(settlement ? [{ text: `SELECT(CASE WHEN EXISTS(SELECT 1 FROM owner_advisor_requests WHERE workspace_id=$1 AND owner_id=$2 AND request_id=$3 AND state='completed' AND result=$4::jsonb)
        AND EXISTS(SELECT 1 FROM owner_advisor_profiles WHERE workspace_id=$1 AND owner_id=$2 AND history=$5::jsonb)
        THEN '1' ELSE 'advisor_weekly_settlement_custody' END)::integer`, values: [...this.scope, requestId, JSON.stringify(answer), JSON.stringify(priorHistory)] }] : []),
    ]); } catch (error) {
      if (record(error) && typeof error.message === "string" && /"advisor_(?:notebook_changed|context_changed|lease_expired|knowledge_changed)"/.test(error.message)) throw new AdvisorError("conflict");
      throw error;
    }
  }
}
