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

const WIDTHS=[320,375,390,430,768,1024,1440];
const ENGINES=['chromium','webkit'];
const evidence=resolve(process.env.PHASE_D2_CORRECTIONS_EVIDENCE_DIR??join(homedir(),'.codex','visualizations','nevora-d2-corrections-ui'));
await mkdir(evidence,{recursive:true});
const projectRequire=createRequire(import.meta.url);
let playwright;
try{playwright=projectRequire('playwright');}
catch{
 const runtime=createRequire(join(homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json'));
 playwright=runtime('playwright');
}

const checkpoint=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
const tree=execFileSync('git',['rev-parse','HEAD^{tree}'],{encoding:'utf8'}).trim();
const tracked=execFileSync('git',['status','--porcelain=v1','--untracked-files=no'],{encoding:'utf8'}).trim();
const expected=process.env.PHASE_D2_CORRECTIONS_EXPECTED_SHA?.trim();
assert.equal(tracked,'','D2 browser evidence requires a clean tracked worktree');
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
async function login(c,id){
 const page=await c.newPage();
 page.setDefaultTimeout(15000);
 await page.goto(app.url+'/login',{waitUntil:'domcontentloaded'});
 await page.getByLabel('Employee ID',{exact:true}).fill(id);
 await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);
 await Promise.all([
  page.waitForURL((url)=>url.pathname==='/app'),
  page.getByRole('button',{name:'Sign In',exact:true}).click(),
 ]);
 await page.waitForLoadState('networkidle');
 await page.close();
}
async function geometry(page,selector,label,engine,width){
 const value=await page.evaluate((rootSelector)=>{
  const root=document.querySelector(rootSelector);
  if(!root)throw new Error('D2 surface missing: '+rootSelector);
  const rb=root.getBoundingClientRect();
  const visible=(el)=>{const r=el.getBoundingClientRect(),s=getComputedStyle(el);return r.width>0&&r.height>0&&s.display!=='none'&&s.visibility!=='hidden';};
  const controls=[...root.querySelectorAll('button,a,input,select,textarea')].filter(visible).map((el)=>{
   const r=el.getBoundingClientRect();return {tag:el.tagName,text:el.getAttribute('aria-label')||el.textContent||'',height:r.height,left:r.left,right:r.right};
  });
  const clipped=[...root.querySelectorAll('strong,small,p,label,span')].filter(visible).flatMap((el)=>{
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
 app=await createOwnedNextApp(evidence);
 await seedOwnedApp(app.database.executor);
 const passwordHash=await hashPassword(TEST_PASSWORD);
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

 for(const engine of ENGINES){
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
  const entryDetails=ep.locator('.employee-time-entry').first();
  await entryDetails.waitFor();
  await entryDetails.locator('summary').click();
  const trigger=ep.locator('.employee-time-entry[open] .employee-time-correction-trigger').first();
  await trigger.waitFor({state:'visible'});
  assert.equal(await trigger.getAttribute('aria-expanded'),'false');
  await trigger.click();
  const correctionForm=ep.locator('.employee-time-entry[open] .employee-time-correction-form').first();
  await correctionForm.waitFor({state:'visible'});
  assert.equal(await trigger.getAttribute('aria-expanded'),'true');
  await ep.getByLabel('Start',{exact:true}).fill(proposedStart);
  await ep.getByLabel('End',{exact:true}).fill(proposedEnd);
  await ep.getByLabel('Reason',{exact:true}).fill('Fictional D2 browser correction review.');
  checked(engine+': employee correction form expands with labeled controls');

  for(const width of WIDTHS){
   await ep.setViewportSize({width,height:width<=430?844:1000});
   await geometry(ep,'.employee-time-correction-form','employee correction form',engine,width);
   const shot=join(evidence,`${engine}-employee-correction-${width}.png`);
   await ep.screenshot({path:shot,fullPage:true});report.screenshots.push(shot);
  }
  await ep.getByRole('button',{name:'Send request',exact:true}).click();
  await ep.getByText('Correction request sent for manager review.',{exact:true}).waitFor();
  await ep.getByText('Pending',{exact:true}).waitFor();
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
  await mp.getByText('Avery Correction QA',{exact:true}).waitFor();
  await mp.getByText('Original recorded punches stay unchanged. Approval creates an auditable effective adjustment.',{exact:true}).waitFor();
  assert.equal(await mp.getByRole('button',{name:'Approve correction for Avery Correction QA'}).isEnabled(),true);
  checked(engine+': populated manager correction review state');

  for(const width of WIDTHS){
   await mp.setViewportSize({width,height:width<=430?844:1000});
   await geometry(mp,'.manager-corrections','manager correction review',engine,width);
   const shot=join(evidence,`${engine}-manager-correction-${width}.png`);
   await mp.screenshot({path:shot,fullPage:true});report.screenshots.push(shot);
  }
  const approve=mp.getByRole('button',{name:'Approve correction for Avery Correction QA'});
  await approve.focus();
  assert.equal(await approve.evaluate((el)=>document.activeElement===el),true);
  checked(engine+': keyboard focus reaches employee-specific approval control');
  await approve.click();
  await mp.getByText('Correction approved. The original recorded punch remains unchanged.',{exact:true}).waitFor();
  await mp.getByText('No correction requests',{exact:true}).waitFor();
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
  await employeeAfter.close();
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
