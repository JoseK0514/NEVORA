import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {resolve} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {createOwnedNextApp} from './owned-next-app';
import {seedOwnedApp,TEST_PASSWORD} from './owned-app-fixture';
it('requires and completes operator password replacement over the actual login and reset HTTP boundaries',async()=>{
 const evidence=process.env.NEVORA_OPERATOR_PASSWORD_EVIDENCE;if(!evidence)throw Error('Select an external owned operator-password evidence directory');await mkdir(evidence,{recursive:true});
 const runtime=createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE??resolve('tools/ci-browser-runtime/package.json'))('playwright');
 const app=await createOwnedNextApp(evidence),errors:string[]=[];let browser:Awaited<ReturnType<typeof runtime.chromium.launch>>|undefined;
 try{
  await seedOwnedApp(app.database.executor);await app.database.executor.query({text:"UPDATE employee_credentials SET must_change_password=true WHERE employee_id='QAOWNER'",values:[]});
  browser=await runtime.chromium.launch({headless:true});const context=await browser.newContext(),page=await context.newPage();page.on('pageerror',(e:Error)=>errors.push(e.message));
  const login=async(password:string)=>{await page.goto(app.url+'/login');await page.getByLabel('Employee ID',{exact:true}).fill('QAOWNER');await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();};
  await login(TEST_PASSWORD);await page.waitForURL('**/reset-access*');await page.locator('#reset-password').waitFor();
  expect((await context.cookies()).some((c:{name:string})=>c.name==='fuel_session')).toBe(false);
  expect(await app.database.executor.query({text:"SELECT count(*)::int n FROM employee_sessions WHERE employee_id='QAOWNER'",values:[]})).toEqual([{n:0}]);
  // The existing reset client consumes/scrubs the bearer fragment. It is never evidence output.
  await page.waitForFunction(()=>!location.hash);await page.locator('#reset-password').fill('Fictional operator replacement password 123!');await page.locator('#reset-confirm-password').fill('Fictional operator replacement password 123!');
  await page.getByRole('button',{name:'Reset password',exact:true}).click();await page.getByRole('heading',{name:'Password changed',exact:true}).waitFor();
  expect(await app.database.executor.query({text:"SELECT must_change_password FROM employee_credentials WHERE employee_id='QAOWNER'",values:[]})).toEqual([{must_change_password:false}]);
  await login(TEST_PASSWORD);await page.waitForURL('**/login?error=invalid*');expect((await context.cookies()).some((c:{name:string})=>c.name==='fuel_session')).toBe(false);
  await login('Fictional operator replacement password 123!');await page.waitForURL('**/app');expect((await context.cookies()).some((c:{name:string})=>c.name==='fuel_session')).toBe(true);
  expect(errors).toEqual([]);await writeFile(resolve(evidence,'operator-password-result.json'),JSON.stringify({state:'passed',checks:['no session before replacement','proof fragment scrubbed','replacement committed','old password refused','new password admitted'],pageErrors:errors},null,2));
 }finally{await browser?.close();await app.close();}
},240000);
