import { readFile } from 'node:fs/promises';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  clients: [] as { database: string; statements: string[]; ended: boolean }[],
  events: [] as string[],
  exists: false,
  marker: '',
  failSql: '',
  failConnect: false,
  deferRuntimeEnd: false,
  pendingEnds: [] as (() => void)[],
}));

vi.mock('pg', () => {
  class Client {
    record: (typeof state.clients)[number];
    constructor(options: { connectionString: string }) {
      this.record = { database: new URL(options.connectionString).pathname, statements: [], ended: false };
      state.clients.push(this.record);
    }
    async connect() {
      if (state.failConnect && this.record.database !== '/postgres') throw Error('fixture-connect-failed');
    }
    async end() {
      const finish = () => { this.record.ended = true; state.events.push(`end:${this.record.database}`); };
      if (state.deferRuntimeEnd && this.record.database !== '/postgres') {
        await new Promise<void>(resolve => state.pendingEnds.push(() => { finish(); resolve(); }));
      } else finish();
    }
    async query(text: string) {
      this.record.statements.push(text);
      if (this.record.database !== '/postgres') {
        if (text === state.failSql) throw Error('fixture-migration-failed');
        if(text.startsWith("SELECT pg_backend_pid() AS pid,current_setting"))return {rows:[{pid:2,statement_timeout:'5s'}]};
        return { rows: text === 'SELECT pg_backend_pid() AS pid' ? [{ pid: state.clients.indexOf(this.record) + 1 }] : [] };
      }
      if (text.startsWith('SELECT 1 FROM pg_database')) return { rowCount: state.exists ? 1 : 0, rows: [] };
      if (text.startsWith('CREATE DATABASE')) state.exists = true;
      if (text.startsWith('SELECT oid FROM pg_database')) return { rows: [{ oid: 123 }] };
      if (text.startsWith('COMMENT ON DATABASE')) state.marker = text.split(" IS '")[1].slice(0, -1);
      if (text.startsWith('SELECT shobj_description')) return { rows: [{ marker: state.marker }] };
      if (text.includes('FROM pg_stat_activity')) return { rows: state.clients.filter(client => client.database !== '/postgres' && !client.ended).map((_, index) => ({ pid: index + 1 })) };
      if (text.startsWith('DROP DATABASE')) {
        state.events.push('drop');
        state.exists = false;
      }
      return { rows: [] };
    }
  }
  return { Client, Pool: class {
    idle: Client[] = [];
    clients: Client[] = [];
    constructor(private options: { connectionString: string }) {}
    async connect() {
      let client = this.idle.pop();
      if (!client) {
        client = new Client(this.options);
        try { await client.connect(); } catch (error) { await client.end(); throw error; }
        this.clients.push(client);
      }
      const leased = client;
      return Object.assign(leased, { release: (destroy = false) => {
        state.events.push(`release:${destroy ? 'destroy' : 'reset'}`);
        if (destroy) void leased.end(); else this.idle.push(leased);
      } });
    }
    async end() { this.clients.filter(client => !client.record.ended).forEach(client => { void client.end(); }); }
  } };
});

import { CURRENT_MIGRATIONS, createDisposableFoundationDatabase } from './local-postgres';

beforeEach(() => {
  state.clients.length = 0;
  state.events.length = 0;
  state.exists = false;
  state.marker = '';
  state.failSql = '';
  state.failConnect = false;
  state.deferRuntimeEnd = false;
  state.pendingEnds.length = 0;
  vi.stubEnv('DATABASE_URL', '');
  vi.stubEnv('FUEL_TEST_DATABASE_URL', 'postgresql://fixture@127.0.0.1:54321/nevora_foundation_test_bootstrap');
  vi.stubEnv('FUEL_TEST_ALLOW_DESTRUCTIVE_TEARDOWN', 'yes');
});
afterEach(() => vi.unstubAllEnvs());

it('runs exact migration files sequentially on one closed bootstrap connection, keeping runtime connections separate', async () => {
  const sql = await Promise.all(CURRENT_MIGRATIONS.map(file => readFile(`db/migrations/${file}`, 'utf8')));
  const db = await createDisposableFoundationDatabase({ mode: 'current-runtime' });
  try {
    expect(state.clients).toHaveLength(2);
    expect(state.clients[1].statements).toEqual(["SELECT pg_backend_pid() AS pid,current_setting('statement_timeout') AS statement_timeout",...sql]);
    expect(state.clients[1].ended).toBe(true);
    expect(state.clients[0].ended).toBe(false);
    expect(state.clients[0].statements.filter(text=>text.startsWith('ALTER DATABASE'))).toEqual([
      'ALTER DATABASE "nevora_foundation_test_bootstrap" SET TimeZone TO \'UTC\'',
      'ALTER DATABASE "nevora_foundation_test_bootstrap" SET DateStyle TO \'ISO, YMD\'',
      'ALTER DATABASE "nevora_foundation_test_bootstrap" SET default_transaction_isolation TO \'read committed\'',
    ]);
    expect(state.clients[0].statements.filter(text => text.startsWith('SELECT shobj_description'))).toHaveLength(sql.length + 1);
    await Promise.all([
      db.executor.query({ text: 'SELECT 11', values: [] }),
      db.executor.query({ text: 'SELECT 22', values: [] }),
    ]);
    expect(state.clients.slice(2).map(client => client.statements)).toEqual([
      ['SELECT pg_backend_pid() AS pid', 'SELECT 11', 'DISCARD ALL'],
      ['SELECT pg_backend_pid() AS pid', 'SELECT 22', 'DISCARD ALL'],
    ]);
    expect(state.clients.slice(2).every(client => !client.ended)).toBe(true);
  } finally { await db.dispose(); }
  expect(state.clients.every(client => client.ended)).toBe(true);
});

