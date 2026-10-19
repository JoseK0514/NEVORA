import assert from 'node:assert/strict';
import {seedInitialWaveB} from '/workspace/nevora-inspections/p35-wave-b/full-exit-cd764f6/preparation/bindings/initial-fixture.mts';
import {spawnSync,execFileSync} from 'node:child_process';
import {createRequire,registerHooks} from 'node:module';
import {randomBytes,randomUUID} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {createServer} from 'node:net';
import {tmpdir} from 'node:os';
import {createOwnedNextApp} from './owned-preview-app-dev.mts';
import {seedOwnedApp,TEST_PASSWORD} from '../../src/test/integration/owned-app-fixture.ts';
import {hashPassword} from '../../src/lib/auth/password.ts';
import {businessDate} from '../../src/lib/business-time.ts';
import {weekStartFor,addDays} from '../../src/lib/date-utils.ts';
import {publishScheduleWithRevision} from '../../src/test/integration/management-api.ts';

// Shared NEVORA preview for parallel sessions. PREVIEW_OUT = your own scratch folder (required).
// Source: PREVIEW_SOURCE, or this repository (it must have no uncommitted changes). Later edits reach the running mirror with sync.sh.
if(!process.env.PREVIEW_OUT)throw Error('Set PREVIEW_OUT to a folder in your own scratchpad');
const root=resolve(process.env.PREVIEW_OUT),source=resolve(process.env.PREVIEW_SOURCE??resolve(import.meta.dirname,'../..')),evidence=join(root,'evidence-'+new Date().toISOString().replace(/[:.]/g,'-'));
await mkdir(root,{recursive:true});
process.chdir(source);
const checkpoint=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
assert.equal(execFileSync('git',['status','--porcelain','--untracked-files=no'],{encoding:'utf8'}).trim(),'');
await mkdir(evidence,{recursive:false});
await mkdir(join(evidence,'screenshots'));
const runtime=createRequire(join(process.env.PLAYWRIGHT_RUNTIME_ROOT??join(source,'node_modules'),'package.json'));
const pw=runtime('playwright'),axeFile=join(source,'node_modules/axe-core/axe.min.js');
const pgBin=process.env.PG_BIN??execFileSync('pg_config',['--bindir'],{encoding:'utf8'}).trim();
const marker=randomBytes(16).toString('hex');
const cluster=join((process.env.NEVORA_PREVIEW_TMP??(process.platform==='darwin'?'/private/tmp':tmpdir())),'nevora-ui-preview-'+marker.slice(0,10)),data=join(cluster,'data');
await mkdir(cluster,{recursive:true});
await writeFile(join(cluster,'owner'),marker,{mode:0o600});
const pg=(name,args)=>{const r=spawnSync(join(pgBin,name),args,{encoding:'utf8',timeout:45000});if(r.error||r.status!==0)throw Error(name+': '+(r.error?.message??r.stderr));};
const port=await new Promise((res,rej)=>{const s=createServer();s.once('error',rej);s.listen(0,'127.0.0.1',()=>{const p=s.address().port;s.close(()=>res(p));});});
const report={checkpoint,tree:execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim(),startedAt:new Date().toISOString(),screens:[],errors:[],checks:[],limitations:['Owned local Next/PostgreSQL with fictional data; only DB adapter, bounded test transport and generated development type references substituted.','Viewport emulation is not physical iPhone/iPad testing.','Automated axe and keyboard checks do not certify a screen-reader audit.','Route visual inspection is not complete business workflow regression or production verification.']};
let app,fixtureAccess,started=false;const browsers=[];
const stop=new AbortController();
for(const signal of ['SIGTERM','SIGINT'])process.once(signal,()=>stop.abort(new Error('Owned preview shutdown requested')));
report.runtimeAdapter=JSON.parse(await readFile(new URL('../../runtime-adapter-manifest.json',import.meta.url),'utf8'));
let saveChain=Promise.resolve();
const save=()=>{const snapshot=JSON.stringify(report,null,2);saveChain=saveChain.then(()=>writeFile(join(evidence,'audit.json'),snapshot));return saveChain;};
const q=(text,values=[])=>app.database.executor.query({text,values});
async function context(browser,width){const c=await browser.newContext({viewport:{width,height:width<600?844:1000},hasTouch:width<1024,isMobile:width<600,serviceWorkers:'block'});await c.route('**/*',r=>{const u=new URL(r.request().url());return ['http:','https:'].includes(u.protocol)&&u.origin!==app.url?r.abort():r.continue();});return c;}
async function login(c,id,password=TEST_PASSWORD){const p=await c.newPage();await p.goto(app.url+'/login',{waitUntil:'domcontentloaded',timeout:45000});await p.getByLabel('Employee ID',{exact:true}).fill(id);await p.getByLabel('Password',{exact:true}).fill(password);await Promise.all([p.waitForURL(u=>u.pathname==='/app'),p.getByRole('button',{name:'Sign In',exact:true}).click()]);await p.close();}
async function capture(c,item,engine,width){const p=await c.newPage();p.setDefaultTimeout(15000);const errors=[];p.on('pageerror',e=>errors.push(e.name+': '+e.message));const record={key:item.key,route:item.path,role:item.role,engine,width,errors};report.screens.push(record);try{
 const response=await p.goto(app.url+item.path,{waitUntil:'domcontentloaded'});record.status=response?.status();await p.waitForLoadState('networkidle',{timeout:10000}).catch(()=>{});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(100);record.finalPath=new URL(p.url()).pathname;
 if(item.key==='owner-settings-company-policies'){assert.equal(await p.locator('.company-policy-editor select').evaluateAll(es=>es.filter(e=>e.getBoundingClientRect().width>0).every(e=>e.getBoundingClientRect().height>=44)),true,'Policy selects must retain their touch target in both browsers');}
 if(item.key==='payroll-owner-payroll'){await p.locator('.pw-review-current .pw-panel').waitFor();const bounds=await p.locator('.pw-review-current .pw-panel').boundingBox();assert.ok(bounds&&bounds.width>=(width===1440?600:200),'Selected payroll review must have usable width');}
 record.metrics=await p.evaluate(()=>{
 const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e),d=e.closest('details:not([open])');return r.width>1.5&&r.height>1.5&&s.display!=='none'&&s.visibility!=='hidden'&&(!d||d.querySelector(':scope > summary')?.contains(e));};
 const desc=e=>({tag:e.tagName,class:e.getAttribute('class'),text:(e.getAttribute('aria-label')||e.textContent||'').trim().replace(/\s+/g,' ').slice(0,100)});
 const controls=[...document.querySelectorAll('button,summary,a.button,a[class*="action"],input:not([type=hidden]):not([type=checkbox]):not([type=radio]),select,textarea')].filter(visible).map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {...desc(e),height:Math.round(r.height*10)/10,width:Math.round(r.width*10)/10,left:r.left,right:r.right,font:s.fontFamily,fontSize:s.fontSize,color:s.color,background:s.backgroundColor};});
 const headings=[...document.querySelectorAll('h1,h2,h3')].filter(visible).map(e=>{const s=getComputedStyle(e),r=e.getBoundingClientRect();return {...desc(e),font:s.fontFamily,size:s.fontSize,weight:s.fontWeight,lineHeight:s.lineHeight,width:Math.round(r.width),height:Math.round(r.height)};});
 const fonts=[...new Set([...document.querySelectorAll('main *')].filter(visible).filter(e=>e.childNodes.length&&[...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())).map(e=>getComputedStyle(e).fontFamily))];
 const clipped=[...document.querySelectorAll('h1,h2,h3,label,p,.button,.status-pill')].filter(visible).filter(e=>e.scrollWidth>e.clientWidth+2&&['hidden','clip'].includes(getComputedStyle(e).overflowX)&&getComputedStyle(e).textOverflow!=='ellipsis').map(desc);
 const overflowElements=[...document.querySelectorAll('body *')].filter(visible).filter(e=>e.scrollWidth>e.clientWidth+2||e.getBoundingClientRect().right>innerWidth+1).map(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {...desc(e),width:r.width,left:r.left,right:r.right,scrollWidth:e.scrollWidth,clientWidth:e.clientWidth,overflow:s.overflowX,position:s.position};});
 return {overflowElements,viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,documentHeight:document.documentElement.scrollHeight,headings,fonts,controls,shortControls:controls.filter(c=>c.height<43.5),outsideControls:controls.filter(c=>c.left<-1||c.right>innerWidth+1),clipped,text:document.querySelector('main')?.innerText?.slice(0,14000)??document.body.innerText.slice(0,14000),nav:[...document.querySelectorAll('[aria-current]')].map(e=>({...desc(e),current:e.getAttribute('aria-current'),background:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color})),navSurfaces:[...document.querySelectorAll('.sidebar,.mobile-nav')].filter(visible).map(e=>({...desc(e),background:getComputedStyle(e).backgroundColor}))};
 });
 await p.addScriptTag({path:axeFile});record.axe=await p.evaluate(async()=>{const r=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa']}});return r.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,nodes:v.nodes.slice(0,12).map(n=>({target:n.target,summary:n.failureSummary,html:n.html.slice(0,400)}))}));});
 const file=item.key+'-'+engine+'-'+width;record.screenshot='screenshots/'+file+'-full.png';record.fullScreenshot='screenshots/'+file+'-full.png';
 await p.screenshot({path:join(evidence,record.fullScreenshot),fullPage:true,style:'nextjs-portal{display:none!important}'});
 const first=p.locator('main button:visible,main input:visible,main select:visible,main summary:visible,main a.button:visible').first();if(await first.count()){await first.focus();record.focus=await first.evaluate(e=>{const s=getComputedStyle(e);return {label:e.getAttribute('aria-label')||e.textContent?.trim(),outline:s.outline,boxShadow:s.boxShadow,active:document.activeElement===e};});}
 if(process.env.NEVORA_UI_DIAGNOSTIC==='navigation'){for(const nav of record.metrics.nav.filter(n=>/(?:^| )(?:(?:mobile-)?nav-link) active(?: |$)/.test(n.class))){assert.equal(nav.background,'rgb(56, 38, 34)','Shared selected navigation fill');assert.equal(nav.color,'rgb(255, 255, 255)','Shared selected navigation text');}for(const surface of record.metrics.navSurfaces.filter(n=>n.class.split(' ').includes('sidebar')))assert.equal(surface.background,'rgb(17, 24, 39)','Shared sidebar surface');}
 assert.ok(record.status<500,'Unexpected server failure');assert.ok(record.metrics.documentWidth<=width+1,'Document overflow');assert.equal(record.axe.length,0,'Automated accessibility violation');assert.equal(errors.length,0,'Client render error');assert.equal(record.metrics.shortControls.length,0,'Undersized visible control');
 record.result='captured';console.log('CAPTURE '+engine+' '+width+' '+item.key+' status='+record.status+' axe='+record.axe.length+' short='+record.metrics.shortControls.length);
 }catch(e){record.result='failed';record.failure=e.message;console.log('FAIL '+engine+' '+width+' '+item.key+' '+e.message.slice(0,150));}finally{await p.close();await save();}}
