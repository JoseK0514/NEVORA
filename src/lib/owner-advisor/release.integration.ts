import { afterEach, beforeEach, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { companyAccessFixture } from "@/test/integration/company-access-fixture";
import { AdvisorStore } from "./store.server";
import { admitOwner } from "./authority.server";
import { AdvisorTools } from "./tools.server";
let f: Awaited<ReturnType<typeof companyAccessFixture>>;
beforeEach(async () => { f = await companyAccessFixture(); });
afterEach(async () => { await f?.db.dispose(); });
async function store() { return new AdvisorStore(f.owner, await admitOwner(f.owner, f.db.executor), f.db.executor); }
async function publication(revision: number, count: number) {
  await f.q("INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) VALUES($1,'2026-10-19',$2,'PUBLISH','owner')", ["pub-" + revision, revision]);
  await f.q("INSERT INTO schedule_publication_revision_shifts(id,revision_id,schedule_id,location_id,employee_id,date,start_time,end_time,notes) SELECT $1||'-'||n,$1,'fictional-schedule','loc-1','target','2026-10-23','08:00','12:00','PRIVATE MEDICAL DETAIL' FROM generate_series(1,$2::integer) n", ["pub-" + revision, count]);
}

it("admits one of 24 simultaneous investigations across two actual Owner sessions", async () => {
  await f.q("UPDATE employees SET role='OWNER' WHERE id='manager'");
  const secondProof = { ...f.manager, employee: { ...f.manager.employee, role: "OWNER" as const } };
  const a = await store();
  const b = new AdvisorStore(secondProof, await admitOwner(secondProof, f.db.executor), f.db.executor);
  const results = await Promise.allSettled(Array.from({ length: 24 }, (_, i) => (i % 2 ? a : b).reserve(randomUUID(), "fictional-" + i, 100)));
  expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
  expect(await f.q("SELECT count(*)::integer n FROM owner_advisor_requests WHERE state='running'")).toEqual([{ n: 1 }]);
});

it("rejects all but one simultaneous save from the same priority revision", async () => {
  const s = await store();
  const results = await Promise.allSettled(Array.from({ length: 16 }, (_, i) => s.save({ op: "save_priorities", requestId: randomUUID(), expectedRevision: 0, priorities: "Fictional priority " + i })));
  expect(results.filter(r => r.status === "fulfilled")).toHaveLength(1);
  expect((await s.read()).profile.revision).toBe(1);
  expect(await f.q("SELECT count(*)::integer n FROM owner_advisor_requests")).toEqual([{ n: 1 }]);
});

it("shares the daily request cap across Owners while keeping their histories separate", async () => {
  const a = await store(), id = randomUUID();
  await a.reserve(id, "owner-a", 1);
  await a.complete(id, "Private owner question", { text: "Private answer", sources: [] });
  await f.q("UPDATE employees SET role='OWNER' WHERE id='manager'");
  const proof = { ...f.manager, employee: { ...f.manager.employee, role: "OWNER" as const } };
  const b = new AdvisorStore(proof, await admitOwner(proof, f.db.executor), f.db.executor);
  await expect(b.reserve(randomUUID(), "owner-b", 1)).rejects.toThrow("daily_limit");
  expect((await b.read()).history).toEqual([]);
  expect((await a.read()).history).toHaveLength(2);
});

it("reads a changed publication on the next investigation and excludes medical notes and approved callouts", async () => {
  const tools = new AdvisorTools(await store());
  await publication(1, 2);
  expect(await tools.run({ name: "published_staffing", args: { date: "2026-10-23" } })).toMatchObject({ data: { shifts: [{ revision: 1 }, { revision: 1 }] } });
  await publication(2, 1);
  let result = await tools.run({ name: "published_staffing", args: { date: "2026-10-23" } });
  expect(result).toMatchObject({ data: { shifts: [{ revision: 2 }] } });
  expect(JSON.stringify(result)).not.toMatch(/MEDICAL|555003|example.invalid/);
  await f.q("UPDATE schedule_publication_revision_shifts SET is_callout_approved=true WHERE revision_id='pub-2'");
  result = await tools.run({ name: "published_staffing", args: { date: "2026-10-23" } });
  expect(result).toMatchObject({ data: { shifts: [] } });
});

it("an empty latest publication never revives old staffing", async () => {
  await publication(1, 2);
  await publication(2, 0);
  expect(await new AdvisorTools(await store()).run({ name: "published_staffing", args: { date: "2026-10-23" } })).toMatchObject({ partial: false, data: { shifts: [] } });
});

it("marks truncated publication data partial instead of silently claiming completeness", async () => {
  await publication(1, 101);
  const result = await new AdvisorTools(await store()).run({ name: "published_staffing", args: { date: "2026-10-23" } });
  expect(result.partial).toBe(true);
  expect(result.data).toMatchObject({ shifts: expect.any(Array) });
  const data = result.data as { shifts: unknown[] };
  expect(data.shifts).toHaveLength(100);
});

it("keeps a missing publication distinct from other weeks and dates", async () => {
  await publication(1, 1);
  const tools = new AdvisorTools(await store());
  for (const date of ["2026-10-22", "2026-10-30"]) expect(await tools.run({ name: "published_staffing", args: { date } })).toMatchObject({ data: { date, shifts: [] } });
});
