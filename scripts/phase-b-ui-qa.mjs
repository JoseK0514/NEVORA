import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { isAbsolute, join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createOwnedNextApp } from "../src/test/integration/owned-next-app.ts";
import { seedOwnedApp, TEST_PASSWORD } from "../src/test/integration/owned-app-fixture.ts";
import { hashPassword } from "../src/lib/auth/password.ts";

const WIDTHS = [320, 375, 390, 430, 768, 1024, 1440];
const ENGINES = ["chromium", "webkit"];
const CLOCKER_VIEWPORTS = [
  { width: 1024, height: 768, key: "1024x768" },
  { width: 768, height: 1024, key: "768x1024" },
];

const SURFACES = [
  { key: "login", role: "PUBLIC", path: "/login", group: "public" },
  { key: "activate", role: "PUBLIC", path: "/activate", group: "public" },
  { key: "owner-home", role: "OWNER", path: "/app", group: "dashboard" },
  { key: "owner-schedule", role: "OWNER", path: "/app/schedule", group: "schedule" },
  { key: "owner-availability", role: "OWNER", path: "/app/availability", group: "availability" },
  { key: "owner-requests", role: "OWNER", path: "/app/requests", group: "requests" },
  { key: "owner-exchange", role: "OWNER", path: "/app/exchange", group: "exchange" },
  { key: "owner-employees", role: "OWNER", path: "/app/employees", group: "employees" },
  { key: "owner-employee-profile", role: "OWNER", path: "/app/employees/QA-EMPLOYEE", group: "employees" },
  { key: "owner-templates", role: "OWNER", path: "/app/schedule/templates", group: "templates" },
  { key: "owner-scheduling-rules", role: "OWNER", path: "/app/schedule/settings", group: "settings" },
  { key: "owner-settings", role: "OWNER", path: "/app/settings", group: "settings" },
  { key: "owner-workspace", role: "OWNER", path: "/app/settings/workspace", group: "settings" },
  { key: "owner-locations", role: "OWNER", path: "/app/settings/locations", group: "settings" },
  { key: "owner-positions", role: "OWNER", path: "/app/settings/positions", group: "settings" },
  { key: "manager-home", role: "MANAGER", path: "/app", group: "dashboard" },
  { key: "manager-schedule", role: "MANAGER", path: "/app/schedule", group: "schedule" },
  { key: "manager-availability", role: "MANAGER", path: "/app/availability", group: "availability" },
  { key: "manager-requests", role: "MANAGER", path: "/app/requests", group: "requests" },
  { key: "manager-exchange", role: "MANAGER", path: "/app/exchange", group: "exchange" },
  { key: "manager-employees", role: "MANAGER", path: "/app/employees", group: "employees" },
  { key: "manager-employee-profile", role: "MANAGER", path: "/app/employees/QA-EMPLOYEE", group: "employees" },
  { key: "manager-templates", role: "MANAGER", path: "/app/schedule/templates", group: "templates" },
  { key: "manager-scheduling-rules", role: "MANAGER", path: "/app/schedule/settings", group: "settings" },
  { key: "employee-home", role: "EMPLOYEE", path: "/app", group: "employee" },
  { key: "employee-schedule", role: "EMPLOYEE", path: "/app/schedule", group: "employee" },
  { key: "employee-my-time", role: "EMPLOYEE", path: "/app/my-time", group: "employee" },
  { key: "employee-availability", role: "EMPLOYEE", path: "/app/availability", group: "employee" },
  { key: "employee-requests", role: "EMPLOYEE", path: "/app/requests", group: "employee" },
  { key: "employee-exchange", role: "EMPLOYEE", path: "/app/exchange", group: "employee" },
];

const args = process.argv.slice(2);
const mode = args.includes("--final") ? "final" : "baseline";
const surfaceIndex = args.indexOf("--surface");
const surfaceFilter = surfaceIndex >= 0 ? args[surfaceIndex + 1] : null;
if (surfaceIndex >= 0 && !surfaceFilter) throw new Error("--surface requires a group or key");

