import {it,expect} from 'vitest';
import {createDisposableExchangeDatabase} from './local-postgres';
import {seedOwnedApp} from './owned-app-fixture';
import {fixtureProof} from './shift-change-api';
import {readEmployeeProfile} from '../../lib/data/employee-profile.server';
import type {SqlExecutor} from '../../lib/notifications/types';
async function setup(){
 const db=await createDisposableExchangeDatabase({mode:'current-runtime'});
 try{
  await seedOwnedApp(db.executor);
  const q=<T=Record<string,unknown>>(text:string,values:unknown[]=[])=>db.executor.query<T>({text,values});
  await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('PROFILE-A','Own','Person','555-0191','EMPLOYEE','loc-1'),('PROFILE-B','Private','Peer','555-0192','LEAD','loc-2');INSERT INTO employee_location_eligibility VALUES('PROFILE-A','loc-1'),('PROFILE-B','loc-2')");
  return {db,q,proof:await fixtureProof(db.executor,'PROFILE-A')};
 }catch(error){await db.dispose();throw error;}
}
it('projects only current own work identity, with no peer/contact/session fields',async()=>{
 const {db,proof}=await setup();try{
  const read=await readEmployeeProfile(proof,db.executor);
  expect(read.state).toBe('ready');if(read.state!=='ready'||read.kind!=='profile')throw Error('Own profile unavailable');
  expect(read.profile).toEqual({name:'Own Person',role:'Employee',workspace:'Northside QA Workforce',timeZone:'America/Puerto_Rico',locations:['Main Office']});
  expect(read.validForMs).toBeGreaterThan(0);expect(read.validForMs).toBeLessThanOrEqual(45000);
  expect(JSON.stringify(read)).not.toMatch(/Private Peer|PROFILE-B|555-019|sessionTokenHash|token_hash|password/);
 }finally{await db.dispose();}
});
it('requires the exact current Employee or Lead role and refuses management on this own reader',async()=>{
 const {db,q,proof}=await setup();try{
  await q("UPDATE employees SET role='LEAD' WHERE id='PROFILE-A'");
  expect(await readEmployeeProfile(proof,db.executor)).toEqual({state:'unavailable',reason:'access_denied'});
  const lead=await fixtureProof(db.executor,'PROFILE-A'),read=await readEmployeeProfile(lead,db.executor);
  expect(read).toMatchObject({state:'ready',kind:'profile',profile:{role:'Lead'}});
  await q("UPDATE employees SET role='MANAGER' WHERE id='PROFILE-A'");
  expect(await readEmployeeProfile(lead,db.executor)).toEqual({state:'unavailable',reason:'access_denied'});
  expect(await readEmployeeProfile(await fixtureProof(db.executor,'PROFILE-A'),db.executor)).toEqual({state:'unavailable',reason:'access_denied'});
 }finally{await db.dispose();}
});
it('bounds the lease by actual session expiry and refuses expired or revoked sessions',async()=>{
 const {db,q,proof}=await setup();try{
  await q("UPDATE employee_sessions SET expires_at=clock_timestamp()+interval '2 seconds' WHERE token_hash=$1",[proof.sessionTokenHash]);
  const read=await readEmployeeProfile(proof,db.executor);expect(read.state).toBe('ready');if(read.state==='ready'){expect(read.validForMs).toBeGreaterThan(0);expect(read.validForMs).toBeLessThanOrEqual(2000);}
  await q("UPDATE employee_sessions SET expires_at=clock_timestamp()-interval '1 second' WHERE token_hash=$1",[proof.sessionTokenHash]);
  expect(await readEmployeeProfile(proof,db.executor)).toEqual({state:'unavailable',reason:'access_denied'});
  await q('DELETE FROM employee_sessions WHERE token_hash=$1',[proof.sessionTokenHash]);
  expect(await readEmployeeProfile(proof,db.executor)).toEqual({state:'unavailable',reason:'access_denied'});
 }finally{await db.dispose();}
});
it('keeps the existing active eligible-location requirement without inventing an empty profile',async()=>{
 const {db,q,proof}=await setup();try{
  await q("UPDATE employees SET primary_location_id='loc-2' WHERE id='PROFILE-A';DELETE FROM employee_location_eligibility WHERE employee_id='PROFILE-A';UPDATE locations SET active=false WHERE id='loc-2'");
  expect(await readEmployeeProfile(proof,db.executor)).toEqual({state:'unavailable',reason:'access_denied'});
  await q("INSERT INTO employee_location_eligibility VALUES('PROFILE-A','loc-1')");
  expect(await readEmployeeProfile(proof,db.executor)).toMatchObject({state:'ready',kind:'profile',profile:{locations:['Main Office']}});
 }finally{await db.dispose();}
});
it('refuses inactive workspace context and recovers only after the actual workspace restores',async()=>{
 const {db,q,proof}=await setup();try{
  await q('UPDATE workspaces SET active=false');const read=await readEmployeeProfile(proof,db.executor);
  expect(read.state).toBe('unavailable');expect(JSON.stringify(read)).not.toContain('Own Person');
  await q('UPDATE workspaces SET active=true');expect((await readEmployeeProfile(proof,db.executor)).state).toBe('ready');
 }finally{await db.dispose();}
});
it('a real transaction error returns generic failure, never profile facts, SQL detail or empty success',async()=>{
 const {db,proof}=await setup();try{
  const failing:SqlExecutor={query:db.executor.query,transaction:(statements,signal)=>db.executor.transaction(statements.some(row=>row.text.includes("'kind','profile'"))?[...statements,{text:"SELECT 'PRIVATE_PROFILE_SQL_FAILURE'::integer",values:[]}]:statements,signal)};
  expect(await readEmployeeProfile(proof,failing)).toEqual({state:'unavailable',reason:'read_failed'});
  expect((await readEmployeeProfile(proof,db.executor)).state).toBe('ready');
 }finally{await db.dispose();}
});
