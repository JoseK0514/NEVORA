import "server-only";
import { AdvisorError, record } from "./contracts";
import { AdvisorStore, commandHash } from "./store.server";
import { applyNotebookCommand, emptyNotebook, NotebookError, notebookRevision, parseNotebook, type NotebookCommand, type NotebookRead } from "./notebook";

/** Every read/write uses the existing original-Owner/company transaction guards.
 * A missing additive schema disables only the notebook; a broken/present schema
 * never masquerades as an empty successful read. */
export class AdvisorNotebook {
  constructor(private readonly store: AdvisorStore) {}
  private get scope() { return [this.store.original.workspace.id, this.store.proof.employee.id]; }
  private async available() {
    const [row] = await this.store.transaction<{ available: boolean }>({
      text: "SELECT to_regclass('owner_advisor_notebooks') IS NOT NULL AND to_regprocedure('owner_advisor_save_notebook(text,text,uuid,text,integer,jsonb,jsonb)') IS NOT NULL AS available",
      values: [],
    });
    return row?.available === true;
  }
  async read(): Promise<NotebookRead> {
    if (!await this.available()) return { state: "unavailable" };
    const [row] = await this.store.transaction<{ revision: number; goals: unknown; tasks: unknown }>({
      text: "SELECT revision,goals,tasks FROM owner_advisor_notebooks WHERE workspace_id=$1 AND owner_id=$2",
      values: this.scope,
    });
    try { return { state: "ready", notebook: row ? parseNotebook(row) : emptyNotebook() }; }
    catch { throw new AdvisorError("unavailable"); }
  }
  async save(command: NotebookCommand): Promise<{ revision: number }> {
    const current = await this.read();
    if (current.state !== "ready") throw new AdvisorError("unavailable");
    // Replay precedes the revision/target check: a repeated delete still succeeds
    // after the target has gone, while an altered or cross-operation ID conflicts.
    const hash = commandHash(command);
    const [prior] = await this.store.transaction<{ command_hash: string; kind: string; state: string; result: unknown }>({
      text: "SELECT command_hash,kind,state,result FROM owner_advisor_requests WHERE workspace_id=$1 AND owner_id=$2 AND request_id=$3",
      values: [...this.scope, command.requestId],
    });
    if (prior) {
      if (prior.command_hash !== hash || prior.kind !== "notebook" || prior.state !== "completed" || !record(prior.result) || !notebookRevision(prior.result.revision)) throw new AdvisorError("conflict");
      return { revision: prior.result.revision };
    }
    let next;
    try { next = applyNotebookCommand(current.notebook, command, new Date().toISOString()); }
    catch (error) { if (error instanceof NotebookError) throw new AdvisorError(error.code); throw error; }
    const [row] = await this.store.transaction<{ result: unknown }>({
      text: "SELECT owner_advisor_save_notebook($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb) AS result",
      values: [...this.scope, command.requestId, hash, command.expectedRevision, JSON.stringify(next.goals), JSON.stringify(next.tasks)],
    });
    if (record(row?.result) && (row.result.error === "conflict" || row.result.error === "invalid")) throw new AdvisorError(row.result.error);
    if (!record(row?.result) || !notebookRevision(row.result.revision)) throw new AdvisorError("unavailable");
    return { revision: row.result.revision };
  }
}
