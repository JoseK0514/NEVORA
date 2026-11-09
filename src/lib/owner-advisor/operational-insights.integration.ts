import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { companyAccessFixture } from "@/test/integration/company-access-fixture";
import { advisorService } from "./service.server";
let f: Awaited<ReturnType<typeof companyAccessFixture>>;
beforeEach(async () => { f = await companyAccessFixture(); });
afterEach(async () => { await f?.db.dispose(); });
it("opens with 28-day local historical evidence, no fabricated investigation and zero provider calls", async () => {
  const provider = vi.fn();
  const result = await advisorService(f.owner, f.db.executor, { NEVORA_OWNER_ADVISOR_ENABLED: "true" }, new AbortController().signal, undefined, provider);
  expect(result).toMatchObject({ operationalInsights: { state: "ready", denominators: { publishedShiftRecords: 0, effectiveEntryRecords: 0, timecardPeriodRecords: 0 }, suggestions: [] } });
  expect(provider).not.toHaveBeenCalled();
});

import { randomUUID } from "node:crypto";
import { admitOwner } from "./authority.server";
import { AdvisorStore } from "./store.server";
import { AdvisorTools } from "./tools.server";
import { readOperationalInsights } from "./operational-insights.server";
import { parseOperationalInsights } from "./operational-insights";
const range = { startDate: "2026-10-19", endDate: "2026-10-21" };
const signal = () => new AbortController().signal;
const store = async () => new AdvisorStore(f.owner, await admitOwner(f.owner, f.db.executor), f.db.executor);
async function publication(count = 1) {
  await f.q("INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) VALUES('history-pub','2026-10-19',1,'PUBLISH','owner')");
  await f.q("INSERT INTO schedule_publication_revision_shifts(id,revision_id,schedule_id,location_id,employee_id,date,start_time,end_time,notes) SELECT 'history-'||n,'history-pub','fictional','loc-1','target','2026-10-19','08:00','12:00','PRIVATE NOTES' FROM generate_series(1,$1::integer) n", [count]);
}
async function entry(id: string, start: string, end: string | null, location = "loc-1") {
  await f.q("INSERT INTO clocker_devices(id,location_id,name) VALUES($1,$2,'Fictional') ON CONFLICT DO NOTHING", ["device-" + location, location]);
  await f.q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,clock_out_at,status) VALUES($1,'target',$2,$3,$4::timestamptz,$5::timestamptz,$6)", [id, location, "device-" + location, start, end, end ? "CLOCKED_OUT" : "CLOCKED_IN"]);
}
async function correction(kind: "ENTRY_BOUNDARY" | "MISSING_ENTRY", timeEntry: string | null, start: string, end: string) {
  const id = randomUUID();
  await f.q("INSERT INTO employee_location_eligibility(employee_id,location_id) VALUES('target','loc-1') ON CONFLICT DO NOTHING");
  await f.q("SELECT nevora_submit_time_correction($1,'workspace-fuel','target','target',$2,$3,NULL,'loc-1',$4::timestamptz,$5::timestamptz,'Fictional correction',repeat('a',64))", [id, kind, timeEntry, start, end]);
  await f.q("SELECT nevora_review_time_correction($1,$2,'owner',1,'APPROVE',NULL,repeat('b',64))", [randomUUID(), id]);
}
async function card(start: string, end: string, action: string, revision = 1) {
  await f.q("INSERT INTO timecard_revisions(operation_id,workspace_id,employee_id,start_date,end_date,revision,action,actor_employee_id,source_hash,snapshot,command_hash,note) VALUES($1,'workspace-fuel','target',$2::date,$3::date,$4,$5,'owner',repeat('a',32),'{}',repeat('b',64),$6)", [randomUUID(), start, end, revision, action, action === "REOPEN" ? "Fictional reopen" : null]);
}
it("reads effective corrected boundaries and adjustment provenance, not raw dates; keeps timecard period and overlap denominators honest", async () => {
  await publication(2);
  await entry("raw", "2026-10-18T08:00:00-04:00", "2026-10-18T12:00:00-04:00");
  await correction("ENTRY_BOUNDARY", "raw", "2026-10-19T08:00:00-04:00", "2026-10-19T12:00:00-04:00");
  await correction("MISSING_ENTRY", null, "2026-10-20T08:00:00-04:00", "2026-10-21T00:00:00-04:00");
  await entry("carry", "2026-10-01T08:00:00-04:00", null, "loc-2");
  await card("2026-10-19", "2026-10-20", "APPROVE");
  await card("2026-10-19", "2026-10-20", "FINALIZE", 2);
  await card("2026-10-21", "2026-10-21", "REOPEN");
  const s = await store(), result = await readOperationalInsights(s, range, signal());
  expect(parseOperationalInsights(result)).toEqual(result);
  expect(result).toMatchObject({ state: "ready", partial: false, denominators: { publishedShiftRecords: 2, effectiveEntryRecords: 3, timecardPeriodRecords: 2, openEntryRecords: 1, carryInEntryRecords: 1, adjustmentEntryRecords: 1, correctedRecordedEntryRecords: 1 } });
  expect(result.observations.filter(o => o.locationId === "loc-1").map(o => [o.date, o.entryStarts, o.entryOverlaps, o.adjustmentEntryOverlaps])).toEqual([["2026-10-19", 1, 1, 0], ["2026-10-20", 1, 1, 1]]);
  expect(result.observations.filter(o => o.locationId === "loc-2").map(o => [o.entryStarts, o.openEntryOverlaps])).toEqual([[0, 1], [0, 1], [0, 1]]);
  expect(result.suggestions.map(s => [s.kind, s.observedRecords])).toEqual([["open_entries", 1], ["reopened_cards", 1]]);
  expect(JSON.stringify(result)).not.toMatch(/PRIVATE NOTES|Target QA|employee_id|source_hash/);
  const tool = await new AdvisorTools(s).run({ name: "operational_insights", args: range });
  expect(tool.sources).toHaveLength(1); expect(tool.sources[0].href).toBe("/app/timecards?start=2026-10-19&end=2026-10-21");
  expect(tool.data).toMatchObject({ sourceVersion: result.sourceVersion, denominators: result.denominators });
});
it("keeps location matching separate, hashes facts not wall clock, and observes new publication versions", async () => {
  await publication(); await entry("other-location", "2026-10-19T08:00:00-04:00", "2026-10-19T12:00:00-04:00", "loc-2");
  const s = await store(); const first = await readOperationalInsights(s, range, signal()); const again = await readOperationalInsights(s, range, signal());
  expect(first.sourceVersion).toBe(again.sourceVersion); expect(first.observedAt).not.toBe(again.observedAt);
  expect(first.suggestions).toEqual([expect.objectContaining({ kind: "unmatched_days", observedRecords: 1 })]);
  await f.q("INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) VALUES('new-history-pub','2026-10-19',2,'PUBLISH','owner')");
  const changed = await readOperationalInsights(s, range, signal());
  expect(changed.sourceVersion).not.toBe(first.sourceVersion); expect(changed.denominators?.publishedShiftRecords).toBe(0); expect(changed.suggestions).toEqual([]);
  await f.q("UPDATE workspaces SET time_zone='UTC' WHERE id='workspace-fuel'");
  await expect(readOperationalInsights(s, range, signal())).rejects.toThrow();
});
it("returns bounded retained records with actual full denominators and detects changes outside the retained source", async () => {
  await publication(3001);
  const s = await store(); const first = await readOperationalInsights(s, range, signal());
  expect(first).toMatchObject({ state: "ready", partial: true, denominators: { publishedShiftRecords: 3001, retainedPublishedShiftRecords: 3000 }, omissions: { publishedShiftRecords: 1 }, suggestions: [] });
  expect(first.observations).toHaveLength(1); expect(first.observations[0].publishedShiftRecords).toBe(3000);
  // The lexicographically last record is omitted, but metadata changes still alter the full source hash.
  await f.q("UPDATE schedule_publication_revision_shifts SET end_time='13:00' WHERE id='history-999'");
  expect((await readOperationalInsights(s, range, signal())).sourceVersion).not.toBe(first.sourceVersion);
});
it("rejects retired authority, rebinding and cancellation; schema failure stays unavailable instead of empty", async () => {
  const s = await store();
  const wrong = new AdvisorStore(f.owner, { ...s.original, workspace: { ...s.original.workspace, id: "another-workspace" } }, f.db.executor);
  await expect(readOperationalInsights(wrong, range, signal())).rejects.toThrow();
  const ac = new AbortController(); ac.abort(); await expect(readOperationalInsights(s, range, ac.signal)).rejects.toThrow("cancelled");
  await f.q("ALTER VIEW nevora_effective_time_entries RENAME TO unavailable_effective_entries");
  expect(await readOperationalInsights(s, range, signal())).toMatchObject({ state: "unavailable", partial: true, sourceVersion: null, denominators: null, omissions: null, suggestions: [] });
  await f.q("DELETE FROM employee_sessions WHERE token_hash=$1", [f.owner.sessionTokenHash]);
  await expect(readOperationalInsights(s, range, signal())).rejects.toThrow();
});
it("rechecks original authority after the historical snapshot before releasing its data", async () => {
  const original = f.db.executor; let snapshots = 0;
  const wrapped = { ...original, transaction: async (...args: Parameters<typeof original.transaction>) => {
    const result = await original.transaction(...args);
    if (args[0].some(s => s.text.includes('AS fingerprint'))) { snapshots++; await f.q("DELETE FROM employee_sessions WHERE token_hash=$1", [f.owner.sessionTokenHash]); }
    return result;
  } };
  const s = new AdvisorStore(f.owner, await admitOwner(f.owner, original), wrapped);
  await expect(readOperationalInsights(s, range, signal())).rejects.toThrow();
  expect(snapshots).toBe(1);
});

