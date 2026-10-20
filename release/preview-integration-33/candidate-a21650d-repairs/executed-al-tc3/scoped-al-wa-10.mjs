/** Preparation only. Importing registers24 configurations; this file never launches a browser.
 * Fresh fixed-source preview + initial-only exact-source fixture required. Never Save.
 */
import assert from 'node:assert/strict';
import {readFile,readdir} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {resolve,join} from 'node:path';
const EXPECTED_SOURCE='a21650de50374683d52e32b883d7f419d7344f22';
const EXPECTED_TREE='2e16c3d2d1bcb498ccd3ea7e6660a4314fc0c70f';
const repair='0caadb3505342ef331e2adeb141c02eafcc13f96';
const fixedFile='src/app/app/schedule/new/page.tsx';
const fixedHash='317bba6436b474aea5c68ed1d63b001c4a76996035f36acc734d08a8cec5e7ca';
const digest=b=>createHash('sha256').update(b).digest('hex');
const near=(a,b)=>Math.abs(a-b)<=1;
const cleanStatePaths=row=>{for(const state of Object.values(row.states??{}))if(state.path)state.path='/app/schedule/new?review=REDACTED';};

export async function loadPrivateContract(){
 const source=resolve(process.env.VERIFY_SOURCE??''),sha=process.env.VERIFY_SHA,preview=resolve(process.env.PREVIEW_OUT??'');
 assert.equal(sha,EXPECTED_SOURCE,'Exacta21650d fixed-source SHA required');
 assert.equal(execFileSync('git',['rev-parse','HEAD^{tree}'],{cwd:source,encoding:'utf8'}).trim(),EXPECTED_TREE,'Fixed tree mismatch');
 assert.equal(execFileSync('git',['rev-parse','HEAD'],{cwd:source,encoding:'utf8'}).trim(),sha,'Source mismatch');
 assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{cwd:source,encoding:'utf8'}).trim(),'','Dirty source');
 execFileSync('git',['merge-base','--is-ancestor',repair,sha],{cwd:source,stdio:'pipe'});
 assert.equal(digest(await readFile(join(source,fixedFile))),fixedHash,'Repair file differs: explicitly review/rebind instead of inheriting credit');
 const run=(await readdir(preview)).filter(n=>n.startsWith('evidence-')).sort().at(-1);assert(run,'Owned preview evidence missing');
 const evidenceDir=join(preview,run),access=JSON.parse(await readFile(join(evidenceDir,'access.json'),'utf8'));
 const fixture=JSON.parse(await readFile(join(evidenceDir,'wave-a-positive-fixture.json'),'utf8'));
 const bindings=JSON.parse(await readFile(process.env.WA_AL10_BINDINGS??join(preview,'private-state-jobs','wave-a-bindings.json'),'utf8'));
 assert.equal(access.checkpoint,sha,'Cannot reuse old-source preview');assert.equal(fixture.sourceSha,sha,'Cannot reuse old-source fixture proof');
 assert.equal(fixture.initializedBeforeListen,true);assert.equal(fixture.notificationsLocalOnly,true);
 assert.equal(bindings.fixturesReady,true);assert.equal(bindings.fixtureFingerprint,fixture.fixtureFingerprint);
 const origin=new URL(access.url);assert.equal(origin.hostname,'127.0.0.1');assert.equal(origin.protocol,'http:');
 for(const account of ['QAOWNER','AUDIT-M']){
  const route=new URL(bindings.reviewReplacement?.[account]??'',origin);
  assert.equal(route.origin,origin.origin);assert.equal(route.pathname,'/app/schedule/new');
  assert.deepEqual([...route.searchParams.keys()],['review']);assert(route.searchParams.get('review'),'Missing genuine actor-bound review');
  const read=fixture.repairReads.find(r=>r.actor===account);assert(read?.status==='READY'&&read.candidates>0,'Real positive source eligibility missing');
 }
 return{sha,source,origin:origin.origin,bindings,fixture,publicProof:{sourceSha:sha,repair,sourceFile:fixedFile,sourceFileSha256:fixedHash,initialOnlyFixture:true,privateDynamicHints:true,actors:['QAOWNER','AUDIT-M']}};
}

