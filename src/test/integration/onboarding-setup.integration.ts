import {it,expect} from 'vitest';
import {randomUUID,createHash} from 'node:crypto';
import {onboardingJourneyFixture} from './onboarding-journey-fixture';
import {activateInitialOwner} from '@/lib/onboarding/owner-activation.server';
import {resolveWorkspaceBinding} from '@/lib/workspace-routing/resolver.server';
import {readOnboardingSetup,saveOnboardingStep} from '@/lib/onboarding/setup.server';
import type {SessionMutationProof} from '@/lib/shift-changes/types';
async function ready(){const f=await onboardingJourneyFixture();try{const c=await f.createCompany(),{proof}=await c.grant();await activateInitialOwner(c.binding,{schemaVersion:1,operationId:randomUUID(),proof,password:'Fictional owner password 123!'});await c.work();const binding=await resolveWorkspaceBinding({origin:c.origin},f.store,f.routing),token=createHash('sha256').update(randomUUID()).digest('hex'),home=(await c.resource.db.pool.query('SELECT primary_location_id FROM employees')).rows[0].primary_location_id;await c.resource.db.pool.query("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,'OWNER-1',clock_timestamp()+interval '1 hour')",[token]);const actor:SessionMutationProof={sessionTokenHash:token,employee:{id:'OWNER-1',firstName:'Fictional',lastName:'Owner',role:'OWNER',primaryLocationId:home}};return {...f,c,binding,actor};}catch(error){await f.close();throw error;}}
const command=(version:string,payload:unknown)=>({schemaVersion:1,operationId:randomUUID(),expectedVersion:version,payload});
it('regresses readiness when canonical eligibility or staffing is removed without inventing additional employees',async()=>{
 const f=await ready();try{
  let state=await readOnboardingSetup(f.actor,f.binding);const locationId=state.configuration.locations[0].id;
  await saveOnboardingStep(f.actor,f.binding,'SCHEDULING',command(state.snapshot.version,{action:'STAFFING',staffingSettings:[{locationId,minimumStaffPerShift:1,requiresDesignatedLead:false}],hourTargets:[]}));
  state=await readOnboardingSetup(f.actor,f.binding);
  await saveOnboardingStep(f.actor,f.binding,'SCHEDULING',command(state.snapshot.version,{action:'COVERAGE_CREATE',locationId,dayOfWeek:1,startTime:'09:00',endTime:'17:00',positionRequirements:[]}));
  state=await readOnboardingSetup(f.actor,f.binding);expect(state.snapshot.registrationState).toBe('READY');
  await f.c.resource.db.pool.query("DELETE FROM employee_location_eligibility WHERE employee_id='OWNER-1'");
  state=await readOnboardingSetup(f.actor,f.binding);expect(state.snapshot.registrationState).toBe('SETUP_IN_PROGRESS');
  expect(state.snapshot.sections.find(s=>s.id==='SCHEDULING')).toMatchObject({state:'IN_PROGRESS',reasonCodes:['NO_ELIGIBLE_EMPLOYEES'],allowedActions:['OPEN','SAVE']});
  await f.c.resource.db.pool.query("INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES('OWNER-1',$1)",[locationId]);
  expect((await readOnboardingSetup(f.actor,f.binding)).snapshot.registrationState).toBe('READY');
  await f.c.resource.db.pool.query('DELETE FROM location_staffing_settings');
  state=await readOnboardingSetup(f.actor,f.binding);expect(state.snapshot.registrationState).toBe('SETUP_IN_PROGRESS');
  expect(state.snapshot.sections.find(s=>s.id==='SCHEDULING')?.reasonCodes).toContain('STAFFING_NOT_CONFIGURED');
  expect(state.configuration.people.map(p=>p.id)).toEqual(['OWNER-1']);
 }finally{await f.close();}
});
it('resumes canonical business fields after refresh and atomically saves the existing workspace profile plus one receipt',async()=>{
 const f=await ready();try{const before=await readOnboardingSetup(f.actor,f.binding);expect(before.configuration.workspace.name).toBe('Fictional fictional-north');expect(before.snapshot.sections.find(s=>s.id==='PAYROLL')?.state).toBe('OPTIONAL');const cmd=command(before.snapshot.version,{name:'Fictional renamed studio',timeZone:'America/Chicago'}),saved=await saveOnboardingStep(f.actor,f.binding,'BUSINESS',cmd);expect(saved.state).toBe('saved');const resumed=await readOnboardingSetup(f.actor,f.binding);expect(resumed.configuration.workspace.name).toBe('Fictional renamed studio');expect(BigInt(resumed.snapshot.version)).toBe(BigInt(before.snapshot.version)+BigInt(1));expect((await saveOnboardingStep(f.actor,f.binding,'BUSINESS',cmd)).state).toBe('saved');expect((await f.c.resource.db.pool.query('SELECT count(*)::int n FROM onboarding_commands')).rows[0].n).toBe(1);
 }finally{await f.close();}
});
it('serializes two tabs at one expected version and rejects changed replay without a second canonical write',async()=>{
 const f=await ready();try{const before=await readOnboardingSetup(f.actor,f.binding),a=command(before.snapshot.version,{action:'CREATE',name:'Fictional Cutter'}),b=command(before.snapshot.version,{action:'CREATE',name:'Fictional Stylist'});const result=await Promise.all([saveOnboardingStep(f.actor,f.binding,'POSITIONS',a),saveOnboardingStep(f.actor,f.binding,'POSITIONS',b)]);expect(result.map(r=>r.state).sort()).toEqual(['conflict','saved']);const won=result[0].state==='saved'?a:b;expect((await saveOnboardingStep(f.actor,f.binding,'POSITIONS',{...won,payload:{action:'CREATE',name:'Changed'}})).state).toBe('conflict');expect((await f.c.resource.db.pool.query('SELECT count(*)::int n FROM positions')).rows[0].n).toBe(1);
 }finally{await f.close();}
});
it('denies non-Owner and revoked sessions before revealing configuration or saving',async()=>{
 const f=await ready();try{await f.c.resource.db.pool.query("UPDATE employees SET role='MANAGER' WHERE id='OWNER-1'");await expect(readOnboardingSetup(f.actor,f.binding)).rejects.toThrow();expect((await saveOnboardingStep(f.actor,f.binding,'BUSINESS',command('1',{name:'Forbidden',timeZone:'America/Chicago'}))).state).toBe('unavailable');await f.c.resource.db.pool.query("UPDATE employees SET role='OWNER' WHERE id='OWNER-1'");await f.c.resource.db.pool.query('DELETE FROM employee_sessions');await expect(readOnboardingSetup(f.actor,f.binding)).rejects.toThrow();
 }finally{await f.close();}
});
it('rejects invalid timezone and foreign location without advancing progress or saving settings',async()=>{
 const f=await ready();try{expect((await saveOnboardingStep(f.actor,f.binding,'BUSINESS',command('1',{name:'Fictional',timeZone:'UTC'}))).state).toBe('invalid');const result=await saveOnboardingStep(f.actor,f.binding,'SCHEDULING',command('1',{action:'STAFFING',staffingSettings:[{locationId:randomUUID(),minimumStaffPerShift:1,requiresDesignatedLead:false}],hourTargets:[]}));expect(result.state).toBe('invalid');expect((await readOnboardingSetup(f.actor,f.binding)).snapshot.version).toBe('1');expect((await f.c.resource.db.pool.query('SELECT count(*)::int n FROM location_staffing_settings')).rows[0].n).toBe(0);
 }finally{await f.close();}
});
it('derives readiness from actual staffing and coverage and falls back after canonical data removal',async()=>{
 const f=await ready();try{let state=await readOnboardingSetup(f.actor,f.binding);const locationId=state.configuration.locations[0].id;expect(state.snapshot.sections.find(s=>s.id==='SCHEDULING')?.reasonCodes).toContain('STAFFING_NOT_CONFIGURED');expect((await saveOnboardingStep(f.actor,f.binding,'SCHEDULING',command(state.snapshot.version,{action:'STAFFING',staffingSettings:[{locationId,minimumStaffPerShift:1,requiresDesignatedLead:false}],hourTargets:[]}))).state).toBe('saved');state=await readOnboardingSetup(f.actor,f.binding);expect((await saveOnboardingStep(f.actor,f.binding,'SCHEDULING',command(state.snapshot.version,{action:'COVERAGE_CREATE',locationId,dayOfWeek:1,startTime:'09:00',endTime:'17:00',minimumStaff:1,positionRequirements:[]}))).state).toBe('saved');state=await readOnboardingSetup(f.actor,f.binding);expect(state.snapshot.registrationState).toBe('READY');await f.c.resource.db.pool.query('DELETE FROM location_coverage_windows');state=await readOnboardingSetup(f.actor,f.binding);expect(state.snapshot.registrationState).toBe('SETUP_IN_PROGRESS');expect(state.snapshot.sections.find(s=>s.id==='SCHEDULING')?.reasonCodes).toContain('COVERAGE_NOT_CONFIGURED');
 }finally{await f.close();}
});
it('writes canonical locations and hour targets once, and optional skips never enable payroll',async()=>{
 const {vi}=await import('vitest');const f=await ready();try{let state=await readOnboardingSetup(f.actor,f.binding);expect((await saveOnboardingStep(f.actor,f.binding,'LOCATIONS',command(state.snapshot.version,{action:'CREATE',name:'Fictional second studio',shortName:'Second',clockerKey:'second'}))).state).toBe('saved');state=await readOnboardingSetup(f.actor,f.binding);expect(state.configuration.locations).toHaveLength(2);const location=state.configuration.locations.find(l=>l.clockerKey==='second')!;expect((await saveOnboardingStep(f.actor,f.binding,'LOCATIONS',command(state.snapshot.version,{action:'UPDATE',id:location.id,name:'Fictional revised studio',shortName:'Revised',active:true,expectedUpdatedAt:location.updatedAt}))).state).toBe('saved');state=await readOnboardingSetup(f.actor,f.binding);expect((await saveOnboardingStep(f.actor,f.binding,'SCHEDULING',command(state.snapshot.version,{action:'STAFFING',staffingSettings:[],hourTargets:[{employeeId:'OWNER-1',targetWeeklyHours:20,maximumWeeklyHours:35}]}))).state).toBe('saved');state=await readOnboardingSetup(f.actor,f.binding);expect(state.configuration.people[0].maximumWeeklyHours).toBe(35);expect((await saveOnboardingStep(f.actor,f.binding,'PAYROLL',command(state.snapshot.version,{action:'SKIP'}))).state).toBe('saved');vi.stubEnv('NEVORA_PAYROLL_ENABLED','true');expect((await readOnboardingSetup(f.actor,f.binding)).snapshot.sections.find(s=>s.id==='PAYROLL')?.reasonCodes).toContain('PAYROLL_SETUP_REQUIRED');vi.stubEnv('NEVORA_PAYROLL_ENABLED','false');expect((await readOnboardingSetup(f.actor,f.binding)).snapshot.sections.find(s=>s.id==='PAYROLL')?.reasonCodes).toContain('PAYROLL_DISABLED');expect((await f.c.resource.db.pool.query('SELECT count(*)::int n FROM native_payroll_setup_records')).rows[0].n).toBe(0);
 }finally{vi.unstubAllEnvs();await f.close();}
});
it('rolls back the canonical write if its onboarding receipt cannot commit',async()=>{
 const {getWorkspaceDb}=await import('@/lib/workspace-routing/transport.server');const f=await ready();try{const ex=getWorkspaceDb(f.binding),failing:typeof ex={query:(...a)=>ex.query(...a),transaction:(s,signal)=>ex.transaction(s.some(q=>q.text.startsWith('INSERT INTO onboarding_commands'))?[...s,{text:'SELECT 1/0',values:[]}]:s,signal)};const result=await saveOnboardingStep(f.actor,f.binding,'POSITIONS',command('1',{action:'CREATE',name:'Must roll back'}),failing);expect(result.state).toBe('unavailable');expect((await f.c.resource.db.pool.query('SELECT count(*)::int n FROM positions')).rows[0].n).toBe(0);expect((await readOnboardingSetup(f.actor,f.binding)).snapshot.version).toBe('1');
 }finally{await f.close();}
});
it('serves current Owner state on the registered host and rejects cross-origin writes',async()=>{
 const {setupHttpHandlers}=await import('@/lib/onboarding/owner-http.server');const {vi}=await import('vitest');const f=await ready();try{vi.stubEnv('NEVORA_ONBOARDING_ENABLED','false');const handlers=setupHttpHandlers({config:f.routing,store:f.store,readProof:async()=>f.actor}),url=f.c.origin+'/api/onboarding/state';const response=await handlers.read(new Request(url));expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store, private');expect((await response.json()).configuration.workspace.name).toBe('Fictional fictional-north');expect((await handlers.read(new Request(url,{headers:{origin:'https://foreign.invalid'}}))).status).toBe(403);const cmd=command('1',{name:'Forbidden',timeZone:'America/Chicago'});expect((await handlers.save(new Request(f.c.origin+'/api/onboarding/steps/BUSINESS',{method:'POST',headers:{origin:'https://foreign.invalid','content-type':'application/json'},body:JSON.stringify(cmd)}),'BUSINESS')).status).toBe(403);
 }finally{vi.unstubAllEnvs();await f.close();}
});
it('keeps the canonical timezone conversion lock once operational records exist',async()=>{
 const f=await ready();try{await f.c.resource.db.pool.query("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES($1,$2,'2026-11-09','DRAFT','OWNER-1')",[randomUUID(),f.actor.employee.primaryLocationId]);expect((await saveOnboardingStep(f.actor,f.binding,'BUSINESS',command('1',{name:'Fictional studio',timeZone:'America/New_York'}))).state).toBe('invalid');expect((await readOnboardingSetup(f.actor,f.binding)).configuration.workspace.timeZone).toBe('America/Chicago');expect((await readOnboardingSetup(f.actor,f.binding)).snapshot.version).toBe('1');}finally{await f.close();}
});

