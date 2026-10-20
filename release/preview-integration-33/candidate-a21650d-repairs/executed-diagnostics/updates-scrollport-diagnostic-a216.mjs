// Single read-only attribution probe for an existing serial worker. No startup.
import assert from 'node:assert/strict';
import {readFile,readdir,realpath,mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function registerScopedCases(h){
 const manifest=JSON.parse(await readFile(new URL('./updates-scrollport-diagnostic-a216.json',import.meta.url),'utf8'));
 assert.equal(process.env.VERIFY_ENGINES,'chromium','One original-engine attribution row only');
 assert.equal(process.env.VERIFY_SHA,manifest.sha);
 const source=await realpath(process.env.VERIFY_SOURCE),preview=await realpath(process.env.PREVIEW_OUT);
 const git=(...args)=>execFileSync('git',args,{cwd:source,encoding:'utf8'}).trim();
 assert.equal(git('rev-parse','HEAD'),manifest.sha);assert.equal(git('rev-parse','HEAD^{tree}'),manifest.tree);assert.equal(git('status','--porcelain','--untracked-files=no'),'');
 for(const [file,expected]of Object.entries(manifest.sourceFiles))assert.equal(digest(await readFile(join(source,file))),expected,'Actual source contract differs: '+file);
 const axe=await readFile(join(source,'node_modules/axe-core/axe.min.js'),'utf8');assert.equal(digest(axe),manifest.axeSha256);
 const run=(await readdir(preview)).filter(name=>name.startsWith('evidence-')).sort().at(-1),evidence=join(preview,run);
 const audit=JSON.parse(await readFile(join(evidence,'audit.json'),'utf8')),access=JSON.parse(await readFile(join(evidence,'access.json'),'utf8'));
 assert.equal(audit.checkpoint,manifest.sha);assert.equal(access.checkpoint,manifest.sha);assert(!audit.completedAt&&!audit.postgresStopped);assert(['127.0.0.1','localhost','[::1]'].includes(new URL(access.url).hostname));
 const fixture=JSON.parse(await readFile(join(evidence,'inspection-initial-fixture.json'),'utf8'));
 assert.equal(fixture.sourceImportSHA,manifest.sha);assert(fixture.initializedBeforeListen&&fixture.actors.some(actor=>actor.id==='AUDIT-LONG'&&actor.role==='EMPLOYEE'));
 h.register('scoped-p3-updates-scrollport-attribution-a216',['CHECKER-AXE-UPDATES-01 attribution only; original cd row stays open'],async({page,row})=>{
  row.checkpoint=manifest.sha;row.previewEvidence=run;row.sourceBinding={sha:manifest.sha,tree:manifest.tree,sourceFiles:manifest.sourceFiles,axeSha256:manifest.axeSha256};
  row.externalModuleSha256=digest(await readFile(new URL(import.meta.url)));row.originalEvidence=manifest.originalEvidence;row.fullCdLedgerCredit=false;
  row.qualification='Exact-a216 node attribution or non-reproduction only. No closure of original cd checker row, old historical scope, full phone exit or native assistive-technology certification.';
  row.oracle={waitUntil:'load',navigationTimeoutMs:30000,postLoadMs:2500,textPercent:125,postTextMs:600,axeRunOnly:manifest.axeRunOnly,reducedMotion:'no-preference',additionalAppStyleOrStateChanges:false};
  row.contextQualification='Original failing target was third page after My pay/Profile in its four-route context. This one-row diagnostic uses the existing verifier fresh context; no preceding-route cache equivalence is claimed.';
  const telemetry=[];row.actualReadTelemetry=telemetry;const bodies=[];
  page.on('response',response=>{
   const request=response.request(),path=new URL(response.url()).pathname;
   if(request.method()!=='GET'||path!=='/api/employee/communications')return;
   const binding=request.headers()['x-nevora-communication-authority'];
   const record={method:'GET',path,status:response.status(),observedAt:new Date().toISOString(),authorityHeaderHash:binding?h.hash(binding):null};telemetry.push(record);
   bodies.push(response.json().then(value=>Object.assign(record,{state:value?.state,itemCount:Array.isArray(value?.items)?value.items.length:null,authorityReadHash:typeof value?.authority==='string'?h.hash(value.authority):null,authorityMatches:!!binding&&value?.authority===binding,initialOwnFixtureUpdatePresent:Array.isArray(value?.items)&&value.items.some(item=>item.state==='ready'&&item.id===fixture.initialUpdateId)})).catch(()=>{record.jsonUnreadable=true;}));
  });
  // Reproduce the unchanged source checker's target-cell timing and full axe tags.
  await page.emulateMedia({reducedMotion:'no-preference'});
  const response=await page.goto(h.baseUrl+'/app/updates',{waitUntil:'load',timeout:30000});row.navigationStatus=response?.status()??0;
  await page.waitForTimeout(2500);
  await page.evaluate(text=>{document.documentElement.style.fontSize=text+'%';},125);
  await page.waitForTimeout(600);
  const paint=()=>page.evaluate(()=>({observedAt:new Date().toISOString(),path:location.pathname+location.search,width:innerWidth,height:innerHeight,rootFont:getComputedStyle(document.documentElement).fontSize,textStep:document.documentElement.dataset.textStep,fontStatus:document.fonts.status,interReady:document.fonts.check('16px Inter'),reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,active:{tag:document.activeElement?.tagName,id:document.activeElement?.id},filters:[...document.querySelectorAll('.updates-filters')].map(element=>({html:element.outerHTML,disabled:element.matches(':disabled'),box:element.getBoundingClientRect().toJSON()})),statuses:[...document.querySelectorAll('main [role=status],main [role=alert]')].map(element=>({text:element.textContent,box:element.getBoundingClientRect().toJSON()}))}));
  row.paintBeforeAxe=await paint();
  await page.addScriptTag({content:axe});
  row.axeStartedAt=new Date().toISOString();
  const result=await page.evaluate(async runOnly=>{const result=await window.axe.run(document,{runOnly});return{violations:result.violations,incomplete:result.incomplete,passesCount:result.passes.length,inapplicableCount:result.inapplicable.length,testEngine:result.testEngine,testRunner:result.testRunner,testEnvironment:result.testEnvironment,timestamp:result.timestamp};},manifest.axeRunOnly);
  row.axeCompletedAt=new Date().toISOString();row.axeResult=result;row.paintAfterAxe=await paint();
  const targets=result.violations.flatMap(violation=>violation.nodes.map(node=>({rule:violation.id,target:node.target})));
  row.scrollportEvidence=await page.evaluate(targets=>{
   const selector=element=>element.tagName.toLowerCase()+(element.id?'#'+element.id:'.'+String(element.className?.baseVal??element.className??'').trim().split(/\s+/).filter(Boolean).slice(0,4).join('.'));
   const describe=element=>{const style=getComputedStyle(element),box=element.getBoundingClientRect();return{selector:selector(element),tag:element.tagName,id:element.id,role:element.getAttribute('role'),ariaLabel:element.getAttribute('aria-label'),text:element.textContent?.trim().replace(/\s+/g,' ').slice(0,300),box:box.toJSON(),display:style.display,visibility:style.visibility,overflowX:style.overflowX,overflowY:style.overflowY,clientWidth:element.clientWidth,clientHeight:element.clientHeight,scrollWidth:element.scrollWidth,scrollHeight:element.scrollHeight,scrollLeft:element.scrollLeft,scrollTop:element.scrollTop,tabIndex:element.tabIndex,tabIndexAttribute:element.getAttribute('tabindex'),disabled:element.matches(':disabled'),ariaDisabled:element.getAttribute('aria-disabled'),fieldsetDisabled:!!element.closest('fieldset[disabled]'),connected:element.isConnected,focused:document.activeElement===element};};
   const descendants=element=>[...element.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,summary,[tabindex],[contenteditable=true]')].map(node=>{const item=describe(node);return{...item,potentialNativeStop:item.tabIndex>=0&&!item.disabled&&item.box.width>0&&item.box.height>0&&item.display!=='none'&&item.visibility!=='hidden',fullyInsidePort:item.box.left>=element.getBoundingClientRect().left-1&&item.box.right<=element.getBoundingClientRect().right+1&&item.box.top>=element.getBoundingClientRect().top-1&&item.box.bottom<=element.getBoundingClientRect().bottom+1};});
   const candidates=[...document.querySelectorAll('body *')].filter(element=>{const style=getComputedStyle(element),box=element.getBoundingClientRect();return box.width>0&&box.height>0&&style.display!=='none'&&style.visibility!=='hidden'&&((/auto|scroll/.test(style.overflowX)&&element.scrollWidth>element.clientWidth)||(/auto|scroll/.test(style.overflowY)&&element.scrollHeight>element.clientHeight));});
   const resolved=targets.map(target=>{let element;try{if(target.target.length===1&&typeof target.target[0]==='string')element=document.querySelector(target.target[0]);}catch{}return{...target,resolved:!!element,...(element?{node:describe(element),html:element.outerHTML,ancestors:[...function*(value){for(let n=value.parentElement;n&&n!==document.documentElement;n=n.parentElement)yield n;}(element)].map(describe),focusableDescendants:descendants(element)}:{})};});
   return{resolvedViolatingNodes:resolved,allActualScrollports:candidates.map(element=>({node:describe(element),focusableDescendants:descendants(element)}))};
  },targets);
  await Promise.allSettled(bodies);
  const folder=join(process.env.VERIFY_REPORT_ROOT,'scrollport-attribution');await mkdir(folder,{recursive:true});const prefix='chromium-AUDIT-LONG-390x844-t125';
  await page.screenshot({path:join(folder,prefix+'.png'),fullPage:false});row.actualPaintCrop='scrollport-attribution/'+prefix+'.png';
  row.freshReadyQualification={fixtureActorId:'AUDIT-LONG',fixtureRole:'EMPLOYEE',initialUpdateId:fixture.initialUpdateId,matchedActualOwnReads:telemetry.filter(value=>value.status===200&&['complete','partial'].includes(value.state)&&value.authorityMatches&&value.initialOwnFixtureUpdatePresent),readyControlsBeforeOracle:row.paintBeforeAxe.filters.some(value=>!value.disabled),readyControlsAfterOracle:row.paintAfterAxe.filters.some(value=>!value.disabled)};
  h.check(row,row.navigationStatus===200&&new URL(page.url()).pathname==='/app/updates','Diagnostic reached the actual authorized Updates route',{status:row.navigationStatus,path:page.url()});
  h.check(row,row.paintBeforeAxe.width===390&&row.paintBeforeAxe.height===844&&row.paintBeforeAxe.rootFont==='20px','Original390/125 test configuration is the actual source paint',row.paintBeforeAxe);
  h.check(row,result.violations.length===0,'Full original WCAG axe oracle reports no violations in this one diagnostic row',result.violations.map(value=>({id:value.id,nodes:value.nodes.length})));
  h.check(row,!result.violations.some(value=>value.id==='scrollable-region-focusable'),'Attribution replay: original scrollable-region-focusable negative is absent on this exact newer source',{violations:result.violations.map(value=>({id:value.id,nodes:value.nodes.length}))});
  row.originalRuleReproduced=result.violations.some(value=>value.id==='scrollable-region-focusable');
  await writeFile(join(folder,prefix+'.json'),JSON.stringify({checkpoint:manifest.sha,originalCheckpoint:manifest.originalCheckpoint,qualification:row.qualification,oracle:row.oracle,paintBeforeAxe:row.paintBeforeAxe,paintAfterAxe:row.paintAfterAxe,actualReadTelemetry:telemetry,freshReadyQualification:row.freshReadyQualification,axeResult:result,scrollportEvidence:row.scrollportEvidence,actualPaintCrop:row.actualPaintCrop},null,2));
  if(!row.freshReadyQualification.matchedActualOwnReads.length)throw Error('SETUP GAP: no actual own authorized Updates200 with matching fresh authority and initial fixture update; error/loading paint is preserved without ready-state attribution');
 },{accounts:['AUDIT-LONG'],sizes:[[390,844,125]]});
}
