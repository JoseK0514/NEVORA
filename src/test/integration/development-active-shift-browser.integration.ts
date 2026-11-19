import {it,expect} from '@rstest/core';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createOwnedNextApp} from './owned-next-app';
import {seedOwnedApp,seedOwnedScenario,TEST_PASSWORD} from './owned-app-fixture';
import {seedEmployeeHours} from './employee-hours-fixture';
import {publishScheduleWithRevision} from '../../lib/data/schedules';
import {weekStartFor} from '../../lib/date-utils';

const runtime=createRequire(resolve('tools/ci-browser-runtime/package.json'))('playwright');
it.each(['chromium','webkit'])('%s keeps Home and Time consistent during the next active shift',async engine=>{
 const root=process.env.NEVORA_ALL_UI_BROWSER_EVIDENCE;if(!root)throw Error('External combined UI evidence required');
 const evidence=resolve(root,'active-shift-'+engine);await mkdir(evidence,{recursive:true});
 const app=await createOwnedNextApp(evidence,{pinDevTypeReferences:true});
 const browser=await runtime[engine].launch({headless:true}),context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block',reducedMotion:'reduce'}),page=await context.newPage();
 const q=<T=Record<string,unknown>>(text:string,values:unknown[]=[])=>app.database.executor.query<T>({text,values});
 const errors:string[]=[];let complete=false;
 try{
  await seedOwnedApp(app.database.executor);const f=await seedOwnedScenario(app.database.executor,'SPLITACTIVE',0),actor=f.actors[0];
  await q("UPDATE employees SET role='EMPLOYEE' WHERE id=$1",[actor]);const records=await seedEmployeeHours(app.database.executor,actor,'SPLIT');
  const clock=await q<{today:string;wall:string}>("SELECT to_char(clock_timestamp() AT TIME ZONE 'America/Puerto_Rico','YYYY-MM-DD') AS today,to_char(clock_timestamp() AT TIME ZONE 'America/Puerto_Rico','HH24:MI') AS wall");
  const {today,wall}=clock[0];if(wall<'00:01')throw Error('Run the real-clock fixture after the first minute of the business day');
  const boundary=wall<'12:00'?'00:01':'12:00',schedule='qa-split-current';
  await q("INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES($1,'loc-1',$2,'DRAFT','QAOWNER')",[schedule,weekStartFor(today)]);
  for(const [id,start,end]of [['qa-split-first','00:00',boundary],['qa-split-second',boundary,'24:00']])await q("INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,position_id,is_designated_lead) VALUES($1,$2,$3,$4,$5,$6,'qa-pos',false)",[id,schedule,actor,today,start,end]);
  await publishScheduleWithRevision({locationId:'loc-1',weekStart:weekStartFor(today),managerId:'QAOWNER'},app.database.executor);
  await q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status) VALUES('qa-split-open',$1,'loc-1',$2,($3::date::timestamp AT TIME ZONE 'America/Puerto_Rico'),'CLOCKED_IN')",[actor,records.deviceId,today]);
  page.setDefaultTimeout(20000);page.on('pageerror',(error:Error)=>errors.push(error.message));const origin=app.url.replace('127.0.0.1','localhost');
  await page.goto(origin+'/login');await page.getByLabel('Employee ID',{exact:true}).fill(actor);await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(origin+'/app');await page.bringToFront();
  const home=page.locator('#b-home-shift');await home.getByText(/Clocked in at/).waitFor();expect(await home.innerText()).not.toContain('shift has ended');await page.screenshot({path:resolve(evidence,'home.png'),fullPage:true});
  await page.goto(origin+'/app/my-time');await page.bringToFront();const now=page.locator('#b-hours-now');await now.getByText('Clocked in',{exact:true}).waitFor();expect(await now.innerText()).not.toContain('shift has ended');expect(await now.locator('[data-dot="green"]').count()).toBe(1);await page.screenshot({path:resolve(evidence,'time.png'),fullPage:true});
  expect(errors).toEqual([]);complete=true;
 }finally{await page.screenshot({path:resolve(evidence,'final.png'),fullPage:true}).catch(()=>{});await context.close();await browser.close();await app.close();await writeFile(resolve(evidence,'results.json'),JSON.stringify({complete,errors,scope:'Real owned SQL, published contiguous assignments, open punch, sign-in and actual Home/Time pages; no substituted time or read payload'},null,2));}
},300000);
