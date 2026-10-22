import { start, go, shot, overflow, dump } from "./h.mjs";
const w = Number(process.argv[2]); const paths = process.argv.slice(3);
const { b, p, log } = await start("AUDIT-M", w, { touch: true });
for (const path of paths) {
  const t = Date.now(); await go(p, path);
  const main = (await p.locator("main").first().innerText().catch(() => "NO MAIN")).replace(/\s+/g, " ");
  const ctrls = await p.evaluate(() => [...document.querySelectorAll("main a,main button,main [role=tab],main select,main input")].filter(e => e.getClientRects().length && e.type !== "hidden").map(e => `${e.tagName[0]}:${(e.getAttribute("aria-label") || e.innerText || e.value || e.name || "").replace(/\s+/g, " ").slice(0, 28)}${e.disabled ? "(dis)" : ""}`).slice(0, 40));
  console.log("==", path, Date.now() - t, "ms", JSON.stringify(await overflow(p)), "h1:", (await p.locator("h1").allInnerTexts()).join("|"), "\n main:", main.slice(0, 600), "\n ctrls:", ctrls.join(" · "));
  await shot(p, `${path.replace(/^\/app\/?/, "").replace(/[\/?=&]/g, "_") || "home"}-${w}`);
}
console.log("blocked", log.blocked, "bad", log.bad.filter(x => !x.includes("fonts")), "pageerr", log.pageerr);
await b.close();
