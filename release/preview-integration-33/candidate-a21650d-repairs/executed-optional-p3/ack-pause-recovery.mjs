// Dedicated lifecycle probe. Missing recovery AFTER a confirmed fresh read is a product assertion, not a setup gap.
import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
export function registerScopedCases(h){
 h.register('scoped-p3-ack-unknown-private-pause',['communications/recovery.ts:4-6 intended command-lifetime contract'],async({page,context,row})=>{
  const preview=process.env.PREVIEW_OUT,run=(await readdir(preview)).filter(name=>name.startsWith('evidence-')).sort().at(-1);
  const fixture=JSON.parse(await readFile(join(preview,run,'inspection-initial-fixture.json'),'utf8'));
  if(fixture.sourceImportSHA!==process.env.VERIFY_SHA||!fixture.initializedBeforeListen||!fixture.initialUpdateId)throw Error('SETUP GAP: genuine initial communication receipt missing');
  const id=fixture.initialUpdateId,path='/api/employee/communications/'+id,reads=[];
  page.on('response',async response=>{
   if(new URL(response.url()).pathname!==path||response.request().method()!=='GET')return;
   let value;try{value=await response.json();}catch{}
   reads.push({path,status:response.status(),state:value?.state,id:value?.id,revisionId:value?.revisionId,authorityHash:typeof value?.authority==='string'?h.hash(value.authority):null});
  });
  await h.go(page,row,'/app/updates/'+id);
  await h.until(()=>reads.some(item=>item.status===200&&item.state==='ready'&&item.id===id),'SETUP GAP: actual own ready detail was never observed');
  const before=reads.at(-1),review=page.getByRole('checkbox',{name:'I have reviewed this update'});await review.check();
  const button=page.locator('section[aria-label="Your review status"]').getByRole('button',{name:'Acknowledge update',exact:true});
  const gate=await h.hold(page,h.post('/api/employee/communications'));
  await h.pending(page,row,gate,button,'ack-before-pause');await h.wait(3000);
  const command=gate.entries[0].body;
  if(command?.kind!=='ACKNOWLEDGE'||command.communicationId!==id||!command.operationId)throw Error('SETUP GAP: genuine own ACK command was not captured');
  row.originalCommand={kind:command.kind,communicationId:id,operationId:command.operationId,commandHash:h.hash(command),authorityHash:h.hash(command.authority)};
  const priorReads=reads.length;
  if(row.variant==='offline'){await context.setOffline(true);await page.evaluate(()=>window.dispatchEvent(new Event('offline')));}
  else await page.evaluate(()=>window.dispatchEvent(new Event('blur')));
  await h.wait(250);const paused=await h.evidence(page,row,'private-paused');
  h.check(row,await page.locator('article[data-update-revision]').count()===0,'Private pause removes protected ready article');
  // The server never receives this operation. The application still must conservatively retain an uncertain delivery.
  try{await gate.release(0);}catch(error){row.localAbortAfterClientCancellation=String(error).split('\n')[0];}
  if(row.variant==='offline'){await context.setOffline(false);await page.evaluate(()=>window.dispatchEvent(new Event('online')));}
  else await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
  await h.until(()=>reads.length>priorReads&&reads.at(-1).status===200&&reads.at(-1).state==='ready','SETUP GAP: no fresh actual authorized detail read after pause');
  const after=reads.at(-1);
  h.check(row,after.id===before.id&&after.revisionId===before.revisionId&&after.authorityHash===before.authorityHash,'Return binds to the same genuine update/revision/authority', {before,after});
  await page.locator('article[data-update-revision]').waitFor();await h.wait(250);
  const returned=await h.evidence(page,row,'fresh-authorized-return'),lookup=page.getByRole('button',{name:'Check status',exact:true});
  const offered=await lookup.count()>0;
  h.check(row,offered,'Uncertain ACK retains its original-operation Check status control after private content remount',{active:returned.active,text:returned.text});
  h.check(row,await page.getByRole('checkbox',{name:'I have reviewed this update'}).isDisabled(),'Uncertain ACK prevents a fresh operation while the original outcome is unknown');
  if(offered){
   const statusGate=await h.hold(page,request=>request.method()==='GET'&&new URL(request.url()).pathname.startsWith('/api/employee/communications/operations/'));
   await lookup.focus();await page.keyboard.press('Enter');await statusGate.wait(1);await h.wait(3000);
   h.check(row,statusGate.entries[0].path.endsWith('/'+command.operationId),'Actual lookup after return uses the complete original operation identity');
   await statusGate.release(0,200,{status:'outcome_unknown',operationId:command.operationId});await h.wait(250);await h.evidence(page,row,'same-operation-lookup-returned');row.lookups=statusGate.summary();
  }
  row.actualReads=reads;row.operations=gate.summary();row.localOnly=true;row.serverTransactionClaimed=false;
 },{accounts:['AUDIT-E','AUDIT-LEAD'],sizes:[[390,844,100],[320,844,200]],variants:['offline','blur']});
}
