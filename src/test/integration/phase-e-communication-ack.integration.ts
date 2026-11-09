import {readFile} from 'node:fs/promises';
import {afterEach,beforeEach,expect,it} from 'vitest';
import {randomUUID} from 'node:crypto';
import {createDisposableFoundationDatabase} from './local-postgres';
import {previewCommunicationAudience,executeCommunicationCommand,readCommunication,findCommunicationOperation,communicationAuthority,recordCommunicationRead} from '../../lib/communications/service.server';
import type {CommunicationDraft,CommunicationCommand} from '../../lib/communications/types';
import type {SessionMutationProof} from '../../lib/shift-changes/types';
import type {SqlExecutor} from '../../lib/notifications/types';
let db:Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
const owner:SessionMutationProof={employee:{id:'owner',firstName:'Fictional',lastName:'Owner',role:'OWNER',primaryLocationId:'loc-1'},sessionTokenHash:'a'.repeat(64)};
const employee:SessionMutationProof={employee:{id:'employee',firstName:'Fictional',lastName:'Self',role:'EMPLOYEE',primaryLocationId:'loc-1'},sessionTokenHash:'b'.repeat(64)};
const draft:CommunicationDraft={type:'LOCATION_ANNOUNCEMENT',scope:{kind:'LOCATION',locationId:'loc-1'},title:'Fictional update',body:'Full operational content.',acknowledgement:'REQUIRED',expiresAt:null};
const q=(text:string,values:unknown[]=[])=>db.executor.query({text,values});
async function published(value=draft){
 const p=await previewCommunicationAudience(owner,value,db.executor);if(p.state!=='ready')throw Error('No preview');
 const result=await executeCommunicationCommand(owner,{kind:'PUBLISH',operationId:randomUUID(),authority:p.authority,draft:value,audienceFingerprint:p.fingerprint},db.executor);if(result.status!=='committed')throw Error('No publish');
 const read=await readCommunication(employee,result.id,db.executor);if(read.state!=='ready')throw Error('No read');
 const command:Extract<CommunicationCommand,{kind:'ACKNOWLEDGE'}>={kind:'ACKNOWLEDGE',operationId:randomUUID(),authority:read.authority,communicationId:read.id,expectedRevisionId:read.revisionId,contentHash:read.contentHash};
 return {read,command};
}
beforeEach(async()=>{
 db=await createDisposableFoundationDatabase({mode:'current-runtime'});
 await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('owner','Fictional','Owner','555-0100','OWNER','loc-1'),('employee','Fictional','Self','555-0101','EMPLOYEE','loc-1')");
 for(const p of [owner,employee])await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES($1,$2,clock_timestamp()+interval '1 day')",[p.sessionTokenHash,p.employee.id]);

 // Explicit current Company schema; intended actors are already seeded.
 for(const file of ['0031_native_payroll.sql','0032_company_access_invitations.sql'])await q(await readFile('db/migrations/'+file,'utf8'));
});
afterEach(async()=>{await db?.dispose();});
it('ack revision hash employee exact; duplicates retain original timestamp',async()=>{
 const {command,read}=await published();expect(await q('SELECT * FROM communication_receipts')).toEqual([]);
 const r=await executeCommunicationCommand(employee,command,db.executor);expect(r).toMatchObject({status:'committed'});
 const before=await q('SELECT * FROM communication_receipts');expect(before).toHaveLength(1);
 expect(await executeCommunicationCommand(employee,command,db.executor)).toEqual(r);
 expect(await executeCommunicationCommand(employee,{...command,operationId:randomUUID()},db.executor)).toMatchObject({status:'committed'});expect(await q('SELECT * FROM communication_receipts')).toEqual(before);
 expect(await readCommunication(employee,read.id,db.executor)).toMatchObject({state:'ready',ownAcknowledgedAt:expect.any(String)});
 expect(await executeCommunicationCommand(employee,{...command,contentHash:'f'.repeat(64)},db.executor)).toMatchObject({status:'conflict'});
 expect(await executeCommunicationCommand(owner,{...command,authority:communicationAuthority(owner),operationId:randomUUID()},db.executor)).toMatchObject({status:'blocked'});
});
it.each(['REVISE','WITHDRAW'] as const)('ack versus %s has one order and old receipt never completes latest',async kind=>{
 const {read,command}=await published(),changed={...draft,body:'A new version'};const p=await previewCommunicationAudience(owner,changed,db.executor);if(p.state!=='ready')throw Error('No preview');
 const other:CommunicationCommand=kind==='WITHDRAW'?{kind,operationId:randomUUID(),authority:p.authority,communicationId:read.id,expectedRevisionId:read.revisionId}:{kind,operationId:randomUUID(),authority:p.authority,communicationId:read.id,expectedRevisionId:read.revisionId,draft:changed,audienceFingerprint:p.fingerprint};
 const [ack,mutation]=await Promise.all([executeCommunicationCommand(employee,command,db.executor),executeCommunicationCommand(owner,other,db.executor)]);
 expect(['committed','conflict']).toContain(ack.status);expect(mutation.status).toBe('committed');
 const current=await readCommunication(employee,read.id,db.executor);if(kind==='WITHDRAW')expect(current).toMatchObject({state:'withdrawn'});else expect(current).toMatchObject({state:'ready',ownAcknowledgedAt:null,body:'A new version'});
 expect(await executeCommunicationCommand(employee,{...command,operationId:randomUUID()},db.executor)).toMatchObject({status:'conflict'});
});
it('explicit optional read never creates acknowledgement and required review cannot be dismissed',async()=>{
 const required=await published();const make=(r:typeof required.read)=>({kind:'MARK_READ' as const,operationId:randomUUID(),authority:r.authority,ref:{kind:'COMMUNICATION' as const,id:r.id,version:r.revisionId}});
 expect(await recordCommunicationRead(employee,make(required.read),db.executor)).toMatchObject({status:'blocked'});
 const optional=await published({...draft,acknowledgement:'OPTIONAL'}),c=make(optional.read);
 expect(await recordCommunicationRead(employee,c,db.executor)).toMatchObject({status:'committed'});expect(await q('SELECT * FROM communication_receipts')).toEqual([]);
 const before=await q('SELECT * FROM employee_attention_receipts');expect(before).toHaveLength(1);
 expect(await recordCommunicationRead(employee,c,db.executor)).toMatchObject({status:'committed'});expect(await q('SELECT * FROM employee_attention_receipts')).toEqual(before);
 expect(await readCommunication(employee,optional.read.id,db.executor)).toMatchObject({state:'ready',ownReadAt:expect.any(String),ownAcknowledgedAt:null});
 expect(await findCommunicationOperation(employee,c.operationId,c.authority,db.executor)).toMatchObject({status:'committed'});
});
it('lost acknowledgement result recovers original operation without repeating receipt',async()=>{
 const {command}=await published();let lost=false;
 const ex:SqlExecutor={...db.executor,transaction:async(s,signal)=>{const r=await db.executor.transaction(s,signal);if(!lost&&s.some(x=>x.text.startsWith('INSERT INTO communication_operations'))){lost=true;throw Error('fixture response lost');}return r;}};
 expect(await executeCommunicationCommand(employee,command,ex)).toMatchObject({status:'outcome_unknown'});
 expect(await findCommunicationOperation(employee,command.operationId,command.authority,db.executor)).toMatchObject({status:'committed'});expect((await q('SELECT * FROM communication_receipts')).length).toBe(1);
});
it('replaced session and revoked location cannot acknowledge old displayed content',async()=>{
 const {command}=await published();await q("INSERT INTO employee_sessions(token_hash,employee_id,expires_at) VALUES(repeat('c',64),'employee',now()+interval '1 day')");
 expect(await executeCommunicationCommand({...employee,sessionTokenHash:'c'.repeat(64)},command,db.executor)).toMatchObject({status:'blocked'});
 await q("UPDATE employees SET primary_location_id='loc-2' WHERE id='employee'");expect(await executeCommunicationCommand(employee,command,db.executor)).toMatchObject({status:'blocked'});expect(await q('SELECT * FROM communication_receipts')).toEqual([]);
});
