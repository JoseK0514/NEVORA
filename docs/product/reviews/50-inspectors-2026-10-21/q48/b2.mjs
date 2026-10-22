import { start, go, shot, overflow, dump } from "./h.mjs";
const w = Number(process.argv[2]);
const { b, p, log } = await start("AUDIT-M", w, { touch: true });
await go(p, "/app/schedule");
const more = p.getByRole("button", { name: /More/ }).filter({ visible: true }).first();
console.log("more attrs", await more.evaluate(e => ({ exp: e.getAttribute("aria-expanded"), hp: e.getAttribute("aria-haspopup"), ctl: e.getAttribute("aria-controls") })));
await more.click(); await p.waitForTimeout(400);
console.log("popup", await p.evaluate(() => { const el = document.activeElement; const pop = [...document.querySelectorAll("[popover],[role=menu],[role=dialog],dialog")].filter(e => e.getClientRects().length).map(e => e.tagName + " role=" + e.getAttribute("role") + " label=" + e.getAttribute("aria-label")); return { pop, active: el.tagName + " " + (el.innerText || "").slice(0, 30) }; }));
await p.keyboard.press("Tab"); console.log("tab1", await p.evaluate(() => document.activeElement.innerText?.slice(0, 30)));
await p.keyboard.press("ArrowDown"); console.log("down", await p.evaluate(() => document.activeElement.innerText?.slice(0, 30)));
// date input empty set deadline
const sd = p.getByRole("button", { name: "Set deadline" });
console.log("setdeadline disabled", await sd.isDisabled().catch(() => "n/a"));
await p.keyboard.press("Escape"); await p.waitForTimeout(300);
for (const name of ["Main Office", "West Office"]) {
  const l = p.getByRole("link", { name, exact: true }).filter({ visible: true }).first();
  const t = Date.now();
  await l.click();
  try { await p.waitForURL(/location=/, { timeout: 30000 }); } catch { console.log("no url change"); }
  await p.waitForLoadState("networkidle"); await p.waitForTimeout(500);
  console.log("loc", name, Date.now() - t, "ms", p.url().split("schedule")[1], (await p.locator("main").innerText()).replace(/\s+/g, " ").slice(0, 300));
  await shot(p, `sched-${name.split(" ")[0].toLowerCase()}-${w}`);
}
dump(log); await b.close();
