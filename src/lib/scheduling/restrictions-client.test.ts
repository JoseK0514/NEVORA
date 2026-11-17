// Scheduling restrictions (U02): the browser client for the two endpoints, against documents the server's own rules made.
import { describe, expect, it, vi } from "vitest";
import { applyRestrictionCommand, emptyRestrictionDocument } from "./restrictions";
import { createRestrictionsClient, newOperationId, parseRestrictionsDocument, type RestrictionsCommand } from "./restrictions-client";

const OP = (n: number) => `${String(n).padStart(8, "0")}-2222-4222-8222-222222222222`;
const owner = { actorId: "OWNER-1", actorRole: "OWNER" as const, now: "2030-09-30T12:00:00.000Z", earliestWeek: "2030-09-30" };
const SET: RestrictionsCommand = { kind: "SET", operationId: OP(1), expectedRevision: 0, reason: "Agreed with the employee", effectiveWeek: "2030-10-07", unavailable: [{ dayOfWeek: 0, startTime: "00:00", endTime: "24:00" }] };
const saved = applyRestrictionCommand(emptyRestrictionDocument(), SET, owner);
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const authority = { scope: "management" as const, actorId: "OWNER-1", view: "view-value" };

describe("what is sent", () => {
  it("posts to the role's endpoint with the contract's headers and exact bodies", async () => {
    const fetcher = vi.fn(async () => json(200, { state: "ready", data: saved.document, legacyUnconfirmed: false, earliestWeek: "2030-10-14" }));
    await createRestrictionsClient(authority, fetcher).read("EMP-1");
    const [url, init] = fetcher.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/manager/scheduling-restrictions");
    expect(init.method).toBe("POST");
    expect(init.credentials).toBe("same-origin");
    expect(init.headers).toEqual({ "Content-Type": "application/json", "x-nevora-scheduling-restrictions": "1", "x-nevora-actor": "OWNER-1", "x-nevora-employee-view": "view-value" });
    expect(JSON.parse(String(init.body))).toEqual({ action: "read", employeeId: "EMP-1" });
    const employee = vi.fn(async () => json(200, { state: "saved", receipt: saved.receipt, data: saved.document, changed: true }));
    await createRestrictionsClient({ ...authority, scope: "employee" }, employee).command("EMP-1", SET);
    const [employeeUrl, employeeInit] = employee.mock.calls[0] as unknown as [string, RequestInit];
    expect(employeeUrl).toBe("/api/employee/scheduling-restrictions");
    // The command goes exactly as it was made: same operation, contents and expected revision.
    expect(JSON.parse(String(employeeInit.body))).toEqual({ action: "command", employeeId: "EMP-1", command: SET });
    expect(employeeInit.signal).toBeUndefined();
  });
  it("makes operation IDs the server accepts", () => {
    expect(newOperationId()).toMatch(/^[a-f\d]{8}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{4}-[a-f\d]{12}$/);
    expect(newOperationId()).not.toBe(newOperationId());
  });
});

describe("reading", () => {
  const read = (response: Response | Error) => createRestrictionsClient(authority, async () => { if (response instanceof Error) throw response; return response; }).read("EMP-1");
  it("returns the document, the unconfirmed flag and the earliest week", async () => {
    expect(await read(json(200, { state: "ready", data: saved.document, legacyUnconfirmed: false, earliestWeek: "2030-10-14" }))).toEqual({ kind: "ready", snapshot: { document: saved.document, legacyUnconfirmed: false, earliestWeek: "2030-10-14" } });
    const legacy = await read(json(200, { state: "ready", data: emptyRestrictionDocument(), legacyUnconfirmed: true, earliestWeek: "2030-10-07" }));
    expect(legacy).toMatchObject({ kind: "ready", snapshot: { legacyUnconfirmed: true } });
  });
  it("a missing session is its own answer, never a failure to retry", async () => {
    expect(await read(json(401, { state: "unavailable" }))).toEqual({ kind: "signed_out" });
  });
  it("tells a refused record (denied) from a page whose role, actor or view is no longer accepted", async () => {
    expect(await read(json(403, { state: "denied" }))).toEqual({ kind: "denied" });
    expect(await read(json(403, { state: "unavailable" }))).toEqual({ kind: "access" });
  });
  it("anything else is unavailable: a 503, a lost connection, a mismatched or malformed answer", async () => {
    expect(await read(json(503, { state: "unavailable" }))).toEqual({ kind: "unavailable" });
    expect(await read(new TypeError("Failed to fetch"))).toEqual({ kind: "unavailable" });
    expect(await read(json(200, { state: "saved", data: saved.document }))).toEqual({ kind: "unavailable" });
    expect(await read(json(200, { state: "ready", data: saved.document, legacyUnconfirmed: false, earliestWeek: "2030-10-15" }))).toEqual({ kind: "unavailable" });
    // "No versions" and "unconfirmed" must agree: a reply that disagrees is never shown as "no agreement".
    expect(await read(json(200, { state: "ready", data: saved.document, legacyUnconfirmed: true, earliestWeek: "2030-10-14" }))).toEqual({ kind: "unavailable" });
    expect(await read(json(200, { state: "ready", data: { ...saved.document, schemaVersion: 2 }, legacyUnconfirmed: false, earliestWeek: "2030-10-14" }))).toEqual({ kind: "unavailable" });
    expect(await read(new Response("<html>", { status: 200 }))).toEqual({ kind: "unavailable" });
  });
  it("the strict decoder accepts what the server writes and refuses what it would not", () => {
    expect(parseRestrictionsDocument(saved.document)).toEqual(saved.document);
    expect(() => parseRestrictionsDocument({ ...saved.document, versions: [{ ...saved.document.versions[0], effectiveWeek: "2030-10-08" }] })).toThrow();
    expect(() => parseRestrictionsDocument({ ...saved.document, versions: [{ ...saved.document.versions[0], unavailable: [{ dayOfWeek: 7, startTime: "00:00", endTime: "24:00" }] }] })).toThrow();
    expect(() => parseRestrictionsDocument({ ...saved.document, versions: [{ ...saved.document.versions[0], unavailable: [{ dayOfWeek: 1, startTime: "24:00", endTime: "24:00" }] }] })).toThrow();
    expect(() => parseRestrictionsDocument(null)).toThrow();
  });
});

