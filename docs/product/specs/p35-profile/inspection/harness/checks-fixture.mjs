// Profile session copy of .claude/parallel/scripts/checks.mjs: adds --fixture <name>, which serves the CODEX.md
// contract read from docs/product/specs/p35-profile/fixtures (Owner always gets owner.json). Otherwise unchanged.
// Automated repeat checks for one session's preview. Run after every fix, before calling inspectors.
// Usage:
//   PREVIEW_OUT=<your preview folder> node checks.mjs --routes /app,/app/schedule --accounts AUDIT-E,AUDIT-M \
//     [--widths 320,360,390,430,844x390,768,1024,1440] [--text 100,125,150,200] [--browsers chromium,firefox,webkit] [--axe]
// It signs in with the saved states from login.mjs ($PREVIEW_OUT/state/<account>.json).
// Text size is the root font size (text zoom), the way the app's rem-based kit scales.
// For each page it reports:
//   - sideways overflow
//   - text under the kit floor (15px on phones, 14px on desktop), except tab labels (13) and number badges (12)
//   - touch targets under 44px on phones, under 24px on desktop
//   - layout shift while loading (CLS)
//   - console and page errors
//   - with --axe, axe-core violations
// Read only: it never clicks anything that saves. Results: $PREVIEW_OUT/checks/<timestamp>.json, plus a summary printed here.
import { chromium, firefox, webkit } from "/Users/josek0514/.npm/_npx/e41f203b7505f1fb/node_modules/playwright/index.mjs";
import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const arg = (name, fallback) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : fallback; };
const out = process.env.PREVIEW_OUT; if (!out) throw Error("Set PREVIEW_OUT");
const runs = (await readdir(out)).filter(n => n.startsWith("evidence-")).sort();
const { url } = JSON.parse(await readFile(join(out, runs.at(-1), "access.json"), "utf8"));
const routes = arg("routes", "/app").split(",");
const accounts = arg("accounts", "AUDIT-E").split(",");
const widths = arg("widths", "320,360,390,430,844x390,768,1024,1440").split(",");
const texts = arg("text", "100,125,150,200").split(",").map(Number);
const engines = { chromium, firefox, webkit };
const browsers = arg("browsers", "chromium").split(",");
const axe = process.argv.includes("--axe") ? await readFile("/Users/josek0514/Desktop/NEVORA-UI-READINESS/node_modules/axe-core/axe.min.js", "utf8") : null;

