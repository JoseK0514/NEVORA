import {createHash,randomUUID} from 'node:crypto';
import {beforeAll,afterAll,expect,it,vi} from 'vitest';
import {createDisposableExchangeDatabase} from './local-postgres';
import {initializeCompanyAccessOwnedFixture} from './company-access-owned-app-fixture';
import {verifyPassword} from '../../lib/auth/password';
import {readOperationalAuthority,readOwnerOperationalScope,assignOperationalScope} from '../../lib/company-access/operational-scope.server';
import {readPeriodClose} from '../../lib/period-close/service';
import {source,readRun} from '../../lib/payroll/service';
import {document,statements} from '../../lib/payroll/access';
import type {OwnedDatabaseIdentity} from './owned-pg-transport';
vi.mock('server-only',()=>({}));
vi.mock('@/lib/db',()=>({getDb:()=>{throw Error('Fixture must use the explicit owned executor');},queryRows:(r:unknown)=>r}));
let db:Awaited<ReturnType<typeof createDisposableExchangeDatabase>>;
let fixture:Awaited<ReturnType<typeof initializeCompanyAccessOwnedFixture>>;
let identity:OwnedDatabaseIdentity;
const oldPayroll=process.env.NEVORA_PAYROLL_ENABLED;
const q=<T=Record<string,unknown>>(text:string,values:readonly unknown[]=[])=>db.executor.query<T>({text,values});
beforeAll(async()=>{db=await createDisposableExchangeDatabase({mode:'current-runtime'});try{[identity]=await q<OwnedDatabaseIdentity>("SELECT datname AS name,oid::int AS oid,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()");fixture=await initializeCompanyAccessOwnedFixture({executor:db.executor,identity});process.env.NEVORA_PAYROLL_ENABLED='true';}catch(error){await db.dispose();throw error;}});
afterAll(async()=>{try{await db?.dispose();}finally{if(oldPayroll===undefined)delete process.env.NEVORA_PAYROLL_ENABLED;else process.env.NEVORA_PAYROLL_ENABLED=oldPayroll;}});
it('adopts the exact legacy census before new Managers and uses real normal credential hashes',async()=>{
 expect(await q('SELECT state,owner_policy_receipt_id,legacy_manager_census FROM company_access_adoption')).toEqual([{state:'ENFORCED',owner_policy_receipt_id:'01a13cda-e556-7652-8469-a18a77094364',legacy_manager_census:expect.arrayContaining([expect.objectContaining({employeeId:'QALEGACY'})])}]);
 const [census]=await q<{n:number}>('SELECT jsonb_array_length(legacy_manager_census)::int n FROM company_access_adoption');expect(census.n).toBe(1);
 for(const actor of Object.values(fixture.actors)){const [credential]=await q<{hash:string}>('SELECT password_hash hash FROM employee_credentials WHERE employee_id=$1',[actor.employeeId]);expect(credential.hash).not.toBe(actor.password);expect(await verifyPassword(actor.password,credential.hash)).toBe(true);}
 expect(await readOperationalAuthority(fixture.serverProofs.company,db.executor)).toMatchObject({state:'ready',scope:{mode:'COMPANY'}});
 expect(await readOperationalAuthority(fixture.serverProofs.financial,db.executor)).toMatchObject({state:'ready',scope:{mode:'LOCATIONS',locationIds:['loc-1']}});
 expect(await readOperationalAuthority(fixture.serverProofs.unassigned,db.executor)).toMatchObject({state:'ready',scope:null});
 expect(await q('SELECT e.email,c.employee_id FROM employees e LEFT JOIN employee_credentials c ON c.employee_id=e.id WHERE e.id=$1',[fixture.activation.employeeId])).toEqual([{email:fixture.activation.registeredEmail,employee_id:null}]);
});
it('provides distinct activation subjects and real editable, midnight and history-protected manual drafts',async()=>{
 expect(fixture.activationTargets).toHaveLength(24);expect(new Set(fixture.activationTargets.map(t=>t.employeeId)).size).toBe(24);
 expect(await q("SELECT count(*)::int n FROM employees e LEFT JOIN employee_credentials c ON c.employee_id=e.id WHERE e.id LIKE 'QAINVITE%' AND e.active AND e.email LIKE '%@example.invalid' AND c.employee_id IS NULL")).toEqual([{n:25}]);
 const d=fixture.manualDrafts;expect(await q("SELECT sh.id,sh.end_time,s.status,sh.assignment_origin FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id WHERE sh.id=ANY($1::text[]) ORDER BY sh.id",[[d.editableShiftId,d.midnightShiftId,d.historyShiftId]])).toEqual(expect.arrayContaining([expect.objectContaining({id:d.editableShiftId,status:'DRAFT',assignment_origin:'MANAGER'}),expect.objectContaining({id:d.midnightShiftId,end_time:'24:00:00',status:'DRAFT'}),expect.objectContaining({id:d.historyShiftId,status:'DRAFT'})]));
 expect(await q('SELECT source_shift_id,status FROM shift_exchanges WHERE id=$1',[d.historyRequestId])).toEqual([{source_shift_id:d.historyShiftId,status:'CANCELLED'}]);
 expect(await q("SELECT primary_location_id FROM employees WHERE id='QALOCATIONS'")).toEqual([{primary_location_id:'loc-2'}]);
});
it('retains the same unique roster identity in two distinct valid closed periods',async()=>{
 const {a7,serverProofs}=fixture;expect(a7.period).not.toEqual(a7.remountPeriod);
 for(const period of [a7.period,a7.remountPeriod]){const [date]=await q<{closed:boolean;days:number}>("SELECT $2::date<(clock_timestamp() AT TIME ZONE time_zone)::date AS closed,($2::date-$1::date+1)::int days FROM workspaces WHERE singleton",[period.startDate,period.endDate]);expect(date.closed).toBe(true);expect(date.days).toBeGreaterThan(0);expect(date.days).toBeLessThanOrEqual(31);const view=await readPeriodClose(serverProofs.company,period,db.executor);expect(view.members.filter(m=>m.name===a7.displayName).map(m=>m.employeeId)).toEqual([a7.employeeId]);}
});
it('preserves complete canonical recorded source, approved native money, YTD and actual PDF through operational restriction and revocation',async()=>{
 const {financial,serverProofs}=fixture,proof=serverProofs.financial;
 const capture=async()=>{const canonical=await source(proof,financial.period,db.executor),run=await readRun(proof,financial.runId,db.executor),pdf=await document(proof,financial.documentId,db.executor);const ledger=await q('SELECT to_jsonb(l) row FROM native_payroll_ledger l ORDER BY employee_id,run_id'),heads=await q('SELECT to_jsonb(h) row FROM native_payroll_ledger_heads h ORDER BY employee_id'),grant=await q('SELECT to_jsonb(g) row FROM native_payroll_manager_scopes_current g ORDER BY employee_id'),version=await q('SELECT updated_at::text version FROM employees WHERE id=$1',[proof.employee.id]);return {source:canonical.source,run,pdf:pdf.bytes.toString('hex'),sha:pdf.sha256,ledger,heads,grant,version};};
 const before=await capture(),[count]=await q<{n:number}>('SELECT count(*)::int n FROM employees');expect(before.source.roster).toHaveLength(count.n);expect(before.run.snapshot?.source.roster.map(r=>r.employeeId).sort()).toEqual(['QAFINANCIAL','QALEGACY','QANATIVEB','QAOWNER']);
 expect(before.run.payload).toMatchObject({status:'APPROVED',sourceAuthority:'NATIVE_RECORDED_TIME',coverage:{complete:true,locationIds:['loc-2']},totals:{grossMinor:'100000',netMinor:'82085'}});const recorded=before.run.snapshot?.native?.recordedSources;expect(recorded).toHaveLength(1);if(!recorded)throw Error('Actual recorded native source missing');expect(recorded[0].entries).toHaveLength(5);expect(before.ledger).toHaveLength(2);expect(before.heads).toHaveLength(2);expect(before.sha).toBe(financial.pdfSha256);expect(Buffer.from(before.pdf,'hex').subarray(0,5).toString()).toBe('%PDF-');expect(createHash('sha256').update(Buffer.from(before.pdf,'hex')).digest('hex')).toBe(before.sha);
 expect((await statements(serverProofs.native,db.executor)).statements.map(d=>d.id)).toEqual([financial.documentId]);await expect(document(serverProofs.native,financial.foreignDocumentId,db.executor)).rejects.toThrow('DOCUMENT_UNAVAILABLE');await expect(document(proof,financial.foreignDocumentId,db.executor)).rejects.toThrow('DOCUMENT_UNAVAILABLE');expect((await statements(serverProofs.employee,db.executor)).statements.map(d=>d.id)).toEqual([financial.foreignDocumentId]);expect((await document(serverProofs.native,financial.documentId,db.executor)).bytes.toString('hex')).toBe(before.pdf);
 for(const mode of ['LOCATIONS','REVOKE'] as const){const context=await readOwnerOperationalScope(serverProofs.owner,proof.employee.id,db.executor);if(context.state!=='ready')throw Error('Owner context unavailable');const c=context.data.current,base={operationId:randomUUID(),expectedEmployeeVersion:c.employeeUpdatedAt,expectedRoleGeneration:c.roleGeneration,expectedScopeRevision:c.scopeRevision};const result=await assignOperationalScope(serverProofs.owner,proof.employee.id,mode==='REVOKE'?{...base,action:'REVOKE'}:{...base,action:'ASSIGN',scope:{mode:'LOCATIONS',locationIds:['loc-1']}},db.executor);expect(result.state).toBe('saved');expect(await capture()).toEqual(before);expect((await document(serverProofs.native,financial.documentId,db.executor)).bytes.toString('hex')).toBe(before.pdf);}
 await expect(readRun(serverProofs.company,financial.runId,db.executor)).rejects.toThrow('payroll_authorization');await expect(document(serverProofs.company,financial.documentId,db.executor)).rejects.toThrow('DOCUMENT_UNAVAILABLE');
});
it('refuses mismatched ownership and reinitialization before any fixture writes',async()=>{
 const state=()=>q("SELECT jsonb_build_object('employees',(SELECT jsonb_agg(to_jsonb(e) ORDER BY id) FROM employees e),'adoption',(SELECT jsonb_agg(to_jsonb(a)) FROM company_access_adoption a),'runs',(SELECT jsonb_agg(to_jsonb(r) ORDER BY id) FROM payroll_runs r)) state");const before=await state();await expect(initializeCompanyAccessOwnedFixture({executor:db.executor,identity:{...identity,oid:identity.oid+1}})).rejects.toThrow('identity mismatch');expect(await state()).toEqual(before);await expect(initializeCompanyAccessOwnedFixture({executor:db.executor,identity})).rejects.toThrow('fresh0030 boundary');expect(await state()).toEqual(before);
});
