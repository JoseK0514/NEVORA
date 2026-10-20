// New exact-a216 wrapper. The original generic cd preparation is preserved.
// No browser/preview launch; only the existing authorized serial worker calls it.
import assert from 'node:assert/strict';
import {readFile,readdir,realpath} from 'node:fs/promises';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function registerScopedCases(h){
 const manifest=JSON.parse(await readFile(new URL('./ack-pause-recovery-a216.json',import.meta.url),'utf8'));
 assert(['chromium','webkit'].includes(process.env.VERIFY_ENGINES),'Run one serial engine;8 cases perengine,16 total');
 assert.equal(process.env.VERIFY_SHA,manifest.sha);
 const source=await realpath(process.env.VERIFY_SOURCE),preview=await realpath(process.env.PREVIEW_OUT);
 const git=(...args)=>execFileSync('git',args,{cwd:source,encoding:'utf8'}).trim();
 assert.equal(git('rev-parse','HEAD'),manifest.sha);assert.equal(git('rev-parse','HEAD^{tree}'),manifest.tree);assert.equal(git('status','--porcelain','--untracked-files=no'),'');
 for(const [file,expected]of Object.entries(manifest.sourceFiles))assert.equal(digest(await readFile(join(source,file))),expected,'Actual recovery/detail/controller/view source differs: '+file);
 const original=new URL('./ack-pause-recovery.mjs',import.meta.url);
 assert.equal(digest(await readFile(original)),manifest.originalGenericSha256,'Original generic preparation changed');
 const run=(await readdir(preview)).filter(value=>value.startsWith('evidence-')).sort().at(-1),evidence=join(preview,run);
 const audit=JSON.parse(await readFile(join(evidence,'audit.json'),'utf8')),access=JSON.parse(await readFile(join(evidence,'access.json'),'utf8'));
 assert.equal(audit.checkpoint,manifest.sha);assert.equal(access.checkpoint,manifest.sha);assert(!audit.completedAt&&!audit.postgresStopped);assert(['127.0.0.1','localhost','[::1]'].includes(new URL(access.url).hostname));
 const fixture=JSON.parse(await readFile(join(evidence,'inspection-initial-fixture.json'),'utf8'));
 assert.equal(fixture.sourceImportSHA,manifest.sha);assert(fixture.initializedBeforeListen&&fixture.initialUpdateId);
 const {registerScopedCases:registerOriginal}=await import(original);
 await registerOriginal({...h,register:(name,ids,fn,options)=>h.register(name+'-a216',[...ids,'Exact-source a216 recovery lifecycle supplement'],async args=>{
  const {page,row}=args,role=row.account==='AUDIT-E'?'EMPLOYEE':'LEAD';
  const actor=fixture.actors.find(actor=>actor.id===row.account&&actor.role===role),grant=fixture.recipientGrants.find(value=>value.employee_id===row.account&&value.communication_id===fixture.initialUpdateId);
  if(!actor||!grant?.revision_id)throw Error('SETUP GAP: this fresh preview lacks the named own actor and initial update recipient grant');
  row.checkpoint=manifest.sha;row.previewEvidence=run;row.fullCdLedgerCredit=false;row.wrapperSha256=digest(await readFile(new URL(import.meta.url)));row.sourceBinding={sha:manifest.sha,tree:manifest.tree,sourceFiles:manifest.sourceFiles,originalGenericSha256:manifest.originalGenericSha256};
  await h.go(page,row,'/app/profile');
  await h.until(()=>page.locator('.employee-profile-details').evaluate(element=>[...element.querySelectorAll('dt')].find(node=>node.textContent?.trim()==='App access')?.nextElementSibling?.textContent?.trim()).then(value=>value===(role==='EMPLOYEE'?'Employee':'Lead')),'SETUP GAP: fresh actual own Profile role does not match the named fixture actor');
  row.actorReadback={id:actor.id,fixtureRole:actor.role,actualProfileRole:role==='EMPLOYEE'?'Employee':'Lead',initialUpdateId:fixture.initialUpdateId,initialGrantedRevisionId:grant.revision_id};
  const bindingReads=[];row.bindingReads=bindingReads;
  page.on('response',async response=>{
   if(response.request().method()!=='GET'||new URL(response.url()).pathname!=='/api/employee/communications/'+fixture.initialUpdateId)return;
   let value;try{value=await response.json();}catch{}
   if(value?.state==='ready')bindingReads.push({status:response.status(),id:value.id,revisionId:value.revisionId,contentHash:value.contentHash,authorityHash:typeof value.authority==='string'?h.hash(value.authority):null});
  });
  try{await fn(args);}
  finally{
   const command=row.operations?.find(value=>value.kind==='ACKNOWLEDGE'),first=bindingReads.find(value=>value.status===200);
   if(command&&first){
    h.check(row,first.id===fixture.initialUpdateId&&first.revisionId===grant.revision_id,'Actual ready read binds to this preview’s real own initial update grant',first);
    h.check(row,command.communicationId===first.id&&command.expectedRevisionId===first.revisionId&&command.contentHash===first.contentHash,'Actual held ACK uses the exact freshly read update/revision/content identity',{read:first,command:{kind:command.kind,communicationId:command.communicationId,expectedRevisionId:command.expectedRevisionId,contentHash:command.contentHash,operationId:command.operationId,commandHash:command.commandHash}});
    h.check(row,row.originalCommand?.authorityHash===first.authorityHash,'Actual held ACK authority matches the fresh authorized read',{commandAuthorityHash:row.originalCommand?.authorityHash,readAuthorityHash:first.authorityHash});
   }
   row.creditQualification='Fresh exact-a216 lifecycle proof only. Original cd source findings and complete exit remain independent. Pauses are browser offline and synthetic blur listener events, not a physical native-blur claim.';
  }
 },options)});
}
