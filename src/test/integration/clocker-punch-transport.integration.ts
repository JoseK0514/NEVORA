import { randomUUID } from 'node:crypto';
import { beforeEach, afterEach, expect, it } from 'vitest';
import { createPunchFixture } from './clocker-punch-fixture';
import { handleClockerPunch } from '../../lib/clocker/punch-transport.server';
import { ClockerPunchService } from '../../lib/clocker/punches.server';
import type { ClockerIdentityProof } from '../../lib/clocker/pin-identity.server';
import type { PunchAction, PunchCommand } from '../../lib/clocker/punch-types';
let f:Awaited<ReturnType<typeof createPunchFixture>>;
let proof:ClockerIdentityProof,jar:Map<string,string>,service:ClockerPunchService;
beforeEach(async()=>{
 f=await createPunchFixture({breaks:true});const identity=await f.identity();proof=identity.proof;
 jar=new Map([['nevora_clocker',f.devices[0].credential],['nevora_clocker_identity',identity.token]]);
 service=new ClockerPunchService(f.key,f.db.executor);
});
afterEach(async()=>{if(f)await f.db.dispose();});
async function command(action:PunchAction='CLOCK_IN'):Promise<PunchCommand>{
 const v=await service.read(proof),s=v.snapshot;
 return {...(action==='START_BREAK'?{breakType:{id:f.breakType!.id,version:f.breakType!.version}}:{}),commandId:randomUUID(),action,verificationId:v.verificationId,expected:{revision:s.revision,timeEntryId:s.entry?.id??null,timeEntryVersion:s.entry?.version??null,breakEntryId:s.break?.id??null,breakEntryVersion:s.break?.version??null}};
}
function call(body:object,headers:Record<string,string>={},enabled=true,location='2'){
 const request=new Request('http://127.0.0.1:1234/api/clocker/'+location+'/punch',{
  method:'POST',headers:{host:'127.0.0.1:1234',origin:'http://127.0.0.1:1234','Content-Type':'application/json','X-Nevora-Clocker':'1',...headers},body:JSON.stringify(body),
 });
 return handleClockerPunch(request,location,{enabled,executor:f.db.executor,key:f.key,security:{production:false},
  cookies:{get:name=>jar.has(name)?{value:jar.get(name)!}:undefined,set:()=>{throw Error('Punches must not replace authentication cookies');}}});
}
it('is disabled by default without touching punch data',async()=>{
 const response=await call({operation:'execute',command:await command()}, {},false);
 expect(response.status).toBe(503);expect(await response.json()).toMatchObject({state:'disabled'});
 expect(await f.q('SELECT * FROM clocker_command_ledger')).toEqual([]);
});
it('returns real state and committed receipts without credential or employee identity fields',async()=>{
 const state=await call({operation:'state'});expect(state.status).toBe(200);
 expect(await state.json()).toMatchObject({state:'ready',snapshot:{revision:0,entry:null,break:null}});
 const response=await call({operation:'execute',command:await command()});expect(response.status).toBe(200);
 const body=await response.json();expect(body).toMatchObject({state:'committed',receipt:{action:'CLOCK_IN',snapshot:{revision:1}}});
 expect(JSON.stringify(body)).not.toMatch(/c34-a|nev_dev_|nev_pin_|tokenHash|credentialHash|request_hash|0123/);
 expect(response.headers.get('cache-control')).toContain('no-store');
 const replay=await call({operation:'receipt',commandId:body.receipt.commandId,verificationId:(await (await call({operation:'state'})).json()).verificationId});expect(await replay.json()).toEqual(body);
});
it('unknown receipt does not claim a cancelled or failed punch',async()=>{
 const response=await call({operation:'receipt',commandId:randomUUID(),verificationId:(await (await call({operation:'state'})).json()).verificationId});expect(response.status).toBe(200);
 expect(await response.json()).toMatchObject({state:'unknown'});
 expect(await f.q('SELECT * FROM time_entries')).toEqual([]);
});
it('returns the same receipt for an identical repeated HTTP command',async()=>{
 const c=await command();const one=await (await call({operation:'execute',command:c})).json();
 expect(await (await call({operation:'execute',command:c})).json()).toEqual(one);
 expect(await f.q('SELECT count(*)::int AS n FROM time_entries')).toEqual([{n:1}]);
});
it.each(['origin','header','content-type','fetch-site'])('blocks unsafe %s requests before punch writes',async kind=>{
 const headers:Record<string,string>=kind==='origin'?{origin:'https://evil.invalid'}:kind==='header'?{'X-Nevora-Clocker':'0'}:kind==='content-type'?{'Content-Type':'text/plain'}:{'Sec-Fetch-Site':'cross-site'};
 expect((await call({operation:'execute',command:await command()},headers)).status).toBe(403);
 expect(await f.q('SELECT * FROM clocker_command_ledger')).toEqual([]);
});
it.each(['employeeId','locationId','deviceId','timestamp','pin'])('rejects forged %s command authority',async field=>{
 const c={...await command(),[field]:'forged'};
 expect((await call({operation:'execute',command:c})).status).toBe(400);
 expect(await f.q('SELECT * FROM time_entries')).toEqual([]);
});
it.each([{operation:'delete'}, {operation:'state',employeeId:'c34-b'}, {operation:'receipt',commandId:'bad'}, {operation:'execute',command:'x'.repeat(3000)}])('rejects malformed or oversized envelopes',async body=>{
 expect((await call(body)).status).toBe(400);expect(await f.q('SELECT * FROM time_entries')).toEqual([]);
});
it('requires both the enrolled device and current PIN identity',async()=>{
 const c=await command();jar.delete('nevora_clocker_identity');
 expect((await call({operation:'execute',command:c})).status).toBe(401);
 jar.clear();expect((await call({operation:'state'})).status).toBe(401);
 expect(await f.q('SELECT * FROM time_entries')).toEqual([]);
});
it('a wrong-location request cannot write against another tablet binding',async()=>{
 expect((await call({operation:'execute',command:await command()}, {},true,'110')).status).toBe(401);
 expect(await f.q('SELECT * FROM time_entries')).toEqual([]);
});
it('returns a conflict when the browser command belongs to a previous employee verification',async()=>{
 const c=await command();const next=await f.identity(0,'4567');jar.set('nevora_clocker_identity',next.token);
 const response=await call({operation:'execute',command:c});expect(response.status).toBe(409);
 expect(await response.json()).toMatchObject({code:'CONTEXT_CHANGED'});
 expect(await f.q('SELECT * FROM time_entries')).toEqual([]);
});
it('maps database outage to unavailable without raw SQL or false empty state',async()=>{
 await f.q('ALTER TABLE clocker_employee_clock_state RENAME TO broken_state');
 const response=await call({operation:'state'});expect(response.status).toBe(503);
 const body=await response.json();expect(body).toMatchObject({state:'unavailable'});
 expect(JSON.stringify(body)).not.toMatch(/SELECT|broken_state|credential|c34-a/);
});

