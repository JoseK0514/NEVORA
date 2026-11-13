import {it,expect} from 'vitest';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import {resolve,join} from 'node:path';
import {mkdir,writeFile} from 'node:fs/promises';
import {onboardingJourneyFixture} from './onboarding-journey-fixture';
import {createOwnedNextApp} from './owned-next-app';
import {withOwnedTestResources} from './owned-test-resources';
import {activateInitialOwner} from '@/lib/onboarding/owner-activation.server';
import {openOnboardingValue} from '@/lib/onboarding/crypto.server';

it('executes the combined fictional-company lifecycle with normal browser sign-in on its provisioned database',async()=>{
 const root=process.env.NEVORA_STEP4_EVIDENCE;if(!root)throw Error('Explicit Step4 evidence directory required');await mkdir(root,{recursive:true});
 const runtime=createRequire(resolve('tools/ci-browser-runtime/package.json'))('playwright');
 const stages:{stage:string;state:string}[]=[],f=await onboardingJourneyFixture();let complete=false;
 await withOwnedTestResources(async defer=>{
  defer(()=>writeFile(join(root,'report.json'),JSON.stringify({complete,stages,scope:'Combined source; owned provisioning and actual browser password sign-in. HTTP domain and Neon SQL transport adapters are local; no hosted/TLS/provider acceptance.'},null,2)));
  defer(()=>f.close());
  const company=await f.createCompany('step4-alpha','step4-alpha@example.invalid'),grant=await company.grant(),password='Fictional Step4 Owner password 123!';
  expect((await activateInitialOwner(company.binding,{schemaVersion:1,operationId:randomUUID(),proof:grant.proof,password})).state).toBe('activated');expect((await company.work()).state).toBe('complete');
  expect((await company.resource.db.pool.query('SELECT count(*)::int n FROM employee_sessions')).rows).toEqual([{n:0}]);stages.push({stage:'registration-provisioning-original-owner-activation',state:'passed'});
  const marker='nevora-step4-owned:'+randomUUID();await company.resource.db.pool.query(`COMMENT ON DATABASE "${company.resource.db.name}" IS '${marker}'`);
  const oid=Number((await company.resource.db.pool.query('SELECT oid FROM pg_database WHERE datname=current_database()')).rows[0].oid);
  const secrets=(await f.db.pool.query("SELECT * FROM nevora_onboarding.workspace_secrets WHERE workspace_id=$1 AND role_kind='APP' AND active",[company.row.workspace_id])).rows;
  const targets=secrets.map(secret=>{
   const uri=openOnboardingValue(secret.ciphertext,'workspace-secret:test:'+company.row.workspace_id+':1:APP:'+secret.id,f.config.encryptionKey);if(!uri)throw Error('Owned company APP URI absent');
   const target=new URL(company.resource.db.connectionUrl),source=new URL(uri);target.username=source.username;target.password=source.password;
   return {uri,connectionUrl:target.href,name:company.resource.db.name,oid,marker};
  });
  const options={emptyDatabase:true,isolatedWorkspaces:{environment:'test' as const,controlDatabaseUrl:f.db.connectionUrl,encryptionKey:f.config.encryptionKey,tokenKey:f.config.workspaceTokenKey,portalBaseDomain:f.config.portalBaseDomain,origins:[company.origin],targets}};
  const app=await createOwnedNextApp(join(root,'app'),options);defer(()=>app.close());
  const browser=await runtime.chromium.launch({headless:true});defer(()=>browser.close());const context=await browser.newContext({serviceWorkers:'block'}),page=await context.newPage();page.setDefaultTimeout(15000);
  await context.route('**/*',async(route:{request():{url():string;allHeaders():Promise<Record<string,string>>};abort(reason:string):Promise<void>;fetch(options:unknown):Promise<unknown>;fulfill(options:unknown):Promise<void>})=>{
   const url=new URL(route.request().url());if(url.origin!==company.origin){await route.abort('blockedbyclient');return;}
   const headers=await route.request().allHeaders();delete headers['content-length'];headers.host=url.host;headers['x-forwarded-host']=url.host;headers['x-forwarded-proto']='https';
   const response=await route.fetch({url:app.url+url.pathname+url.search,headers,maxRedirects:0});await route.fulfill({response});
  });
  await page.goto(company.origin+'/login');await page.getByLabel('Employee ID',{exact:true}).fill('OWNER-1');await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(company.origin+'/app');
  expect((await company.resource.db.pool.query("SELECT count(*)::int n FROM employee_sessions WHERE employee_id='OWNER-1'")).rows).toEqual([{n:1}]);stages.push({stage:'normal-owner-browser-sign-in-on-provisioned-company',state:'passed'});
  complete=true;
 });
});
