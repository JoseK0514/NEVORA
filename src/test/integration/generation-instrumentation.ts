import { generationSourceSql } from '../../lib/data/generation-guards';
import type { SqlExecutor } from '../../lib/notifications/types';

// Faults and counters in planner tests target the scheduling snapshot/batch.
// Company Access admission and response fences still run against real SQL.
export function instrumentGeneration(hooks: SqlExecutor, transport: SqlExecutor): SqlExecutor {
  return {
    query: statement => (statement.text.startsWith(`SELECT ${generationSourceSql} AS source`)
      ? hooks : transport).query(statement),
    transaction: statements => (statements.some(statement => statement.text.includes('generation_source_conflict'))
      ? hooks : transport).transaction(statements),
  };
}
