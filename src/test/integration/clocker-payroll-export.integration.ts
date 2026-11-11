import {createHash,randomUUID} from 'node:crypto';
import {OperationalAuthorizationError} from '../../lib/company-access/operational-scope.server';
import {afterEach,beforeEach,describe,expect,it} from 'vitest';
import {createPunchFixture} from './clocker-punch-fixture';
import {readTimecards,mutateTimecard} from '../../lib/timecards/service';
import {createPayrollExport,readExportProfiles,saveExportProfile,type ExportCommand} from '../../lib/payroll-export/service';
import {mappedPayrollCsv,neutralProfile} from '../../lib/payroll-export/model';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
let f:Awaited<ReturnType<typeof createPunchFixture>>;
const proof:SessionMutationProof={employee:{id:'c34-owner',role:'OWNER',firstName:'QA',lastName:'Owner',primaryLocationId:'loc-1'},sessionTokenHash:'a'.repeat(64)};
const period={startDate:'2026-09-21',endDate:'2026-09-27'};
beforeEach(async()=>{f=await createPunchFixture({companyAccess:true});await f.q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version) VALUES('D6-T','c34-a','loc-1',$1,'2026-09-22T12:00:00Z','2026-09-22T20:00:00Z','CLOCKED_OUT',1)",[f.devices[0].device.id]);});
afterEach(async()=>{await f?.db.dispose();});
async function card(){const r=await readTimecards(proof,period,f.db.executor);if(r.state!=='ready')throw new Error('Unavailable card');return r.cards.find(c=>c.card.employeeId==='c34-a')!;}
async function finalize(){const c=await card();await mutateTimecard(proof,{operationId:randomUUID(),employeeId:'c34-a',...period,expectedRevision:c.revision,expectedSourceHash:c.sourceHash,action:'APPROVE'},f.db.executor);await mutateTimecard(proof,{operationId:randomUUID(),employeeId:'c34-a',...period,expectedRevision:c.revision+1,expectedSourceHash:c.sourceHash,action:'FINALIZE'},f.db.executor);}
async function command():Promise<ExportCommand>{const c=await card();return {...period,operationId:randomUUID(),profileId:null,profileRevision:0,cards:[{employeeId:'c34-a',revision:c.revision,sourceHash:c.sourceHash,finalizationOperationId:c.history[0].operationId}]};}
describe('D6 mapping and immutable export protocol',()=>{
 it('stores versioned mapping profiles with idempotent save and rejects stale updates',async()=>{const cmd={operationId:randomUUID(),id:randomUUID(),expectedRevision:0,profile:neutralProfile()};const first=await saveExportProfile(proof,cmd,f.db.executor);expect(first.revision).toBe(1);expect(await saveExportProfile(proof,cmd,f.db.executor)).toEqual(first);expect(await readExportProfiles(proof,f.db.executor)).toEqual([first]);await expect(saveExportProfile(proof,{...cmd,operationId:randomUUID()},f.db.executor)).rejects.toThrow('CONFLICT');await expect(f.q('DELETE FROM payroll_export_profile_revisions')).rejects.toThrow('append_only');});
 it('exports only reviewed finalized snapshots and preserves exact canonical values',async()=>{await finalize();const input=await command(),result=await createPayrollExport(proof,input,f.db.executor);expect(result.model.rows[0].recordedNanoseconds).toBe('28800000000000');expect(result.model.period).toEqual(period);expect(result.csv).toContain('28800000000000');expect(await createPayrollExport(proof,input,f.db.executor)).toEqual(result);await expect(f.q('DELETE FROM payroll_export_receipts')).rejects.toThrow('append_only');});
 it('replays the original export after explicit reopen without exporting a new unfinalized revision',async()=>{await finalize();const input=await command(),result=await createPayrollExport(proof,input,f.db.executor),c=await card();await mutateTimecard(proof,{operationId:randomUUID(),employeeId:'c34-a',...period,expectedRevision:c.revision,expectedSourceHash:c.sourceHash,action:'REOPEN',note:'Fictional review'},f.db.executor);expect(await createPayrollExport(proof,input,f.db.executor)).toEqual(result);await expect(createPayrollExport(proof,{...input,operationId:randomUUID()},f.db.executor)).rejects.toThrow('finalized');});
 it('refuses a period reopened between projection and receipt generation',async()=>{await finalize();const input=await command();const executor={...f.db.executor,transaction:async(statements:Parameters<typeof f.db.executor.transaction>[0])=>{if(statements.some(s=>s.text.includes('SELECT nevora_payroll_export_command'))){const c=await card();await mutateTimecard(proof,{operationId:randomUUID(),employeeId:'c34-a',...period,expectedRevision:c.revision,expectedSourceHash:c.sourceHash,action:'REOPEN',note:'Concurrent fictional correction'},f.db.executor);}return f.db.executor.transaction(statements);}};await expect(createPayrollExport(proof,input,executor)).rejects.toThrow('CONFLICT');expect(await f.q('SELECT count(*)::int AS count FROM payroll_export_receipts')).toEqual([{count:0}]);});
 it('serializes concurrent duplicate exports to one receipt',async()=>{await finalize();const input=await command();const outcomes=await Promise.all([1,2].map(()=>createPayrollExport(proof,input,f.db.executor)));expect(outcomes[0]).toEqual(outcomes[1]);expect(await f.q('SELECT count(*)::int AS count FROM payroll_export_receipts')).toEqual([{count:1}]);});
 it('refuses a fresh operation for the same business CSV while preserving exact original replay',async()=>{
  await finalize();const input=await command(),first=await createPayrollExport(proof,input,f.db.executor);
  await expect(createPayrollExport(proof,{...input,operationId:randomUUID()},f.db.executor)).rejects.toThrow('ALREADY_GENERATED');
  expect(await createPayrollExport(proof,input,f.db.executor)).toEqual(first);
  expect(await f.q('SELECT count(*)::integer n FROM payroll_export_receipts')).toEqual([{n:1}]);
  await expect(f.q(`INSERT INTO payroll_export_receipts(workspace_id,actor_employee_id,operation_id,command_hash,payload)
   SELECT workspace_id,actor_employee_id,$1,command_hash,payload FROM payroll_export_receipts`,[randomUUID()])).rejects.toThrow('ALREADY_GENERATED');
 });
 it('serializes different operation IDs for one business export to one immutable receipt',async()=>{
  await finalize();const input=await command();
  const results=await Promise.allSettled([input,{...input,operationId:randomUUID()}].map(c=>createPayrollExport(proof,c,f.db.executor)));
  expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);
  const rejected=results.find(r=>r.status==='rejected');expect(rejected?.status==='rejected'?String(rejected.reason):'').toContain('ALREADY_GENERATED');
  expect(await f.q('SELECT count(*)::integer n FROM payroll_export_receipts')).toEqual([{n:1}]);
 });
 it('deduplicates identical output across actors and equivalent mapping profiles',async()=>{
  await finalize();const input=await command();await createPayrollExport(proof,input,f.db.executor);
  await f.q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('R12-owner','Other','Owner','r12-owner','OWNER','loc-1'); INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('b',64),'R12-owner',clock_timestamp()+interval '1 day')");
  const other={employee:{...proof.employee,id:'R12-owner'},sessionTokenHash:'b'.repeat(64)};
  await expect(createPayrollExport(other,{...input,operationId:randomUUID()},f.db.executor)).rejects.toThrow('ALREADY_GENERATED');
  const profile=await saveExportProfile(proof,{operationId:randomUUID(),id:randomUUID(),expectedRevision:0,profile:neutralProfile()},f.db.executor);
  await expect(createPayrollExport(proof,{...input,operationId:randomUUID(),profileId:profile.id,profileRevision:profile.revision},f.db.executor)).rejects.toThrow('ALREADY_GENERATED');
  expect(await f.q('SELECT count(*)::integer n FROM payroll_export_receipts')).toEqual([{n:1}]);
 });
 it('exports selected finalized cards from a complete roster above one read page',async()=>{
  await finalize();const input=await command();
  await f.q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id,active) SELECT 'R12-retained-'||n,'Retained','Fictional '||n,'r12-'||n,'EMPLOYEE','loc-1',false FROM generate_series(1,298) n`);
  const result=await createPayrollExport(proof,input,f.db.executor);expect(result.model.rows.map(r=>r.employeeId)).toEqual(['c34-a']);
  expect(result.model.rows[0].recordedNanoseconds).toBe('28800000000000');
 });
 it.each(['REPEATABLE READ','SERIALIZABLE'])('refuses unsupported %s artifact writes instead of relying on a stale duplicate snapshot',async isolation=>{
  await finalize();const first=await createPayrollExport(proof,await command(),f.db.executor),operationId=randomUUID();
  const profile={...neutralProfile(),columns:[{header:'Hours',source:'recordedHours' as const}]},csv=mappedPayrollCsv(first.model,profile);
  const candidate={...first,operationId,profile,csv,csvSha256:createHash('sha256').update(csv).digest('hex')};
  await expect(f.db.executor.transaction([{text:'SET TRANSACTION ISOLATION LEVEL '+isolation,values:[]},
   {text:'INSERT INTO payroll_export_receipts(workspace_id,actor_employee_id,operation_id,command_hash,payload) SELECT workspace_id,actor_employee_id,$1,command_hash,$2::jsonb FROM payroll_export_receipts',values:[operationId,JSON.stringify(candidate)]}])).rejects.toThrow('nevora_export_ISOLATION');
  expect(await f.q('SELECT count(*)::integer n FROM payroll_export_receipts')).toEqual([{n:1}]);
 });
 it('refuses current role loss',async()=>{await f.q("UPDATE employees SET role='LEAD' WHERE id='c34-owner'");await expect(readExportProfiles(proof,f.db.executor)).rejects.toBeInstanceOf(OperationalAuthorizationError);});
 it('rejects mappings to employees outside the current workspace scope',async()=>{await expect(saveExportProfile(proof,{operationId:randomUUID(),id:randomUUID(),expectedRevision:0,profile:{...neutralProfile(),employeeMappings:[{employeeId:'unavailable-employee',providerEmployeeId:'001'}]}},f.db.executor)).rejects.toThrow('SCOPE');});
 it('rejects changed finalized source or mapping revision before receipt generation',async()=>{await finalize();const input=await command();input.cards[0].sourceHash='b'.repeat(32);await expect(createPayrollExport(proof,input,f.db.executor)).rejects.toThrow('CONFLICT');expect(await f.q('SELECT count(*)::int AS count FROM payroll_export_receipts')).toEqual([{count:0}]);});
});
