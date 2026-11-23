import { afterEach, expect, it, rs } from '@rstest/core';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
import type { SessionMutationProof } from '../shift-changes/types';
import { readPayrollCapabilities } from './service';
import { authority, locks } from './store';

afterEach(() => { rs.unstubAllEnvs(); });
const manager: SessionMutationProof = { employee: { id: 'M1', firstName: 'Fictional', lastName: 'Manager', role: 'MANAGER', primaryLocationId: 'L1' }, sessionTokenHash: 'b'.repeat(64) };
const locking = /\bFOR\s+(NO\s+KEY\s+UPDATE|UPDATE|SHARE|KEY\s+SHARE)\b|\bLOCK\s+TABLE\b|onboarding_worker_table_lock/i;

function recording(flags: { owner: boolean; review: boolean; approve: boolean }) {
  const transactions: SqlStatement[][] = [];
  const executor: SqlExecutor = {
    query: async () => { throw Error('Unexpected query outside the read transaction'); },
    transaction: async statements => { transactions.push([...statements]); return statements.map(s => s.text.includes(' AS approve FROM employees e WHERE e.id=$1') ? [flags] : [{ int4: 1 }]); },
  };
  return { executor, transactions };
}

// QA A3-07 (Nov 21, 2026): the /app layout's capability read took every payroll writer lock.
it('reads payroll capabilities in one transaction without any row or table lock', async () => {
  rs.stubEnv('NEVORA_PAYROLL_ENABLED', 'true');
  rs.stubEnv('NEVORA_PAYROLL_CALCULATION_MODE', 'external');
  const db = recording({ owner: false, review: true, approve: false });
  await readPayrollCapabilities(manager, db.executor);
  expect(db.transactions).toHaveLength(1);
  const [statements] = db.transactions;
  expect(statements.filter(s => locking.test(s.text))).toEqual([]);
  // Writers keep their locks unchanged.
  expect(locks().every(s => locking.test(s.text))).toBe(true);
  expect(authority(manager, 'SELF').some(s => locking.test(s.text))).toBe(true);
});

it('keeps the locked envelope\'s session and SELF payroll checks around the flag query, in the same order', async () => {
  rs.stubEnv('NEVORA_PAYROLL_ENABLED', 'true');
  rs.stubEnv('NEVORA_PAYROLL_CALCULATION_MODE', 'external');
  const db = recording({ owner: false, review: true, approve: false });
  const result = await readPayrollCapabilities(manager, db.executor);
  const checks = authority(manager, 'SELF').filter(s => !locking.test(s.text));
  const [statements] = db.transactions;
  expect(statements).toHaveLength(checks.length * 2 + 1);
  expect(statements.slice(0, checks.length)).toEqual(checks);
  expect(statements.slice(checks.length + 1)).toEqual(checks);
  expect(result).toMatchObject({ enabled: true, canConfigure: false, canReview: true, canApprove: false, internalCalculatorAvailable: false });
});

it('derives Owner capabilities from the same flag row', async () => {
  rs.stubEnv('NEVORA_PAYROLL_ENABLED', 'true');
  rs.stubEnv('NEVORA_PAYROLL_CALCULATION_MODE', 'external');
  const owner = { ...manager, employee: { ...manager.employee, role: 'OWNER' as const } };
  const result = await readPayrollCapabilities(owner, recording({ owner: true, review: false, approve: false }).executor);
  expect(result).toMatchObject({ enabled: true, canConfigure: true, canReview: true, canApprove: true });
});
