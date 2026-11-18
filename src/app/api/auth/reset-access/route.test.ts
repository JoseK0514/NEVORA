import {afterEach,beforeEach,expect,it,rs} from '@rstest/core';
import {randomBytes} from 'node:crypto';
import {readSupportReference} from '@/lib/support-reference';
// The real reset service runs; only its database is replaced. Fictional values only.
const m=rs.hoisted(()=>({transaction:rs.fn(),query:rs.fn()}));
rs.mock('server-only',()=>({}));
rs.mock('@/lib/data/notification-transactions',()=>({neonNotificationExecutor:()=>({transaction:m.transaction,query:m.query})}));
rs.mock('@/lib/auth/recovery-delivery.server',()=>({recoveryDelivery:()=>null}));
rs.mock('@/lib/workspace-routing/runtime-config.server',()=>({workspaceRuntimeEnvironment:async()=>({})}));
import {POST} from './route';
const request=(body:unknown)=>new Request('https://owned.invalid/api/auth/reset-access',{method:'POST',headers:{origin:'https://owned.invalid','content-type':'application/json','x-nevora-recovery':'1'},body:JSON.stringify(body)});
const proof=()=>randomBytes(32).toString('base64url');
let sink:ReturnType<typeof rs.spyOn>;
beforeEach(()=>{rs.resetAllMocks();sink=rs.spyOn(console,'error').mockImplementation(()=>undefined);});
afterEach(()=>sink.mockRestore());

it('an unexpected storage failure answers 503 with one Support reference that names the one sanitized log line',async()=>{
 m.transaction.mockRejectedValue(Object.assign(Error('fictional private password Fictional-NEW-password'),{code:'08006'}));
 const response=await POST(request({proof:proof(),password:'Fictional-NEW-password'}));
 expect(response.status).toBe(503);expect(await response.json()).toEqual({state:'unavailable'});
 const reference=readSupportReference(response);expect(reference).toMatch(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/);
 expect(sink).toHaveBeenCalledTimes(1);
 expect(JSON.parse(String(sink.mock.calls[0][0]))).toEqual({event:'server_request_error',route:'/api/auth/reset-access',requestId:reference,errorClass:'Error',sqlState:'08006'});
 expect(JSON.stringify(sink.mock.calls)).not.toMatch(/Fictional|password|private/);
});
it('refusals carry no Support reference and log nothing',async()=>{
 for(const body of [{proof:'short',password:'Fictional-NEW-password'},{proof:proof()},{proof:proof(),password:'x'}]){
  const response=await POST(request(body));expect(response.status).toBe(400);expect(readSupportReference(response)).toBeNull();
 }
 // A well-formed code that does not exist is refused by the limiter step: still no reference.
 m.transaction.mockResolvedValueOnce([[],[],[],[{allowed:false}]]);
 const response=await POST(request({proof:proof(),password:'Fictional-NEW-password'}));
 expect(response.status).toBe(400);expect(readSupportReference(response)).toBeNull();expect(sink).not.toHaveBeenCalled();
});
it('refuses a short password before storage and returns the specific enrollment reason',async()=>{
 const response=await POST(request({proof:proof(),password:'short'}));
 expect(response.status).toBe(400);
 expect(await response.json()).toEqual({state:'invalid',passwordReason:'too_short'});
 expect(readSupportReference(response)).toBeNull();
 expect(m.transaction).not.toHaveBeenCalled();expect(m.query).not.toHaveBeenCalled();expect(sink).not.toHaveBeenCalled();
});
it('ignores a caller-supplied request ID',async()=>{
 m.transaction.mockRejectedValue(Error('fictional'));
 const forged='11111111-1111-4111-8111-111111111111';
 const r=new Request('https://owned.invalid/api/auth/reset-access',{method:'POST',headers:{origin:'https://owned.invalid','content-type':'application/json','x-nevora-recovery':'1','X-Nevora-Request-Id':forged},body:JSON.stringify({proof:proof(),password:'Fictional-NEW-password'})});
 const response=await POST(r);expect(response.status).toBe(503);expect(readSupportReference(response)).not.toBe(forged);
});
