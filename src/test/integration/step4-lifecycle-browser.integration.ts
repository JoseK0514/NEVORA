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
import {verifyOwnedIsolatedRuntime} from './owned-isolated-runtime';
import {startOwnedDomainProxy} from './owned-domain-proxy';

it('admits normal browser sign-in on the actual provisioned fictional-company database',async()=>{
 const root=process.env.NEVORA_STEP4_EVIDENCE;if(!root)throw Error('Explicit Step4 evidence directory required');await mkdir(root,{recursive:true});
 const runtime=createRequire(resolve('tools/ci-browser-runtime/package.json'))('playwright');
 const stages:{stage:string;state:string}[]=[],network:unknown[]=[],f=await onboardingJourneyFixture();let admissionComplete=false;
 await withOwnedTestResources(async defer=>{
  defer(()=>writeFile(join(root,'report.json'),JSON.stringify({complete:false,admissionComplete,remaining:'Complete company lifecycle and resilience remain pending after browser admission.',stages,network,scope:'Combined source; owned provisioning and actual browser password sign-in. HTTP domain and Neon SQL transport adapters are local; no hosted/TLS/provider acceptance.'},null,2)));
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
  await verifyOwnedIsolatedRuntime(options.isolatedWorkspaces);
  await company.resource.db.pool.query(`COMMENT ON DATABASE "${company.resource.db.name}" IS 'foreign-marker'`);
  await expect(verifyOwnedIsolatedRuntime(options.isolatedWorkspaces)).rejects.toThrow('Invalid owned isolated browser runtime');
  await company.resource.db.pool.query(`COMMENT ON DATABASE "${company.resource.db.name}" IS '${marker}'`);
  stages.push({stage:'substituted-company-identity-refused-before-launch',state:'passed'});
  const app=await createOwnedNextApp(join(root,'app'),options);defer(()=>app.close());
  const front='http://alpha.step4.invalid',proxy=await startOwnedDomainProxy(app.url,{[front]:company.origin});defer(()=>proxy.close());
  const browser=await runtime.chromium.launch({headless:true});defer(()=>browser.close());const context=await browser.newContext({serviceWorkers:'block',proxy:{server:proxy.server}}),page=await context.newPage();page.setDefaultTimeout(15000);
  await context.tracing.start({screenshots:true,snapshots:true});defer(()=>context.tracing.stop({path:join(root,'admission-trace.zip')}));
  page.on('response',(response:{url():string;status():number;request():{method():string}})=>{const url=new URL(response.url());if(network.length<64&&!url.pathname.startsWith('/_next/'))network.push({path:url.pathname,method:response.request().method(),status:response.status(),ownedDomain:url.origin===front});});
  await page.goto(front+'/login');await page.getByLabel('Employee ID',{exact:true}).fill('OWNER-1');await page.getByLabel('Password',{exact:true}).fill(password);await page.getByRole('button',{name:'Sign in',exact:true}).click();await page.waitForURL(front+'/app');
  expect((await company.resource.db.pool.query("SELECT count(*)::int n FROM employee_sessions WHERE employee_id='OWNER-1'")).rows).toEqual([{n:1}]);stages.push({stage:'normal-owner-browser-sign-in-on-provisioned-company',state:'passed'});
  admissionComplete=true;
 });
});