if (args.includes("--list")) {
  console.log(JSON.stringify({
    widths: WIDTHS,
    engines: ENGINES,
    clockerViewports: CLOCKER_VIEWPORTS,
    surfaces: SURFACES,
  }, null, 2));
  process.exit(0);
}

const root = resolve(process.cwd());
const evidence = resolve(process.env.PHASE_B_EVIDENCE_DIR ?? join(homedir(), ".codex", "visualizations", "nevora-phase-b"));
assert(isAbsolute(evidence) && relative(root, evidence).startsWith(".."), "Evidence directory must be outside repository");
const runtimeRoot = resolve(process.env.PLAYWRIGHT_RUNTIME_ROOT ?? join(homedir(), ".cache", "codex-runtimes", "codex-primary-runtime", "dependencies", "node", "node_modules"));
const requireRuntime = createRequire(join(runtimeRoot, "package.json"));
const playwrightModule = await import(pathToFileURL(requireRuntime.resolve("playwright")).href);
const playwright = playwrightModule.default ?? playwrightModule;
for (const engine of ENGINES) assert.equal(typeof playwright[engine]?.launch, "function", `Playwright ${engine} unavailable`);

const phaseDir = join(evidence, mode);
await mkdir(phaseDir, { recursive: true });
await mkdir(join(phaseDir, "screenshots"), { recursive: true });

const report = {
  generatedAt: new Date().toISOString(),
  mode,
  source: process.env.GIT_COMMIT ?? null,
  widths: WIDTHS,
  engines: ENGINES,
  clockerViewports: CLOCKER_VIEWPORTS,
  checks: [],
  findings: [],
  runnerErrors: [],
  screenshots: [],
  metrics: [],
  limitations: [
    "Uses an owned disposable PostgreSQL database and scratch Next runtime, not production Neon.",
    "Uses local Chromium/WebKit runtimes, not physical iPhone/iPad/Safari hardware.",
    "Geometry/focus automation does not replace a real screen-reader audit.",
  ],
};

let app;
const browsers = [];
const contexts = [];

function finding({ engine, surface, width, category, severity, selector, evidence: detail }) {
  const record = { engine, surface: surface.key, route: surface.path, role: surface.role, width, category, severity, selector, evidence: detail };
  report.findings.push(record);
  return record;
}

async function q(text, values = []) {
  return app.database.executor.query({ text, values });
}

async function seedAuditData() {
  await seedOwnedApp(app.database.executor);
  const passwordHash = await hashPassword(TEST_PASSWORD);
  const employees = [
    ["QA-MANAGER", "Morgan", "Manager With An Intentionally Long Operational Name", "MANAGER"],
    ["QA-EMPLOYEE", "Alexandra", "Employee With An Intentionally Long Customer-Facing Name", "EMPLOYEE"],
  ];
  for (const [id, first, last, role] of employees) {
    await q(
      "INSERT INTO employees(id,first_name,last_name,phone,email,role,primary_location_id) VALUES($1,$2,$3,$4,$5,$6,'loc-1')",
      [id, first, last, "7875550101", `${id.toLowerCase()}@example.invalid`, role],
    );
    await q("INSERT INTO employee_credentials(employee_id,password_hash,must_change_password) VALUES($1,$2,false)", [id, passwordHash]);
    await q("INSERT INTO employee_location_eligibility VALUES($1,'loc-1'),($1,'loc-2')", [id]);
    await q("INSERT INTO employee_positions(employee_id,position_id) VALUES($1,'qa-pos')", [id]);
  }
  for (let index = 1; index <= 18; index++) {
    const id = `qa-location-${index}`;
    const key = `qa-location-${index}`;
    const name = `Fictional Regional Operations Center ${String(index).padStart(2, "0")} With A Long Readable Location Name`;
    const shortName = `Regional Center ${String(index).padStart(2, "0")}`;
    await q(
      "INSERT INTO locations(id,workspace_id,clocker_key,name,short_name,active) VALUES($1,'workspace-fuel',$2,$3,$4,true)",
      [id, key, name, shortName],
    );
  }
}

