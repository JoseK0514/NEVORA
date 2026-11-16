// Owner roster import: one import from paste to saved, against a stand-in for the two routes. The preview answers come
// from the server's own parser; the import answers are the contract's states. Fictional data only.
import { describe, expect, it } from "vitest";
import { parseRosterTable } from "@/lib/onboarding/roster";
import { commandResults } from "@/lib/onboarding/fixtures/v1/command-results";
import { rosterImportCopy } from "./copy";
import { IMPORT_PATH, PREVIEW_PATH } from "./contract";
import { TITLE_ID, confirmable, createImportStore, locationFor, type Answer, type ImportContext } from "./session";

const copy = rosterImportCopy.en;
const ctx: ImportContext = { copy, locations: [{ id: "cafe", name: "Café" }, { id: "bakery", name: "Bakery" }], billingHref: null };
const HEADER = "ID\tFirst name\tLast name\tPhone\tEmail";
const GOOD = `${HEADER}\nE-1\tAna\tPérez\t787-555-0101\tana@example.invalid\nE-2\tLuis\tRivera\t7875550102\t`;
const ONE_BAD = `${GOOD}\nE-3\tEva\tSoto\tnope\t`;
const saved = (ids: string[]) => ({ status: 200, body: { ...commandResults.find(item => item.name === "recovered-saved")!.result, createdEmployeeIds: ids } });
const result = (name: string): Answer => { const found = commandResults.find(item => item.name === name)!; return { status: found.http, body: found.result }; };

/** The two routes. Preview parses what it is sent, as the server does; import answers from a script (null: no answer). */
function world(script: (Answer | null)[] = []) {
  const calls: { path: string; body: string }[] = [], focused: string[] = [];
  const env = { offline: false, version: 7, previewDown: false, ids: 0 };
  const store = createImportStore({
    offline: () => env.offline,
    newOperationId: () => `00000000-0000-4000-8000-${String(++env.ids).padStart(12, "0")}`,
    focus: id => { focused.push(id); },
    post: async (path, body) => {
      calls.push({ path, body });
      if (path === IMPORT_PATH) return script.length ? script.shift()! : null;
      if (env.previewDown) return null;
      const request = JSON.parse(body);
      const parsed = parseRosterTable({ format: request.format, text: request.text, ...(request.defaults ? { defaults: request.defaults } : {}) });
      return parsed.state === "ready" ? { status: 200, body: JSON.parse(JSON.stringify({ ...parsed, schemaVersion: 1, expectedVersion: String(env.version) })) } : { status: 400, body: parsed };
    },
  });
  const sent = (path: string) => calls.filter(call => call.path === path).map(call => call.body);
  return { store, env, calls, focused, previews: () => sent(PREVIEW_PATH), imports: () => sent(IMPORT_PATH) };
}
async function reviewed(text = GOOD, script: (Answer | null)[] = []) {
  const w = world(script);
  w.store.setText(text); w.store.setLocation("cafe");
  await w.store.checkList(ctx);
  return w;
}

