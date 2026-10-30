import { newRun, command } from "../../lib/payroll/service";
import type { SqlExecutor } from "../../lib/notifications/types";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { beforeEach, afterEach, it, expect } from "vitest";
import { createPunchFixture } from "./clocker-punch-fixture";
import { nativeProfiles, saveNativeProfile } from "../../lib/payroll/native/profiles.server";
import { input } from "../../lib/payroll/native/fixtures.test-support";
import { fictionalWorkweekPolicy } from "../../lib/payroll/native/workweek-fixtures.test-support";
import type { SessionMutationProof } from "../../lib/shift-changes/types";
const proof: SessionMutationProof = { employee: { id: "c34-owner", role: "OWNER", firstName: "QA", lastName: "Owner", primaryLocationId: "loc-1" }, sessionTokenHash: "a".repeat(64) };
let f: Awaited<ReturnType<typeof createPunchFixture>>;
beforeEach(async () => {
    process.env.NEVORA_PAYROLL_ENABLED = "true";
    // Native payroll finalizes time through current operational authorization.
    // Adopt Company Access after the fixture's real employee census is seeded.
    f = await createPunchFixture({ companyAccess: true });
});
afterEach(async () => { await f?.db.dispose(); delete process.env.NEVORA_PAYROLL_ENABLED; });
function configuration() { const i = input(); i.wages[0].locationIds = ["loc-1"]; i.wages[0].workweekPolicy!.employeeId = "c34-a"; return { schema: "NEVORA_NATIVE_CONFIGURATION_V1" as const, employeeId: "c34-a", wages: i.wages, tax: i.tax, deductions: i.deductions }; }
it("upgrades payroll additively and preserves append-only profile revisions/exact retries", async () => { const c = { action: "SAVE_NATIVE_PROFILE", operationId: randomUUID(), reason: "Actual wage facts reviewed", expectedRevision: 0, configuration: configuration() }; const r = await saveNativeProfile(proof, c, f.db.executor); expect(r.revision).toBe(1); expect(await saveNativeProfile(proof, c, f.db.executor)).toEqual(r); expect((await nativeProfiles(proof, f.db.executor)).configurations[0].wages[0].hourlyRateMinor).toBe("2000"); await expect(saveNativeProfile(proof, { ...c, reason: "Changed retry" }, f.db.executor)).rejects.toThrow("CONFLICT"); await expect(f.q("DELETE FROM native_payroll_profile_revisions")).rejects.toThrow("immutable"); await expect(f.q("TRUNCATE native_payroll_profile_revisions")).rejects.toThrow("immutable"); });
it("serializes competing revisions with one winner", async () => { const c = { action: "SAVE_NATIVE_PROFILE", operationId: randomUUID(), reason: "First facts", expectedRevision: 0, configuration: configuration() }; const results = await Promise.allSettled([saveNativeProfile(proof, c, f.db.executor), saveNativeProfile(proof, { ...c, operationId: randomUUID(), reason: "Competing facts" }, f.db.executor)]); expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1); expect(await f.q("SELECT count(*)::int n FROM native_payroll_profile_revisions")).toEqual([{ n: 1 }]); });
it("denies non-Owner and missing/cross-workspace employee/location facts", async () => { const c = { action: "SAVE_NATIVE_PROFILE", operationId: randomUUID(), reason: "Reviewed facts", expectedRevision: 0, configuration: configuration() }; await expect(saveNativeProfile(proof, { ...c, configuration: { ...c.configuration, employeeId: "missing", wages: c.configuration.wages.map(w => ({ ...w, workweekPolicy: { ...w.workweekPolicy!, employeeId: "missing" } })) } }, f.db.executor)).rejects.toThrow("CONFLICT"); c.configuration.wages[0].locationIds = ["unknown-location"]; await expect(saveNativeProfile(proof, c, f.db.executor)).rejects.toThrow("CONFLICT"); await f.q("UPDATE employees SET role='MANAGER',updated_at=clock_timestamp() WHERE id='c34-owner'"); await expect(saveNativeProfile(proof, c, f.db.executor)).rejects.toThrow("payroll_authorization"); });
it("retains explicit opening zero and finite Owner-issued scope separately from scheduling eligibility", async () => { const i = input(); const c = { action: "ATTEST_OPENING_YTD", operationId: randomUUID(), reason: "Opening zero attested", expectedRevision: 0, employeeId: "c34-a", ytd: i.ytd }; await saveNativeProfile(proof, c, f.db.executor); await f.q("UPDATE employees SET role='MANAGER',updated_at=clock_timestamp() WHERE id='c34-b'"); await saveNativeProfile(proof, { action: "SET_MANAGER_SCOPE", operationId: randomUUID(), reason: "Only location one", expectedRevision: 0, employeeId: "c34-b", review: true, approve: false, locationIds: ["loc-1"] }, f.db.executor); const r = await nativeProfiles(proof, f.db.executor); expect(r.openingYtd[0].ytd.grossMinor).toBe("0"); expect(r.managerScopes[0].locationIds).toEqual(["loc-1"]); expect(r.managerScopes[0].subjectEmployeeVersion).toBeTruthy(); await expect(f.q("UPDATE native_payroll_opening_ytd_revisions SET payload='{}'::jsonb")).rejects.toThrow("immutable"); });
import { calculateNativePayroll } from "../../lib/payroll/native/calculate";
async function seedApprovedNative(runId: string, start = "2026-10-05", end = "2026-10-11", payday = "2026-10-16", correctionOf: string | null = null, extra: Record<string, unknown> = {}) {
    const [w] = await f.q<{
        id: string;
    }>("SELECT id FROM workspaces WHERE singleton");
    const i = input();
    i.employeeId = "c34-a";
    i.wages[0].workweekPolicy!.employeeId = "c34-a";
    i.timecards[0].employeeId = "c34-a";
    const result = calculateNativePayroll(i);
    if (result.state !== "ready")
        throw Error("Blocked fixture");
    await f.q("INSERT INTO payroll_runs(workspace_id,id,start_date,end_date,correction_of) VALUES($1,$2::uuid,$3::date,$4::date,$5::uuid)", [w.id, runId, start, end, correctionOf]);
    await f.q("INSERT INTO payroll_run_revisions VALUES($1,$2::uuid,1,$3::jsonb,NULL)", [w.id, runId, JSON.stringify({ ...newRun(runId, { startDate: start, endDate: end }, payday, correctionOf), sourceAuthority: "NATIVE_RECORDED_TIME", status: "APPROVED", approvedBy: proof.employee.id, approvedAt: "2026-10-12T12:00:00Z", nativeCalculation: { version: "NATIVE_RUN_V1", state: "ready", ruleRevision: 1, templateVersion: "NEVORA_NATIVE_PAYSTUB_PDF_V1", employees: [result] }, ...extra })]);
    return w.id;
}
async function insertLedger(runId: string, start = "2026-10-05", end = "2026-10-11", payday = "2026-10-16", correctionOf: string | null = null) {
    const i = input();
    i.employeeId = "c34-a";
    i.wages[0].workweekPolicy!.employeeId = "c34-a";
    i.timecards[0].employeeId = "c34-a";
    const result = calculateNativePayroll(i);
    if (result.state !== "ready")
        throw Error(JSON.stringify(result));
    return f.q("INSERT INTO native_payroll_ledger(workspace_id,employee_id,tax_year,run_id,correction_of,opening_revision,start_date,end_date,payday,payload) SELECT id,'c34-a',2026,$1::uuid,$2::uuid,1,$3::date,$4::date,$5::date,$6::jsonb FROM workspaces WHERE singleton", [runId, correctionOf, start, end, payday, JSON.stringify({ result })]);
}
async function openingBalance() { await saveNativeProfile(proof, { action: "ATTEST_OPENING_YTD", operationId: randomUUID(), reason: "Opening balance verified", expectedRevision: 0, employeeId: "c34-a", ytd: input().ytd }, f.db.executor); }
it("freezes approved opening balances and rejects duplicate or overlapping ordinary payroll", async () => {
    await openingBalance();
    const id = randomUUID();
    await seedApprovedNative(id);
    await insertLedger(id);
    await expect(saveNativeProfile(proof, { action: "ATTEST_OPENING_YTD", operationId: randomUUID(), reason: "Attempted replacement", expectedRevision: 1, employeeId: "c34-a", ytd: { ...input().ytd, revision: 2 } }, f.db.executor)).rejects.toThrow("APPROVED_YTD_OPENING_FROZEN");
    await expect(insertLedger(id)).rejects.toThrow();
    const overlap = randomUUID();
    await seedApprovedNative(overlap, "2026-10-10", "2026-10-16");
    await expect(insertLedger(overlap, "2026-10-10", "2026-10-16")).rejects.toThrow("OVERLAPPING_NATIVE_PAYROLL");
    await expect(f.q("DELETE FROM native_payroll_ledger")).rejects.toThrow("immutable");
});
it("retains one replacement head and rejects changed year/period/payday lineage", async () => {
    await openingBalance();
    const original = randomUUID(), replacement = randomUUID();
    await seedApprovedNative(original);
    await insertLedger(original);
    await seedApprovedNative(replacement, "2026-10-05", "2026-10-11", "2026-10-16", original);
    await insertLedger(replacement, "2026-10-05", "2026-10-11", "2026-10-16", original);
    expect(await f.q("SELECT count(*)::int n FROM native_payroll_ledger")).toEqual([{ n: 2 }]);
    expect(await f.q("SELECT run_id::text id FROM native_payroll_ledger_heads")).toEqual([{ id: replacement }]);
    const changed = randomUUID();
    await seedApprovedNative(changed, "2026-10-05", "2026-10-11", "2026-10-17", replacement);
    await expect(insertLedger(changed, "2026-10-05", "2026-10-11", "2026-10-17", replacement)).rejects.toThrow("CORRECTION_LINEAGE_CONFLICT");
});
it("serializes simultaneous overlapping ledger approvals in the owned database", async () => {
    await openingBalance();
    const a = randomUUID(), b = randomUUID();
    await seedApprovedNative(a);
    await seedApprovedNative(b, "2026-10-10", "2026-10-16");
    const results = await Promise.allSettled([insertLedger(a), insertLedger(b, "2026-10-10", "2026-10-16")]);
    expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
    expect(await f.q("SELECT count(*)::int n FROM native_payroll_ledger")).toEqual([{ n: 1 }]);
});
import { payrollObjectScopeSql } from "../../lib/payroll/native/scope";
it("enforces current Manager plus finite complete scope and invalidates demotion/re-promotion", async () => {
    await f.q("UPDATE employees SET role='MANAGER',updated_at=clock_timestamp() WHERE id='c34-b'");
    await saveNativeProfile(proof, { action: "SET_MANAGER_SCOPE", operationId: randomUUID(), reason: "Only one location", expectedRevision: 0, employeeId: "c34-b", review: true, approve: true, locationIds: ["loc-1"] }, f.db.executor);
    const manager = { ...proof, employee: { ...proof.employee, id: "c34-b", role: "MANAGER" as const } };
    const query = async (ids: string[], complete = true) => f.q<{
        ok: boolean;
    }>(`SELECT ${payrollObjectScopeSql(manager, "($1::jsonb)", "w.id")} AS ok FROM workspaces w WHERE singleton`, [JSON.stringify({ complete, locationIds: ids })]);
    expect(await query(["loc-1"])).toEqual([{ ok: true }]);
    expect(await query(["loc-1", "loc-2"])).toEqual([{ ok: false }]);
    expect(await query([], false)).toEqual([{ ok: false }]);
    await f.q("UPDATE employees SET role='LEAD',updated_at=clock_timestamp() WHERE id='c34-b'");
    expect(await query(["loc-1"])).toEqual([{ ok: false }]);
    await f.q("UPDATE employees SET role='MANAGER',updated_at=clock_timestamp() WHERE id='c34-b'");
    expect(await query(["loc-1"])).toEqual([{ ok: false }]);
});
import { createHash } from "node:crypto";
import { document, statements } from "../../lib/payroll/access";
import { runs } from "../../lib/payroll/service";
async function scopeDocument(ids: string[], employeeId = "c34-a", published = true) {
    const runId = randomUUID(), docId = randomUUID();
    const w = await seedApprovedNative(runId);
    const content = Buffer.from("%PDF-1.4\nfictional private statement bytes\n");
    await f.q("INSERT INTO payroll_documents VALUES($1,$2::uuid,$3::uuid,$4,'EMPLOYEE_STATEMENT','fictional.pdf',$5,$6,$7::jsonb)", [w, docId, runId, employeeId, createHash('sha256').update(content).digest('hex'), content, JSON.stringify({ period: { startDate: "2026-10-05", endDate: "2026-10-11" }, payday: "2026-10-16", coverage: { complete: true, locationIds: ids } })]);
    if (published)
        await f.q("INSERT INTO payroll_publications VALUES($1,$2::uuid,clock_timestamp())", [w, runId]);
    return { runId, docId, content };
}
async function managerProof() { await f.q("UPDATE employees SET role='MANAGER',updated_at=clock_timestamp() WHERE id='c34-b'"); await f.q("INSERT INTO employee_sessions VALUES(repeat('b',64),'c34-b',clock_timestamp()+interval '1 day',clock_timestamp())"); await saveNativeProfile(proof, { action: "SET_MANAGER_SCOPE", operationId: randomUUID(), reason: "Only location one", expectedRevision: 0, employeeId: "c34-b", review: true, approve: true, locationIds: ["loc-1"] }, f.db.executor); await f.q("INSERT INTO payroll_grant_revisions SELECT id,'c34-b',1,'{\"employeeId\":\"c34-b\",\"review\":true,\"approve\":true}'::jsonb FROM workspaces WHERE singleton"); return { ...proof, employee: { ...proof.employee, id: "c34-b", role: "MANAGER" as const }, sessionTokenHash: "b".repeat(64) }; }
it("denies direct mixed-location documents and leaked run totals before projection", async () => { const manager = await managerProof(); const d = await scopeDocument(["loc-1", "loc-2"]); await expect(document(manager, d.docId, f.db.executor)).rejects.toThrow("DOCUMENT_UNAVAILABLE"); expect((await runs(manager, f.db.executor)).runs).toHaveLength(0); });
it("returns identical private bytes to own all-role history and a fully covered Manager", async () => {
    const manager = await managerProof();
    const d = await scopeDocument(["loc-1"]);
    await f.q("INSERT INTO employee_sessions VALUES(repeat('c',64),'c34-a',clock_timestamp()+interval '1 day',clock_timestamp())");
    for (const role of ["EMPLOYEE", "LEAD", "MANAGER", "OWNER"] as const) {
        await f.q("UPDATE employees SET role=$1,updated_at=clock_timestamp() WHERE id='c34-a'", [role]);
        const own = { ...proof, employee: { ...proof.employee, id: "c34-a", role }, sessionTokenHash: "c".repeat(64) };
        expect((await statements(own, f.db.executor)).statements.map(s => s.id)).toContain(d.docId);
        expect((await document(own, d.docId, f.db.executor)).bytes).toEqual(d.content);
    }
    expect((await document(manager, d.docId, f.db.executor)).bytes).toEqual(d.content);
});
it("denies stale Lead money grants and unknown legacy coverage while preserving own published bytes", async () => { const manager = await managerProof(); const d = await scopeDocument(["loc-1"]); await f.q("UPDATE employees SET role='LEAD',updated_at=clock_timestamp() WHERE id='c34-b'"); await expect(document(manager, d.docId, f.db.executor)).rejects.toThrow("DOCUMENT_UNAVAILABLE"); await expect(runs(manager, f.db.executor)).rejects.toThrow("payroll_authorization"); });
import { receipt } from "../../lib/payroll/service";
it("recovery rechecks the original Owner action permission after a later Manager grant", async () => {
    const c = { action: "SAVE_NATIVE_PROFILE", operationId: randomUUID(), reason: "Owner configured actual facts", expectedRevision: 0, configuration: configuration() };
    await saveNativeProfile(proof, c, f.db.executor);
    await f.q("UPDATE employees SET role='OWNER',updated_at=clock_timestamp() WHERE id='c34-b'");
    await f.q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('b',64),'c34-b',clock_timestamp()+interval '1 day')");
    await f.q("UPDATE employees SET role='MANAGER',updated_at=clock_timestamp() WHERE id='c34-owner'");
    const otherOwner = { ...proof, employee: { ...proof.employee, id: "c34-b" }, sessionTokenHash: "b".repeat(64) };
    await saveNativeProfile(otherOwner, { action: "SET_MANAGER_SCOPE", operationId: randomUUID(), reason: "New finite Manager authority", expectedRevision: 0, employeeId: "c34-owner", review: true, approve: true, locationIds: ["loc-1"] }, f.db.executor);
    const nowManager = { ...proof, employee: { ...proof.employee, role: "MANAGER" as const } };
    await expect(receipt(nowManager, c.operationId, f.db.executor)).rejects.toThrow("payroll_authorization");
});
it("PREPARE gives the same unavailable result for either payday on an out-of-scope existing period", async () => {
    const manager = await managerProof();
    await seedApprovedNative(randomUUID());
    const errors = [];
    for (const payday of ["2026-10-16", "2026-10-17"]) {
        try {
            await command(manager, { action: "PREPARE", operationId: randomUUID(), period: input().period, payday }, f.db.executor);
            errors.push("unexpected success");
        }
        catch (error) {
            errors.push(error instanceof Error ? error.message : "unknown");
        }
    }
    expect(errors).toEqual(["RUN_UNAVAILABLE", "RUN_UNAVAILABLE"]);
});
it("rejects provider-supplied corrections on native runs before adopting any supplied native money or coverage", async () => {
    const runId = randomUUID();
    await seedApprovedNative(runId);
    const i = input(), result = calculateNativePayroll(i);
    if (result.state !== "ready")
        throw Error("blocked fixture");
    await expect(command(proof, { action: "CORRECT", operationId: randomUUID(), runId, expectedRevision: 1, reason: "Attempted provider replacement", amounts: { schema: "NEVORA_PAYROLL_IMPORT_V1", currency: "USD", sourceName: "Fictional import", sourceReference: "Fixture", period: i.period, payday: i.payday, rows: [result.row] } }, f.db.executor)).rejects.toThrow("NATIVE_AMOUNT_INPUT_FORBIDDEN");
});
it("reauthorizes independently returned jobs after finite scope changes even when their run is outside the returned run limit", async () => {
    const manager = await managerProof();
    await saveNativeProfile(proof, { action: "SET_MANAGER_SCOPE", operationId: randomUUID(), reason: "Initial two-location grant", expectedRevision: 1, employeeId: "c34-b", review: true, approve: true, locationIds: ["loc-1", "loc-2"] }, f.db.executor);
    const jobRun = randomUUID();
    await seedApprovedNative(jobRun, "2024-09-02", "2024-09-08", "2024-09-13", null, { coverage: { complete: true, locationIds: ["loc-2"] }, createdAt: "2000-01-01T00:00:00Z" });
    const jobId = randomUUID();
    await f.q("INSERT INTO payroll_jobs(id,workspace_id,run_id,kind,business_key,payload) SELECT $1::uuid,id,$2::uuid,'PDF',$3,'{}'::jsonb FROM workspaces WHERE singleton", [jobId, jobRun, "job-scope-fixture"]);
    const ids = Array.from({ length: 301 }, () => randomUUID());
    await f.q("INSERT INTO payroll_runs(workspace_id,id,start_date,end_date) SELECT w.id,x.value::uuid,'2025-01-01'::date+x.n::integer,'2025-01-01'::date+x.n::integer FROM workspaces w CROSS JOIN jsonb_array_elements_text($1::jsonb) WITH ORDINALITY x(value,n) WHERE w.singleton", [JSON.stringify(ids)]);
    await f.q("INSERT INTO payroll_run_revisions SELECT w.id,r.id,1,jsonb_build_object('id',r.id,'revision',1,'status','APPROVED','sourceAuthority','NATIVE_RECORDED_TIME','createdAt','2026-10-12T00:00:00Z','coverage',jsonb_build_object('complete',true,'locationIds',jsonb_build_array('loc-1'))),NULL FROM payroll_runs r JOIN workspaces w ON w.id=r.workspace_id WHERE r.id=ANY($1::uuid[])", [ids]);
    let changed = false;
    const ex: SqlExecutor = { query: (q, signal) => f.db.executor.query(q, signal), transaction: async (qs, signal) => {
            const r = await f.db.executor.transaction(qs, signal);
            if (!changed && qs.some(q => q.text.includes('FROM payroll_jobs WHERE workspace_id=') && q.text.includes('ORDER BY available_at'))) {
                changed = true;
                await saveNativeProfile(proof, { action: "SET_MANAGER_SCOPE", operationId: randomUUID(), reason: "Narrow scope after job observation", expectedRevision: 2, employeeId: "c34-b", review: true, approve: true, locationIds: ["loc-1"] }, f.db.executor);
            }
            return r;
        } };
    await expect(runs(manager, ex)).rejects.toThrow("PAYROLL_CONFLICT");
    expect(changed).toBe(true);
});
import { readTimecards, mutateTimecard } from '../../lib/timecards/service';
import { readPeriodClose, savePeriodPopulation } from '../../lib/period-close/service';
import { source, saveSettings, readRun } from '../../lib/payroll/service';
import { captureNativePayroll } from '../../lib/payroll/native/source.server';
import { authority } from '../../lib/payroll/store';
const nativePeriod = { startDate: '2026-09-21', endDate: '2026-09-27' }, nativePayday = '2026-09-29';
async function nativeTimeAction(action: 'APPROVE' | 'FINALIZE' | 'REOPEN', period = { startDate: '2026-09-14', endDate: '2026-09-27' }) {
    const read = await readTimecards(proof, period, f.db.executor);
    if (read.state !== 'ready')
        throw Error('Time unavailable');
    const card = read.cards.find(c => c.source.employeeId === 'c34-a')!;
    const result = await mutateTimecard(proof, { operationId: randomUUID(), employeeId: 'c34-a', ...period, action, expectedRevision: card.revision, expectedSourceHash: card.sourceHash, ...(action === 'REOPEN' ? { note: 'Fictional re-review' } : {}) }, f.db.executor);
    expect(result.status).toBe(action === 'APPROVE' ? 'approved' : action === 'FINALIZE' ? 'finalized' : 'reopened');
}
async function nativeFixture(options: {
    profile?: boolean;
    finalize?: boolean;
    workweek?: 'NOTICE' | 'DEFAULT' | 'UNKNOWN';
    contextPeriod?: {
        startDate: string;
        endDate: string;
    };
    contextEntries?: {
        id: string;
        locationId: string;
        startAt: string;
        endAt: string;
    }[];
} = {}) {
    await f.q("UPDATE employees SET first_name='María José',last_name='Vélez' WHERE id='c34-a'");
    await saveSettings(proof, { action: 'SAVE_SETTINGS', operationId: randomUUID(), expectedRevision: 0, effectiveFrom: '2026-01-01', reason: 'Fictional isolated native facts', preferences: { companyName: 'Compañía Ficticia', language: 'es', currency: 'USD', schedule: { frequency: 'WEEKLY', anchorDate: '2026-09-21', paydayOffsetDays: 2 }, rules: [], automation: { prepare: true, publish: false, reminders: false, reminderLeadDays: [] }, bankProfile: null } }, f.db.executor);
    for (const day of [21, 22, 23, 24, 25])
        await f.q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version) VALUES($1,'c34-a','loc-1',$2,$3::timestamptz,$4::timestamptz,'CLOCKED_OUT',1)", ['native-' + day, f.devices[0].device.id, `2026-09-${day}T12:00:00Z`, `2026-09-${day}T20:00:00Z`]);
    const contextPeriod = options.contextPeriod ?? (options.workweek === 'DEFAULT' ? { startDate: '2026-09-08', endDate: '2026-09-28' } : { startDate: '2026-09-14', endDate: '2026-09-27' });
    for (const entry of options.contextEntries ?? [])
        await f.q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version) VALUES($1,'c34-a',$2,$3,$4::timestamptz,$5::timestamptz,'CLOCKED_OUT',1)", [entry.id, entry.locationId, f.devices[entry.locationId === 'loc-2' ? 2 : 0].device.id, entry.startAt, entry.endAt]);
    if (options.finalize !== false) {
        await nativeTimeAction('APPROVE', contextPeriod);
        await nativeTimeAction('FINALIZE', contextPeriod);
    }
    if (options.profile !== false) {
        const c = configuration();
        if (options.workweek === 'DEFAULT') {
            c.wages[0].workweekAnchorDate = null;
            c.wages[0].workweekStartTime = null;
            c.wages[0].workweekPolicy = fictionalWorkweekPolicy('c34-a', { weekday: 1, startTime: '00:01', timeZone: 'America/Puerto_Rico' }, true);
        }
        else if (options.workweek === 'UNKNOWN') {
            c.wages[0].workweekAnchorDate = null;
            c.wages[0].workweekStartTime = null;
            c.wages[0].workweekPolicy = null;
        }
        c.wages[0].locationIds = [...new Set(['loc-1', ...(options.contextEntries ?? []).map(e => e.locationId)])];
        c.wages[0].hourlyRateMinor = '2500';
        c.wages[0].wageCentRounding = 'UNVERIFIED';
        c.tax!.prCentRounding = 'UNVERIFIED';
        c.tax!.ruleEvidenceReference = null;
        await saveNativeProfile(proof, { action: 'SAVE_NATIVE_PROFILE', operationId: randomUUID(), reason: 'Fictional explicit facts, exact operations only', expectedRevision: 0, configuration: c }, f.db.executor);
    }
    await openingBalance();
    const close = await readPeriodClose(proof, nativePeriod, f.db.executor);
    await savePeriodPopulation(proof, { operationId: randomUUID(), expectedRevision: 0, sourceHash: close.sourceHash, ...nativePeriod, members: close.members.map(e => ({ employeeId: e.employeeId, disposition: e.employeeId === 'c34-a' ? 'INCLUDE' : 'EXCLUDE', reason: 'Fictional explicitly reviewed population', employmentFacts: 'Fictional employment', employmentBasis: 'MANAGER_ATTESTED' })) }, f.db.executor);
}
async function nativeCapture() { const seed = await source(proof, nativePeriod, f.db.executor); return captureNativePayroll(seed, newRun(randomUUID(), nativePeriod, nativePayday), f.db.executor, authority(proof, 'REVIEW')); }
it('captures finalized recorded facts and exact-only native gross/taxes/net with complete retained context', async () => { await nativeFixture(); const c = await nativeCapture(); expect(c.run.exceptions).toEqual([]); expect(c.run.status).toBe('REVIEW_REQUIRED'); expect(c.run.totals).toMatchObject({ grossMinor: '100000', netMinor: '82085' }); expect(c.run.nativeCalculation?.employees[0].row.employeeDeductions.reduce((n, d) => n + Number(d.amountMinor), 0)).toBe(17915); expect(c.snapshot?.native?.recordedSources?.[0].entries).toHaveLength(5); expect(c.run.coverage).toEqual({ complete: true, locationIds: ['loc-1'] }); });
it('blocks missing employee facts and unfinalized context without creating invented zero amounts', async () => { await nativeFixture({ profile: false, finalize: false }); const c = await nativeCapture(); expect(c.run.status).toBe('BLOCKED'); expect(c.run.rows).toBeNull(); expect(c.run.totals).toBeNull(); expect(c.run.exceptions).toContain('WAGE_PROFILE_REQUIRED:c34-a'); });
it('PREPARE persists a server-calculated native review and exact retry rather than requesting provider amounts', async () => { await nativeFixture(); const c = { action: 'PREPARE', operationId: randomUUID(), period: nativePeriod, payday: nativePayday }; const r = await command(proof, c, f.db.executor); expect(await command(proof, c, f.db.executor)).toEqual(r); const read = await readRun(proof, r.runId!, f.db.executor); expect(read.payload.sourceAuthority).toBe('NATIVE_RECORDED_TIME'); expect(read.payload.status).toBe('REVIEW_REQUIRED'); expect(read.payload.totals?.grossMinor).toBe('100000'); expect(read.snapshot?.native?.recordedSources).toHaveLength(1); });
async function preparedNative() { const r = await command(proof, { action: 'PREPARE', operationId: randomUUID(), period: nativePeriod, payday: nativePayday }, f.db.executor); return readRun(proof, r.runId!, f.db.executor); }
it('recalculates a blocked native run after missing facts are explicitly configured without client money', async () => { await nativeFixture({ profile: false }); const first = await preparedNative(); expect(first.payload.status).toBe('BLOCKED'); const c = configuration(); c.wages[0].hourlyRateMinor = '2500'; c.wages[0].wageCentRounding = 'UNVERIFIED'; c.tax!.prCentRounding = 'UNVERIFIED'; c.tax!.ruleEvidenceReference = null; await saveNativeProfile(proof, { action: 'SAVE_NATIVE_PROFILE', operationId: randomUUID(), reason: 'Fictional resolved facts', expectedRevision: 0, configuration: c }, f.db.executor); const r = await command(proof, { action: 'RECALCULATE', operationId: randomUUID(), runId: first.payload.id, expectedRevision: first.payload.revision }, f.db.executor); const next = await readRun(proof, r.runId!, f.db.executor); expect(next.payload.status).toBe('REVIEW_REQUIRED'); expect(next.payload.revision).toBe(2); expect(next.payload.totals?.grossMinor).toBe('100000'); });
it('requires human approval and atomically appends exact native ledger money with a PDF job', async () => { await nativeFixture(); const first = await preparedNative(); expect(first.payload.status).toBe('REVIEW_REQUIRED'); expect(await f.q('SELECT count(*)::int n FROM native_payroll_ledger')).toEqual([{ n: 0 }]); const c = { action: 'APPROVE', operationId: randomUUID(), runId: first.payload.id, expectedRevision: first.payload.revision, reviewToken: first.payload.reviewToken }; const r = await command(proof, c, f.db.executor); expect(await command(proof, c, f.db.executor)).toEqual(r); const next = await readRun(proof, r.runId!, f.db.executor); expect(next.payload.status).toBe('APPROVED'); expect(await f.q("SELECT employee_id,payload#>>'{result,row,grossMinor}' AS gross FROM native_payroll_ledger")).toEqual([{ employee_id: 'c34-a', gross: '100000' }]); expect(await f.q("SELECT kind,status FROM payroll_jobs")).toEqual([{ kind: 'PDF', status: 'PENDING' }]); expect(await f.q('SELECT count(*)::int n FROM payroll_publications')).toEqual([{ n: 0 }]); });
it('rejects approval when recorded context was reopened after review and commits no ledger or documents', async () => { await nativeFixture(); const first = await preparedNative(); await nativeTimeAction('REOPEN'); await expect(command(proof, { action: 'APPROVE', operationId: randomUUID(), runId: first.payload.id, expectedRevision: first.payload.revision, reviewToken: first.payload.reviewToken }, f.db.executor)).rejects.toThrow('NATIVE_REVIEW_STALE'); expect(await f.q('SELECT count(*)::int n FROM native_payroll_ledger')).toEqual([{ n: 0 }]); expect(await f.q('SELECT count(*)::int n FROM payroll_documents')).toEqual([{ n: 0 }]); });
import { workerOnce, claimJob, processJob } from '../../lib/payroll/worker';
async function approvedNative() { const first = await preparedNative(); const receipt = await command(proof, { action: 'APPROVE', operationId: randomUUID(), runId: first.payload.id, expectedRevision: first.payload.revision, reviewToken: first.payload.reviewToken }, f.db.executor); return readRun(proof, receipt.runId!, f.db.executor); }
it('generates and automatically publishes the exact private native set even with legacy publish disabled', async () => { await nativeFixture(); const approved = await approvedNative(); await workerOnce(f.db.executor); expect(await f.q("SELECT kind,status FROM payroll_jobs ORDER BY kind")).toEqual([{ kind: 'PDF', status: 'SUCCEEDED' }, { kind: 'PUBLISH', status: 'PENDING' }]); await workerOnce(f.db.executor); expect(await f.q('SELECT count(*)::int n FROM payroll_publications')).toEqual([{ n: 1 }]); expect(await f.q('SELECT count(*)::int n FROM native_payroll_document_manifests')).toEqual([{ n: 1 }]); expect(await f.q('SELECT kind,employee_id FROM payroll_documents ORDER BY kind')).toEqual([{ kind: 'COMPANY_SUMMARY', employee_id: null }, { kind: 'EMPLOYEE_STATEMENT', employee_id: 'c34-a' }]); const manager = await managerProof(); await f.q("INSERT INTO employee_sessions VALUES(repeat('c',64),'c34-a',clock_timestamp()+interval '1 day')"); const own = { ...proof, employee: { ...proof.employee, id: 'c34-a', role: 'EMPLOYEE' as const }, sessionTokenHash: 'c'.repeat(64) }, history = await statements(own, f.db.executor); expect(history.statements).toHaveLength(1); const id = history.statements[0].id; expect((await document(own, id, f.db.executor)).bytes).toEqual((await document(manager, id, f.db.executor)).bytes); const actual = await document(own, id, f.db.executor); expect(actual.bytes.subarray(0, 5).toString()).toBe('%PDF-'); await mkdir('outputs/native-payroll', { recursive: true }); await writeFile('outputs/native-payroll/approved-native-workflow-statement.pdf', actual.bytes); await writeFile('outputs/native-payroll/approved-native-workflow-statement.json', JSON.stringify({ documentId: id, runId: approved.payload.id, sha256: actual.sha256, identicalOwnAndManagerBytes: true, sourceFingerprint: approved.snapshot?.native?.facts.sourceFingerprint, fixture: 'Fictional actual recorded/finalized source and human-approved private publication under an explicit fictional employee-covered midnight notice and invariant captured time; actual company facts and independent statutory acceptance pending' }, null, 2)); expect((await readRun(proof, approved.payload.id, f.db.executor)).payload.revision).toBe(2); });
it('stores and publishes nothing when generation loses its lease between render sections', async () => {
    await nativeFixture();
    await approvedNative();
    const job = await claimJob(f.db.executor);
    if (!job)
        throw Error('Job absent');
    let renewals = 0;
    const ex: SqlExecutor = { transaction: (qs, signal) => f.db.executor.transaction(qs, signal), query: async (q, signal) => {
            if (q.text.startsWith('UPDATE payroll_jobs SET lease_until=')) {
                renewals++;
                if (renewals === 2)
                    return [];
            }
            return f.db.executor.query(q, signal);
        } };
    await expect(processJob(job, ex)).rejects.toThrow('PAYROLL_LEASE_LOST');
    expect(renewals).toBe(2);
    expect(await f.q('SELECT count(*)::int n FROM payroll_documents')).toEqual([{ n: 0 }]);
    expect(await f.q('SELECT count(*)::int n FROM payroll_publications')).toEqual([{ n: 0 }]);
});
it('creates a separately reviewed native replacement and replaces one YTD head without changing prior approval or PDFs', async () => { await nativeFixture(); const original = await approvedNative(); await workerOnce(f.db.executor); await workerOnce(f.db.executor); const prior = await f.q('SELECT id::text,sha256,encode(content,\'hex\') hex FROM payroll_documents ORDER BY id'); const c = { action: 'CORRECT_NATIVE', operationId: randomUUID(), runId: original.payload.id, expectedRevision: original.payload.revision, reason: 'Fictional retained correction reason' }; const r = await command(proof, c, f.db.executor); expect(await command(proof, c, f.db.executor)).toEqual(r); const replacement = await readRun(proof, r.runId!, f.db.executor); expect(replacement.payload.status).toBe('REVIEW_REQUIRED'); expect(replacement.payload.correctionOf).toBe(original.payload.id); expect(replacement.snapshot?.native?.originalRunId).toBe(original.payload.id); expect(replacement.payload.totals?.grossMinor).toBe('100000'); expect(replacement.payload.nativeCalculation?.employees[0].breakdown.ytdBefore.grossMinor).toBe('0'); expect(replacement.payload.nativeCalculation?.employees[0].breakdown.ytdAfter.grossMinor).toBe('100000'); await command(proof, { action: 'APPROVE', operationId: randomUUID(), runId: replacement.payload.id, expectedRevision: 1, reviewToken: replacement.payload.reviewToken }, f.db.executor); expect(await f.q('SELECT run_id::text id FROM native_payroll_ledger_heads')).toEqual([{ id: replacement.payload.id }]); expect(await f.q('SELECT id::text,sha256,encode(content,\'hex\') hex FROM payroll_documents ORDER BY id')).toEqual(prior); expect((await readRun(proof, original.payload.id, f.db.executor)).payload).toEqual(original.payload); });
it('rejects payment exports on native payroll without creating a payment artifact', async () => { await nativeFixture(); const approved = await approvedNative(); await expect(command(proof, { action: 'PAYMENT_EXPORT', operationId: randomUUID(), runId: approved.payload.id, expectedRevision: approved.payload.revision }, f.db.executor)).rejects.toThrow('NATIVE_PAYMENT_EXPORT_UNAVAILABLE'); expect(await f.q('SELECT count(*)::int n FROM payroll_documents')).toEqual([{ n: 0 }]); });
it('rejects contradictory opening bases through the actual Owner save endpoint without appending a revision', async () => { const ytd = { ...input().ytd, socialSecurityWagesMinor: '18450000' }; await expect(saveNativeProfile(proof, { action: 'ATTEST_OPENING_YTD', operationId: randomUUID(), reason: 'Contradictory fictional cap history', expectedRevision: 0, employeeId: 'c34-a', ytd }, f.db.executor)).rejects.toThrow('INVALID_NATIVE_PROFILE'); expect(await f.q('SELECT count(*)::int n FROM native_payroll_opening_ytd_revisions')).toEqual([{ n: 0 }]); });
import { enqueue } from '../../lib/payroll/service';
it('automatically prepares native calculated review from the scheduled worker without approving payroll', async () => { await nativeFixture(); await f.db.executor.query(enqueue(null, 'PREPARE', 'native-scheduled-fixture', { period: nativePeriod, payday: nativePayday, settingsRevision: 1 })); await workerOnce(f.db.executor); const read = await runs(proof, f.db.executor); expect(read.runs).toHaveLength(1); expect(read.runs[0].sourceAuthority).toBe('NATIVE_RECORDED_TIME'); expect(read.runs[0].status).toBe('REVIEW_REQUIRED'); expect(read.runs[0].totals?.grossMinor).toBe('100000'); expect(await f.q('SELECT count(*)::int n FROM native_payroll_ledger')).toEqual([{ n: 0 }]); });
it('refuses ledger money that differs from the approved native snapshot', async () => { await nativeFixture(); const approved = await approvedNative(), runId = randomUUID(); await seedApprovedNative(runId, '2026-10-05', '2026-10-11', '2026-10-16', null, { nativeCalculation: approved.payload.nativeCalculation }); await expect(insertLedger(runId)).rejects.toThrow('NATIVE_LEDGER_SNAPSHOT_CONFLICT'); expect(await f.q('SELECT count(*)::int n FROM native_payroll_ledger')).toEqual([{ n: 1 }]); });
it('refuses ledger period fields that differ from their immutable approved native run', async () => { await openingBalance(); const runId = randomUUID(); await seedApprovedNative(runId); await expect(insertLedger(runId, '2026-10-06', '2026-10-11')).rejects.toThrow('NATIVE_LEDGER_SNAPSHOT_CONFLICT'); expect(await f.q('SELECT count(*)::int n FROM native_payroll_ledger')).toEqual([{ n: 0 }]); });
async function cappedNativeDeduction(effectiveFrom = '2026-01-01') {
    const c = configuration();
    c.wages[0].hourlyRateMinor = '2500';
    c.wages[0].wageCentRounding = 'UNVERIFIED';
    c.tax!.prCentRounding = 'UNVERIFIED';
    c.tax!.ruleEvidenceReference = null;
    c.deductions = [{ id: 'COOP-LOAN', revision: 1, code: 'COOP', label: 'Préstamo cooperativo', effectiveFrom, effectiveTo: null, method: 'FIXED', amountMinor: '1000', basisPoints: null, capMinor: '5000', deductedBeforeMinor: '4500', authorization: 'WRITTEN_POST_TAX', authorizationReference: 'Fictional signed payroll deduction', revoked: false, legalBasis: 'PR_LAW_17_5_C', complianceReference: 'Fictional statutory facts and 4500 withheld before effective date', employerContributionCode: null }];
    await saveNativeProfile(proof, { action: 'SAVE_NATIVE_PROFILE', operationId: randomUUID(), reason: 'Fictional cap opening explicitly attested before effective date', expectedRevision: 1, configuration: c }, f.db.executor);
}
it('retains an explicitly attested deduction-cap opening instead of substituting missing current-year deductions as zero', async () => { await nativeFixture(); await cappedNativeDeduction(); const c = await nativeCapture(); expect(c.run.exceptions).toEqual([]); expect(c.run.nativeCalculation?.employees[0].row.employeeDeductions.find(d => d.code === 'COOP')?.amountMinor).toBe('500'); expect(c.run.totals?.netMinor).toBe('81585'); });
it('blocks capped deductions whose effective baseline needs unsupported prior-year native history', async () => { await nativeFixture(); await cappedNativeDeduction('2025-01-01'); const c = await nativeCapture(); expect(c.run.status).toBe('BLOCKED'); expect(c.run.exceptions).toContain('DEDUCTION_CAP_HISTORY_REQUIRED:c34-a'); expect(c.run.totals).toBeNull(); });
it('fences a profile change made after capture and before approval acquires its final locks', async () => {
    await nativeFixture();
    const first = await preparedNative();
    let changed = false;
    const ex: SqlExecutor = { query: (q, signal) => f.db.executor.query(q, signal), transaction: async (qs, signal) => {
            if (!changed && qs.some(q => q.text.startsWith('INSERT INTO payroll_run_revisions') && String(q.values[2]).includes('"status":"APPROVED"'))) {
                changed = true;
                const c = configuration();
                c.wages[0].hourlyRateMinor = '2500';
                c.wages[0].wageCentRounding = 'UNVERIFIED';
                c.tax!.prCentRounding = 'UNVERIFIED';
                c.tax!.ruleEvidenceReference = null;
                await saveNativeProfile(proof, { action: 'SAVE_NATIVE_PROFILE', operationId: randomUUID(), reason: 'Concurrent same-money evidence revision', expectedRevision: 1, configuration: c }, f.db.executor);
            }
            return f.db.executor.transaction(qs, signal);
        } };
    await expect(command(proof, { action: 'APPROVE', operationId: randomUUID(), runId: first.payload.id, expectedRevision: 1, reviewToken: first.payload.reviewToken }, ex)).rejects.toThrow('NATIVE_SOURCE_CONFLICT');
    expect(changed).toBe(true);
    expect(await f.q('SELECT count(*)::int n FROM native_payroll_ledger')).toEqual([{ n: 0 }]);
    expect((await readRun(proof, first.payload.id, f.db.executor)).payload.status).toBe('REVIEW_REQUIRED');
});
it('blocks contradictory actual employer baseline before source projection can normalize it', async () => {
    await nativeFixture();
    const current = (await nativeProfiles(proof, f.db.executor)).configurations.find(c => c.employeeId === 'c34-a')!;
    const contributions = current.tax!.employerContributions.map(item => item.code === 'FUTA' ? { ...item, applicability: 'APPLICABLE' as const, basisPoints: 600, capMinor: '700000', wagesBeforeMinor: '700000' } : item);
    await saveNativeProfile(proof, { action: 'SAVE_NATIVE_PROFILE', operationId: randomUUID(), expectedRevision: current.revision, reason: 'Fictional contradictory duplicated FUTA counter regression', configuration: { schema: current.schema, employeeId: current.employeeId, wages: current.wages, tax: { ...current.tax!, employerContributions: contributions }, deductions: current.deductions } }, f.db.executor);
    const run = await preparedNative();
    expect(run.payload.status).toBe('BLOCKED');
    expect(run.payload.rows).toBeNull();
    expect(run.payload.totals).toBeNull();
    expect(run.payload.exceptions).toContain('EMPLOYER_YTD_BASE_CONFLICT:c34-a');
    expect(await f.q('SELECT count(*)::int n FROM native_payroll_ledger')).toEqual([{ n: 0 }]);
});
it('retains the actual consistent opening employer counter and freezes the assessed contribution on approval', async () => {
    await nativeFixture();
    const current = (await nativeProfiles(proof, f.db.executor)).configurations.find(c => c.employeeId === 'c34-a')!;
    const contributions = current.tax!.employerContributions.map(item => item.code === 'FUTA' ? { ...item, applicability: 'APPLICABLE' as const, basisPoints: 600, capMinor: '700000', wagesBeforeMinor: '0' } : item);
    await saveNativeProfile(proof, { action: 'SAVE_NATIVE_PROFILE', operationId: randomUUID(), expectedRevision: current.revision, reason: 'Fictional consistent documented FUTA baseline and uncredited rate', configuration: { schema: current.schema, employeeId: current.employeeId, wages: current.wages, tax: { ...current.tax!, employerContributions: contributions }, deductions: current.deductions } }, f.db.executor);
    const approved = await approvedNative();
    expect(approved.payload.nativeCalculation!.employees[0].row.employerContributions).toContainEqual({ code: 'FUTA', label: 'FUTA', amountMinor: '6000' });
    expect(approved.payload.rows![0].netMinor).toBe('82085');
    expect(approved.snapshot!.native!.facts.inputs[0].ytd!.employerWagesMinor.FUTA).toBe('0');
    expect(await f.q("SELECT payload#>>'{result,breakdown,ytdAfter,employerWagesMinor,FUTA}' AS wages FROM native_payroll_ledger")).toEqual([{ wages: '100000' }]);
});
it('captures actual default00:01 and complete zero terminal-date evidence with unresolved/invariant provenance', async () => {
    await nativeFixture({ workweek: 'DEFAULT' });
    const c = await nativeCapture();
    expect(c.run.status).toBe('REVIEW_REQUIRED');
    expect(c.run.totals).toMatchObject({ grossMinor: '100000', netMinor: '82085' });
    expect(c.run.nativeCalculation!.employees[0].provenance.boundaryEvidence).toMatchObject({ dailyInterpretation: 'UNRESOLVED', dailyInputDisposition: 'INVARIANT_NO_FIRST_MINUTE_ENTRIES', workweekPolicy: { origin: { kind: 'STATUTORY_DEFAULT' } }, sourceWindow: { startAt: '2026-09-08T04:00:00Z', endAt: '2026-09-28T04:01:00Z' } });
    expect(c.snapshot!.native!.recordedSources![0].contexts).toEqual([{ startAt: '2026-09-08T04:00:00Z', endAt: '2026-09-28T04:01:00Z' }]);
});
// Changed Oct 30: a missing next-Monday card alone no longer blocks week N (it made every
// Monday 00:01 payroll wait for next week's card). The block is kept for what matters:
// recorded time that starts in Monday 00:00-00:01 without its own finalized card.
it('captures default00:01 week N without a next-Monday card once the empty closing minute has elapsed', async () => {
    await nativeFixture({ workweek: 'DEFAULT', contextPeriod: { startDate: '2026-09-08', endDate: '2026-09-27' } });
    const c = await nativeCapture();
    expect(c.run.exceptions).toEqual([]);
    expect(c.run.status).toBe('REVIEW_REQUIRED');
    expect(c.run.totals).toMatchObject({ grossMinor: '100000', netMinor: '82085' });
    expect(c.snapshot!.native!.facts.inputs[0].closingContextEvidence).toMatchObject({ version: 'NATIVE_CLOSING_CONTEXT_V1', startAt: '2026-09-28T04:00:00Z', endAt: '2026-09-28T04:01:00Z', captureFence: c.snapshot!.native!.recordedSources![0].sourceFence });
    expect(c.snapshot!.native!.recordedSources![0].closingContext).toMatchObject({ startAt: '2026-09-28T04:00:00Z', endAt: '2026-09-28T04:01:00Z' });
});
it('blocks actual time starting in the missing terminal minute instead of inventing finalized zero', async () => {
    await nativeFixture({ workweek: 'DEFAULT', contextPeriod: { startDate: '2026-09-08', endDate: '2026-09-27' }, contextEntries: [{ id: 'native-edge', locationId: 'loc-1', startAt: '2026-09-28T04:00:30Z', endAt: '2026-09-28T05:00:00Z' }] });
    const c = await nativeCapture();
    expect(c.run.status).toBe('BLOCKED');
    expect(c.run.rows).toBeNull();
    expect(c.run.totals).toBeNull();
    expect(c.run.exceptions).toContain('RECORDED_SOURCE_COVERAGE_MISSING:c34-a');
});
it('saves actual unknown workweek facts without normalizing them into a company notice', async () => {
    await nativeFixture({ workweek: 'UNKNOWN' });
    expect(await f.q("SELECT payload#>'{wages,0,workweekPolicy}' AS policy,payload#>'{wages,0,workweekAnchorDate}' AS anchor,payload#>'{wages,0,workweekStartTime}' AS clock FROM native_payroll_profiles_current WHERE employee_id='c34-a'")).toEqual([{ policy: null, anchor: null, clock: null }]);
    const c = await nativeCapture();
    expect(c.run.status).toBe('BLOCKED');
    expect(c.run.totals).toBeNull();
    expect(c.run.exceptions).toContain('WORKWEEK_EVIDENCE_REQUIRED:c34-a');
});
it('blocks an actual same-employee first-minute entry at another location in unpaid rest context', async () => {
    await nativeFixture({ workweek: 'DEFAULT', contextEntries: [{ id: 'daily-context-l2', locationId: 'loc-2', startAt: '2026-09-09T04:00:30Z', endAt: '2026-09-09T04:00:31Z' }] });
    const c = await nativeCapture();
    expect(c.run.status).toBe('BLOCKED');
    expect(c.run.rows).toBeNull();
    expect(c.run.totals).toBeNull();
    expect(c.run.exceptions).toContain('DAILY_BOUNDARY_SENSITIVE:c34-a');
    expect(await f.q('SELECT count(*)::int n FROM native_payroll_ledger')).toEqual([{ n: 0 }]);
});
it('retains actual lookback location disclosure and denies a Manager limited to payable location only', async () => {
    await nativeFixture({ workweek: 'DEFAULT', contextEntries: [{ id: 'daily-context-midday-l2', locationId: 'loc-2', startAt: '2026-09-09T16:00:00Z', endAt: '2026-09-09T17:00:00Z' }] });
    const approved = await approvedNative();
    expect(approved.payload.totals!.grossMinor).toBe('100000');
    expect(approved.payload.coverage).toEqual({ complete: true, locationIds: ['loc-1', 'loc-2'] });
    const manager = await managerProof();
    await expect(readRun(manager, approved.payload.id, f.db.executor)).rejects.toThrow();
    await workerOnce(f.db.executor);
    await workerOnce(f.db.executor);
    const [id] = await f.q<{
        id: string;
    }>("SELECT id::text FROM payroll_documents WHERE employee_id='c34-a'");
    await expect(document(manager, id.id, f.db.executor)).rejects.toThrow();
});
it('invalidates human review after only notice provenance changes while the money remains identical', async () => {
    await nativeFixture({ workweek: 'DEFAULT' });
    const first = await preparedNative();
    const current = (await nativeProfiles(proof, f.db.executor)).configurations.find(c => c.employeeId === 'c34-a')!;
    current.wages[0].workweekPolicy!.revision++;
    await saveNativeProfile(proof, { action: 'SAVE_NATIVE_PROFILE', operationId: randomUUID(), expectedRevision: current.revision, reason: 'Fictional revised actual notice absence evidence', configuration: { schema: current.schema, employeeId: current.employeeId, wages: current.wages, tax: current.tax, deductions: current.deductions } }, f.db.executor);
    const changed = await nativeCapture();
    expect(changed.run.totals).toEqual(first.payload.totals);
    await expect(command(proof, { action: 'APPROVE', operationId: randomUUID(), runId: first.payload.id, expectedRevision: first.payload.revision, reviewToken: first.payload.reviewToken! }, f.db.executor)).rejects.toThrow('NATIVE_REVIEW_STALE');
    expect(await f.q('SELECT count(*)::int n FROM native_payroll_ledger')).toEqual([{ n: 0 }]);
});

