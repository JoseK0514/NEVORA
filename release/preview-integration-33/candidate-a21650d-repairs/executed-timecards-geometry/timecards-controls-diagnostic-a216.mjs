// Two existing-worker, read-only CI sizing attribution contexts. No startup or UI actions.
import assert from 'node:assert/strict';
import {readFile,readdir,realpath} from 'node:fs/promises';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const digest=v=>createHash('sha256').update(v).digest('hex');
export async function registerScopedCases(h){
 const manifest=JSON.parse(await readFile(new URL('./timecards-controls-diagnostic-a216.json',import.meta.url),'utf8'));
 assert.equal(process.env.VERIFY_ENGINES,'chromium','Exactly two Chromium contexts only');assert.equal(process.env.VERIFY_SHA,manifest.sha);
 const source=await realpath(process.env.VERIFY_SOURCE),preview=await realpath(process.env.PREVIEW_OUT);
 const git=(...args)=>execFileSync('git',args,{cwd:source,encoding:'utf8'}).trim();
 assert.equal(git('rev-parse','HEAD'),manifest.sha);assert.equal(git('rev-parse','HEAD^{tree}'),manifest.tree);assert.equal(git('status','--porcelain','--untracked-files=no'),'');
 for(const[file,hash]of Object.entries(manifest.sourceFiles))assert.equal(digest(await readFile(join(source,file))),hash,'Source changed: '+file);
 const run=(await readdir(preview)).filter(n=>n.startsWith('evidence-')).sort().at(-1),dir=join(preview,run);
 const audit=JSON.parse(await readFile(join(dir,'audit.json'),'utf8')),access=JSON.parse(await readFile(join(dir,'access.json'),'utf8'));
 assert.equal(audit.checkpoint,manifest.sha);assert.equal(access.checkpoint,manifest.sha);assert(!audit.completedAt&&!audit.postgresStopped);assert(['localhost','127.0.0.1','[::1]'].includes(new URL(access.url).hostname));
 const fixture=JSON.parse(await readFile(join(dir,'inspection-initial-fixture.json'),'utf8'));
 assert.equal(fixture.sourceImportSHA,manifest.sha);assert(fixture.initializedBeforeListen&&fixture.actors.some(a=>a.id==='AUDIT-E'&&a.role==='EMPLOYEE'));
 const end=new Date(h.fixtureWeek+'T12:00:00Z');end.setUTCDate(end.getUTCDate()+6);const period={startDate:h.fixtureWeek,endDate:end.toISOString().slice(0,10)};
 h.register('scoped-p3-timecards-controls-ci-attribution-a216',['CI8a employee Timecards controls sizing attribution only'],async({page,row})=>{
  row.checkpoint=manifest.sha;row.previewEvidence=run;row.externalModuleSha256=digest(await readFile(new URL(import.meta.url)));row.sourceFiles=manifest.sourceFiles;row.fullCdLedgerCredit=false;
  row.scope='Two fresh targets plus passive native responsive sequence on the same ready page. Every original button/input including hidden zero-height controls is retained. No product repair or historical-source closure.';
  const reads=[];row.actualOwnReadTelemetry=reads;
  page.on('response',async response=>{
   const request=response.request();if(request.method()!=='POST'||new URL(response.url()).pathname!=='/api/timecards')return;
   let body;try{body=request.postDataJSON();}catch{}const headers=request.headers();
   const record={path:'/api/timecards',method:'POST',status:response.status(),body,readHeader:headers['x-nevora-timecards'],actor:headers['x-nevora-actor'],receivedAt:new Date().toISOString()};reads.push(record);
   try{const value=await response.json();record.state=value?.state;record.cardCount=Array.isArray(value.cards)?value.cards.length:null;record.employeeIds=Array.isArray(value.cards)?value.cards.map(v=>v.card?.employeeId):[];record.finished=true;}catch{record.finished=true;record.unreadable=true;}
  });
  await page.emulateMedia({reducedMotion:'no-preference'});
  await h.go(page,row,'/app/timecards?start='+period.startDate+'&end='+period.endDate);
  const section=page.locator('section[aria-label="Your period timecard"]');
  await h.until(async()=>{
   const actual=reads.find(v=>v.finished&&v.status===200&&v.state==='ready'&&v.readHeader==='1'&&v.actor==='AUDIT-E'&&v.body&&Object.keys(v.body).sort().join(',')==='endDate,startDate'&&v.body.startDate===period.startDate&&v.body.endDate===period.endDate&&v.employeeIds.every(id=>id==='AUDIT-E'));
   if(!actual||await section.count()!==1)return false;
   const view=section.getByRole('button',{name:'View period',exact:true});
   return await view.count()===1&&await view.isEnabled()&&/\b[0-9]+ timecards? in this period\./.test(await section.locator('p[role=status]').innerText());
  },'SETUP GAP: actual own source-authorized Timecards POST200 ready and corresponding committed ready/empty period UI were not observed');
  const actual=reads.findLast(v=>v.finished&&v.status===200&&v.state==='ready'&&v.readHeader==='1'&&v.actor==='AUDIT-E'&&v.body?.startDate===period.startDate&&v.body?.endDate===period.endDate);
  row.readQualification={period,method:'POST',path:'/api/timecards',state:'ready',status:200,actor:'AUDIT-E',cardCount:actual.cardCount,empty:actual.cardCount===0};
  const nodes=await page.locator('section[aria-label="Your period timecard"] button,section[aria-label="Your period timecard"] input').elementHandles();
  if(!nodes.length)throw Error('SETUP GAP: no actual period controls to measure');
  const sample=async label=>page.evaluate(({nodes,label})=>{
   const paint=e=>{const s=getComputedStyle(e);return{tag:e.tagName,type:e.getAttribute('type'),id:e.id,classes:String(e.className),text:e.textContent?.trim(),ariaLabel:e.getAttribute('aria-label'),box:e.getBoundingClientRect().toJSON(),clientWidth:e.clientWidth,clientHeight:e.clientHeight,scrollWidth:e.scrollWidth,scrollHeight:e.scrollHeight,display:s.display,visibility:s.visibility,opacity:s.opacity,position:s.position,height:s.height,minHeight:s.minHeight,maxHeight:s.maxHeight,padding:s.padding,paddingTop:s.paddingTop,paddingBottom:s.paddingBottom,borderTopWidth:s.borderTopWidth,borderBottomWidth:s.borderBottomWidth,boxSizing:s.boxSizing,font:s.font,fontSize:s.fontSize,lineHeight:s.lineHeight,fontWeight:s.fontWeight,transform:s.transform,transition:s.transition,transitionProperty:s.transitionProperty,transitionDuration:s.transitionDuration,transitionDelay:s.transitionDelay,animationName:s.animationName,animationDuration:s.animationDuration};};
   const controls=nodes.map((e,index)=>{const ancestry=[];for(let a=e.parentElement;a;a=a.parentElement){ancestry.push(paint(a));if(a===document.body)break;}return{index,connected:e.isConnected,hidden:e.hidden,disabled:e.disabled,checked:e.checked,value:e.value,originalNode:true,...paint(e),ancestors:ancestry,ancestorHidden:ancestry.some(a=>a.display==='none'||a.visibility==='hidden'||a.visibility==='collapse'||Number(a.opacity)===0)};});
   const section=document.querySelector('section[aria-label="Your period timecard"]');
   const animations=section?.getAnimations({subtree:true}).map(a=>({playState:a.playState,currentTime:typeof a.currentTime==='number'?a.currentTime:String(a.currentTime),playbackRate:a.playbackRate,type:a.constructor.name,transitionProperty:a.transitionProperty??null,animationName:a.animationName??null,target:a.effect?.target?paint(a.effect.target):null,timing:a.effect?.getComputedTiming()}))??[];
   const fixed=[...document.querySelectorAll('header,.mobile-nav,.section-tabs')].filter(e=>['fixed','sticky'].includes(getComputedStyle(e).position)).map(paint);
   return{label,at:new Date().toISOString(),clock:performance.now(),width:innerWidth,height:innerHeight,documentWidth:document.documentElement.clientWidth,documentScrollWidth:document.documentElement.scrollWidth,rootFont:getComputedStyle(document.documentElement).fontSize,dataTextStep:document.documentElement.getAttribute('data-text-step'),reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches,status:section?.querySelector('p[role=status]')?.textContent,allControls:controls,originalAllControlsThreshold:controls.every(c=>c.box.height>=43.5),fixedChrome:fixed,animations};
  },{nodes,label});
  row.snapshots=[];row.snapshots.push(await sample('fresh-target-ready'));
  await h.evidence(page,row,'fresh-target-ready');
  const from=row.width===768?430:1024;await page.setViewportSize({width:from,height:row.height});
  row.snapshots.push(await sample('native-resize-from-'+from+'-immediate'));await page.waitForTimeout(600);row.snapshots.push(await sample('native-resize-from-'+from+'-settled600ms'));
  await page.setViewportSize({width:row.width,height:row.height});row.snapshots.push(await sample('native-resize-target-immediate'));
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));row.snapshots.push(await sample('native-resize-target-two-rAF'));
  await page.waitForTimeout(600);row.snapshots.push(await sample('native-resize-target-after600ms'));await h.evidence(page,row,'native-resize-target-after600ms');
  row.sourceOracle={script:'scripts/phase-d-browser-qa.mjs',lines:'52–56',ciPeriod:'2026-09-21–2026-09-27',actualFixturePeriod:period,originalCiLoopWidths:[320,375,390,430,768,1024,1440],threshold:43.5,allHiddenControlsRetained:true,originalCiSequentialImmediateLoopReproduced:false,qualification:'This bounded attribution uses fresh current-fixture contexts plus native preceding-width resize to target; captures ordinary motion and all nodes/transitions. It does not replace the original exact CI loop or fixture.'};
  for(const s of row.snapshots.filter(s=>s.width===row.width))h.check(row,s.originalAllControlsThreshold,s.label+': original all button/input height>=43.5 criterion (hidden zero nodes retained)',{controls:s.allControls.map(c=>({index:c.index,tag:c.tag,type:c.type,classes:c.classes,box:c.box,display:c.display,ancestorHidden:c.ancestorHidden,minHeight:c.minHeight,transition:c.transition})),animations:s.animations});
  for(const node of nodes)await node.dispose();
 },{accounts:['AUDIT-E'],sizes:[[768,1000,100],[1440,1000,100]]});
}
