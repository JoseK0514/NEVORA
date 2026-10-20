// Bounded repair-preview supplement. Does not launch a preview or browser.
// This module proves the pending/failure subset only, on its manifest's newer
// source; it never completes or substitutes any frozen-cd manual ledger row.
import assert from 'node:assert/strict';
import {readFile,readdir,realpath} from 'node:fs/promises';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function registerScopedCases(h){
 const manifest=JSON.parse(await readFile(new URL('./management-mark-read-a216.json',import.meta.url),'utf8'));
 const engine=process.env.VERIFY_ENGINES,source=await realpath(process.env.VERIFY_SOURCE),preview=await realpath(process.env.PREVIEW_OUT);
 assert(['chromium','webkit'].includes(engine),'Run exactly one engine at a time; manifest is12 Chromium plus4 WebKit rows');
 assert.equal(process.env.VERIFY_SHA,manifest.sha,'Supplement needs its explicitly frozen current repair source');
 const git=(...args)=>execFileSync('git',args,{cwd:source,encoding:'utf8'}).trim();
 assert.equal(git('rev-parse','HEAD'),manifest.sha);assert.equal(git('rev-parse','HEAD^{tree}'),manifest.tree);assert.equal(git('status','--porcelain','--untracked-files=no'),'');
 for(const [file,expected]of Object.entries(manifest.sourceFiles))assert.equal(digest(await readFile(join(source,file))),expected,'Source contract changed: '+file);
 const run=(await readdir(preview)).filter(name=>name.startsWith('evidence-')).sort().at(-1),evidence=join(preview,run);
 const audit=JSON.parse(await readFile(join(evidence,'audit.json'),'utf8')),access=JSON.parse(await readFile(join(evidence,'access.json'),'utf8'));
 assert.equal(audit.checkpoint,manifest.sha);assert.equal(access.checkpoint,manifest.sha);assert(!audit.completedAt&&!audit.postgresStopped);
 assert(['localhost','127.0.0.1','[::1]'].includes(new URL(access.url).hostname));
 const initial=JSON.parse(await readFile(join(evidence,'inspection-initial-fixture.json'),'utf8'));
 assert.equal(initial.sourceImportSHA,manifest.sha);assert(initial.initializedBeforeListen&&initial.notifications?.localOnly);
 const sizes=engine==='chromium'?[[320,844,100],[320,844,200],[390,844,100],[390,844,200],[844,390,100],[844,390,200]]:[[390,844,100],[390,844,200]];
 h.register('scoped-p3-management-mark-read-pending-failure',['Provisional notification Mark-read pending focus; measurement required','Source-authorized Manager/Owner action subset'],async({page,row})=>{
  const expectedRole=row.account==='AUDIT-M'?'MANAGER':'OWNER',actor=initial.actors.find(actor=>actor.id===row.account&&actor.role===expectedRole);
  if(!actor)throw Error('SETUP GAP: this preview has no fresh canonical matching management actor receipt');
  row.checkpoint=manifest.sha;row.previewEvidence=run;row.externalModuleHash=digest(await readFile(new URL(import.meta.url)));row.parentManifestHash=digest(await readFile(new URL('./management-mark-read-a216.json',import.meta.url)));
  row.fullCdLedgerCredit=false;row.scope='Pending/failure/retry/native-focus subset only; no authorization/success or full16-row cd completion credit';
  await h.go(page,row,'/app/profile');
  const details=page.locator('#profile-details');await details.waitFor();
  const visibleRole=await details.evaluate(element=>[...element.querySelectorAll('dt')].find(node=>node.textContent?.trim()==='Role')?.nextElementSibling?.textContent?.trim());
  if(visibleRole!==(expectedRole==='MANAGER'?'Manager':'Owner'))throw Error('SETUP GAP: fresh actual Profile identity does not match the named account role');
  row.actorReadback={fixtureActorId:actor.id,fixtureRole:actor.role,actualProfileRole:visibleRole,sourceInitializedBeforeListen:true};
  const path='/api/notifications',readTelemetry=[];let actual;
  page.on('response',async response=>{
   const request=response.request();if(request.method()!=='GET'||new URL(response.url()).pathname!==path)return;
   let value;try{value=await response.json();}catch{}
   const binding=request.headers()['x-nevora-employee-view'];
   const record={path,method:'GET',status:response.status(),state:value?.state,kind:value?.kind,observedAt:value?.observedAt,itemCount:Array.isArray(value?.items)?value.items.length:null,authorityHeaderHash:binding?h.hash(binding):null};readTelemetry.push(record);
   if(response.ok()&&value?.state==='ready'&&value.kind==='notifications'&&Array.isArray(value.items)&&binding)actual={value,authorityHeaderHash:record.authorityHeaderHash};
  });
  await h.go(page,row,'/app/notifications');
  await h.until(()=>!!actual,'SETUP GAP: fresh source-bound own Notifications ready200 was never observed');
  const ownedRows=initial.notifications.rows.filter(value=>value.employee_id===actor.id),ownedIds=new Set(ownedRows.map(value=>value.id));
  const target=actual.value.items.find(value=>value.reviewState==='unread'&&ownedIds.has(value.id));
  if(!target)throw Error('SETUP GAP: this actor has no genuine current unread item bound to its own fresh initial notification receipt');
  row.actualOwnRead={actorId:actor.id,role:actor.role,notificationId:target.id,href:target.href,reviewState:target.reviewState,actionState:target.actionState,authorityHeaderHash:actual.authorityHeaderHash,readTelemetry};
  const list=page.locator('[data-inbox-row]').filter({has:page.locator('a[href="'+target.href.replaceAll('"','\\"')+'"]')}),button=()=>list.getByRole('button',{name:/^Mark .+ read$/}).first();
  if(await list.count()!==1||await button().count()!==1)throw Error('SETUP GAP: actual own unread row/authorized Mark-read control is absent or ambiguous');
  await h.hydrated(button(),'onClick');
  const gate=await h.hold(page,h.post('/api/notifications/read'));
  row.interceptedOnly=true;row.serverMutationAttempted=false;row.commandIdentities=[];
  const inspect=(index,label)=>{
   const entry=gate.entries[index],request=entry.route.request(),body=entry.body,headers=request.headers();
   const identity={label,method:request.method(),path:new URL(request.url()).pathname,keys:body&&typeof body==='object'?Object.keys(body).sort():null,notificationId:body?.notificationId,commandHash:h.hash(body),authorityHeaderHash:headers['x-nevora-employee-view']?h.hash(headers['x-nevora-employee-view']):null,explicitReadHeader:headers['x-nevora-notification-read']};
   row.commandIdentities.push(identity);
   h.check(row,body&&Object.keys(body).length===1&&body.notificationId===target.id,label+': actual command names exactly the genuine own unread notification',identity);
   h.check(row,identity.authorityHeaderHash===actual.authorityHeaderHash&&identity.explicitReadHeader==='1',label+': actual mutation retains the just-authorized notification read binding',identity);
   return identity;
  };
  const feedback=()=>page.locator('[data-private-view=notifications] > p[role=status]').filter({hasText:/confirm.*read status|mark.*read|Marked read/i}).first();
  const settle=async label=>{
   let offered=false;
   for(let attempt=0;attempt<60;attempt++){
    const control=button();if(await control.count()&&await control.isEnabled()&&await control.getAttribute('aria-disabled')!=='true'){offered=true;break;}await h.wait(50);
   }
   h.check(row,offered,label+': confirmed local failure restores the actual Mark-read recovery control');
   const present=await feedback().count()>0;h.check(row,present,label+': confirmed failure renders actual read-status feedback');
   await h.evidence(page,row,label+'-settled');
   if(present)await h.assertRevealed(page,row,feedback(),label+'-feedback');
   return offered;
  };
  const firstIndex=gate.count;await h.pending(page,row,gate,button(),'mark-read-first');await h.wait(3000);
  const first=inspect(firstIndex,'first');h.check(row,gate.count===firstIndex+1,'Entire held3s pending interval contains one actual command');await h.evidence(page,row,'mark-read-held3s');
  await gate.release(firstIndex);const canRetry=await settle('first-local-failure');
  h.check(row,await list.locator('a[data-unread=true]').count()===1,'Browser-local failure retains the actual unread row without a server write');
  if(canRetry){
   const secondIndex=gate.count;await h.pending(page,row,gate,button(),'mark-read-same-item-retry');await h.wait(3000);const second=inspect(secondIndex,'retry');
   h.check(row,second.commandHash===first.commandHash&&second.notificationId===first.notificationId,'Retry uses the complete same real notification intent; this contract has no operationId',{first,second});
   h.check(row,gate.count===secondIndex+1,'Second held3s pending interval contains one actual command');
   await page.evaluate(()=>window.scrollTo(0,0));await gate.release(secondIndex);await settle('second-local-failure');
  }
  row.operations=gate.summary();row.actualReadResponses=readTelemetry;row.localReplies='Captured commands were aborted locally. None continued to the server.';
 },{accounts:['AUDIT-M','QAOWNER'],sizes});
}
