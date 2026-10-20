import {readFile} from 'node:fs/promises';
import {createDisposableFoundationDatabase} from './local-postgres';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
export async function companyAccessFixture(){
 const db=await createDisposableFoundationDatabase({mode:'current-runtime'});
 const q=<T=Record<string,unknown>>(text:string,values:unknown[]=[])=>db.executor.query<T>({text,values});
 try{
  await q(await readFile('db/migrations/0031_native_payroll.sql','utf8'));
  await q(`INSERT INTO employees(id,first_name,last_name,phone,email,role,primary_location_id) VALUES
   ('owner','Owner','QA','555001','owner@example.invalid','OWNER','loc-1'),
   ('manager','Manager','QA','555002','manager@example.invalid','MANAGER','loc-1'),
   ('target','Target','QA','555003','target@example.invalid','EMPLOYEE','loc-1');
   INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES
   (repeat('a',64),'owner',clock_timestamp()+interval '1 hour'),(repeat('b',64),'manager',clock_timestamp()+interval '1 hour');`);
  await q(await readFile('db/migrations/0032_company_access_invitations.sql','utf8'));
  const sqlFailures:{code:string;position:string}[]=[];
  const original=db.executor;
  db.executor={...original,async transaction(statements,signal){
   try{return await original.transaction(statements,signal);}catch(error){
    const e=error as {code?:string;position?:string};sqlFailures.push({code:e.code??'unknown',position:e.position??''});throw error;
   }
  }};
  const proof=(id:'owner'|'manager'):SessionMutationProof=>({employee:{id,firstName:id,lastName:'QA',role:id==='owner'?'OWNER':'MANAGER',primaryLocationId:'loc-1'},sessionTokenHash:(id==='owner'?'a':'b').repeat(64)});
  return {db,q,sqlFailures,owner:proof('owner'),manager:proof('manager')};
 }catch(e){await db.dispose();throw e;}
}