const results = [];
for (const engine of browsers) {
  const browser = await engines[engine].launch();
  for (const account of accounts) for (const size of widths) for (const text of texts) {
    const [w, h] = size.includes("x") ? size.split("x").map(Number) : [Number(size), Number(size) < 600 ? 844 : 900];
    const phone = w < 600 || h < 431;
    const context = await browser.newContext({ storageState: join(out, "state", `${account}.json`), viewport: { width: w, height: h }, ...(engine === "firefox" ? {} : { isMobile: phone }), hasTouch: phone, serviceWorkers: "block" });
    { const fx = arg("fixture", null); if (fx) { const body = await readFile(new URL(`../../fixtures/${account === "QAOWNER" ? "owner" : fx}.json`, import.meta.url), "utf8"); await context.route("**/api/management/profile", r => r.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ...JSON.parse(body), observedAt: new Date().toISOString() }) })); } }
    await context.addInitScript(() => { window.__cls = 0; try { new PerformanceObserver(l => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: "layout-shift", buffered: true }); } catch {} });
    // Text size is applied after the page has hydrated (setting it earlier makes React report a hydration mismatch).
    for (const route of routes) {
      const page = await context.newPage(); const errors = [];
      page.on("pageerror", e => errors.push("page: " + e.message.slice(0, 200)));
      page.on("console", m => { if (m.type() === "error") errors.push("console: " + m.text().slice(0, 200)); });
      let status = 0;
      try { const response = await page.goto(url + route, { waitUntil: "load", timeout: 30000 }); status = response?.status() ?? 0; await page.waitForTimeout(2500);
        if (text !== 100) { await page.evaluate(t => { document.documentElement.style.fontSize = t + "%"; }, text); await page.waitForTimeout(600); } }
      catch (e) { errors.push("load: " + e.message.slice(0, 200)); }
      const found = await page.evaluate(phone => {
        const visible = el => { const r = el.getBoundingClientRect(), cs = getComputedStyle(el); return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none" && !el.closest("[aria-hidden='true'], .nv-sr, .sr-only, [hidden]"); };
        const name = el => (el.tagName.toLowerCase() + "." + String(el.className?.baseVal ?? el.className).trim().split(/\s+/).slice(0, 2).join(".")).slice(0, 70) + ` «${(el.textContent || el.getAttribute("aria-label") || "").trim().slice(0, 30)}»`;
        const overflow = document.documentElement.scrollWidth > innerWidth + 1 ? [...document.querySelectorAll("body *")].filter(e => e.getBoundingClientRect().right > innerWidth + 1 && visible(e)).slice(0, 5).map(name) : [];
        const smallText = [];
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const el = n.parentElement; if (!el || !n.textContent.trim() || !visible(el)) continue;
          const size = parseFloat(getComputedStyle(el).fontSize);
          if (el.closest('[class*="brand"]')) continue; // the NEVORA wordmark lockup is artwork, not text
          // The kit's floor: 15px on phones, 14px on desktop (callout 14/20); tab labels 13, number badges 12.
          const allowed = el.closest(".mobile-nav, .mobile-nav-link") ? 13 : /badge|count/i.test(String(el.className)) && /^\d+$/.test(n.textContent.trim()) ? 12 : phone ? 15 : 14;
          if (size < allowed - 0.01) smallText.push(`${name(el)} ${size}px`);
        }
        const targets = [...document.querySelectorAll("a[href], button, summary, input:not([type=hidden]), select, textarea, [role=button], [role=tab]")].filter(visible).filter(el => {
          if (el.matches("a") && el.closest("p, li") && !el.closest("nav, [role=list], .nv-rows")) return false; // inline text links
          if (el.matches("input[type=checkbox], input[type=radio]") && el.closest("label")) { const l = el.closest("label").getBoundingClientRect(); if (l.height >= (phone ? 43.5 : 23.5)) return false; } // the label is the target
          const r = el.getBoundingClientRect(), min = phone ? 43.5 : 23.5; // 44px on touch screens, 24px (WCAG 2.5.8) with a mouse
          return r.width < min || r.height < min;
        }).map(el => { const r = el.getBoundingClientRect(); return `${name(el)} ${Math.round(r.width)}x${Math.round(r.height)}`; });
        return { overflow, smallText: [...new Set(smallText)].slice(0, 20), targets: [...new Set(targets)].slice(0, 20), cls: Math.round(window.__cls * 10000) / 10000 };
      }, phone).catch(e => ({ error: e.message }));
      let violations = [];
      if (axe) { await page.addScriptTag({ content: axe }); violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] })).violations.map(v => `${v.id} (${v.nodes.length})`)); }
      const record = { engine, account, size, text, route, status, ...found, errors, axe: violations };
      record.ok = status < 400 && !found.error && !found.overflow?.length && !found.smallText?.length && !found.targets?.length && (text !== 100 || found.cls <= 0.01) && !errors.length && !violations.length;
      results.push(record);
      if (!record.ok) console.log(`FAIL ${engine} ${account} ${size} ${text}% ${route}` + (found.overflow?.length ? ` overflow=${found.overflow.join("; ")}` : "") + (found.smallText?.length ? ` small=${found.smallText.slice(0, 4).join("; ")}` : "") + (found.targets?.length ? ` targets=${found.targets.slice(0, 4).join("; ")}` : "") + (text === 100 && found.cls > 0.01 ? ` cls=${found.cls}` : "") + (errors.length ? ` errors=${errors.slice(0, 2).join("; ")}` : "") + (violations.length ? ` axe=${violations.join(",")}` : "") + (status >= 400 ? ` status=${status}` : ""));
      await page.close();
    }
    await context.close();
  }
  await browser.close();
}
await mkdir(join(out, "checks"), { recursive: true });
const file = join(out, "checks", (arg("fixture", null) ? "fixture-" : "") + new Date().toISOString().replace(/[:.]/g, "-") + ".json");
await writeFile(file, JSON.stringify(results, null, 1));
const failed = results.filter(r => !r.ok).length;
console.log(`${results.length - failed}/${results.length} passed · ${file}`);
process.exitCode = failed ? 1 : 0;
