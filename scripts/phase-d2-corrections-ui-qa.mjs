import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { Temporal } from '@js-temporal/polyfill';
import { createOwnedNextApp } from '../src/test/integration/owned-next-app.ts';
import { seedOwnedApp, TEST_PASSWORD } from '../src/test/integration/owned-app-fixture.ts';
import { hashPassword } from '../src/lib/auth/password.ts';
import { verifyCorrectionRecovery } from './phase-d2-corrections-recovery-qa.mjs';
import {verifyD2UiRemediation} from './phase-d2-ui-remediation-qa.mjs';
import { missingTimeBrowserScenarios } from './phase-d2-missing-time-browser-scenarios.mjs';
import { APPROVED, CORRECTION_FORM, CORRECTION_QUEUE, CORRECTION_SHEET, SENT } from './phase-d2-quiet-selectors.mjs';

const WIDTHS=[320,375,390,430,768,1024,1440];
const ENGINES=['chromium','webkit'];
const evidence=resolve(process.env.PHASE_D2_CORRECTIONS_EVIDENCE_DIR??join(homedir(),'.codex','visualizations','nevora-d2-corrections-ui'));
await mkdir(evidence,{recursive:true});
const projectRequire=createRequire(import.meta.url);
let playwright;
try{playwright=projectRequire('playwright');}
catch{
 const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
 playwright=runtime('playwright');
}

const checkpoint=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const tree=execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim();
const tracked=execFileSync('git',['status','--porcelain=v1'],{encoding:'utf8'}).trim();
const expected=process.env.PHASE_D2_CORRECTIONS_EXPECTED_SHA?.trim();
assert.equal(tracked,'','D2 browser evidence requires a clean worktree including untracked files');
if(expected)assert.equal(checkpoint,expected,'D2 browser evidence must run on requested SHA');

const report={
 generatedAt:new Date().toISOString(),checkpoint,tree,sourceClean:true,expectedSha:expected??null,
 checks:[],errors:[],screenshots:[],
 limitations:[
  'Owned local Next application and fictional PostgreSQL are not hosted Vercel/Neon acceptance.',
  'Local Chromium/WebKit automation does not replace physical-device or screen-reader acceptance.',
 ],
};
const checked=(name)=>{report.checks.push(name);console.log('[D2 browser] PASS '+name);};
let app;
const browsers=[];
const cookiesByActor=new Map();
const q=(text,values=[])=>app.database.executor.query({text,values});

