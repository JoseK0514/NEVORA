import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { afterEach, beforeEach, expect, it } from '@rstest/core';
import { createDisposableFoundationDatabase } from './local-postgres';
import {
  registerClockerDevice, redeemClockerEnrollment, setClockerDeviceSignInMode, rotateClockerDevice,
} from '../../lib/clocker/devices.server';
import { setEmployeeClockerPin } from '../../lib/clocker/pins.server';
import { readClockerLocationAccess, setClockerLocationAccess } from '../../lib/clocker/location-access.server';
import { handleClockerPin } from '../../lib/clocker/pin-transport.server';
import { handleClockerPunch } from '../../lib/clocker/punch-transport.server';
import type { ClockerCookieStore } from '../../lib/clocker/setup.server';
const key=Buffer.alloc(32,45);
let db:Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
let tablet:Awaited<ReturnType<typeof redeemClockerEnrollment>>;
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
 // Explicit intended Owner/Manager census before current operational adoption.
 for(const file of ['0031_native_payroll.sql','0032_company_access_invitations.sql'])await q(await readFile('db/migrations/'+file,'utf8'));
 const p=await registerClockerDevice(proof,{name:'PIN test tablet',locationId:'loc-1'},db.executor);
 tablet=await redeemClockerEnrollment({enrollmentToken:p.enrollmentToken,locationKey:'2'},db.executor);
 await setEmployeeClockerPin(proof,{employeeId:'pin-owner',pin:'0246',expectedVersion:0},key,db.executor);
 cookies=new Map([['nevora_clocker',tablet.credential]]);writes=[];
 store={get:name=>cookies.has(name)?{value:cookies.get(name)!}:undefined,set:(name,value,options)=>{cookies.set(name,value);writes.push({name,options});}};
});
afterEach(async()=>{if(db)await db.dispose();});
function call(body:object,headers:Record<string,string|undefined>={},location='2'){
 return handleClockerPin(new Request('http://127.0.0.1:1234/api/clocker/'+location+'/pin',{method:'POST',headers:{Host:'127.0.0.1:1234',Origin:'http://127.0.0.1:1234','X-Nevora-Clocker':'1','Content-Type':'application/json',...Object.fromEntries(Object.entries(headers).filter(([,v])=>v!==undefined))},body:JSON.stringify(body)}),location,
 {cookies:store,executor:db.executor,security:{production:false},key});
}
it('uses an HttpOnly identity cookie and returns no PIN, employee ID or proof',async()=>{
 const response=await call({action:'verify',employeeId:'pin-owner',pin:'0246'});expect(response.status).toBe(200);
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
 const result=await call({action:'verify',employeeId:'pin-owner',pin:'0246'},headers);expect(result.status).toBe(403);
 expect(await q('SELECT * FROM clocker_pin_sessions')).toEqual([]);expect(await q('SELECT * FROM clocker_pin_limits')).toEqual([]);
});
it.each([{action:'verify',pin:246},{action:'verify',pin:'0246',employeeId:'pin-owner',forged:true},{action:'verify',pin:'0246\n'},{action:'verify',pin:'x'.repeat(5000)},{action:'clear',token:'forged'}])('rejects malformed or forged bodies',async body=>{
 expect((await call(body)).status).toBe(400);expect(await q('SELECT * FROM clocker_pin_sessions')).toEqual([]);
});
it.each([42,null,{},'x'.repeat(129),'\u0000bad',''])('denies malformed employee identity %j through the same bounded failure path',async employeeId=>{
 const response=await call({action:'verify',employeeId,pin:'0246'});
 expect(response.status).toBe(401);expect(await response.json()).toEqual({state:'denied',code:'PIN_DENIED',error:'PIN not recognized for this location. Try again or ask your manager.'});
 expect(await q("SELECT scope,failures,attempts FROM clocker_pin_limits ORDER BY scope")).toEqual([{scope:'DEVICE',failures:1,attempts:1},{scope:'WORKSPACE',failures:1,attempts:1}]);
});
it('accepts normalized Employee ID plus PIN and returns personal wait scope without disclosing identity',async()=>{
 for(let n=0;n<5;n++)expect((await call({action:'verify',employeeId:' pin-OWNER ',pin:'9999'})).status).toBe(401);
 const response=await call({action:'verify',employeeId:'pin-owner',pin:'0246'});const body=await response.json();
 expect(response.status).toBe(429);expect(body).toMatchObject({state:'limited',limitScope:'person'});
 expect(response.headers.get('Retry-After')).toBe(String(body.retryAfterSeconds));
 expect(JSON.stringify(body)).not.toMatch(/Private|pin-owner|0246|nev_pin/);
 expect(cookies.get('nevora_clocker_identity')).toBe('');
});
it('denies a missing or wrong-location device without identifying an employee',async()=>{
 expect((await call({action:'verify',employeeId:'pin-owner',pin:'0246'}, {},'110')).status).toBe(401);
 cookies.clear();expect((await call({action:'verify',employeeId:'pin-owner',pin:'0246'})).status).toBe(401);
 expect(await q('SELECT * FROM clocker_pin_limits')).toEqual([]);
});
it('returns indistinguishable invalid PIN errors and a persistent 429 budget',async()=>{
 for(let n=0;n<5;n++){const r=await call({action:'verify',employeeId:'pin-owner',pin:'9999'});expect(r.status).toBe(401);expect(await r.json()).toEqual({state:'denied',code:'PIN_DENIED',error:'PIN not recognized for this location. Try again or ask your manager.'});}
 const r=await call({action:'verify',employeeId:'pin-owner',pin:'0246'});expect(r.status).toBe(429);expect(Number(r.headers.get('retry-after'))).toBeGreaterThan(0);
});
it('does not expose SQL errors or return idle on a database outage',async()=>{
 await call({action:'verify',employeeId:'pin-owner',pin:'0246'});await q('ALTER TABLE clocker_pin_sessions RENAME TO failed_sessions');
 const response=await call({action:'status'});expect(response.status).toBe(503);
 expect(JSON.stringify(await response.json())).not.toMatch(/failed_sessions|SELECT|token|Private|0246/);
});

