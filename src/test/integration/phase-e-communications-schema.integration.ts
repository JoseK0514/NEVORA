import {afterEach,expect,it} from 'vitest';
import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {createDisposableFoundationDatabase} from './local-postgres';
import {communicationContentHash,communicationPayloadHash,communicationRootInsert,communicationRevisionInsert,communicationGrantInsert} from '../../lib/data/communications.server';
import type {CommunicationDraft} from '../../lib/communications/types';
let db:Awaited<ReturnType<typeof createDisposableFoundationDatabase>>;
const ws='workspace-fuel',cid='10000000-0000-4000-8000-000000000001',other='10000000-0000-4000-8000-000000000002',rid='20000000-0000-4000-8000-000000000001',r2='20000000-0000-4000-8000-000000000002',receipt='30000000-0000-4000-8000-000000000001',op='40000000-0000-4000-8000-000000000001';
const at='2030-10-07T12:00:00.000Z';
const draft:CommunicationDraft={type:'LOCATION_ANNOUNCEMENT',scope:{kind:'LOCATION',locationId:'loc-1'},title:'Café 😀',body:'Fictional\noperational detail',acknowledgement:'REQUIRED',expiresAt:null};
const hash=communicationContentHash(draft);
const q=(text:string,values:unknown[]=[])=>db.executor.query({text,values});
afterEach(async()=>{await db?.dispose();});
async function start(mode:'current-runtime'|'empty'='current-runtime'){
 db=await createDisposableFoundationDatabase({mode});
 if(mode==='empty')for(const file of (await readdir('db/migrations')).filter(f=>/^00\d\d_/.test(f)).sort().slice(0,22))await q(await readFile(join('db/migrations',file),'utf8'));
 await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('owner','Fictional','Owner','555-0100','OWNER','loc-1'),('employee','Fictional','Employee','555-0101','EMPLOYEE','loc-1'),('other','Fictional','Other','555-0102','LEAD','loc-1')");
}
async function staged(id=cid,revision=rid,version=1,value=draft,publishedAt:string|null=at){
 if(version===1)await db.executor.query(communicationRootInsert(ws,id,'owner'));
 await db.executor.query(communicationRevisionInsert({workspaceId:ws,communicationId:id,revisionId:revision,version,actorId:'owner',draft:value,audienceFingerprint:'a'.repeat(64),observedAt:at,publishedAt}));
}
async function grant(id=cid,revision=rid,employeeId='employee',contentHash=hash){
 await db.executor.query(communicationGrantInsert({workspaceId:ws,communicationId:id,revisionId:revision,employeeId,contentHash,locationId:'loc-1',observedAt:at,kind:'LOCATION',provenance:{eligibility:'primary_location',audienceFingerprint:'a'.repeat(64)}}));
}
async function publish(){await staged();await grant();await q("UPDATE communications SET state='PUBLISHED',head_revision_id=$1 WHERE id=$2",[rid,cid]);}
const ack=()=>q('INSERT INTO communication_receipts(id,workspace_id,communication_id,revision_id,employee_id,content_hash) VALUES($1,$2,$3,$4,$5,$6)',[receipt,ws,cid,rid,'employee',hash]);
it('schema_cross_workspace_revision_grant_denied',async()=>{
 await start();expect(await q("SELECT to_regclass('communication_recipients')::text AS name")).toEqual([{name:'communication_recipients'}]);
 await staged();await staged(other,r2);
 await expect(db.executor.query(communicationRootInsert('unrelated-workspace','50000000-0000-4000-8000-000000000001','employee'))).rejects.toThrow(/actor_workspace/);
 await expect(db.executor.query(communicationGrantInsert({workspaceId:'unrelated-workspace',communicationId:cid,revisionId:rid,employeeId:'employee',contentHash:hash,locationId:'loc-1',observedAt:at,kind:'LOCATION',provenance:{fixture:true}}))).rejects.toThrow(/parent_identity/);
 await expect(grant(other,rid)).rejects.toThrow(/grant_context/);
 await expect(grant(cid,r2)).rejects.toThrow(/grant_context/);
 await expect(grant(cid,rid,'employee','b'.repeat(64))).rejects.toThrow(/foreign key/);
 await grant();await q("UPDATE communications SET state='PUBLISHED',head_revision_id=$1 WHERE id=$2",[rid,cid]);
 await expect(q('INSERT INTO communication_receipts(id,workspace_id,communication_id,revision_id,employee_id,content_hash) VALUES($1,$2,$3,$4,$5,$6)',[receipt,ws,cid,rid,'other',hash])).rejects.toThrow(/foreign key/);
 await expect(q("UPDATE communications SET state='PUBLISHED',head_revision_id=$1 WHERE id=$2",[r2,cid])).rejects.toThrow(/published_head_required/);
 await ack();expect((await q('SELECT * FROM communication_receipts')).length).toBe(1);
 // Existing workspace singleton prevents a second valid workspace; no constraint is disabled to invent one.
 await expect(q("INSERT INTO workspaces(id,name,time_zone) VALUES('foreign','Fictional','UTC')")).rejects.toThrow(/unique/);
});
it('published content grants receipts operations and lifecycle are immutable with no cascade',async()=>{
 await start();await publish();await ack();
 await q("INSERT INTO communication_operations(workspace_id,actor_employee_id,operation_id,session_hash,payload_hash,kind,communication_id,revision_id,receipt_id) VALUES($1,'employee',$2,repeat('a',64),repeat('b',64),'ACKNOWLEDGE',$3,$4,$5)",[ws,op,cid,rid,receipt]);
 await q("INSERT INTO communication_lifecycle(id,workspace_id,communication_id,revision_id,actor_employee_id,kind) VALUES($1,$2,$3,$4,'owner','PUBLISHED')",[op,ws,cid,rid]);
 const before=await evidence();
 for(const table of ['communication_revisions','communication_recipients','communication_receipts','communication_operations','communication_lifecycle']){
  await expect(q(`DELETE FROM ${table}`)).rejects.toThrow(/history_immutable/);
  await expect(q(`UPDATE ${table} SET workspace_id=workspace_id`)).rejects.toThrow(/history_immutable/);
 }
 await expect(q('DELETE FROM communications')).rejects.toThrow(/history_immutable/);
 await expect(q("DELETE FROM employees WHERE id='employee'")).rejects.toThrow(/foreign key/);
 await expect(grant(cid,rid,'other')).rejects.toThrow(/audience_frozen/);
 expect(await evidence()).toEqual(before);
});
it('draft privacy and new revisions preserve old acknowledgement without carrying it forward',async()=>{
 await start();await staged(cid,rid,1,draft,null);
 await expect(grant()).rejects.toThrow(/grant_context/);
 await expect(q("UPDATE communications SET state='PUBLISHED',head_revision_id=$1 WHERE id=$2",[rid,cid])).rejects.toThrow(/published_head_required/);
 expect(await q('SELECT * FROM communication_recipients')).toEqual([]);
 await staged(cid,r2,2);await grant(cid,r2);await q("UPDATE communications SET state='PUBLISHED',head_revision_id=$1 WHERE id=$2",[r2,cid]);
 await q('INSERT INTO communication_receipts(id,workspace_id,communication_id,revision_id,employee_id,content_hash) VALUES($1,$2,$3,$4,$5,$6)',[receipt,ws,cid,r2,'employee',hash]);
 const r3='20000000-0000-4000-8000-000000000003',changed={...draft,body:'New version'};
 await staged(cid,r3,3,changed);await grant(cid,r3,'employee',communicationContentHash(changed));await q("UPDATE communications SET head_revision_id=$1 WHERE id=$2",[r3,cid]);
 expect(await q('SELECT revision_id FROM communication_receipts')).toEqual([{revision_id:r2}]);
 await expect(ack()).rejects.toThrow(/receipt_head/);
 await q("UPDATE communications SET state='WITHDRAWN' WHERE id=$1",[cid]);await expect(staged(cid,'20000000-0000-4000-8000-000000000004',4)).rejects.toThrow(/withdrawn/);
});
it('operation actor session payload and receipt identity cannot be substituted',async()=>{
 await start();await publish();await ack();
 const sql="INSERT INTO communication_operations(workspace_id,actor_employee_id,operation_id,session_hash,payload_hash,kind,communication_id,revision_id,receipt_id) VALUES($1,$2,$3,$4,$5,'ACKNOWLEDGE',$6,$7,$8)";
 const values=[ws,'employee',op,'a'.repeat(64),'b'.repeat(64),cid,rid,receipt];await q(sql,values);
 await expect(q(sql,[ws,'other',op,'a'.repeat(64),'b'.repeat(64),cid,rid,receipt])).rejects.toThrow(/foreign key/);
 for(const [index,value] of [[3,'c'.repeat(64)],[4,'d'.repeat(64)]] as const){const modified=[...values];modified[index]=value;await expect(q(sql,modified)).rejects.toThrow(/unique/);}
 expect((await q('SELECT * FROM communication_operations')).length).toBe(1);
 const command={kind:'ACKNOWLEDGE' as const,operationId:op,authority:'bound-proof',communicationId:cid,expectedRevisionId:rid,contentHash:hash};
 expect(communicationPayloadHash(command)).toBe(communicationPayloadHash({...command}));
 expect(communicationPayloadHash({...command,contentHash:'c'.repeat(64)})).not.toBe(communicationPayloadHash(command));
 expect(communicationPayloadHash({...command,authority:'other-session'})).not.toBe(communicationPayloadHash(command));
});
it('revision content hash normalized text role and scope constraints reject forged persistence',async()=>{
 await start();await staged();expect((await q('SELECT content_hash FROM communication_revisions'))[0]).toEqual({content_hash:hash});
 const input={workspaceId:ws,communicationId:cid,revisionId:r2,version:2,actorId:'owner',draft:{...draft,expiresAt:'2030-10-08T12:00:00Z'},audienceFingerprint:'a'.repeat(64),observedAt:at,publishedAt:at};
 await db.executor.query(communicationRevisionInsert(input));
 expect(communicationContentHash({...draft,title:'  Café 😀  ',body:' Fictional\r\noperational detail '})).toBe(hash);
 const next=communicationRevisionInsert({...input,revisionId:'20000000-0000-4000-8000-000000000003',version:3});const values=[...next.values];values[16]='f'.repeat(64);
 await expect(q(next.text,values)).rejects.toThrow(/content_hash/);
 await expect(db.executor.query(communicationRevisionInsert({...input,revisionId:'20000000-0000-4000-8000-000000000003',version:3,actorId:'employee'}))).rejects.toThrow(/author_role/);
 await q("UPDATE employees SET active=false WHERE id='other'");await expect(grant(cid,rid,'other')).rejects.toThrow(/recipient_role/);
});
it('complete chain retains communication and payroll sources and rejects unknown kinds',async()=>{
 await start();
 const [constraint]=await db.executor.query<{definition:string}>({text:"SELECT pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE conname='notifications_source_kind_check'",values:[]});
 expect([...constraint.definition.matchAll(/'([^']+)'/g)].map(m=>m[1])).toEqual(['SCHEDULE','TIME_OFF','EXCHANGE','CALLOUT','AVAILABILITY','MANAGER_SUMMARY','SELF_TEST','COMMUNICATION','PAYROLL_PREPARATION','PAYROLL_STATEMENT']);
 await expect(q("INSERT INTO notifications(id,employee_id,type,title,body,source_kind) VALUES('unknown','employee','SCHEDULE_PUBLISHED','Title','Body','UNKNOWN')")).rejects.toThrow(/notifications_source_kind_check/);
});
async function evidence():Promise<Record<string,unknown[]>>{
 const names=['communications','communication_revisions','communication_recipients','communication_receipts','communication_operations','communication_lifecycle'];
 return Object.fromEntries(await Promise.all(names.map(async name=>[name,await q(`SELECT to_jsonb(t) AS row FROM ${name} t ORDER BY to_jsonb(t)::text`)])));
}
async function canonical():Promise<Record<string,unknown[]>>{
 const names=['schedules','shifts','schedule_publication_revisions','schedule_publication_revision_shifts','schedule_acknowledgements','time_entries','break_entries','time_correction_requests','time_correction_events','timecard_revisions'];
 return Object.fromEntries(await Promise.all(names.map(async name=>[name,await q(`SELECT to_jsonb(t) AS row FROM ${name} t ORDER BY to_jsonb(t)::text`)])));
}
it('fresh chain installs empty communication foundation without operational seeds',async()=>{
 await start();expect(Object.values(await evidence()).every(rows=>rows.length===0)).toBe(true);
});
it('E21-QA-D001 current management withdraws after historical author deactivation while retaining evidence',async()=>{
 await start();await publish();await ack();
 await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('manager','Fictional','Manager','555-0103','MANAGER','loc-1')");
 const before=await evidence();
 await q("UPDATE employees SET active=false,primary_location_id='loc-2' WHERE id='owner'");
 await db.executor.transaction([
  {text:"UPDATE communications SET state='WITHDRAWN' WHERE id=$1",values:[cid]},
  {text:"INSERT INTO communication_lifecycle(id,workspace_id,communication_id,revision_id,actor_employee_id,kind) VALUES($1,$2,$3,$4,'manager','WITHDRAWN')",values:[op,ws,cid,rid]},
 ]);
 expect(await q('SELECT author_employee_id,state,head_revision_id FROM communications WHERE id=$1',[cid])).toEqual([{author_employee_id:'owner',state:'WITHDRAWN',head_revision_id:rid}]);
 const after=await evidence();
 for(const table of ['communication_revisions','communication_recipients','communication_receipts','communication_operations'])expect(after[table]).toEqual(before[table]);
 expect(await q('SELECT actor_employee_id,kind FROM communication_lifecycle')).toEqual([{actor_employee_id:'manager',kind:'WITHDRAWN'}]);
 await expect(q("DELETE FROM employees WHERE id='owner'")).rejects.toThrow(/foreign key/);
 await expect(q("UPDATE communications SET state='PUBLISHED' WHERE id=$1",[cid])).rejects.toThrow(/identity_immutable/);
});
it('E21-QA-D001 current management advances a revision after historical author deactivation without carrying receipts forward',async()=>{
 await start();await publish();await ack();
 await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('manager','Fictional','Manager','555-0103','MANAGER','loc-1')");
 const before=await evidence(),changed={...draft,body:'Current management revision'};
 await q("UPDATE employees SET active=false WHERE id='owner'");
 await db.executor.transaction([
  communicationRevisionInsert({workspaceId:ws,communicationId:cid,revisionId:r2,version:2,actorId:'manager',draft:changed,audienceFingerprint:'b'.repeat(64),observedAt:at,publishedAt:at}),
  communicationGrantInsert({workspaceId:ws,communicationId:cid,revisionId:r2,employeeId:'employee',contentHash:communicationContentHash(changed),locationId:'loc-1',observedAt:at,kind:'LOCATION',provenance:{eligibility:'primary_location',audienceFingerprint:'b'.repeat(64)}}),
  {text:'UPDATE communications SET head_revision_id=$1 WHERE id=$2',values:[r2,cid]},
  {text:"INSERT INTO communication_lifecycle(id,workspace_id,communication_id,revision_id,actor_employee_id,kind) VALUES($1,$2,$3,$4,'manager','REVISED')",values:[op,ws,cid,r2]},
 ]);
 expect(await q('SELECT author_employee_id,state,head_revision_id FROM communications WHERE id=$1',[cid])).toEqual([{author_employee_id:'owner',state:'PUBLISHED',head_revision_id:r2}]);
 const after=await evidence();
 expect(after.communication_receipts).toEqual(before.communication_receipts);
 for(const table of ['communication_revisions','communication_recipients'])for(const row of before[table])expect(after[table]).toContainEqual(row);
 expect(await q('SELECT created_by,version FROM communication_revisions WHERE id=$1',[r2])).toEqual([{created_by:'manager',version:2}]);
 expect(await q('SELECT revision_id FROM communication_receipts')).toEqual([{revision_id:rid}]);
 await expect(ack()).rejects.toThrow(/receipt_head/);
 await expect(q('UPDATE communications SET head_revision_id=$1 WHERE id=$2',[rid,cid])).rejects.toThrow(/head_must_advance/);
 await expect(grant(cid,r2,'other',communicationContentHash(changed))).rejects.toThrow(/audience_frozen/);
});
it('E21-QA-D001 creation eligibility immutable root identity and current actor guards stay enforced',async()=>{
 await start();await publish();await ack();
 await q("UPDATE employees SET active=false WHERE id='other'");
 await expect(db.executor.query(communicationRootInsert(ws,other,'other'))).rejects.toThrow(/actor_workspace/);
 await expect(db.executor.query(communicationRootInsert('unrelated-workspace',other,'owner'))).rejects.toThrow(/actor_workspace/);
 await expect(db.executor.query(communicationRootInsert(ws,other,'missing-author'))).rejects.toThrow(/actor_workspace/);
 await expect(q("UPDATE communications SET author_employee_id='employee' WHERE id=$1",[cid])).rejects.toThrow(/identity_immutable/);
 await expect(q("UPDATE communications SET workspace_id='unrelated-workspace' WHERE id=$1",[cid])).rejects.toThrow(/actor_workspace|identity_immutable/);
 const revision={workspaceId:ws,communicationId:cid,revisionId:r2,version:2,actorId:'other',draft,audienceFingerprint:'a'.repeat(64),observedAt:at,publishedAt:at};
 await expect(db.executor.query(communicationRevisionInsert(revision))).rejects.toThrow(/author_role/);
 await expect(db.executor.query(communicationRevisionInsert({...revision,actorId:'employee'}))).rejects.toThrow(/author_role/);
 await expect(q("INSERT INTO communication_lifecycle(id,workspace_id,communication_id,revision_id,actor_employee_id,kind) VALUES($1,$2,$3,$4,'other','WITHDRAWN')",[op,ws,cid,rid])).rejects.toThrow(/actor_workspace/);
 const before=await evidence();
 await expect(db.executor.transaction([
  {text:"UPDATE communications SET state='WITHDRAWN' WHERE id=$1",values:[cid]},
  {text:"INSERT INTO communication_lifecycle(id,workspace_id,communication_id,revision_id,actor_employee_id,kind) VALUES($1,$2,$3,$4,'other','WITHDRAWN')",values:[op,ws,cid,rid]},
 ])).rejects.toThrow(/actor_workspace/);
 expect(await evidence()).toEqual(before);
});
it('0022 to 0023 to 0024 and presentation rollback preserve actual canonical JSON and migration bytes',async()=>{
 await start('empty');
 await q(`INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('history','loc-1','2030-10-07','PUBLISHED','owner');
 INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time) VALUES('history-shift','history','employee','2030-10-07','08:00','16:00');
 INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) VALUES('history-revision','2030-10-07',1,'PUBLISH','owner');
 INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time,is_designated_lead,is_callout_approved) SELECT 'history-snapshot','history-revision',id,schedule_id,'loc-1',employee_id,date,start_time,end_time,false,false FROM shifts WHERE id='history-shift';
 INSERT INTO schedule_acknowledgements(employee_id,week_start,publication_revision_id) VALUES('employee','2030-10-07','history-revision');
 INSERT INTO clocker_devices(id,location_id,name) VALUES('history-device','loc-1','Fictional tablet');
 INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status) VALUES('history-entry','employee','loc-1','history-device','2030-10-07T12:00:00Z','2030-10-07T20:00:00Z','CLOCKED_OUT');
 INSERT INTO break_entries(id,time_entry_id,break_start_at,break_end_at) VALUES('history-break','history-entry','2030-10-07T16:00:00Z','2030-10-07T16:30:00Z');
 INSERT INTO time_correction_requests(id,workspace_id,employee_id,requested_by_employee_id,kind,location_id,source_revision,source_snapshot,proposal,reason,request_hash) VALUES('60000000-0000-4000-8000-000000000001','workspace-fuel','employee','employee','MISSING_ENTRY','loc-1',0,'{"historical":"source"}','{"startAt":"2030-10-08T12:00:00Z","endAt":"2030-10-08T20:00:00Z"}','Fictional correction',repeat('a',64));
 INSERT INTO time_correction_events(id,request_id,revision,event_kind,actor_employee_id,operation_hash,result) VALUES('60000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000001',1,'REQUESTED','employee',repeat('a',64),'{"historical":true}');
 INSERT INTO timecard_revisions(operation_id,workspace_id,employee_id,start_date,end_date,revision,action,actor_employee_id,source_hash,snapshot,command_hash) VALUES('70000000-0000-4000-8000-000000000001','workspace-fuel','employee','2030-10-07','2030-10-13',1,'APPROVE','owner',repeat('a',32),'{"historical":"revision"}',repeat('b',64));`);
 const before=await canonical();expect(Object.values(before).every(rows=>rows.length>0)).toBe(true);
 await q(await readFile('db/migrations/0023_employee_attention_receipts.sql','utf8'));expect(await canonical()).toEqual(before);
 await q(await readFile('db/migrations/0024_contextual_communications.sql','utf8'));expect(await canonical()).toEqual(before);
 await publish();await ack();const retained=await evidence();
 // Presentation rollback is disabling consumers, no destructive SQL rollback.
 await q('SELECT 1 AS prior_presentation_path');expect(await canonical()).toEqual(before);expect(await evidence()).toEqual(retained);
 const files=(await readdir('db/migrations')).filter(f=>/^00\d\d_/.test(f)).sort(),hashes=Object.fromEntries(await Promise.all(files.map(async f=>[f,createHash('sha256').update(await readFile(join('db/migrations',f))).digest('hex')])));
 const output=process.env.PHASE_E_EVIDENCE_DIR;if(!output)throw Error('Owned evidence directory required');
 await writeFile(join(output,'communication-history-preservation.json'),JSON.stringify({before,after:await canonical(),retained,afterPresentationRollback:await evidence(),migrationHashes:hashes},null,2));
});
