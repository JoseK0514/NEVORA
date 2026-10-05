import { readFile } from 'node:fs/promises';
import { afterEach, beforeEach, expect, it } from 'vitest';
import { createDisposableFoundationDatabase } from './local-postgres';
import { registerClockerDevice, redeemClockerEnrollment } from '../../lib/clocker/devices.server';
import { setEmployeeClockerPin } from '../../lib/clocker/pins.server';
import { handleClockerPin } from '../../lib/clocker/pin-transport.server';
import type { ClockerCookieStore } from '../../lib/clocker/setup.server';
const key=Buffer.alloc(32,45);
let db:Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
let cookies:Map<string,string>;
let writes:{name:string;options:unknown}[];
let store:ClockerCookieStore;
const proof={employeeId:'pin-owner',sessionTokenHash:'a'.repeat(64)};
const q=(text:string,values:unknown[]=[])=>db.executor.query({text,values});
beforeEach(async()=>{
 db=await createDisposableFoundationDatabase({mode:'current-runtime'});
 await q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('pin-owner','Private','Person','555','OWNER','loc-1');
 INSERT INTO employee_location_eligibility VALUES('pin-owner','loc-1');
 INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('a',64),'pin-owner',now()+interval '1 day');`);
 await q(await readFile('db/phase-c/clocker-devices.sql','utf8'));await q(await readFile('db/phase-c/clocker-pins.sql','utf8'));
 const p=await registerClockerDevice(proof,{name:'PIN test tablet',locationId:'loc-1'},db.executor);
 const d=await redeemClockerEnrollment({enrollmentToken:p.enrollmentToken,locationKey:'2'},db.executor);
 await setEmployeeClockerPin(proof,{employeeId:'pin-owner',pin:'0246',expectedVersion:0},key,db.executor);
 cookies=new Map([['nevora_clocker',d.credential]]);writes=[];
 store={get:name=>cookies.has(name)?{value:cookies.get(name)!}:undefined,set:(name,value,options)=>{cookies.set(name,value);writes.push({name,options});}};
});
afterEach(async()=>{if(db)await db.dispose();});
function call(body:object,headers:Record<string,string|undefined>={},location='2'){
 return handleClockerPin(new Request('http://127.0.0.1:1234/api/clocker/'+location+'/pin',{method:'POST',headers:{Host:'127.0.0.1:1234',Origin:'http://127.0.0.1:1234','X-Nevora-Clocker':'1','Content-Type':'application/json',...Object.fromEntries(Object.entries(headers).filter(([,v])=>v!==undefined))},body:JSON.stringify(body)}),location,
 {cookies:store,executor:db.executor,security:{production:false},key});
}
it('uses an HttpOnly identity cookie and returns no PIN, employee ID or proof',async()=>{
 const response=await call({action:'verify',pin:'0246'});expect(response.status).toBe(200);
 const body=await response.json();expect(body).toMatchObject({state:'verified',firstName:'Private'});
 expect(Object.keys(body).sort()).toEqual(['expiresAt','firstName','state']);
 expect(JSON.stringify(body)).not.toMatch(/0246|nev_pin|hash|pin-owner/);
 expect(writes).toContainEqual({name:'nevora_clocker_identity',options:{httpOnly:true,secure:false,sameSite:'strict',path:'/',maxAge:60}});
 expect(response.headers.get('cache-control')).toContain('no-store');
 expect((await (await call({action:'status'})).json()).state).toBe('verified');
 expect((await (await call({action:'clear'})).json()).state).toBe('idle');
 expect((await (await call({action:'status'})).json()).state).toBe('idle');
});
it.each([{Origin:'https://evil.invalid'},{'X-Nevora-Clocker':'0'},{'Content-Type':'text/plain'},{'Sec-Fetch-Site':'cross-site'}])('rejects an unsafe request before any identity or limiter write',async headers=>{
 const result=await call({action:'verify',pin:'0246'},headers);expect(result.status).toBe(403);
 expect(await q('SELECT * FROM clocker_pin_sessions')).toEqual([]);expect(await q('SELECT * FROM clocker_pin_limits')).toEqual([]);
});
it.each([{action:'verify',pin:246},{action:'verify',pin:'0246',employeeId:'pin-owner'},{action:'verify',pin:'0246\n'},{action:'verify',pin:'x'.repeat(5000)},{action:'clear',token:'forged'}])('rejects malformed or forged bodies',async body=>{
 expect((await call(body)).status).toBe(400);expect(await q('SELECT * FROM clocker_pin_sessions')).toEqual([]);
});
it('denies a missing or wrong-location device without identifying an employee',async()=>{
 expect((await call({action:'verify',pin:'0246'}, {},'110')).status).toBe(401);
 cookies.clear();expect((await call({action:'verify',pin:'0246'})).status).toBe(401);
 expect(await q('SELECT * FROM clocker_pin_limits')).toEqual([]);
});
it('returns indistinguishable invalid PIN errors and a persistent 429 budget',async()=>{
 for(let n=0;n<5;n++){const r=await call({action:'verify',pin:'9999'});expect(r.status).toBe(401);expect(await r.json()).toEqual({state:'denied',error:'PIN not recognized for this location. Try again or ask your manager.'});}
 const r=await call({action:'verify',pin:'0246'});expect(r.status).toBe(429);expect(Number(r.headers.get('retry-after'))).toBeGreaterThan(0);
});
it('does not expose SQL errors or return idle on a database outage',async()=>{
 await call({action:'verify',pin:'0246'});await q('ALTER TABLE clocker_pin_sessions RENAME TO failed_sessions');
 const response=await call({action:'status'});expect(response.status).toBe(503);
 expect(JSON.stringify(await response.json())).not.toMatch(/failed_sessions|SELECT|token|Private|0246/);
});
