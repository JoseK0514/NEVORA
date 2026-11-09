/** Fictional wire transcripts against real owned PostgreSQL/service; no model call. */
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { companyAccessFixture } from "@/test/integration/company-access-fixture";
import { ownerDecision } from "@/test/fixtures/owner-decision";
import { advisorService } from "./service.server";
import { parseAnswer } from "@/components/owner-advisor/public-response";
import type { Transport } from "./loop.server";

let f: Awaited<ReturnType<typeof companyAccessFixture>>;
beforeEach(async () => { f = await companyAccessFixture(); });
afterEach(async () => { try { await f?.db.dispose(); } finally { vi.unstubAllEnvs(); } });
const base = "https://br-fictional-intelligence-api.ai.us-east-2.aws.neon.tech";
const env = { NEVORA_OWNER_ADVISOR_ENABLED: "true", NEVORA_OWNER_ADVISOR_DATA_APPROVED: "true", NEVORA_OWNER_ADVISOR_PROVIDER: "neon", NEVORA_OWNER_ADVISOR_API_STYLE: "chat_completions", NEVORA_OWNER_ADVISOR_MODEL: "explicit-fictional-catalog-model", NEVORA_OWNER_ADVISOR_DAILY_LIMIT: "1", NEON_AI_GATEWAY_BASE_URL: base, NEON_AI_GATEWAY_TOKEN: "fictional-no-credential" };
const signal = () => new AbortController().signal;
const command = () => ({ op: "ask", requestId: randomUUID(), message: "Review the recorded published shift and recommend the next decision." });
const chat = (call: { id: string; name: string; args: unknown }) => Response.json({ id: "fictional-completion", object: "chat.completion", choices: [{ index: 0, finish_reason: "tool_calls", message: { role: "assistant", content: null, tool_calls: [{ id: call.id, type: "function", function: { name: call.name, arguments: JSON.stringify(call.args) } }] } }] });
function publishedDecision() {
  const d = ownerDecision();
  d.summary = "Target QA has a recorded published shift on October 22. Review actual availability before proposing any change.";
  d.observations = [{ statement: "The published schedule records Target QA from 08:00 to 12:00 on 2026-10-22.", evidenceIds: ["E2"] }];
  d.options[0].evidenceIds = ["E2"];
  return d;
}
async function seedPublished() {
  await f.q(`INSERT INTO schedule_publication_revisions(id,week_start,revision_number,source_type,created_by) VALUES('intelligence-pub','2026-10-19',1,'PUBLISH','owner');
    INSERT INTO schedule_publication_revision_shifts(id,revision_id,source_shift_id,schedule_id,location_id,employee_id,date,start_time,end_time,notes) VALUES('intelligence-ps','intelligence-pub','private-draft','draft-s','loc-1','target','2026-10-22','08:00','12:00','PRIVATE SCHEDULE NOTES');
    INSERT INTO schedules(id,location_id,week_start,status,created_by) VALUES('draft-s','loc-1','2026-10-19','DRAFT','owner');
    INSERT INTO shifts(id,schedule_id,employee_id,date,start_time,end_time,notes) VALUES('private-draft','draft-s','target','2026-10-22','14:00','18:00','PRIVATE DRAFT NOTES');`);
}
async function businessState() {
  return f.q(`SELECT jsonb_build_object('schedules',(SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY id),'[]') FROM schedules s),
    'shifts',(SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY id),'[]') FROM shifts s),
    'publications',(SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY id),'[]') FROM schedule_publication_revisions s),
    'publishedShifts',(SELECT coalesce(jsonb_agg(to_jsonb(s) ORDER BY id),'[]') FROM schedule_publication_revision_shifts s)) AS state`);
}

