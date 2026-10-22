import { start, go, shot, BASE } from "./h.mjs";
const w = Number(process.argv[2]);
const { b, p, log } = await start("AUDIT-M", w, { touch: true });
const openLayers = () => p.evaluate(() => [...document.querySelectorAll("[role=dialog],dialog[open],[role=menu],[popover],[role=listbox]")].filter(e => e.getClientRects().length).map(e => `${e.tagName} role=${e.getAttribute("role")} modal=${e.getAttribute("aria-modal")} label=${e.getAttribute("aria-label")} :: ${e.innerText.replace(/\s+/g, " ").slice(0, 300)}`));
await go(p, "/app/schedule");
if (w >= 768) {
  await p.getByRole("button", { name: /account menu/ }).click(); await p.waitForTimeout(500); console.log("ACCOUNT", await openLayers()); await shot(p, `acct-${w}`); await p.keyboard.press("Escape"); await p.waitForTimeout(300);
  await p.keyboard.press(process.platform === "darwin" ? "Meta+k" : "Control+k"); await p.waitForTimeout(800);
} else { await p.getByRole("button", { name: "Search" }).click(); await p.waitForTimeout(800); }
console.log("SEARCH", await openLayers(), "focus:", await p.evaluate(() => document.activeElement.tagName + " " + (document.activeElement.getAttribute("placeholder") || document.activeElement.getAttribute("aria-label"))));
await p.keyboard.type("casey"); await p.waitForTimeout(1500);
console.log("SEARCH casey", await openLayers());
await shot(p, `search-casey-${w}`);
await p.keyboard.press("ArrowDown"); await p.keyboard.press("Enter"); await p.waitForTimeout(2500); console.log("after enter", p.url().replace(BASE, ""));
if (w < 768) { await go(p, "/app"); await p.getByRole("button", { name: "More navigation" }).click(); await p.waitForTimeout(700); console.log("MORE NAV", await openLayers()); await shot(p, `morenav-${w}`); }
console.log("blocked", log.blocked, log.pageerr, log.bad.filter(x => !x.includes("fonts")));
await b.close();
