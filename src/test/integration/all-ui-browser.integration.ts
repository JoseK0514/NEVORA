import { expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { createOwnedNextApp } from './owned-next-app';
import { seedOwnedApp, TEST_PASSWORD } from './owned-app-fixture';
import { hashPassword } from '../../lib/auth/password';

it('verifies the combined auth, policy, employee and passkey UI in owned browsers', async () => {
  const evidence = process.env.NEVORA_ALL_UI_BROWSER_EVIDENCE;
  if (!evidence) throw Error('Select an external NEVORA_ALL_UI_BROWSER_EVIDENCE directory');
  await mkdir(evidence, {recursive:true});
  const runtime = createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE ?? resolve('tools/ci-browser-runtime/package.json'))('playwright');
  const app = await createOwnedNextApp(evidence, {passkeysEnabled:true,payrollEnabled:true});
  const browsers: {close():Promise<void>}[] = [];
  const checks: string[] = [], errors: string[] = [];
  let complete=false, failureScreenshot:(()=>Promise<void>)|undefined;
  const q = (text:string,values:unknown[]=[])=>app.database.executor.query({text,values});
  try {
    await q("INSERT INTO employees(id,first_name,last_name,email,phone,role,primary_location_id) VALUES('UI-EMPLOYEE','Fictional','Employee','employee@example.invalid','2025550141','EMPLOYEE','loc-1'),('UI-LEAD','Fictional','Lead','lead@example.invalid','2025550142','LEAD','loc-1')");
    const password = await hashPassword(TEST_PASSWORD);
    await q("INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES('UI-EMPLOYEE',$1,false),('UI-LEAD',$1,false)",[password]);
    await seedOwnedApp(app.database.executor);
    const origin = app.url.replace('127.0.0.1','localhost');
    for (const engine of ['chromium','webkit']) {
      const browser = await runtime[engine].launch({headless:true}); browsers.push(browser);
      const context = await browser.newContext({viewport:{width:390,height:900},serviceWorkers:'block'});
      await context.route('**/*',async (route:{request():{url():string};abort(reason?:string):Promise<void>;continue():Promise<void>})=>{
        const url = new URL(route.request().url());
        if (['http:','https:'].includes(url.protocol) && url.origin!==origin) await route.abort('blockedbyclient');
        else await route.continue();
      });
      const page = await context.newPage();
      failureScreenshot=async()=>{await page.screenshot({path:evidence+'/'+engine+'-failure.png',fullPage:true});};
      page.setDefaultTimeout(15000);
      page.on('pageerror',(error:Error)=>errors.push(engine+': '+error.message.slice(0,400)));
      await page.bringToFront();
      for (const path of ['/login','/forgot-access','/reset-access','/activate','/privacy','/terms','/support','/account-deletion']) {
        const response = await page.goto(origin+path);
        expect(response?.status(),engine+' '+path).toBe(200);
        await page.getByRole('heading',{level:1}).first().waitFor();
        await page.waitForLoadState('networkidle');
        for (const width of [320,390,768,1440]) {
          await page.setViewportSize({width,height:900});
          expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2),engine+' '+path+' '+width).toBe(true);
        }
        checks.push(engine+': public '+path+' at 320/390/768/1440');
      }
      await page.setViewportSize({width:390,height:900});
      await page.goto(origin+'/login');
      for (const label of ['Privacy','Terms','Support']) expect(await page.getByRole('navigation',{name:'Policies and help'}).getByRole('link',{name:label,exact:true}).count()).toBe(1);
      await page.getByRole('button',{name:'Español',exact:true}).click();
      await page.getByLabel('ID de empleado',{exact:true}).waitFor();
      await page.getByRole('button',{name:'English',exact:true}).click();
      await page.getByLabel('Employee ID',{exact:true}).fill(engine==='chromium'?'UI-EMPLOYEE':'UI-LEAD');
      await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);
      await page.getByRole('button',{name:'Sign in',exact:true}).click();
      await page.waitForURL(origin+'/app');
      await page.locator('[data-home-state="ready"]').waitFor();
      checks.push(engine+': language switch and real password sign-in');
      for (const path of ['/app','/app/schedule','/app/requests/hub','/app/requests','/app/availability','/app/my-time','/app/timecards','/app/my-pay','/app/notifications','/app/profile']) {
        const response = await page.goto(origin+path);
        expect(response?.status(),engine+' '+path).toBe(200);
        await page.locator('main').getByRole('heading',{level:1}).first().waitFor();
        await page.waitForLoadState('networkidle');
        for (const width of [320,390,768,1440]) {
          await page.setViewportSize({width,height:900});
          expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+2),engine+' '+path+' '+width).toBe(true);
        }
        checks.push(engine+': employee '+path+' at 320/390/768/1440');
      }
      await page.getByRole('button',{name:'Refresh details',exact:true}).waitFor();
      const profileGeometry=await page.locator('.employee-profile-details').evaluate((element:HTMLElement)=>({
        details:element.getBoundingClientRect().width,
        settings:document.querySelector('.profile-settings-list')!.getBoundingClientRect().width,
      }));
      expect(profileGeometry.details).toBeGreaterThanOrEqual(profileGeometry.settings-32);
      expect(await page.locator('.pk-body').evaluate((element:HTMLElement)=>element.getBoundingClientRect().height)).toBeLessThan(200);
      await page.screenshot({path:evidence+'/'+engine+'-profile-1440.png',fullPage:true});
      if (engine==='chromium') {
        await page.setViewportSize({width:1440,height:1000});
        const cdp = await context.newCDPSession(page);
        await cdp.send('WebAuthn.enable');
        await cdp.send('WebAuthn.addVirtualAuthenticator',{options:{protocol:'ctap2',transport:'internal',hasResidentKey:true,hasUserVerification:true,isUserVerified:true,automaticPresenceSimulation:true}});
        await page.getByRole('button',{name:'Add a passkey',exact:true}).click();
        await page.locator('.pk-list .pk-item').waitFor();
        expect(await q("SELECT count(*)::int n FROM employee_passkeys WHERE employee_id='UI-EMPLOYEE' AND revoked_at IS NULL")).toEqual([{n:1}]);
        await page.locator('.pk-list').getByRole('button',{name:/^Remove /}).click();
        const confirmation = page.getByRole('dialog');
        await confirmation.waitFor();
        expect(await confirmation.getByRole('button',{name:'Keep',exact:true}).evaluate((element:HTMLElement)=>element===document.activeElement)).toBe(true);
        await confirmation.getByRole('button',{name:'Remove',exact:true}).click();
        await page.locator('.pk-list').waitFor({state:'detached'});
        await page.getByRole('button',{name:'Add a passkey',exact:true}).click();
        await page.locator('.pk-list .pk-item').waitFor();
        await context.clearCookies();
        await page.goto(origin+'/login');
        await page.getByRole('button',{name:'Sign in with a passkey',exact:true}).click();
        await page.waitForURL(origin+'/app');
        await page.locator('[data-home-state="ready"]').waitFor();
        checks.push('chromium: native WebAuthn enroll, remove confirmation focus, remove and discoverable sign-in');
        await page.goto(origin+'/app/account/delete');
        await page.getByLabel('Password',{exact:true}).fill(TEST_PASSWORD);
        await page.getByRole('checkbox').check();
        await page.getByRole('button',{name:'Confirm deletion request',exact:true}).click();
        await page.getByText(/DEL-[A-HJ-NP-Z2-9]{8}/).first().waitFor();
        expect(await q("SELECT count(*)::int n FROM employee_sessions WHERE employee_id='UI-EMPLOYEE'")).toEqual([{n:0}]);
        expect(await q("SELECT count(*)::int n FROM employee_passkeys WHERE employee_id='UI-EMPLOYEE' AND revoked_at IS NULL")).toEqual([{n:0}]);
        checks.push('chromium: real deletion form persists receipt and revokes sessions/passkeys');
        await cdp.detach();
      }
      await context.close();
    }
    expect(errors).toEqual([]);
    complete=true;
  } catch (error) {
    await failureScreenshot?.().catch(()=>{});
    throw error;
  } finally {
    await Promise.all(browsers.map(browser=>browser.close()));
    await app.close();
    await writeFile(evidence+'/report.json',JSON.stringify({complete,checks,errors,source:app.sourceHashes,fictionalOnly:true,physicalFaceIdTested:false},null,2));
  }
},240000);
