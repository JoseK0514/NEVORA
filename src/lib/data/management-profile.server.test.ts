import {beforeEach,expect,it,vi} from 'vitest';
vi.mock('server-only',()=>({}));
const authority=vi.hoisted(()=>({read:vi.fn()}));
vi.mock('../company-access/operational-scope.server',()=>({readOperationalAuthority:authority.read}));
beforeEach(()=>{authority.read.mockReset();authority.read.mockImplementation(async(p:SessionMutationProof)=>({
 state:'ready',employeeId:p.employee.id,role:p.employee.role,source:'OWNER_ASSIGNMENT',scope:{mode:'COMPANY',locationIds:[]},scopeRevision:1,authority:'a'.repeat(64),
 locations:[{id:'loc-1',name:'Fictional Office',shortName:'Office'}],observedAt:new Date().toISOString(),validForMs:15000,
}));});
import {readManagementProfile,saveManagementAlertChoice} from './management-profile.server';
import {parseManagementAlertChoice} from '../management-profile';
import type {SessionMutationProof} from '../shift-changes/types';
import type {SqlExecutor,SqlStatement} from '../notifications/types';
const proof=(role:'OWNER'|'MANAGER'|'LEAD'|'EMPLOYEE'='OWNER'):SessionMutationProof=>({employee:{id:'qa-self',firstName:'QA',lastName:'Self',role,primaryLocationId:'loc-1'},sessionTokenHash:'a'.repeat(64)});
const workspace={id:'w',name:'Fictional QA',timeZone:'America/Puerto_Rico',active:true,createdAt:'2026-01-01',updatedAt:'2026-01-01'};
function database(row:object|undefined,expired=false) {
  const transaction=vi.fn(async(statements:readonly SqlStatement[])=>{
    if(expired)throw Object.assign(Error('invalid input syntax for type integer: "management_authorization"'),{code:'22P02'});
    return statements.map(s=>s.text.startsWith('WITH observed')&&row?[row]:[]);
  });
  return {query:vi.fn(async(s:SqlStatement)=>s.text.includes('pg_catalog')?[{installed:0}]:[workspace]),transaction} as unknown as SqlExecutor;
}
const ready={observedAt:'2026-10-19T14:00:00Z',validForMs:600000,email:'qa@example.invalid',phone:null,scope:'all',names:['Fictional Office'],choices:{'time-off':false}};
it('projects only current Company Access location names, ignoring the legacy global projection',async()=>{
 authority.read.mockImplementation(async()=>({state:'ready',employeeId:'qa-self',role:'MANAGER',scope:{mode:'LOCATIONS',locationIds:['loc-2']},authority:'b'.repeat(64),locations:[{id:'loc-2',name:'Granted Office'}],observedAt:new Date().toISOString(),validForMs:15000}));
 expect(await readManagementProfile(proof('MANAGER'),database(ready))).toMatchObject({state:'ready',locations:{scope:'assigned',names:['Granted Office']}});
});
it.each(['REVOKED','UNASSIGNED'])('keeps own contact and alerts without global location names when %s',async source=>{
 authority.read.mockImplementation(async()=>({state:'ready',employeeId:'qa-self',role:'MANAGER',source,scope:null,authority:'b'.repeat(64),locations:[],observedAt:new Date().toISOString(),validForMs:15000}));
 const result=await readManagementProfile(proof('MANAGER'),database(ready));
 expect(result).toMatchObject({state:'ready',contact:{email:'qa@example.invalid'},locations:{scope:'assigned',names:[]}});
 expect(result.state==='ready'&&result.alerts.find(a=>a.id==='time-off')?.on).toBe(false);
});
it.each(['role','scope','unavailable'])('suppresses the snapshot if %s changes during the read',async change=>{
 const initial=await authority.read(proof('MANAGER'));
 authority.read.mockReset();
 authority.read.mockResolvedValueOnce(initial).mockResolvedValueOnce(change==='unavailable'?{state:'unavailable',reason:'access_denied'}:{...initial,...(change==='role'?{role:'EMPLOYEE'}:{authority:'b'.repeat(64),scope:null})});
 expect(await readManagementProfile(proof('MANAGER'),database(ready))).toEqual({state:'unavailable',reason:'access_denied'});
});
it.each(['OWNER','MANAGER'] as const)('returns only the %s own contact, active location projection and saved topics',async role=>{
  const db=database(ready),result=await readManagementProfile(proof(role),db);
  expect(result).toMatchObject({state:'ready',kind:'management-profile',contact:{email:'qa@example.invalid',phone:null},locations:{scope:'all',names:['Fictional Office']}});
  if(result.state==='ready') {
    expect(result.alerts).toHaveLength(role==='OWNER'?5:4);
    expect(result.alerts.find(t=>t.id==='time-off')?.on).toBe(false);
    expect(JSON.stringify(result)).not.toContain('sessionTokenHash');
  }
  const statements=(db.transaction as ReturnType<typeof vi.fn>).mock.calls[0][0] as SqlStatement[];
  expect(statements.find(s=>s.text.startsWith('WITH observed'))?.values).toEqual(['qa-self','a'.repeat(64),role]);
});
it('accepts a verified empty location set and missing contact values',async()=>{
  authority.read.mockImplementation(async()=>({state:'ready',employeeId:'qa-self',role:'MANAGER',scope:{mode:'COMPANY',locationIds:[]},authority:'a'.repeat(64),locations:[],validForMs:15000}));
  expect(await readManagementProfile(proof('MANAGER'),database({...ready,names:[],email:null,phone:''}))).toMatchObject({state:'ready',contact:{email:null,phone:''},locations:{names:[]}});
});
it('returns access denied on a session that expires in the protected observation',async()=>{
  expect(await readManagementProfile(proof(),database(ready,true))).toEqual({state:'unavailable',reason:'access_denied'});
});
it.each(['EMPLOYEE','LEAD'] as const)('denies %s before private storage',async role=>{
  const db=database(ready);expect(await readManagementProfile(proof(role),db)).toMatchObject({state:'unavailable',reason:'access_denied'});
  expect(db.query).not.toHaveBeenCalled();
});
it('rejects oversized or partial snapshots instead of returning truncated contact/locations',async()=>{
  authority.read.mockImplementation(async()=>({state:'ready',employeeId:'qa-self',role:'OWNER',scope:{mode:'COMPANY',locationIds:[]},authority:'a'.repeat(64),locations:Array(501).fill({id:'loc-1',name:'QA'}),validForMs:15000}));
  expect(await readManagementProfile(proof(),database({...ready,names:Array(501).fill('QA')}))).toEqual({state:'unavailable',reason:'read_failed'});
});
it('validates choices and forbids another employee identifier or Manager payroll choice',()=>{
  for(const value of [{topicId:'other',on:true},{topicId:'time-off',on:'false'},{topicId:'time-off',on:false,employeeId:'someone-else'}])expect(()=>parseManagementAlertChoice(value,'OWNER')).toThrow();
  expect(()=>parseManagementAlertChoice({topicId:'payroll-ready',on:true},'MANAGER')).toThrow();
});
it('saves a topic with an upsert and live session guards before and after writes',async()=>{
  const db=database(undefined);await saveManagementAlertChoice(proof(),{topicId:'time-off',on:false},db);
  const statements=(db.transaction as ReturnType<typeof vi.fn>).mock.calls[0][0] as SqlStatement[];
  expect(statements.find(s=>s.text.startsWith('UPDATE employees SET management_alert_choices'))?.values).toEqual(['qa-self','time-off',false]);
  expect(statements.at(-1)?.text).toContain('expires_at>clock_timestamp()');
});