export async function registerScopedCases(h){
 const contract=await loadPrivateContract();
 const {register,go,hold,action,check,evidence,until}=h;
 register('scoped-wa-al10-review-replacement',['AL-WA-10'],async({page,row})=>{
  const route=contract.bindings.reviewReplacement[row.account];
  const read=contract.fixture.repairReads.find(r=>r.actor===row.account);
  const hint=new URL(route,contract.origin).searchParams.get('review');
  row.fixtureProvenance=contract.publicProof;row.canonicalRoute='/app/schedule/new?review=<actor-bound hint>';
  // Also redact generic verifier's outer execution-error evidence, after this callback exits.
  row.states=new Proxy(row.states??{},{set(target,key,value){if(value&&typeof value==='object'&&value.path)value={...value,path:'/app/schedule/new?review=REDACTED'};target[key]=value;return true;}});
  const gate=await hold(page,action);
  try{
   await go(page,row,route);
   await page.getByRole('heading',{name:'Review replacement',exact:true}).waitFor();
   await until(()=>page.locator('#replacement-shift').isVisible(),'Genuine Review replacement card did not render');
   await until(()=>page.evaluate(text=>{const root=document.documentElement,s=getComputedStyle(root);return root.dataset.textStep===String(text)&&Math.abs(parseFloat(s.getPropertyValue('--nv-text-scale'))-text/100)<.01&&Math.abs(parseFloat(s.fontSize)-16*text/100)<.1;},row.text),'Actual requested text scale is not hydrated');
   await h.hydrated(page.locator('.wa-page form.wa-form'),'onSubmit');
   const command=await page.locator('#replacement-shift').evaluate((card,{hint,read})=>{
    const form=card.closest('form'),entries=Array.from(form?.querySelectorAll('input[type=hidden]')??[]).filter(e=>!e.name.startsWith('$ACTION_'));
    const get=name=>entries.find(e=>e.name===name)?.value;
    const week=get('weekStart'),date=get('date'),when=new Date(week+'T00:00:00Z'),day=new Date(date+'T00:00:00Z');
    return{hiddenNames:entries.map(e=>e.name).sort(),reviewMatchesPrivateActorHint:get('coverageRepairReview')===hint,employeeMatchesInitialEligibility:get('employeeId')===read.selectedEmployeeId,dateMatchesInitialEligibility:date===read.date,startMatchesInitialEligibility:get('startTime')===read.start,endMatchesInitialEligibility:get('endTime')===read.end,canonicalWeek:/^\d{4}-\d{2}-\d{2}$/.test(week??'')&&when.getUTCDay()===1&&day>=when&&day<new Date(when.valueOf()+7*864e5),locationPresent:!!get('locationId'),positionFieldPresent:entries.some(e=>e.name==='positionId'),leadFlagCanonical:!entries.some(e=>e.name==='isDesignatedLead')||get('isDesignatedLead')==='on',noActorAuthorityOverride:!entries.some(e=>/actor|authority|session|proof/i.test(e.name)),clientSubmitHandlerHydrated:!!form&&Object.keys(form).some(key=>key.startsWith('__reactProps$')&&typeof form[key]?.onSubmit==='function'),nativeMethod:form?.method};
   },{hint,read});
   row.canonicalCommand=command;
   for(const [name,valid]of Object.entries(command))if(typeof valid==='boolean')check(row,valid,'Canonical hidden parameters: '+name);
   const geometry=await page.evaluate(()=>{
    const box=e=>e?.getBoundingClientRect().toJSON(),root=document.querySelector('.wa-page'),content=root?.querySelector(':scope > div.nv-content.wa-narrow'),form=content?.querySelector('form.wa-form'),card=document.querySelector('#replacement-shift'),band=root?.querySelector('[data-nv-band],.nv-masthead'),notice=form?.querySelector('.wa-notice'),actions=form?.querySelector('.wa-actions__buttons');
    const buttons=Array.from(actions?.querySelectorAll('button,a')??[]).map(e=>({tag:e.tagName,label:e.innerText.trim(),box:box(e),disabled:e.matches(':disabled'),ariaDisabled:e.getAttribute('aria-disabled')}));
    const s=content?getComputedStyle(content):null,rs=root?getComputedStyle(root):null;
    return{documentWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,root:box(root),content:box(content),form:box(form),card:box(card),band:box(band),notice:box(notice),buttons,wrapperIsSeparate:!!content&&!!form&&!form.classList.contains('nv-content'),contentPaddingLeft:parseFloat(s?.paddingLeft),contentPaddingRight:parseFloat(s?.paddingRight),contentMarginTop:parseFloat(s?.marginTop),overlap:parseFloat(rs?.getPropertyValue('--nv-overlap')),rootFontSize:getComputedStyle(document.documentElement).fontSize,textStep:document.documentElement.dataset.textStep};
   });
   row.geometry=geometry;
   check(row,geometry.wrapperIsSeparate,'Content wrapper is separate from zero-reset form');
   check(row,geometry.documentWidth<=row.width+1,'No horizontal document overflow');
   check(row,near(geometry.contentPaddingLeft,16)&&near(geometry.contentPaddingRight,16),'Kit content keeps16px inline gutter');
   check(row,!!geometry.card&&!!geometry.content&&near(geometry.card.x,geometry.content.x+16)&&near(geometry.card.right,geometry.content.right-16),'Card aligns to inner16px content edges');
   if(row.width<600)check(row,near(geometry.card.x,16)&&near(geometry.card.right,row.width-16),'Phone card keeps16px viewport gutters');
   if(row.width===1440)check(row,near(geometry.card.width,720),'Desktop reading card is720px at both text levels');
   check(row,!!geometry.band&&near(geometry.contentMarginTop,-geometry.overlap)&&near(geometry.band.bottom-geometry.card.top,geometry.overlap),'First card retains actual kit overlap token');
   check(row,!!geometry.notice&&near(geometry.notice.x,geometry.card.x)&&near(geometry.notice.right,geometry.card.right),'Notice aligns with replacement card');
   check(row,geometry.buttons.length===2,'Ready form exposes Save replacement and Back to coverage');
   const save=geometry.buttons.find(b=>b.tag==='BUTTON'),back=geometry.buttons.find(b=>b.tag==='A');
   check(row,!!save&&!save.disabled&&save.ariaDisabled!=='true','Real eligible Save replacement is enabled');
   check(row,!!back&&back.label==='Back to coverage','Back to coverage remains present');
   for(const b of geometry.buttons)check(row,b.box.left>=geometry.card.left-1&&b.box.right<=geometry.card.right+1,'Action stays inside card-aligned edges: '+b.tag);
   if(row.width<600)for(const b of geometry.buttons)check(row,near(b.box.left,geometry.card.left)&&near(b.box.right,geometry.card.right),'Phone action spans aligned card width: '+b.tag);
   else check(row,!!save&&near(save.box.right,geometry.card.right),'Desktop primary action aligns to card right edge');
   await evidence(page,row,'ready-top');cleanStatePaths(row);
   await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));await evidence(page,row,'ready-actions');cleanStatePaths(row);
   row.operations=gate.summary();check(row,gate.count===0,'Geometry inspection does not Save replacement');
  }catch(error){
   // Never let Playwright navigation failures print a dynamic capability URL.
   const message=String(error?.message??error).replaceAll(route,'/app/schedule/new?review=REDACTED').replaceAll(hint,'REDACTED');
   throw new Error(message);
  }finally{cleanStatePaths(row);}
 },{accounts:['QAOWNER','AUDIT-M'],sizes:[[320,844,100],[320,844,200],[390,844,100],[390,844,200],[1440,900,100],[1440,900,200]]});
}
