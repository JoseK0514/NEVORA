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
    const origin = app.url.replace("127.0.0.1", "localhost");
    for (const engine of ["chromium", "webkit"]) {
      const browser = await runtime[engine].launch({ headless: true });
      try {
        for (const actor of ["QAOWNER", "OA-MANAGER"]) {
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
          const page = await context.newPage();
          page.setDefaultTimeout(20000);
          page.on("pageerror", (error: Error) => errors.push(error.message));
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
            if (actor === "OA-MANAGER") {
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
              checks.push(engine + ": Manager discovery/page/API denied");
            } else {
              await page
                .getByRole("link", { name: "AI manager", exact: true })
                .first()
                .waitFor();
              await page.goto(origin + "/app/ai-manager");
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
            await context.close();
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
            "answer/error/cancel UI only; priority and access use real owned database",
        },
        null,
        2,
      ),
    );
  }
});
