import {describe, expect, it} from 'vitest';
import type {SqlExecutor, SqlStatement} from '../notifications/types';
import type {SessionMutationProof} from '../shift-changes/types';
import {assertOperationalAccess, OperationalAuthorizationError, OperationalUnavailableError} from './operational-scope.server';

const proof: SessionMutationProof = {
  employee: {id: 'QAOWNER', firstName: 'Fictional', lastName: 'Owner', role: 'OWNER', primaryLocationId: 'loc-1'},
  sessionTokenHash: 'a'.repeat(64),
};
// getWorkspace succeeds; the transaction behavior is the case under test.
const executorWith = (transaction: (statements: readonly SqlStatement[]) => Promise<unknown[][]>): SqlExecutor => ({
  query: async <T,>() => [{id: 'workspace-fuel', name: 'Fictional Access Company', timeZone: 'America/Puerto_Rico', active: true,
    createdAt: '2030-01-01 00:00:00+00', updatedAt: '2030-01-01 00:00:00.000001+00'}] as T[],
  transaction: statements => transaction(statements),
});
const sqlError = (message: string, code: string) => Object.assign(new Error(message), {code});

describe('assertOperationalAccess failure classification', () => {
  it('denies a successfully read inactive workspace without treating it as an outage', async () => {
    const executor = executorWith(async statements => statements.map(() => []));
    executor.query = async <T,>() => [{id: 'workspace-fuel', name: 'Fictional Access Company', timeZone: 'America/Puerto_Rico', active: false,
      createdAt: '2030-01-01 00:00:00+00', updatedAt: '2030-01-01 00:00:00.000001+00'}] as T[];
    await expect(assertOperationalAccess(proof, {kind: 'COMPANY'}, executor)).rejects.toBeInstanceOf(OperationalAuthorizationError);
  });
  it('reports a missing Company Access schema as unavailable, never as a denial', async () => {
    const executor = executorWith(async () => {
      throw sqlError('relation "company_access_adoption" does not exist', '42P01');
    });
    const failure = await assertOperationalAccess(proof, {kind: 'COMPANY'}, executor).then(() => null, error => error);
    expect(failure).toBeInstanceOf(OperationalUnavailableError);
    expect(failure).not.toBeInstanceOf(OperationalAuthorizationError);
  });

  it('still reports an absent authority row as authorization', async () => {
    const executor = executorWith(async statements => statements.map(() => []));
    await expect(assertOperationalAccess(proof, {kind: 'COMPANY'}, executor)).rejects.toBeInstanceOf(OperationalAuthorizationError);
  });

  it('still reports the SQL denial sentinel as authorization', async () => {
    const executor = executorWith(async () => {
      throw sqlError('invalid input syntax for type integer: "operational_authorization"', '22P02');
    });
    await expect(assertOperationalAccess(proof, {kind: 'COMPANY'}, executor)).rejects.toBeInstanceOf(OperationalAuthorizationError);
  });
});
