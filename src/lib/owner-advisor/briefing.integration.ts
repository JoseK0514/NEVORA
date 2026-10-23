import { afterEach, beforeEach, expect, it } from "vitest";
import { companyAccessFixture } from "@/test/integration/company-access-fixture";
import { advisorService } from "./service.server";
import { randomUUID } from "node:crypto";

let f: Awaited<ReturnType<typeof companyAccessFixture>>;
beforeEach(async () => { f = await companyAccessFixture(); });
afterEach(async () => { await f?.db.dispose(); });
const env = { NEVORA_OWNER_ADVISOR_ENABLED: "true" };

it("opens a sourced attention briefing even without a model connection", async () => {
  const result = await advisorService(f.owner, f.db.executor, env, new AbortController().signal);
  expect(result).toMatchObject({
    state: "ready",
    connection: "unavailable",
    attention: { date: expect.stringMatching(/^20\d\d-\d\d-\d\d$/), items: expect.any(Array), reviewed: [], sources: expect.any(Array) },
  });
  expect(await f.q("SELECT count(*)::int n FROM owner_advisor_requests")).toEqual([{ n: 0 }]);
});

async function ready() {
  const result = await advisorService(f.owner, f.db.executor, env, new AbortController().signal);
  if (result.state !== "ready") throw Error("Expected snapshot");
  return result;
}
it("persists personal triage once and rejects stale or tampered evidence", async () => {
  const snapshot = await ready();
  const issue = snapshot.attention!.items[0];
  expect(issue).toBeDefined();
  const command = { op: "review_briefing", requestId: randomUUID(), issueId: issue.id, fingerprint: issue.fingerprint, expectedRevision: 0, disposition: "deferred" };
  const result = await advisorService(f.owner, f.db.executor, env, new AbortController().signal, command);
  expect(result).toMatchObject({ state: "briefing_reviewed", revision: 1 });
  expect(await advisorService(f.owner, f.db.executor, env, new AbortController().signal, command)).toMatchObject({ state: "briefing_reviewed", revision: 1 });
  const fresh = await ready();
  expect(fresh.attention!.reviewed[0]).toMatchObject({ id: issue.id, disposition: "deferred", state: "open", reviewRevision: 1 });
  expect(fresh.attention!.items.some(i => i.id === issue.id)).toBe(false);
  await expect(advisorService(f.owner, f.db.executor, env, new AbortController().signal, { ...command, requestId: randomUUID(), disposition: "dismissed" })).rejects.toThrow("conflict");
  await expect(advisorService(f.owner, f.db.executor, env, new AbortController().signal, { ...command, requestId: randomUUID(), expectedRevision: 1, fingerprint: "0".repeat(64) })).rejects.toThrow("conflict");
  expect(await f.q("SELECT count(*)::int n FROM owner_advisor_requests WHERE kind='ask'")).toEqual([{ n: 0 }]);
});

it("keeps reviews private to the original Owner and blocks non-Owner writes", async () => {
  const snapshot = await ready();
  const issue = snapshot.attention!.items[0];
  const command = { op: "review_briefing", requestId: randomUUID(), issueId: issue.id, fingerprint: issue.fingerprint, expectedRevision: 0, disposition: "tracking" };
  await expect(advisorService(f.manager, f.db.executor, env, new AbortController().signal, command)).rejects.toThrow();
  await advisorService(f.owner, f.db.executor, env, new AbortController().signal, command);
  await f.q("UPDATE employees SET role='OWNER' WHERE id='manager'");
  const secondOwner = { ...f.manager, employee: { ...f.manager.employee, role: "OWNER" as const } };
  const other = await advisorService(secondOwner, f.db.executor, env, new AbortController().signal);
  expect(other).toMatchObject({ attention: { reviewed: [] } });
  await f.q("UPDATE employees SET role='MANAGER' WHERE id='owner'");
  await expect(advisorService(f.owner, f.db.executor, env, new AbortController().signal, { ...command, requestId: randomUUID(), expectedRevision: 1 })).rejects.toThrow();
  expect(await f.q("SELECT revision FROM owner_advisor_briefing_reviews")).toEqual([{ revision: 1 }]);
});
it("serializes competing review revisions and restores a hidden issue", async () => {
  const snapshot = await ready(), issue = snapshot.attention!.items[0];
  const attempts = await Promise.allSettled(Array.from({ length: 8 }, () => advisorService(f.owner, f.db.executor, env, new AbortController().signal, { op: "review_briefing", requestId: randomUUID(), issueId: issue.id, fingerprint: issue.fingerprint, expectedRevision: 0, disposition: "dismissed" })));
  expect(attempts.filter(r => r.status === "fulfilled")).toHaveLength(1);
  expect(attempts.filter(r => r.status === "rejected")).toHaveLength(7);
  await advisorService(f.owner, f.db.executor, env, new AbortController().signal, { op: "review_briefing", requestId: randomUUID(), issueId: issue.id, fingerprint: issue.fingerprint, expectedRevision: 1, disposition: "tracking" });
  expect((await ready()).attention!.items.find(i => i.id === issue.id)).toMatchObject({ disposition: "tracking", reviewRevision: 2 });
});
