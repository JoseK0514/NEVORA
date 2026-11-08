import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { CommerceStore } from './store';
import { createCommerce } from './service';
const enabled = Boolean(process.env.NEVORA_COMMERCE_TEST_URL);
describe.skipIf(!enabled)('commerce accounts on owned PostgreSQL', () => {
  let pool: Pool, admin: Pool, store: CommerceStore, app: ReturnType<typeof createCommerce>;
  const name = `commerce_test_${randomUUID().replaceAll('-', '')}`;
  const key = Buffer.alloc(32, 9);
  beforeAll(async () => {
    const url = new URL(process.env.NEVORA_COMMERCE_TEST_URL!);
    if (process.env.DATABASE_URL || url.hostname !== '127.0.0.1' || url.pathname !== '/postgres') throw Error('owned loopback cluster required');
    admin = new Pool({ connectionString: url.href }); await admin.query(`CREATE DATABASE "${name}"`);
    url.pathname = `/${name}`; pool = new Pool({ connectionString: url.href });
    await pool.query(await readFile(new URL('./schema.sql', import.meta.url), 'utf8'));
    store = new CommerceStore(pool, key);
    app = createCommerce({ store, origin: 'https://accounts.example.test', allowedOrigins: ['https://accounts.example.test'], now: () => Date.parse('2026-11-07T12:00:00Z') });
  });
  afterAll(async () => { await pool?.end(); if (admin) { await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`); await admin.end(); } });
  const request = (path: string, body?: unknown, bearer?: string, origin = 'https://accounts.example.test') => app(new Request(`https://accounts.example.test${path}`, { method: body ? 'POST' : 'GET', headers: { origin, 'content-type': 'application/json', ...(bearer ? { authorization: `Bearer ${bearer}` } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) }), '127.0.0.1');
  const signup = { email: 'owner@example.test', password: 'fictional-owner-pass123', firstName: 'Taylor', lastName: 'Example', phone: '7875550101', businessName: 'Example Shop', timeZone: 'America/Puerto_Rico', locationName: 'Main', employeeCount: 10 };
  it('accepts duplicate signup without duplicate accounts or leaking identity', async () => {
    const responses = await Promise.all([request('/v1/signup', signup), request('/v1/signup', signup)]);
    expect(responses.map(r => r.status)).toEqual([202, 202]);
    expect(await responses[0].json()).toEqual({ state: 'check_email' });
    expect((await pool.query('SELECT count(*)::int n FROM commerce.accounts')).rows[0].n).toBe(1);
    expect((await pool.query("SELECT count(*)::int n FROM commerce.jobs WHERE kind='mail'")).rows[0].n).toBe(1);
  });
  it('consumes verification once, creates one provisioning job and authorizes only the owner', async () => {
    const jobs = await pool.query("SELECT * FROM commerce.jobs WHERE kind='mail'");
    const payload = store.openJob(jobs.rows[0]);
    const proof = new URL(payload.url).hash.slice('#token='.length);
    const responses = await Promise.all([request('/v1/verify', { token: proof }), request('/v1/verify', { token: proof })]);
    expect(responses.map(r => r.status).sort()).toEqual([200, 400]);
    const session = await responses.find(r => r.status === 200)!.json();
    expect((await request('/v1/status', undefined, session.accessToken)).status).toBe(200);
    expect((await request('/v1/status')).status).toBe(401);
    expect((await request('/v1/status', undefined, 'forged')).status).toBe(401);
    expect((await pool.query("SELECT count(*)::int n FROM commerce.jobs WHERE kind='provision'")).rows[0].n).toBe(1);
    expect((await pool.query('SELECT password_hash FROM commerce.accounts')).rows[0].password_hash).toMatch(/^scrypt\$/);
  });
  it('rejects foreign origins and oversized transport before processing signup', async () => {
    expect((await request('/v1/signup', signup, undefined, 'https://evil.example')).status).toBe(403);
    expect((await request('/v1/signup', { ...signup, password: 'x'.repeat(20000) })).status).toBe(413);
  });
  it('claims a durable job once under concurrent workers', async () => {
    const jobs = await Promise.all([store.claimJob(), store.claimJob(), store.claimJob()]);
    const ids = jobs.filter(Boolean).map(j => j!.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBe(2);
  });
});