it('returns the database remaining wait consistently in the JSON contract and Retry-After',async()=>{
 await call({action:'verify',employeeId:'pin-owner',pin:'0246'});
 await q("UPDATE clocker_pin_limits SET failures=20,failure_window=clock_timestamp()-interval '4 minutes' WHERE scope='DEVICE'");
 const response=await call({action:'verify',employeeId:'pin-owner',pin:'0246'});const body=await response.json();
 expect(response.status).toBe(429);expect(body.code).toBe('PIN_LIMITED');
 expect(body.retryAfterSeconds).toBeGreaterThanOrEqual(58);expect(body.retryAfterSeconds).toBeLessThanOrEqual(60);
 expect(response.headers.get('Retry-After')).toBe(String(body.retryAfterSeconds));
});

async function addEmployee(id: string, firstName: string, lastName: string, loc: string, pin: string) {
  await q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id)
    VALUES($1,$2,$3,'555','EMPLOYEE',$4)`, [id, firstName, lastName, loc]);
  await q('INSERT INTO employee_location_eligibility VALUES($1,$2)', [id, loc]);
  await setEmployeeClockerPin(proof, { employeeId: id, pin, expectedVersion: 0 }, key, db.executor);
}
const enablePicker = (expectedVersion=tablet.device.version) => setClockerDeviceSignInMode(proof,
  { deviceId: tablet.device.id, expectedVersion, signInMode: 'NAME_PICKER' }, db.executor);
async function roster() {
  const response = await call({ action: 'roster' });
  expect(response.headers.get('cache-control')).toBe('no-store, private');
  return { status: response.status, body: await response.json() };
}

it('requires an enrolled Owner-enabled tablet and returns only unambiguous eligible names with opaque references', async () => {
  await addEmployee('local-a', 'Ana', 'Rivera', 'loc-1', '0921');
  await addEmployee('local-b', 'Camila', 'Silva', 'loc-1', '0922');
  await addEmployee('local-c', 'Camila', 'Soto', 'loc-1', '0923');
  await addEmployee('foreign-site', 'Roberto', 'Torres', 'loc-2', '0999');
  await addEmployee('removed', 'Removed', 'Person', 'loc-1', '0919');
  await q("UPDATE employees SET active=false WHERE id='removed'");
  expect(await roster()).toEqual({ status: 200, body: { state: 'employee_id' } });
  const enabled = await enablePicker();
  expect(enabled).toMatchObject({ signInMode: 'NAME_PICKER', version: tablet.device.version + 1 });
  const picked = await roster();
  expect(picked).toEqual({ status: 200, body: { state: 'name_picker', people: [
    { displayName: 'Ana R.', selection: expect.stringMatching(/^[a-f0-9]{64}$/) },
    { displayName: 'Private P.', selection: expect.stringMatching(/^[a-f0-9]{64}$/) },
  ] } });
  expect(JSON.stringify(picked.body)).not.toMatch(/local-a|foreign-site|Roberto|Camila|Removed|Rivera/);
  expect((await call({ action: 'verify', selection: picked.body.people[0].selection, pin: '0921' })).status).toBe(200);
  expect((await call({ action: 'verify', employeeId: 'local-b', pin: '0922' })).status).toBe(200);
  cookies.clear();
  expect(await roster()).toMatchObject({ status: 401, body: { code: 'DEVICE_REQUIRED' } });
});

it('shares the person budget across the picker and Employee ID routes while another person can sign in', async () => {
  await addEmployee('local-a', 'Ana', 'Rivera', 'loc-1', '0921');
  await enablePicker();
  const selection = (await roster()).body.people.find((person: { displayName: string }) => person.displayName === 'Ana R.').selection;
  for (let n = 0; n < 5; n++) {
    const identity = n % 2 ? { employeeId: 'LOCAL-A' } : { selection };
    expect((await call({ action: 'verify', ...identity, pin: '9999' })).status).toBe(401);
  }
  for (const identity of [{ employeeId: 'local-a' }, { selection }]) {
    const result = await call({ action: 'verify', ...identity, pin: '0921' });
    expect(result.status).toBe(429);
    expect(await result.json()).toMatchObject({ limitScope: 'person' });
  }
  expect((await call({ action: 'verify', employeeId: 'pin-owner', pin: '0246' })).status).toBe(200);
});

it('rejects a stale selection after disable, reenable, or enrollment replacement', async () => {
  const enabled = await enablePicker();
  const selection = (await roster()).body.people[0].selection;
  const disabled = await setClockerDeviceSignInMode(proof,
    { deviceId: tablet.device.id, expectedVersion: enabled.version, signInMode: 'EMPLOYEE_ID' }, db.executor);
  expect(await roster()).toEqual({ status: 200, body: { state: 'employee_id' } });
  expect((await call({ action: 'verify', selection, pin: '0246' })).status).toBe(401);
  const again = await enablePicker(disabled.version);
  expect((await call({ action: 'verify', selection, pin: '0246' })).status).toBe(401);
  expect((await call({ action: 'verify', employeeId: 'pin-owner', pin: '0246' })).status).toBe(200);
  const replacement = await rotateClockerDevice(proof, { deviceId: tablet.device.id, expectedVersion: again.version }, db.executor);
  const enrolled = await redeemClockerEnrollment({ enrollmentToken: replacement.enrollmentToken, locationKey: '2' }, db.executor);
  cookies.set('nevora_clocker', enrolled.credential);
  expect(await roster()).toEqual({ status: 200, body: { state: 'employee_id' } });
  expect(await q("SELECT count(*)::int AS n FROM clocker_device_events WHERE kind='SIGN_IN_MODE_CHANGED'")).toEqual([{ n: 3 }]);
});

it('honors Owner-selected one, several and all locations in both methods without editing scheduling assignments', async () => {
  await addEmployee('local-a', 'Ana', 'Rivera', 'loc-1', '0921');
  await enablePicker();
  const pending = await registerClockerDevice(proof, { name: 'Second tablet', locationId: 'loc-2' }, db.executor);
  const second = await redeemClockerEnrollment({ enrollmentToken: pending.enrollmentToken, locationKey: '110' }, db.executor);
  await setClockerDeviceSignInMode(proof,
    { deviceId: second.device.id, expectedVersion: second.device.version, signInMode: 'NAME_PICKER' }, db.executor);
  let access = await readClockerLocationAccess(proof, 'local-a', db.executor);
  expect(access).toMatchObject({ mode: 'ASSIGNED', locationIds: [] });
  const save = (mode: 'ASSIGNED' | 'SELECTED' | 'ALL', locationIds: string[]) => setClockerLocationAccess(proof,
    { employeeId: 'local-a', mode, locationIds, expectedUpdatedAt: access.updatedAt }, db.executor);

  expect((await call({ action: 'verify', employeeId: 'local-a', pin: '0921' })).status).toBe(200);
  const oldSelection = (await roster()).body.people[0].selection;
  access = await save('SELECTED', ['loc-2']);
  expect(access).toMatchObject({ mode: 'SELECTED', locationIds: ['loc-2'] });
  expect((await (await call({ action: 'status' })).json()).state).toBe('idle');
  expect((await roster()).body.people.map((person: { displayName: string }) => person.displayName)).toEqual(['Private P.']);
  expect((await call({ action: 'verify', employeeId: 'local-a', pin: '0921' })).status).toBe(401);
  cookies.set('nevora_clocker', second.credential);
  expect((await call({ action: 'verify', selection: oldSelection, pin: '0921' }, {}, '110')).status).toBe(401);
  const secondRoster = await call({ action: 'roster' }, {}, '110');
  const secondSelection = (await secondRoster.json()).people[0].selection;
  expect((await call({ action: 'verify', selection: secondSelection, pin: '0921' }, {}, '110')).status).toBe(200);

  access = await save('SELECTED', ['loc-1', 'loc-2']);
  cookies.set('nevora_clocker', tablet.credential);
  expect((await call({ action: 'verify', employeeId: 'local-a', pin: '0921' })).status).toBe(200);
  access = await save('ALL', []);
  await q(`INSERT INTO locations(id,name,short_name,workspace_id,clocker_key)
    VALUES('loc-picker-test','New location','New','workspace-fuel','picker-new')`);
  const newPending = await registerClockerDevice(proof, { name: 'New location tablet', locationId: 'loc-picker-test' }, db.executor);
  const newTablet = await redeemClockerEnrollment({ enrollmentToken: newPending.enrollmentToken, locationKey: 'picker-new' }, db.executor);
  cookies.set('nevora_clocker', newTablet.credential);
  expect((await call({ action: 'verify', employeeId: 'local-a', pin: '0921' }, {}, 'picker-new')).status).toBe(200);
  expect(await q("SELECT location_id FROM employee_location_eligibility WHERE employee_id='local-a'"))
    .toEqual([{ location_id: 'loc-1' }]);
});

it('rejects Manager changes and stale changes to both Owner controls', async () => {
  await q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id)
    VALUES('manager','Test','Manager','555','MANAGER','loc-1');
    INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('b',64),'manager',now()+interval '1 day');`);
  const manager = { employeeId: 'manager', sessionTokenHash: 'b'.repeat(64) };
  const { updatedAt } = await readClockerLocationAccess(proof, 'pin-owner', db.executor);
  const command = { employeeId: 'pin-owner', mode: 'ALL' as const, locationIds: [], expectedUpdatedAt: updatedAt };
  await expect(setClockerLocationAccess(manager, command, db.executor)).rejects.toMatchObject({ code: 'FORBIDDEN' });
  await expect(setClockerDeviceSignInMode(manager,
    { deviceId: tablet.device.id, expectedVersion: tablet.device.version, signInMode: 'NAME_PICKER' }, db.executor))
    .rejects.toMatchObject({ code: 'OWNER_REQUIRED' });
  await expect(setClockerLocationAccess(proof, { ...command, mode: 'SELECTED', locationIds: ['missing'] }, db.executor))
    .rejects.toMatchObject({ code: 'INVALID' });
  await setClockerLocationAccess(proof, command, db.executor);
  await expect(setClockerLocationAccess(proof, command, db.executor)).rejects.toMatchObject({ code: 'STALE' });
  await enablePicker();
  await expect(enablePicker()).rejects.toMatchObject({ code: 'STALE' });
});