// Reconciliation: the tablet UI consumes the canonical server contract, not a second engine.
it('supplies a non-authorizing recovery subject and current greeting without exposing credentials',async()=>{
 const r=await call({operation:'state'}),v=await r.json();expect(r.status).toBe(200);
 expect(v).toMatchObject({firstName:'Avery',locationId:'loc-1',snapshot:{revision:0},breakTypes:[{name:'Fixture rest'}]});
 expect(v.subject).toMatch(/^[a-f0-9]{64}$/);expect(v.subject).not.toBe(v.verificationId);expect(Date.parse(v.expiresAt)).toBeGreaterThan(Date.now());
 expect(JSON.stringify(v)).not.toMatch(/c34-a|nev_pin_|nev_dev_|credentialHash|tokenHash/);
});
it('fresh verification changes execution context but preserves recovery subject for the same employee and device',async()=>{
 const old=await (await call({operation:'state'})).json(),c=await command();
 const next=await f.identity();jar.set('nevora_clocker_identity',next.token);
 const fresh=await (await call({operation:'state'})).json();expect(fresh.verificationId).not.toBe(old.verificationId);
 expect(fresh.subject).toBe(old.subject);expect(fresh.subject).toMatch(/^[a-f0-9]{64}$/);
 expect((await call({operation:'execute',command:c})).status).toBe(409);
 const other=await f.identity(0,'4567');jar.set('nevora_clocker_identity',other.token);
 expect((await (await call({operation:'state'})).json()).subject).not.toBe(old.subject);
});
it('a fresh PIN can recover the old receipt but cannot replay the old command',async()=>{
 const c=await command(),saved=await (await call({operation:'execute',command:c})).json();
 const next=await f.identity();jar.set('nevora_clocker_identity',next.token);
 expect(await (await call({operation:'receipt',commandId:c.commandId,verificationId:(await (await call({operation:'state'})).json()).verificationId})).json()).toEqual(saved);
 expect((await call({operation:'execute',command:c})).status).toBe(409);
 expect(await f.q('SELECT count(*)::int AS n FROM time_entries')).toEqual([{n:1}]);
});

import { rotateClockerDevice, redeemClockerEnrollment, authenticateClockerDevice } from '../../lib/clocker/devices.server';
it('replacement credentials cannot recover a previous tablet-generation receipt',async()=>{
 const c=await command();expect((await call({operation:'execute',command:c})).status).toBe(200);
 const pending=await rotateClockerDevice(f.owner,{deviceId:f.devices[0].device.id,expectedVersion:2},f.db.executor);
 const enrolled=await redeemClockerEnrollment({enrollmentToken:pending.enrollmentToken,locationKey:'2'},f.db.executor);
 const grant=await authenticateClockerDevice({credential:enrolled.credential,locationKey:'2'},f.db.executor);expect(grant).not.toBeNull();
 Object.assign(f.devices[0],grant,{credential:enrolled.credential});
 const next=await f.identity();jar.set('nevora_clocker',enrolled.credential);jar.set('nevora_clocker_identity',next.token);
 expect(await (await call({operation:'receipt',commandId:c.commandId,verificationId:(await (await call({operation:'state'})).json()).verificationId})).json()).toMatchObject({state:'unknown'});
 expect(await f.q('SELECT count(*)::int AS n FROM time_entries')).toEqual([{n:1}]);
});

it('receipt reconciliation binds the response to the fresh screen verification',async()=>{
 const c=await command(),saved=await (await call({operation:'execute',command:c})).json();
 const current=await (await call({operation:'state'})).json();
 expect(await (await call({operation:'receipt',commandId:c.commandId,verificationId:current.verificationId})).json()).toEqual(saved);
 const other=await f.identity(0,'4567');jar.set('nevora_clocker_identity',other.token);
 const late=await call({operation:'receipt',commandId:c.commandId,verificationId:current.verificationId});
 expect(late.status).toBe(409);expect(await late.json()).toMatchObject({code:'CONTEXT_CHANGED'});
});
