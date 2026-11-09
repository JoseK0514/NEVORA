import { start, BASE, shot, go } from "./h.mjs";
const w = Number(process.argv[2]);
const { b, p, log } = await start("AUDIT-M", w, { touch: true });
const poll = async (label, i) => { const t0 = Date.now(); const seq = []; let last = "";
  while (Date.now() - t0 < 8000) { const s = await p.evaluate(() => { const m = document.querySelector("main"); if (!m) return "nomain"; const t = m.innerText; return /Couldn.t load|isn.t available/.test(t) ? "ERROR" : m.querySelector("[aria-busy=true]") ? "loading" : "content:" + t.replace(/\s+/g, " ").slice(0, 30); }).catch(() => "nav");
    if (s !== last) { seq.push(`${Date.now() - t0}ms ${s}`); last = s; if (s === "ERROR") await shot(p, `flicker-${label}-${w}-${i}`); } await p.waitForTimeout(80); }
  console.log(label, i, p.url().replace(BASE, ""), seq.join(" | ")); };
for (let i = 0; i < 2; i++) {
  await go(p, "/app/updates"); await p.locator("main a[href*='/app/updates/']").first().click(); await poll("click", i);
  await go(p, "/app/updates"); await p.goto(BASE + "/app/updates/47a142df-be09-4569-a8bf-7cccbd12f56f", { waitUntil: "networkidle" }); await poll("goto", i);
  await go(p, "/app/notifications"); await p.locator("main a[href*='/app/inbox']").first().click(); await poll("notif->inbox", i);
}
console.log("blocked", log.blocked);
await b.close();