async function context(browser,viewport={width:1440,height:1000}){
 const c=await browser.newContext({viewport,serviceWorkers:'block'});
 await c.route('**/*',(route)=>{
  const u=new URL(route.request().url());
  if(['http:','https:'].includes(u.protocol)&&u.origin!==app.url)return route.abort('blockedbyclient');
  return route.continue();
 });
 return c;
}
async function login(c,id,{reuseSession=false}={}){
 if(reuseSession&&cookiesByActor.has(id)){
  await c.addCookies(cookiesByActor.get(id));
  const endpoint=id==='QAOWNER'?'/api/manager/time-corrections':'/api/employee/time-corrections';
  const current=await c.request.get(app.url+endpoint,{headers:{'X-Nevora-Time-Correction':'1'}});
  assert.equal(current.status(),200,'Reused real fixture session must still pass current server authorization');
  report.sessionReuses??=[];report.sessionReuses.push({role:id==='QAOWNER'?'Owner':'Employee',status:current.status()});return;
 }
 const page=await c.newPage();
 page.setDefaultTimeout(15000);
 await page.goto(app.url+'/login',{waitUntil:'domcontentloaded'});
 await page.getByLabel('Employee ID',{exact:true}).fill(id);
 await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);
 await Promise.all([
  page.waitForURL((url)=>url.pathname==='/app',{waitUntil:'commit'}),
  page.getByRole('button',{name:'Sign in',exact:true}).click(),
 ]);
 await page.locator('.app-shell.nevora-portal').waitFor();await page.waitForLoadState('networkidle');
 cookiesByActor.set(id,await c.cookies(app.url));
 await page.close();
}
async function geometry(page,selector,label,engine,width){
 const value=await page.evaluate((rootSelector)=>{
  const root=document.querySelector(rootSelector);
  if(!root)throw new Error('D2 surface missing: '+rootSelector);
  const rb=root.getBoundingClientRect();
  const visible=(el)=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';};
  const target=(el)=>{
   // Quiet radios and pickers are visually hidden inputs; their row (the label) is what is tapped.
   const own=el.getBoundingClientRect(),label=el.labels?.[0]??el.closest('label');
   if(label&&(own.height<2||getComputedStyle(el).opacity==='0'))return label.getBoundingClientRect();
   // A 32pt pill with a 44pt ::before hit area is a 44pt target.
   const before=getComputedStyle(el,'::before');
   if(before.content!=='none'&&before.position==='absolute'){const top=parseFloat(before.top),bottom=parseFloat(before.bottom);if(top<0||bottom<0)return {height:own.height-Math.min(top,0)-Math.min(bottom,0),left:own.left,right:own.right};}
   return own;
  };
  const controls=[...root.querySelectorAll('button,a,input,select,textarea')].filter(visible).map((el)=>{
   const r=target(el);return {tag:el.tagName,text:el.getAttribute('aria-label')||el.textContent||'',height:r.height,left:r.left,right:r.right};
  });
  const clipped=[...root.querySelectorAll('strong,small,p,label,span,b,i')].filter(visible).flatMap((el)=>{
   const r=el.getBoundingClientRect();return r.left<rb.left-2||r.right>rb.right+2?[{text:el.textContent,left:r.left,right:r.right}]:[];
  });
  return {doc:document.documentElement.scrollWidth,view:document.documentElement.clientWidth,controls,clipped};
 },selector);
 assert(value.doc<=value.view+2,`${engine} ${width} ${label} horizontal overflow`);
 assert.deepEqual(value.clipped,[],`${engine} ${width} ${label} clipped text`);
 assert.deepEqual(value.controls.filter((c)=>c.height<43.5),[],`${engine} ${width} ${label} control height`);
 checked(`${engine}: ${label} geometry ${width}`);
}
function localValue(instant){
 const z=Temporal.Instant.from(instant).toZonedDateTimeISO('America/Puerto_Rico');
 return `${z.year}-${String(z.month).padStart(2,'0')}-${String(z.day).padStart(2,'0')}T${String(z.hour).padStart(2,'0')}:${String(z.minute).padStart(2,'0')}`;
}

