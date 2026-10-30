import { expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createOwnedNextApp } from "./owned-next-app";
import { seedOwnedApp, TEST_PASSWORD } from "./owned-app-fixture";

it("persists private goals and tasks through the real Owner app, preserves deliberate drafts and retires private content", async () => {
  const externalEvidence = process.env.NEVORA_OWNER_ADVISOR_BROWSER_EVIDENCE;
  if (!externalEvidence) throw Error("Explicit external evidence directory required");
  const evidence = resolve(externalEvidence, "notebook");
  await mkdir(evidence, { recursive: true });
  const requireRuntime = createRequire(resolve("tools/ci-browser-runtime/package.json"));
  const runtime = requireRuntime("playwright");
  const axe = await readFile(requireRuntime.resolve("axe-core/axe.min.js"), "utf8");
  const app = await createOwnedNextApp(evidence, { ownerAdvisorEnabled: true });
  const checks: string[] = [], external: string[] = [], errors: string[] = [];
  let complete = false;
  try {
    await seedOwnedApp(app.database.executor);
    const before = await app.database.executor.query({ text: "SELECT (SELECT count(*)::int FROM shifts) shifts,(SELECT count(*)::int FROM notifications) notifications", values: [] });
    const origin = app.url.replace("127.0.0.1", "localhost");
    for (const engine of ["chromium", "webkit"]) {
      await app.database.executor.query({ text: "DELETE FROM owner_advisor_notebooks WHERE owner_id='QAOWNER'", values: [] });
      const browser = await runtime[engine].launch({ headless: true });
      const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, serviceWorkers: "block" });
      const page = await context.newPage();
      let phase = "login";
      try {
        await context.route("**/*", async (route: { request(): { url(): string }; abort(): Promise<void>; continue(): Promise<void> }) => {
          const url = new URL(route.request().url());
          if (["http:", "https:"].includes(url.protocol) && url.origin !== origin) { external.push(url.origin); await route.abort(); }
          else await route.continue();
        });
        page.on("pageerror", (error: Error) => errors.push(`${engine}:${phase}:${error.message}`));
        page.setDefaultTimeout(20000);
        await context.tracing.start({ screenshots: true, snapshots: true });
        await page.goto(origin + "/login");
        await page.getByLabel("Employee ID", { exact: true }).fill("QAOWNER");
        await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
        await page.getByRole("button", { name: "Sign in", exact: true }).click();
        await page.waitForURL(origin + "/app");
        await page.goto(origin + "/app/ai-manager");
        await page.getByRole("button", { name: "Add goal", exact: true }).waitFor();
        expect(await page.getByRole("button", { name: "Ask", exact: true }).isDisabled()).toBe(true);

        phase = "real goal and task persistence";
        const goalText = "Keep <script>window.nevoraOwnerInjected=true</script> weekday coverage reliable";
        await page.getByRole("button", { name: "Add goal", exact: true }).click();
        const goalEditor = page.getByRole("form", { name: "Edit saved goal", exact: true });
        await goalEditor.getByLabel("Goal", { exact: true }).fill(goalText);
        await goalEditor.getByRole("button", { name: "Save goal", exact: true }).click();
        await goalEditor.waitFor({ state: "hidden" });
        await page.getByText(goalText, { exact: true }).waitFor();
        expect(await page.evaluate(() => Object.hasOwn(window, "nevoraOwnerInjected"))).toBe(false);
        const objectiveA = "Investigate weekday staffing A";
        const objectiveB = "Review recorded payroll B";
        const taskEditor = page.getByRole("form", { name: "Edit saved task", exact: true });
        await page.getByRole("button", { name: "Add task", exact: true }).click();
        await taskEditor.getByLabel("Objective", { exact: true }).fill(objectiveA);
        await taskEditor.getByLabel("Your notes", { exact: true }).fill("Confirm the person's availability before a draft");
        await taskEditor.getByLabel("Investigation scope", { exact: true }).selectOption("coverage");
        await taskEditor.getByLabel("Coverage date", { exact: true }).fill("2030-10-07");
        await taskEditor.getByRole("button", { name: "Save task", exact: true }).click();
        await taskEditor.waitFor({ state: "hidden" });
        await page.getByRole("button", { name: "Add task", exact: true }).click();
        await taskEditor.getByLabel("Objective", { exact: true }).fill(objectiveB);
        await taskEditor.getByLabel("Your notes", { exact: true }).fill("Review recorded exceptions; no financial approval");
        await taskEditor.getByLabel("Investigation scope", { exact: true }).selectOption("period");
        await taskEditor.getByLabel("Period start", { exact: true }).fill("2026-10-01");
        await taskEditor.getByLabel("Period end", { exact: true }).fill("2026-10-07");
        await taskEditor.getByRole("button", { name: "Save task", exact: true }).click();
        await taskEditor.waitFor({ state: "hidden" });
        await page.reload();
        await page.getByRole("button", { name: "Add goal", exact: true }).waitFor();
        await page.getByText(goalText, { exact: true }).waitFor();
        const taskA = page.locator(".oa-notebook li").filter({ has: page.getByRole("heading", { name: objectiveA, exact: true }) });
        const taskB = page.locator(".oa-notebook li").filter({ has: page.getByRole("heading", { name: objectiveB, exact: true }) });
        await taskA.getByText("Confirm the person's availability before a draft", { exact: true }).waitFor();
        await taskB.getByText("Review recorded exceptions; no financial approval", { exact: true }).waitFor();
        checks.push(`${engine}: escaped private goals, typed coverage/period tasks and notes survive a real reload without provider configuration`);

        phase = "task selection and closure";
        await taskA.getByRole("button", { name: "Continue investigation", exact: true }).click();
        expect(await page.getByLabel("Your question", { exact: true }).inputValue()).toBe(objectiveA);
        await taskB.getByRole("button", { name: "Continue investigation", exact: true }).click();
        expect(await page.getByLabel("Your question", { exact: true }).inputValue()).toBe(objectiveB);
        const explicitQuestion = "Compare this with my Owner priorities";
        await page.getByLabel("Your question", { exact: true }).fill(explicitQuestion);
        await taskA.getByRole("button", { name: "Continue investigation", exact: true }).click();
        expect(await page.getByLabel("Your question", { exact: true }).inputValue()).toBe(explicitQuestion);
        await page.getByLabel("Investigating", { exact: true }).selectOption("");
        expect(await page.getByLabel("Your question", { exact: true }).inputValue()).toBe(explicitQuestion);
        await page.getByLabel("Your question", { exact: true }).fill("");
        await taskA.getByRole("button", { name: "Continue investigation", exact: true }).click();
        await taskA.getByRole("button", { name: "Close task", exact: true }).click();
        await taskA.getByRole("button", { name: "Reopen task", exact: true }).waitFor();
        await taskA.getByText(/^Closed by you/).waitFor();
        await page.getByText("Choose an open task or select a general investigation to continue.", { exact: true }).waitFor();
        await page.getByLabel("Investigating", { exact: true }).selectOption("");
        expect(await page.getByLabel("Your question", { exact: true }).inputValue()).toBe("");
        await taskA.getByRole("button", { name: "Reopen task", exact: true }).click();
        await taskA.getByRole("button", { name: "Continue investigation", exact: true }).waitFor();
        await taskB.getByRole("button", { name: "Review current period", exact: true }).click();
        await page.getByText(/Payroll readiness is unverified/).first().waitFor();
        checks.push(`${engine}: A→B uses the selected objective, manual text survives switches, Owner closure/reopen is honest, current period uses the real read path`);

        phase = "concurrent draft conflict";
        await page.getByRole("button", { name: "Edit goal", exact: true }).click();
        const draft = "Preserved explicit Owner goal draft";
        await goalEditor.getByLabel("Goal", { exact: true }).fill(draft);
        const snapshotResponse = await context.request.get(origin + "/api/owner/advisor", { headers: { "x-nevora-owner-advisor": "1" } });
        expect(snapshotResponse.status()).toBe(200);
        const snapshot = await snapshotResponse.json();
        const goal = snapshot.notebook.notebook.goals[0];
        const otherDevice = await context.request.post(origin + "/api/owner/advisor", {
          headers: { "x-nevora-owner-advisor": "1", Origin: origin },
          data: { op: "notebook", requestId: randomUUID(), expectedRevision: snapshot.notebook.notebook.revision, change: { kind: "save_goal", goalId: goal.id, text: "Goal saved from another device" } },
        });
        expect(otherDevice.status()).toBe(200);
        await page.getByRole("button", { name: "Refresh history", exact: true }).first().click();
        await page.getByRole("button", { name: "I’ve reviewed the current saved items", exact: true }).waitFor();
        expect(await goalEditor.getByLabel("Goal", { exact: true }).inputValue()).toBe(draft);
        expect(await goalEditor.getByRole("button", { name: "Save goal", exact: true }).isDisabled()).toBe(true);
        await page.getByText("Goal saved from another device", { exact: true }).waitFor();
        await page.getByRole("button", { name: "I’ve reviewed the current saved items", exact: true }).click();
        await goalEditor.getByRole("button", { name: "Save goal", exact: true }).click();
        await goalEditor.waitFor({ state: "hidden" });
        await page.getByText(draft, { exact: true }).waitFor();
        checks.push(`${engine}: concurrent real API change preserves the draft and blocks overwrite until explicit saved-context review`);

        phase = "responsive and accessibility";
        await page.evaluate(axe);
        for (const width of [320, 390, 1440]) {
          await page.setViewportSize({ width, height: 1000 });
          const layout = await page.evaluate(() => ({
            overflow: document.documentElement.scrollWidth > innerWidth,
            shortTargets: [...document.querySelectorAll<HTMLElement>(".oa-notebook button,.oa-notebook summary")].filter(el => el.getBoundingClientRect().width > 0 && el.getBoundingClientRect().height < 44).map(el => ({ text: el.textContent, height: el.getBoundingClientRect().height })),
          }));
          const audit = await page.evaluate("axe.run('.oa-content', {runOnly: {type: 'tag', values: ['wcag2a','wcag2aa','wcag21aa']}})");
          await writeFile(resolve(evidence, `${engine}-${width}-audit.json`), JSON.stringify({ layout, audit }, null, 2));
          await page.screenshot({ path: resolve(evidence, `${engine}-${width}.png`), fullPage: true });
          expect(layout.overflow, `${engine}/${width} overflow`).toBe(false);
          expect(layout.shortTargets, `${engine}/${width} notebook touch targets`).toEqual([]);
          expect(audit.violations, `${engine}/${width} accessibility`).toEqual([]);
        }
        checks.push(`${engine}: 320/390/1440px reflow, 44px notebook targets and automated accessibility checks`);

        phase = "private draft retirement";
        await page.getByRole("button", { name: "Edit goal", exact: true }).click();
        await goalEditor.getByLabel("Goal", { exact: true }).fill("Private draft must retire");
        // Exercise the application's existing explicit signout event in this
        // fictional context; never read or copy browser credential material.
        await page.evaluate(() => window.dispatchEvent(new Event("nevora:signout")));
        await page.getByText("Current information is hidden until access is refreshed.", { exact: true }).waitFor();
        expect(await page.getByRole("button", { name: "Add goal", exact: true }).count()).toBe(0);
        expect(await page.getByText(draft, { exact: true }).count()).toBe(0);
        expect(await goalEditor.count()).toBe(0);
        await page.screenshot({ path: resolve(evidence, `${engine}-retired.png`), fullPage: true });
        checks.push(`${engine}: explicit signout retires saved private content and unsaved notebook drafts`);
      } catch (error) {
        await page.screenshot({ path: resolve(evidence, `${engine}-failed.png`), fullPage: true }).catch(() => {});
        await writeFile(resolve(evidence, `${engine}-failure.json`), JSON.stringify({ phase, message: String(error) }, null, 2));
        throw error;
      } finally {
        await context.tracing.stop({ path: resolve(evidence, `${engine}-trace.zip`) }).catch(() => {});
        await context.close();
        await browser.close();
      }
    }
    expect(await app.database.executor.query({ text: "SELECT (SELECT count(*)::int FROM shifts) shifts,(SELECT count(*)::int FROM notifications) notifications", values: [] })).toEqual(before);
    expect(await app.database.executor.query({ text: "SELECT count(*)::int n FROM owner_advisor_requests WHERE kind='ask'", values: [] })).toEqual([{ n: 0 }]);
    expect(external).toEqual([]);
    expect(errors).toEqual([]);
    complete = true;
  } finally {
    await app.close();
    await writeFile(resolve(evidence, "report.json"), JSON.stringify({ complete, checks, external, errors, source: app.sourceHashes, providerConfigured: false, fixtureScope: "real Next UI, login, scoped API and PostgreSQL; only signout lifecycle event is simulated; no provider/model calls" }, null, 2));
  }
});
