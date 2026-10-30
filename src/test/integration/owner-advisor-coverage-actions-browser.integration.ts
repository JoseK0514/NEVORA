import { expect, it } from "vitest";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createOwnedNextApp } from "./owned-next-app";
import { seedOwnedApp, TEST_PASSWORD } from "./owned-app-fixture";
import { fictionalProfile } from "../fixtures/shift-changes";
type Route = { request(): { url(): string; method(): string; postDataJSON(): { op?: string } }; fetch(): Promise<{status():number}>; abort(reason?:string):Promise<void>; continue():Promise<void> };
it("reviews exact coverage, blocks stale saves, recovers a real lost reply and verifies draft progress", async () => {
  if (!process.env.NEVORA_OWNER_ADVISOR_BROWSER_EVIDENCE) throw Error("External evidence path required");
  const evidence=resolve(process.env.NEVORA_OWNER_ADVISOR_BROWSER_EVIDENCE,"coverage-actions");await mkdir(evidence,{recursive:true});
  const runtimeRequire=createRequire(resolve("tools/ci-browser-runtime/package.json")),runtime=runtimeRequire("playwright");
  const axe=await readFile(runtimeRequire.resolve("axe-core/axe.min.js"),"utf8");
  const app=await createOwnedNextApp(evidence,{ownerAdvisorEnabled:true});
  const checks:string[]=[],external:string[]=[],errors:string[]=[];let complete=false;
  try {
    await seedOwnedApp(app.database.executor);
    const q=(text:string,values:unknown[]=[])=>app.database.executor.query({text,values});
    await q(`UPDATE location_coverage_windows SET start_time='08:00',end_time='12:00';
      INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('COVER-A','Fictional Alexandria <script>unsafe</script>','Long surname example','555-0121','EMPLOYEE','loc-1'),('COVER-B','Fictional','Backup','555-0122','EMPLOYEE','loc-1');
      INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES('COVER-A','loc-1'),('COVER-A','loc-2'),('COVER-B','loc-1'),('COVER-B','loc-2');
      INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) VALUES('cover-av-a','COVER-A',1,'08:00','12:00'),('cover-av-b','COVER-B',1,'08:00','12:00');
      INSERT INTO weekly_availability_submissions(employee_id,week_start,uses_normal_availability) SELECT id,day::date,true FROM employees CROSS JOIN unnest(ARRAY['2030-10-07','2030-10-14']) day WHERE id LIKE 'COVER-%';`);
    await q("INSERT INTO employee_scheduling_settings(employee_id,maximum_weekly_hours,operational_rule_profile) SELECT id,40,$1::jsonb FROM employees WHERE id LIKE 'COVER-%'",[JSON.stringify(fictionalProfile())]);
    const origin=app.url.replace("127.0.0.1","localhost");
    for (const [index,engine] of ["chromium","webkit"].entries()) {
      const browser=await runtime[engine].launch({headless:true}),context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:"block"}),page=await context.newPage();
      let phase="login",dropNextSave=false,committedBeforeLoss=false;
      try {
        await context.tracing.start({screenshots:true,snapshots:true});
        await context.route("**/*",async(route:Route)=>{
          const request=route.request(),url=new URL(request.url());
          if (["http:","https:"].includes(url.protocol)&&url.origin!==origin){external.push(url.origin);await route.abort();return;}
          if(dropNextSave && url.pathname==="/api/owner/advisor" && request.method()==="POST" && request.postDataJSON().op==="apply_coverage_draft") {
            dropNextSave=false;const actual=await route.fetch();committedBeforeLoss=actual.status()===200;await route.abort("connectionreset");return;
          }
          await route.continue();
        });
        page.on("pageerror",(error:Error)=>errors.push(engine+":"+phase+":"+error.message));page.setDefaultTimeout(20000);
        await page.goto(origin+"/login");await page.getByLabel("Employee ID",{exact:true}).fill("QAOWNER");await page.getByLabel("Password",{exact:true}).fill(TEST_PASSWORD);await page.getByRole("button",{name:"Sign in",exact:true}).click();await page.waitForURL(origin+"/app");await page.waitForLoadState("networkidle");await page.locator("main").getByRole("link",{name:"AI manager",exact:true}).click();await page.waitForURL(origin+"/app/ai-manager");
        await page.getByRole("button",{name:"Compare day plans",exact:true}).waitFor();
        const date=index===0?"2030-10-07":"2030-10-14";
        await page.getByLabel("Coverage date",{exact:true}).fill(date);
        const compare=async()=>{
          const response=page.waitForResponse((r:{url():string;request():{method():string}})=>r.url().endsWith("/api/owner/advisor")&&r.request().method()==="POST");
          await page.getByRole("button",{name:"Compare day plans",exact:true}).click();
          const actual=await response;expect(actual.status()).toBe(200);const body=await actual.json();
          await page.getByRole("region",{name:"Day plan comparison",exact:true}).getByText(`Source fingerprint: ${body.answer.coveragePlans.sourceVersion}`,{exact:true}).waitFor();
        };
        phase="review and focus return";await compare();
        const plan=page.getByRole("article",{name:"Day plan 1",exact:true}),trigger=plan.getByRole("button",{name:"Review draft changes",exact:true});
        await trigger.click();const panel=page.getByRole("region",{name:"Reviewed coverage draft",exact:true});await panel.getByRole("heading",{name:"Review draft changes",exact:true}).waitFor();
        expect(await panel.getByRole("button",{name:/^Save 2 draft assignments$/}).isDisabled()).toBe(true);
        expect(await q("SELECT count(*)::int n FROM shifts WHERE date=$1",[date])).toEqual([{n:0}]);
        await panel.getByRole("button",{name:"Back to comparison",exact:true}).click();await expect.poll(()=>trigger.evaluate((el:HTMLElement)=>document.activeElement===el)).toBe(true);
        await trigger.click();await panel.getByRole("heading",{name:"Review draft changes",exact:true}).waitFor();
        const nativeTab=engine==="webkit"&&process.platform==="darwin"?"Alt+Tab":"Tab";
        const confirmWithKeyboard=async()=>{
          const h=panel.getByRole("heading",{name:"Review draft changes",exact:true});
          await expect.poll(()=>h.evaluate((el:HTMLElement)=>document.activeElement===el)).toBe(true);
          await page.keyboard.press(nativeTab);
          await expect.poll(()=>panel.getByRole("checkbox").evaluate((el:HTMLElement)=>document.activeElement===el)).toBe(true);
          await page.keyboard.press("Space");
          const save=panel.getByRole("button",{name:/^Save 2 draft assignments$/});
          await expect.poll(()=>save.isEnabled()).toBe(true);await page.keyboard.press(nativeTab);
          expect(await save.evaluate((el:HTMLElement)=>document.activeElement===el)).toBe(true);await page.keyboard.press("Enter");
        };
        const activateFirstActionWithKeyboard=async(name:string)=>{
          const h=panel.getByRole("heading",{level:2});await expect.poll(()=>h.evaluate((el:HTMLElement)=>document.activeElement===el)).toBe(true);
          await page.keyboard.press(nativeTab);expect(await panel.getByRole("button",{name,exact:true}).evaluate((el:HTMLElement)=>document.activeElement===el)).toBe(true);await page.keyboard.press("Enter");
        };
        phase="stale source rejected";await q("UPDATE locations SET short_name=short_name||' QA' WHERE id='loc-1'");
        await confirmWithKeyboard();await panel.getByText(/review changed or expired/).waitFor();
        expect(await q("SELECT count(*)::int n FROM shifts WHERE date=$1",[date])).toEqual([{n:0}]);checks.push(engine+": prepare has no business writes; explicit acknowledgement; Back restores trigger focus; changed source blocks whole allocation");
        await panel.getByRole("button",{name:"Back to comparison",exact:true}).click();await compare();await trigger.click();await panel.getByRole("heading",{name:"Review draft changes",exact:true}).waitFor();
        phase="mobile enlarged-text review";
        await page.evaluate(axe);
        for(const width of [320,390,430,1440]){
          await page.setViewportSize({width,height:844});
          const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,shortTargets:[...document.querySelectorAll<HTMLElement>(".oa-draft-panel button,.oa-draft-consent")].filter(el=>el.getBoundingClientRect().height<44).map(el=>el.textContent)}));
          const audit=await page.evaluate("axe.run('.oa-draft-panel',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}})");
          await writeFile(resolve(evidence,`${engine}-${width}-audit.json`),JSON.stringify({layout,audit},null,2));await panel.screenshot({path:resolve(evidence,`${engine}-${width}-review.png`)});
          expect(layout.overflow).toBe(false);expect(layout.shortTargets).toEqual([]);expect(audit.violations).toEqual([]);
        }
        await page.setViewportSize({width:390,height:844});
        await page.evaluate(()=>{const nodes=[...document.querySelectorAll<HTMLElement>(".oa-draft-panel,.oa-draft-panel *")];const sizes=nodes.map(el=>({el,size:parseFloat(getComputedStyle(el).fontSize),line:parseFloat(getComputedStyle(el).lineHeight)}));for(const row of sizes){row.el.dataset.originalStyle=row.el.getAttribute("style")??"";row.el.style.fontSize=`${row.size*2}px`;if(Number.isFinite(row.line))row.el.style.lineHeight=`${row.line*2}px`;}});
        expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);await panel.screenshot({path:resolve(evidence,`${engine}-390-text200.png`)});
        await page.evaluate(()=>document.querySelectorAll<HTMLElement>(".oa-draft-panel,.oa-draft-panel *").forEach(el=>{el.setAttribute("style",el.dataset.originalStyle??"");delete el.dataset.originalStyle;}));
        checks.push(engine+": 320/390/430/1440 and 200% review text; real long/untrusted names safely escaped; targets >=44px; zero automated accessibility violations");
        phase="real commit and dropped response";dropNextSave=true;await confirmWithKeyboard();await panel.getByRole("button",{name:"Check original request",exact:true}).waitFor();expect(committedBeforeLoss).toBe(true);
        expect(await q("SELECT count(*)::int n FROM shifts WHERE date=$1",[date])).toEqual([{n:2}]);
        await q("UPDATE employee_scheduling_settings SET maximum_weekly_hours=39 WHERE employee_id LIKE 'COVER-%'");
        await activateFirstActionWithKeyboard("Check original request");await panel.getByRole("heading",{name:"Draft saved",exact:true}).waitFor();
        expect(await q("SELECT count(*)::int n FROM shifts WHERE date=$1",[date])).toEqual([{n:2}]);
        expect(await q("SELECT (SELECT count(*)::int FROM notifications) notifications,(SELECT count(*)::int FROM schedule_publication_revisions) publications")).toEqual([{notifications:0,publications:0}]);
        expect(await q("SELECT DISTINCT status FROM schedules WHERE week_start=$1",[date])).toEqual([{status:"DRAFT"}]);
        phase="positive current progress";await activateFirstActionWithKeyboard("Check progress");await panel.getByText("2 of 2 exact assignments present · 0 of 2 published",{exact:true}).waitFor();
        expect(await panel.getByRole("link",{name:"Open this schedule",exact:true}).getAttribute("href")).toBe(`/app/schedule?week=${date}`);await panel.screenshot({path:resolve(evidence,`${engine}-saved-progress.png`)});
        phase="saved comparison provenance";
        const comparison=page.getByRole("region",{name:"Day plan comparison",exact:true});
        await comparison.getByText(/This comparison predates your save/).waitFor();
        await page.getByText("From an earlier comparison:",{exact:true}).waitFor();
        await compare();
        expect(await comparison.getByText(/This comparison predates your save/).count()).toBe(0);
        expect(await page.getByText("From an earlier comparison:",{exact:true}).count()).toBe(0);
        expect(await page.getByText(/Nothing has been saved or published/).count()).toBe(0);
        checks.push(engine+": native keyboard review/Space acknowledgement/Enter save, original recovery and progress; fresh comparison is not mislabeled stale while receipt stays visible");
        phase="removed assignment progress";
        await q("DELETE FROM shifts WHERE id=(SELECT id FROM shifts WHERE date=$1 ORDER BY id LIMIT 1)",[date]);await panel.getByRole("button",{name:"Check progress",exact:true}).click();await panel.getByText("1 of 2 exact assignments present · 0 of 2 published",{exact:true}).waitFor();
        checks.push(engine+": actual commit followed by deliberately dropped network reply recovers original receipt after source change with no duplicate; draft-only rows/no outbox; fresh checks detect removed assignment");
        phase="private retirement";await q("DELETE FROM employee_sessions WHERE employee_id='QAOWNER'");await page.getByRole("button",{name:"Refresh history",exact:true}).first().click();await panel.waitFor({state:"hidden"});expect(await page.getByText("Fictional Alexandria <script>unsafe</script> Long surname example",{exact:true}).count()).toBe(0);checks.push(engine+": revoked session retires private review and receipt DOM");
      } catch(error) {await page.screenshot({path:resolve(evidence,`${engine}-failed.png`),fullPage:true}).catch(()=>{});await writeFile(resolve(evidence,`${engine}-failure.json`),JSON.stringify({phase,message:String(error)},null,2));throw error;}
      finally {await context.tracing.stop({path:resolve(evidence,`${engine}-trace.zip`)}).catch(()=>{});await context.close();await browser.close();}
    }
    expect(external).toEqual([]);expect(errors).toEqual([]);complete=true;
  } finally {await app.close();await writeFile(resolve(evidence,"report.json"),JSON.stringify({complete,checks,external,errors,source:app.sourceHashes,providerConfigured:false,networkFault:"One real apply response is fetched to completion then connection-reset; no synthetic API result or operational service"},null,2));}
});
