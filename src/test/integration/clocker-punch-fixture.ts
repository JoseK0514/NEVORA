import { readFile } from 'node:fs/promises';
import { createDisposableFoundationDatabase } from './local-postgres';
import { registerClockerDevice, redeemClockerEnrollment, authenticateClockerDevice } from '../../lib/clocker/devices.server';
import { saveBreakType } from '../../lib/clocker/break-types.server';
import { setEmployeeClockerPin, verifyEmployeeClockerPin, readClockerIdentity } from '../../lib/clocker/pins.server';

/** Fictional employees and owned loopback PostgreSQL only. */
export async function createPunchFixture(options:{breaks?:boolean;migrationStage?:'current'|'pre-break'}={}){
 const preBreak=options.migrationStage==='pre-break';
 const db=await createDisposableFoundationDatabase({mode:preBreak?'phase-c-base':'current-runtime'});
 const q=<T=Record<string,unknown>>(text:string,values:unknown[]=[])=>db.executor.query<T>({text,values});
 const key=Buffer.alloc(32,61),owner={employeeId:'c34-owner',sessionTokenHash:'a'.repeat(64)};
 try{
  if(preBreak){
   for(const file of ['0011_clocker_devices.sql','0012_clocker_pins.sql','0013_clocker_punches.sql']){
    await q(await readFile('db/migrations/'+file,'utf8'));
   }
  }
  await q(`INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES
   ('c34-owner','Owner','QA','555','OWNER','loc-1'),('c34-a','Avery','QA','556','EMPLOYEE','loc-1'),('c34-b','Blair','QA','557','EMPLOYEE','loc-1');
   INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('a',64),'c34-owner',now()+interval '1 day');
   INSERT INTO employee_location_eligibility(employee_id,location_id) SELECT id,'loc-1' FROM employees;
   INSERT INTO employee_location_eligibility VALUES('c34-a','loc-2');`);
  await setEmployeeClockerPin(owner,{employeeId:'c34-a',pin:'0123',expectedVersion:0},key,db.executor);
  await setEmployeeClockerPin(owner,{employeeId:'c34-b',pin:'4567',expectedVersion:0},key,db.executor);
  const devices:(NonNullable<Awaited<ReturnType<typeof authenticateClockerDevice>>>&{credential:string;locationKey:string})[]=[];
  for(const [index,locationId] of ['loc-1','loc-1','loc-2'].entries()){
   const pending=await registerClockerDevice(owner,{name:'C34 tablet '+index,locationId},db.executor);
   const locationKey=locationId==='loc-1'?'2':'110';
   const active=await redeemClockerEnrollment({enrollmentToken:pending.enrollmentToken,locationKey},db.executor);
   const grant=await authenticateClockerDevice({credential:active.credential,locationKey},db.executor);
   if(!grant)throw Error('Fictional tablet setup failed');
   devices.push({...grant,credential:active.credential,locationKey});
  }
  async function identity(index=0,pin='0123'){
   const verified=await verifyEmployeeClockerPin(devices[index].proof,pin,key,db.executor);
   if(verified.state!=='verified')throw Error('Fictional PIN setup failed');
   const identity=await readClockerIdentity(devices[index].proof,verified.token,key,db.executor);
   if(!identity)throw Error('Fictional identity unavailable');
   return {...identity,token:verified.token};
  }
  let breakType=null;
  if(options.breaks){breakType=await saveBreakType(owner,{name:'Fixture rest',category:'REST',targetMinutes:15,active:true,expectedVersion:0},db.executor);}
  return {db,q,key,owner,devices,identity,breakType};
 }catch(error){await db.dispose();throw error;}
}