try{
 pg('initdb',['-D',data,'-U','nevora_audit','--auth-local=trust','--auth-host=trust','--encoding=UTF8','--no-locale']);
 pg('pg_ctl',['-D',data,'-l',join(cluster,'postgres.log'),'-w','start','-o',`-h 127.0.0.1 -p ${port} -k ${cluster}`]);started=true;
 delete process.env.DATABASE_URL;
 process.env.FUEL_TEST_DATABASE_URL=`postgresql://nevora_audit@127.0.0.1:${port}/nevora_exchange_test_audit_${marker.slice(0,12)}`;
 process.env.FUEL_TEST_ALLOW_DESTRUCTIVE_TEARDOWN='yes';process.env.NEVORA_PAYROLL_ENABLED='true';
 app=await createOwnedNextApp(evidence,{signal:stop.signal,beforeListen:async owned=>{fixtureAccess=await seedInitialWaveB(owned,report,evidence);},payrollEnabled:true,pinDevTypeReferences:true,clockerPinKey:randomBytes(32).toString('hex'),clockerPunchEnabled:true});
 report.sourceManifest=join(app.root,'source-manifest.json');await writeFile(join(evidence,'runtime.json'),JSON.stringify({url:app.url,root:app.root,checkpoint:report.checkpoint},null,2));console.log('READY '+app.url);
 const demoPassword=fixtureAccess.password;
 await writeFile(join(evidence,'access.json'),JSON.stringify({url:app.url,checkpoint,demoAccounts:report.demoAccounts,password:demoPassword},null,2),{mode:0o600});
 console.log('PREVIEW_READY '+app.url);
 await save();
 await new Promise(resolveStop=>{if(stop.signal.aborted)resolveStop();else stop.signal.addEventListener('abort',resolveStop,{once:true});});
 report.completedAt=new Date().toISOString();
}catch(e){report.errors.push(e.stack);console.error('AUDIT ERROR '+e.stack);process.exitCode=1;}
finally{for(const b of browsers)await b.close().catch(()=>{});if(app){try{await app.close();report.sourceAndMirrorVerified=true;}catch(e){report.errors.push('Close: '+e.message);}}if(started){pg('pg_ctl',['-D',data,'-m','fast','-w','stop']);report.postgresStopped=true;await writeFile(join(evidence,'postgres.log'),await readFile(join(cluster,'postgres.log')));}await save();}
