// Existing-worker read-only attribution: no fixture changes, no startup, no write APIs.
import assert from 'node:assert/strict';
import {readFile,readdir,realpath,mkdir} from 'node:fs/promises';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const digest=value=>createHash('sha256').update(value).digest('hex');
export async function registerScopedCases(h){
 const manifest=JSON.parse(await readFile(new URL('./wr17-mytime-diagnostic-a216.json',import.meta.url),'utf8'));
 assert.equal(process.env.VERIFY_SHA,manifest.sha);
 assert(['chromium','webkit'].includes(process.env.VERIFY_ENGINES),'Run one existing serial engine at a time');
 const source=await realpath(process.env.VERIFY_SOURCE),preview=await realpath(process.env.PREVIEW_OUT);
 const git=(...args)=>execFileSync('git',args,{cwd:source,encoding:'utf8'}).trim();
 assert.equal(git('rev-parse','HEAD'),manifest.sha);assert.equal(git('rev-parse','HEAD^{tree}'),manifest.tree);assert.equal(git('status','--porcelain','--untracked-files=no'),'');
 for(const [file,hash]of Object.entries(manifest.sourceFiles))assert.equal(digest(await readFile(join(source,file))),hash,'Source contract differs: '+file);
 const run=(await readdir(preview)).filter(n=>n.startsWith('evidence-')).sort().at(-1),evidence=join(preview,run);
 const audit=JSON.parse(await readFile(join(evidence,'audit.json'),'utf8')),access=JSON.parse(await readFile(join(evidence,'access.json'),'utf8'));
 assert.equal(audit.checkpoint,manifest.sha);assert.equal(access.checkpoint,manifest.sha);assert(!audit.completedAt&&!audit.postgresStopped);assert(['localhost','127.0.0.1','[::1]'].includes(new URL(access.url).hostname));
 const fixture=JSON.parse(await readFile(join(evidence,'inspection-initial-fixture.json'),'utf8'));
 assert.equal(fixture.sourceImportSHA,manifest.sha);assert(fixture.initializedBeforeListen&&fixture.actors.some(a=>a.id==='AUDIT-E'&&a.role==='EMPLOYEE'));
 h.register('scoped-p3-wr17-mytime-completed-attribution-a216',['P3-WR-17 retained P1 attribution only; original cd finding stays open'],async({page,row})=>{
  row.checkpoint=manifest.sha;row.previewEvidence=run;row.sourceBinding={sha:manifest.sha,tree:manifest.tree,sourceFiles:manifest.sourceFiles};row.externalModuleSha256=digest(await readFile(new URL(import.meta.url)));row.originalCdEvidence=manifest.originalCdEvidence;row.fullCdLedgerCredit=false;
  row.scope='Actual existing closed-entry total/status, source-conditioned reflow and clipping at200%; attribution only, no historical/full-source closure';
  row.fixtureBinding={actorId:'AUDIT-E',role:'EMPLOYEE',initializedBeforeListen:true};
  row.oracle={waitUntil:'load',navigationTimeoutMs:30000,postLoadMs:2500,textPercent:200,postTextMs:600,attributeOrStyleRepair:false,postListenFixtureWrites:false};
  const telemetry=[],pendingBodies=[];row.actualOwnReadTelemetry=telemetry;
  page.on('response',response=>{
   const request=response.request();if(request.method()!=='GET'||new URL(response.url()).pathname!=='/api/employee/my-time')return;
   const authority=request.headers()['x-nevora-correction-authority'];
   const item={method:'GET',path:'/api/employee/my-time',status:response.status(),observedAt:new Date().toISOString(),myTimeHeader:request.headers()['x-nevora-my-time'],authorityHeaderHash:authority?h.hash(authority):null};telemetry.push(item);
   pendingBodies.push(response.json().then(value=>{
    item.state=value?.state;item.finished=true;
    if(value?.state!=='ready')return;
    const entries=[...(value.today?.entries??[]),...(value.recent?.entries??[])],unique=[...new Map(entries.map(e=>[e.id,e])).values()];
    item.todayEntries=value.today?.entries?.length??null;item.recentEntries=value.recent?.entries?.length??null;
    item.closedEntries=unique.filter(e=>e.state==='CLOCKED_OUT'&&typeof e.id==='string'&&typeof e.clockInAt==='string'&&typeof e.clockOutAt==='string').map(e=>({id:e.id,clockInAt:e.clockInAt,clockOutAt:e.clockOutAt,state:e.state}));
   }).catch(()=>{item.finished=true;item.jsonUnreadable=true;}));
  });
  await page.emulateMedia({reducedMotion:'no-preference'});
  const response=await page.goto(h.baseUrl+'/app/my-time',{waitUntil:'load',timeout:30000});row.navigationStatus=response?.status()??0;
  await page.waitForTimeout(2500);
  await page.evaluate(text=>{document.documentElement.style.fontSize=text+'%';},row.text);
  await page.waitForTimeout(600);
  const rootPaint=()=>page.evaluate(()=>{const root=document.documentElement,s=getComputedStyle(root);return{at:new Date().toISOString(),path:location.pathname+location.search,viewport:{width:innerWidth,height:innerHeight},fontSize:s.fontSize,dataTextStep:root.getAttribute('data-text-step'),nvTextScale:s.getPropertyValue('--nv-text-scale').trim(),fontStatus:document.fonts.status,interReady:document.fonts.check('16px Inter'),reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,remObserverProbes:[...document.querySelectorAll('body>i[aria-hidden="true"]')].filter(e=>e.style.width==='1rem'&&e.style.height==='0px').map(e=>({connected:e.isConnected,width:e.getBoundingClientRect().width,height:e.getBoundingClientRect().height,visibility:getComputedStyle(e).visibility}))};});
  row.paintAfterOriginalTextWait=await rootPaint();
  try{await h.until(()=>telemetry.some(t=>t.finished),'No actual own My time response completed');}catch{throw Error('SETUP GAP: no observed actual own My time GET response');}
  await Promise.allSettled(pendingBodies);
  const ready=telemetry.find(t=>t.status===200&&t.state==='ready'&&t.myTimeHeader==='1'&&t.authorityHeaderHash&&t.closedEntries?.length);
  if(!ready)throw Error('SETUP GAP: actual own My time200 + source-authorized existing closed entry required; no fixture creation or projection allowed');
  let entry,target;
  for(const candidate of ready.closedEntries){
   if(!/^\d{4}-\d\d-\d\dT[0-9:.+Z-]+$/.test(candidate.clockInAt))continue;
   const possible=page.locator('main .employee-time-entry').filter({has:page.locator('summary .employee-time-entry-label time[datetime="'+candidate.clockInAt+'"]')});
   if(await possible.count()===1&&await possible.locator('summary > .employee-time-entry-total > small').textContent()==='Completed'){entry=candidate;target=possible;break;}
  }
  if(!target)throw Error('SETUP GAP: actual200 closed-entry identity did not read back to exactly one real Completed summary');
  row.ownEntryBinding={actorId:'AUDIT-E',entryId:entry.id,clockInAt:entry.clockInAt,clockOutAt:entry.clockOutAt,apiState:entry.state,uiStatus:'Completed',apiPath:'/api/employee/my-time',apiStatus:200};
  const sample=()=>target.evaluate((details,rules)=>{
   const summary=details.querySelector(':scope>summary'),total=summary.querySelector(':scope>.employee-time-entry-total'),status=total.querySelector(':scope>small');
   const name=e=>e.tagName.toLowerCase()+(e.id?'#'+e.id:'.'+String(e.className??'').trim().split(/\s+/).filter(Boolean).slice(0,3).join('.'));
   const describe=e=>{const s=getComputedStyle(e);return{selector:name(e),box:e.getBoundingClientRect().toJSON(),display:s.display,gridTemplateColumns:s.gridTemplateColumns,gridTemplateRows:s.gridTemplateRows,gridColumn:s.gridColumn,gridRow:s.gridRow,justifySelf:s.justifySelf,whiteSpace:s.whiteSpace,overflowWrap:s.overflowWrap,overflowX:s.overflowX,overflowY:s.overflowY,font:s.font,fontSize:s.fontSize,lineHeight:s.lineHeight,fontWeight:s.fontWeight,textAlign:s.textAlign};};
   const glyphs=e=>{const w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT),out=[];for(let n=w.nextNode();n;n=w.nextNode()){if(!n.textContent.trim())continue;const r=document.createRange();r.selectNodeContents(n);out.push({text:n.textContent,font:getComputedStyle(n.parentElement).font,rects:[...r.getClientRects()].filter(r=>r.width&&r.height).map(r=>r.toJSON())});}return out;};
   const statusGlyphs=glyphs(status),statusRects=statusGlyphs.flatMap(g=>g.rects),clipAncestors=[];
   for(let a=status.parentElement;a;a=a.parentElement){const s=getComputedStyle(a),box=a.getBoundingClientRect();if(/hidden|clip|auto|scroll/.test(s.overflowX+' '+s.overflowY))clipAncestors.push({...describe(a),statusOutsideX:statusRects.some(r=>r.left<box.left-1||r.right>box.right+1),statusOutsideY:statusRects.some(r=>r.top<box.top-1||r.bottom>box.bottom+1),clientWidth:a.clientWidth,scrollWidth:a.scrollWidth});}
   const matchedRules=[];const walk=(list,path=[])=>{for(const rule of list){if(rule.selectorText&&/employee-time-entry|employee-time-entry-total/.test(rule.selectorText)){let matches=[];for(const[label,e]of[['summary',summary],['total',total],['status',status]])try{if(e.matches(rule.selectorText))matches.push(label);}catch{}if(matches.length)matchedRules.push({selector:rule.selectorText,style:rule.style.cssText,matches,conditions:path});}if(rule.cssRules){const condition=rule.conditionText??null;let mediaMatches=null;if(rule.constructor.name==='CSSMediaRule')try{mediaMatches=matchMedia(condition).matches;}catch{}walk(rule.cssRules,[...path,{kind:rule.constructor.name,condition,mediaMatches}]);}}};
   const sheetReadErrors=[];for(const sheet of document.styleSheets)try{walk(sheet.cssRules,[{sheet:sheet.href?new URL(sheet.href).pathname:'inline'}]);}catch(e){sheetReadErrors.push(String(e));}
   return{at:new Date().toISOString(),root:{fontSize:getComputedStyle(document.documentElement).fontSize,dataTextStep:document.documentElement.getAttribute('data-text-step'),nvTextScale:getComputedStyle(document.documentElement).getPropertyValue('--nv-text-scale').trim()},scroll:{x:scrollX,y:scrollY,documentHeight:document.documentElement.scrollHeight},details:describe(details),summary:describe(summary),total:describe(total),status:{...describe(status),text:status.textContent},totalGlyphs:glyphs(total),statusGlyphs,clippingAncestors:clipAncestors,sourceRuleMatches:rules.map(rule=>({selector:rule.selector,matchesRootTextStep:document.documentElement.matches('html:is([data-text-step="150"], [data-text-step="200"])'),matchesSummary:summary.matches(rule.selector),matchesTotal:total.matches(rule.selector)})),matchedRules,sheetReadErrors};
  },manifest.wr17Rules);
  row.beforeTargetScroll=await sample();
  await target.locator('summary').evaluate(e=>e.scrollIntoView({block:'center',inline:'nearest'}));await page.waitForTimeout(200);
  row.afterTargetScroll=await sample();row.paintAtTargetCrop=await rootPaint();
  const dir=join(process.env.VERIFY_REPORT_ROOT,'wr17-attribution');await mkdir(dir,{recursive:true});const file=row.engine+'-AUDIT-E-'+row.width+'x'+row.height+'-t'+row.text+'.png';await page.screenshot({path:join(dir,file),fullPage:false});row.targetedCrop='wr17-attribution/'+file;
  h.check(row,row.navigationStatus===200,'Actual authorized My time route returned200',{status:row.navigationStatus});
  h.check(row,row.paintAfterOriginalTextWait.fontSize==='32px','Normal200% root text is actually applied',row.paintAfterOriginalTextWait);
  h.check(row,!!ready&&!!entry,'Actual own200 and existing closed entry match one real Completed summary',row.ownEntryBinding);
  const clips=row.afterTargetScroll.clippingAncestors.filter(a=>/hidden|clip/.test(a.overflowX)&&a.statusOutsideX);
  h.check(row,clips.length===0,'Completed glyphs stay within every actual horizontal clipping ancestor',{clippingAncestors:clips,statusGlyphs:row.afterTargetScroll.statusGlyphs});
  row.attributionQualification='Record data-text-step, CSS selector applicability and actual winning computed grid without repairing any attribute/style. A non-reproduction on newer a216 does not close original cd P3-WR-17 or any full matrix/manual scope.';
 },{accounts:['AUDIT-E'],sizes:[[320,844,200],[390,844,200]]});
}
