/** Real app/SQL except the explicitly labelled decision answer API fixture. No model/provider. */
import {expect,it} from 'vitest';
import {randomUUID} from 'node:crypto';
import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createOwnedNextApp} from './owned-next-app';
import {seedOwnedApp,TEST_PASSWORD} from './owned-app-fixture';
import {claimEvaluationEvidence} from './owner-advisor-evaluation-evidence';

it('accepts real memory edits, conflicts and retirement; inspects legal/insights and labelled decision API states across mobile/desktop',async()=>{
 const requested=process.env.NEVORA_OWNER_ADVISOR_BROWSER_EVIDENCE;
 if(!requested)throw Error('Fresh external evidence path required');
 const evidence=resolve(requested,'partner');
 await claimEvaluationEvidence(evidence,execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),true);
 const req=createRequire(resolve('tools/ci-browser-runtime/package.json')),runtime=req('playwright');
 const axe=await readFile(req.resolve('axe-core/axe.min.js'),'utf8');
 const app=await createOwnedNextApp(evidence,{ownerAdvisorEnabled:true});
 const checks:string[]=[],external:string[]=[],errors:string[]=[];
 let complete=false;
 try{
  await seedOwnedApp(app.database.executor);
  const before=await app.database.executor.query({text:'SELECT (SELECT count(*)::int FROM shifts) shifts,(SELECT count(*)::int FROM notifications) notifications',values:[]});
  const origin=app.url.replace('127.0.0.1','localhost');
  for(const engine of ['chromium','webkit']){
   await app.database.executor.query({text:"DELETE FROM owner_advisor_memories WHERE owner_id='QAOWNER'",values:[]});
   const browser=await runtime[engine].launch({headless:true});
   const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'}),page=await context.newPage();
   let phase='login';
   try{
    await context.route('**/*',async(route:any)=>{const u=new URL(route.request().url());if(['http:','https:'].includes(u.protocol)&&u.origin!==origin){external.push(u.origin);await route.abort();}else await route.continue();});
    page.on('pageerror',(e:Error)=>errors.push(`${engine}:${phase}:${e.message}`));
    page.setDefaultTimeout(20000);await context.tracing.start({screenshots:true,snapshots:true});
    await page.goto(origin+'/login');await page.getByLabel('Employee ID',{exact:true}).fill('QAOWNER');await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(origin+'/app');await page.waitForLoadState('networkidle');
    await page.locator('main').getByRole('link',{name:'AI manager',exact:true}).click();await page.waitForURL(origin+'/app/ai-manager');
    await page.getByRole('button',{name:'Add preference',exact:true}).waitFor();
    expect(await page.getByRole('button',{name:'Ask',exact:true}).isDisabled()).toBe(true);
    await page.getByText('No preferences or constraints saved.',{exact:true}).waitFor();
    await page.getByRole('heading',{name:'Recorded operational patterns',exact:true}).waitFor();
    await page.getByRole('button',{name:'Refresh patterns',exact:true}).click();
    await page.getByRole('heading',{name:'Recorded operational patterns',exact:true}).waitFor();
    checks.push(`${engine}: actual provider-unavailable Ask disabled; empty memory and on-open SQL insights`);
    const editor=page.getByRole('form',{name:'Edit Owner memory',exact:true});
    phase='memory submission and focus';
    for(const width of [320,390,1440]){
     await page.setViewportSize({width,height:1000});
     await page.getByRole('button',{name:'Add preference',exact:true}).click();
     expect(await editor.getByLabel('Intent',{exact:true}).evaluate((el:HTMLElement)=>document.activeElement===el)).toBe(true);
     await page.screenshot({path:resolve(evidence,`${engine}-${width}-memory-editor.png`)});
     await editor.getByRole('button',{name:'Discard edit',exact:true}).click();await editor.waitFor({state:'hidden'});
     await expect.poll(()=>page.getByRole('button',{name:'Add preference',exact:true}).evaluate((el:HTMLElement)=>document.activeElement===el)).toBe(true);
    }
    await page.getByRole('button',{name:'Add preference',exact:true}).focus();await page.keyboard.press('Enter');
    const original='Prefer <script>window.partnerInjected=true</script> stable coverage';
    await editor.getByLabel('Intent',{exact:true}).fill(original);await editor.getByRole('button',{name:'Save memory',exact:true}).click();await editor.waitFor({state:'hidden'});await page.getByText(original,{exact:true}).waitFor();
    expect(await page.evaluate(()=>Object.hasOwn(window,'partnerInjected'))).toBe(false);
    await page.reload();await page.getByText(original,{exact:true}).waitFor();
    checks.push(`${engine}: keyboard entry, actual submit/reload persistence, escaped text and discard focus at320/390/1440`);
    phase='memory conflict';
    await page.getByRole('button',{name:'Edit preference',exact:true}).click();await editor.getByLabel('Intent',{exact:true}).fill('Deliberate preserved draft');
    const get=()=>context.request.get(origin+'/api/owner/advisor',{headers:{'x-nevora-owner-advisor':'1'}});
    const snap=await(await get()).json();const intent=snap.memory.memory.intents[0];
    const response=await context.request.post(origin+'/api/owner/advisor',{headers:{'x-nevora-owner-advisor':'1',Origin:origin},data:{op:'memory',requestId:randomUUID(),expectedRevision:snap.memory.memory.revision,change:{kind:'save_intent',intentId:intent.id,kindOfIntent:intent.kind,text:'Other device revision',focus:intent.focus,effectiveDate:intent.effectiveDate,expiryDate:intent.expiryDate}}});
    expect(response.status()).toBe(200);
    await page.getByRole('button',{name:'Refresh history',exact:true}).first().click();
    await page.getByRole('button',{name:'I’ve reviewed the current memory',exact:true}).waitFor();
    expect(await editor.getByLabel('Intent',{exact:true}).inputValue()).toBe('Deliberate preserved draft');expect(await editor.getByRole('button',{name:'Save memory',exact:true}).isDisabled()).toBe(true);
    await page.getByText('Other device revision',{exact:true}).waitFor();
    await page.getByRole('button',{name:'I’ve reviewed the current memory',exact:true}).click();await editor.getByRole('button',{name:'Save memory',exact:true}).click();await editor.waitFor({state:'hidden'});await page.getByText('Deliberate preserved draft',{exact:true}).waitFor();
    checks.push(`${engine}: actual concurrent SQL-backed edit preserves draft, blocks stale save, explicit acknowledgment saves current revision`);
    phase='decision report';
    await page.getByRole('button',{name:'Record decision',exact:true}).click();
    for(const [label,value] of [['Decision summary','Keep a review before publication'],['Chosen course','Keep draft'],['Reason','Availability remains uncertain']])await editor.getByLabel(label,{exact:true}).fill(value);
    await editor.getByRole('button',{name:'Save memory',exact:true}).click();await editor.waitFor({state:'hidden'});
    await page.getByRole('button',{name:'Report outcome',exact:true}).click();await editor.getByLabel('Outcome reported by you',{exact:true}).fill('Owner reports it helped');await editor.getByRole('button',{name:'Save memory',exact:true}).click();await editor.waitFor({state:'hidden'});await page.getByRole('heading',{name:'Owner-reported outcome',exact:true}).waitFor();
    checks.push(`${engine}: actual decision/reason/outcome submissions retain Owner-reported status`);
    phase='actual legal inspection';
    expect(await page.getByRole('button',{name:'Inspect legal sources',exact:true}).isDisabled()).toBe(true);
    await page.getByLabel('Jurisdiction',{exact:true}).selectOption('PR_US');await page.getByLabel('Research topic',{exact:true}).selectOption('working_time');await page.getByRole('button',{name:'Inspect legal sources',exact:true}).click();
    // Three server sources each have an8-second bound; this wait covers that declared contract.
    await page.getByRole('region',{name:'Legal source status',exact:true}).waitFor({timeout:30000});
    await page.getByRole('heading',{name:'Applicability unverified · Puerto Rico',exact:true}).waitFor();
    const legal=page.getByRole('region',{name:'Legal source status',exact:true});expect(await legal.locator('article').count()).toBe(3);
    await writeFile(resolve(evidence,`${engine}-actual-legal-text.txt`),await legal.innerText());
    checks.push(`${engine}: actual server legal inspect; fixed public requests may be unavailable; source status and missing facts remain honest`);
    const captureMode=async(label:string)=>{
     const mode=page.getByLabel('Answer mode',{exact:true});await mode.scrollIntoViewIfNeeded();
     const paint=await mode.evaluate((el:HTMLSelectElement)=>{const ancestors=[];for(let node:HTMLElement|null=el;node;node=node.parentElement){const c=getComputedStyle(node),r=node.getBoundingClientRect();ancestors.push({tag:node.tagName,id:node.id,className:node.className,inline:node.getAttribute('style'),display:c.display,visibility:c.visibility,opacity:c.opacity,color:c.color,background:c.backgroundColor,contentVisibility:c.contentVisibility,contain:c.contain,transform:c.transform,clipPath:c.clipPath,width:r.width,height:r.height});}return {value:el.value,text:el.selectedOptions[0]?.textContent,ancestors};});
     await writeFile(resolve(evidence,`${engine}-${label}-mode-paint.json`),JSON.stringify(paint,null,2));
     await mode.locator('..').screenshot({path:resolve(evidence,`${engine}-${label}-mode-control.png`)});
    };
    const answerMode=page.getByLabel('Answer mode',{exact:true});
    await answerMode.focus();await page.keyboard.press('r');await page.keyboard.press('Tab');
    await expect.poll(()=>answerMode.inputValue()).toBe('decision');
    await captureMode('before-axe-keyboard-decision');
    await answerMode.focus();await page.keyboard.press('f');await page.keyboard.press('Tab');
    await expect.poll(()=>answerMode.inputValue()).toBe('factual');
    await captureMode('before-axe');
    phase='layout and axe';await page.evaluate(axe);
    for(const width of [320,390,1440]){
     await page.setViewportSize({width,height:1000});
     const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,shortTargets:[...document.querySelectorAll<HTMLElement>('.oa-notebook button,.oa-notebook summary')].filter(el=>el.getBoundingClientRect().width>0&&el.getBoundingClientRect().height<44).map(el=>el.textContent)}));
     const audit=await page.evaluate("axe.run('.oa-content',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})");
     await writeFile(resolve(evidence,`${engine}-${width}-audit.json`),JSON.stringify({layout,audit},null,2));await page.screenshot({path:resolve(evidence,`${engine}-${width}-full.png`),fullPage:true});
     expect(layout.overflow).toBe(false);expect(layout.shortTargets).toEqual([]);expect(audit.violations).toEqual([]);
    }
    await captureMode('after-axe');
    phase='labelled browser decision API fixture';
    let decisionCalls=0,fixtureError=false,releaseAnswer:(()=>void)|undefined;
    await context.route('**/api/owner/advisor*',async(route:any)=>{
     const request=route.request();
     if(request.method()==='GET'){
      const upstream=await route.fetch();const body=await upstream.json();if(body.state==='ready')body.connection='available';await route.fulfill({response:upstream,json:body});return;
     }
     const body=request.postDataJSON();
     if(body.op!=='ask_decision'){await route.continue();return;}
     decisionCalls++;expect(body.objective).toBe('Review before changes');expect(body.focus).toEqual({kind:'general'});
     if(fixtureError){await route.fulfill({status:503,json:{state:'error',code:'unavailable'}});return;}
     await new Promise<void>(done=>{releaseAnswer=done;});
     const current=await(await get()).json();
     await route.fulfill({status:200,json:{state:'answered',authority:current.authority,observedAt:new Date().toISOString(),validForMs:15000,answer:{text:'BROWSER API FIXTURE: review the current evidence before changes.',sources:[],decision:{objective:body.objective,focus:body.focus}}}});
    });
    await page.getByRole('button',{name:'Refresh history',exact:true}).first().click();await page.getByLabel('Answer mode',{exact:true}).selectOption('decision');await page.getByLabel('Decision objective',{exact:true}).fill('Review before changes');await page.getByLabel('Your question',{exact:true}).fill('Compare the available evidence');
    await page.getByRole('button',{name:'Ask',exact:true}).click();await expect.poll(()=>decisionCalls).toBe(1);
    expect(await page.getByLabel('Your question',{exact:true}).isDisabled()).toBe(true);await page.getByLabel('Your question',{exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:resolve(evidence,`${engine}-decision-loading.png`)});
    releaseAnswer!();await page.getByText('BROWSER API FIXTURE: review the current evidence before changes.',{exact:true}).waitFor();await page.getByText('BROWSER API FIXTURE: review the current evidence before changes.',{exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:resolve(evidence,`${engine}-decision-success.png`)});
    await captureMode('decision-success');
    fixtureError=true;await page.getByLabel('Your question',{exact:true}).fill('Try unavailable fixture');await page.getByRole('button',{name:'Ask',exact:true}).click();await expect.poll(()=>decisionCalls).toBe(2);await expect.poll(()=>page.getByLabel('Your question',{exact:true}).isDisabled()).toBe(false);await page.getByText('Your AI manager isn’t connected yet.',{exact:true}).waitFor();await page.getByText('Your AI manager isn’t connected yet.',{exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:resolve(evidence,`${engine}-decision-error.png`)});
    checks.push(`${engine}: labelled browser API fixture only tests decision objective payload/loading/success/error, not provider or model judgment`);
    phase='authority retirement';await page.getByRole('button',{name:'Edit preference',exact:true}).click();await editor.getByLabel('Intent',{exact:true}).fill('Private draft must retire');await page.evaluate(()=>window.dispatchEvent(new Event('nevora:signout')));
    await page.getByText('Current information is hidden until access is refreshed.',{exact:true}).waitFor();expect(await editor.count()).toBe(0);expect(await page.getByText('Deliberate preserved draft',{exact:true}).count()).toBe(0);expect(await page.getByRole('region',{name:'Legal source status',exact:true}).count()).toBe(0);
    await page.screenshot({path:resolve(evidence,`${engine}-retired.png`),fullPage:true});checks.push(`${engine}: authority retirement clears memory drafts, answers and legal/private panels`);
   }catch(error){await page.screenshot({path:resolve(evidence,`${engine}-failed.png`),fullPage:true}).catch(()=>{});await writeFile(resolve(evidence,`${engine}-failure.json`),JSON.stringify({phase,message:String(error)},null,2));throw error;}
   finally{await context.tracing.stop({path:resolve(evidence,`${engine}-trace.zip`)}).catch(()=>{});await context.close();await browser.close();}
  }
  expect(await app.database.executor.query({text:'SELECT (SELECT count(*)::int FROM shifts) shifts,(SELECT count(*)::int FROM notifications) notifications',values:[]})).toEqual(before);
  expect(await app.database.executor.query({text:"SELECT count(*)::int n FROM owner_advisor_requests WHERE kind='ask'",values:[]})).toEqual([{n:0}]);expect(external).toEqual([]);expect(errors).toEqual([]);complete=true;
 }finally{await app.close();await writeFile(resolve(evidence,'report.json'),JSON.stringify({complete,checks,external,errors,source:app.sourceHashes,providerConfigured:false,modelQuality:'not-run',scope:'Real Next, login, memory/legal/insights API and owned SQL; decision answer API fixture; signout lifecycle simulation'},null,2));}
});
