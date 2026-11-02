import { afterEach, beforeEach, expect, it } from "vitest";
import { companyAccessFixture } from "@/test/integration/company-access-fixture";
import { admitOwner } from "./authority.server";
import { AdvisorStore } from "./store.server";
import { readLegalResearch } from "./legal-research.server";
import { parseAnswer } from "@/components/owner-advisor/public-response";
let f: Awaited<ReturnType<typeof companyAccessFixture>>;
beforeEach(async () => { f = await companyAccessFixture(); });
afterEach(async () => { await f?.db.dispose(); });
async function store() { return new AdvisorStore(f.owner, await admitOwner(f.owner, f.db.executor), f.db.executor); }
const args = { jurisdiction: "PR_US" as const, topic: "working_time" as const };
it("reads three fixed sources with real Owner guards, bounded projection and no business-data outbound fields", async () => {
  const calls: string[] = [];
  const result = await readLegalResearch(await store(), args, new AbortController().signal, async (url, init) => {
    calls.push(url); expect(init.body).toBeUndefined(); expect(init.headers).toEqual({ Accept: "text/html, application/pdf" });
    return new Response(url.endsWith(".pdf") ? "%PDF fixture" : "<p>Fictional public source</p>", { headers: { "Content-Type": url.endsWith(".pdf") ? "application/pdf" : "text/html" } });
  });
  expect(calls).toHaveLength(3); expect(calls.every(u => !u.includes("?") && !u.includes(f.owner.employee.id))).toBe(true);
  expect(result.sources).toEqual([]); expect(result.legalResearch!.sources).toHaveLength(3); expect(JSON.stringify(result.legalResearch).length).toBeLessThanOrEqual(24000);
  expect(result.legalResearch).toMatchObject({ readiness: "unverified", financialClearance: false, missingFacts: expect.arrayContaining(["work_location", "employer_coverage"]) });
  expect(parseAnswer({ state: "answered", answer: { text: "Inspect", sources: [], legalResearch: result.legalResearch }, authority: "fixture", observedAt: result.observedAt, validForMs: 15000 }).answer.legalResearch).toEqual(result.legalResearch);
  expect(await f.q("SELECT request_id FROM owner_advisor_requests")).toEqual([]);
});
it("rejects authority retirement during retrieval before returning private source evidence", async () => {
  const s = await store(); let count = 0;
  await expect(readLegalResearch(s, args, new AbortController().signal, async () => {
    count++; await f.q("DELETE FROM employee_sessions WHERE token_hash=$1", [f.owner.sessionTokenHash]);
    return new Response("Source", { headers: { "Content-Type": "text/html" } });
  })).rejects.toThrow();
  expect(count).toBe(1);
});
it("does not fetch after a retired Owner session or cancelled signal", async () => {
  const s = await store(); const ac = new AbortController(); ac.abort(); let count = 0;
  await expect(readLegalResearch(s, args, ac.signal, async () => { count++; return new Response(); })).rejects.toThrow("cancelled");
  await f.q("DELETE FROM employee_sessions WHERE token_hash=$1", [f.owner.sessionTokenHash]);
  await expect(readLegalResearch(s, args, new AbortController().signal, async () => { count++; return new Response(); })).rejects.toThrow();
  expect(count).toBe(0);
});
