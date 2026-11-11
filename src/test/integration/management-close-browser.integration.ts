import {expect,it} from 'vitest';
import {createRequire} from 'node:module';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {createOwnedNextApp} from './owned-next-app';
import {seedOwnedApp,seedOwnedScenario,assignOwnedManagerCompanyAccess,TEST_PASSWORD} from './owned-app-fixture';
import {hashPassword} from '../../lib/auth/password';
import type {ManagementCloseContext} from '../../lib/management-close/contracts';

it('exercises real password cookies and management-close HTTP/SQL in an owned browser',async()=>{
  const evidence=process.env.NEVORA_MANAGEMENT_CLOSE_EVIDENCE;if(!evidence)throw Error('Select an external management-close evidence directory');
  await mkdir(evidence,{recursive:true});
  const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??resolve('tools/ci-browser-runtime/package.json'))('playwright');
  const app=await createOwnedNextApp(evidence),checks:string[]=[],errors:string[]=[];
  const q=(text:string,values:unknown[]=[])=>app.database.executor.query({text,values});
  let browser:{close():Promise<void>}|undefined,complete=false;
  try {
    await seedOwnedApp(app.database.executor);
    const password=await hashPassword(TEST_PASSWORD);
    for(const [id,role] of [['R10MANAGER','MANAGER'],['R10LEAD','LEAD'],['R10EMPLOYEE','EMPLOYEE']]){
      await q("INSERT INTO employees(id,first_name,last_name,phone,email,role,primary_location_id) VALUES($1,'Fictional',$1,'r08-private-contact-'||$1,$1||'@r08-private.invalid',$2,'loc-1')",[id,role]);
      await q('INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false)',[id,password]);
    }
    await assignOwnedManagerCompanyAccess(app.database.executor,'R10MANAGER');
    await q("INSERT INTO clocker_devices(id,name,location_id,active) VALUES('r10-retired-device','Retired fictional tablet','loc-1',false)");
    for(const [index,actor] of ['QAOWNER','R10MANAGER'].entries()){
      const employee='r10-target-'+index,entry='r10-browser-entry-'+index;
      await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id,active) VALUES($1,'Unavailable','Fictional','fictional-'||$1,'EMPLOYEE','loc-1',false)",[employee]);
      await q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status) VALUES($1,$2,'loc-1','r10-retired-device',clock_timestamp()-interval '4 hours','CLOCKED_IN')",[entry,employee]);
      checks.push('Seeded isolated inactive worker and retired device for '+actor);
    }
    const schedule=await seedOwnedScenario(app.database.executor,'R08PRIVACY',0);
    const active=await runtime.chromium.launch({headless:true});browser=active;
    for(const [index,actor] of ['QAOWNER','R10MANAGER','R10LEAD','R10EMPLOYEE'].entries()){
      const context=await active.newContext({viewport:{width:1280,height:900},serviceWorkers:'block'}),page=await context.newPage();page.setDefaultTimeout(20000);
      page.on('pageerror',(error:Error)=>errors.push(error.message));
      await context.route('**/*',async(route:{request():{url():string};abort():Promise<void>;continue():Promise<void>})=>{
        const url=new URL(route.request().url());if(['http:','https:'].includes(url.protocol)&&url.origin!==app.url){errors.push('Unexpected external origin');await route.abort();}else await route.continue();
      });
      await page.goto(app.url+'/login');await page.getByLabel('Employee ID',{exact:true}).fill(actor);await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(app.url+'/app');
      if(actor==='QAOWNER'){
        for(const path of ['/app/schedule/new?week='+schedule.week,'/app/schedule/edit?shiftId='+encodeURIComponent(schedule.sourceId)]){
          const response=await page.goto(app.url+path);expect(response?.status()).toBe(200);
          const html=await response!.text();expect(/r08-private-contact-|@r08-private\.invalid|fictional-r10-target/.test(html),'Private employee data in actual HTML/RSC transport: '+path).toBe(false);
          checks.push('R08: actual authenticated HTML/RSC excludes contact/inactive-catalog markers at '+path.split('?')[0]);
        }
      }
      const path='/api/manager/timecards/r10-browser-entry-'+Math.min(index,1)+'/close';
      const read=await page.evaluate(async(path:string)=>{
        const r=await fetch(path,{headers:{'x-nevora-management-close':'1'},cache:'no-store'});return {status:r.status,body:await r.json(),cache:r.headers.get('cache-control')};
      },path) as {status:number;body:ManagementCloseContext;cache:string};
      if(index<2){
        expect(read.status).toBe(200);expect(read.cache).toBe('no-store, private');expect(read.body.state).toBe('ready');
        if(read.body.state!=='ready')throw Error('Current close context unavailable');
        expect(JSON.stringify(read.body)).not.toMatch(/employeeId|deviceId|sessionTokenHash|phone|email/);
        const command={operationId:randomUUID(),timeEntryId:read.body.target.timeEntryId,expectedSourceHash:read.body.sourceHash,closedAt:new Date(Date.now()-60000).toISOString(),reason:'Confirmed end time while worker and tablet unavailable.'};
        const response=await page.evaluate(async({path,command,authority}:{path:string;command:unknown;authority:string})=>{
          const run=async()=>{const r=await fetch(path,{method:'POST',headers:{'content-type':'application/json','x-nevora-management-close':'1','x-nevora-management-close-authority':authority},body:JSON.stringify(command)});return {status:r.status,body:await r.json()};};
          return {first:await run(),retry:await run()};
        },{path,command,authority:read.body.authority});
        expect(response.first.status).toBe(200);expect(response.first.body.state).toBe('closed');expect(response.retry).toEqual(response.first);
        expect(await q('SELECT status FROM time_entries WHERE id=$1',[command.timeEntryId])).toEqual([{status:'CLOCKED_OUT'}]);
        checks.push(actor+': real cookie GET and explicit close; exact same-operation replay; inactive identity preserved');
      }else {expect(read.status).toBe(403);checks.push(actor+': denied management context with real cookie');}
      const missingIntent=await page.evaluate(async(path:string)=>(await fetch(path,{cache:'no-store'})).status,path);expect(missingIntent).toBe(403);
      await context.close();
    }
    expect(await q('SELECT count(*)::int AS n FROM management_time_closes')).toEqual([{n:2}]);
    expect(await q("SELECT active FROM employees WHERE id LIKE 'r10-target-%' ORDER BY id")).toEqual([{active:false},{active:false}]);
    expect(errors).toEqual([]);complete=true;
  }finally{
    await browser?.close();await app.close();
    await writeFile(resolve(evidence,'results.json'),JSON.stringify({complete,checks,errors,scope:'Actual Next HTTP/password cookies and owned SQL; backend contract acceptance only. Combined management confirmation UI remains with Claude.'},null,2));
  }
},240000);
