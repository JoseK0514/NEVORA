import {it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import type {SqlExecutor} from '../../lib/notifications/types';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import {companyAccessFixture} from './company-access-fixture';
import {fakeInvitationSmtp} from './company-access-smtp.test-support';
const context=vi.hoisted(()=>({executor:null as SqlExecutor|null,proof:null as SessionMutationProof|null}));
vi.mock('server-only',()=>({}));
vi.mock('../../lib/auth/session',()=>({getSession:async()=>context.proof?.employee??null,requireSessionMutationProof:async()=>{if(!context.proof)throw Error('No test session');return context.proof;}}));
vi.mock('../../lib/data/notification-transactions',async importOriginal=>({...await importOriginal<typeof import('../../lib/data/notification-transactions')>(),neonNotificationExecutor:()=>{if(!context.executor)throw Error('Missing owned executor');return context.executor;}}));
import {POST,GET} from '../../app/api/company-access/invitations/[employeeId]/route';

it('normal Owner route uses the real configured invitation adapter into owned SMTP, returns metadata only and enforces headers/body',async()=>{
 const f=await companyAccessFixture(),smtp=await fakeInvitationSmtp();
 const previous=Object.fromEntries(Object.keys(smtp.env).map(key=>[key,process.env[key]]));
 Object.assign(process.env,smtp.env);context.executor=f.db.executor;context.proof=f.owner;
 const params={params:Promise.resolve({employeeId:'target'})};
 const headers={'x-nevora-company-access':'1','x-nevora-actor':'owner','content-type':'application/json',origin:smtp.env.FUEL_PORTAL_ORIGIN};
 try{
  const statusResponse=await GET(new Request(smtp.env.FUEL_PORTAL_ORIGIN+'/api/company-access/invitations/target',{headers}),params);
  expect(statusResponse.status).toBe(200);const status=await statusResponse.json();expect(status.eligibility).toBe('INVITABLE');
  const command={action:'ISSUE',operationId:randomUUID(),expectedEmployeeVersion:status.employeeVersion,expectedInvitationRevision:0};
  const response=await POST(new Request(smtp.env.FUEL_PORTAL_ORIGIN+'/api/company-access/invitations/target',{method:'POST',headers,body:JSON.stringify(command)}),params);
  expect(response.status).toBe(200);const payload=await response.json();expect(payload.receipt.delivery).toBe('PROVIDER_ACCEPTED');
  expect(response.headers.get('cache-control')).toBe('no-store, private');expect(response.headers.get('referrer-policy')).toBe('no-referrer');
  expect(smtp.messages.length).toBe(1);const proof=smtp.messages[0].replace(/=\r\n/g,'').replace(/=3D/g,'=').match(/#proof=([A-Za-z0-9_-]{43})/)?.[1];
  expect(typeof proof).toBe('string');expect(JSON.stringify(payload).includes(proof!)).toBe(false);
  for(const extra of [{registeredEmail:'other@example.invalid'},{workspaceId:'another'},{actorEmployeeId:'manager'}]){
   const rejected=await POST(new Request(smtp.env.FUEL_PORTAL_ORIGIN+'/api/company-access/invitations/target',{method:'POST',headers,body:JSON.stringify({...command,...extra})}),params);
   expect(rejected.status).toBe(400);
  }
  const forged=await POST(new Request(smtp.env.FUEL_PORTAL_ORIGIN+'/api/company-access/invitations/target',{method:'POST',headers:{...headers,'x-nevora-actor':'manager'},body:JSON.stringify(command)}),params);expect(forged.status).toBe(403);
  const wrongOrigin=await POST(new Request(smtp.env.FUEL_PORTAL_ORIGIN+'/api/company-access/invitations/target',{method:'POST',headers:{...headers,origin:'https://other.example.invalid'},body:JSON.stringify(command)}),params);expect(wrongOrigin.status).toBe(403);
  expect(smtp.messages.length).toBe(1);
 }finally{
  for(const[key,value]of Object.entries(previous)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
  context.executor=null;context.proof=null;await smtp.close();await f.db.dispose();
 }
});
it.each(['reject_before_data','drop_after_data'] as const)('normal route persists the actual adapter outcome for %s without claiming delivery',async mode=>{
 const f=await companyAccessFixture(),smtp=await fakeInvitationSmtp(mode);
 const previous=Object.fromEntries(Object.keys(smtp.env).map(key=>[key,process.env[key]]));
 Object.assign(process.env,smtp.env);context.executor=f.db.executor;context.proof=f.owner;
 try{
  const [target]=await f.q<{version:string}>("SELECT updated_at::text AS version FROM employees WHERE id='target'");
  const response=await POST(new Request(smtp.env.FUEL_PORTAL_ORIGIN+'/api/company-access/invitations/target',{method:'POST',
   headers:{'x-nevora-company-access':'1','x-nevora-actor':'owner','content-type':'application/json',origin:smtp.env.FUEL_PORTAL_ORIGIN},
   body:JSON.stringify({action:'ISSUE',operationId:randomUUID(),expectedEmployeeVersion:target.version,expectedInvitationRevision:0})}),{params:Promise.resolve({employeeId:'target'})});
  expect(response.status).toBe(200);const payload=await response.json();expect(payload.receipt.delivery).toBe(mode==='reject_before_data'?'FAILED':'UNKNOWN');
  expect(await f.q("SELECT count(*)::integer AS count FROM company_invitation_delivery_events WHERE state='PROVIDER_ACCEPTED'")).toEqual([{count:0}]);
 }finally{
  for(const[key,value]of Object.entries(previous)){if(value===undefined)delete process.env[key];else process.env[key]=value;}
  context.executor=null;context.proof=null;await smtp.close();await f.db.dispose();
 }
});