async function configureContext(context) {
  await context.route("**/*", route => {
    const url = new URL(route.request().url());
    if (["http:", "https:"].includes(url.protocol) && url.origin !== app.url) return route.abort("blockedbyclient");
    return route.continue();
  });
  await context.addInitScript(() => {
    window.__phaseBMetrics = { layoutShift: 0, longTasks: [] };
    try {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__phaseBMetrics.layoutShift += entry.value || 0;
        }
      }).observe({ type: "layout-shift", buffered: true });
    } catch {}
    try {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) window.__phaseBMetrics.longTasks.push(Math.round(entry.duration));
      }).observe({ type: "longtask", buffered: true });
    } catch {}
  });
}

async function goto(page, path) {
  const response = await page.goto(app.url + path, { waitUntil: "domcontentloaded" });
  assert(response && response.status() < 400, `Unexpected ${response?.status()} for ${path}`);
  await page.waitForLoadState("networkidle");
  assert((await page.locator("body").innerText()).trim().length > 20, `Blank surface ${path}`);
}

async function login(context, employeeId) {
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  await goto(page, "/login");
  await page.getByLabel("Employee ID", { exact: true }).fill(employeeId);
  await page.getByLabel("Password", { exact: true }).fill(TEST_PASSWORD);
  await Promise.all([
    page.waitForURL(url => url.pathname === "/app"),
    page.getByRole("button", { name: "Sign In", exact: true }).click(),
  ]);
  await page.waitForLoadState("networkidle");
  assert((await context.cookies()).some(cookie => cookie.name === "fuel_session"), `No session for ${employeeId}`);
  await page.close();
}

async function representativeFocus(page) {
  const target = page.locator("button:visible, summary:visible, a.button:visible, a.mobile-nav-link:visible, input:visible, select:visible").first();
  if (!await target.count()) return null;
  await target.focus();
  return target.evaluate(element => {
    const style = getComputedStyle(element);
    return {
      tag: element.tagName.toLowerCase(),
      className: element.getAttribute("class") ?? "",
      outlineStyle: style.outlineStyle,
      outlineWidth: style.outlineWidth,
      outlineColor: style.outlineColor,
      boxShadow: style.boxShadow,
    };
  });
}

async function inspectGeometry(page) {
  return page.evaluate(() => {
    const visible = element => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    const describe = element => {
      const id = element.id ? `#${element.id}` : "";
      const classes = [...element.classList].slice(0, 3).map(value => `.${value}`).join("");
      return `${element.tagName.toLowerCase()}${id}${classes}`;
    };
    const width = document.documentElement.clientWidth;
    const actions = [...document.querySelectorAll(
      "button, summary, input[type=submit], input[type=button], a.button, a.mobile-nav-link, a[class*='-action'], a.employee-profile-view, [popovertarget]",
    )].filter(visible).map(element => {
      const rect = element.getBoundingClientRect();
      return { selector: describe(element), width: rect.width, height: rect.height, left: rect.left, right: rect.right };
    });
    const clippedText = [...document.querySelectorAll(
      "h1,h2,h3,label,.page-description,.employee-profile-copy strong,.nav-link span,.button,.mobile-nav-link,.status-pill",
    )].filter(visible).flatMap(element => {
      const style = getComputedStyle(element);
      const clipped = element.scrollWidth > element.clientWidth + 2 &&
        ["hidden", "clip"].includes(style.overflowX) &&
        style.textOverflow !== "ellipsis";
      return clipped ? [{ selector: describe(element), scrollWidth: element.scrollWidth, clientWidth: element.clientWidth }] : [];
    });
    return {
      viewportWidth: width,
      documentWidth: document.documentElement.scrollWidth,
      actions,
      clippedText,
    };
  });
}

