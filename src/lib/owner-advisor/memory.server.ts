import "server-only";
import { AdvisorError, record } from "./contracts";
import { AdvisorStore, commandHash } from "./store.server";
import { notebookRevision } from "./notebook";
import { applyMemoryCommand, emptyMemory, MemoryError, parseMemory, parseMemoryCommand, purgeMemory, type MemoryCommand, type MemoryRead, type OwnerMemory } from "./memory";
import { coverageAction } from "./coverage-actions.server";
/** Explicit private Owner submissions only. No provider/tool can save memory. */
export class AdvisorMemory {
    constructor(private readonly store: AdvisorStore, private readonly signal: AbortSignal = new AbortController().signal, private readonly env: Record<string, string | undefined> = {}) { }
    private get scope() { return [this.store.original.workspace.id, this.store.proof.employee.id]; }
    async clock(): Promise<string> {
        const [row] = await this.store.transaction<{
            now: string;
        }>({ text: "SELECT clock_timestamp() AS now", values: [] });
        if (!row)
            throw new AdvisorError("unavailable");
        return new Date(row.now).toISOString();
    }
    private async available() {
        const [row] = await this.store.transaction<{
            available: boolean;
        }>({ text: "SELECT to_regclass('owner_advisor_memories') IS NOT NULL AND to_regprocedure('owner_advisor_save_memory(text,text,uuid,text,integer,jsonb,jsonb)') IS NOT NULL AS available", values: [] });
        return row?.available === true;
    }
    private async persist(memory: OwnerMemory, expected: number, command?: MemoryCommand) {
        const [row] = await this.store.transaction<{
            result: unknown;
        }>({ text: "SELECT owner_advisor_save_memory($1,$2,$3,$4,$5,$6::jsonb,$7::jsonb) AS result", values: [...this.scope, command?.requestId ?? null, command ? commandHash(command) : null, expected, JSON.stringify(memory.intents), JSON.stringify(memory.decisions)] });
        if (record(row?.result) && (row.result.error === "conflict" || row.result.error === "invalid"))
            throw new AdvisorError(row.result.error);
        if (!record(row?.result) || !notebookRevision(row.result.revision))
            throw new AdvisorError("unavailable");
        return { revision: row.result.revision };
    }
    async read(): Promise<MemoryRead> {
        if (!await this.available())
            return { state: "unavailable" };
        for (let attempt = 0; attempt < 3; attempt++) {
            const [row] = await this.store.transaction<OwnerMemory>({ text: "SELECT revision,intents,decisions FROM owner_advisor_memories WHERE workspace_id=$1 AND owner_id=$2", values: this.scope });
            let current: OwnerMemory;
            try {
                current = row ? parseMemory(row) : emptyMemory();
            }
            catch {
                throw new AdvisorError("unavailable");
            }
            const next = purgeMemory(current, await this.clock(), this.store.original.workspace.timeZone);
            if (next.intents.length === current.intents.length && next.decisions.length === current.decisions.length)
                return { state: "ready", memory: current };
            try {
                const receipt = await this.persist(next, current.revision);
                return { state: "ready", memory: { ...next, revision: receipt.revision } };
            }
            catch (error) {
                if (!(error instanceof AdvisorError && error.code === "conflict"))
                    throw error;
            }
        }
        throw new AdvisorError("conflict");
    }
    async save(input: MemoryCommand): Promise<{
        revision: number;
    }> {
        let command: MemoryCommand;
        try {
            command = parseMemoryCommand(input);
        }
        catch {
            throw new AdvisorError("invalid");
        }
        const current = await this.read();
        if (current.state !== "ready")
            throw new AdvisorError("unavailable");
        const [prior] = await this.store.transaction<{
            command_hash: string;
            kind: string;
            state: string;
            result: unknown;
        }>({ text: "SELECT command_hash,kind,state,result FROM owner_advisor_requests WHERE workspace_id=$1 AND owner_id=$2 AND request_id=$3", values: [...this.scope, command.requestId] });
        if (prior) {
            if (prior.command_hash !== commandHash(command) || prior.kind !== "memory" || prior.state !== "completed" || !record(prior.result) || Object.keys(prior.result).join(",") !== "revision" || !notebookRevision(prior.result.revision))
                throw new AdvisorError("conflict");
            return { revision: prior.result.revision };
        }
        if (current.memory.revision !== command.expectedRevision)
            throw new AdvisorError("conflict");
        let checked;
        if (command.change.kind === "check_outcome") {
            const decisionId = command.change.decisionId;
            const decision = current.memory.decisions.find(d => d.id === decisionId);
            if (!decision)
                throw new AdvisorError("conflict");
            // This invokes the existing server custody and exact-assignment check. The
            // submitted review ID alone is never evidence of publication/business success.
            const result = await coverageAction(this.store, { op: "check_coverage_draft", requestId: command.requestId, reviewId: command.change.reviewId }, this.signal, this.env);
            if (result.state !== "coverage_checked" || !result.progress || !result.receipt)
                throw new AdvisorError("unavailable");
            if (decision.focus.kind !== "coverage" || decision.focus.date !== result.review.date)
                throw new AdvisorError("conflict");
            checked = result.progress;
        }
        try {
            return await this.persist(applyMemoryCommand(current.memory, command, await this.clock(), checked, this.store.original.workspace.timeZone), command.expectedRevision, command);
        }
        catch (error) {
            if (error instanceof MemoryError)
                throw new AdvisorError(error.code);
            throw error;
        }
    }
}
