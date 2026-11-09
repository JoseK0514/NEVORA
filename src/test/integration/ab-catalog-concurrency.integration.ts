import { createHash } from 'node:crypto';
import { beforeAll, afterAll, beforeEach, it, expect, vi } from 'vitest';
import type { SqlExecutor, SqlStatement } from '../../lib/notifications/types';
const context = vi.hoisted(() => ({ executor: null as SqlExecutor | null }));
const token = 'fictional-ab-catalog-session';
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: 'fictional-ab-catalog-session' }) }) }));
vi.mock('@/lib/db', () => ({ getDb: () => ({ query: (text: string, values: readonly unknown[]) => context.executor!.query({ text, values }) }), queryRows: (rows: unknown) => rows }));
vi.mock('@/lib/data/notification-transactions', async original => ({ ...await original<Record<string, unknown>>(), neonNotificationExecutor: () => context.executor! }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('next/navigation', () => ({ redirect: (destination: string) => { throw Object.assign(new Error('redirect'), { destination }); } }));
import { createDisposableFoundationDatabase } from './local-postgres';
import { updateLocationAction, updatePositionAction } from '../../app/app/settings/actions';
let db: Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
const q = (text: string, values: readonly unknown[] = []) => db.executor.query<Record<string, unknown>>({ text, values });
const catalogs = [
  { name: 'Location', table: 'locations', id: 'loc-1', action: updateLocationAction, shortName: 'Initial' },
  { name: 'Position', table: 'positions', id: 'ab-position', action: updatePositionAction },
] as const;
async function reviewed(catalog: typeof catalogs[number]) { return String((await q(`SELECT updated_at::text AS revision FROM ${catalog.table} WHERE id=$1`, [catalog.id]))[0].revision); }
async function row(catalog: typeof catalogs[number]) { return q(`SELECT to_jsonb(r) AS row FROM ${catalog.table} r WHERE id=$1`, [catalog.id]); }
function form(catalog: typeof catalogs[number], version?: string, name = 'Initial name', active = true) {
  const data = new FormData(); data.set('id', catalog.id); data.set('name', name);
  if ('shortName' in catalog) data.set('shortName', catalog.shortName);
  if (version !== undefined) data.set('expectedUpdatedAt', version);
  if (active) data.set('active', 'on'); return data;
}
beforeAll(async () => { db = await createDisposableFoundationDatabase({ mode: 'current-runtime' }); context.executor = db.executor; });
afterAll(async () => { await db?.dispose(); });
beforeEach(async () => {
  await q('TRUNCATE employees,positions RESTART IDENTITY CASCADE');
  await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('ab-owner','Fictional','Owner','NONE','OWNER','loc-1'); UPDATE locations SET name='Initial name',short_name='Initial',active=true,updated_at=clock_timestamp() WHERE id='loc-1'; INSERT INTO positions(id,workspace_id,name,active) VALUES('ab-position','workspace-fuel','Initial name',true)");
  await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,'ab-owner',clock_timestamp()+interval '1 day')", [createHash('sha256').update(token).digest('hex')]);
});

// Removing the reviewed-revision compare permits the stale active/name writes
// and must fail the retained-state assertions for both real catalogs.
for (const catalog of catalogs) {
  it(`${catalog.name}: stale name save preserves a newer deactivation`, async () => {
    const version = await reviewed(catalog);
    expect(await catalog.action(form(catalog, version, 'Deactivated name', false))).toHaveProperty('success');
    const newer = await row(catalog);
    expect(await catalog.action(form(catalog, version, 'Stale rename', true))).toHaveProperty('error');
    expect(await row(catalog)).toEqual(newer);
  });
  it(`${catalog.name}: stale name save preserves a newer rename`, async () => {
    const version = await reviewed(catalog);
    expect(await catalog.action(form(catalog, version, 'First rename'))).toHaveProperty('success');
    const newer = await row(catalog);
    expect(await catalog.action(form(catalog, version, 'Stale rename'))).toHaveProperty('error');
    expect(await row(catalog)).toEqual(newer);
  });
  it(`${catalog.name}: missing reviewed revision cannot edit the catalog`, async () => {
    const before = await row(catalog);
    expect(await catalog.action(form(catalog, undefined, 'Unreviewed edit'))).toHaveProperty('error');
    expect(await row(catalog)).toEqual(before);
  });
  it(`${catalog.name}: current reviewed revisions permit intentional deactivate/reactivate and advance only their own success`, async () => {
    const version = await reviewed(catalog);
    const deactivated = await catalog.action(form(catalog, version, 'Inactive name', false));
    expect(deactivated).toMatchObject({ success: expect.any(String), updatedAt: expect.any(String) });
    expect(deactivated.updatedAt).not.toBe(version);
    expect(deactivated.updatedAt).toBe(await reviewed(catalog));
    const activated = await catalog.action(form(catalog, deactivated.updatedAt, 'Active name', true));
    expect(activated).toMatchObject({ success: expect.any(String), updatedAt: expect.any(String) });
    expect(activated.updatedAt).not.toBe(deactivated.updatedAt);
    expect(await q(`SELECT name,active FROM ${catalog.table} WHERE id=$1`, [catalog.id])).toEqual([{ name: 'Active name', active: true }]);
  });
  it(`${catalog.name}: two concurrent saves of the same reviewed revision have exactly one winner`, async () => {
    const version = await reviewed(catalog);
    const results = await Promise.all([catalog.action(form(catalog, version, 'Concurrent A', false)), catalog.action(form(catalog, version, 'Concurrent B', false))]);
    expect(results.filter(result => result.success)).toHaveLength(1);
    expect(results.filter(result => result.error)).toHaveLength(1);
    expect(await q(`SELECT active FROM ${catalog.table} WHERE id=$1`, [catalog.id])).toEqual([{ active: false }]);
  });
}
