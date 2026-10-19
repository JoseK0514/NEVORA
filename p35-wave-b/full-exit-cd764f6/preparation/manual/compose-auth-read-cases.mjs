/** Supplemental read-only auth observations. No frozen checker/prior-ID is renamed. */
export function registerScopedCases(h){
 const {register,go,hold,check,evidence,until,wait,buttonData,hydrated,hash,fixtureUpdateId}=h;
 const sizes=[[390,844,100],[320,844,200]];
 async function run({page,row},scope){
  const mode=row.account==='QAOWNER'?'manager':'employee',status=Number(row.variant);
  if(scope==='edit'&&!/^[a-f0-9-]{36}$/i.test(fixtureUpdateId??''))throw Error('Positive before-listen published update identity missing');
  const endpoint='/api/'+mode+'/communications/'+(scope==='edit'?fixtureUpdateId:'context');
  const path='/app/updates/compose'+(scope==='edit'?'?update='+fixtureUpdateId:'');
  const gate=await hold(page,request=>request.method()==='GET'&&new URL(request.url()).pathname===endpoint);
  row.supplementaryMapping='WB-SUP-AUTH-01';row.authScope={scope,mode,endpoint,status};
  await page.bringToFront();await go(page,row,path);await gate.wait(1);
  const authority=gate.entries[0].route.request().headers()['x-nevora-communication-authority'];
  check(row,!!authority,'Actual Compose read carries its existing authority header');
  row.authScope.authorityHash=hash(authority??'');
  const state=page.locator('.wb-compose .nv-content > section[role="status"]');
  const retry=state.getByRole('button',{name:'Try again',exact:true});
  async function settled(label){
   await until(async()=>await state.count()===1&&await state.getAttribute('aria-busy')!=='true','Compose read did not reach its actual settled state');
   await wait(350);const data=await evidence(page,row,label),copy=await state.innerText(),signIn=state.locator('a[href="/login"]');
   check(row,await page.locator('.wb-compose form.wb-form').count()===0,label+': unauthorized read exposes no private compose form');
   check(row,await retry.isVisible()&&await retry.isEnabled(),label+': real Try again recovery is visible and enabled');
   if(status===401){
    check(row,/session ended|sign in again/i.test(copy),label+': 401 explains sign-in recovery',copy);
    check(row,await signIn.count()===1&&await signIn.isVisible(),label+': 401 exposes an actual Sign in link');
   }else{
    check(row,!/session ended|signed out/i.test(copy),label+': 403 does not assert that the session ended',copy);
    check(row,/permission|access|not allowed|unavailable/i.test(copy),label+': 403 explains access or permission rather than a connection error',copy);
   }
   return data;
  }
  await gate.release(0,status,{});await settled('initial-'+status);
  // The operator explicitly focuses the real recovery button. Initial passive
  // reads impose no automatic focus requirement; actual focus is still captured.
  await hydrated(retry,'onClick');await retry.focus();row.beforeRetry=await buttonData(retry);
  const start=gate.count;await page.keyboard.press('Enter');await gate.wait(start+1);await wait(125);
  const during=await buttonData(retry);row.retryPending=during;
  check(row,during.focused,'User-initiated held Try again retains actual button focus',during);
  check(row,!during.disabled&&!during.fieldsetDisabled,'Held Try again remains natively focusable',during);
  check(row,during.ariaDisabled==='true'||during.disabled,'Held Try again announces its locked state',during);
  await page.keyboard.press('Enter');await retry.click({force:true,noWaitAfter:true,timeout:1000}).catch(()=>{});await wait(100);
  check(row,gate.count===start+1,'Held retry duplicate activation sends one read',{before:start,after:gate.count});
  await evidence(page,row,'retry-held-'+status);await gate.release(start,status,{});await settled('retry-denied-'+status);
  row.retryDeniedFocus=await buttonData(retry);
  check(row,row.retryDeniedFocus.focused,'Denied Try again completion retains its initiating recovery focus',row.retryDeniedFocus);
  // A real fresh authorized response is allowed only for this harmless GET.
  // No captured private response is replayed or relabeled as newly authorized.
  await retry.focus();const recoveryIndex=gate.count;await page.keyboard.press('Enter');await gate.wait(recoveryIndex+1);
  const response=page.waitForResponse(r=>r.request()===gate.entries[recoveryIndex].route.request());
  await gate.release(recoveryIndex,'continue');const freshResponse=await response,fresh=await freshResponse.json();
  if(freshResponse.status()!==200||fresh.state!=='ready')throw Error('Fresh canonical Compose '+scope+' recovery prerequisite unavailable');
  check(row,fresh.authority===authority,'Fresh authorized read stays bound to the original account authority');
  if(scope==='edit')check(row,fresh.id===fixtureUpdateId&&!!fresh.management,'Fresh authorized edit read belongs to the initial owned publication');
  const title=page.locator('#communication-title');await title.waitFor();await hydrated(title,'onChange');await wait(350);
  const restored=await evidence(page,row,'fresh-authorized-retry');
  check(row,await title.evaluate(e=>document.activeElement===e),'Successful user-initiated retry focuses the real first compose field',restored.active);
  check(row,await state.count()===0,'Fresh authorized form replaces the denied read state');
  check(row,gate.entries.every(entry=>entry.route.request().headers()['x-nevora-communication-authority']===authority),'All original/retry reads preserve authority in memory');
  row.reads=gate.summary();
 }
 register('exit-wb-compose-context-auth',['IS-B13','IS-B12'],args=>run(args,'context'),{accounts:['QAOWNER','AUDIT-E'],sizes,variants:['401','403']});
 register('exit-wb-compose-edit-auth',['IS-B13','IS-B12'],args=>run(args,'edit'),{accounts:['QAOWNER'],sizes,variants:['401','403']});
}