async function fractionalEmployeeOpening(socialSecurityWagesMinor = '18450000') {
    const ytd = { ...input().ytd!, revision: 2, grossMinor: '19900500', netMinor: '19900500', socialSecurityWagesMinor, medicareWagesMinor: '19900500', sinotWagesMinor: '900000', locationIds: ['loc-1'] };
    await saveNativeProfile(proof, { action: 'ATTEST_OPENING_YTD', operationId: randomUUID(), reason: 'Fictional separately attested same-employer capped wage bases', expectedRevision: 1, employeeId: 'c34-a', ytd }, f.db.executor);
}
it('freezes statutory employee fractions across actual approval retries and linked replacement without duplicating YTD or changing old PDF bytes', async () => {
    await nativeFixture({ workweek: 'DEFAULT' }); await fractionalEmployeeOpening();
    const first = await preparedNative();
    expect(first.payload.totals).toMatchObject({ grossMinor: '100000', netMinor: '88580' });
    expect(first.snapshot!.native!.ruleEvidence).toMatchObject({ status: 'FEDERAL_EMPLOYEE_STATUTORY_CENTS_OTHER_OPERATIONS_EXACT', federalEmployeeRuleId: '26_CFR_31_3102_1_D', federalEmployeeCollectionSourceSha256: '6aa9dc7b2f966a46c726d4bc4658b4a90804f3cfc9d69abb862f2ad3f5786980' });
    expect(first.payload.nativeCalculation!.employees[0].provenance.federalEmployeeTax.operations).toContainEqual({ code: 'ADDITIONAL_MEDICARE', taxableMinor: '500', basisPoints: 90, exactAmount: { numerator: '9', denominator: '2' }, collectedMinor: '5', roundingDifference: { numerator: '1', denominator: '2' }, ruleId: '26_CFR_31_3102_1_D' });
    const approve = { action: 'APPROVE', operationId: randomUUID(), runId: first.payload.id, expectedRevision: first.payload.revision, reviewToken: first.payload.reviewToken };
    const receipt = await command(proof, approve, f.db.executor); expect(await command(proof, approve, f.db.executor)).toEqual(receipt);
    const original = await readRun(proof, receipt.runId!, f.db.executor);
    expect(await f.q("SELECT count(*)::int n,payload#>>'{result,breakdown,ytdAfter,deductions,ADDITIONAL_MEDICARE}' AS withheld FROM native_payroll_ledger GROUP BY payload")).toEqual([{ n: 1, withheld: '5' }]);
    await workerOnce(f.db.executor); await workerOnce(f.db.executor);
    const oldBytes = await f.q("SELECT id::text,sha256,encode(content,'hex') AS hex FROM payroll_documents ORDER BY id");
    const current = (await nativeProfiles(proof, f.db.executor)).configurations.find(c => c.employeeId === 'c34-a')!;
    await saveNativeProfile(proof, { action: 'SAVE_NATIVE_PROFILE', operationId: randomUUID(), reason: 'Fictional documented correction to effective actual wage', expectedRevision: current.revision, configuration: { schema: current.schema, employeeId: current.employeeId, wages: current.wages.map(w => ({ ...w, revision: w.revision + 1, hourlyRateMinor: '2000' })), tax: current.tax, deductions: current.deductions } }, f.db.executor);
    const correction = { action: 'CORRECT_NATIVE', operationId: randomUUID(), runId: original.payload.id, expectedRevision: original.payload.revision, reason: 'Fictional corrected wage with independently calculated federal threshold' };
    const correctedReceipt = await command(proof, correction, f.db.executor); expect(await command(proof, correction, f.db.executor)).toEqual(correctedReceipt);
    const corrected = await readRun(proof, correctedReceipt.runId!, f.db.executor);
    expect(corrected.payload.totals).toMatchObject({ grossMinor: '80000', netMinor: '73158' });
    expect(corrected.payload.nativeCalculation!.employees[0].breakdown.ytdBefore).toMatchObject({ grossMinor: '19900500', medicareWagesMinor: '19900500' });
    expect(corrected.payload.nativeCalculation!.employees[0].provenance.federalEmployeeTax.operations).toContainEqual({ code: 'ADDITIONAL_MEDICARE', taxableMinor: '0', basisPoints: 90, exactAmount: { numerator: '0', denominator: '1' }, collectedMinor: '0', roundingDifference: { numerator: '0', denominator: '1' }, ruleId: '26_CFR_31_3102_1_D' });
    const correctedApprove = { action: 'APPROVE', operationId: randomUUID(), runId: corrected.payload.id, expectedRevision: corrected.payload.revision, reviewToken: corrected.payload.reviewToken };
    const approved = await command(proof, correctedApprove, f.db.executor); expect(await command(proof, correctedApprove, f.db.executor)).toEqual(approved);
    expect(await f.q('SELECT count(*)::int n FROM native_payroll_ledger')).toEqual([{ n: 2 }]);
    expect(await f.q('SELECT run_id::text id FROM native_payroll_ledger_heads')).toEqual([{ id: corrected.payload.id }]);
    expect(await f.q("SELECT l.payload#>>'{result,breakdown,ytdAfter,grossMinor}' AS gross,l.payload#>>'{result,breakdown,ytdAfter,deductions,ADDITIONAL_MEDICARE}' AS withheld FROM native_payroll_ledger_heads h JOIN native_payroll_ledger l ON l.run_id=h.run_id")).toEqual([{ gross: '19980500', withheld: '0' }]);
    expect((await readRun(proof, original.payload.id, f.db.executor)).payload).toEqual(original.payload);
    expect(await f.q("SELECT id::text,sha256,encode(content,'hex') AS hex FROM payroll_documents ORDER BY id")).toEqual(oldBytes);
});
it('keeps null live money when employer federal rounding remains unsupported after employee collection gains its statutory rule', async () => {
    await nativeFixture({ workweek: 'DEFAULT' }); await fractionalEmployeeOpening('18449995');
    const c = await nativeCapture();
    expect(c.run.status).toBe('BLOCKED'); expect(c.run.rows).toBeNull(); expect(c.run.totals).toBeNull();
    expect(c.run.exceptions).toContain('EMPLOYER_FICA_SOCIAL_SECURITY_CENT_RULE_UNVERIFIED:c34-a');
    expect(await f.q('SELECT count(*)::int n FROM native_payroll_ledger')).toEqual([{ n: 0 }]);
});