async function inspectBottomClearance(page) {
  const nav = page.locator(".mobile-nav:visible");
  if (!await nav.count()) return null;
  const candidate = page.locator(".page-frame button:visible, .page-frame a.button:visible, .page-frame input:visible, .page-frame select:visible").last();
  if (!await candidate.count()) return null;
  await candidate.focus();
  // Verify the page's actual maximum-scroll clearance. scrollIntoView({block:"end"})
  // can deliberately place a control behind a fixed bottom nav even when the page
  // has sufficient bottom padding, producing a false positive.
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await page.waitForTimeout(50);
  return page.evaluate(() => {
    const nav = document.querySelector(".mobile-nav");
    const controls = [...document.querySelectorAll(".page-frame button,.page-frame a.button,.page-frame input,.page-frame select")]
      .filter(element => {
        const r = element.getBoundingClientRect();
        const s = getComputedStyle(element);
        return s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 0;
      });
    const last = controls.at(-1);
    if (!nav || !last) return null;
    const n = nav.getBoundingClientRect();
    const c = last.getBoundingClientRect();
    return { navTop: n.top, controlBottom: c.bottom, overlap: c.bottom > n.top - 2 };
  });
}

async function inspectMenus(page) {
  const results = [];
  const triggers = page.locator("button[popovertarget]:visible");
  for (let index = 0; index < await triggers.count(); index++) {
    const trigger = triggers.nth(index);
    const targetId = await trigger.getAttribute("popovertarget");
    if (!targetId) continue;
    const start = performance.now();
    await trigger.click();
    const popover = page.locator(`[id=${JSON.stringify(targetId)}]`);
    await popover.waitFor({ state: "visible" });
    const elapsed = Math.round(performance.now() - start);
    const box = await popover.boundingBox();
    results.push({ selector: `#${targetId}`, elapsed, box });
    await page.keyboard.press("Escape");
  }
  const details = page.locator("details.schedule-more-menu:visible");
  if (await details.count()) {
    const summary = details.first().locator("summary");
    const start = performance.now();
    await summary.click();
    const popover = details.first().locator(".schedule-more-popover");
    await popover.waitFor({ state: "visible" });
    results.push({ selector: ".schedule-more-popover", elapsed: Math.round(performance.now() - start), box: await popover.boundingBox() });
    await summary.click();
  }
  return results;
}

