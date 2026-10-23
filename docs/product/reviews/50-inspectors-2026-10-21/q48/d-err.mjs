import { start, go, shot, overflow, dump } from "./h.mjs";
const w = Number(process.argv[2]);
const { b, p, log } = await start("AUDIT-M", w, { touch: true });
for (const [path, name] of [["/app/timecards", "tc-err"], ["/app/inbox", "inbox-err"], ["/app", "home-err"], ["/app/reports", "insights-err"]]) {
  await go(p, path);
  const info = await p.evaluate(() => { const bs = [...document.querySelectorAll("button")].filter(e => e.getClientRects().length && !(e.getAttribute("aria-label") || e.innerText || "").trim()); return bs.map(e => ({ html: e.outerHTML.slice(0, 300), r: JSON.stringify(e.getBoundingClientRect()).slice(0, 80) })); });
  const main = (await p.locator("main").first().innerText()).replace(/\s+/g, " ").slice(0, 400);
  console.log("==", path, "\n unlabeled:", JSON.stringify(info), "\n main:", main);
  await shot(p, `${name}-${w}`);
}
dump(log); await b.close();
