import { afterEach, expect, it, vi } from 'vitest';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
import type { SessionMutationProof } from '../shift-changes/types';
import { readPayrollBacklog } from './backlog-read';
import { runs } from './service';
const proof: SessionMutationProof = {employee: {id: 'QAMANAGER', firstName: 'Fictional', lastName: 'Manager', role: 'MANAGER', primaryLocationId: 'loc-1'}, sessionTokenHash: 'a'.repeat(64)};
afterEach(() => vi.unstubAllEnvs());
it('preserves the runs policy that Managers receive no company backlog', async () => {
  vi.stubEnv('NEVORA_PAYROLL_ENABLED', 'true');
  const statements: SqlStatement[] = [];
  const ex: SqlExecutor = {query: async <T,>(s: SqlStatement) => s.text.includes('to_regclass') ? [{available: false}] as T[] : [], transaction: async batch => {
    statements.push(...batch);
    return batch.map(s => s.text.startsWith('SELECT CURRENT_DATE') ? [{today: '2026-11-02', history: [], originals: [], overflow: false}]
      : s.text.includes("AS owner,") ? [{owner: false, review: true, approve: false}] : []);
  }};
  const result = await runs(proof, ex);
  expect(result.missingPeriods).toEqual([]);
  expect(result.backlog).toMatchObject({missingCount: 0, overflow: false});
  expect(statements.some(s => s.text.includes('WITH context AS'))).toBe(false);
});
it('rejects a missing source row rather than synthesizing an empty history', async () => {
  vi.stubEnv('NEVORA_PAYROLL_ENABLED', 'true');
  const ex: SqlExecutor = {query: async () => [], transaction: async batch => batch.map(() => [])};
  await expect(readPayrollBacklog({...proof, employee: {...proof.employee, role: 'OWNER'}}, ex)).rejects.toThrow('payroll_history_unavailable');
});
