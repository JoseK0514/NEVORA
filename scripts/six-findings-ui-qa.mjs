import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { join, resolve } from "node:path";
import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { createOwnedNextApp } from "../src/test/integration/owned-next-app.ts";
import {
  seedOwnedApp,
  TEST_PASSWORD,
} from "../src/test/integration/owned-app-fixture.ts";
import { hashPassword } from "../src/lib/auth/password.ts";
const playwright = createRequire(
  join(
    homedir(),
    ".cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/package.json",
  ),
)("playwright");
const evidence = resolve(".omo/evidence/six-findings/browser");
await mkdir(evidence, { recursive: true });
const report = {
  checks: [],
  pageErrors: [],
  screenshots: [],
  limitations: [
    "Owned local Next + PostgreSQL; only database transport substituted. No provider, production, physical-device or independent certification.",
  ],
};
const checked = (name) => {
  report.checks.push(name);
  console.log("PASS " + name);
};
let app, browser;
try {
  app = await createOwnedNextApp(resolve("../six-findings-browser-runtime"));
  const q = (text, values = []) =>
    app.database.executor.query({ text, values });
  await seedOwnedApp(app.database.executor);
  await q(
    "INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('QA-WORKER','Fictional','Worker','5550111','EMPLOYEE','loc-1'),('QA-MANAGER','Fictional','Manager','5550112','MANAGER','loc-1'),('QA-INACTIVE','Fictional','Leaver','5550113','EMPLOYEE','loc-1'); UPDATE employees SET active=false WHERE id='QA-INACTIVE'; INSERT INTO employee_location_eligibility VALUES('QA-WORKER','loc-1'); INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) SELECT 'qa-worker-'||day,'QA-WORKER',day,'00:00','24:00' FROM generate_series(0,6) day; INSERT INTO schedule_templates(id,name,created_by) VALUES('qa-template','QA working pattern','QAOWNER'); INSERT INTO schedule_template_shifts(id,template_id,location_id,day_offset,start_time,end_time,employee_id) VALUES('qa-template-row','qa-template','loc-1',0,'08:00','12:00','QA-WORKER')",
  );
  await q(
    "INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false)",
    ["QA-MANAGER", await hashPassword(TEST_PASSWORD)],
  );
  browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    }),
    page = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on("pageerror", (e) => report.pageErrors.push(e.message));
  async function login(target, employee) {
    await target.goto(app.url + "/login");
    await target.getByLabel("Employee ID", { exact: true }).fill(employee);
    await target.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
    await Promise.all([
      target.waitForURL((u) => u.pathname === "/app"),
      target.getByRole("button", { name: "Sign In", exact: true }).click(),
    ]);
  }
  await login(page, "QAOWNER");
  await page.goto(app.url + "/app/settings/company-policies");
  await page
    .getByRole("heading", { name: "Company policies", exact: true })
    .waitFor();
  const lateness = page.getByRole("group", { name: "Lateness", exact: true });
  await lateness.getByLabel("Configuration").selectOption("configured");
  await lateness.getByLabel("Threshold minutes").fill("5");
  await lateness
    .getByLabel("Effective from (ISO timestamp with timezone)")
    .fill("invalid");
  await page
    .getByRole("button", { name: "Save policy revision", exact: true })
    .click();
  await page
    .getByRole("status")
    .filter({ hasText: "Review thresholds" })
    .waitFor();
  assert.equal(
    await lateness.getByLabel("Threshold minutes").isEnabled(),
    true,
  );
  checked("Invalid policy timestamp rejects and keeps fields editable");
  await lateness
    .getByLabel("Effective from (ISO timestamp with timezone)")
    .fill("2020-01-01T00:00:00Z");
  await page
    .getByRole("button", { name: "Save policy revision", exact: true })
    .click();
  await page.getByRole("status").filter({ hasText: "Saved." }).waitFor();
  await page.reload();
  await page.getByRole("heading", { name: "Policy history" }).waitFor();
  assert.match(await page.locator("body").innerText(), /Revision 1/);
  checked("Owner policy save survives reload with immutable history");
  await page.screenshot({
    path: join(evidence, "owner-policy-desktop.png"),
    fullPage: true,
  });
  report.screenshots.push("owner-policy-desktop.png");
  await page.goto(app.url + "/app/schedule/templates?week=2030-10-07");
  let aborted = false;
  await page.route("**/api/schedule-copy", async (route) => {
    if (!aborted) {
      aborted = true;
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await page
    .getByRole("status")
    .filter({ hasText: "Response unavailable" })
    .waitFor();
  const original = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("nevora-copy-pending:QAOWNER")),
  );
  assert(original.operationId);
  assert.equal(
    (
      await q(
        "SELECT operation_id FROM schedule_copy_receipts WHERE operation_id=$1",
        [original.operationId],
      )
    ).length,
    1,
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Check / retry original copy", exact: true })
    .waitFor();
  assert.equal(
    await page.getByRole("button", { name: "Apply", exact: true }).count(),
    0,
  );
  await page
    .getByRole("button", { name: "Check / retry original copy", exact: true })
    .click();
  await page.waitForURL((u) => u.pathname === "/app/schedule/copy-receipt");
  assert.match(
    await page.locator("body").innerText(),
    /1 committed; 0 skipped/,
  );
  assert.equal(
    (
      await q(
        "SELECT sh.id FROM shifts sh JOIN schedules s ON s.id=sh.schedule_id WHERE s.week_start='2030-10-07'",
      )
    ).length,
    1,
  );
  checked(
    "Lost browser response retains original UUID across reload; retry returns original receipt and exactly one shift",
  );
  await page.screenshot({
    path: join(evidence, "copy-receipt-desktop.png"),
    fullPage: true,
  });
  report.screenshots.push("copy-receipt-desktop.png");
  await page.goto(app.url + "/app/schedule/templates?week=2030-11-04");
  await page.getByRole("button", { name: "Apply", exact: true }).waitFor();
  await q("UPDATE schedule_templates SET active=false WHERE id='qa-template'");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await page.waitForURL((u) => u.pathname === "/app/schedule/copy-receipt");
  assert.match(await page.locator("body").innerText(), /selected template was unavailable/);
  assert.equal(await page.evaluate(() => localStorage.getItem("nevora-copy-pending:QAOWNER")), null);
  await q("UPDATE schedule_templates SET active=true WHERE id='qa-template'");
  await page.goto(app.url + "/app/schedule/templates?week=2030-11-04");
  await page.getByRole("button", { name: "Apply", exact: true }).click();
  await page.waitForURL((u) => u.pathname === "/app/schedule/copy-receipt");
  assert.match(await page.locator("body").innerText(), /1 committed; 0 skipped/);
  checked("Stale archived template returns a durable terminal receipt; a new copy succeeds after recovery");
  await page.goto(
    app.url + "/app/payroll-export?start=2020-10-01&end=2020-10-07",
  );
  await page
    .getByRole("heading", { name: "Complete payroll population and handoff" })
    .waitFor();
  await page.getByText("Inactive account", { exact: false }).first().waitFor();
  const population = page
    .locator("section")
    .filter({
      has: page.getByRole("heading", {
        name: "Complete payroll population and handoff",
        exact: true,
      }),
    })
    .last();
  for (const field of await population
    .locator('select[name$=".disposition"]')
    .all())
    await field.selectOption("ZERO_TIME");
  for (const field of await population.locator('input[name$=".reason"]').all())
    await field.fill("Reviewed zero time in fictional period");
  for (const field of await population
    .locator('textarea[name$=".employment"]')
    .all())
    await field.fill(
      "Manager reviewed period membership; employment dates not supplied",
    );
  const lostPeriodResponses = new Set();
  await page.route("**/api/period-close", async (route) => {
    const payload = route.request().postDataJSON();
    if (["POPULATION", "HANDOFF"].includes(payload?.action) && !lostPeriodResponses.has(payload.action)) {
      lostPeriodResponses.add(payload.action);
      await route.fetch();
      await route.abort("failed");
    } else await route.continue();
  });
  await population
    .getByRole("button", { name: "Save reviewed population revision" })
    .click();
  await population.getByRole("status").filter({ hasText: "Outcome unconfirmed" }).waitFor();
  const recoveryKey = "nevora-period-pending:QAOWNER:2020-10-01:2020-10-07";
  const originalPopulation = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), recoveryKey);
  assert.equal(originalPopulation.action, "POPULATION");
  await page.reload();
  await population.getByRole("button", { name: "Retry original period command" }).click();
  await population
    .getByText("Population revision 1.", { exact: false })
    .waitFor();
  assert.equal((await q("SELECT operation_id FROM payroll_period_populations WHERE operation_id=$1", [originalPopulation.command.operationId])).length, 1);
  assert.equal((await q("SELECT revision FROM payroll_period_populations")).length, 1);
  checked("Lost population response restores the original operation after reload and retains one revision");
  await population
    .getByRole("button", { name: "Prepare verified manifest" })
    .click();
  await population
    .getByRole("heading", {
      name: "Manifest matches current reviewed population",
    })
    .waitFor();
  await population
    .getByLabel("Destination", { exact: true })
    .fill("Fictional payroll portal");
  await population.getByLabel("External reference").fill("LOCAL-UI-REVIEW");
  await population.getByRole("button", { name: "Save handoff report" }).click();
  await population.getByRole("status").filter({ hasText: "Outcome unconfirmed" }).waitFor();
  const originalHandoff = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), recoveryKey);
  assert.equal(originalHandoff.action, "HANDOFF");
  await page.reload();
  await population.getByRole("button", { name: "Retry original period command" }).click();
  await page.getByText("LOCAL-UI-REVIEW", { exact: false }).waitFor();
  await population.getByRole("status").filter({ hasText: "Handoff report saved" }).waitFor();
  assert.equal((await q("SELECT id FROM payroll_period_events WHERE id=$1 AND kind='REPORTED_SUBMITTED'", [originalHandoff.command.operationId])).length, 1);
  assert.equal((await q("SELECT id FROM payroll_period_events WHERE kind='REPORTED_SUBMITTED'")).length, 1);
  assert.equal(await page.evaluate((key) => localStorage.getItem(key), recoveryKey), null);
  checked(
    "Lost handoff response retains original command across reload; exact retry creates one honest manual handoff",
  );
  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("link", { name: "Retrieve saved manifest", exact: true })
    .click();
  const download = await downloadPromise;
  await download.saveAs(join(evidence, "browser-retrieved-manifest.json"));
  checked(
    "Authorized manifest response provides attachment; automation captured this local test download",
  );
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.screenshot({
      path: join(evidence, `payroll-${width}.png`),
      fullPage: true,
    });
    report.screenshots.push(`payroll-${width}.png`);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
      true,
      `Payroll ${width} has no horizontal overflow`,
    );
  }
  const manager = await browser.newContext({
      viewport: { width: 375, height: 900 },
    }),
    managerPage = await manager.newPage();
  managerPage.on("pageerror", (e) => report.pageErrors.push(e.message));
  await login(managerPage, "QA-MANAGER");
  await managerPage.goto(app.url + "/app?view=attendance");
  await managerPage
    .getByText("Configured attendance comparisons", { exact: true })
    .click();
  await managerPage
    .getByText("Not configured", { exact: false })
    .first()
    .waitFor();
  await managerPage.screenshot({
    path: join(evidence, "attendance-manager-mobile.png"),
    fullPage: true,
  });
  report.screenshots.push("attendance-manager-mobile.png");
  assert.equal(
    await managerPage.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    true,
  );
  const denied = await managerPage.evaluate(async () => {
    const response = await fetch("/api/company-policies", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-nevora-company-policies": "1",
      },
      body: "{}",
    });
    return response.status;
  });
  assert.equal(denied, 403);
  checked(
    "Manager Attendance shows configured and Not configured states; Owner policy writes denied to Manager",
  );
  await page.goto(app.url + "/app/settings/company-policies");
  await page.setViewportSize({ width: 375, height: 900 });
  await page.keyboard.press("Tab");
  assert(await page.evaluate(() => document.activeElement !== document.body));
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    true,
  );
  await page.screenshot({
    path: join(evidence, "owner-policy-mobile.png"),
    fullPage: true,
  });
  report.screenshots.push("owner-policy-mobile.png");
  checked(
    "Mobile payroll, Owner policies and Manager attendance fit viewport; keyboard focus works",
  );
  assert.deepEqual(report.pageErrors, []);
  checked("No browser page errors");
  await copyFile(
    join(app.root, "source-manifest.json"),
    join(evidence, "source-manifest.json"),
  );
  report.runtime = app.root;
  report.url = app.url;
} catch (error) {
  report.failure = error.stack;
  throw error;
} finally {
  if (browser) await browser.close();
  if (app) {
    await app.close();
    await copyFile(join(app.root, "next.log"), join(evidence, "next.log"));
  }
  await writeFile(
    join(evidence, "report.json"),
    JSON.stringify(report, null, 2),
  );
}