it('reuses a reset runtime connection across serial batches and closes it before owned teardown', async () => {
  const db = await createDisposableFoundationDatabase({ mode: 'empty' });
  try {
    await db.executor.query({ text: 'SELECT 11', values: [] });
    await db.executor.query({ text: 'SELECT 22', values: [] });
    expect(state.clients).toHaveLength(2);
    expect(state.clients[1].statements).toEqual(['SELECT pg_backend_pid() AS pid', 'SELECT 11', 'DISCARD ALL', 'SELECT pg_backend_pid() AS pid', 'SELECT 22', 'DISCARD ALL']);
    expect(state.events).toEqual(['release:reset', 'release:reset']);
  } finally { await db.dispose(); }
  expect(state.events).toEqual(['release:reset', 'release:reset', 'end:/nevora_foundation_test_bootstrap', 'drop', 'end:/postgres']);
});

it('destroys a failed transaction connection after rollback and gives the next batch a fresh backend', async () => {
  const db = await createDisposableFoundationDatabase({ mode: 'empty' });
  try {
    state.failSql = 'SELECT broken';
    await expect(db.executor.transaction([{ text: state.failSql, values: [] }])).rejects.toThrow('fixture-migration-failed');
    expect(state.clients[1].statements).toEqual(['SELECT pg_backend_pid() AS pid', 'BEGIN', 'SELECT broken', 'ROLLBACK']);
    expect(state.clients[1].ended).toBe(true);
    expect(state.events).toContain('release:destroy');
    state.failSql = '';
    await db.executor.query({ text: 'SELECT 22', values: [] });
    expect(state.clients).toHaveLength(3);
  } finally { await db.dispose(); }
});

it('fails a batch whose session reset fails and retires that connection before reuse', async () => {
  const db = await createDisposableFoundationDatabase({ mode: 'empty' });
  try {
    state.failSql = 'DISCARD ALL';
    await expect(db.executor.query({ text: 'SELECT 11', values: [] })).rejects.toThrow('fixture-migration-failed');
    expect(state.clients[1].ended).toBe(true);
    state.failSql = '';
    await db.executor.query({ text: 'SELECT 22', values: [] });
    expect(state.clients).toHaveLength(3);
  } finally { await db.dispose(); }
});

it('waits for actual backend closure after pool drain before forcing owned database teardown', async () => {
  const db = await createDisposableFoundationDatabase({ mode: 'empty' });
  await db.executor.query({ text: 'SELECT 11', values: [] });
  state.deferRuntimeEnd = true;
  const disposal = db.dispose();
  try {
    await vi.waitFor(() => expect(state.pendingEnds).toHaveLength(1));
    expect(state.exists).toBe(true);
    expect(state.events).not.toContain('drop');
  } finally {
    state.pendingEnds.splice(0).forEach(finish => finish());
    await disposal;
  }
  expect(state.events.indexOf('end:/nevora_foundation_test_bootstrap')).toBeLessThan(state.events.indexOf('drop'));
});

it('closes a failed bootstrap connection before dropping its owned database and never executes later migrations', async () => {
  state.failSql = await readFile(`db/migrations/${CURRENT_MIGRATIONS[1]}`, 'utf8');
  await expect(createDisposableFoundationDatabase({ mode: 'current-runtime' })).rejects.toThrow('fixture-migration-failed');
  expect(state.clients).toHaveLength(2);
  expect(state.clients[1].statements).toHaveLength(3);
  expect(state.events).toEqual(['end:/nevora_foundation_test_bootstrap', 'drop', 'end:/postgres']);
  expect(state.exists).toBe(false);
});

it('closes a bootstrap connection that fails to connect before disposing its owned database', async () => {
  state.failConnect = true;
  await expect(createDisposableFoundationDatabase({ mode: 'upgrade' })).rejects.toThrow('fixture-connect-failed');
  expect(state.clients[1].ended).toBe(true);
  expect(state.events).toEqual(['end:/nevora_foundation_test_bootstrap', 'drop', 'end:/postgres']);
  expect(state.exists).toBe(false);
});

it('creates no bootstrap connection for an empty fixture', async () => {
  const db = await createDisposableFoundationDatabase({ mode: 'empty' });
  expect(state.clients).toHaveLength(1);
  await db.dispose();
});
