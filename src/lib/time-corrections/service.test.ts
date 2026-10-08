import { describe, expect, it } from 'vitest';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
import type { SessionMutationProof } from '../shift-changes/types';
import { reviewTimeCorrection, submitTimeCorrection } from './service';

const workspace = {
  id: 'workspace-fuel',
  name: 'Fuel Coffee Drive',
  timeZone: 'America/Puerto_Rico',
  active: true,
  createdAt: '2030-01-01T00:00:00Z',
  updatedAt: '2030-01-01T00:00:00Z',
};
const proof = (id: string, role: 'OWNER'|'MANAGER'|'LEAD'|'EMPLOYEE'): SessionMutationProof => ({
  sessionTokenHash: (role === 'OWNER' ? 'a' : role === 'MANAGER' ? 'b' : role === 'LEAD' ? 'c' : 'd').repeat(64),
  employee: { id, firstName: 'Fictional', lastName: 'QA', role, primaryLocationId: 'loc-1' },
});

function executor(result: Record<string, unknown>) {
  const captured: SqlStatement[][] = [];
  const db: SqlExecutor = {
    async query<T>(statement: SqlStatement) {
      if (statement.text.includes('FROM workspaces WHERE singleton=true')) return [workspace] as T[];
      if (statement.text.includes('FROM time_correction_requests WHERE id=')) {
        return [{ employeeId: 'worker', workspaceId: workspace.id }] as T[];
      }
      return [] as T[];
    },
    async transaction(statements) {
      captured.push([...statements]);
      const index = statements.findIndex((s) => s.text.includes('nevora_submit_time_correction') || s.text.includes('nevora_review_time_correction'));
      return statements.map((_, i) => i === index ? [{ result }] : []);
    },
  };
  return { db, captured };
}

describe('D2 correction transaction service', () => {
  it('submits only for the server-derived employee identity and current session', async () => {
    const fx = executor({
      status: 'pending',
      operationId: '11111111-1111-4111-8111-111111111111',
      requestId: '11111111-1111-4111-8111-111111111111',
      revision: 1,
    });
    const result = await submitTimeCorrection(proof('worker', 'EMPLOYEE'), {
      operationId: '11111111-1111-4111-8111-111111111111',
      kind: 'ENTRY_BOUNDARY',
      timeEntryId: 'entry-1',
      proposedStartAt: '2030-10-07T12:05:00Z',
      proposedEndAt: '2030-10-07T15:00:00Z',
      reason: 'Recorded end needs review.',
    }, fx.db);
    expect(result.status).toBe('pending');
    const batch = fx.captured[0];
    const call = batch.find((s) => s.text.includes('nevora_submit_time_correction'))!;
    expect(call.values[2]).toBe('worker');
    expect(call.values[3]).toBe('worker');
    expect(JSON.stringify(batch)).toContain(proof('worker', 'EMPLOYEE').sessionTokenHash);
    expect(JSON.stringify(batch)).not.toContain('someone-else');
  });

  it('locks reviewer and target in stable order and uses only current Owner/Manager authority', async () => {
    const fx = executor({
      status: 'approved',
      operationId: '55555555-5555-4555-8555-555555555555',
      requestId: '66666666-6666-4666-8666-666666666666',
      revision: 2,
      adjustmentId: '55555555-5555-4555-8555-555555555555',
    });
    const result = await reviewTimeCorrection(proof('manager', 'MANAGER'), {
      operationId: '55555555-5555-4555-8555-555555555555',
      requestId: '66666666-6666-4666-8666-666666666666',
      expectedRevision: 1,
      decision: 'APPROVE',
      note: 'Reviewed against the recorded entry.',
    }, fx.db);
    expect(result.status).toBe('approved');
    const batch = fx.captured[0];
    const employeeLock = batch.find((s) => s.text.includes('id=ANY($1::text[])'))!;
    expect(employeeLock.values[0]).toEqual(['manager','worker']);
    const authority = batch.filter((s) => s.text.includes('e.role=ANY'));
    expect(authority.length).toBeGreaterThan(0);
    expect(JSON.stringify(authority)).toContain('OWNER');
    expect(JSON.stringify(authority)).toContain('MANAGER');
    expect(JSON.stringify(authority)).not.toContain('EMPLOYEE');
  });

  it('fails closed for self-review, stale source and overlap diagnostics without exposing SQL', async () => {
    for (const [diagnostic, reason] of [
      ['nevora_correction_SELF_REVIEW','self_review'],
      ['nevora_correction_STALE_SOURCE','stale_source'],
      ['nevora_correction_OVERLAP','overlap'],
      ['nevora_correction_LIVE_STATE','live_state'],
    ] as const) {
      const fx = executor({});
      fx.db.transaction = async () => { throw new Error(diagnostic); };
      const result = await reviewTimeCorrection(proof('manager','MANAGER'), {
        operationId: '55555555-5555-4555-8555-555555555555',
        requestId: '66666666-6666-4666-8666-666666666666',
        expectedRevision: 1,
        decision: 'APPROVE',
      }, fx.db);
      expect(result).toEqual({ status: 'blocked', reason });
      expect(JSON.stringify(result)).not.toMatch(/SQL|postgres|token/i);
    }
  });

  it('reports an unknown post-batch outcome so the exact operation can be retried idempotently', async () => {
    const fx = executor({});
    fx.db.transaction = async () => { throw new Error('connection closed after commit'); };
    const result = await submitTimeCorrection(proof('worker','EMPLOYEE'), {
      operationId: '11111111-1111-4111-8111-111111111111',
      kind: 'MISSING_ENTRY',
      locationId: 'loc-1',
      proposedStartAt: '2030-10-06T12:00:00Z',
      proposedEndAt: '2030-10-06T16:00:00Z',
      reason: 'Tablet was unavailable.',
    }, fx.db);
    expect(result).toEqual({
      status: 'outcome-unknown',
      operationId: '11111111-1111-4111-8111-111111111111',
    });
  });
});
