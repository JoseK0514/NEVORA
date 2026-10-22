import { open, S } from "../../tools/common.mjs";
const { b, p } = await open("AUDIT-E", 1440);
const errs=[]; p.on("console", m => { if (m.type()==="error") errs.push(m.text().slice(0,300)); });
await p.goto("http://127.0.0.1:59682/app/updates/compose", { waitUntil: "networkidle", timeout: 60000 }); await p.waitForTimeout(1500);
console.log(await p.evaluate(() => (document.querySelector("main")?.innerText || "").replace(/\s+/g, " ").slice(0, 500)));
await p.screenshot({ path: `${S}/review50/shots/qa49-employee-compose-1440.png` });
errs.length=0; await p.goto("http://127.0.0.1:59682/app/requests", { waitUntil: "networkidle", timeout: 60000 }); await p.waitForTimeout(1500);
console.log("REQ errs:", errs.join("\n"));
await b.close();