describe("step 1 to step 2", () => {
  it("asks for the list and a location before any request is made", async () => {
    const w = world();
    await w.store.checkList(ctx);
    expect(w.store.get()).toMatchObject({ phase: "add", listError: copy.table.EMPTY });
    w.store.setText(GOOD);
    await w.store.checkList(ctx);
    expect(w.store.get()).toMatchObject({ phase: "add", listError: null, locationError: copy.table.locationRequired });
    expect(w.focused.slice(-1)).toEqual(["rimp-location"]);
    expect(w.calls).toHaveLength(0);
  });
  it("offers the company's only location without asking", () => {
    const w = world();
    expect(locationFor(w.store.get(), [ctx.locations[0]])).toBe("cafe");
    expect(locationFor(w.store.get(), ctx.locations)).toBe("");
  });
  it("sends the list as CSV with the chosen location and opens the review", async () => {
    const w = await reviewed();
    expect(JSON.parse(w.previews()[0])).toEqual({ schemaVersion: 1, format: "csv", text: "ID,First name,Last name,Phone,Email\nE-1,Ana,Pérez,787-555-0101,ana@example.invalid\nE-2,Luis,Rivera,7875550102,", defaults: { primaryLocationId: "cafe" } });
    expect(w.store.get()).toMatchObject({ phase: "review", busy: false, stale: false, live: "2 ready" });
    expect(confirmable(w.store.get())).toBe(true);
    expect(w.focused.slice(-1)).toEqual([TITLE_ID]);
  });
  it("puts the server's refusal under the list and keeps what was typed", async () => {
    const w = world();
    // A header the browser reads but the server's stricter rule refuses is still reported in plain words.
    w.store.setText(GOOD); w.store.setLocation("cafe"); w.env.previewDown = false;
    const original = w.store.get().text;
    w.env.offline = true;
    await w.store.checkList(ctx);
    expect(w.store.get()).toMatchObject({ phase: "add", text: original, notice: { kind: "offline", action: "recheck" } });
    expect(w.calls).toHaveLength(0);
    w.env.offline = false;
    await w.store.act(ctx, "recheck");
    expect(w.store.get().phase).toBe("review");
  });
  it("says it couldn't check when no answer comes, and tries the same check again", async () => {
    const w = world();
    w.store.setText(GOOD); w.store.setLocation("cafe"); w.env.previewDown = true;
    await w.store.checkList(ctx);
    expect(w.store.get()).toMatchObject({ phase: "add", busy: false, text: GOOD, notice: { title: copy.refused.unavailable.title, action: "recheck" } });
    w.env.previewDown = false;
    await w.store.act(ctx, "recheck");
    expect(w.store.get()).toMatchObject({ phase: "review", notice: null });
  });
});

describe("fixing the list in step 2", () => {
  it("blocks the import while a row needs a fix, then checks again after the fix", async () => {
    const w = await reviewed(ONE_BAD);
    expect(w.store.get().live).toBe("2 ready · 1 needs a fix");
    expect(confirmable(w.store.get())).toBe(false);
    await w.store.send(ctx);
    expect(w.imports()).toHaveLength(0);
    await w.store.saveRow(ctx, 4, { phone: "787-555-0103" });
    expect(w.store.get()).toMatchObject({ phase: "review", live: "3 ready", editing: null });
    expect(confirmable(w.store.get())).toBe(true);
    expect(w.focused.slice(-1)).toEqual(["rimp-r4-change"]);
  });
  it("keeps a fix whose check failed, will not import the old review, and repeats the check", async () => {
    const w = await reviewed(ONE_BAD);
    w.env.previewDown = true;
    await w.store.saveRow(ctx, 4, { phone: "787-555-0103" });
    expect(w.store.get()).toMatchObject({ phase: "review", stale: true, notice: { action: "recheck" } });
    expect(confirmable(w.store.get())).toBe(false);
    // A second fix builds on the first.
    await w.store.saveRow(ctx, 3, { email: "luis@example.invalid" });
    w.env.previewDown = false;
    await w.store.act(ctx, "recheck");
    const rows = w.store.get().preview!.rows;
    expect(rows.map(row => row.person?.employee.phone)).toEqual(["787-555-0101", "787-555-0102", "787-555-0103"]);
    expect(rows[1].person?.employee.email).toBe("luis@example.invalid");
    expect(confirmable(w.store.get())).toBe(true);
  });
  it("removes a row, remembers why, and keeps the other rows' numbers", async () => {
    const w = await reviewed(ONE_BAD);
    await w.store.removeRow(ctx, 4);
    expect(w.store.get().removed).toEqual([{ rowNumber: 4, name: "Eva Soto", why: copy.problems.phone }]);
    await w.store.removeRow(ctx, 2);
    expect(w.store.get().removed.map(row => [row.rowNumber, row.why])).toEqual([[4, copy.problems.phone], [2, copy.done.removedByYou]]);
    expect(w.store.get().preview!.rows.map(row => row.rowNumber)).toEqual([3]);
    await w.store.removeRow(ctx, 3);
    expect(w.store.get()).toMatchObject({ phase: "add", text: "", listError: copy.table.NO_ROWS, removed: [] });
  });
  it("shows the list as it now stands when the Owner goes back to edit it", async () => {
    const w = await reviewed(ONE_BAD);
    w.store.editList();
    expect(w.store.get()).toMatchObject({ phase: "add", text: ONE_BAD, preview: null });
    await w.store.checkList(ctx);
    await w.store.saveRow(ctx, 4, { phone: "787-555-0103" });
    w.store.editList();
    expect(w.store.get().text).toBe("ID,First name,Last name,Phone,Email\nE-1,Ana,Pérez,787-555-0101,ana@example.invalid\nE-2,Luis,Rivera,7875550102,\nE-3,Eva,Soto,787-555-0103,");
  });
  it("applies the Owner's Manager access choice and checks again", async () => {
    const w = await reviewed(`${HEADER}\tRole\nM-1\tMara\tGerente\t7875550101\t\tManager`);
    expect(w.store.get().preview!.rows[0].fieldErrors).toContainEqual({ field: "initialManagerScope", code: "MANAGER_SCOPE_REQUIRED" });
    await w.store.setScope(ctx, "LOCATION:bakery");
    expect(JSON.parse(w.previews()[1]).defaults).toEqual({ primaryLocationId: "cafe", initialManagerScope: { mode: "LOCATIONS", locationIds: ["bakery"] } });
    expect(w.store.get()).toMatchObject({ scopeChoice: "LOCATION:bakery" });
    expect(w.store.get().preview!.rows[0].person?.initialManagerScope).toEqual({ mode: "LOCATIONS", locationIds: ["bakery"] });
    expect(confirmable(w.store.get())).toBe(true);
  });
});