it('records one punch and one receipt through the picker at an explicitly allowed secondary location', async () => {
  await addEmployee('local-a', 'Ana', 'Rivera', 'loc-1', '0921');
  const { updatedAt } = await readClockerLocationAccess(proof, 'local-a', db.executor);
  await setClockerLocationAccess(proof,
    { employeeId: 'local-a', mode: 'SELECTED', locationIds: ['loc-2'], expectedUpdatedAt: updatedAt }, db.executor);
  const pending = await registerClockerDevice(proof, { name: 'Second tablet', locationId: 'loc-2' }, db.executor);
  const second = await redeemClockerEnrollment({ enrollmentToken: pending.enrollmentToken, locationKey: '110' }, db.executor);
  await setClockerDeviceSignInMode(proof,
    { deviceId: second.device.id, expectedVersion: second.device.version, signInMode: 'NAME_PICKER' }, db.executor);
  cookies.set('nevora_clocker', second.credential);
  const people = await (await call({ action: 'roster' }, {}, '110')).json();
  const selection = people.people[0].selection;
  expect((await call({ action: 'verify', selection, pin: '0921' }, {}, '110')).status).toBe(200);
  const punch = (body: object) => handleClockerPunch(new Request('http://127.0.0.1:1234/api/clocker/110/punch', {
    method: 'POST',
    headers: { Host: '127.0.0.1:1234', Origin: 'http://127.0.0.1:1234', 'X-Nevora-Clocker': '1',
      'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }), '110', { cookies: store, executor: db.executor, security: { production: false }, key, enabled: true });
  const state = await punch({ operation: 'state' });
  expect(state.status).toBe(200);
  const current = await state.json();
  const command = {
    commandId: randomUUID(), action: 'CLOCK_IN', verificationId: current.verificationId,
    expected: { revision: current.snapshot.revision, timeEntryId: null, timeEntryVersion: null,
      breakEntryId: null, breakEntryVersion: null },
  };
  const response = await punch({ operation: 'execute', command });
  expect(response.status).toBe(200);
  const committed = await response.json();
  expect(committed).toMatchObject({ state: 'committed', receipt: { action: 'CLOCK_IN', commandId: command.commandId } });
  expect(await (await punch({ operation: 'execute', command })).json()).toEqual(committed);
  expect(await q('SELECT employee_id,location_id FROM time_entries')).toEqual([{ employee_id: 'local-a', location_id: 'loc-2' }]);
  expect(await q('SELECT count(*)::int AS n FROM clocker_command_ledger')).toEqual([{ n: 1 }]);
});

it('rejects valid PIN-only HTTP requests in both Owner modes', async () => {
  for (const mode of ['EMPLOYEE_ID', 'NAME_PICKER']) {
    if (mode === 'NAME_PICKER') await enablePicker();
    const response = await call({ action: 'verify', pin: '0246' });
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: 'PIN_INPUT_INVALID' });
  }
  expect(await q('SELECT device_id FROM clocker_pin_sessions')).toEqual([]);
  expect(await q('SELECT scope FROM clocker_pin_limits')).toEqual([]);
});