async function auditSurface({ browserName, context, surface, viewport }) {
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  const runtime = [];
  page.on("pageerror", error => runtime.push({ type: "pageerror", message: error.message }));
  page.on("console", message => { if (message.type() === "error") runtime.push({ type: "console", message: message.text() }); });
  try {
    await goto(page, surface.path);
    if (surface.role !== "PUBLIC") assert.notEqual(new URL(page.url()).pathname, "/login", `${surface.key} redirected to login`);
    const geometry = await inspectGeometry(page);
    if (geometry.documentWidth > geometry.viewportWidth + 2) {
      finding({ engine: browserName, surface, width: viewport.width, category: "Responsive", severity: "P1", selector: "html", evidence: `document width ${geometry.documentWidth}px exceeds viewport ${geometry.viewportWidth}px` });
    }
    for (const action of geometry.actions) {
      if (action.height < 43.5) {
        finding({ engine: browserName, surface, width: viewport.width, category: "Accessibility", severity: "P1", selector: action.selector, evidence: `interactive height ${action.height.toFixed(1)}px < 44px` });
      }
      if (action.left < -1 || action.right > viewport.width + 1) {
        finding({ engine: browserName, surface, width: viewport.width, category: "Responsive", severity: "P1", selector: action.selector, evidence: `interactive bounds ${action.left.toFixed(1)}..${action.right.toFixed(1)} outside viewport` });
      }
    }
    for (const item of geometry.clippedText) {
      finding({ engine: browserName, surface, width: viewport.width, category: "Responsive", severity: "P2", selector: item.selector, evidence: `text scroll width ${item.scrollWidth}px exceeds ${item.clientWidth}px and is clipped` });
    }
    const focus = await representativeFocus(page);
    if (focus && focus.outlineStyle === "none" && focus.outlineWidth === "0px" && (focus.boxShadow === "none" || !focus.boxShadow)) {
      finding({ engine: browserName, surface, width: viewport.width, category: "Accessibility", severity: "P1", selector: focus.className || focus.tag, evidence: "representative interactive control has no visible outline or box-shadow after keyboard focus" });
    }
    // Exercise anchored menus while their triggers remain in the initial viewport.
    // Bottom-clearance verification intentionally scrolls to the page maximum.
    const menus = await inspectMenus(page);
    for (const menu of menus) {
      if (!menu.box) continue;
      if (menu.box.x < -1 || menu.box.x + menu.box.width > viewport.width + 1 || menu.box.y < -1 || menu.box.y + menu.box.height > viewport.height + 1) {
        finding({ engine: browserName, surface, width: viewport.width, category: "Responsive", severity: "P1", selector: menu.selector, evidence: `open menu bounds ${JSON.stringify(menu.box)} exceed viewport ${viewport.width}x${viewport.height}` });
      }
      if (menu.elapsed > 250) {
        finding({ engine: browserName, surface, width: viewport.width, category: "Performance", severity: "P2", selector: menu.selector, evidence: `local menu required ${menu.elapsed}ms to become visible in owned runtime` });
      }
    }
    const clearance = await inspectBottomClearance(page);
    if (clearance?.overlap) {
      finding({ engine: browserName, surface, width: viewport.width, category: "Responsive", severity: "P1", selector: ".mobile-nav", evidence: `final page control bottom ${clearance.controlBottom.toFixed(1)}px overlaps mobile navigation starting at ${clearance.navTop.toFixed(1)}px` });
    }
    for (const issue of runtime) {
      finding({ engine: browserName, surface, width: viewport.width, category: "Implementation Integrity", severity: "P1", selector: issue.type, evidence: issue.message });
    }
    const metrics = await page.evaluate(() => window.__phaseBMetrics ?? null);
    report.metrics.push({ engine: browserName, surface: surface.key, width: viewport.width, metrics });
    const file = join(phaseDir, "screenshots", `${browserName}-${surface.key}-${viewport.width}x${viewport.height}.png`);
    await page.screenshot({ path: file, fullPage: true });
    report.screenshots.push(file);
    report.checks.push({ engine: browserName, surface: surface.key, width: viewport.width, status: "PASS" });
  } catch (error) {
    report.runnerErrors.push({ engine: browserName, surface: surface.key, width: viewport.width, error: String(error.stack ?? error) });
  } finally {
    await page.close().catch(() => {});
  }
}

function surfacesFor(group) {
  if (!group) return SURFACES;
  return SURFACES.filter(surface => surface.group === group || surface.key === group);
}

function roleEmployeeId(role) {
  if (role === "OWNER") return "QAOWNER";
  if (role === "MANAGER") return "QA-MANAGER";
  if (role === "EMPLOYEE") return "QA-EMPLOYEE";
  return null;
}