it("investigates through Neon chat format, retains private goals, replays exactly and does not mutate schedules", async () => {
  await seedPublished();
  const goalId = randomUUID(), taskId = randomUUID();
  await advisorService(f.owner, f.db.executor, env, signal(), { op: "notebook", requestId: randomUUID(), expectedRevision: 0, change: { kind: "save_goal", goalId, text: "Preserve coverage without weakening another location" } });
  await advisorService(f.owner, f.db.executor, env, signal(), { op: "notebook", requestId: randomUUID(), expectedRevision: 1, change: { kind: "save_task", taskId, objective: "Review the published shift", notes: "Compare current publication rather than trust old chat", state: "open", focus: { kind: "general" } } });
  const before = await businessState(), bodies: Record<string, unknown>[] = [];
  const transport = vi.fn<Transport>(async (url, init) => {
    expect(url).toBe(base + "/v1/chat/completions");
    bodies.push(JSON.parse(String(init.body)));
    if (bodies.length === 1) return chat({ id: "published", name: "published_staffing", args: { date: "2026-10-22" } });
    const messages = bodies[1].messages as { role: string; tool_call_id?: string; content: string }[];
    const read = JSON.parse(messages.find(m => m.role === "tool" && m.tool_call_id === "published")!.content);
    expect(read).toMatchObject({ evidenceId: "E2", partial: false, data: { date: "2026-10-22", publication: "PUBLISHED", shifts: [{ employeeName: "Target QA", startTime: "08:00", endTime: "12:00" }] } });
    return chat({ id: "decision", name: "review_decision", args: publishedDecision() });
  });
  const request = { op: "ask_task", requestId: randomUUID(), taskId, expectedNotebookRevision: 2, message: "Continue the investigation and recommend what to do next." };
  const first = await advisorService(f.owner, f.db.executor, env, signal(), request, transport);
  expect(parseAnswer(first)).toMatchObject({ state: "answered", answer: { text: expect.stringContaining("Target QA"), context: { notebookRevision: 2, taskId } } });
  expect(JSON.stringify(bodies[0])).toContain("Preserve coverage without weakening another location");
  expect(JSON.stringify(bodies[0])).toContain("Compare current publication rather than trust old chat");
  for (const secret of ["PRIVATE SCHEDULE NOTES", "PRIVATE DRAFT NOTES", "555003", f.owner.sessionTokenHash, env.NEON_AI_GATEWAY_TOKEN]) expect(JSON.stringify(bodies)).not.toContain(secret);
  const replay = await advisorService(f.owner, f.db.executor, env, signal(), request, transport);
  expect(parseAnswer(replay).answer).toEqual(parseAnswer(first).answer);
  expect(transport).toHaveBeenCalledTimes(2);
  expect(await businessState()).toEqual(before);
  expect(await f.q("SELECT state FROM owner_advisor_requests WHERE kind='ask'")).toEqual([{ state: "completed" }]);
  expect(await f.q("SELECT jsonb_array_length(history)::int n FROM owner_advisor_profiles")).toEqual([{ n: 2 }]);
  await expect(advisorService(f.owner, f.db.executor, env, signal(), command(), transport)).rejects.toThrow("daily_limit");
  expect(transport).toHaveBeenCalledTimes(2);
});

it("settles a repeatedly invalid decision as failed and prevents replay from spending inference again", async () => {
  const bad = ownerDecision(); bad.observations[0].evidenceIds = ["E8"];
  const c = command(); let calls = 0;
  const transport: Transport = async () => chat({ id: "bad-" + ++calls, name: "review_decision", args: bad });
  await expect(advisorService(f.owner, f.db.executor, env, signal(), c, transport)).rejects.toThrow("limit");
  expect(calls).toBe(2);
  expect(await f.q("SELECT state,result FROM owner_advisor_requests WHERE kind='ask'")).toEqual([{ state: "failed", result: null }]);
  expect(await f.q("SELECT history FROM owner_advisor_profiles")).toEqual([]);
  await expect(advisorService(f.owner, f.db.executor, env, signal(), c, transport)).rejects.toThrow("prior_attempt_failed");
  expect(calls).toBe(2);
});

it.each(["logout", "demote"])("discards a returned chat decision after Owner %s", async change => {
  await seedPublished(); let calls = 0;
  const transport: Transport = async () => {
    if (++calls === 1) return chat({ id: "publication", name: "published_staffing", args: { date: "2026-10-22" } });
    await f.q(change === "logout" ? "DELETE FROM employee_sessions WHERE employee_id='owner'" : "UPDATE employees SET role='MANAGER' WHERE id='owner'");
    return chat({ id: "decision", name: "review_decision", args: publishedDecision() });
  };
  await expect(advisorService(f.owner, f.db.executor, env, signal(), command(), transport)).rejects.toThrow();
  expect(calls).toBe(2);
  expect(await f.q("SELECT history FROM owner_advisor_profiles")).toEqual([]);
  expect(await f.q("SELECT count(*)::int n FROM owner_advisor_requests WHERE state='completed'")).toEqual([{ n: 0 }]);
});

it("rejects notebook changes during decision inference under the original settlement lock", async () => {
  await seedPublished();
  const goalId = randomUUID();
  const save = (expectedRevision: number, text: string) => ({ op: "notebook", requestId: randomUUID(), expectedRevision, change: { kind: "save_goal", goalId, text } });
  await advisorService(f.owner, f.db.executor, env, signal(), save(0, "Original private objective"));
  let calls = 0;
  const transport: Transport = async () => {
    if (++calls === 1) return chat({ id: "publication", name: "published_staffing", args: { date: "2026-10-22" } });
    await advisorService(f.owner, f.db.executor, env, signal(), save(1, "Changed before answer settlement"));
    return chat({ id: "decision", name: "review_decision", args: publishedDecision() });
  };
  await expect(advisorService(f.owner, f.db.executor, env, signal(), command(), transport)).rejects.toThrow("conflict");
  expect(await f.q("SELECT history FROM owner_advisor_profiles")).toEqual([]);
  expect(await f.q("SELECT state FROM owner_advisor_requests WHERE kind='ask'")).toEqual([{ state: "failed" }]);
});

