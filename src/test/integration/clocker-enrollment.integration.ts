import { readFile } from 'node:fs/promises';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { createDisposableFoundationDatabase } from './local-postgres';
import { registerClockerDevice, revokeClockerDevice } from '../../lib/clocker/devices.server';
import { handleClockerSetup, type ClockerCookieStore } from '../../lib/clocker/setup.server';

let db: Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
const owner = { employeeId: 'setup-owner', sessionTokenHash: 'a'.repeat(64) };
const origin = 'https://clock.example.invalid';
let jar: Map<string,string>;
let writes: {name:string;value:string;options:Record<string,unknown>}[];
let cookies: ClockerCookieStore;
let closedSessions: number;
const q = <T = Record<string,unknown>>(text:string, values:unknown[]=[]) => db.executor.query<T>({text,values});
beforeEach(async () => {
  db = await createDisposableFoundationDatabase({mode:'current-runtime'});
  await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('setup-owner','Test','Owner','555','OWNER','loc-1'); INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('a',64),'setup-owner',now()+interval '1 day')");
  await q(await readFile('db/phase-c/clocker-devices.sql','utf8'));
  jar=new Map(); writes=[]; closedSessions=0;
  cookies={get:name=>jar.has(name)?{value:jar.get(name)!}:undefined,set:(name,value,options)=>{
    writes.push({name,value,options}); if(options.maxAge===0)jar.delete(name);else jar.set(name,value);
  }};
});
afterEach(async()=>{if(db)await db.dispose();});
const pending=()=>registerClockerDevice(owner,{name:'Reception tablet',locationId:'loc-1'},db.executor);
function request(body:unknown, headers:Record<string,string>={}) {
  return new Request(origin+'/api/clocker/2/setup',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json','X-Nevora-Clocker':'1',...headers},body:JSON.stringify(body)});
}
const deps=()=>({cookies,executor:db.executor,security:{production:true,origin},finishPortalSession:async()=>{closedSessions++;}});
const call=(body:unknown,key='2')=>handleClockerSetup(request(body),key,deps());

it('prepares an opaque HttpOnly host cookie without returning a credential in JSON',async()=>{
  const response=await call({step:'prepare'});
  expect(response.status).toBe(200); expect(await response.json()).toEqual({state:'prepared'});
  expect(writes).toHaveLength(1);
  expect(writes[0]).toMatchObject({name:'__Host-nevora_clocker_setup',options:{httpOnly:true,secure:true,sameSite:'strict',path:'/',maxAge:600}});
  expect(writes[0].value).toMatch(/^nev_dev_[a-f0-9]{64}$/);
  expect(writes[0].options).not.toHaveProperty('domain');
  expect(await q('SELECT id FROM clocker_devices')).toEqual([]);
});
it('redeems with the browser cookie and returns only a minimal connected state',async()=>{
  const enrolled=await pending(); await call({step:'prepare'});
  const secret=jar.get('__Host-nevora_clocker_setup');
  const response=await call({step:'redeem',enrollmentToken:enrolled.enrollmentToken});
  expect(response.status).toBe(200);
  const body=await response.text();expect(JSON.parse(body)).toEqual({state:'connected',deviceName:'Reception tablet'});
  expect(body).not.toMatch(/nev_dev_|credential|workspaceId|session|hash|nev_enr_/);
  expect(jar.get('__Host-nevora_clocker')).toBe(secret);expect(jar.has('__Host-nevora_clocker_setup')).toBe(false);
  expect(closedSessions).toBe(1);
});
it('recovers a committed enrollment after the entire final response was lost',async()=>{
  const enrolled=await pending();await call({step:'prepare'});const before=new Map(jar);
  expect((await call({step:'redeem',enrollmentToken:enrolled.enrollmentToken})).status).toBe(200);
  jar=before; // Browser retained only the preparatory response, not the final Set-Cookie.
  const recovered=await call({step:'status'});
  expect(await recovered.json()).toEqual({state:'connected',deviceName:'Reception tablet'});
  expect(jar.has('__Host-nevora_clocker')).toBe(true);
  expect(await q("SELECT kind FROM clocker_device_events WHERE kind='ENROLLED'")).toEqual([{kind:'ENROLLED'}]);
});
it('does not show connected when portal cleanup fails; a later status retry recovers',async()=>{
  const enrolled=await pending();await call({step:'prepare'});
  const response=await handleClockerSetup(request({step:'redeem',enrollmentToken:enrolled.enrollmentToken}),'2',{...deps(),finishPortalSession:async()=>{throw Error('injected session cleanup failure');}});
  expect(response.status).toBe(503);expect(jar.has('__Host-nevora_clocker_setup')).toBe(true);
  expect((await call({step:'status'})).status).toBe(200);expect(jar.has('__Host-nevora_clocker')).toBe(true);
});
it.each(['https://evil.invalid','null',''])('rejects untrusted Origin %s before cookie or enrollment changes',async bad=>{
  const enrolled=await pending();
  const response=await handleClockerSetup(request({step:'redeem',enrollmentToken:enrolled.enrollmentToken},{Origin:bad}),'2',deps());
  expect(response.status).toBe(403);expect(writes).toHaveLength(0);
  expect(await q('SELECT credential_hash FROM clocker_devices')).toEqual([{credential_hash:null}]);
});
it.each<Record<string,string>>([{'X-Nevora-Clocker':''},{'Content-Type':'text/plain'},{'Sec-Fetch-Site':'cross-site'}])('rejects unsafe request metadata %j',async headers=>{
  const result=await handleClockerSetup(request({step:'prepare'},headers),'2',deps());
  expect(result.status).toBe(403);expect(writes).toHaveLength(0);
});
it('requires an explicit trusted origin in production and refuses insecure production origins',async()=>{
  for(const security of [{production:true},{production:true,origin:'http://clock.example.invalid'}]) {
    const response=await handleClockerSetup(request({step:'prepare'}),'2',{...deps(),security});
    expect(response.status).toBe(503);expect(writes).toHaveLength(0);
  }
});
it('requires the setup cookie before consuming an enrollment code',async()=>{
  const enrolled=await pending();const result=await call({step:'redeem',enrollmentToken:enrolled.enrollmentToken});
  expect(result.status).toBe(428);expect(await q('SELECT credential_hash FROM clocker_devices')).toEqual([{credential_hash:null}]);
});
it.each([{step:'prepare',credential:'forged'},{step:'redeem',enrollmentToken:'invalid'},{step:'other'},[],null,{step:'prepare',extra:'x'.repeat(3000)}])('rejects malformed or oversized setup input without changing cookies',async body=>{
  expect((await call(body)).status).toBe(400);expect(writes).toHaveLength(0);
});
it('does not consume an enrollment intended for a different location',async()=>{
  const enrolled=await pending();await call({step:'prepare'},'110');
  expect((await call({step:'redeem',enrollmentToken:enrolled.enrollmentToken},'110')).status).toBe(409);
  expect((await call({step:'redeem',enrollmentToken:enrolled.enrollmentToken})).status).toBe(200);
});
it('repeated prepare requests preserve the same pending browser identity',async()=>{
  await call({step:'prepare'});const first=jar.get('__Host-nevora_clocker_setup');
  await call({step:'prepare'});expect(jar.get('__Host-nevora_clocker_setup')).toBe(first);
});
it('reports an unregistered device instead of false activity after revocation',async()=>{
  const enrolled=await pending();await call({step:'prepare'});await call({step:'redeem',enrollmentToken:enrolled.enrollmentToken});
  await revokeClockerDevice(owner,{deviceId:enrolled.device.id,expectedVersion:2},db.executor);
  expect(await (await call({step:'status'})).json()).toEqual({state:'unregistered'});
});
it('two concurrent redemptions on the same prepared browser reconcile to one device',async()=>{
  const enrolled=await pending();await call({step:'prepare'});
  const outcomes=await Promise.all([call({step:'redeem',enrollmentToken:enrolled.enrollmentToken}),call({step:'redeem',enrollmentToken:enrolled.enrollmentToken})]);
  expect(outcomes.map(result=>result.status)).toEqual([200,200]);
  expect(await q("SELECT kind FROM clocker_device_events WHERE kind='ENROLLED'")).toEqual([{kind:'ENROLLED'}]);
});

it('replaces a retired pending cookie instead of resurrecting it during a fresh setup',async()=>{
  const enrolled=await pending();await call({step:'prepare'});const oldPrepared=jar.get('__Host-nevora_clocker_setup');
  await call({step:'redeem',enrollmentToken:enrolled.enrollmentToken});
  await revokeClockerDevice(owner,{deviceId:enrolled.device.id,expectedVersion:2},db.executor);
  jar=new Map([['__Host-nevora_clocker_setup',oldPrepared!]]);
  expect((await call({step:'prepare'})).status).toBe(200);
  expect(jar.get('__Host-nevora_clocker_setup')).not.toBe(oldPrepared);
});
it('keeps every setup response private and non-cacheable',async()=>{
 const result=await call({step:'status'});
 expect(result.headers.get('cache-control')).toContain('no-store');
 expect(result.headers.get('referrer-policy')).toBe('no-referrer');
 expect(result.headers.get('x-content-type-options')).toBe('nosniff');
});
