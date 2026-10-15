import {it,expect,vi} from 'vitest';
import {randomUUID} from 'node:crypto';
import type {SqlExecutor} from '../../lib/notifications/types';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import {companyAccessFixture} from './company-access-fixture';
const context=vi.hoisted(()=>({executor:null as SqlExecutor|null,proof:null as SessionMutationProof|null}));
vi.mock('server-only',()=>({}));
vi.mock('../../lib/auth/session',()=>({getSession:async()=>context.proof?.employee??null,requireSessionMutationProof:async()=>{if(!context.proof)throw Error('No session');return context.proof;}}));
vi.mock('../../lib/data/sql-executor',()=>({neonNotificationExecutor:()=>{if(!context.executor)throw Error('Missing owned executor');return context.executor;}}));
import {GET as authority} from '../../app/api/company-access/operational-authority/route';
import {GET,POST} from '../../app/api/company-access/operational-scopes/[employeeId]/route';
it('Owner route assigns scope from current versions, own authority is minimal and a Manager cannot grant or inspect Owner controls',async()=>{
 const f=await companyAccessFixture(),before=process.env.FUEL_PORTAL_ORIGIN,origin='http://127.0.0.1:32123';process.env.FUEL_PORTAL_ORIGIN=origin;
 context.executor=f.db.executor;context.proof=f.owner;
 const headers={'x-nevora-company-access':'1','x-nevora-actor':'owner','content-type':'application/json',origin};
 const params={params:Promise.resolve({employeeId:'manager'})};
 try{
  const read=await GET(new Request(origin+'/api/company-access/operational-scopes/manager',{headers}),params);expect(read.status).toBe(200);
  const {data}=await read.json(),c=data.current;
  const command={action:'ASSIGN',operationId:randomUUID(),expectedEmployeeVersion:c.employeeUpdatedAt,expectedRoleGeneration:c.roleGeneration,expectedScopeRevision:c.scopeRevision,scope:{mode:'LOCATIONS',locationIds:['loc-1']}};
  const saved=await POST(new Request(origin+'/api/company-access/operational-scopes/manager',{method:'POST',headers,body:JSON.stringify(command)}),params);expect(saved.status).toBe(200);
  expect((await saved.json()).receipt.scope).toEqual({mode:'LOCATIONS',locationIds:['loc-1']});
  const extra=await POST(new Request(origin+'/api/company-access/operational-scopes/manager',{method:'POST',headers,body:JSON.stringify({...command,allowedLocationIds:['loc-2']})}),params);expect(extra.status).toBe(400);
  context.proof=f.manager;
  const own=await authority(new Request(origin+'/api/company-access/operational-authority',{headers}));expect(own.status).toBe(200);const view=await own.json();
  expect(view.employeeId).toBe('manager');expect(view.scope).toEqual({mode:'LOCATIONS',locationIds:['loc-1']});
  expect(view.locations.map((l:{id:string})=>l.id)).toEqual(['loc-1']);expect(JSON.stringify(view).includes(f.manager.sessionTokenHash)).toBe(false);
  expect((await GET(new Request(origin+'/api/company-access/operational-scopes/manager',{headers}),params)).status).toBe(403);
  expect((await POST(new Request(origin+'/api/company-access/operational-scopes/manager',{method:'POST',headers:{...headers,'x-nevora-actor':'manager'},body:JSON.stringify(command)}),params)).status).toBe(403);
  expect((await authority(new Request(origin+'/api/company-access/operational-authority?employeeId=owner',{headers}))).status).toBe(400);
 }finally{context.executor=null;context.proof=null;if(before===undefined)delete process.env.FUEL_PORTAL_ORIGIN;else process.env.FUEL_PORTAL_ORIGIN=before;await f.db.dispose();}
});