function markdownSummary() {
  const bySeverity = Object.fromEntries(["P0", "P1", "P2", "P3"].map(level => [level, report.findings.filter(item => item.severity === level).length]));
  const lines = [
    "# NEVORA Phase B — UI Baseline Audit",
    "",
    `Generated: ${report.generatedAt}`,
    `Mode: ${report.mode}`,
    "",
    "## Summary",
    "",
    `- Runner errors: ${report.runnerErrors.length}`,
    `- Findings: ${report.findings.length} (P0 ${bySeverity.P0}, P1 ${bySeverity.P1}, P2 ${bySeverity.P2}, P3 ${bySeverity.P3})`,
    `- Checks completed: ${report.checks.length}`,
    "",
    "## Findings",
    "",
  ];
  for (const item of report.findings) {
    lines.push(`- **${item.severity} · ${item.category}** — ${item.surface} · ${item.engine} · ${item.width}px · ${item.selector}: ${item.evidence}`);
  }
  if (!report.findings.length) lines.push("- No findings recorded by the automated baseline.");
  lines.push("", "## Runner errors", "");
  for (const item of report.runnerErrors) lines.push(`- ${item.surface} · ${item.engine} · ${item.width}px: ${item.error.split("\n")[0]}`);
  if (!report.runnerErrors.length) lines.push("- None.");
  lines.push("", "## Limits", "", ...report.limitations.map(value => `- ${value}`), "");
  return lines.join("\n");
}

try {
  app = await createOwnedNextApp(phaseDir);
  report.source = createHash("sha256").update(JSON.stringify(app.sourceHashes)).digest("hex");
  await seedAuditData();
  const selected = surfacesFor(surfaceFilter);
  assert(selected.length, `No Phase B surface matches ${surfaceFilter}`);
  for (const browserName of ENGINES) {
    const browser = await playwright[browserName].launch({ headless: true });
    browsers.push(browser);
    for (const width of WIDTHS) {
      const viewport = { width, height: width <= 430 ? 844 : width === 768 ? 1024 : 900 };
      for (const role of ["PUBLIC", "OWNER", "MANAGER", "EMPLOYEE"]) {
        const roleSurfaces = selected.filter(item => item.role === role && item.key !== "clocker");
        if (!roleSurfaces.length) continue;
        const context = await browser.newContext({ viewport, serviceWorkers: "block" });
        contexts.push(context);
        await configureContext(context);
        const employeeId = roleEmployeeId(role);
        if (employeeId) await login(context, employeeId);
        for (const surface of roleSurfaces) {
          await auditSurface({ browserName, context, surface, viewport });
        }
        await context.close();
      }
    }
    if (!surfaceFilter || surfaceFilter === "public" || surfaceFilter === "clocker") {
      for (const viewport of CLOCKER_VIEWPORTS) {
        const context = await browser.newContext({ viewport, serviceWorkers: "block" });
        contexts.push(context);
        await configureContext(context);
        const clocker = { key: "clocker", role: "PUBLIC", path: "/clocker/2", group: "clocker" };
        await auditSurface({ browserName, context, surface: clocker, viewport });
        await context.close();
      }
    }
    await browser.close();
  }
} catch (error) {
  report.runnerErrors.push({ engine: "harness", surface: "setup", width: 0, error: String(error.stack ?? error) });
} finally {
  for (const context of contexts) await context.close().catch(() => {});
  for (const browser of browsers) await browser.close().catch(() => {});
  if (app) await app.close().catch(error => report.runnerErrors.push({ engine: "harness", surface: "teardown", width: 0, error: String(error.stack ?? error) }));
  report.finishedAt = new Date().toISOString();
  const docsDir = join(root, "docs", "execution");
  await mkdir(docsDir, { recursive: true });
  await writeFile(join(phaseDir, "phase-b-ui-baseline.json"), JSON.stringify(report, null, 2));
  await writeFile(join(docsDir, "phase-b-ui-baseline.json"), JSON.stringify(report, null, 2));
  await writeFile(join(docsDir, "phase-b-ui-baseline.md"), markdownSummary());
  console.log(JSON.stringify({
    checks: report.checks.length,
    findings: report.findings.length,
    runnerErrors: report.runnerErrors.length,
    evidence: phaseDir,
  }, null, 2));
  if (report.runnerErrors.length) process.exitCode = 1;
}
