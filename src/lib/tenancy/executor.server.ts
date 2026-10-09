import 'server-only';
import { getTenantRuntimeDb } from '../db';
import { getTenantProofFacts } from './resolve.server';
import { compileTenantStatement, compileTenantBatch } from './query-contract';
import type { CompiledTenantStatement, TenantStatement, TenantBatch } from './query-contract';
import type { TenantProof, TenantProofFacts } from './types';

export type TenantExecutionOptions = Readonly<{ signal?: AbortSignal }>;
export type TenantExecutor = Readonly<{
  query<T>(statement: TenantStatement<T>, options?: TenantExecutionOptions): Promise<T>;
  transaction<T extends readonly unknown[]>(batch: TenantBatch<T>, options?: TenantExecutionOptions): Promise<T>;
}>;
// These helpers MUST raise on stale/foreign authority inside the transaction.
// The SQL boolean wrapper also forces rollback for false/null helper returns.
// No helper is claimed installed until actual migration/runtime verification.
const ROLE = 'SELECT 1 / CASE WHEN nevora_tenancy.assert_runtime_role($1::text) IS TRUE THEN 1 ELSE 0 END AS guard';
const CONTEXT = "SELECT set_config('nevora.workspace_id', $1::text, true), set_config('nevora.proof_kind', $2::text, true), set_config('nevora.principal_id', $3::text, true), set_config('nevora.workspace_incarnation', $4::text, true)";
const LOCK_AND_GUARD = 'SELECT 1 / CASE WHEN nevora_tenancy.lock_and_assert_current_proof($1::jsonb) IS TRUE THEN 1 ELSE 0 END AS guard';
const FINAL_GUARD = 'SELECT 1 / CASE WHEN nevora_tenancy.assert_current_proof($1::jsonb) IS TRUE THEN 1 ELSE 0 END AS guard';
const unavailable = (): never => { throw new Error('tenant_execution_unavailable'); };
function checkAbort(signal?: AbortSignal) {
  if (signal?.aborted) {
    const error = new Error('tenant_execution_aborted'); error.name = 'AbortError'; throw error;
  }
}
function guardResult(value: unknown) {
  return Array.isArray(value) && value.length === 1 && value[0] && typeof value[0] === 'object' && value[0].guard === 1;
}
function principal(facts: TenantProofFacts) {
  return facts.kind === 'WORKER' ? facts.workerId : facts.employeeId;
}
export function createTenantExecutor(proof: TenantProof): TenantExecutor {
  // Authenticate identity before touching configuration or the transport.
  getTenantProofFacts(proof);
  async function execute<T>(plans: readonly CompiledTenantStatement<T>[], options?: TenantExecutionOptions): Promise<T[]> {
    const signal = options?.signal;
    checkAbort(signal);
    const facts = getTenantProofFacts(proof);
    const role = facts.kind === 'WORKER' ? 'WORKER' : 'APP';
    let results: unknown;
    try {
      const sql = getTenantRuntimeDb(role);
      checkAbort(signal);
      getTenantProofFacts(proof);
      const factsJson = JSON.stringify(facts);
      // Keep NeonQueryPromises unawaited: awaiting a query here would execute
      // context/guards/business separately and lose the transaction boundary.
      const queries = [sql.query(ROLE, [role]),
        sql.query(CONTEXT, [facts.workspaceId, facts.kind, principal(facts), facts.workspaceIncarnation]),
        sql.query(LOCK_AND_GUARD, [factsJson]),
        ...plans.map(plan => sql.query(plan.text, [...plan.values])),
        sql.query(FINAL_GUARD, [factsJson]),
        sql.query(ROLE, [role])];
      results = await sql.transaction(queries, { isolationLevel: 'ReadCommitted', arrayMode: false, fullResults: false,
        ...(signal ? { fetchOptions: { signal } } : {}) });
    } catch {
      checkAbort(signal);
      return unavailable();
    }
    checkAbort(signal);
    getTenantProofFacts(proof);
    if (!Array.isArray(results) || results.length !== plans.length + 5 ||
      !guardResult(results[0]) || !guardResult(results[2]) ||
      !guardResult(results[results.length - 2]) || !guardResult(results[results.length - 1])) return unavailable();
    try { return plans.map((plan, index) => plan.decode(results[index + 3])); } catch { return unavailable(); }
  }
  return Object.freeze({
    async query<T>(statement: TenantStatement<T>, options?: TenantExecutionOptions): Promise<T> {
      const plan = compileTenantStatement<T>(proof, statement);
      return (await execute([plan], options))[0];
    },
    async transaction<T extends readonly unknown[]>(batch: TenantBatch<T>, options?: TenantExecutionOptions): Promise<T> {
      const plans = compileTenantBatch<T>(proof, batch);
      return await execute(plans, options) as unknown as T;
    },
  });
}
