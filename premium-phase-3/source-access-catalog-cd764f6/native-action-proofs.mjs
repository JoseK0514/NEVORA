// Inert registrations. These prove actual local Flight decoding/UI, never a server transaction.
import {readFile,readdir} from 'node:fs/promises';
import {join} from 'node:path';
import {readHeldNativeFields,fulfillHeldNativeResult,fulfillHeldNativeRedirect} from './native-action-replies.mjs';
async function ownPending(account){
  const preview=process.env.PREVIEW_OUT,run=(await readdir(preview)).filter(name=>name.startsWith('evidence-')).sort().at(-1);
  let manifest;
  try{manifest=JSON.parse(await readFile(join(preview,run,'initial-own-withdrawal-fixture.json'),'utf8'));}
  catch(error){if(error.code!=='ENOENT')throw error;manifest=JSON.parse(await readFile(join(preview,run,'phase3-entry-initial-fixture.json'),'utf8'));}
  if(manifest.checkpoint!==process.env.VERIFY_SHA||!manifest.initializedBeforeListen)throw Error('SETUP GAP: current initial-only withdrawal fixture receipt missing');
  const actor=manifest.actors.find(actor=>actor.account===account),id=actor?.requestId??actor?.pendingWithdrawal?.requestId;
  if(!id||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id))throw Error('SETUP GAP: genuine own pending UUIDv4 missing');
  return id;
}
export function registerScopedCases(h){
  const {register,go,hold,pending,check,evidence,assertRevealed,until,wait,hydrated}=h;
  const sizes=[[390,844,100],[320,844,200]];
  register('scoped-p3-native-withdrawal-decided',['Native Flight structured-result prerequisite'],async({page,row})=>{
    const id=await ownPending(row.account);row.fixtureRequestId=id;
    await go(page,row,'/app/requests?tab=my');
    const form=page.locator('form[aria-label^="Withdraw request for "]').filter({has:page.locator('input[name="requestId"][value="'+id+'"]')});
    if(await form.count()!==1)throw Error('SETUP GAP: genuine own pending withdrawal form missing');
    await page.locator('details.nto-withdrawal').filter({has:form}).locator(':scope > summary').click();
    await form.getByRole('checkbox').check();
    const button=form.getByRole('button',{name:'Withdraw request',exact:true});await hydrated(button);
    const gate=await hold(page,h.action);
    await pending(page,row,gate,button,'native-withdrawal');await wait(3000);
    const fields=await readHeldNativeFields(gate,0,h.baseUrl);
    if(fields.requestId!==id||fields.operationId!=='TIME_OFF_WITHDRAW:'+id||fields.confirmed!=='yes')throw Error('SETUP GAP: intercepted native action does not contain the genuine confirmed immutable request');
    row.nativeFlight={localOnly:true,requestMatched:true,requestId:id,outcome:row.variant,decodedDecidedUI:false,serverTransactionClaimed:false};
    const result=row.variant==='withdrawn'?{outcome:'withdrawn',receipt:{requestId:id,operationId:fields.operationId,status:'CANCELLED',reviewedBy:row.account,reviewedAt:new Date().toISOString()}}:{outcome:'conflict'};
    const observed=page.waitForResponse(response=>new URL(response.url()).pathname===gate.entries[0].path&&response.request().method()==='POST'&&!!response.request().headers()['next-action']);
    await fulfillHeldNativeResult(gate,0,h.baseUrl,result);
    const response=await observed;row.nativeFlight.response={path:new URL(response.url()).pathname,status:response.status(),contentType:response.headers()['content-type']};
    check(row,response.status()===200&&response.headers()['content-type']?.startsWith('text/x-component'),'Actual held native operation received a local Flight result');
    const receipt=form.locator('p[role="status"]'),expected=row.variant==='withdrawn'?'Your request was withdrawn.':'This request can no longer be withdrawn.';
    await until(async()=>await receipt.count()===1&&(await receipt.innerText()).includes(expected),'SETUP GAP: local Flight envelope did not produce its actual known decided UI');
    row.nativeFlight.decodedDecidedUI=true;await wait(200);
    check(row,await form.getByRole('checkbox').count()===0,'Decided withdrawal removes the obsolete confirmation');
    check(row,await form.locator('button[type="submit"]').count()===0,'Decided withdrawal removes the obsolete submit action');
    check(row,gate.count===1,'Decided native state had one intercepted business action');
    await assertRevealed(page,row,receipt,'native-'+row.variant+'-receipt');
    row.operations=gate.summary();
  },{accounts:['AUDIT-E','AUDIT-LEAD'],sizes,variants:['withdrawn','conflict']});
  register('scoped-p3-native-availability-saved',['Native Flight redirect prerequisite'],async({page,row})=>{
    const week=h.fixtureNextWeek;
    if(!/^\d{4}-\d{2}-\d{2}$/.test(week??''))throw Error('SETUP GAP: genuine fixture next week missing');
    await go(page,row,'/app/availability?week='+week);
    const button=page.locator('form.av-editor button[type="submit"]');
    if(await button.count()!==1||!await button.isEnabled())throw Error('SETUP GAP: genuine unlocked weekly Availability form missing');
    await hydrated(button);const gate=await hold(page,h.action);
    await pending(page,row,gate,button,'native-availability');await wait(3000);
    const destination='/app/availability?week='+week+'&saved=1';
    const observed=page.waitForResponse(response=>new URL(response.url()).pathname===gate.entries[0].path&&response.request().method()==='POST'&&!!response.request().headers()['next-action']);
    row.nativeFlight={localOnly:true,requestMatched:gate.count===1,destination,decodedDecidedUI:false,serverTransactionClaimed:false};
    await fulfillHeldNativeRedirect(gate,0,h.baseUrl,destination);
    const response=await observed;row.nativeFlight.response={path:new URL(response.url()).pathname,status:response.status(),redirect:response.headers()['x-action-redirect']};
    check(row,response.status()===303&&response.headers()['x-action-redirect']===destination+';push','Actual held native operation received the source-prescribed local redirect');
    await until(()=>new URL(page.url()).pathname==='/app/availability'&&new URL(page.url()).searchParams.get('saved')==='1','SETUP GAP: local native redirect did not navigate to its known decided UI');
    const feedback=page.locator('.av-feedback.success[role="status"]');await feedback.waitFor();
    await page.evaluate(()=>document.fonts.ready);await page.evaluate(text=>document.documentElement.style.fontSize=text+'%',row.text);await wait(200);
    row.nativeFlight.decodedDecidedUI=true;
    check(row,/saved|submitted/i.test(await feedback.innerText()),'Source page renders actual saved/submitted feedback after local redirect');
    check(row,gate.count===1,'Saved redirect had one intercepted business action');
    await assertRevealed(page,row,feedback,'native-saved-feedback');
    row.operations=gate.summary();
  },{accounts:['AUDIT-E','AUDIT-LEAD'],sizes});
}
