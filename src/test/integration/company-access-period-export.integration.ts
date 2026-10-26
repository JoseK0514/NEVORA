import {expect,it,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import type {SqlExecutor,SqlStatement} from '../../lib/notifications/types';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import {companyAccessFixture} from './company-access-fixture';
import {assignOperationalScope,readOwnerOperationalScope,isOperationalAuthorizationError} from '../../lib/company-access/operational-scope.server';
import {isManagementAuthorizationError} from '../../lib/data/management-session';
import {readTimecards,mutateTimecard} from '../../lib/timecards/service';
import {createPayrollExport,readExportProfiles,saveExportProfile} from '../../lib/payroll-export/service';
import {neutralProfile} from '../../lib/payroll-export/model';
import {readPeriodClose,savePeriodPopulation,preparePeriodManifest,readPeriodArtifact,recordPeriodHandoff} from '../../lib/period-close/service';
const ctx=vi.hoisted(()=>({ex:null as SqlExecutor|null,proof:null as SessionMutationProof|null}));
vi.mock('server-only',()=>({}));
vi.mock('@/lib/auth/session',()=>({getSession:async()=>ctx.proof?.employee??null,requireSessionMutationProof:async()=>ctx.proof}));
vi.mock('@/lib/db',()=>{
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
async function setup(){const f=await companyAccessFixture();ctx.ex=f.db.executor;ctx.proof=f.manager;try{
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
 const manifest=await preparePeriodManifest(f.manager,manifestInput,f.db.executor);expect(manifest.totals.recordedNanoseconds).toBe('28800000000000');
 const handoffInput={operationId:randomUUID(),manifestId:manifest.id,destination:'Owned destination',reference:'Owned reference',kind:'REPORTED_IMPORTED'};
 const handoff=await recordPeriodHandoff(f.manager,handoffInput,f.db.executor);expect(handoff).toMatchObject({providerVerified:false});
 return {...f,profileInput,profile,exportInput,exported,populationInput,population,manifestInput,manifest,handoffInput};
 }catch(error){await f.db.dispose();throw error;}}
async function close(f:Fixture){ctx.ex=null;ctx.proof=null;vi.unstubAllEnvs();await f.db.dispose();}
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
const reads=[
 {name:'mapping projection',match:'SELECT profile_id AS id',run:(f:Fixture,ex:SqlExecutor)=>readExportProfiles(f.manager,ex)},
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
 const f=await setup();try{vi.stubEnv('FUEL_PORTAL_ORIGIN','http://127.0.0.1');
  const calls=[()=>profilesGET(new Request('http://127.0.0.1/api/payroll-export/profiles',{headers:{'x-nevora-payroll-export':'1'}})),()=>profilesPOST(request('/api/payroll-export/profiles','x-nevora-payroll-export',f.profileInput)),()=>exportPOST(request('/api/payroll-export','x-nevora-payroll-export',f.exportInput)),()=>periodPOST(request('/api/period-close','x-nevora-period-close',{action:'READ',command:period})),()=>artifactGET(new Request('http://127.0.0.1/api/period-close/artifact?id='+f.manifest.id+'&format=csv')),()=>periodPOST(request('/api/period-close','x-nevora-period-close',{action:'POPULATION',command:f.populationInput})),()=>periodPOST(request('/api/period-close','x-nevora-period-close',{action:'MANIFEST',command:f.manifestInput})),()=>periodPOST(request('/api/period-close','x-nevora-period-close',{action:'HANDOFF',command:f.handoffInput}))];
  for(const call of calls)expect((await call()).status).toBe(200);
  await choose(f,'LOCATIONS');const before=await snapshot(f);
  // Inspection B13/B15 (Oct 25): a refused READ (export profiles, period close READ, CSV artifact) and a write refused
  // by its admission check answer 403 access_denied; a write refused inside its transaction keeps 503 "outcome
  // unconfirmed" (a post-commit fence can refuse too). Nothing leaks and nothing is written.
  const statuses:number[]=[];
  for(const call of calls){const response=await call();statuses.push(response.status);expect(await response.text()).not.toMatch(/Private B|period-private-b|28800000000000|OWNED-B-001/);}
  expect(statuses).toEqual([403,503,503,403,403,503,503,503]);
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
