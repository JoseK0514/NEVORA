import { describe, expect, it } from '@rstest/core';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
import { bonusYear } from './christmas-bonus';
import { readChristmasBonusReport } from './christmas-bonus.server';

const workspace = { id: 'W1', name: 'Fictional Café', timeZone: 'America/Puerto_Rico', active: true, createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01 00:00:00+00' };
const proof = (role: string) => ({ employee: { id: 'ACTOR', role, firstName: 'Fictional', lastName: 'Actor', primaryLocationId: 'L1' }, sessionTokenHash: 'a'.repeat(64) }) as never;
const untouched: SqlExecutor = { query: async () => { throw Error('unexpected read'); }, transaction: async () => { throw Error('unexpected read'); } };

function fakeDatabase(source: unknown, failure?: Error) {
  const transactions: SqlStatement[][] = [];
  const executor: SqlExecutor = {
    query: async <T,>() => [workspace] as T[],
    transaction: async (statements: readonly SqlStatement[]) => {
      transactions.push([...statements]);
      if (failure) throw failure;
      return statements.map(statement => statement.text.includes('recorded_days') ? [{ source }] : []);
    },
  };
  return { executor, transactions };
}

describe('Christmas bonus read', () => {
  it.each(['EMPLOYEE', 'LEAD'])('refuses a %s before reading anything', async role => {
    expect(await readChristmasBonusReport(proof(role), bonusYear(2026), untouched)).toEqual({ state: 'unavailable', reason: 'access_denied' });
  });

  it('reads one business-local bonus year inside the management session guards, without birth dates or contact details', async () => {
    const db = fakeDatabase({ observedAt: '2026-11-18T16:00:00Z', timeZone: workspace.timeZone, people: [] });
    const result = await readChristmasBonusReport(proof('MANAGER'), bonusYear(2026), db.executor);
    expect(result).toMatchObject({ state: 'ready', report: { rows: [], summary: { people: 0 } } });
    const [statements] = db.transactions;
    const read = statements.find(statement => statement.text.includes('recorded_days'))!;
    expect(read.values).toEqual(['W1', '2025-10-01', '2026-09-30', 'America/Puerto_Rico']);
    // Owners are not listed; finalized snapshots are the hours source; the boundaries are local dates in the zone.
    expect(read.text).toContain("e.role<>'OWNER'");
    expect(read.text).toContain("t.action='FINALIZE'");
    expect(read.text).toContain('$2::date::timestamp AT TIME ZONE $4');
    expect(read.text).not.toMatch(/birth_date|\bphone\b|\bemail\b|password|\brates?\b|amount/i);
    // Management session checks run before and after the read, in the same transaction.
    expect(statements.filter(statement => statement.text.includes('management_authorization')).length).toBeGreaterThanOrEqual(2);
    expect(statements.findIndex(statement => statement.text.includes('management_authorization'))).toBeLessThan(statements.indexOf(read));
  });

  it('reports a source limit and a lost session distinctly from a failed read', async () => {
    const limit = fakeDatabase(null, Object.assign(new Error('invalid input syntax for type integer: "christmas_bonus_source_limit"'), { code: '22P02' }));
    expect(await readChristmasBonusReport(proof('OWNER'), bonusYear(2026), limit.executor)).toEqual({ state: 'unavailable', reason: 'source_limit' });
    const session = fakeDatabase(null, Object.assign(new Error('invalid input syntax for type integer: "management_authorization"'), { code: '22P02' }));
    expect(await readChristmasBonusReport(proof('OWNER'), bonusYear(2026), session.executor)).toEqual({ state: 'unavailable', reason: 'access_denied' });
    const malformed = fakeDatabase({ observedAt: '2026-11-18T16:00:00Z', timeZone: workspace.timeZone, people: [{ employeeId: 'E1' }] });
    expect(await readChristmasBonusReport(proof('OWNER'), bonusYear(2026), malformed.executor)).toEqual({ state: 'unavailable', reason: 'read_failed' });
  });
});
