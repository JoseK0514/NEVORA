import { open, BASE } from "../../tools/common.mjs";
const runs = [
 ["QAOWNER",1440,"sched-empty-week","/app/schedule?week=2026-11-16"],
 ["QAOWNER",1440,"sched-yearend","/app/schedule?week=2026-12-28"],
 ["QAOWNER",1440,"inbox","/app/inbox"],
 ["QAOWNER",390,"home","/app"],
 ["QAOWNER",390,"sched","/app/schedule"],
 ["QAOWNER",390,"sched-yearend","/app/schedule?week=2026-12-28"],
 ["QAOWNER",390,"timecards","/app/timecards"],
];
let cur=null, curKey="";
for (const [acct,w,key,path] of runs) {
  if (curKey !== acct+w) { if (cur) await cur.b.close(); cur = await open(acct, w); curKey = acct+w; }
  const p = cur.p;
  await p.goto(BASE + path, { waitUntil: "networkidle" }).catch(()=>{});
  await p.waitForTimeout(1500);
  const text = await p.evaluate(() => (document.querySelector("main")?.innerText ?? document.body.innerText));
  const overflow = await p.evaluate(() => ({ docW: document.documentElement.scrollWidth, vw: innerWidth }));
  console.log(`==== ${acct} ${w} ${key} ${JSON.stringify(overflow)} ====\n` + text.replace(/\n{2,}/g,"\n").slice(0, 1800));
  await p.screenshot({ path: `${key}-${w}.png`, fullPage: true });
}
await cur.b.close();
