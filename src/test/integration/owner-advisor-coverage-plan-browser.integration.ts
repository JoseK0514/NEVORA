import { expect, it } from "vitest";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createOwnedNextApp } from "./owned-next-app";
import { seedOwnedApp, TEST_PASSWORD } from "./owned-app-fixture";
import { fictionalProfile } from "../fixtures/shift-changes";

it("compares real joint day plans with discoverable keyboard review and private retirement", async () => {
  const root = process.env.NEVORA_OWNER_ADVISOR_BROWSER_EVIDENCE;
  if (!root) throw Error("Explicit external evidence directory required");
  const evidence = resolve(root, "coverage-plans");
  await mkdir(evidence, { recursive: true });
  const requireRuntime = createRequire(resolve("tools/ci-browser-runtime/package.json"));
  const runtime = requireRuntime("playwright");
  const axe = await readFile(requireRuntime.resolve("axe-core/axe.min.js"), "utf8");
  const app = await createOwnedNextApp(evidence, { ownerAdvisorEnabled: true });
  const checks: string[] = [], external: string[] = [], errors: string[] = [], consoleMessages: unknown[] = [];
  let complete = false;
  try {
    await seedOwnedApp(app.database.executor);
    const q = (text: string, values: unknown[] = []) => app.database.executor.query({ text, values });
    await q(`UPDATE location_coverage_windows SET start_time='08:00',end_time='12:00';
      UPDATE location_staffing_settings SET requires_designated_lead=true WHERE location_id='loc-2';
      INSERT INTO coverage_window_position_requirements(coverage_window_id,position_id,quantity) VALUES('qa-loc-2-1','qa-pos',1);
      INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES
      ('OA-JOINT-A','Fictional <script>window.nevoraJointInjected=true</script>','Lead','555-0111','LEAD','loc-1'),
      ('OA-JOINT-B','Fictional','Specialist','555-0112','EMPLOYEE','loc-1'),
      ('OA-JOINT-C','Fictional','Backup','555-0113','LEAD','loc-1');
      INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES('OA-JOINT-A','loc-1'),('OA-JOINT-A','loc-2'),('OA-JOINT-B','loc-1'),('OA-JOINT-C','loc-1'),('OA-JOINT-C','loc-2');
      INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) SELECT id||'-av',id,1,'08:00','12:00' FROM employees WHERE id LIKE 'OA-JOINT-%';
      INSERT INTO weekly_availability_submissions(employee_id,week_start,uses_normal_availability) SELECT id,'2030-10-07',true FROM employees WHERE id LIKE 'OA-JOINT-%';`);
    await q("INSERT INTO employee_scheduling_settings(employee_id,maximum_weekly_hours,operational_rule_profile) SELECT id,40,$1::jsonb FROM employees WHERE id LIKE 'OA-JOINT-%'", [JSON.stringify(fictionalProfile())]);
    const before = await q("SELECT (SELECT count(*)::int FROM shifts) shifts,(SELECT count(*)::int FROM schedules) schedules,(SELECT count(*)::int FROM notifications) notifications,(SELECT count(*)::int FROM owner_advisor_requests WHERE kind='ask') asks");
    const origin = app.url.replace("127.0.0.1", "localhost");
    for (const engine of ["chromium", "webkit"]) {
      await q("INSERT INTO employee_positions(employee_id,position_id) VALUES('OA-JOINT-A','qa-pos'),('OA-JOINT-C','qa-pos') ON CONFLICT DO NOTHING");
      const browser = await runtime[engine].launch({ headless: true });
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
      const page = await context.newPage();
      let phase = "login", posts = 0;
      try {
        await context.tracing.start({ screenshots: true, snapshots: true });
        await context.route("**/*", async (route: { request(): { url(): string }; abort(): Promise<void>; continue(): Promise<void> }) => {
          const url = new URL(route.request().url());
          if (["http:", "https:"].includes(url.protocol) && url.origin !== origin) { external.push(url.origin); await route.abort(); }
          else await route.continue();
        });
        page.on("pageerror", (error: Error) => errors.push(`${engine}:${phase}:${error.message}`));
        page.on("console", (message: { type(): string; text(): string }) => {
          if (["warning", "error"].includes(message.type())) consoleMessages.push({ engine, phase, type: message.type(), text: message.text() });
        });
        page.on("request", (request: { url(): string; method(): string }) => { if (request.url().endsWith("/api/owner/advisor") && request.method() === "POST") posts++; });
        page.setDefaultTimeout(20000);
        await page.goto(origin + "/login");
        await page.getByLabel("Employee ID", { exact: true }).fill("QAOWNER");
        await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
        await page.getByRole("button", { name: "Sign in", exact: true }).click();
        await page.waitForURL(origin + "/app");
        await page.waitForLoadState("networkidle");
        await page.locator("main").getByRole("link", { name: "AI manager", exact: true }).click();
        await page.waitForURL(origin + "/app/ai-manager");
        const compare = page.getByRole("button", { name: "Compare day plans", exact: true });
        await compare.waitFor();
        expect(await page.getByRole("button", { name: "Ask", exact: true }).isDisabled()).toBe(true);
        const date = page.getByLabel("Coverage date", { exact: true });

        phase = "native empty-date validation";
        const priorPosts = posts;
        await date.fill(""); await compare.click();
        const invalid = await date.evaluate((input: HTMLInputElement) => ({ missing: input.validity.valueMissing, focused: document.activeElement === input }));
        expect(invalid).toEqual({ missing: true, focused: true });
        expect(posts).toBe(priorPosts);
        checks.push(`${engine}: empty date receives native field validation without an API request`);

        phase = "normal comparison and discovery";
        await date.fill("2030-10-07");
        const request = page.waitForResponse((response: { url(): string; request(): { method(): string } }) => response.url().endsWith("/api/owner/advisor") && response.request().method() === "POST");
        await compare.click();
        const response = await request;
        expect(response.status()).toBe(200);
        const body = await response.json();
        const plans = body.answer.coveragePlans;
        expect(plans.alternatives[0]).toMatchObject({ status: "COMPLETE", addedMinutes: 480, remaining: { total: 0 } });
        expect(plans.alternatives[0].assignments).toHaveLength(2);
        const result = page.getByRole("region", { name: "Day plan comparison", exact: true });
        await result.waitFor();
        const heading = result.getByRole("heading", { name: /^Day plan comparison/ });
        // waitFor/getByRole do not auto-scroll. A normal comparison must reveal its result.
        await expect.poll(() => heading.evaluate((el: HTMLElement) => document.activeElement === el)).toBe(true);
        const discovery = await heading.evaluate((el: HTMLElement) => { const b = el.getBoundingClientRect(); return { focused: document.activeElement === el, visible: b.top >= 0 && b.bottom <= innerHeight, top: b.top, bottom: b.bottom }; });
        await writeFile(resolve(evidence, `${engine}-discovery.json`), JSON.stringify(discovery, null, 2));
        expect(discovery.focused).toBe(true); expect(discovery.visible).toBe(true);
        await page.keyboard.press(engine === "webkit" && process.platform === "darwin" ? "Alt+Tab" : "Tab");
        expect(await result.getByText("Review scope and source", { exact: true }).evaluate((el: HTMLElement) => document.activeElement === el)).toBe(true);
        await page.keyboard.press("Enter");
        await result.getByText(`Source fingerprint: ${plans.sourceVersion}`, { exact: true }).waitFor();
        expect(await result.locator("script").count()).toBe(0);
        expect(await page.evaluate(() => Object.hasOwn(window, "nevoraJointInjected"))).toBe(false);
        expect(await result.getByRole("button", {name:"Review draft changes", exact:true}).count()).toBe(plans.alternatives.length);
        expect(await result.getByRole("button", {name:/^Save .*draft/}).count()).toBe(0);
        await writeFile(resolve(evidence, `${engine}-plan.json`), JSON.stringify(plans, null, 2));
        checks.push(`${engine}: real read-only API jointly allocates both locations; normal click reveals focused result; keyboard reaches scope; source and untrusted labels are safe`);

        phase = "responsive accessibility";
        await page.evaluate(axe);
        for (const width of [320, 390, 1440]) {
          await page.setViewportSize({ width, height: 844 });
          const layout = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth,
            shortTargets: [...document.querySelectorAll<HTMLElement>(".oa-answer summary, #oa-coverage-date, .oa-section form button")].filter(el => el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height < 44).map(el => ({ text: el.textContent, height: el.getBoundingClientRect().height })) }));
          const audit = await page.evaluate("axe.run('.oa-content', {runOnly: {type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa']}})");
          await writeFile(resolve(evidence, `${engine}-${width}-audit.json`), JSON.stringify({ layout, audit }, null, 2));
          await page.screenshot({ path: resolve(evidence, `${engine}-${width}.png`), fullPage: true });
          expect(layout.overflow).toBe(false); expect(layout.shortTargets).toEqual([]); expect(audit.violations).toEqual([]);
        }
        checks.push(`${engine}: actual plan results reflow at 320/390/1440 with 44px controls and zero automated accessibility violations`);

        phase = "fresh source and honest remaining needs";
        await q("DELETE FROM employee_positions WHERE employee_id IN('OA-JOINT-A','OA-JOINT-C')");
        await date.fill("2030-10-07");
        const nextResponse = page.waitForResponse((r: { url(): string; request(): { method(): string } }) => r.url().endsWith("/api/owner/advisor") && r.request().method() === "POST");
        await compare.click();
        const fresh = await (await nextResponse).json();
        expect(fresh.answer.coveragePlans.sourceVersion).not.toBe(plans.sourceVersion);
        expect(fresh.answer.coveragePlans.alternatives[0].status).not.toBe("COMPLETE");
        await result.getByRole("article", { name: "Day plan 1", exact: true }).getByRole("heading", { name: /Requirements remain|Search limit reached/ }).waitFor();
        await result.getByText(/^Remaining requirements/).first().click();
        await result.getByText(/Customer Support: 1 needed/).first().waitFor();
        await page.screenshot({ path: resolve(evidence, `${engine}-remaining.png`), fullPage: true });
        checks.push(`${engine}: a new request uses changed qualifications, new fingerprint and actual remaining position needs`);

        phase = "live authority retirement";
        await q("DELETE FROM employee_sessions WHERE employee_id='QAOWNER'");
        await page.getByRole("button", { name: "Refresh history", exact: true }).first().click();
        await result.waitFor({ state: "hidden" });
        expect(await page.getByText(`Source fingerprint: ${plans.sourceVersion}`, { exact: true }).count()).toBe(0);
        await page.screenshot({ path: resolve(evidence, `${engine}-retired.png`), fullPage: true });
        checks.push(`${engine}: real session revocation and refreshed authority retire private plan content`);
      } catch (error) {
        await page.screenshot({ path: resolve(evidence, `${engine}-failed.png`), fullPage: true }).catch(() => {});
        await writeFile(resolve(evidence, `${engine}-failure.json`), JSON.stringify({ phase, message: String(error) }, null, 2));
        throw error;
      } finally {
        await context.tracing.stop({ path: resolve(evidence, `${engine}-trace.zip`) }).catch(() => {});
        await context.close(); await browser.close();
      }
    }
    expect(await q("SELECT (SELECT count(*)::int FROM shifts) shifts,(SELECT count(*)::int FROM schedules) schedules,(SELECT count(*)::int FROM notifications) notifications,(SELECT count(*)::int FROM owner_advisor_requests WHERE kind='ask') asks")).toEqual(before);
    expect(external).toEqual([]); expect(errors).toEqual([]);
    complete = true;
  } finally {
    await app.close();
    await writeFile(resolve(evidence, "report.json"), JSON.stringify({ complete, checks, external, errors, consoleMessages, source: app.sourceHashes,
      providerConfigured: false, fixtureScope: "real Next/login/API/owned PostgreSQL with fictional people; no API interception, model call or simulated lifecycle event" }, null, 2));
  }
});