it("keeps provider/data approval and Owner admission required before the new protocol can spend", async () => {
  const transport = vi.fn<Transport>(async () => chat({ id: "decision", name: "review_decision", args: ownerDecision() }));
  await expect(advisorService(f.manager, f.db.executor, env, signal(), command(), transport)).rejects.toThrow();
  await expect(advisorService(f.owner, f.db.executor, { ...env, NEVORA_OWNER_ADVISOR_DATA_APPROVED: "false" }, signal(), command(), transport)).rejects.toThrow("unavailable");
  await expect(advisorService(f.owner, f.db.executor, { ...env, NEVORA_OWNER_ADVISOR_API_STYLE: "automatic" }, signal(), command(), transport)).rejects.toThrow("unavailable");
  expect(transport).not.toHaveBeenCalled();
  expect(await f.q("SELECT count(*)::int n FROM owner_advisor_requests")).toEqual([{ n: 0 }]);
});

it("preserves original cancellation/failure settlement for a stalled chat transport", async () => {
  const controller = new AbortController(); let calls = 0;
  const c = command();
  const transport: Transport = async () => { calls++; controller.abort(); return new Promise<Response>(() => {}); };
  await expect(advisorService(f.owner, f.db.executor, env, controller.signal, c, transport)).rejects.toThrow();
  expect(calls).toBe(1);
  expect(await f.q("SELECT state FROM owner_advisor_requests WHERE kind='ask'")).toEqual([{ state: "failed" }]);
  expect(await f.q("SELECT history FROM owner_advisor_profiles")).toEqual([]);
});

it("resumes a period task in English, rereads changed records in Spanish and rejects the older decision evidence", async () => {
  vi.stubEnv("NEVORA_PAYROLL_ENABLED", "false");
  await f.q("INSERT INTO clocker_devices(id,location_id,name) VALUES('intelligence-device','loc-1','Fictional fixture device')");
  const taskId = randomUUID();
  await advisorService(f.owner, f.db.executor, env, signal(), { op: "notebook", requestId: randomUUID(), expectedRevision: 0,
    change: { kind: "save_task", taskId, objective: "Review the period", notes: "Check the current entries", state: "open", focus: { kind: "period", startDate: "2026-10-01", endDate: "2026-10-02" } } });
  const bodies: Record<string, unknown>[] = [];
  const transport: Transport = async (_url, init) => {
    bodies.push(JSON.parse(String(init.body)));
    const turn = bodies.length;
    if (turn === 1) {
      const inputs = (bodies[0].messages as { role: string; content: string }[]).filter(m => m.role === "tool").map(m => JSON.parse(m.content));
      expect(inputs).toContainEqual(expect.objectContaining({ evidenceId: "E2", currentTaskEvidence: expect.objectContaining({ data: expect.objectContaining({ language: "en" }) }) }));
      await f.q("INSERT INTO time_entries(id,employee_id,location_id,device_id,clock_in_at,status) VALUES('intelligence-time','target','loc-1','intelligence-device','2026-10-02T08:00:00-04:00','CLOCKED_IN')");
      return chat({ id: "period-es", name: "attendance_payroll_review", args: { startDate: "2026-10-01", endDate: "2026-10-02", language: "es" } });
    }
    const decision = ownerDecision(), id = turn === 2 ? "E2" : "E3";
    decision.language = "es";
    decision.summary = "Revise el registro abierto antes de decidir sobre la nómina.";
    decision.observations = [{ statement: "El período requiere revisión del Owner.", evidenceIds: [id] }];
    decision.options[0].evidenceIds = [id]; decision.acknowledgedPartialEvidence = [id];
    return chat({ id: "decision-" + turn, name: "review_decision", args: decision });
  };
  const result = await advisorService(f.owner, f.db.executor, env, signal(), { op: "ask_task", requestId: randomUUID(), taskId, expectedNotebookRevision: 1, message: "Revisa los registros actuales en español." }, transport);
  const answer = parseAnswer(result).answer;
  expect(bodies).toHaveLength(3);
  expect(JSON.stringify(bodies.at(-1)!.messages)).toContain("STALE_EVIDENCE");
  expect(answer.periodReview).toMatchObject({ language: "es", attendance: { employees: expect.arrayContaining([expect.objectContaining({ name: "Target QA", issues: expect.arrayContaining(["open_entry"]) })]) } });
  expect(answer.text).toContain("E3");
  expect(await f.q("SELECT clock_out_at FROM time_entries WHERE id='intelligence-time'")).toEqual([{ clock_out_at: null }]);
  expect(await f.q("SELECT count(*)::int n FROM timecard_revisions")).toEqual([{ n: 0 }]);
});
