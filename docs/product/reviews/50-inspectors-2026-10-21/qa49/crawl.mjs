import { open, S } from "../../tools/common.mjs";
import { writeFileSync } from "node:fs";
const BASE = "http://127.0.0.1:59682";
const SH = `${S}/review50/shots`;
const routes = ["/app","/app/schedule","/app/my-time","/app/my-pay","/app/updates","UPDATE_DETAIL","/app/notifications","/app/profile","/app/requests/hub","/app/requests","/app/exchange","/app/exchange/swap","/app/exchange/callout","/app/availability","/app/timecards","/app/inbox","/app/employees","/app/payroll"];
const out = [];
for (const w of [390, 1440]) {
  const { b, c, p } = await open("AUDIT-E", w);
  const cons = []; p.on("console", m => { if (m.type()==="error"||m.type()==="warning") cons.push(`${m.type()}: ${m.text().slice(0,200)}`); });
  p.on("pageerror", e => cons.push("pageerror: "+e.message.slice(0,200)));
  p.on("response", r => { if (r.status()>=400) cons.push(`HTTP ${r.status()} ${r.url().replace(BASE,"")}`); });
  let detail = null;
  for (let r of routes) {
    if (r === "UPDATE_DETAIL") { if (!detail) { out.push({w, r, note:"no detail link"}); continue; } r = detail; }
    cons.length = 0;
    const t0 = Date.now();
    let status = null;
    try { const resp = await p.goto(BASE + r, { waitUntil: "networkidle", timeout: 45000 }); status = resp?.status(); } catch (e) { out.push({ w, r, err: e.message.slice(0,150) }); continue; }
    await p.waitForTimeout(700);
    const m = await p.evaluate(() => {
      const vis = el => { const s = getComputedStyle(el); const rc = el.getBoundingClientRect(); return s.display!=="none" && s.visibility!=="hidden" && rc.width>0 && rc.height>0; };
      const shell = document.querySelector(".app-shell");
      const h1s = [...document.querySelectorAll("h1")].filter(vis).map(h => ({ t: h.textContent.trim().slice(0,60), ff: getComputedStyle(h).fontFamily.slice(0,40), fs: getComputedStyle(h).fontSize, fw: getComputedStyle(h).fontWeight, top: Math.round(h.getBoundingClientRect().top) }));
      const cm = [...document.querySelectorAll("[class*='cm-']")].filter(vis).map(e => [...e.classList].filter(c=>c.startsWith("cm-")).join(".")).filter(Boolean);
      const cmU = [...new Set(cm)].slice(0,15);
      const iw = innerWidth;
      const over = [...document.querySelectorAll("body *")].filter(e => { if(!vis(e)) return false; const rc=e.getBoundingClientRect(); return rc.right > iw + 1 && getComputedStyle(e).position!=="fixed"; }).slice(0,6).map(e => `${e.tagName.toLowerCase()}.${[...e.classList].slice(0,2).join(".")} r=${Math.round(e.getBoundingClientRect().right)}`);
      const small = iw < 768 ? [...document.querySelectorAll("main a, main button, main [role=tab], main input, main select, main summary")].filter(vis).filter(e => { const rc=e.getBoundingClientRect(); return rc.height < 40 || rc.width < 40; }).slice(0,8).map(e => `${e.tagName.toLowerCase()} "${(e.textContent||e.getAttribute("aria-label")||"").trim().slice(0,24)}" ${Math.round(e.getBoundingClientRect().width)}x${Math.round(e.getBoundingClientRect().height)}`) : [];
      const active = [...document.querySelectorAll("[aria-current]")].filter(vis).map(e => `${e.getAttribute("aria-current")}:${e.textContent.trim().slice(0,20)}`);
      return {
        url: location.pathname + location.search, title: document.title,
        nvClean: shell?.hasAttribute("data-nv-clean"), shellClass: shell?.className, corp: shell?.getAttribute("data-employee-corporate"),
        bodyFF: getComputedStyle(document.body).fontFamily.slice(0,50), bodyBg: getComputedStyle(document.body).backgroundColor,
        mainBg: document.querySelector("main") ? getComputedStyle(document.querySelector("main")).backgroundColor : null,
        h1s, cmU, hOverflow: document.documentElement.scrollWidth - iw, over, small, active,
        pageH: document.documentElement.scrollHeight,
        mobileNav: !!document.querySelector(".mobile-nav, [class*=mobile-nav]") && vis(document.querySelector(".mobile-nav, [class*=mobile-nav]")),
        text: (document.querySelector("main")?.innerText || "").replace(/\s+/g," ").slice(0,260)
      };
    });
    if (r === "/app/updates" && !detail) detail = await p.evaluate(() => [...document.querySelectorAll("a[href^='/app/updates/']")].map(a=>a.getAttribute("href")).find(h => !h.includes("compose")) || null);
    const slug = (r === "/app" ? "home" : r.replace(/^\/app\//,"").replace(/[\/?=&]/g,"-")).slice(0,40);
    await p.screenshot({ path: `${SH}/qa49-${slug}-${w}.png`, fullPage: true });
    out.push({ w, r, status, ms: Date.now()-t0, ...m, cons: [...cons].slice(0,8) });
    await p.waitForTimeout(400);
  }
  await b.close();
}
writeFileSync(`${S}/review50/qa49/crawl.json`, JSON.stringify(out, null, 1));
console.log("done", out.length);
