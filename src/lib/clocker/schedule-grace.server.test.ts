import { beforeEach, describe, expect, it, rs } from '@rstest/core';
import type { SqlExecutor, SqlStatement } from '../notifications/types';
rs.mock('server-only', () => ({}));
rs.mock('../data/notification-transactions', () => ({ neonNotificationExecutor: () => { throw Error('Unit tests pass an executor'); } }));
rs.mock('../data/workspaces', () => ({
  getWorkspace: async () => ({ id: 'workspace', name: 'Fictional Co', timeZone: 'America/Puerto_Rico', active: true, createdAt: 'c', updatedAt: 'u' }),
  workspaceReadGuard: () => [{ text: 'SELECT workspace_guard', values: [] }],
}));
import { ClockerScheduleGraceError, readClockerScheduleGrace, readEarlyClockInGraceForPunch, saveClockerScheduleGrace } from './schedule-grace.server';

const owner = { employeeId: 'owner', sessionTokenHash: 'a'.repeat(64) };
function executor(options: { query?: () => Promise<unknown[]>; transaction?: (statements: readonly SqlStatement[]) => Promise<unknown[][]> } = {}) {
  const query = rs.fn(options.query ?? (async () => []));
  const transaction = rs.fn(options.transaction ?? (async (statements: readonly SqlStatement[]) => statements.map(() => [])));
  return { query, transaction, executor: { query, transaction } as unknown as SqlExecutor };
}

describe('punch-time grace read', () => {
  it('returns the persisted grace for the workspace', async () => {
    const e = executor({ query: async () => [{ earlyClockInGraceMinutes: 10 }] });
    expect(await readEarlyClockInGraceForPunch('workspace', e.executor)).toBe(10);
    expect(e.query).toHaveBeenCalledWith(expect.objectContaining({ values: ['workspace'] }));
  });
  it('treats a missing setting as 0 (strict matching)', async () => {
    expect(await readEarlyClockInGraceForPunch('workspace', executor().executor)).toBe(0);
  });
  it('fails closed to 0 instead of blocking the punch when the setting cannot be read', async () => {
    const missingTable = executor({ query: async () => { throw Error('relation "clocker_schedule_match_policy" does not exist'); } });
    expect(await readEarlyClockInGraceForPunch('workspace', missingTable.executor)).toBe(0);
  });
  it.each([31, -1, 1.5, '10', null])('fails closed to 0 for an out-of-range stored value %s', async value => {
    expect(await readEarlyClockInGraceForPunch('workspace', executor({ query: async () => [{ earlyClockInGraceMinutes: value }] }).executor)).toBe(0);
  });
});

describe('Owner settings read', () => {
  it('reads inside the Owner-guarded transaction and reports never-saved as version 0 with grace 0', async () => {
    const e = executor();
    expect(await readClockerScheduleGrace(owner, e.executor)).toEqual({ earlyClockInGraceMinutes: 0, version: 0 });
    const statements = e.transaction.mock.calls[0][0];
    expect(statements.map(statement => statement.text).join('\n')).toMatch(/e\.role='OWNER'[\s\S]*ss\.token_hash=\$2/);
  });
  it('is unavailable rather than a displayed 0 when the read fails', async () => {
    const e = executor({ transaction: async () => { throw Error('SQL secret detail'); } });
    await expect(readClockerScheduleGrace(owner, e.executor)).rejects.toMatchObject({ code: 'UNAVAILABLE' });
    await expect(readClockerScheduleGrace(owner, e.executor)).rejects.not.toThrow(/SQL|secret/);
  });
});

