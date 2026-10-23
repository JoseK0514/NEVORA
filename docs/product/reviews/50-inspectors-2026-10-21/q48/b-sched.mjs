import { start, go, shot, overflow, dump } from "./h.mjs";
const w = Number(process.argv[2]);
const { b, p, log } = await start("AUDIT-M", w, { touch: true });
const vis = async () => p.evaluate(() => [...document.querySelectorAll("[role=menu] [role=menuitem],[role=menu] a,[role=menu] button,[role=dialog] a,[role=dialog] button")].filter(e => e.getClientRects().length).map(e => (e.getAttribute("aria-label") || e.innerText).replace(/\s+/g, " ").slice(0, 50) + " " + (e.getAttribute("href") || "") + (e.disabled ? " [disabled]" : "")));
await go(p, "/app/schedule");
console.log("h1", await p.locator("h1").allInnerTexts(), await overflow(p));
// More menu
const more = p.getByRole("button", { name: /More/ }).filter({ visible: true }).first();
await more.click(); await p.waitForTimeout(500);
console.log("MORE:", JSON.stringify(await vis()), "focus:", await p.evaluate(() => document.activeElement?.innerText?.slice(0, 40)));
await shot(p, `sched-more-${w}`);
await p.keyboard.press("Escape"); await p.waitForTimeout(300);
console.log("after esc focus:", await p.evaluate(() => (document.activeElement?.getAttribute("aria-label") || document.activeElement?.innerText || "").slice(0, 40)), "menu open:", await p.locator("[role=menu]:visible").count());
// locations
for (const name of ["Main Office", "West Office", "All locations"]) {
  const l = p.getByRole("link", { name, exact: true }).filter({ visible: true }).first();
  if (await l.count()) { await l.click(); await p.waitForLoadState("networkidle"); await p.waitForTimeout(600); console.log("loc", name, p.url().replace(/.*schedule/, ""), (await p.locator("main").innerText()).replace(/\s+/g, " ").slice(0, 200)); if (name === "West Office") await shot(p, `sched-west-${w}`); }
  else console.log("no loc link", name);
}
// next week then back
const nx = p.getByRole("link", { name: "Next week" }).filter({ visible: true }).first();
if (await nx.count()) { await nx.click(); await p.waitForLoadState("networkidle"); await p.waitForTimeout(800); console.log("next", p.url().replace(/.*schedule/, ""), (await p.locator("main").innerText()).replace(/\s+/g, " ").slice(0, 250)); await shot(p, `sched-nextweek-${w}`); }
dump(log); await b.close();
