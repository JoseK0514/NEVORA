import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { createDisposableFoundationDatabase } from './local-postgres';
import { seedNativeOverlapFixture, overlapFirstPeriod, overlapSecondPeriod } from './payroll-overlap-fixture.test-support';
import { command, readRun, receipt } from '../../lib/payroll/service';
import { failure } from '../../lib/payroll/http';
import { workerOnce } from '../../lib/payroll/worker';

let db: Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
beforeEach(async () => { process.env.NEVORA_PAYROLL_ENABLED = 'true'; db = await createDisposableFoundationDatabase({ mode: 'current-runtime' }); });
afterEach(async () => { await db?.dispose(); delete process.env.NEVORA_PAYROLL_ENABLED; });
async function captureFailure(action: () => Promise<unknown>) {
    try { await action(); throw Error('Expected payroll rejection'); }
    catch (error) { if (error instanceof Error && error.message === 'Expected payroll rejection') throw error; return error; }
}
it('NQAF002 returns deterministic HTTP conflict for a freshly reviewed overlap while preserving six approved ledger rows and exact receipts', async () => {
    const f = await seedNativeOverlapFixture(db.executor), owner = f.actors.owner.proof;
    const first = await f.prepare(overlapFirstPeriod);
    expect(first.payload.status).toBe('REVIEW_REQUIRED');expect(first.payload.coverage).toEqual({ complete: true, locationIds: ['loc-1', 'loc-2'] });
    const approve = { action: 'APPROVE', operationId: randomUUID(), runId: first.payload.id, expectedRevision: first.payload.revision, reviewToken: first.payload.reviewToken };
    const saved = await command(owner, approve, db.executor);expect(await command(owner, approve, db.executor)).toEqual(saved);
    await workerOnce(db.executor);await workerOnce(db.executor);
    const ledger = await f.q('SELECT * FROM native_payroll_ledger ORDER BY employee_id,run_id');expect(ledger).toHaveLength(6);
    const documents = await f.q("SELECT id::text,sha256,encode(content,'hex') bytes FROM payroll_documents ORDER BY id");expect(documents.length).toBeGreaterThan(0);
    const revisions = await f.q('SELECT * FROM payroll_run_revisions ORDER BY run_id,revision');
    const overlap = await f.prepare(overlapSecondPeriod);expect(overlap.payload.status).toBe('REVIEW_REQUIRED');
    const rejected = { action: 'APPROVE', operationId: randomUUID(), runId: overlap.payload.id, expectedRevision: overlap.payload.revision, reviewToken: overlap.payload.reviewToken };
    const beforeOverlap = await readRun(owner, overlap.payload.id, db.executor);
    const receipts = await f.q('SELECT * FROM payroll_command_receipts ORDER BY operation_id');
    const error = await captureFailure(() => command(owner, rejected, db.executor));
    expect(error).toBeInstanceOf(Error);expect((error as Error).message).toBe('OVERLAPPING_NATIVE_PAYROLL');
    const response = failure(error), body = await response.json();
    await mkdir('outputs/nqaf002', { recursive: true });await writeFile('outputs/nqaf002/ACTUAL_SQL_HTTP_BOUNDARY.json', JSON.stringify({ firstPeriod: overlapFirstPeriod, overlapPeriod: overlapSecondPeriod, actualGuard: (error as Error).message, status: response.status, body, ledgerRows: ledger.length, receipt: await receipt(owner, rejected.operationId, db.executor), noClockOrApprovalGuardBypass: true }, null, 2));
    expect(response.status).toBe(409);expect(body).toEqual({ error: 'PAYROLL_CONFLICT', message: 'Reload and review current information.' });expect(response.headers.get('Cache-Control')).toBe('no-store, private');
    const repeat = failure(await captureFailure(() => command(owner, rejected, db.executor)));expect(repeat.status).toBe(409);expect(await repeat.json()).toEqual(body);
    expect(await receipt(owner, rejected.operationId, db.executor)).toBeNull();expect(await command(owner, approve, db.executor)).toEqual(saved);
    expect(await f.q('SELECT * FROM native_payroll_ledger ORDER BY employee_id,run_id')).toEqual(ledger);
    expect(await f.q("SELECT id::text,sha256,encode(content,'hex') bytes FROM payroll_documents ORDER BY id")).toEqual(documents);
    expect(await f.q('SELECT * FROM payroll_command_receipts ORDER BY operation_id')).toEqual(receipts);
    expect(await readRun(owner, overlap.payload.id, db.executor)).toEqual(beforeOverlap);
    expect((await f.q('SELECT * FROM payroll_run_revisions ORDER BY run_id,revision')).filter(r => r.run_id === first.payload.id)).toEqual(revisions.filter(r => r.run_id === first.payload.id));
    expect(await f.q('SELECT count(*)::int n FROM native_payroll_ledger WHERE run_id=$1', [overlap.payload.id])).toEqual([{ n: 0 }]);
});
it('keeps stale review separate and rejects private actors before revealing whether an approved overlap exists', async () => {
    const f = await seedNativeOverlapFixture(db.executor), owner = f.actors.owner.proof;
    const first = await f.prepare(overlapFirstPeriod), old = await f.prepare(overlapSecondPeriod);
    await command(owner, { action: 'APPROVE', operationId: randomUUID(), runId: first.payload.id, expectedRevision: first.payload.revision, reviewToken: first.payload.reviewToken }, db.executor);
    const stale = failure(await captureFailure(() => command(owner, { action: 'APPROVE', operationId: randomUUID(), runId: old.payload.id, expectedRevision: old.payload.revision, reviewToken: old.payload.reviewToken }, db.executor)));
    expect(stale.status).toBe(409);expect(await stale.json()).toMatchObject({ error: 'NATIVE_REVIEW_STALE' });
    const refreshedReceipt = await command(owner, { action: 'RECALCULATE', operationId: randomUUID(), runId: old.payload.id, expectedRevision: old.payload.revision }, db.executor);
    const fresh = await readRun(owner, refreshedReceipt.runId!, db.executor);
    for (const name of ['partial', 'revoked', 'lead', 'foreign', 'expired'] as const) {
        if (name === 'expired') await f.q("UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE employee_id=$1", [f.actors[name].proof.employee.id]);
        const results = [];
        for (const runId of [fresh.payload.id, randomUUID()]) {
            const response = failure(await captureFailure(() => command(f.actors[name].proof, { action: 'APPROVE', operationId: randomUUID(), runId, expectedRevision: fresh.payload.revision, reviewToken: fresh.payload.reviewToken }, db.executor)));
            results.push({ status: response.status, body: await response.json() });
        }
        expect(results[0]).toEqual(results[1]);expect([403, 404]).toContain(results[0].status);
        expect(JSON.stringify(results[0])).not.toMatch(/OVERLAPPING_NATIVE_PAYROLL|PAYROLL_CONFLICT|2026-09/);
    }
    const full = failure(await captureFailure(() => command(f.actors.full.proof, { action: 'APPROVE', operationId: randomUUID(), runId: fresh.payload.id, expectedRevision: fresh.payload.revision, reviewToken: fresh.payload.reviewToken }, db.executor)));
    expect(full.status).toBe(409);expect(await full.json()).toMatchObject({ error: 'PAYROLL_CONFLICT' });
    const unknown = failure(await captureFailure(() => f.q('SELECT 1/0')));expect(unknown.status).toBe(503);expect(await unknown.json()).toMatchObject({ error: 'PAYROLL_UNAVAILABLE' });
    expect(await f.q('SELECT count(*)::int n FROM native_payroll_ledger')).toEqual([{ n: 6 }]);
});
