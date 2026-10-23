import { open, S } from "../../tools/common.mjs";
const BASE = "http://127.0.0.1:59682";
const id = "47a142df-be09-4569-a8bf-7cccbd12f56f";
for (const w of [390, 1440]) {
  const { b, p } = await open("AUDIT-E", w);
  const log = []; p.on("response", r => { const u = r.url().replace(BASE, ""); if (u.startsWith("/api") || r.status() >= 400) log.push(`${r.status()} ${r.request().method()} ${u.slice(0,90)}`); });
  for (const r of ["/app/requests/hub", `/app/updates/${id}`]) {
    log.length = 0; const t = Date.now();
    const resp = await p.goto(BASE + r, { waitUntil: "networkidle", timeout: 60000 }).catch(e => ({ status: () => "ERR " + e.message.slice(0, 80) }));
    await p.waitForTimeout(3000);
    const h1 = await p.evaluate(() => [...document.querySelectorAll("h1")].map(h => h.textContent.trim()).join(" | "));
    console.log(w, r.slice(0, 30), resp.status(), Date.now() - t, "ms h1=", h1, "\n   ", log.join("\n    "));
    if (r.includes("updates/")) await p.screenshot({ path: `${S}/review50/shots/qa49-update-detail-retest-${w}.png` });
  }
  await b.close();
}
