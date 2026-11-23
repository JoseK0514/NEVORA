import {beforeEach,expect,it,rs} from '@rstest/core';
import type {SessionEmployee} from '@/lib/auth/session';
import {OperationalAuthorizationError} from '@/lib/company-access/operational-scope.server';

// QA A3-03 (Nov 21, 2026): the receipts route admits exactly as /api/payroll-export does and never reads another
// person's file; the service's database behavior is covered by clocker-payroll-export.integration.ts.
const f=rs.hoisted(()=>({session:null as SessionEmployee|null,read:rs.fn(),list:rs.fn()}));
rs.mock('@/lib/auth/session',()=>({getSession:async()=>f.session,requireSessionMutationProof:async()=>({employee:f.session,sessionTokenHash:'a'.repeat(64)})}));
rs.mock('@/lib/payroll-export/service',()=>({readOwnPayrollExportReceipt:f.read,listOwnPayrollExportReceipts:f.list}));
import {GET,POST} from './route';

const operationId='22222222-2222-4222-8222-222222222222';
const headers=(extra:Record<string,string>={})=>({origin:'https://example.test','content-type':'application/json','x-nevora-payroll-export':'1','x-nevora-actor':'M',...extra});
const post=(body:unknown,extra?:Record<string,string>)=>new Request('https://example.test/api/payroll-export/receipts',{method:'POST',headers:headers(extra),body:JSON.stringify(body)});
const get=(extra?:Record<string,string>)=>new Request('https://example.test/api/payroll-export/receipts',{headers:headers(extra)});
beforeEach(()=>{
 f.session={id:'M',role:'MANAGER',firstName:'Fictional',lastName:'Manager',primaryLocationId:'L'};
 f.read.mockReset().mockResolvedValue({operationId,csv:'a,b\n',csvSha256:'x'});
 f.list.mockReset().mockResolvedValue([]);
});

it('returns the stored file for the signed-in person',async()=>{
 const response=await POST(post({operationId}));
 expect(response.status).toBe(200);
 expect(await response.json()).toEqual({state:'ready',export:{operationId,csv:'a,b\n',csvSha256:'x'}});
 expect(f.read).toHaveBeenCalledWith(expect.objectContaining({employee:expect.objectContaining({id:'M'})}),operationId);
});

it('refuses without a session, for another actor and for an Employee, before reading anything',async()=>{
 f.session=null;expect((await POST(post({operationId}))).status).toBe(401);expect((await GET(get())).status).toBe(401);
 f.session={id:'M',role:'MANAGER',firstName:'F',lastName:'M',primaryLocationId:'L'};
 expect((await POST(post({operationId},{'x-nevora-actor':'someone-else'}))).status).toBe(403);
 f.session={id:'M',role:'EMPLOYEE',firstName:'F',lastName:'E',primaryLocationId:'L'};
 expect((await POST(post({operationId}))).status).toBe(403);expect((await GET(get())).status).toBe(403);
 expect(f.read).not.toHaveBeenCalled();expect(f.list).not.toHaveBeenCalled();
});

it('a missing receipt is 404, a malformed one 400, and lost company access 403 (not "unavailable")',async()=>{
 f.read.mockResolvedValueOnce(null);
 expect((await POST(post({operationId}))).status).toBe(404);
 expect((await POST(post({}))).status).toBe(400);
 f.read.mockRejectedValueOnce(new Error('nevora_export_INVALID_RECEIPT'));
 expect((await POST(post({operationId:'not-a-receipt'}))).status).toBe(400);
 f.read.mockRejectedValueOnce(new OperationalAuthorizationError());
 expect((await POST(post({operationId}))).status).toBe(403);
 f.list.mockRejectedValueOnce(new OperationalAuthorizationError());
 expect((await GET(get())).status).toBe(403);
 f.read.mockRejectedValueOnce(new Error('database down'));
 expect((await POST(post({operationId}))).status).toBe(503);
});

it('lists the person\'s recent exports',async()=>{
 f.list.mockResolvedValueOnce([{operationId,createdAt:'2026-11-21T12:00:00.000Z',period:{startDate:'2026-11-09',endDate:'2026-11-15'},people:4,csvSha256:'x'}]);
 const response=await GET(get());
 expect(response.status).toBe(200);
 expect(await response.json()).toMatchObject({state:'ready',receipts:[{operationId,people:4}]});
});
