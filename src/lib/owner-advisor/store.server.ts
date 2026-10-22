import "server-only";
import { createHash } from "node:crypto";
import type { SessionMutationProof } from "@/lib/shift-changes/types";
import type { SqlExecutor, SqlStatement } from "@/lib/notifications/types";
import { ownerGuards, type OwnerAdmission } from "./authority.server";
import {
  AdvisorError,
  type AdvisorErrorCode,
  type AdvisorMessage,
  type AdvisorProfile,
  type AdvisorAnswer,
  type AdvisorCommand,
} from "./contracts";
export const commandHash = (command: AdvisorCommand) =>
  createHash("sha256").update(JSON.stringify(command)).digest("hex");
export class AdvisorStore {
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
  async read() {
    const [row] = await this.transaction<{
      priorities: string;
      revision: number;
      history: AdvisorMessage[];
    }>({
      text: "SELECT priorities,revision,history FROM owner_advisor_profiles WHERE workspace_id=$1 AND owner_id=$2",
      values: this.scope,
    });
    return {
      profile: row
        ? { priorities: row.priorities, revision: row.revision }
        : { priorities: "", revision: 0 },
      history: row?.history ?? [],
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
  async reserve(requestId: string, hash: string, cap: number) {
    const [row] = await this.transaction<{
      result: {
        error?: AdvisorErrorCode;
        replay?: AdvisorAnswer;
        admitted?: boolean;
      };
    }>({
      text: "SELECT owner_advisor_reserve($1,$2,$3,$4,$5) AS result",
      values: [...this.scope, requestId, hash, cap],
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
  async complete(requestId: string, message: string, answer: AdvisorAnswer) {
    const guards = ownerGuards(this.proof, this.original);
    await this.ex.transaction([
      ...guards,
      {
        text: "SELECT pg_advisory_xact_lock(hashtextextended('owner-advisor:'||$1,0))",
        values: [this.scope[0]],
      },
      {
        text: "SELECT(CASE WHEN EXISTS(SELECT 1 FROM owner_advisor_requests WHERE workspace_id=$1 AND owner_id=$2 AND request_id=$3 AND state='running' AND lease_until>clock_timestamp()) THEN '1' ELSE 'advisor_lease_expired' END)::integer",
        values: [...this.scope, requestId],
      },
      {
        text: "INSERT INTO owner_advisor_profiles(workspace_id,owner_id) VALUES($1,$2) ON CONFLICT DO NOTHING",
        values: this.scope,
      },
      {
        text: `UPDATE owner_advisor_profiles SET history=(SELECT jsonb_agg(item ORDER BY n) FROM (SELECT item,n FROM jsonb_array_elements(history||$3::jsonb) WITH ORDINALITY a(item,n) ORDER BY n DESC LIMIT 12)t) WHERE workspace_id=$1 AND owner_id=$2`,
        values: [
          ...this.scope,
          JSON.stringify([
            { role: "user", content: message },
            { role: "assistant", content: answer.text },
          ]),
        ],
      },
      {
        text: "UPDATE owner_advisor_requests SET state='completed',result=$4::jsonb WHERE workspace_id=$1 AND owner_id=$2 AND request_id=$3",
        values: [...this.scope, requestId, JSON.stringify(answer)],
      },
      {
        text: "UPDATE owner_advisor_requests SET result=NULL WHERE workspace_id=$1 AND owner_id=$2 AND request_id IN(SELECT request_id FROM owner_advisor_requests WHERE workspace_id=$1 AND owner_id=$2 AND kind='ask' AND state='completed' ORDER BY created_at DESC,request_id DESC OFFSET 6)",
        values: this.scope,
      },
      ...ownerGuards(this.proof, this.original),
    ]);
  }
}
