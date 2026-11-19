import {createHash,randomUUID} from 'node:crypto';
import {OperationalAuthorizationError,isOperationalAuthorizationError} from '../../lib/company-access/operational-scope.server';
import {isManagementAuthorizationError} from '../../lib/data/management-session';
import {afterEach,beforeEach,describe,expect,it} from '@rstest/core';
import {createPunchFixture} from './clocker-punch-fixture';
import {readTimecards,mutateTimecard} from '../../lib/timecards/service';
import {createPayrollExport,readExportProfiles,saveExportProfile,type ExportCommand} from '../../lib/payroll-export/service';
import {adpRunPaidColumns,canonicalPayrollExport,mappedPayrollCsv,neutralPaidProfile,neutralProfile} from '../../lib/payroll-export/model';
import {stableExportJson} from '../../lib/payroll-export/json';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import {planPaidExportBatches,paidExportBatchProgress} from '../../lib/payroll-export/batches';
import {readPeriodClose,savePeriodPopulation,preparePeriodManifest} from '../../lib/period-close/service';
let f:Awaited<ReturnType<typeof createPunchFixture>>;
const proof:SessionMutationProof={employee:{id:'c34-owner',role:'OWNER',firstName:'QA',lastName:'Owner',primaryLocationId:'loc-1'},sessionTokenHash:'a'.repeat(64)};
const period={startDate:'2026-09-21',endDate:'2026-09-27'};
beforeEach(async()=>{f=await createPunchFixture({companyAccess:true});await f.q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version) VALUES('D6-T','c34-a','loc-1',$1,'2026-09-22T12:00:00Z','2026-09-22T20:00:00Z','CLOCKED_OUT',1)",[f.devices[0].device.id]);});
afterEach(async()=>{await f?.db.dispose();});
async function card(){const r=await readTimecards(proof,period,f.db.executor);if(r.state!=='ready')throw new Error('Unavailable card');return r.cards.find(c=>c.card.employeeId==='c34-a')!;}
async function finalize(){const c=await card();await mutateTimecard(proof,{operationId:randomUUID(),employeeId:'c34-a',...period,expectedRevision:c.revision,expectedSourceHash:c.sourceHash,action:'APPROVE'},f.db.executor);await mutateTimecard(proof,{operationId:randomUUID(),employeeId:'c34-a',...period,expectedRevision:c.revision+1,expectedSourceHash:c.sourceHash,action:'FINALIZE'},f.db.executor);}
async function command():Promise<ExportCommand>{const c=await card();return {...period,operationId:randomUUID(),profileId:null,profileRevision:0,cards:[{employeeId:'c34-a',revision:c.revision,sourceHash:c.sourceHash,finalizationOperationId:c.history[0].operationId}]};}
describe('D6 mapping and immutable export protocol',()=>{
 it('recovers a concurrently committed identical operation before returning a deterministic finalization refusal',async()=>{
  await finalize();const input=await command(),original=f.db.executor;let interleaved=false,saved:Awaited<ReturnType<typeof createPayrollExport>>|undefined;
  const delayed={...original,transaction:async(statements:Parameters<typeof original.transaction>[0])=>{
   const result=await original.transaction(statements);
   if(!interleaved&&statements.some(s=>s.text.includes('FROM payroll_export_receipts'))){
    interleaved=true;saved=await createPayrollExport(proof,input,original);
    const c=await card();await mutateTimecard(proof,{...period,operationId:randomUUID(),employeeId:'c34-a',expectedRevision:c.revision,expectedSourceHash:c.sourceHash,action:'REOPEN',note:'Fictional concurrent reopen'},original);
   }
   return result;
  }};
  expect(await createPayrollExport(proof,input,delayed)).toEqual(saved);
  expect(interleaved).toBe(true);expect(await f.q('SELECT count(*)::integer n FROM payroll_export_receipts')).toEqual([{n:1}]);
 });
 it('closes a fictional 30-person paid period in byte-bounded batches, reconciling lost replies without omissions or duplicates',async()=>{
  // Remove only this test's fictional one-person starter; no existing DB is used.
  await f.q("DELETE FROM time_entries WHERE id='D6-T'");
  const payPeriod={startDate:'2026-09-21',endDate:'2026-10-04'},ids=Array.from({length:30},(_,i)=>`phase2-fictional-${String(i).padStart(2,'0')}`);
  await f.q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id)
   SELECT id,'Fictional','Payroll person',id,'EMPLOYEE','loc-1' FROM jsonb_array_elements_text($1::jsonb) id`,[JSON.stringify(ids)]);
  const entries=ids.flatMap(employeeId=>Array.from({length:10},(_,day)=>({employeeId,id:`entry-${employeeId}-${day}-${'x'.repeat(48)}`,date:`2026-09-${21+day}`})));
  await f.q(`INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version)
   SELECT e.id,e."employeeId",'loc-1',$2,(e.date||'T12:00:00Z')::timestamptz,(e.date||'T20:30:00Z')::timestamptz,'CLOCKED_OUT',1
   FROM jsonb_to_recordset($1::jsonb) e(id text,"employeeId" text,date text)`,[JSON.stringify(entries),f.devices[0].device.id]);
  const breaks=entries.flatMap(e=>[{id:'meal-'+e.id,entryId:e.id,employeeId:e.employeeId,date:e.date,start:'16:00',end:'16:30',treatment:'UNPAID_RELIEVED_MEAL' as const},{id:'rest-'+e.id,entryId:e.id,employeeId:e.employeeId,date:e.date,start:'14:00',end:'14:15',treatment:'PAID_REST' as const}]);
  await f.q(`INSERT INTO break_entries(id,time_entry_id,break_start_at,break_end_at)
   SELECT b.id,b."entryId",(b.date||'T'||b.start||':00Z')::timestamptz,(b.date||'T'||b."end"||':00Z')::timestamptz
   FROM jsonb_to_recordset($1::jsonb) b(id text,"entryId" text,date text,start text,"end" text)`,[JSON.stringify(breaks)]);
  const initial=await readTimecards(proof,payPeriod,f.db.executor);if(initial.state!=='ready')throw Error('Fictional cards unavailable');
  for(const employeeId of ids){const c=initial.cards.find(c=>c.card.employeeId===employeeId)!;
   const base={...payPeriod,employeeId,expectedSourceHash:c.sourceHash};
   expect((await mutateTimecard(proof,{...base,operationId:randomUUID(),expectedRevision:c.revision,action:'APPROVE'},f.db.executor)).status).toBe('approved');
   expect((await mutateTimecard(proof,{...base,operationId:randomUUID(),expectedRevision:c.revision+1,action:'FINALIZE'},f.db.executor)).status).toBe('finalized');
  }
  const cards=await readTimecards(proof,payPeriod,f.db.executor);if(cards.state!=='ready')throw Error('Fictional finalized cards unavailable');
  const close=await readPeriodClose(proof,payPeriod,f.db.executor);
  const population=await savePeriodPopulation(proof,{...payPeriod,operationId:randomUUID(),expectedRevision:0,sourceHash:close.sourceHash,members:close.members.map(m=>({employeeId:m.employeeId,disposition:ids.includes(m.employeeId)?'INCLUDE':'ZERO_TIME',reason:'Fictional reviewed roster',employmentFacts:'Fictional employment facts',employmentBasis:'MANAGER_ATTESTED'}))},f.db.executor);
  expect(population.members).toHaveLength(33); // 30 paid people plus the 3 zero-time fixture members.
  const [workspace]=await f.q<{id:string}>('SELECT id FROM workspaces WHERE singleton');
  const plan=await planPaidExportBatches({planId:randomUUID(),actorId:proof.employee.id,workspaceId:workspace.id,period:payPeriod,sourceHash:close.sourceHash,population,profileId:null,profileRevision:0,cards:cards.cards.filter(c=>ids.includes(c.card.employeeId)).map(c=>({employeeId:c.card.employeeId,revision:c.revision,sourceHash:c.sourceHash,finalizationOperationId:c.history[0].operationId})),paidTime:{version:1,breakTreatments:breaks.map(b=>({employeeId:b.employeeId,entryId:b.entryId,breakId:b.id,treatment:b.treatment}))}});
  expect(plan.batches.length).toBeGreaterThan(1);expect(plan.batches.every(b=>b.encodedBytes<=65536)).toBe(true);
  let lost=false;const original=f.db.executor;
  const losing={...original,transaction:async(statements:Parameters<typeof original.transaction>[0])=>{const result=await original.transaction(statements);if(!lost&&statements.some(s=>s.text.includes('SELECT nevora_payroll_export_command'))){lost=true;throw Error('Fictional successful response lost after commit');}return result;}};
  await expect(createPayrollExport(proof,JSON.parse(plan.batches[0].body),losing)).rejects.toThrow('response lost after commit');
  expect(await paidExportBatchProgress(plan,[])).toMatchObject({state:'INCOMPLETE',periodComplete:false});
  const first=await createPayrollExport(proof,JSON.parse(plan.batches[0].body),original);
  const before=JSON.stringify(first);
  const partial=[{state:'generated',export:first}];
  expect(await paidExportBatchProgress(plan,partial)).toMatchObject({state:'INCOMPLETE',periodComplete:false});
  await expect(preparePeriodManifest(proof,{...plan.manifestRequest.command,receipts:[plan.manifestRequest.command.receipts[0]]},original)).rejects.toThrow('OMISSION_DUPLICATE_OR_EXTRA');
  await expect(createPayrollExport(proof,{...JSON.parse(plan.batches[0].body),paidTime:{version:1,breakTreatments:[]}},original)).rejects.toThrow('CONFLICT');
  const concurrent=await Promise.all([createPayrollExport(proof,JSON.parse(plan.batches[0].body),original),createPayrollExport(proof,JSON.parse(plan.batches[0].body),original)]);
  expect(concurrent).toEqual([first,first]);
  const rest=[];for(const b of plan.batches.slice(1))rest.push({state:'generated',export:await createPayrollExport(proof,JSON.parse(b.body),original)});
  const replies=[...partial,...rest];
  const progress=await paidExportBatchProgress(plan,replies);expect(progress).toMatchObject({state:'READY_FOR_MANIFEST',periodComplete:false,pendingEmployeeIds:[]});expect(progress.completedEmployeeIds).toHaveLength(30);
  await expect(paidExportBatchProgress(plan,[...partial,...partial])).rejects.toThrow();
  const manifest=await preparePeriodManifest(proof,plan.manifestRequest.command,original);
  expect(manifest.population.members).toHaveLength(33);expect(manifest.exports.flatMap(e=>e.payload.model.rows)).toHaveLength(30);
  expect(manifest.totals).toEqual({recordedNanoseconds:'9180000000000000',breakNanoseconds:'810000000000000'});
  expect(manifest.exports.flatMap(e=>e.payload.model.rows).reduce((sum,r)=>sum+BigInt(r.paidNanoseconds!),BigInt(0))).toBe(BigInt('8640000000000000'));
  console.info('PHASE2_FINANCE_BATCH_METRICS',JSON.stringify({roster:population.members.length,paidEmployees:ids.length,recordedBreaks:breaks.length,batchBytes:plan.batches.map(b=>b.encodedBytes),batchEmployees:plan.batches.map(b=>b.command.cards.length)}));
  expect(await f.q('SELECT count(*)::integer n FROM payroll_export_receipts')).toEqual([{n:plan.batches.length}]);
  await f.q('UPDATE employees SET last_name=$1 WHERE id=$2',['Fictional changed source',ids[0]]);
  expect((await readPeriodClose(proof,payPeriod,original)).manifests.find(m=>m.id===manifest.id)?.current).toBe(false);
  await expect(preparePeriodManifest(proof,{...plan.manifestRequest.command,operationId:randomUUID()},original)).rejects.toThrow('POPULATION_CONFLICT');
  expect(JSON.stringify(await createPayrollExport(proof,JSON.parse(plan.batches[0].body),original))).toBe(before);
 },60000);
 it('exports daily paid time with explicit meal/rest classification and binds replay to that source decision',async()=>{
  await f.q("UPDATE time_entries SET clock_out_at='2026-09-22T20:30:00Z' WHERE id='D6-T'; INSERT INTO break_entries(id,time_entry_id,break_start_at,break_end_at) VALUES('meal','D6-T','2026-09-22T16:00:00Z','2026-09-22T16:30:00Z'),('rest','D6-T','2026-09-22T14:00:00Z','2026-09-22T14:15:00Z')");
  await finalize();const base=await command(),paidTime={version:1 as const,breakTreatments:[{employeeId:'c34-a',entryId:'D6-T',breakId:'meal',treatment:'UNPAID_RELIEVED_MEAL' as const},{employeeId:'c34-a',entryId:'D6-T',breakId:'rest',treatment:'PAID_REST' as const}]};
  const input={...base,paidTime};
  await expect(createPayrollExport(proof,{...input,cards:[{...input.cards[0],sourceHash:'b'.repeat(32)}]},f.db.executor)).rejects.toThrow('CONFLICT');
  const result=await createPayrollExport(proof,input,f.db.executor);
  expect(result.model.rows[0]).toMatchObject({recordedNanoseconds:'30600000000000',breakNanoseconds:'2700000000000',paidNanoseconds:'28800000000000',unpaidBreakNanoseconds:'1800000000000',paidRestNanoseconds:'900000000000'});
  expect(result.csv).toContain('Business date');expect(result.csv).toContain('2026-09-22');expect(result.csv).toContain('28800000000000');
  expect(await createPayrollExport(proof,input,f.db.executor)).toEqual(result);
  await expect(createPayrollExport(proof,{...input,paidTime:{...paidTime,breakTreatments:paidTime.breakTreatments.map(b=>({...b,treatment:'PAID_REST'}))}},f.db.executor)).rejects.toThrow('CONFLICT');
  expect(await f.q('SELECT count(*)::integer n FROM payroll_export_receipts')).toEqual([{n:1}]);
 });
 it('refuses inexact default daily paid hours and accepts a reviewed saved HALF_UP custom mapping',async()=>{
  await f.q("UPDATE time_entries SET clock_out_at='2026-09-22T12:01:00Z' WHERE id='D6-T'");
  await finalize();const input={...await command(),paidTime:{version:1,breakTreatments:[]}};
  await expect(createPayrollExport(proof,input,f.db.executor)).rejects.toThrow('exactly');
  expect(await f.q('SELECT count(*)::integer n FROM payroll_export_receipts')).toEqual([{n:0}]);
  const saved=await saveExportProfile(proof,{operationId:randomUUID(),id:randomUUID(),expectedRevision:0,profile:{...neutralPaidProfile(),hourDecimals:2,precision:'HALF_UP'}},f.db.executor);
  const result=await createPayrollExport(proof,{...input,profileId:saved.id,profileRevision:saved.revision},f.db.executor);
  expect(result.csv).toContain('"0.02","0.00","0.00"');expect(result.model.rows[0].paidNanoseconds).toBe('60000000000');
 });
 it('refuses incomplete or foreign paid-break decisions without a receipt',async()=>{
  await f.q("INSERT INTO break_entries(id,time_entry_id,break_start_at,break_end_at) VALUES('meal','D6-T','2026-09-22T16:00:00Z','2026-09-22T16:30:00Z')");
  await finalize();const base=await command();
  for(const breakTreatments of [[],[{employeeId:'c34-a',entryId:'D6-T',breakId:'other',treatment:'PAID_REST'}]]){
   await expect(createPayrollExport(proof,{...base,paidTime:{version:1,breakTreatments}},f.db.executor)).rejects.toMatchObject({reason:'BREAK_CLASSIFICATION_REVIEW_REQUIRED'});
  }
  expect(await f.q('SELECT count(*)::integer n FROM payroll_export_receipts')).toEqual([{n:0}]);
 });
 it('uses paid hours for reviewed RUN mappings and requires review of saved legacy recorded-hours mappings',async()=>{
  await f.q("UPDATE time_entries SET clock_out_at='2026-09-22T20:30:00Z' WHERE id='D6-T'; INSERT INTO break_entries(id,time_entry_id,break_start_at,break_end_at) VALUES('meal','D6-T','2026-09-22T16:00:00Z','2026-09-22T16:30:00Z')");
  await finalize();const base=await command(),profile={...neutralProfile(),format:'ADP_RUN_GENERIC_V1' as const,dateFormat:'US' as const,hourDecimals:2,columns:adpRunPaidColumns('FICTIONAL','W','TEST','TEST'),employeeMappings:[{employeeId:'c34-a',providerEmployeeId:'001'}]};
  const saved=await saveExportProfile(proof,{operationId:randomUUID(),id:randomUUID(),expectedRevision:0,profile},f.db.executor);
  const input={...base,profileId:saved.id,profileRevision:saved.revision};
  await expect(createPayrollExport(proof,input,f.db.executor)).rejects.toThrow(/paid|break/i);
  const result=await createPayrollExport(proof,{...input,paidTime:{version:1,breakTreatments:[{employeeId:'c34-a',entryId:'D6-T',breakId:'meal',treatment:'UNPAID_RELIEVED_MEAL'}]}},f.db.executor);
  expect(result.csv).toContain('"TEST","8.00"');expect(result.csv).not.toContain('8.50');
  const legacy={...profile,columns:profile.columns.map(c=>c.header==='Pay Hours'?{...c,source:'recordedHours' as const}:c)},legacyId=randomUUID();
  await f.q('INSERT INTO payroll_export_profile_revisions(workspace_id,profile_id,revision,operation_id,actor_employee_id,command_hash,profile) SELECT id,$1,1,$2,$3,repeat(\'a\',64),$4::jsonb FROM workspaces',[legacyId,randomUUID(),proof.employee.id,JSON.stringify(legacy)]);
  expect((await readExportProfiles(proof,f.db.executor)).find(p=>p.id===legacyId)).toEqual({id:legacyId,revision:1,profile:legacy,requiresTimeBasisReview:true});
  await expect(createPayrollExport(proof,{...base,operationId:randomUUID(),profileId:legacyId,profileRevision:1},f.db.executor)).rejects.toThrow(/review/i);
  await expect(saveExportProfile(proof,{operationId:randomUUID(),id:legacyId,expectedRevision:1,profile:legacy},f.db.executor)).rejects.toThrow(/review/i);
  const historicalCommand={...base,operationId:randomUUID(),profileId:legacyId,profileRevision:1},cards=await readTimecards(proof,period,f.db.executor);if(cards.state!=='ready')throw Error('Unavailable fictional source');
  const model=canonicalPayrollExport(result.model.workspaceId,cards.observedAt,period,cards.cards,['c34-a'],cards.paging);
  const csv='##GENERIC## V1.0\r\n"IID","Pay Frequency","Pay Period Start Date","Pay Period End Date","Employee ID","Earnings Code","Pay Hours","Dollars","Separate Check","Worked In Dept","Rate Code"\r\n"FICTIONAL","W","09/21/2026","09/27/2026","001","TEST","8.50","","0","","TEST"\r\n';
  const sha=(s:string)=>createHash('sha256').update(s).digest('hex'),historical={...result,operationId:historicalCommand.operationId,profileId:legacyId,profileRevision:1,profile:legacy,model,csv,csvSha256:sha(csv),canonicalSha256:sha(stableExportJson(model))};
  await f.q('INSERT INTO payroll_export_receipts(workspace_id,actor_employee_id,operation_id,command_hash,payload) VALUES($1,$2,$3,$4,$5::jsonb)',[model.workspaceId,proof.employee.id,historicalCommand.operationId,sha(stableExportJson(historicalCommand)),JSON.stringify(historical)]);
  expect(await createPayrollExport(proof,historicalCommand,f.db.executor)).toEqual(historical);
 });
 it('stores versioned mapping profiles with idempotent save and rejects stale updates',async()=>{const cmd={operationId:randomUUID(),id:randomUUID(),expectedRevision:0,profile:neutralProfile()};const first=await saveExportProfile(proof,cmd,f.db.executor);expect(first.revision).toBe(1);expect(await saveExportProfile(proof,cmd,f.db.executor)).toEqual(first);expect(await readExportProfiles(proof,f.db.executor)).toEqual([first]);await expect(saveExportProfile(proof,{...cmd,operationId:randomUUID()},f.db.executor)).rejects.toThrow('CONFLICT');await expect(f.q('DELETE FROM payroll_export_profile_revisions')).rejects.toThrow('append_only');});
 it('recovers only the exact historical legacy save operation after later profile edits under current scope',async()=>{
  const profile={...neutralProfile(),format:'ADP_RUN_GENERIC_V1' as const,dateFormat:'US' as const,hourDecimals:2,columns:adpRunPaidColumns('FICTIONAL','W','TEST','TEST').map(c=>c.header==='Pay Hours'?{...c,source:'recordedHours' as const}:c),employeeMappings:[{employeeId:'c34-a',providerEmployeeId:'001'}]};
  const input={id:randomUUID(),operationId:randomUUID(),expectedRevision:0,profile},hash=createHash('sha256').update(stableExportJson(input)).digest('hex');
  await f.q('INSERT INTO payroll_export_profile_revisions(workspace_id,profile_id,revision,operation_id,actor_employee_id,command_hash,profile) SELECT id,$1,1,$2,$3,$4,$5::jsonb FROM workspaces',[input.id,input.operationId,proof.employee.id,hash,JSON.stringify(profile)]);
  const changed=await saveExportProfile(proof,{...input,operationId:randomUUID(),expectedRevision:1,profile:neutralProfile()},f.db.executor);expect(changed.revision).toBe(2);
  expect(await saveExportProfile(proof,input,f.db.executor)).toEqual({id:input.id,revision:1,profile,requiresTimeBasisReview:true});
  await expect(saveExportProfile(proof,{...input,profile:{...profile,name:'Changed replay'}},f.db.executor)).rejects.toThrow('CONFLICT');
  await expect(saveExportProfile(proof,{...input,operationId:randomUUID()},f.db.executor)).rejects.toMatchObject({reason:'LEGACY_MAPPING_REVIEW_REQUIRED'});
  await f.q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('legacy-other-owner','Other','Owner','legacy-other-owner','OWNER','loc-1'); INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('b',64),'legacy-other-owner',clock_timestamp()+interval '1 day')");
  await expect(saveExportProfile({employee:{...proof.employee,id:'legacy-other-owner'},sessionTokenHash:'b'.repeat(64)},input,f.db.executor)).rejects.toThrow('CONFLICT');
  const executor={...f.db.executor,transaction:async(statements:Parameters<typeof f.db.executor.transaction>[0])=>{
   const result=await f.db.executor.transaction(statements);
   if(statements.some(s=>s.text.includes('FROM payroll_export_profile_revisions')&&s.text.includes('operation_id'))){await f.q("UPDATE employees SET role='LEAD' WHERE id='c34-owner'");}
   return result;
  }};
  let denied:unknown;try{await saveExportProfile(proof,input,executor);}catch(error){denied=error;}
  expect(isOperationalAuthorizationError(denied)||isManagementAuthorizationError(denied)).toBe(true);
  expect(await f.q('SELECT revision FROM payroll_export_profile_revisions WHERE profile_id=$1 ORDER BY revision',[input.id])).toEqual([{revision:1},{revision:2}]);
 });
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
