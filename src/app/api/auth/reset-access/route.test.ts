import {afterEach,beforeEach,expect,it,rs} from '@rstest/core';
import {randomBytes} from 'node:crypto';
import {readSupportReference} from '@/lib/support-reference';
// The real reset service runs; only its database is replaced. Fictional values only.
const m=rs.hoisted(()=>({transaction:rs.fn(),query:rs.fn(),binding:rs.fn()}));
rs.mock('server-only',()=>({}));
rs.mock('@/lib/data/notification-transactions',()=>({neonNotificationExecutor:()=>({transaction:m.transaction,query:m.query})}));
rs.mock('@/lib/auth/recovery-delivery.server',()=>({recoveryDelivery:()=>null}));
rs.mock('@/lib/workspace-routing/context.server',()=>({currentWorkspaceBinding:m.binding}));
import {POST} from './route';
const request=(body:unknown,origin='https://owned.invalid')=>new Request(origin+'/api/auth/reset-access',{method:'POST',headers:{origin,host:new URL(origin).host,'content-type':'application/json','x-nevora-recovery':'1'},body:JSON.stringify(body)});
const proof=()=>randomBytes(32).toString('base64url');
let sink:ReturnType<typeof rs.spyOn>;
beforeEach(()=>{rs.resetAllMocks();sink=rs.spyOn(console,'error').mockImplementation(()=>undefined);});
afterEach(()=>{sink.mockRestore();rs.unstubAllEnvs();});

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

function isolatedUnavailableRegistry(){
 rs.stubEnv('NEVORA_WORKSPACE_MODE','isolated');rs.stubEnv('NEVORA_ONBOARDING_ENVIRONMENT','test');
 rs.stubEnv('NEVORA_PORTAL_BASE_DOMAIN','portal.example.invalid');rs.stubEnv('NEVORA_CONTROL_DATABASE_URL','postgresql://fictional@127.0.0.1/fictional_control');
 rs.stubEnv('NEVORA_ONBOARDING_TOKEN_ENCRYPTION_KEY',Buffer.alloc(32,9).toString('base64url'));
 rs.stubEnv('NEVORA_WORKSPACE_TOKEN_SECRET',Buffer.alloc(32,8).toString('base64url'));
 m.binding.mockRejectedValue(Error('Fictional unavailable registry'));
}
const envelope='nw1_v1.'+'A'.repeat(16)+'.'+'B'.repeat(100)+'.'+'A'.repeat(22);
it.each([
 ['short','too_short'],['🔒'.repeat(14),'too_short'],['x'.repeat(1025),'too_long'],['🔒'.repeat(1025),'too_long'],
])('isolated reset refuses independent password length without resolving registry: %s',async(password,passwordReason)=>{
 isolatedUnavailableRegistry();
 const response=await POST(request({proof:envelope,password},'https://owned.portal.example.invalid'));
 expect(response.status).toBe(400);expect(await response.json()).toEqual({state:'invalid',passwordReason});
 expect(m.binding).not.toHaveBeenCalled();expect(m.transaction).not.toHaveBeenCalled();expect(m.query).not.toHaveBeenCalled();
 expect(readSupportReference(response)).toBeNull();expect(sink).not.toHaveBeenCalled();
});
it('isolated reset rejects malformed envelope syntax before registry without advertising a length reason',async()=>{
 isolatedUnavailableRegistry();const response=await POST(request({proof:envelope+'?private=1',password:'short'},'https://owned.portal.example.invalid'));
 expect(response.status).toBe(400);expect(await response.json()).toEqual({state:'invalid'});expect(m.binding).not.toHaveBeenCalled();expect(sink).not.toHaveBeenCalled();
});
it.each(['🔒'.repeat(15),'🔒'.repeat(1024)])('isolated reset still resolves authority for an admitted Unicode length',async password=>{
 isolatedUnavailableRegistry();const response=await POST(request({proof:envelope,password},'https://owned.portal.example.invalid'));
 expect(response.status).toBe(503);expect(await response.json()).toEqual({state:'unavailable'});expect(m.binding).toHaveBeenCalledTimes(1);
 expect(readSupportReference(response)).not.toBeNull();
});

it.each([
 ['empty',new Uint8Array()],['malformed JSON',new TextEncoder().encode('{')],['invalid UTF-8',new Uint8Array([0xff])],
 ['stream limit without declared length',new TextEncoder().encode(' '.repeat(8193))],
])('malformed reset input is an ordinary refusal: %s',async(_kind,bytes)=>{
 const body=new ReadableStream<Uint8Array>({start(controller){controller.enqueue(bytes);controller.close();}});
 const req=new Request('https://owned.invalid/api/auth/reset-access',{method:'POST',headers:{origin:'https://owned.invalid','content-type':'application/json','x-nevora-recovery':'1'},body,duplex:'half'} as RequestInit&{duplex:'half'});
 const response=await POST(req);expect(response.status).toBe(400);expect(await response.json()).toEqual({state:'invalid'});
 expect(readSupportReference(response)).toBeNull();expect(sink).not.toHaveBeenCalled();expect(m.binding).not.toHaveBeenCalled();expect(m.transaction).not.toHaveBeenCalled();
});
