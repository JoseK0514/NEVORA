import {beforeEach,describe,expect,it,vi} from 'vitest';
import type {SqlExecutor,SqlStatement} from '@/lib/notifications/types';
import type {SessionEmployee} from '@/lib/auth/session';
const f=vi.hoisted(()=>({session:null as SessionEmployee|null,executor:null as SqlExecutor|null}));
vi.mock('@/lib/auth/session',()=>({getSession:async()=>f.session,requireSessionMutationProof:async()=>({employee:f.session,sessionTokenHash:'a'.repeat(64)})}));
vi.mock('@/lib/data/notification-transactions',async()=>{
 const actual=await vi.importActual<typeof import('@/lib/data/notification-transactions')>('@/lib/data/notification-transactions');
 return {...actual,neonNotificationExecutor:()=>f.executor};
});
import {neutralProfile} from '@/lib/payroll-export/model';
import {GET,POST} from './route';
const id='11111111-1111-4111-8111-111111111111',operationId='22222222-2222-4222-8222-222222222222';
const command={id,operationId,expectedRevision:0,profile:neutralProfile()};
let writes:SqlStatement[],queries:SqlStatement[],savedProfile:unknown,dbError:Error|null;
const request=(body:unknown=command,headers:Record<string,string>={})=>new Request('https://example.test/api/payroll-export/profiles',{
 method:'POST',headers:{origin:'https://example.test','content-type':'application/json','x-nevora-payroll-export':'1','x-nevora-actor':'M',...headers},body:JSON.stringify(body),
});
const getRequest=()=>new Request('https://example.test/api/payroll-export/profiles',{headers:{'x-nevora-payroll-export':'1','x-nevora-actor':'M'}});
beforeEach(()=>{
 f.session={id:'M',role:'MANAGER',firstName:'Fictional',lastName:'Manager',primaryLocationId:'L'};
 writes=[];queries=[];savedProfile=neutralProfile();dbError=null;
 f.executor={
  async query<T>(statement:SqlStatement){queries.push(statement);return [{id:'W',name:'Fictional Company',timeZone:'America/Puerto_Rico',active:true,createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z'}] as T[];},
  async transaction(statements){
   if(dbError)throw dbError;
   return statements.map(statement=>{
    if(statement.text.includes('SELECT nevora_payroll_profile_command')){writes.push(statement);return [{result:{id,revision:1,profile:JSON.parse(String(statement.values[6]))}}];}
    if(statement.text.includes('FROM nevora_payroll_profile_latest'))return [{id,revision:1,profile:savedProfile}];
    return [];
   });
  },
 };
});
describe('NVA-001 profile API with real parser/service and fictional SQL transport',()=>{
 it.each([
  ['format',['CUSTOM_CSV']],['format',['ADP_RUN_GENERIC_V1']],['dateFormat',['US']],
  ['precision',['REJECT_INEXACT']],['precision',['HALF_UP']],['precision',1],['precision',true],['precision',null],
 ])('rejects malformed %s=%j as invalid before database writes',async(field,value)=>{
  const r=await POST(request({...command,profile:{...neutralProfile(),[field as string]:value}}));
  expect(r.status).toBe(400);expect(await r.json()).toEqual({state:'invalid'});
  expect(queries).toEqual([]);expect(writes).toEqual([]);expect(r.headers.get('cache-control')).toContain('no-store');
 });
 it('retains scalar ADP shape rejection at the API boundary',async()=>{
  const r=await POST(request({...command,profile:{...neutralProfile(),format:'ADP_RUN_GENERIC_V1'}}));
  expect(r.status).toBe(400);expect(writes).toEqual([]);
 });
 it('saves a valid scalar profile and returns a private revision receipt',async()=>{
  const r=await POST(request());expect(r.status).toBe(200);
  expect(await r.json()).toEqual({state:'saved',profile:{id,revision:1,profile:neutralProfile()}});
  expect(writes).toHaveLength(1);expect(r.headers.get('cache-control')).toContain('no-store');expect(r.headers.get('vary')).toBe('Cookie');
 });
 it('fails closed on malformed saved revisions without replacing them',async()=>{
  savedProfile={...neutralProfile(),precision:['HALF_UP']};const before=JSON.stringify(savedProfile);
  const r=await GET(getRequest());expect(r.status).toBe(503);expect(await r.json()).toEqual({state:'unavailable'});
  expect(writes).toEqual([]);expect(JSON.stringify(savedProfile)).toBe(before);expect(r.headers.get('cache-control')).toContain('no-store');
 });
 it.each(['EMPLOYEE','LEAD'] as const)('denies %s on profile read/save before validation or database access',async role=>{
  f.session={...f.session!,role};expect((await POST(request({...command,profile:{...neutralProfile(),precision:['HALF_UP']}}))).status).toBe(403);
  expect((await GET(getRequest())).status).toBe(403);expect(queries).toEqual([]);expect(writes).toEqual([]);
 });
 it('requires a current identity, login and same-origin proof',async()=>{
  expect((await POST(request(command,{origin:'https://evil.test'}))).status).toBe(403);
  f.session={...f.session!,id:'OTHER'};expect((await POST(request())).status).toBe(403);
  f.session=null;expect((await POST(request())).status).toBe(401);expect((await GET(getRequest())).status).toBe(401);
  expect(queries).toEqual([]);expect(writes).toEqual([]);
 });
 it('keeps stale mapping conflicts distinct from invalid profiles',async()=>{
  dbError=new Error('nevora_profile_CONFLICT');const r=await POST(request());
  expect(r.status).toBe(409);expect(await r.json()).toEqual({state:'conflict'});expect(writes).toEqual([]);
 });
 it('keeps current-authority failures unavailable without exposing profile data',async()=>{
  dbError=new Error('management_authorization');const r=await POST(request());
  expect(r.status).toBe(503);expect(await r.json()).toEqual({state:'unavailable'});expect(writes).toEqual([]);
 });
});

// Business-unit admission I/O only; real current Company enforcement and API
// scope/lifecycle/receipt vectors run in company-access-period-export SQL.
vi.mock('@/lib/company-access/operational-scope.server',async original=>({...await original<Record<string,unknown>>(),assertOperationalAccess:async()=>({workspace:{id:'W',name:'Fictional Company',timeZone:'America/Puerto_Rico',active:true,createdAt:'2026-01-01T00:00:00Z',updatedAt:'2026-01-01T00:00:00Z'},authority:'a'.repeat(64),scope:{mode:'COMPANY',locationIds:[]}})}));