describe('Owner-only save', () => {
  let e: ReturnType<typeof executor>;
  beforeEach(() => {
    e = executor({ transaction: async statements => [...statements.slice(1).map(() => []), [{ earlyClockInGraceMinutes: 10, version: 1 }]] });
  });
  it('saves with the reviewed version, the server-side actor and an audit check in one transaction', async () => {
    expect(await saveClockerScheduleGrace(owner, { earlyClockInGraceMinutes: 10, expectedVersion: 0 }, e.executor)).toEqual({ earlyClockInGraceMinutes: 10, version: 1 });
    const statements = e.transaction.mock.calls[0][0];
    const insert = statements.find(statement => statement.text.includes('INSERT INTO clocker_schedule_match_policy'));
    expect(insert?.values).toEqual(['workspace', 1, 10, 'owner']);
    expect(statements.some(statement => statement.text.includes('UPDATE clocker_schedule_match_policy'))).toBe(false);
    expect(statements.some(statement => statement.text.includes('clocker_schedule_match_policy_revisions') && statement.text.includes('actor_employee_id=$3'))).toBe(true);
    // The Owner's current session is checked before the write and again after it.
    expect(statements.filter(statement => statement.text.includes('clocker_grace_FORBIDDEN'))).toHaveLength(2);
  });
  it('updates only the reviewed version on later saves', async () => {
    const later = executor({ transaction: async statements => [...statements.slice(1).map(() => []), [{ earlyClockInGraceMinutes: 5, version: 2 }]] });
    expect(await saveClockerScheduleGrace(owner, { earlyClockInGraceMinutes: 5, expectedVersion: 1 }, later.executor)).toEqual({ earlyClockInGraceMinutes: 5, version: 2 });
    const statements = later.transaction.mock.calls[0][0];
    const update = statements.find(statement => statement.text.includes('UPDATE clocker_schedule_match_policy'));
    expect(update?.text).toMatch(/WHERE workspace_id=\$1 AND version=\$2::integer-1/);
    expect(update?.values).toEqual(['workspace', 2, 5, 'owner']);
    expect(statements.some(statement => statement.text.includes('INSERT INTO clocker_schedule_match_policy'))).toBe(false);
  });
  it.each([
    { earlyClockInGraceMinutes: -1, expectedVersion: 0 },
    { earlyClockInGraceMinutes: 31, expectedVersion: 0 },
    { earlyClockInGraceMinutes: 1.5, expectedVersion: 0 },
    { earlyClockInGraceMinutes: Number.NaN, expectedVersion: 0 },
    { earlyClockInGraceMinutes: '10' as unknown as number, expectedVersion: 0 },
    { earlyClockInGraceMinutes: 10, expectedVersion: -1 },
    { earlyClockInGraceMinutes: 10, expectedVersion: 1.5 },
  ])('rejects %o before any database work', async input => {
    await expect(saveClockerScheduleGrace(owner, input, e.executor)).rejects.toMatchObject({ code: 'INVALID' });
    expect(e.transaction).not.toHaveBeenCalled();
  });
  it('requires a server-derived Owner proof', async () => {
    await expect(saveClockerScheduleGrace({ employeeId: 'owner', sessionTokenHash: 'forged' }, { earlyClockInGraceMinutes: 10, expectedVersion: 0 }, e.executor))
      .rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(e.transaction).not.toHaveBeenCalled();
  });
  it.each([
    ['clocker_grace_FORBIDDEN', 'FORBIDDEN'], ['clocker_grace_STALE', 'STALE'], ['clocker_grace_audit_missing', 'UNAVAILABLE'], ['connection reset with SQL text', 'UNAVAILABLE'],
  ])('maps %s to %s without exposing database text', async (marker, code) => {
    const failing = executor({ transaction: async () => { throw Error(marker); } });
    const error = await saveClockerScheduleGrace(owner, { earlyClockInGraceMinutes: 10, expectedVersion: 0 }, failing.executor).catch(value => value);
    expect(error).toBeInstanceOf(ClockerScheduleGraceError);
    expect(error).toMatchObject({ code });
    expect(error.message).not.toMatch(/clocker_grace|SQL|connection/);
  });
  it('does not report a save whose returned row is not the requested version and value', async () => {
    const odd = executor({ transaction: async statements => [...statements.slice(1).map(() => []), [{ earlyClockInGraceMinutes: 5, version: 1 }]] });
    await expect(saveClockerScheduleGrace(owner, { earlyClockInGraceMinutes: 10, expectedVersion: 0 }, odd.executor)).rejects.toMatchObject({ code: 'UNAVAILABLE' });
  });
});