it("changed current staffing requirements do not rewrite historical observations or establish historical understaffing",async()=>{
 await publication();await entry("matched-history","2026-10-19T08:00:00-04:00","2026-10-19T12:00:00-04:00");
 const s=await store(),tools=new AdvisorTools(s);
 const before=await readOperationalInsights(s,range,signal());
 await f.q("UPDATE location_staffing_settings SET minimum_staff_per_shift=20,requires_designated_lead=true WHERE location_id='loc-1'");
 expect(await f.q("SELECT minimum_staff_per_shift,requires_designated_lead FROM location_staffing_settings WHERE location_id='loc-1'")).toEqual([{minimum_staff_per_shift:20,requires_designated_lead:true}]);
 const after=await tools.run({name:'operational_insights',args:range});
 expect(after.data).toMatchObject({state:'ready',sourceVersion:before.sourceVersion,denominators:before.denominators,observations:before.observations,suggestions:[]});
 expect(after.data).toMatchObject({limitations:expect.arrayContaining(['Current staffing configuration cannot establish historical requirements or understaffing. These observations do not assess worker risk.','Timecard counts are latest employee-period records, not distinct people. Approval or finalization does not establish current payroll or legal readiness.'])});
 expect(after.data).not.toHaveProperty('historicalStaffingRequirements');
});
