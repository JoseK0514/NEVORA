import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SqlStatement } from '../notifications/types';
import type { SessionMutationProof } from '../shift-changes/types';
vi.mock('server-only', () => ({}));
vi.mock('./notification-transactions', () => ({ neonNotificationExecutor: vi.fn() }));
vi.mock('./workspaces', () => ({
  getWorkspace: vi.fn(async () => ({ id: 'ws-1', name: 'Fictional', timeZone: 'America/Puerto_Rico', active: true, createdAt: 'c', updatedAt: 'u' })),
  workspaceReadGuard: vi.fn(() => [{ text: 'workspace guard', values: [] }]),
}));
import { managerLocationsSql, managerScopeStatements, readManagerScopeStorage } from './manager-location-scope.server';
import { readToday } from './today.server';
import { readClockMonitor } from './clock-monitor.server';

const manager: SessionMutationProof = { sessionTokenHash: 'b'.repeat(64), employee: { id: 'mgr-1', firstName: 'M', lastName: 'Q', role: 'MANAGER', primaryLocationId: 'loc-1' } } as SessionMutationProof;
const observedAt = '2030-10-16T14:00:00.000Z', expiresAt = '2030-10-16T15:00:00.000Z';
const snapshots = {
  today: { observedAt, expiresAt, timeZone: 'America/Puerto_Rico', today: '2030-10-16', shifts: [], entries: [] },
  monitor: { observedAt, expiresAt, timeZone: 'America/Puerto_Rico', rows: [] },
};
const readers = [
  { name: 'readToday', read: readToday, snapshot: snapshots.today },
  { name: 'readClockMonitor', read: readClockMonitor, snapshot: snapshots.monitor },
] as const;

function fakeExecutor(installed: number, snapshot: unknown, failure?: unknown) {
  const transactions: SqlStatement[][] = [];
  return {
    transactions,
    executor: {
      query: vi.fn(async (statement: SqlStatement) => {
        if (!statement.text.includes('pg_catalog.pg_class')) throw Error('unexpected query');
        return [{ installed }] as never[];
      }),
      transaction: vi.fn(async (statements: readonly SqlStatement[]) => {
        transactions.push([...statements]);
        if (failure) throw failure;
        return statements.map(s => (s.text.includes('jsonb_build_object(\'observedAt\'') ? [{ snapshot }] : [{}]));
      }),
    },
  };
}
const readStatement = (statements: SqlStatement[]) => statements.find(s => s.text.includes('scope AS MATERIALIZED'))!;
const sentinel = (value: string) => Object.assign(new Error(`invalid input syntax for type integer: "${value}"`), { code: '22P02' });

beforeEach(() => vi.clearAllMocks());

describe('manager location scope SQL', () => {
  it('legacy storage reads every workspace location and still types the actor parameter', () => {
    const sql = managerLocationsSql('legacy', '$1', '$4');
    expect(sql).toContain('l.workspace_id=$1');
    expect(sql).toContain('$4::text IS NOT NULL');
    expect(sql).not.toContain('nevora_tenancy');
  });
  it('installed storage keeps Owners and ALL_TENANT whole and limits LOCATIONS grants to their rows', () => {
    const sql = managerLocationsSql('installed', '$1', '$4');
    expect(sql).toContain("e.role='OWNER'");
    expect(sql).toContain("a.scope_kind='ALL_TENANT'");
    expect(sql).toMatch(/a\.scope_kind='LOCATIONS' AND EXISTS \(\s*SELECT 1 FROM nevora_tenancy\.portal_administrative_location g/);
    expect(sql).toContain('g.location_id=l.id');
  });
  it('legacy guards only assert the storage is still absent', () => {
    const statements = managerScopeStatements('legacy', 'ws-1', 'mgr-1');
    expect(statements).toHaveLength(1);
    expect(statements[0].values).toEqual([0]);
    expect(statements[0].text).toContain("'administrative_scope_changed'");
  });
  it('installed guards lock the grant header and deny a manager without a grant', () => {
    const statements = managerScopeStatements('installed', 'ws-1', 'mgr-1');
    expect(statements.map(s => s.values)).toEqual([[2], ['ws-1', 'mgr-1'], ['ws-1', 'mgr-1']]);
    expect(statements[1].text).toMatch(/portal_administrative_authority WHERE workspace_id=\$1 AND employee_id=\$2 FOR SHARE/);
    expect(statements[2].text).toContain("e.role='OWNER' OR EXISTS");
    expect(statements[2].text).toContain("'management_authorization'");
  });
  it('partially installed storage fails closed', async () => {
    await expect(readManagerScopeStorage(fakeExecutor(1, null).executor)).rejects.toThrow('administrative_scope_storage_partial');
  });
});

describe.each(readers)('$name', ({ read, snapshot }) => {
  it.each([['legacy', 0], ['installed', 2]] as const)('filters the snapshot by the actor scope with %s storage', async (storage, installed) => {
    const fake = fakeExecutor(installed, snapshot);
    const result = await read(manager, fake.executor);
    expect(result.state).toBe('ready');
    const [statements] = fake.transactions;
    const reading = readStatement(statements);
    expect(reading.text).toContain(managerLocationsSql(storage, '$1', '$4'));
    expect(reading.text).toContain('t.location_id IN (SELECT id FROM scope)');
    expect(reading.values[0]).toBe('ws-1');
    expect(reading.values[3]).toBe('mgr-1');
    // Scope guards run before the read, after the actor row lock.
    const index = statements.indexOf(reading), guardTexts = statements.slice(0, index).map(s => s.text);
    expect(guardTexts.findIndex(t => t.includes('administrative_scope_changed'))).toBeGreaterThan(guardTexts.findIndex(t => t.includes('FROM employees WHERE id=$1')));
    expect(guardTexts.some(t => t.includes('FROM nevora_tenancy.portal_administrative_authority'))).toBe(storage === 'installed');
  });
  it('limits published shifts as well as punches', async () => {
    const fake = fakeExecutor(0, snapshot);
    await read(manager, fake.executor);
    const text = readStatement(fake.transactions[0]).text;
    if (snapshot === snapshots.today) expect(text).toContain('sh.location_id IN (SELECT id FROM scope)');
    else expect(text).not.toContain('schedule_publication_revision_shifts');
  });
  it('a manager without a grant is denied, not shown an empty list', async () => {
    const fake = fakeExecutor(2, snapshot, sentinel('management_authorization'));
    expect(await read(manager, fake.executor)).toEqual({ state: 'unavailable', reason: 'access_denied' });
  });
  it('grant storage changing after the pre-read is a failed read', async () => {
    const fake = fakeExecutor(0, snapshot, sentinel('administrative_scope_changed'));
    expect(await read(manager, fake.executor)).toEqual({ state: 'unavailable', reason: 'read_failed' });
  });
  it('partially installed storage reads nothing', async () => {
    const fake = fakeExecutor(1, snapshot);
    expect(await read(manager, fake.executor)).toEqual({ state: 'unavailable', reason: 'read_failed' });
    expect(fake.executor.transaction).not.toHaveBeenCalled();
  });
});
