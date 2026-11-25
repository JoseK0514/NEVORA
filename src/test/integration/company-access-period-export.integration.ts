import {expect,it,rs} from '@rstest/core';
import {randomUUID} from 'node:crypto';
import type {SqlExecutor,SqlStatement} from '../../lib/notifications/types';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import {companyAccessFixture} from './company-access-fixture';
import {assignOperationalScope,readOwnerOperationalScope,isOperationalAuthorizationError} from '../../lib/company-access/operational-scope.server';
import {isManagementAuthorizationError} from '../../lib/data/management-session';
import {readTimecards,mutateTimecard} from '../../lib/timecards/service';
import {createPayrollExport,readExportProfiles,readOwnPayrollExportReceipt,saveExportProfile} from '../../lib/payroll-export/service';
import {neutralProfile} from '../../lib/payroll-export/model';
import {readPeriodCloseHistory,readPeriodClose,savePeriodPopulation,preparePeriodManifest,readPeriodArtifact,recordPeriodHandoff} from '../../lib/period-close/service';
const ctx=rs.hoisted(()=>({ex:null as SqlExecutor|null,proof:null as SessionMutationProof|null}));
rs.mock('server-only',()=>({}));
rs.mock('@/lib/auth/session',()=>({getSession:async()=>ctx.proof?.employee??null,requireSessionMutationProof:async()=>ctx.proof}));
rs.mock('@/lib/db',()=>{
 const statement=(text:string,values:readonly unknown[]=[])=>({statement:{text,values},then:(yes:(rows:unknown[])=>unknown,no:(error:unknown)=>unknown)=>ctx.ex!.query({text,values}).then(yes,no)});
 const tagged=Object.assign((strings:TemplateStringsArray,...values:unknown[])=>statement(strings.reduce((text,part,i)=>text+(i?'$'+i:'')+part,''),values),{query:statement,transaction:(queries:{statement:SqlStatement}[])=>ctx.ex!.transaction(queries.map(q=>q.statement))});return {getDb:()=>tagged,queryRows:(rows:unknown)=>rows};
});
import {GET as profilesGET,POST as profilesPOST} from '../../app/api/payroll-export/profiles/route';
import {POST as exportPOST} from '../../app/api/payroll-export/route';
import {POST as periodPOST} from '../../app/api/period-close/route';
import {GET as artifactGET} from '../../app/api/period-close/artifact/route';
const period={startDate:'2026-09-21',endDate:'2026-09-27'};
type Fixture=Awaited<ReturnType<typeof setup>>;
async function choose(f:Awaited<ReturnType<typeof companyAccessFixture>>,mode:'COMPANY'|'LOCATIONS'|'REVOKE'){
 const v=await readOwnerOperationalScope(f.owner,'manager',f.db.executor);if(v.state!=='ready')throw Error('Owner context');const c=v.data.current;
 const base={operationId:randomUUID(),expectedEmployeeVersion:c.employeeUpdatedAt,expectedRoleGeneration:c.roleGeneration,expectedScopeRevision:c.scopeRevision};
 expect((await assignOperationalScope(f.owner,'manager',mode==='REVOKE'?{...base,action:'REVOKE'}:{...base,action:'ASSIGN',scope:mode==='COMPANY'?{mode,locationIds:[]}:{mode,locationIds:['loc-1']}},f.db.executor)).state).toBe('saved');
}
async function setup(successorFinishes=false){const f=await companyAccessFixture();ctx.ex=f.db.executor;ctx.proof=f.manager;try{
 await f.q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('period-private-b','Private B','Employee','NONE','EMPLOYEE','loc-2');
 INSERT INTO clocker_devices(id,location_id,name) VALUES('period-device-b','loc-2','Owned B');
 INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status) VALUES('period-entry-b','period-private-b','loc-2','period-device-b','2026-09-22T12:00:00Z','2026-09-22T20:00:00Z','CLOCKED_OUT')`);
 let card;for(const action of ['APPROVE','FINALIZE'] as const){const view=await readTimecards(f.owner,period,f.db.executor);if(view.state!=='ready')throw Error('Canonical cards');card=view.cards.find(c=>c.card.employeeId==='period-private-b')!;expect((await mutateTimecard(f.owner,{...period,operationId:randomUUID(),employeeId:'period-private-b',expectedRevision:card.revision,expectedSourceHash:card.sourceHash,action},f.db.executor)).status).toBe(action==='APPROVE'?'approved':'finalized');}
 const view=await readTimecards(f.manager,period,f.db.executor);if(view.state!=='ready')throw Error('Canonical finalized cards');card=view.cards.find(c=>c.card.employeeId==='period-private-b')!;
 const profileInput={operationId:randomUUID(),id:randomUUID(),expectedRevision:0,profile:{...neutralProfile(),name:'Private B mapping',employeeMappings:[{employeeId:'period-private-b',providerEmployeeId:'OWNED-B-001'}]}};
 const profile=await saveExportProfile(f.manager,profileInput,f.db.executor);expect(profile.revision).toBe(1);
 const exportInput={...period,operationId:randomUUID(),profileId:profile.id,profileRevision:profile.revision,cards:[{employeeId:'period-private-b',revision:card.revision,sourceHash:card.sourceHash,finalizationOperationId:card.history[0].operationId}]};
 const exported=await createPayrollExport(f.manager,exportInput,f.db.executor);expect(exported.model.rows[0].recordedNanoseconds).toBe('28800000000000');
 const close=await readPeriodClose(f.manager,period,f.db.executor);
 const populationInput={...period,operationId:randomUUID(),expectedRevision:0,sourceHash:close.sourceHash,members:close.members.map(m=>({employeeId:m.employeeId,disposition:m.employeeId==='period-private-b'?'INCLUDE' as const:'ZERO_TIME' as const,reason:'Owned reviewed member',employmentFacts:'Owned fictional employment facts',employmentBasis:'MANAGER_ATTESTED' as const}))};
 const population=await savePeriodPopulation(f.manager,populationInput,f.db.executor);expect(population.revision).toBe(1);
 const manifestInput={...period,operationId:randomUUID(),populationRevision:population.revision,receipts:[{actorId:'manager',operationId:exported.operationId}]};
 if(successorFinishes)await choose(f,'LOCATIONS');
 const finisher=successorFinishes?f.owner:f.manager;
 const manifest=await preparePeriodManifest(finisher,manifestInput,f.db.executor);expect(manifest.totals.recordedNanoseconds).toBe('28800000000000');
 const handoffInput={operationId:randomUUID(),manifestId:manifest.id,destination:'Owned destination',reference:'Owned reference',kind:'REPORTED_IMPORTED'};
 const handoff=await recordPeriodHandoff(finisher,handoffInput,f.db.executor);expect(handoff).toMatchObject({providerVerified:false});
 return {...f,profileInput,profile,exportInput,exported,populationInput,population,manifestInput,manifest,handoffInput};
 }catch(error){await f.db.dispose();throw error;}}
async function close(f:Fixture){ctx.ex=null;ctx.proof=null;rs.unstubAllEnvs();await f.db.dispose();}
async function denied(work:()=>Promise<unknown>){let error:unknown;try{await work();}catch(e){error=e;}expect(isOperationalAuthorizationError(error)||isManagementAuthorizationError(error)).toBe(true);}
async function snapshot(f:Fixture){return f.q(`SELECT jsonb_build_object('profiles',(SELECT jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text) FROM payroll_export_profile_revisions t),'exports',(SELECT jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text) FROM payroll_export_receipts t),'populations',(SELECT jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text) FROM payroll_period_populations t),'manifests',(SELECT jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text) FROM payroll_period_manifests t),'events',(SELECT jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text) FROM payroll_period_events t)) AS state`);}
const cases=[
 {name:'mapping list',run:(f:Fixture,ex:SqlExecutor)=>readExportProfiles(f.manager,ex)},
 {name:'mapping save',run:(f:Fixture,ex:SqlExecutor)=>saveExportProfile(f.manager,{...f.profileInput,operationId:randomUUID(),expectedRevision:1},ex)},
 {name:'export creation',run:(f:Fixture,ex:SqlExecutor)=>createPayrollExport(f.manager,{...f.exportInput,operationId:randomUUID()},ex)},
 {name:'period close read',run:(f:Fixture,ex:SqlExecutor)=>readPeriodClose(f.manager,period,ex)},
 {name:'population save',run:(f:Fixture,ex:SqlExecutor)=>savePeriodPopulation(f.manager,{...f.populationInput,operationId:randomUUID(),expectedRevision:1},ex)},
 {name:'manifest prepare',run:(f:Fixture,ex:SqlExecutor)=>preparePeriodManifest(f.manager,{...f.manifestInput,operationId:randomUUID()},ex)},
 {name:'artifact serve',run:(f:Fixture,ex:SqlExecutor)=>readPeriodArtifact(f.manager,f.manifest.id,'csv',0,ex)},
 {name:'handoff recording',run:(f:Fixture,ex:SqlExecutor)=>recordPeriodHandoff(f.manager,{...f.handoffInput,operationId:randomUUID()},ex)},
 {name:'period history read',run:(f:Fixture,ex:SqlExecutor)=>readPeriodCloseHistory(f.manager,period,ex)},
];
it.each(cases)('$name requires Company and preserves existing immutable export/period history',async test=>{const f=await setup();try{await choose(f,'LOCATIONS');const before=await snapshot(f);await denied(()=>test.run(f,f.db.executor));expect(await snapshot(f)).toEqual(before);}finally{await close(f);}});
const replays=[
 {name:'profile receipt',run:(f:Fixture,ex:SqlExecutor)=>saveExportProfile(f.manager,f.profileInput,ex)},
 {name:'export receipt',run:(f:Fixture,ex:SqlExecutor)=>createPayrollExport(f.manager,f.exportInput,ex)},
 {name:'population receipt',run:(f:Fixture,ex:SqlExecutor)=>savePeriodPopulation(f.manager,f.populationInput,ex)},
 {name:'manifest receipt',run:(f:Fixture,ex:SqlExecutor)=>preparePeriodManifest(f.manager,f.manifestInput,ex)},
 {name:'handoff receipt',run:(f:Fixture,ex:SqlExecutor)=>recordPeriodHandoff(f.manager,f.handoffInput,ex)},
];
it.each(replays)('$name replay rechecks current Company instead of using historical authority',async test=>{const f=await setup();try{await choose(f,'LOCATIONS');const before=await snapshot(f);await denied(()=>test.run(f,f.db.executor));expect(await snapshot(f)).toEqual(before);}finally{await close(f);}});
it('Owner and Company preserve complete canonical B time, mappings, manifest totals and exact stored artifact bytes',async()=>{
 const f=await setup();try{
  for(const p of [f.owner,f.manager]){const value=await readPeriodClose(p,period,f.db.executor);expect(value.members.some(m=>m.employeeId==='period-private-b')).toBe(true);expect((await readExportProfiles(p,f.db.executor))[0].profile.employeeMappings).toEqual([{employeeId:'period-private-b',providerEmployeeId:'OWNED-B-001'}]);}
  const artifact=await readPeriodArtifact(f.manager,f.manifest.id,'csv',0,f.db.executor);expect(artifact.content).toBe(f.exported.csv);expect(artifact.sha256).toBe(f.exported.csvSha256);
  for(const test of replays)expect(await test.run(f,f.db.executor)).toBeDefined();
 }finally{await close(f);}
});
it('preserves company custody across an export preparer change and keeps a stale handoff historical',async()=>{
 const f=await setup(true);try{
  const ex=f.db.executor;
  expect(await readOwnPayrollExportReceipt(f.owner,f.exported.operationId,ex)).toBeNull();
  const before=await readPeriodClose(f.owner,period,ex);
  expect(before.exports).toContainEqual(expect.objectContaining({actorId:'manager',operationId:f.exported.operationId}));
  expect(before.manifests[0]).toMatchObject({id:f.manifest.id,current:true});
  const original=await recordPeriodHandoff(f.owner,f.handoffInput,ex);
  await f.q("UPDATE employees SET active=false WHERE id='manager'");
  expect((await readPeriodClose(f.owner,period,ex)).manifests[0]).toMatchObject({id:f.manifest.id,current:false});
  const twoDownloads=[await readPeriodArtifact(f.owner,f.manifest.id,'csv',0,ex),await readPeriodArtifact(f.owner,f.manifest.id,'csv',0,ex)];
  for(const artifact of twoDownloads)expect(artifact).toMatchObject({content:f.exported.csv,sha256:f.exported.csvSha256});
  await expect(recordPeriodHandoff(f.owner,{...f.handoffInput,operationId:randomUUID()},ex)).rejects.toThrow('HANDOFF_SOURCE_CONFLICT');
  expect(await recordPeriodHandoff(f.owner,f.handoffInput,ex)).toEqual(original);
  expect(await f.q("SELECT count(*)::int AS n FROM payroll_period_events WHERE kind='REPORTED_IMPORTED'")).toEqual([{n:1}]);
 }finally{await close(f);}
});
it('BL-22 makes the exact submitted artifact historical when a finalized card reopens',async()=>{
 const f=await setup();
 try{
  const ex=f.db.executor, before=await readTimecards(f.owner,period,ex);
  if(before.state!=='ready')throw Error('Expected current finalized card');
  const member=before.cards.find(card=>card.card.employeeId==='period-private-b');
  if(!member)throw Error('Expected fictional payroll employee');
  const original=await recordPeriodHandoff(f.manager,f.handoffInput,ex);

  expect((await mutateTimecard(f.owner,{
   ...period,operationId:randomUUID(),employeeId:member.card.employeeId,
   expectedRevision:member.revision,expectedSourceHash:member.sourceHash,
   action:'REOPEN',note:'Fictional employee reported a time correction after export.',
  },ex)).status).toBe('reopened');

  expect((await readPeriodClose(f.owner,period,ex)).manifests)
   .toContainEqual(expect.objectContaining({id:f.manifest.id,current:false}));
  await expect(recordPeriodHandoff(f.manager,{...f.handoffInput,operationId:randomUUID()},ex))
   .rejects.toThrow('HANDOFF_SOURCE_CONFLICT');
  expect(await recordPeriodHandoff(f.manager,f.handoffInput,ex)).toEqual(original);
  expect(await readPeriodArtifact(f.owner,f.manifest.id,'csv',0,ex))
   .toMatchObject({content:f.exported.csv,sha256:f.exported.csvSha256});
 }finally{await close(f);}
});
const reads=[
 {name:'mapping projection',match:'SELECT profile_id AS id',run:(f:Fixture,ex:SqlExecutor)=>readExportProfiles(f.manager,ex)},
 {name:'history projection',match:'WITH matching AS',run:(f:Fixture,ex:SqlExecutor)=>readPeriodCloseHistory(f.manager,period,ex)},
 {name:'close projection',match:'SELECT id::text,payload,manifest_hash',run:(f:Fixture,ex:SqlExecutor)=>readPeriodClose(f.manager,period,ex)},
 {name:'cached export verification',match:'SELECT command_hash AS hash,payload',run:(f:Fixture,ex:SqlExecutor)=>createPayrollExport(f.manager,f.exportInput,ex)},
 {name:'artifact audit',match:'INSERT INTO payroll_period_events',run:(f:Fixture,ex:SqlExecutor)=>readPeriodArtifact(f.manager,f.manifest.id,'csv',0,ex)},
];
it.each(reads)('$name suppresses fetched private payloads when Company is lost before return',async test=>{
 const f=await setup();try{let reached=false;const base=f.db.executor,ex={...base,transaction:async(statements:readonly SqlStatement[],signal?:AbortSignal)=>{const rows=await base.transaction(statements,signal);if(!reached&&statements.some(s=>s.text.includes(test.match))){reached=true;await choose(f,'LOCATIONS');}return rows;}};await denied(()=>test.run(f,ex));expect(reached).toBe(true);}finally{await close(f);}
});
it.each(['revoked','role cycle','unassigned'] as const)('all export/period services deny current %s authority without private data or audit writes',async kind=>{
 const f=await setup();try{
  if(kind==='revoked')await choose(f,'REVOKE');else if(kind==='role cycle')await f.q("UPDATE employees SET role='EMPLOYEE' WHERE id='manager';UPDATE employees SET role='MANAGER' WHERE id='manager'");
  else{await f.q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('period-new','New','Manager','NONE','MANAGER','loc-1');INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('c',64),'period-new',clock_timestamp()+interval '1 hour')");f.manager={...f.manager,employee:{...f.manager.employee,id:'period-new'},sessionTokenHash:'c'.repeat(64)};ctx.proof=f.manager;}
  const before=await snapshot(f);for(const test of [...cases,...replays])await denied(()=>test.run(f,f.db.executor));expect(await snapshot(f)).toEqual(before);
 }finally{await close(f);}
});
const request=(path:string,header:string,body:unknown)=>new Request('http://127.0.0.1'+path,{method:'POST',headers:{[header]:'1','x-nevora-actor':'manager','content-type':'application/json',origin:'http://127.0.0.1'},body:JSON.stringify(body)});
it('actual legacy export/period APIs deny restricted reads, writes, CSV and stored artifacts',async()=>{
 const f=await setup();try{rs.stubEnv('FUEL_PORTAL_ORIGIN','http://127.0.0.1');
  const calls=[()=>profilesGET(new Request('http://127.0.0.1/api/payroll-export/profiles',{headers:{'x-nevora-payroll-export':'1'}})),()=>profilesPOST(request('/api/payroll-export/profiles','x-nevora-payroll-export',f.profileInput)),()=>exportPOST(request('/api/payroll-export','x-nevora-payroll-export',f.exportInput)),()=>periodPOST(request('/api/period-close','x-nevora-period-close',{action:'READ',command:period})),()=>artifactGET(new Request('http://127.0.0.1/api/period-close/artifact?id='+f.manifest.id+'&format=csv')),()=>periodPOST(request('/api/period-close','x-nevora-period-close',{action:'POPULATION',command:f.populationInput})),()=>periodPOST(request('/api/period-close','x-nevora-period-close',{action:'MANIFEST',command:f.manifestInput})),()=>periodPOST(request('/api/period-close','x-nevora-period-close',{action:'HANDOFF',command:f.handoffInput}))];
  for(const call of calls)expect((await call()).status).toBe(200);
  await choose(f,'LOCATIONS');const before=await snapshot(f);
  for(const [index,call] of calls.entries()){const response=await call();expect(response.status).toBe(index===4?403:503);expect(await response.text()).not.toMatch(/Private B|period-private-b|28800000000000|OWNED-B-001/);}
  expect(await snapshot(f)).toEqual(before);
 }finally{await close(f);}
});

const writes=[
 {...cases[1],match:'SELECT nevora_payroll_profile_command'},
 {...cases[2],match:'SELECT nevora_payroll_export_command'},
 {...cases[4],match:'INSERT INTO payroll_period_populations'},
 {...cases[5],match:'INSERT INTO payroll_period_manifests'},
 {...cases[6],match:'INSERT INTO payroll_period_events'},
 {...cases[7],match:'INSERT INTO payroll_period_events'},
];
it.each(writes)('$name loses Company after admission and all actual business rows/audit/receipts roll back',async test=>{
 const f=await setup();try{
  if(test.name==='manifest prepare'){const population=await savePeriodPopulation(f.manager,{...f.populationInput,operationId:randomUUID(),expectedRevision:1},f.db.executor);f.manifestInput={...f.manifestInput,populationRevision:population.revision};}
  const before=await snapshot(f),base=f.db.executor;let reached=false;
  const ex={...base,transaction:async(statements:readonly SqlStatement[],signal?:AbortSignal)=>{if(!reached&&statements.some(s=>s.text.includes(test.match))){reached=true;await choose(f,'LOCATIONS');}return base.transaction(statements,signal);}};
  await denied(()=>test.run(f,ex));expect(reached).toBe(true);expect(await snapshot(f)).toEqual(before);
 }finally{await close(f);}
});
it('P4 leaving someone with recorded hours out of pay needs an Owner and a real reason',async()=>{
 const f=await setup();try{
  const input=(reason:string)=>({...f.populationInput,operationId:randomUUID(),expectedRevision:1,
   members:f.populationInput.members.map(m=>m.employeeId==='period-private-b'?{...m,disposition:'EXCLUDE' as const,reason}:m)});
  await expect(savePeriodPopulation(f.manager,input('Left the company on 9/26; paid by final check'),f.db.executor)).rejects.toThrow('EXCLUDE_WITH_RECORDED_TIME_REQUIRES_OWNER');
  await expect(savePeriodPopulation(f.owner,input('x'),f.db.executor)).rejects.toThrow('EXCLUDE_WITH_RECORDED_TIME_REQUIRES_OWNER');
  expect((await savePeriodPopulation(f.owner,input('Left the company on 9/26; paid by final check'),f.db.executor)).revision).toBe(2);
 }finally{await close(f);}
});

it.each([
 {name:'wrong worksite',reason:'Fictional external correction EX-1 confirms the worker was at Main.'},
 {name:'duplicate entry',reason:'Fictional external correction EX-2 counts the duplicated interval once.'},
 {name:'missing break',reason:'Fictional external correction EX-3 records the actual reviewed meal.'},
])('BL-21 preserves the audit trail for $name referred to payroll',async({name,reason})=>{
 const f=await setup();
 try{
  const ex=f.db.executor;
  if(name==='duplicate entry'){
   const duplicate=()=>f.q(`INSERT INTO time_entries
    (id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status)
    SELECT 'period-duplicate-b',employee_id,location_id,device_id,clock_in_at,clock_out_at,status
    FROM time_entries WHERE id='period-entry-b'`);
   await expect(duplicate()).rejects.toThrow('nevora_timecard_FINALIZED_PERIOD');
   const card=f.exportInput.cards[0];
   expect((await mutateTimecard(f.owner,{...period,operationId:randomUUID(),employeeId:card.employeeId,
    expectedRevision:card.revision,expectedSourceHash:card.sourceHash,action:'REOPEN',
    note:'Fictional review of a duplicate legacy interval.'},ex)).status).toBe('reopened');
   await duplicate();
  }
  const recorded=()=>f.q("SELECT to_jsonb(t) AS facts FROM time_entries t WHERE employee_id='period-private-b' ORDER BY id");
  const before=await readPeriodClose(f.owner,period,ex),original=await recorded();
  const request=(disposition:'ZERO_TIME'|'EXCLUDE')=>({
   ...f.populationInput,sourceHash:before.sourceHash,expectedRevision:1,operationId:randomUUID(),
   members:f.populationInput.members.map(member=>member.employeeId==='period-private-b'
    ?{...member,disposition,reason}:member),
  });
  await expect(savePeriodPopulation(f.owner,request('ZERO_TIME'),ex)).rejects.toThrow('ZERO_TIME_REQUIRES_COMPLETE_EMPTY_EVIDENCE');
  const exclusion=request('EXCLUDE');
  await expect(savePeriodPopulation(f.manager,exclusion,ex)).rejects.toThrow('EXCLUDE_WITH_RECORDED_TIME_REQUIRES_OWNER');
  const saved=await savePeriodPopulation(f.owner,exclusion,ex);
  expect(saved.members).toContainEqual(expect.objectContaining({employeeId:'period-private-b',disposition:'EXCLUDE',reason}));
  expect(await savePeriodPopulation(f.owner,exclusion,ex)).toEqual(saved);
  expect(await recorded()).toEqual(original);
  await expect(recordPeriodHandoff(f.owner,{...f.handoffInput,operationId:randomUUID()},ex))
   .rejects.toThrow('HANDOFF_SOURCE_CONFLICT');
 }finally{await close(f);}
});

it.each([1000,1001,4000])('period summary remains usable with %s immutable events',async size=>{
 const f=await setup();try{
  await f.q(`INSERT INTO payroll_period_events(workspace_id,manifest_id,id,actor_employee_id,kind,command_hash,payload,created_at)
   SELECT $1,$2::uuid,gen_random_uuid(),'manager','ARTIFACT_SERVED','owned-fixture',jsonb_build_object('sha256',$3::text),timestamptz '2026-09-28 00:00:00+00' FROM generate_series(1,$4::integer)`,[(await f.q<{id:string}>('SELECT id FROM workspaces'))[0].id,f.manifest.id,f.exported.csvSha256,size-1]);
  const view=await readPeriodClose(f.manager,period,f.db.executor);
  const summary=view.manifests.find(m=>m.id===f.manifest.id)!;
  expect(summary.hash).toBeDefined();expect(summary.events.length).toBeLessThanOrEqual(3);
  expect(summary.eventCoverage).toMatchObject({kind:'LATEST_PER_KIND',totalEvents:size,complete:false});
  const expected=await f.q<{id:string}>("SELECT id::text FROM payroll_period_events ORDER BY created_at DESC,id DESC");
  const ids:string[]=[];let cursor:string|null=null,first=true;
  do{const page=await readPeriodCloseHistory(f.manager,{...period,limit:100,cursor},f.db.executor);
   expect(page.events.length).toBeLessThanOrEqual(100);expect(page.coverage.totalEvents).toBe(size);
   ids.push(...page.events.map(e=>e.id));cursor=page.nextCursor;
   if(first){first=false;await readPeriodArtifact(f.manager,f.manifest.id,'csv',0,f.db.executor);}
  }while(cursor);
  expect(ids).toEqual(expected.map(e=>e.id));expect(new Set(ids).size).toBe(size);
  const firstPage=await readPeriodCloseHistory(f.manager,{...period,limit:1},f.db.executor);
  await expect(readPeriodCloseHistory(f.manager,{startDate:'2026-10-05',endDate:'2026-10-11',cursor:firstPage.nextCursor},f.db.executor)).rejects.toThrow('INVALID_HISTORY_CURSOR');
  for(const limit of [0,101,1.5])await expect(readPeriodCloseHistory(f.manager,{...period,limit},f.db.executor)).rejects.toThrow('INVALID_HISTORY_LIMIT');
  await choose(f,'LOCATIONS');await denied(()=>readPeriodCloseHistory(f.manager,{...period,cursor:firstPage.nextCursor},f.db.executor));
  await choose(f,'COMPANY');
  expect(view.members.some(m=>m.employeeId==='period-private-b')).toBe(true);
  const artifact=await readPeriodArtifact(f.manager,f.manifest.id,'csv',0,f.db.executor);
  expect(artifact.content).toBe(f.exported.csv);expect(artifact.sha256).toBe(f.exported.csvSha256);
 }finally{await close(f);}
});

it('history rejects invalid and cross-period cursors and exposes no foreign workspace events',async()=>{
 const f=await setup();try{
  await readPeriodArtifact(f.manager,f.manifest.id,'csv',0,f.db.executor);
  const first=await readPeriodCloseHistory(f.manager,{...period,limit:1},f.db.executor);expect(first.nextCursor).not.toBeNull();
  const cursor=JSON.parse(Buffer.from(first.nextCursor!,'base64url').toString());
  for(const command of [{...period,limit:0},{...period,limit:101},{...period,limit:1.5},{...period,cursor:'malformed'}, {...period,cursor:Buffer.from(JSON.stringify({...cursor,workspaceId:'foreign'})).toString('base64url')}, {startDate:'2026-09-28',endDate:'2026-10-04',cursor:first.nextCursor}])
   await expect(readPeriodCloseHistory(f.manager,command,f.db.executor)).rejects.toThrow(/INVALID/);
  const response=await periodPOST(new Request('https://example.test/api/period-close',{method:'POST',headers:{origin:'https://example.test','content-type':'application/json','x-nevora-period-close':'1','x-nevora-actor':'manager'},body:JSON.stringify({action:'HISTORY',command:{...period,limit:1}})}));
  expect(response.status).toBe(200);const body=await response.json();expect(body.result.events).toHaveLength(1);expect(body.result.coverage.hasMore).toBe(true);
 }finally{await close(f);}
});