describe("a command's answer is matched on status and state together", () => {
  const command = (response: Response | Error, sent: RestrictionsCommand = SET) => createRestrictionsClient(authority, async () => { if (response instanceof Error) throw response; return response; }).command("EMP-1", sent);
  it("saved: the receipt, the canonical document and whether this call changed it", async () => {
    expect(await command(json(200, { state: "saved", receipt: saved.receipt, data: saved.document, changed: true }))).toEqual({ kind: "saved", receipt: saved.receipt, snapshot: { document: saved.document, legacyUnconfirmed: false }, changed: true });
    // An exact replay answers with the first receipt and changed:false; it is still the saved result.
    expect(await command(json(200, { state: "saved", receipt: saved.receipt, data: saved.document, changed: false }))).toMatchObject({ kind: "saved", changed: false });
  });
  it("definite refusals", async () => {
    expect(await command(json(400, { state: "invalid" }))).toEqual({ kind: "invalid" });
    expect(await command(json(403, { state: "denied" }))).toEqual({ kind: "denied" });
    expect(await command(json(403, { state: "unavailable" }))).toEqual({ kind: "access" });
    expect(await command(json(401, { state: "unavailable" }))).toEqual({ kind: "signed_out" });
    expect(await command(json(409, { state: "conflict" }))).toEqual({ kind: "conflict" });
    expect(await command(json(409, { state: "capacity" }))).toEqual({ kind: "capacity" });
  });
  it("locked keeps the server's earliest week when it gives one, and asks for a fresh read when a race omits it", async () => {
    expect(await command(json(409, { state: "locked", earliestWeek: "2030-10-14" }))).toEqual({ kind: "locked", earliestWeek: "2030-10-14" });
    expect(await command(json(409, { state: "locked" }))).toEqual({ kind: "locked", earliestWeek: null });
    expect(await command(json(409, { state: "locked", earliestWeek: "2030-10-15" }))).toEqual({ kind: "locked", earliestWeek: null });
  });
  it("503 without an operation was never taken; it is not an unknown result", async () => {
    expect(await command(json(503, { state: "unavailable" }))).toEqual({ kind: "unsent" });
  });
  it("unknown is never failed and never saved: a lost reply, outcome_unknown, a mismatch or a body it cannot read", async () => {
    expect(await command(json(503, { state: "outcome_unknown", operationId: OP(1) }))).toEqual({ kind: "unknown" });
    expect(await command(new TypeError("Failed to fetch"))).toEqual({ kind: "unknown" });
    expect(await command(json(200, { state: "ready", data: saved.document }))).toEqual({ kind: "unknown" });
    expect(await command(json(409, { state: "saved" }))).toEqual({ kind: "unknown" });
    expect(await command(json(500, {}))).toEqual({ kind: "unknown" });
    expect(await command(new Response("gateway", { status: 502 }))).toEqual({ kind: "unknown" });
    // A receipt for another operation is not this command's result.
    expect(await command(json(200, { state: "saved", receipt: { ...saved.receipt, operationId: OP(2) }, data: saved.document, changed: true }))).toEqual({ kind: "unknown" });
  });
});