describe("step 3, import", () => {
  it("sends the reviewed people once and reports how many were added", async () => {
    const w = await reviewed(GOOD, [saved(["E-1", "E-2"])]);
    await w.store.send(ctx);
    const command = JSON.parse(w.imports()[0]);
    expect(command).toMatchObject({ schemaVersion: 1, operationId: "00000000-0000-4000-8000-000000000001", expectedVersion: "7" });
    expect(command.payload.people).toEqual(w.store.get().preview!.rows.map(row => row.person));
    expect(w.store.get()).toMatchObject({ phase: "done", busy: false, result: { added: 2, withoutEmail: 1 }, live: "2 people added" });
    expect(w.store.pendingCommand()).toBeNull();
    expect(w.focused.slice(-1)).toEqual(["rimp-done"]);
  });
  it("after a dropped connection, sends the very same command again and recovers the one result", async () => {
    const w = await reviewed(GOOD, [null, result("outcome-unknown"), result("unavailable"), saved(["E-1", "E-2"])]);
    await w.store.send(ctx);
    expect(w.store.get()).toMatchObject({ phase: "unknown", busy: false, live: copy.unknown.title, notice: null });
    const first = w.store.pendingCommand();
    for (let attempt = 0; attempt < 2; attempt++) { await w.store.send(ctx); expect(w.store.get().phase).toBe("unknown"); }
    await w.store.send(ctx);
    expect(w.store.get()).toMatchObject({ phase: "done", result: { added: 2 } });
    expect(w.imports()).toHaveLength(4);
    expect(new Set(w.imports())).toEqual(new Set([first]));
    // One operation ID was ever made.
    expect(w.env.ids).toBe(1);
  });
  it("while the outcome is unknown, an ended session is not read as a failure, and nothing else can start", async () => {
    const w = await reviewed(GOOD, [null, result("expired-session"), result("limited"), saved(["E-1", "E-2"])]);
    await w.store.send(ctx);
    await w.store.send(ctx);
    expect(w.store.get()).toMatchObject({ phase: "unknown", unknownNote: copy.unknown.signin, notice: null });
    w.store.startOver();
    expect(w.store.get().phase).toBe("unknown");
    await w.store.send(ctx);
    expect(w.store.get()).toMatchObject({ phase: "unknown", unknownNote: null });
    await w.store.send(ctx);
    expect(w.store.get().phase).toBe("done");
    expect(new Set(w.imports()).size).toBe(1);
  });
  it("offline while the outcome is unknown sends nothing", async () => {
    const w = await reviewed(GOOD, [null]);
    await w.store.send(ctx);
    w.env.offline = true;
    await w.store.send(ctx);
    expect(w.imports()).toHaveLength(1);
    expect(w.store.get().phase).toBe("unknown");
  });
  it("a retry that the server finally refuses means nothing was saved: back to the review", async () => {
    const w = await reviewed(GOOD, [null, result("stale")]);
    await w.store.send(ctx);
    await w.store.send(ctx);
    expect(w.store.get()).toMatchObject({ phase: "review", notice: { title: copy.refused.versionChanged.title, action: "recheck" } });
    expect(w.store.pendingCommand()).toBeNull();
  });
  it("after the setup changed, checks again and imports with a new command and the new version", async () => {
    const w = await reviewed(GOOD, [result("stale"), saved(["E-1", "E-2"])]);
    await w.store.send(ctx);
    w.env.version = 8;
    await w.store.act(ctx, "recheck");
    expect(w.store.get()).toMatchObject({ phase: "review", notice: null });
    await w.store.send(ctx);
    const [first, second] = w.imports().map(body => JSON.parse(body));
    expect([first.expectedVersion, second.expectedVersion]).toEqual(["7", "8"]);
    expect(second.operationId).not.toBe(first.operationId);
    expect(w.store.get().phase).toBe("done");
  });
  it("never replaces a changed replay: the same command stays, and the Owner is sent to Team", async () => {
    const w = await reviewed(GOOD, [result("changed-replay"), result("changed-replay")]);
    await w.store.send(ctx);
    expect(w.store.get()).toMatchObject({ phase: "review", notice: { action: "team" } });
    await w.store.send(ctx);
    expect(new Set(w.imports()).size).toBe(1);
  });
  it("marks the rows a commit refused and blocks the import until the list is checked again", async () => {
    const refused = { status: 400, body: { state: "invalid", fieldErrors: [{ field: "people.1.phone", code: "CANONICAL_VALIDATION_FAILED" }] } };
    const w = await reviewed(GOOD, [refused, saved(["E-1", "E-2"])]);
    await w.store.send(ctx);
    expect(w.store.get()).toMatchObject({ phase: "review", notice: { title: copy.refused.rowsNotAccepted.title, action: null } });
    expect(w.store.get().rowErrors.get(3)).toEqual([{ field: "phone", code: "CANONICAL_VALIDATION_FAILED" }]);
    expect(confirmable(w.store.get())).toBe(false);
    await w.store.send(ctx);
    expect(w.imports()).toHaveLength(1);
    await w.store.saveRow(ctx, 3, { phone: "787-555-0199" });
    expect(confirmable(w.store.get())).toBe(true);
    await w.store.send(ctx);
    expect(w.store.get().phase).toBe("done");
    expect(JSON.parse(w.imports()[1]).operationId).not.toBe(JSON.parse(w.imports()[0]).operationId);
  });
  it("over the plan's limit: nobody is added and the Owner goes back to the list", async () => {
    const w = await reviewed(GOOD, [{ status: 400, body: { state: "invalid", fieldErrors: [{ field: "people", code: "EMPLOYEE_LIMIT" }] } }]);
    await w.store.send({ ...ctx, billingHref: "/app/billing" });
    expect(w.store.get()).toMatchObject({ phase: "review", notice: { title: copy.refused.employeeLimit.title, action: "edit", billing: "/app/billing" } });
    await w.store.act(ctx, "edit");
    expect(w.store.get()).toMatchObject({ phase: "add", text: GOOD, notice: null });
  });
  it("ignores a second tap while the first request is out", async () => {
    const w = await reviewed(GOOD, [saved(["E-1", "E-2"])]);
    await Promise.all([w.store.send(ctx), w.store.send(ctx)]);
    expect(w.imports()).toHaveLength(1);
  });
  it("starts a clean import after one is saved", async () => {
    const w = await reviewed(GOOD, [saved(["E-1", "E-2"])]);
    await w.store.send(ctx);
    w.store.startOver();
    expect(w.store.get()).toMatchObject({ phase: "add", text: "", preview: null, removed: [], locationId: null });
  });
});
