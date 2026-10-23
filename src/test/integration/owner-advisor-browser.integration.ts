import { expect, it } from "vitest";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { createOwnedNextApp } from "./owned-next-app";
import {
  assignOwnedManagerCompanyAccess,
  seedOwnedApp,
  TEST_PASSWORD,
} from "./owned-app-fixture";
import { hashPassword } from "../../lib/auth/password";
import { fictionalProfile } from "../fixtures/shift-changes";
it("checks Owner AI manager against owned PostgreSQL and Next in Chromium and WebKit", async () => {
  const evidence = process.env.NEVORA_OWNER_ADVISOR_BROWSER_EVIDENCE;
  if (!evidence) throw Error("Explicit external evidence directory required");
  await mkdir(evidence, { recursive: true });
  const runtime = createRequire(
    resolve("tools/ci-browser-runtime/package.json"),
  )("playwright");
  const app = await createOwnedNextApp(evidence, { ownerAdvisorEnabled: true });
  const checks: string[] = [],
    external: string[] = [],
    errors: string[] = [];
  let complete = false;
  try {
    await seedOwnedApp(app.database.executor);
    await app.database.executor.query({
      text: "INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('OA-MANAGER','Fictional','Manager','2025550198','MANAGER','loc-1')",
      values: [],
    });
    await app.database.executor.query({
      text: "INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false)",
      values: ["OA-MANAGER", await hashPassword(TEST_PASSWORD)],
    });
    await assignOwnedManagerCompanyAccess(app.database.executor, "OA-MANAGER");
    await app.database.executor.query({
      text: "INSERT INTO employees(id,first_name,last_name,phone,role,primary_location_id) VALUES('OA-EMPLOYEE','Fictional','Employee','2025550197','EMPLOYEE','loc-1')",
      values: [],
    });
    await app.database.executor.query({
      text: "INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false)",
      values: ["OA-EMPLOYEE", await hashPassword(TEST_PASSWORD)],
    });
    await app.database.executor.query({ text: `UPDATE location_coverage_windows SET start_time='08:00',end_time='12:00' WHERE id='qa-loc-1-1';
      INSERT INTO coverage_window_position_requirements(coverage_window_id,position_id,quantity) VALUES('qa-loc-1-1','qa-pos',1);
      INSERT INTO employee_positions(employee_id,position_id) VALUES('OA-EMPLOYEE','qa-pos');
      INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES('OA-EMPLOYEE','loc-1');
      INSERT INTO availability_windows(id,employee_id,day_of_week,start_time,end_time) VALUES('oa-available','OA-EMPLOYEE',1,'00:00','24:00');
      INSERT INTO weekly_availability_submissions(employee_id,week_start,uses_normal_availability) VALUES('OA-EMPLOYEE','2030-10-07',true),('OA-EMPLOYEE','2030-10-14',true),('OA-EMPLOYEE','2030-10-21',true),('OA-EMPLOYEE','2030-10-28',true);`, values: [] });
    await app.database.executor.query({ text: "INSERT INTO employee_scheduling_settings(employee_id,target_weekly_hours,maximum_weekly_hours,operational_rule_profile) VALUES('OA-EMPLOYEE',20,80,$1::jsonb)", values: [JSON.stringify(fictionalProfile())] });
    const origin = app.url.replace("127.0.0.1", "localhost");
    for (const engine of ["chromium", "webkit"]) {
      const browser = await runtime[engine].launch({ headless: true });
      try {
        for (const actor of ["QAOWNER", "OA-MANAGER", "OA-EMPLOYEE"]) {
          const context = await browser.newContext({
            viewport: { width: 1440, height: 1000 },
            serviceWorkers: "block",
          });
          await context.route(
            "**/*",
            async (route: {
              request(): { url(): string };
              abort(): Promise<void>;
              continue(): Promise<void>;
            }) => {
              const url = new URL(route.request().url());
              if (
                ["http:", "https:"].includes(url.protocol) &&
                url.origin !== origin
              ) {
                external.push(url.origin);
                await route.abort();
              } else await route.continue();
            },
          );
          await context.tracing.start({ screenshots: true, snapshots: true });
          const page = await context.newPage();
          let phase = "login";
          const diagnostics: {
            at: string;
            phase: string;
            kind: string;
            url: string;
            message: string;
          }[] = [];
          const record = (kind: string, url: string, message: string) =>
            diagnostics.push({
              at: new Date().toISOString(),
              phase,
              kind,
              url,
              message,
            });
          page.on("console", (message: { type(): string; text(): string }) =>
            record("console:" + message.type(), page.url(), message.text()),
          );
          page.on(
            "requestfailed",
            (request: {
              url(): string;
              failure(): { errorText: string } | null;
            }) =>
              record(
                "requestfailed",
                request.url(),
                request.failure()?.errorText ?? "",
              ),
          );
          page.on(
            "response",
            (response: { url(): string; status(): number }) => {
              if (response.status() >= 400)
                record("http", response.url(), String(response.status()));
            },
          );
          page.on("pageerror", (error: Error) =>
            record("pageerror", page.url(), error.stack ?? error.message),
          );
          page.setDefaultTimeout(20000);
          page.on("pageerror", (error: Error) =>
            errors.push(
              engine + ":" + actor + ":" + page.url() + ":" + error.message,
            ),
          );
          try {
            await page.goto(origin + "/login");
            await page.getByLabel("Employee ID", { exact: true }).fill(actor);
            await page
              .getByLabel("Password", { exact: true })
              .fill(TEST_PASSWORD);
            await page
              .getByRole("button", { name: "Sign in", exact: true })
              .click();
            await page.waitForURL(origin + "/app");
            await page.waitForLoadState("networkidle");
            phase =
              actor !== "QAOWNER"
                ? actor + " denial"
                : "Owner real API scenarios";
            if (actor !== "QAOWNER") {
              expect(
                await page
                  .getByRole("link", { name: "AI manager", exact: true })
                  .count(),
              ).toBe(0);
              await page.goto(origin + "/app/ai-manager");
              expect(await page.getByLabel("Your question").count()).toBe(0);
              const api = await context.request.get(
                origin + "/api/owner/advisor",
                { headers: { "x-nevora-owner-advisor": "1" } },
              );
              expect(api.status()).toBe(403);
              checks.push(engine + ": " + actor + " discovery/page/API denied");
            } else {
              const beforeNotifications = await app.database.executor.query({ text: "SELECT count(*)::int n FROM notifications", values: [] });
              await app.database.executor.query({ text: "DELETE FROM owner_advisor_briefing_reviews WHERE owner_id='QAOWNER'", values: [] });
              await page
                .locator("main")
                .getByRole("link", { name: "AI manager", exact: true })
                .click();
              await page.waitForURL(origin + "/app/ai-manager");
              await page
                .getByText("Your AI manager isn’t connected yet.", {
                  exact: true,
                })
                .waitFor();
              expect(
                await page
                  .getByRole("button", { name: "Ask", exact: true })
                  .isDisabled(),
              ).toBe(true);
              const coverageDate = engine === 'chromium' ? '2030-10-07' : '2030-10-14';
              await page.getByLabel('Coverage date', { exact: true }).fill(coverageDate);
              await page.getByRole('button', { name: 'Prepare coverage options', exact: true }).click();
              const proposals = page.getByRole('region', { name: 'Coverage proposals', exact: true });
              await proposals.getByRole('link', { name: 'Review exact replacement', exact: true }).first().waitFor();
              expect(await app.database.executor.query({ text: "SELECT count(*)::int n FROM shifts WHERE date=$1", values: [coverageDate] })).toEqual([{ n: 0 }]);
              await proposals.getByRole('link', { name: 'Review exact replacement', exact: true }).first().click();
              await page.getByRole('heading', { name: 'Review replacement', exact: true }).waitFor();
              await page.getByText('Draft assignment', { exact: true }).waitFor();
              await page.getByRole('button', { name: 'Save replacement', exact: true }).click();
              await page.waitForURL(/saved=1/);
              expect(await app.database.executor.query({ text: "SELECT count(*)::int n FROM shifts WHERE date=$1", values: [coverageDate] })).toEqual([{ n: 1 }]);
              expect(await app.database.executor.query({ text: "SELECT status FROM schedules WHERE week_start=$1", values: [coverageDate] })).toEqual([{ status: 'DRAFT' }]);
              expect(await app.database.executor.query({ text: "SELECT count(*)::int n FROM notifications", values: [] })).toEqual(beforeNotifications);
              checks.push(engine + ': real proposal preview and canonical draft confirmation; no publication or notifications');
              await page.goto(origin + '/app/ai-manager');
              const publishedDate = engine === 'chromium' ? '2030-10-21' : '2030-10-28';
              await app.database.executor.query({ text: "INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES($1,'loc-1',$2,'PUBLISHED','QAOWNER')", values: ['oa-published-' + engine, publishedDate] });
              await page.getByLabel('Coverage date', { exact: true }).fill(publishedDate);
              await page.getByRole('button', { name: 'Prepare coverage options', exact: true }).focus();
              await page.keyboard.press('Enter');
              await proposals.getByRole('link', { name: 'Review exact replacement', exact: true }).first().click();
              const consent = page.getByRole('checkbox', { name: 'I also approve publishing this replacement and queuing the applicable employee notifications.', exact: true });
              await consent.waitFor();
              expect(await consent.isChecked()).toBe(false);
              await page.getByRole('button', { name: 'Save replacement', exact: true }).click();
              expect(await consent.evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
              expect(await app.database.executor.query({ text: "SELECT count(*)::int n FROM shifts WHERE date=$1", values: [publishedDate] })).toEqual([{ n: 0 }]);
              await consent.focus(); await page.keyboard.press('Space');
              expect(await consent.isChecked()).toBe(true);
              await page.getByRole('button', { name: 'Save replacement', exact: true }).click();
              await page.waitForURL(/saved=1/);
              expect(await app.database.executor.query({ text: "SELECT count(*)::int n FROM schedule_publication_revisions WHERE week_start=$1", values: [publishedDate] })).toEqual([{ n: 1 }]);
              checks.push(engine + ': published replacement requires separate unchecked consent; keyboard confirmation and canonical revision receipt');
              await page.goto(origin + '/app/ai-manager');
              await page.getByLabel('Period start', { exact: true }).fill('2026-10-01');
              await page.getByLabel('Period end', { exact: true }).fill('2026-10-07');
              await page.getByLabel('Review language', { exact: true }).selectOption('es');
              await page.getByRole('button', { name: 'Review attendance and payroll', exact: true }).click();
              const periodReview = page.getByRole('region', { name: 'Excepciones del período', exact: true });
              await periodReview.getByText(/Preparación de nómina sin verificar/).waitFor();
              await periodReview.getByText('Nómina desactivada.', { exact: true }).waitFor();
              for (const width of [320, 390, 1440]) {
                await page.setViewportSize({ width, height: 1000 });
                expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
                for (const label of ['Coverage date', 'Period start', 'Period end', 'Review language']) {
                  const bounds = await page.getByLabel(label, { exact: true }).boundingBox();
                  expect(bounds?.height, `${engine} ${width}px ${label} touch target`).toBeGreaterThanOrEqual(44);
                }
                await page.screenshot({ path: resolve(evidence, engine + '-period-' + width + '.png'), fullPage: true });
              }
              checks.push(engine + ': real Spanish recorded-period review without provider; 320/390/1440px no overflow');
              await page.reload();
              await page.getByText('Your AI manager isn’t connected yet.', { exact: true }).waitFor();
              const attention = page.getByRole("region", { name: "Needs your attention", exact: true });
              await attention.getByRole("heading", { name: "Needs your attention", exact: true }).waitFor();
              const firstIssue = attention.locator("ol > li").first();
              await firstIssue.getByRole("button", { name: "Track this issue", exact: true }).click();
              await page.getByText("Briefing choice saved. Current records were checked again.", { exact: true }).waitFor();
              await firstIssue.getByRole("button", { name: "Later · 1 hour", exact: true }).click();
              await page.getByText("Briefing choice saved. Current records were checked again.", { exact: true }).waitFor();
              await page.reload();
              await attention.getByRole("button", { name: "Restore to briefing", exact: true }).first().click();
              await page.getByText("Briefing choice saved. Current records were checked again.", { exact: true }).waitFor();
              expect(await firstIssue.getByRole("button", { name: "Tracking", exact: true }).count()).toBe(1);
              await firstIssue.getByRole("button", { name: "Not relevant today", exact: true }).click();
              await page.getByText("Briefing choice saved. Current records were checked again.", { exact: true }).waitFor();
              await app.database.executor.query({ text: "UPDATE location_staffing_settings SET minimum_staff_per_shift=2 WHERE location_id='loc-1'", values: [] });
              await attention.getByRole("button", { name: "Check again", exact: true }).click();
              await attention.getByText("Evidence changed. This issue is shown for review again.", { exact: true }).waitFor();
              expect(await attention.locator("ol > li").count()).toBe(2);
              await attention.getByRole("button", { name: "Restore to briefing", exact: true }).first().click();
              await page.getByText("Briefing choice saved. Current records were checked again.", { exact: true }).waitFor();
              await app.database.executor.query({ text: "UPDATE location_staffing_settings SET minimum_staff_per_shift=1 WHERE location_id='loc-1'; DELETE FROM location_coverage_windows WHERE location_id='loc-1'", values: [] });
              await attention.getByRole("button", { name: "Check again", exact: true }).click();
              const setup = attention.locator("ol > li").filter({ has: page.getByRole("heading", { name: "Complete coverage rules", exact: true }) });
              await setup.getByRole("button", { name: "Track this issue", exact: true }).click();
              await page.getByText("Briefing choice saved. Current records were checked again.", { exact: true }).waitFor();
              await app.database.executor.query({ text: "INSERT INTO location_coverage_windows(id,location_id,day_of_week,start_time,end_time) SELECT 'briefing-restored-'||n,'loc-1',n,'00:00','24:00' FROM generate_series(0,6)n", values: [] });
              await attention.getByRole("button", { name: "Check again", exact: true }).click();
              await attention.getByText("Coverage rules are now configured.", { exact: true }).waitFor();
              checks.push(engine + ": actual briefing track/defer/reload/restore, changed-evidence reappearance and canonical setup resolution");
              await page
                .getByRole("button", {
                  name: "What needs my attention today?",
                  exact: true,
                })
                .click();
              expect(
                await page
                  .getByLabel("Your question", { exact: true })
                  .inputValue(),
              ).toBe("What needs my attention today?");
              for (const width of [320, 390, 1440]) {
                await page.setViewportSize({ width, height: 1000 });
                expect(
                  await page.evaluate(
                    () => document.documentElement.scrollWidth <= innerWidth,
                  ),
                ).toBe(true);
                const defer = attention.locator("ol > li").first().getByRole("button", { name: "Later · 1 hour", exact: true });
                await defer.focus();
                await page.keyboard.press(engine === "webkit" && process.platform === "darwin" ? "Alt+Tab" : "Tab");
                expect(await attention.locator("ol > li").first().getByRole("button", { name: "Not relevant today", exact: true }).evaluate((el: HTMLElement) => el === document.activeElement)).toBe(true);
                await page.getByLabel("Your question", { exact: true }).focus();
                expect(
                  await page
                    .getByLabel("Your question", { exact: true })
                    .evaluate(
                      (el: HTMLElement) => el === document.activeElement,
                    ),
                ).toBe(true);
                await page.keyboard.press("Tab");
                expect(
                  await page
                    .getByLabel("Your priorities", { exact: true })
                    .evaluate(
                      (el: HTMLElement) => el === document.activeElement,
                    ),
                ).toBe(true);
                await page.evaluate(() => window.scrollTo(0, 0));
                await page.screenshot({
                  path: resolve(evidence, engine + "-" + width + ".png"),
                  fullPage: true,
                });
                checks.push(
                  engine +
                    ": " +
                    width +
                    "px no horizontal overflow, labeled keyboard fields, disconnected Ask",
                );
              }
              const value = "Fictional priority " + engine;
              await page
                .getByLabel("Your priorities", { exact: true })
                .fill(value);
              await page
                .getByRole("button", { name: "Save priorities", exact: true })
                .click();
              await page
                .getByText("Priorities saved.", { exact: true })
                .waitFor();
              await page.reload();
              await page
                .getByText("Your AI manager isn’t connected yet.", {
                  exact: true,
                })
                .waitFor();
              expect(
                await page
                  .getByLabel("Your priorities", { exact: true })
                  .inputValue(),
              ).toBe(value);
              checks.push(engine + ": real priority save and reload");
              await page
                .getByLabel("Your priorities", { exact: true })
                .fill("Unsaved review");
              await page.waitForTimeout(10000);
              expect(
                await page
                  .getByLabel("Your priorities", { exact: true })
                  .inputValue(),
              ).toBe("Unsaved review");
              checks.push(
                engine + ": draft survives proactive authority refresh",
              );
              const beforeConflict = await context.request.get(
                origin + "/api/owner/advisor",
                { headers: { "x-nevora-owner-advisor": "1" } },
              );
              const conflictSnapshot = await beforeConflict.json();
              const otherSave = await context.request.post(
                origin + "/api/owner/advisor",
                {
                  headers: { "x-nevora-owner-advisor": "1", Origin: origin },
                  data: {
                    op: "save_priorities",
                    requestId: crypto.randomUUID(),
                    expectedRevision: conflictSnapshot.profile.revision,
                    priorities: "Other Owner edit",
                  },
                },
              );
              expect(otherSave.status()).toBe(200);
              await page
                .getByRole("button", { name: "Refresh history", exact: true })
                .click();
              await page
                .getByRole("heading", {
                  name: "Currently saved priorities",
                  exact: true,
                })
                .waitFor();
              await page
                .getByText("Other Owner edit", { exact: true })
                .waitFor();
              expect(
                await page
                  .getByLabel("Your priorities", { exact: true })
                  .inputValue(),
              ).toBe("Unsaved review");
              expect(
                await page
                  .getByRole("button", { name: "Save priorities", exact: true })
                  .isDisabled(),
              ).toBe(true);
              await page
                .getByRole("button", {
                  name: "I’ve reviewed the saved priorities",
                  exact: true,
                })
                .click();
              expect(
                await page
                  .getByRole("button", { name: "Save priorities", exact: true })
                  .isEnabled(),
              ).toBe(true);
              const reviewed = await otherSave.json();
              const laterSave = await context.request.post(
                origin + "/api/owner/advisor",
                {
                  headers: { "x-nevora-owner-advisor": "1", Origin: origin },
                  data: {
                    op: "save_priorities",
                    requestId: crypto.randomUUID(),
                    expectedRevision: reviewed.profile.revision,
                    priorities: "Changed after review",
                  },
                },
              );
              expect(laterSave.status()).toBe(200);
              await page
                .getByRole("button", { name: "Refresh history", exact: true })
                .click();
              await page
                .getByText("Changed after review", { exact: true })
                .waitFor();
              expect(
                await page
                  .getByLabel("Your priorities", { exact: true })
                  .inputValue(),
              ).toBe("Unsaved review");
              expect(
                await page
                  .getByRole("button", { name: "Save priorities", exact: true })
                  .isDisabled(),
              ).toBe(true);
              await page.screenshot({
                path: resolve(evidence, engine + "-priority-review.png"),
                fullPage: true,
              });
              await page
                .getByRole("button", {
                  name: "I’ve reviewed the saved priorities",
                  exact: true,
                })
                .click();
              await page
                .getByRole("button", { name: "Save priorities", exact: true })
                .click();
              await page
                .getByText("Priorities saved.", { exact: true })
                .waitFor();
              checks.push(
                engine +
                  ": real pre-save revision drift and post-review drift each block Save and preserve draft until explicit review",
              );
              await page.evaluate(() =>
                window.dispatchEvent(new Event("blur")),
              );
              await page
                .getByText(
                  "Current information is hidden until access is refreshed.",
                  { exact: true },
                )
                .waitFor();
              expect(
                await page
                  .getByLabel("Your priorities", { exact: true })
                  .count(),
              ).toBe(0);
              await page.evaluate(() =>
                window.dispatchEvent(new Event("focus")),
              );
              await page
                .getByText("Your AI manager isn’t connected yet.", {
                  exact: true,
                })
                .waitFor();
              checks.push(
                engine +
                  ": blur retires private data; focus performs fresh read",
              );
              const api = await context.request.get(
                origin + "/api/owner/advisor",
                { headers: { "x-nevora-owner-advisor": "1" } },
              );
              expect(api.status()).toBe(200);
              const saved = await api.json();
              expect(saved.connection).toBe("unavailable");
              phase = "Owner UI fixtures";
              // Deliberately substituted UI-only responses; no provider or inference involved.
              let fixtureMode = "answer";
              let posts = 0;
              await context.route(
                "**/api/owner/advisor",
                async (route: {
                  request(): { method(): string };
                  fulfill(options: unknown): Promise<void>;
                  abort(): Promise<void>;
                }) => {
                  const stamp = {
                    authority: saved.authority,
                    observedAt: new Date().toISOString(),
                    validForMs: 15000,
                  };
                  if (route.request().method() === "GET")
                    return route.fulfill({
                      status: 200,
                      json: { ...saved, ...stamp, connection: "available" },
                    });
                  posts++;
                  if (fixtureMode === "cancel") {
                    await new Promise((r) => setTimeout(r, 1500));
                    return route.abort();
                  }
                  if (fixtureMode === "error")
                    return route.fulfill({
                      status: 429,
                      json: { state: "error", code: "daily_limit" },
                    });
                  return route.fulfill({
                    status: 200,
                    json: {
                      state: "answered",
                      ...stamp,
                      answer: {
                        text: "Because coverage is missing. <script>bad</script> https://evil.invalid",
                        sources: [
                          {
                            label: "Published schedule",
                            href: "/app/schedule?week=2026-10-19",
                            observedAt: stamp.observedAt,
                          },
                        ],
                      },
                    },
                  });
                },
              );
              await page
                .getByRole("button", { name: "Refresh history", exact: true })
                .click();
              await page
                .getByLabel("Your question", { exact: true })
                .fill("Fixture question");
              await page
                .getByRole("button", { name: "Ask", exact: true })
                .click();
              await page
                .getByRole("article", { name: "Latest answer" })
                .waitFor();
              expect(await page.locator(".oa-answer script").count()).toBe(0);
              expect(
                await page.locator(".oa-answer a").getAttribute("href"),
              ).toBe("/app/schedule?week=2026-10-19");
              await page.screenshot({
                path: resolve(evidence, engine + "-fixture-answer.png"),
                fullPage: true,
              });
              fixtureMode = "error";
              await page
                .getByLabel("Your question", { exact: true })
                .fill("Fixture limit");
              await page
                .getByRole("button", { name: "Ask", exact: true })
                .click();
              await page
                .getByText(
                  "Today’s investigation limit has been reached. Try again tomorrow.",
                  { exact: true },
                )
                .waitFor();
              fixtureMode = "cancel";
              await page
                .getByRole("button", { name: "Ask", exact: true })
                .click();
              await page
                .getByRole("button", { name: "Cancel", exact: true })
                .click();
              await page.getByText(/The result is unknown/).waitFor();
              expect(posts).toBe(3);
              checks.push(
                engine +
                  ": UI FIXTURE ONLY answer escaping/sources, daily limit, cancel and no automatic POST retry",
              );
            }
          } catch (error) {
            await page.screenshot({
              path: resolve(evidence, engine + "-" + actor + "-failure.png"),
              fullPage: true,
            });
            throw error;
          } finally {
            phase = "teardown";
            await page.evaluate(() =>
              window.dispatchEvent(new Event("pagehide")),
            );
            await page.waitForLoadState("networkidle");
            await context.tracing.stop({
              path: resolve(evidence, engine + "-" + actor + "-trace.zip"),
            });
            await context.close();
            await writeFile(
              resolve(evidence, engine + "-" + actor + "-diagnostics.json"),
              JSON.stringify(diagnostics, null, 2),
            );
          }
        }
      } finally {
        await browser.close();
      }
    }
    expect(external).toEqual([]);
    expect(errors).toEqual([]);
    complete = true;
  } finally {
    await app.close();
    await writeFile(
      resolve(evidence, "report.json"),
      JSON.stringify(
        {
          complete,
          checks,
          external,
          errors,
          source: app.sourceHashes,
          providerConfigured: false,
          fixtureScope:
            "answer/error/cancel UI interception only; workflows, priority and access use real owned database; no provider configured",
        },
        null,
        2,
      ),
    );
  }
});
