import { expect, it } from '@rstest/core';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { createOwnedNextApp, ownedProductionRequested } from './owned-next-app';
import { OWNED_COLLAB_ORIGIN } from './owned-collab-origin';
import { startOwnedTlsProxy } from './owned-tls-proxy';
import { assignOwnedManagerCompanyAccess, seedOwnedApp, TEST_PASSWORD } from './owned-app-fixture';
import { hashPassword } from '../../lib/auth/password';

it('verifies integrated Manager and Owner quick wins with real sessions and owned data', async () => {
  const evidence = process.env.NEVORA_ALL_UI_BROWSER_EVIDENCE;
  if (!evidence) throw Error('Select an external NEVORA_ALL_UI_BROWSER_EVIDENCE directory');
  const output = resolve(evidence, 'quick-wins');
  await mkdir(output, { recursive: true });
  const runtime = createRequire(process.env.NEVORA_PLAYWRIGHT_RUNTIME_PACKAGE ?? resolve('tools/ci-browser-runtime/package.json'))('playwright');
  const production = ownedProductionRequested();
  const origin = OWNED_COLLAB_ORIGIN;
  const app = await createOwnedNextApp(output, { payrollEnabled: true, portalHttpsOrigin: origin, production });
  const proxy = await startOwnedTlsProxy({[origin]: app.url}).catch(async error => { await app.close(); throw error; });
  const browsers: { close(): Promise<void> }[] = [];
  const checks: string[] = [], errors: string[] = [];
  let complete = false;
  try {
    const q = (text: string, values: unknown[] = []) => app.database.executor.query({ text, values });
    await seedOwnedApp(app.database.executor);
    await q("INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('QW-MANAGER','Fictional','Manager','2025550141','MANAGER','loc-1'),('QW-IDLE','Fictional','Idle','2025550142','EMPLOYEE','loc-1')");
    await q('INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false)', ['QW-MANAGER', await hashPassword(TEST_PASSWORD)]);
    await assignOwnedManagerCompanyAccess(app.database.executor, 'QW-MANAGER');
    await q("INSERT INTO clocker_devices(id,location_id,name) VALUES('quick-wins-device','loc-1','Fictional quick wins tablet')");
    await q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status,version) VALUES('quick-wins-open','QAOWNER','loc-1','quick-wins-device',now()-interval '30 minutes','CLOCKED_IN',1)");
    for (const engine of ['chromium', 'webkit']) {
      const browser = await runtime[engine].launch({ headless: true, proxy: {server: proxy.server} }); browsers.push(browser);
      for (const actor of ['QAOWNER', 'QW-MANAGER']) {
        const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, ignoreHTTPSErrors: true, serviceWorkers: 'block' });
        let holdRefresh = false;
        const pendingRefresh: (() => void)[] = [];
        const releaseRefresh = () => { holdRefresh = false; pendingRefresh.splice(0).forEach(release => release()); };
        await context.route('**/*', async (route: { request(): { url(): string; headers(): Record<string, string> }; abort(reason?: string): Promise<void>; continue(): Promise<void> }) => {
          const url = new URL(route.request().url());
          if (['http:', 'https:'].includes(url.protocol) && url.origin !== origin) await route.abort('blockedbyclient');
          else {
            if (holdRefresh && url.pathname === '/app/employees/QW-MANAGER' && route.request().headers().rsc === '1') await new Promise<void>(release => pendingRefresh.push(release));
            await route.continue();
          }
        });
        const responses=new Map<string,any>();
        let page = await context.newPage();
        const observe=(view:any)=>{
          view.setDefaultTimeout(15000);view.on('pageerror',(error:Error)=>errors.push(engine+': '+error.message.slice(0,400)));
          view.on('response',(response:any)=>{const url=new URL(response.url());if(url.origin===origin&&response.request().method()==='GET')responses.set(url.pathname,response);});
        };observe(page);
        // Direct URL permission probes and the independent contact-lifetime check enter authenticated tabs.
        // Every tab remains observed; ordinary workflow steps use the app's real navigation controls.
        const enter = async(path:string)=>{page=await context.newPage();observe(page);return page.goto(origin+path);};
        const visit = async(path:string)=>{
          if(page.url()==='about:blank'||path==='/login')return page.goto(origin+path);
          if(path.includes('#'))return enter(path);
          const target=new URL(origin+path);
          if(new URL(page.url()).pathname!==target.pathname){
            const links=page.locator('a[href="'+path+'"]').filter({visible:true});
            if(await links.count())await links.first().click();
            else if(path==='/app/schedule/new'){
              await page.getByRole('button',{name:'Search',exact:true}).click();
              await page.getByRole('combobox',{name:'Search pages, people and places'}).fill('add shift');
              await page.getByRole('option',{name:/Add shift/}).click();
            }else throw Error('No real navigation control for '+path);
            await page.waitForURL((url:URL)=>url.pathname===target.pathname,{waitUntil:'domcontentloaded'});
          }
          const destination:Record<string,string>={'/app':'.c-home #b-home-on','/app/timecards':'.c-tc','/app/reports':'.c-ins','/app/inbox':'.c-todo','/app/schedule/new':'form:has([name="employeeId"])'};
          await page.locator(destination[path]).filter({visible:true}).first().waitFor();
          // Bind the HTTP assertion to an actual document/RSC response, including a fresh accepted prefetch.
          await expect.poll(()=>responses.get(target.pathname)?.status(),{timeout:15000}).toBe(200);
          return responses.get(target.pathname);
        };
        try {
          await visit('/login');
          await page.getByLabel('Employee ID', { exact: true }).fill(actor);
          await page.getByLabel('Password', { exact: true }).fill(TEST_PASSWORD);
          await page.getByRole('button', { name: 'Sign in', exact: true }).click();
          await page.waitForURL(origin + '/app');
          for (const path of ['/app', '/app/timecards', '/app/reports', '/app/inbox', '/app/schedule/new']) {
            const response = await visit(path);
            expect(response?.status(), engine + ' ' + actor + ' ' + path).toBe(200);
            await page.locator('main').getByRole('heading', { level: 1 }).first().waitFor();
            // Background action-center reads remain live. Wait on rendered read state, not global silence.
            await page.evaluate(()=>document.fonts.ready);
            await expect.poll(()=>page.locator('main [aria-busy="true"]:visible').count(),{timeout:15000}).toBe(0);
            if(path==='/app')await expect.poll(()=>page.locator('#b-home-on').innerText(),{timeout:15000}).toContain('Fictional Owner');
            for (const width of [320, 390, 768, 1440]) {
              await page.setViewportSize({ width, height: 1000 });
              expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 2), engine + ' ' + actor + ' ' + path + ' ' + width).toBe(true);
            }
            if (path === '/app') {
              await page.locator('#b-home-on').waitFor();
              expect(await page.locator('#b-home-on').textContent()).toContain('Fictional Owner');
              checks.push(engine + ': ' + actor + ' unscheduled real clock-in on Home');
            }
            if (path === '/app/timecards') {
              const folded = page.getByRole('button', { name: /people with no time yet/ });
              await folded.waitFor(); await folded.click();
              await page.waitForFunction(() => [...document.querySelectorAll('.c-tc-person')].some(element => element === document.activeElement));
              await visit('/app/inbox');
              await visit('/app/timecards#timecard-QAOWNER');
              await page.getByRole('dialog').waitFor();
              expect(await page.getByRole('dialog').textContent()).toContain('Fictional Owner');
              // Nov 1 upscale (review M5): at 1440px the panel is a non-modal inspector; Escape still closes it.
              expect(await page.getByRole('dialog').evaluate((element: HTMLElement) => element.matches(':modal'))).toBe(false);
              await page.setViewportSize({width:844,height:390});
              const done = page.locator('.c-tc-sheet .cm-tc-done');
              await done.scrollIntoViewIfNeeded();
              const closeTargetReachesEveryEdge = await done.evaluate((link: HTMLElement) => {
                const bounds = link.getBoundingClientRect();
                const x = bounds.left + bounds.width / 2;
                const y = bounds.top + bounds.height / 2;
                return [[0,0],[-21.5,0],[21.5,0],[0,-21.5],[0,21.5]].every(([dx,dy]) =>
                  link.contains(document.elementFromPoint(x + dx, y + dy))
                );
              });
              expect(closeTargetReachesEveryEdge).toBe(true);
              await page.setViewportSize({width:1024,height:900});
              const originalTextSize=await page.evaluate(()=>document.documentElement.style.fontSize);
              try {
                await page.evaluate(()=>{document.documentElement.style.fontSize='32px';});
                await page.waitForSelector('dialog[open]:modal');
                expect(await page.getByRole('dialog').textContent()).toContain('Fictional Owner');
                await page.evaluate((value:string)=>{document.documentElement.style.fontSize=value;},originalTextSize);
                await page.waitForSelector('dialog[open][data-inspector]');
              } finally {
                await page.evaluate((value:string)=>{document.documentElement.style.fontSize=value;},originalTextSize);
                await page.setViewportSize({width:1440,height:900});
              }
              await page.keyboard.press('Escape');
              await page.getByRole('dialog').waitFor({ state: 'hidden' });
              checks.push(engine + ': ' + actor + ' folded timecards keyboard focus and drawer link');
            }
            if (path === '/app/reports') {
              await page.getByRole('button', { name: /^Report period: This week so far/ }).waitFor();
              await page.setViewportSize({ width: 320, height: 1000 });
              await page.getByRole('button', { name: 'This week', exact: true }).waitFor();
              expect(await page.getByRole('button', { name: 'This week', exact: true }).getAttribute('aria-pressed')).toBe('true');
              await page.getByRole('button', { name: 'Last week', exact: true }).click();
              const emptyPeriod=page.getByText('No recorded time in this period', { exact: true }).filter({visible:true});await emptyPeriod.waitFor();expect(await emptyPeriod.count()).toBe(1);
              await page.setViewportSize({ width: 1440, height: 1000 });
              checks.push(engine + ': ' + actor + ' current and empty previous Insights period');
            }
            await page.screenshot({ path: output + '/' + engine + '-' + actor + '-' + path.replaceAll('/', '_') + '.png', fullPage: true });
            checks.push(engine + ': ' + actor + ' ' + path + ' at 320/390/768/1440');
          }
          await visit('/app');
          await page.getByRole('button', { name: 'Search', exact: true }).click();
          const search = page.getByRole('combobox', { name: 'Search pages, people and places' });
          await search.fill('add shift');
          await page.getByRole('option', { name: /Add shift/ }).waitFor();
          // Upscale S1: group headings are presentational rows between the options, never inside one; the typed words are set in bold.
          expect(await page.locator('[role="option"] .command-finder-group').count()).toBe(0);
          expect(await page.locator('#command-finder-results > li.command-finder-group[role="presentation"][aria-hidden="true"]').count()).toBeGreaterThan(0);
          expect(await page.getByRole('option', { name: /Add shift/ }).locator('b.command-finder-match').first().innerText()).toMatch(/^add shift$/i);
          await search.fill('approve time off');
          await page.getByRole('option', { name: /Review time-off requests/ }).waitFor();
          await page.keyboard.press('Escape');
          checks.push(engine + ': ' + actor + ' search verb synonyms and keyboard dismissal');
          for (const path of ['/app/settings', '/app/settings/branding', '/app/settings/positions']) {
            await enter(path);
            if (actor === 'QW-MANAGER') {
              await page.getByText('Settings are for Owners', { exact: true }).waitFor();
              expect(await page.getByRole('link',{name:'Open Scheduling rules',exact:true}).getAttribute('href')).toBe('/app/schedule/settings');
              expect(new URL(page.url()).pathname).toBe(path);
              expect(await page.getByRole('button', { name: /Save/ }).count()).toBe(0);
            } else await page.locator('main').getByRole('heading', { level: 1 }).first().waitFor();
            checks.push(engine + ': ' + actor + ' Settings route ' + path);
          }
          if (engine === 'chromium' && actor === 'QAOWNER') {
            // Current Things to do opens full reviews; contacts live on the person's Team page.
            // Exercise that real scoped read, including retirement while its actual RSC renewal is held.
            await enter('/app/employees/QW-MANAGER');
            const call=page.getByRole('link',{name:'Call Fictional Manager',exact:true}),message=page.getByRole('link',{name:'Message Fictional Manager',exact:true});
            await call.waitFor();expect(await call.getAttribute('href')).toBe('tel:2025550141');expect(await message.getAttribute('href')).toBe('sms:2025550141');
            holdRefresh=true;
            await call.waitFor({state:'detached',timeout:20000});
            await page.getByRole('button',{name:'Try again',exact:true}).click();
            await expect.poll(()=>pendingRefresh.length,{timeout:15000}).toBeGreaterThan(0);
            expect(await call.count()).toBe(0);expect(await message.count()).toBe(0);
            releaseRefresh();await call.waitFor();
            holdRefresh=true;
            await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await call.waitFor({state:'detached'});
            expect(await message.count()).toBe(0);
            await page.evaluate(()=>window.dispatchEvent(new Event('focus')));
            await expect.poll(()=>pendingRefresh.length,{timeout:15000}).toBeGreaterThan(0);
            expect(await call.count()).toBe(0);expect(await message.count()).toBe(0);
            releaseRefresh();await call.waitFor();
            checks.push('chromium: actual Team contact links expire and clear on blur; fresh authority and real RSC restore them; no synthesized Today response');
          }
        } catch (error) {
          await page.screenshot({ path: output + '/' + engine + '-' + actor + '-failure.png', fullPage: true }).catch(() => {});
          throw error;
        } finally {
          releaseRefresh();
          await context.close();
        }
      }
    }
    expect(errors).toEqual([]);
    complete = true;
  } finally {
    await Promise.all(browsers.map(browser => browser.close()));
    try { await proxy.close(); } finally { await app.close(); }
    await writeFile(output + '/report.json', JSON.stringify({ complete, checks, errors, source: app.sourceHashes, fictionalOnly: true, runtime: `Next ${production ? 'production' : 'development'} with owned HTTPS and PostgreSQL transport` }, null, 2));
  }
}, 240000);