it('fences stale onboarding forms after the established workspace, staffing and coverage settings writers commit',async()=>{
 const {saveWorkspaceProfile}=await import('@/lib/data/workspaces'),{saveScheduleHealthSettings,createCoverageWindow}=await import('@/lib/data/schedule-health'),{getWorkspaceDb}=await import('@/lib/workspace-routing/transport.server');const f=await ready();try{
  const ex=getWorkspaceDb(f.binding);let old=await readOnboardingSetup(f.actor,f.binding);
  await saveWorkspaceProfile({proof:f.actor,actorEmployeeId:f.actor.employee.id,name:'Newer canonical name',timeZone:'America/Chicago'},ex);
  expect((await saveOnboardingStep(f.actor,f.binding,'BUSINESS',command(old.snapshot.version,{name:'Stale onboarding name',timeZone:'America/Chicago'}))).state).toBe('conflict');expect((await readOnboardingSetup(f.actor,f.binding)).configuration.workspace.name).toBe('Newer canonical name');
  old=await readOnboardingSetup(f.actor,f.binding);const locationId=old.configuration.locations[0].id;
  await saveScheduleHealthSettings({proof:f.actor,staffingSettings:[{locationId,minimumStaffPerShift:4,requiresDesignatedLead:false}],hourTargets:[]},ex);
  expect((await saveOnboardingStep(f.actor,f.binding,'SCHEDULING',command(old.snapshot.version,{action:'STAFFING',staffingSettings:[{locationId,minimumStaffPerShift:1,requiresDesignatedLead:false}],hourTargets:[]}))).state).toBe('conflict');expect((await readOnboardingSetup(f.actor,f.binding)).configuration.staffing[0].minimumStaffPerShift).toBe(4);
  old=await readOnboardingSetup(f.actor,f.binding);const id=await createCoverageWindow({proof:f.actor,actorEmployeeId:f.actor.employee.id,locationId,dayOfWeek:1,startTime:'09:00',endTime:'17:00',minimumStaff:2,positionRequirements:[]},ex);
  expect((await saveOnboardingStep(f.actor,f.binding,'SCHEDULING',command(old.snapshot.version,{action:'COVERAGE_DELETE',windowId:id}))).state).toBe('conflict');expect((await readOnboardingSetup(f.actor,f.binding)).configuration.coverage.map(c=>c.id)).toContain(id);
 }finally{await f.close();}
});
