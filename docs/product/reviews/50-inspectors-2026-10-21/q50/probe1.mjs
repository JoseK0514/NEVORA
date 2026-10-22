import { open, BASE } from "../../tools/common.mjs";
const out = process.argv[2] || ".";
const { b, p } = await open("QAOWNER", 1440);
try {
  for (const [key, path] of [["home","/app"],["schedule","/app/schedule"],["timecards","/app/timecards"],["team","/app/employees"]]) {
    await p.goto(BASE + path, { waitUntil: "networkidle" }).catch(()=>{});
    await p.waitForTimeout(1500);
    const text = await p.evaluate(() => document.querySelector("main")?.innerText ?? document.body.innerText);
    console.log(`==== ${key} ====\n` + text.slice(0, 2500));
    await p.screenshot({ path: `${out}/owner-${key}-1440.png`, fullPage: true });
    await p.waitForTimeout(400);
  }
} finally { await b.close(); }