try{
 const passwordHash=await hashPassword(TEST_PASSWORD);
 for(const engine of ENGINES){
 const fixtureEvidence=join(evidence,engine);await mkdir(fixtureEvidence,{recursive:true});
 app=await createOwnedNextApp(fixtureEvidence);cookiesByActor.clear();
 await seedOwnedApp(app.database.executor);
 await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('D2-E','Avery','Correction QA','555-0202','EMPLOYEE','loc-1')");
 await q('INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false)',['D2-E',passwordHash]);
 await q("INSERT INTO employee_location_eligibility VALUES('D2-E','loc-1')");
 await q("INSERT INTO clocker_devices(id,location_id,name,active) VALUES('d2-device','loc-1','D2 QA Device',true)");
 const [entry]=await q(`INSERT INTO time_entries(
   id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status,version
  ) VALUES('d2-browser-entry','D2-E','loc-1','d2-device',
    date_trunc('minute',clock_timestamp()-interval '4 hours'),
    date_trunc('minute',clock_timestamp()-interval '2 hours'),
    'CLOCKED_OUT',4)
  RETURNING clock_in_at::text AS "startAt",clock_out_at::text AS "endAt"`);
 const proposedStart=localValue(entry.startAt);
 const proposedEnd=localValue(Temporal.Instant.from(entry.endAt).subtract({minutes:5}).toString());
 await q(`INSERT INTO break_entries(id,time_entry_id,break_start_at,break_end_at,version)
   VALUES('d2-browser-break','d2-browser-entry',clock_timestamp()-interval '190 minutes',clock_timestamp()-interval '175 minutes',1)`);

  const browser=await playwright[engine].launch({headless:true});
  browsers.push(browser);
  const employee=await context(browser);
  await login(employee,'D2-E');
  assert.equal((await employee.request.get(app.url+'/api/employee/time-corrections',{headers:{'X-Nevora-Time-Correction':'1'}})).status(),200);
  assert.equal((await employee.request.get(app.url+'/api/manager/time-corrections',{headers:{'X-Nevora-Time-Correction':'1'}})).status(),403);
  checked(engine+': employee correction authority boundaries');

  const ep=await employee.newPage();ep.setDefaultTimeout(15000);
  await ep.goto(app.url+'/app/my-time',{waitUntil:'networkidle'});
  await ep.bringToFront();
  await ep.waitForTimeout(1200);
  // v5 My time: each entry is a row that opens its punches and its correction as a sheet.
  const entryRow=ep.locator('ul[aria-labelledby^="employee-time-"] > li > button[aria-haspopup="dialog"]').first();
  await entryRow.waitFor();
  await entryRow.click();
  const sheet=ep.locator('dialog[open]');
  // Team U3 (T-19): the entry's sheet has "Something wrong? Request a correction", which opens the one correction
  // sheet ("Cancel · Correction · Send") filled in for this entry.
  const trigger=sheet.getByRole('button',{name:'Something wrong? Request a correction',exact:true});
  await trigger.waitFor({state:'visible'});
  assert.equal(await trigger.getAttribute('aria-haspopup'),'dialog');
  await trigger.click();
  const correctionForm=ep.locator(CORRECTION_FORM);
  await correctionForm.waitFor({state:'visible'});
  assert.equal(await correctionForm.getByRole('radio',{name:/^Wrong clock-in/}).isChecked(),true);
  assert.equal(await correctionForm.getByLabel('Recorded entry',{exact:true}).inputValue(),'d2-browser-entry:entry');
  // The same proposal as before: the recorded start, the end five minutes earlier.
  // Quiet radios are visually hidden inputs; their row is what is tapped.
  await correctionForm.locator('label',{hasText:'Wrong clock-out'}).click();
  assert.equal(await correctionForm.getByRole('radio',{name:/^Wrong clock-out/}).isChecked(),true);
  await correctionForm.getByLabel('Recorded entry',{exact:true}).selectOption('d2-browser-entry:entry');
  assert.equal(await correctionForm.locator('input[type="time"]').count(),1);
  await correctionForm.getByLabel('Ends',{exact:true}).fill(proposedEnd.slice(11,16));
  await correctionForm.getByLabel('Note',{exact:true}).fill('Fictional D2 browser correction review.');
  assert.equal(proposedStart.slice(0,10),proposedEnd.slice(0,10),'the fixture entry stays on one local day');
  checked(engine+': employee correction form expands with labeled controls');

  for(const width of WIDTHS){
   await ep.setViewportSize({width,height:width<=430?844:1000});
   await geometry(ep,CORRECTION_SHEET,'employee correction form',engine,width);
   const shot=join(evidence,`${engine}-employee-correction-${width}.png`);
   await ep.screenshot({path:shot,fullPage:true});report.screenshots.push(shot);
  }
  await correctionForm.getByRole('button',{name:'Send',exact:true}).click();
  await ep.getByText(SENT,{exact:true}).waitFor();
  await ep.locator('.employee-correction-center').getByText('Waiting',{exact:true}).waitFor();
  checked(engine+': employee submits correction through real D2 API');

  const employeeState=await employee.request.get(app.url+'/api/employee/time-corrections',{headers:{'X-Nevora-Time-Correction':'1'}});
  const employeeJson=await employeeState.json();
  assert.equal(employeeJson.state,'ready');
  const pending=employeeJson.requests.find((item)=>item.status==='PENDING');
  assert(pending?.id,'pending correction request missing');
  await employee.close();

  const owner=await context(browser);
  await login(owner,'QAOWNER');
  assert.equal((await owner.request.get(app.url+'/api/manager/time-corrections',{headers:{'X-Nevora-Time-Correction':'1'}})).status(),200);
  checked(engine+': Owner can read correction review inbox');

  const mp=await owner.newPage();mp.setDefaultTimeout(15000);
  await mp.goto(app.url+'/app?view=attendance',{waitUntil:'networkidle'});
  await mp.getByRole('heading',{name:'Correction requests',exact:true}).waitFor();
  await mp.locator(CORRECTION_QUEUE).getByText('Avery Correction QA',{exact:true}).waitFor();
  await mp.locator(CORRECTION_QUEUE).getByText('The original Clocker record is kept.',{exact:true}).last().waitFor();
  assert.equal(await mp.getByRole('button',{name:'Approve correction for Avery Correction QA'}).isEnabled(),true);
  checked(engine+': populated manager correction review state');

  for(const width of WIDTHS){
   await mp.setViewportSize({width,height:width<=430?844:1000});
   await geometry(mp,CORRECTION_QUEUE,'manager correction review',engine,width);
   const shot=join(evidence,`${engine}-manager-correction-${width}.png`);
   await mp.screenshot({path:shot,fullPage:true});report.screenshots.push(shot);
  }
  const approve=mp.getByRole('button',{name:'Approve correction for Avery Correction QA'});
  await approve.focus();
  assert.equal(await approve.evaluate((el)=>document.activeElement===el),true);
  checked(engine+': keyboard focus reaches employee-specific approval control');
  await approve.click();
  await mp.getByText(APPROVED,{exact:true}).waitFor();
  // A ready queue with nothing waiting has no rows (the decision's notice stays).
  await mp.locator(`${CORRECTION_QUEUE} li.u1-correction`).first().waitFor({state:'detached'});
  checked(engine+': manager approves through real D2 API and inbox clears');

  const managerState=await owner.request.get(app.url+'/api/manager/time-corrections',{headers:{'X-Nevora-Time-Correction':'1'}});
  assert.deepEqual((await managerState.json()).requests,[]);
  await owner.close();

  const employeeAfter=await context(browser);
  await login(employeeAfter,'D2-E');
  const hp=await employeeAfter.newPage();hp.setDefaultTimeout(15000);
  await hp.goto(app.url+'/app/my-time',{waitUntil:'networkidle'});
  await hp.getByText('Approved',{exact:true}).first().waitFor();
  checked(engine+': employee correction history reflects approved terminal state');
  await missingTimeBrowserScenarios({app,browser,engine,employee:employeeAfter,page:hp,context,login,geometry,checked,localValue,evidence,report});
  await employeeAfter.close();
  await verifyCorrectionRecovery({browser,engine,app,q,context,login,checked,report,evidence,geometry});
  await verifyD2UiRemediation({app,browser,engine,evidence,report,checked,context,login,geometry,widths:WIDTHS});
  await browser.close();await app.close();app=undefined;cookiesByActor.clear();
 }
 assert.deepEqual(report.errors,[]);
}catch(error){
 report.errors.push(String(error?.stack??error));process.exitCode=1;
}finally{
 for(const browser of browsers)await browser.close().catch(()=>{});
 if(app)await app.close().catch((error)=>report.errors.push(String(error)));
 report.finishedAt=new Date().toISOString();
 await writeFile(join(evidence,'report.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify({checks:report.checks.length,errors:report.errors,evidence,checkpoint},null,2));
}
