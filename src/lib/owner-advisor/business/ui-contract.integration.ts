import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import type { SqlExecutor } from '@/lib/notifications/types';
import { companyAccessFixture } from '@/test/integration/company-access-fixture';
import { fictionalBusinessInput } from '@/test/fixtures/rondo-business';
import { businessSourceService } from './service.server';
import { AdvisorStore } from '../store.server';
import { admitOwner } from '../authority.server';
import { BusinessStore } from './store.server';
let f: Awaited<ReturnType<typeof companyAccessFixture>>;
const env = { NEVORA_OWNER_ADVISOR_ENABLED: 'true', NEVORA_OWNER_ADVISOR_BUSINESS_IMPORTS_ENABLED: 'true' };
const signal = () => new AbortController().signal;
const call = (value?: unknown, settings: Record<string, string | undefined> = env, ex = f.db.executor) =>
  businessSourceService(f.owner, ex, settings, signal(), value);
beforeEach(async () => { f = await companyAccessFixture(); vi.spyOn(globalThis, 'fetch').mockRejectedValue(Error('No external requests')); });
afterEach(async () => { vi.restoreAllMocks(); await f?.db.dispose(); });
async function draft() {
  return call({ op: 'stage_source_version', requestId: randomUUID(), format: 'JSON', input: fictionalBusinessInput() });
}
it('returns authorized active location names with the matching IDs and omits them in minimized internal reads', async () => {
  await f.q("UPDATE locations SET name='Fictional Main' WHERE id='loc-1'");
  await f.q("UPDATE locations SET active=false WHERE id='loc-2'");
  const catalog = (await call()).catalog!;
  expect(catalog).toMatchObject({ activeLocationIds: ['loc-1'], activeLocations: [{ id: 'loc-1', name: 'Fictional Main' }] });
  const store = new BusinessStore(new AdvisorStore(f.owner, await admitOwner(f.owner, f.db.executor), f.db.executor), env);
  expect(await store.catalog(signal(), { includeLocations: false })).toMatchObject({ activeLocationIds: [], activeLocations: [] });
});
it('refuses a renamed location between catalog materialization and final response observation', async () => {
  let changed = false;
  const ex: SqlExecutor = { ...f.db.executor, async transaction(statements, incoming) {
    if (!changed && statements.some(s => s.text.startsWith('WITH clock AS MATERIALIZED'))) {
      changed = true; await f.q("UPDATE locations SET name='Fictional renamed' WHERE id='loc-1'");
    }
    return f.db.executor.transaction(statements, incoming);
  } };
  await expect(call(undefined, env, ex)).rejects.toMatchObject({ code: 'conflict' });
});
it('returns the exact database review expiry independently of the short response observation lease', async () => {
  const saved = await draft(), requestId = randomUUID();
  const full = await call({ op: 'read_source_version', requestId, sourceId: saved.receipt!.sourceId, versionId: saved.receipt!.versionId });
  const [row] = await f.q<{ expiry: string }>('SELECT expires_at::text AS expiry FROM owner_advisor_business_read_receipts WHERE request_id=$1::uuid', [requestId]);
  expect(full).toMatchObject({ readReceiptId: expect.any(String), readReceiptExpiresAt: new Date(row.expiry).toISOString() });
  expect(full.validForMs).toBeLessThanOrEqual(15000);
  expect(Date.parse(full.readReceiptExpiresAt!) - Date.parse(full.observedAt)).toBeGreaterThan(15000);
  expect(await call()).toMatchObject({ readReceiptId: null, readReceiptExpiresAt: null });
});
it('reports an already-shortened database handle instead of inventing observedAt plus five minutes', async () => {
  const saved = await draft(), requestId = randomUUID();
  const full = await call({ op: 'read_source_version', requestId, sourceId: saved.receipt!.sourceId, versionId: saved.receipt!.versionId });
  await f.q("UPDATE owner_advisor_business_read_receipts SET expires_at=clock_timestamp()+interval '45 seconds' WHERE request_id=$1::uuid", [requestId]);
  const store = new BusinessStore(new AdvisorStore(f.owner, await admitOwner(f.owner, f.db.executor), f.db.executor), env);
  const handle = await store.reviewReceipt(requestId, signal());
  expect(handle.readReceiptId).toBe(full.readReceiptId);
  const [row] = await f.q<{ expiry: string }>('SELECT expires_at::text AS expiry FROM owner_advisor_business_read_receipts WHERE request_id=$1::uuid', [requestId]);
  expect(handle.readReceiptExpiresAt).toBe(new Date(row.expiry).toISOString());
  expect(Date.parse(handle.readReceiptExpiresAt) - Date.now()).toBeLessThan(45000);
});
it('binds coverage publication to the full-read receipt revision, not its older staged input revision', async () => {
  const staged = await call({ op: 'stage_coverage_map', requestId: randomUUID(), map: { expectedRevision: 0, accounts: [], cells: [] } });
  const full = await call({ op: 'read_coverage_map', requestId: randomUUID(), mapVersionId: staged.receipt!.mapVersionId });
  expect(full.map?.input?.expectedRevision).toBe(0); expect(full.receipt?.revision).toBe(1);
  const command = { op: 'publish_coverage_map', requestId: randomUUID(), mapVersionId: full.map!.mapVersionId, digest: full.map!.digest, readReceiptId: full.readReceiptId, acknowledged: true };
  await expect(call({ ...command, expectedRevision: 0 })).rejects.toMatchObject({ code: 'conflict' });
  expect((await call({ ...command, requestId: randomUUID(), expectedRevision: full.receipt!.revision })).state).toBe('saved');
  expect(full).toMatchObject({ readReceiptExpiresAt: expect.any(String) });
});
it('recovers with only the original operation ID and no financial payload when both child flags are off', async () => {
  const command = { op: 'stage_source_version', requestId: randomUUID(), format: 'JSON', input: fictionalBusinessInput() };
  const saved = await call(command), disabled = { NEVORA_OWNER_ADVISOR_ENABLED: 'true' };
  const recovered = await call({ op: 'check_source_operation', requestId: randomUUID(), operationId: command.requestId }, disabled);
  expect(recovered.receipt).toEqual(saved.receipt);
  expect(recovered).toMatchObject({ state: 'saved', catalog: null, version: null, map: null, result: null, readReceiptId: null, readReceiptExpiresAt: null });
  expect(JSON.stringify(recovered)).not.toContain('operating');
  expect(await f.q('SELECT count(*)::int AS n FROM owner_advisor_business_versions')).toEqual([{ n: 1 }]);
  expect(await f.q('SELECT count(*)::int AS n FROM owner_advisor_business_operations')).toEqual([{ n: 1 }]);
});

