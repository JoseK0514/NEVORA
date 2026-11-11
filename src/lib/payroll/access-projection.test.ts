import { afterEach, expect, it, vi } from 'vitest';
import type { SqlExecutor } from '../notifications/types';
import type { SessionMutationProof } from '../shift-changes/types';
import { statements } from './access';

afterEach(() => vi.unstubAllEnvs());
const proof: SessionMutationProof = { employee: { id: 'SELF', firstName: 'Fictional', lastName: 'Person', role: 'EMPLOYEE', primaryLocationId: 'L1' }, sessionTokenHash: 'a'.repeat(64) };
function databaseRows(payload: Record<string, unknown>): SqlExecutor {
  return {
    query: async () => { throw Error('Unexpected query outside the protected transaction'); },
    // Only the supplied document SELECT produces data. Existing SQL authorization
    // and publication behavior are exercised in the real payroll integration suite.
    transaction: async queries => queries.map(q => q.text.includes('FROM payroll_documents d WHERE workspace_id=') ? [{
      id: '11111111-1111-4111-8111-111111111111', kind: 'EMPLOYEE_STATEMENT', employee_id: 'SELF', filename: 'statement.pdf', sha256: 'a'.repeat(64), published: true,
      payload, corrects: '22222222-2222-4222-8222-222222222222', corrected_by: null,
    }] : []),
  };
}
it('own-statements returns only its public contract, not stored native provenance or future metadata', async () => {
  vi.stubEnv('NEVORA_PAYROLL_ENABLED', 'true');
  const result = await statements(proof, databaseRows({ period: { startDate: '2026-11-02', endDate: '2026-11-08', internal: 'private-period-data' }, payday: '2026-11-13',
    nativeDocument: { inputSha256: 'private-provenance', sourceFingerprint: 'private-source' }, coverage: { locationIds: ['private-location'] }, futureInternalField: 'private-future-field' }));
  expect(result.statements).toEqual([{
    id: '11111111-1111-4111-8111-111111111111', kind: 'EMPLOYEE_STATEMENT', employeeId: 'SELF', filename: 'statement.pdf', sha256: 'a'.repeat(64), published: true,
    downloadUrl: '/api/payroll/documents/11111111-1111-4111-8111-111111111111', viewUrl: '/api/payroll/documents/11111111-1111-4111-8111-111111111111/view',
    period: { startDate: '2026-11-02', endDate: '2026-11-08' }, payday: '2026-11-13', corrects: '22222222-2222-4222-8222-222222222222', correctedBy: null,
  }]);
  expect(JSON.stringify(result)).not.toContain('private-');
});
it('stored payload cannot replace the canonical own document identity, final-file SHA or destinations', async () => {
  vi.stubEnv('NEVORA_PAYROLL_ENABLED', 'true');
  const result = await statements(proof, databaseRows({ period: { startDate: '2026-11-02', endDate: '2026-11-08' }, payday: '2026-11-13', id: 'foreign', employeeId: 'OTHER', sha256: 'replacement', viewUrl: 'https://foreign.invalid', published: false }));
  expect(result.statements[0]).toMatchObject({ id: '11111111-1111-4111-8111-111111111111', employeeId: 'SELF', sha256: 'a'.repeat(64), viewUrl: '/api/payroll/documents/11111111-1111-4111-8111-111111111111/view', published: true });
});
