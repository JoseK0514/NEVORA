// Owner roster import: the routes' answers (docs/handoffs/2026-11-14-owner-simplicity.md) read into what the screen
// shows. Preview rows come from the server's own parser; command results from its v1 fixtures. Fictional data only.
import { describe, expect, it } from "vitest";
import { parseRosterTable } from "@/lib/onboarding/roster";
import { onboardingHttpStatus, type OnboardingResult } from "@/lib/onboarding/contracts";
import { commandResults } from "@/lib/onboarding/fixtures/v1/command-results";
import { rosterImportCopy } from "./copy";
import { canConfirm, commitErrorRow, headcountsAfter, headcountsOf, importBody, newOperationId, previewBody, readImportResponse, readPreviewResponse,
  summarizePreview, type PreviewReady } from "./contract";
import { describeRow, editorField, importStep, offlineNotice, previewStep, rowProblemText, rowProblems, tableProblemText } from "./messages";

const copy = rosterImportCopy.en;
const HEADER = "id,firstName,lastName,phone,email,role";
const OPERATION = "59f60420-ec96-455a-9292-0b1a416509e9";
const locations = [{ id: "cafe", name: "Café" }, { id: "bakery", name: "Bakery" }];

/** What POST /api/onboarding/roster/preview returns for a table: the parser's review plus the setup version. */
function previewResponse(lines: string[], defaults: Record<string, unknown> = { primaryLocationId: "cafe" }) {
  const parsed = parseRosterTable({ format: "csv", text: [HEADER, ...lines].join("\n"), defaults });
  if (parsed.state !== "ready") throw Error("the parser refused the fixture");
  return JSON.parse(JSON.stringify({ ...parsed, schemaVersion: 1, expectedVersion: "7" })) as unknown;
}
function ready(lines: string[], defaults?: Record<string, unknown>): PreviewReady {
  const outcome = readPreviewResponse(200, previewResponse(lines, defaults));
  if (outcome.kind !== "ready") throw Error(`not a review: ${outcome.kind}`);
  return outcome.preview;
}
const GOOD = ["E-1,Ana,Pérez,7875550101,ana@example.invalid,", "E-2,Luis,Rivera,7875550102,,LEAD"];
const fixture = (name: string) => { const found = commandResults.find(item => item.name === name); if (!found) throw Error(name); return found; };

describe("reading the preview answer", () => {
  it("reads a valid review: every person, the version, nothing to fix", () => {
    const preview = ready(GOOD);
    expect(preview.expectedVersion).toBe("7");
    expect(preview.rows.map(row => row.person?.employee.id)).toEqual(["E-1", "E-2"]);
    expect(canConfirm(preview)).toBe(true);
    expect(summarizePreview(preview)).toEqual({ total: 2, ready: 2, needFix: 0, withoutEmail: 1, managers: 0, needsManagerScope: false });
  });
  it("reads an invalid review as a review (HTTP 200), and blocks confirmation", () => {
    const preview = ready([...GOOD, "E-1,Otra,Persona,nope,not-an-email,", "E-4,Mara,Gerente,7875550104,m@example.invalid,MANAGER"]);
    expect(canConfirm(preview)).toBe(false);
    expect(summarizePreview(preview)).toMatchObject({ total: 4, ready: 2, needFix: 2, managers: 1, needsManagerScope: true });
    expect(importBody(preview, OPERATION)).toBeNull();
  });
  it("does not trust `valid` over the rows: a row error or a missing person still blocks", () => {
    const body = previewResponse([...GOOD, "E-3,,Sin Nombre,7875550103,,"]) as { valid: boolean };
    body.valid = true;
    const outcome = readPreviewResponse(200, body);
    expect(outcome.kind === "ready" && canConfirm(outcome.preview)).toBe(false);
  });
  it.each([
    ["no body", 200, undefined], ["an empty object", 200, {}], ["rows missing", 200, { state: "ready", schemaVersion: 1, expectedVersion: "7", valid: true, ignoredColumns: [] }],
    ["an empty review", 200, { state: "ready", schemaVersion: 1, expectedVersion: "7", valid: true, ignoredColumns: [], rows: [] }],
    ["another schema", 200, { ...(previewResponse(GOOD) as object), schemaVersion: 2 }],
    ["a version that is not a revision", 200, { ...(previewResponse(GOOD) as object), expectedVersion: "latest" }],
    ["a service failure", 503, { state: "unavailable", reasonCode: "SOURCE_UNAVAILABLE" }], ["a wrong method", 405, { state: "unavailable" }], ["an HTML error page", 502, undefined],
  ])("never turns %s into an empty list or a review", (_name, status, body) => {
    expect(readPreviewResponse(status, body)).toEqual({ kind: "unavailable" });
  });
  it("reads the stated refusals", () => {
    expect(readPreviewResponse(400, { state: "invalid", fieldErrors: [{ field: "text", code: "REQUIRED_COLUMNS" }] })).toEqual({ kind: "invalid", errors: [{ field: "text", code: "REQUIRED_COLUMNS" }] });
    expect(readPreviewResponse(401, { state: "unavailable", reasonCode: "AUTH_REQUIRED" })).toEqual({ kind: "signin" });
    expect(readPreviewResponse(403, { state: "unavailable", reasonCode: "ACCESS_DENIED" })).toEqual({ kind: "denied" });
    expect(readPreviewResponse(413, { state: "invalid", fieldErrors: [{ field: "request", code: "BODY_TOO_LARGE" }] })).toEqual({ kind: "too_large" });
    expect(readPreviewResponse(415, { state: "invalid", fieldErrors: [{ field: "request", code: "JSON_REQUIRED" }] })).toEqual({ kind: "invalid", errors: [{ field: "request", code: "JSON_REQUIRED" }] });
    expect(readPreviewResponse(429, { state: "limited", retryAfterMs: 3000 })).toEqual({ kind: "limited", retryAfterMs: 3000 });
  });
});

describe("where the screen goes after a preview", () => {
  it("opens the review", () => {
    const step = previewStep(copy, readPreviewResponse(200, previewResponse(GOOD)));
    expect(step.to).toBe("review");
  });
  it.each([
    ["REQUIRED_COLUMNS", copy.table.REQUIRED_COLUMNS], ["MALFORMED_TABLE", copy.table.MALFORMED_TABLE], ["DUPLICATE_COLUMNS", copy.table.DUPLICATE_COLUMNS],
    ["TABLE_TOO_LARGE", copy.table.TABLE_TOO_LARGE], ["ROW_COUNT", copy.table.ROW_COUNT], ["INVALID_TABLE", copy.table.other], ["INVALID_JSON", copy.table.other],
  ])("puts %s under the Staff list field", (code, text) => {
    expect(previewStep(copy, { kind: "invalid", errors: [{ field: "text", code }] })).toEqual({ to: "add", field: "list", text });
  });
  it("puts a refused default under the location, and a too-large request under the list", () => {
    expect(previewStep(copy, { kind: "invalid", errors: [{ field: "text", code: "INVALID_DEFAULTS" }] })).toEqual({ to: "add", field: "location", text: copy.table.defaults });
    expect(previewStep(copy, { kind: "too_large" })).toEqual({ to: "add", field: "list", text: copy.table.TABLE_TOO_LARGE });
  });
  it("says what to do next for each refusal, and keeps the list", () => {
    expect(previewStep(copy, { kind: "unavailable" })).toMatchObject({ to: "notice", notice: { title: copy.refused.unavailable.title, action: "recheck" } });
    expect(previewStep(copy, { kind: "signin" })).toMatchObject({ to: "notice", notice: { title: copy.refused.signin.title, action: "signin" } });
    expect(previewStep(copy, { kind: "denied" })).toMatchObject({ to: "notice", notice: { action: "reload" } });
    expect(previewStep(copy, { kind: "limited", retryAfterMs: null })).toMatchObject({ to: "notice", notice: { action: "recheck" } });
    expect(offlineNotice(copy, "recheck")).toMatchObject({ kind: "offline", title: copy.offline.title, action: "recheck" });
  });
  it("has a sentence for every table problem the browser finds itself", () => {
    for (const code of ["EMPTY", "NO_ROWS", "TOO_MANY_ROWS", "TOO_MANY_COLUMNS", "TABLE_TOO_LARGE", "MALFORMED_TABLE", "DUPLICATE_COLUMNS", "REQUIRED_COLUMNS"]) expect(tableProblemText(copy, code)).not.toBe(copy.table.other);
  });
});

describe("row problems in plain words", () => {
  const p = copy.problems;
  it.each([
    [{ field: "id", code: "REQUIRED" }, p.idMissing], [{ field: "firstName", code: "REQUIRED" }, p.firstNameMissing], [{ field: "lastName", code: "REQUIRED" }, p.lastNameMissing],
    [{ field: "id", code: "INVALID_TEXT" }, p.idText], [{ field: "firstName", code: "INVALID_TEXT" }, p.firstNameText], [{ field: "lastName", code: "INVALID_TEXT" }, p.lastNameText],
    [{ field: "email", code: "INVALID_EMAIL" }, p.email], [{ field: "id", code: "DUPLICATE_ID" }, p.duplicateId], [{ field: "email", code: "DUPLICATE_EMAIL" }, p.duplicateEmail],
    [{ field: "id", code: "ID_IN_USE" }, p.idInUse], [{ field: "email", code: "EMAIL_IN_USE" }, p.emailInUse], [{ field: "role", code: "OWNER_NOT_IMPORTABLE" }, p.owner],
    [{ field: "role", code: "INVALID_ROLE" }, p.role], [{ field: "initialManagerScope", code: "MANAGER_SCOPE_REQUIRED" }, p.managerScope],
    [{ field: "primaryLocationId", code: "LOCATION_REQUIRED" }, p.locationRequired], [{ field: "eligibleLocationIds", code: "INVALID_LOCATIONS" }, p.locations],
    [{ field: "positionIds", code: "INVALID_POSITIONS" }, p.positions], [{ field: "eligibleLocationIds", code: "LOCATION_UNAVAILABLE" }, p.locationUnavailable],
    [{ field: "initialManagerScope", code: "LOCATION_UNAVAILABLE" }, p.scopeLocationUnavailable], [{ field: "positionIds", code: "POSITION_UNAVAILABLE" }, p.positionUnavailable],
    [{ field: "row", code: "COLUMN_COUNT" }, p.columnCount], [{ field: "phone", code: "CANONICAL_VALIDATION_FAILED" }, p.notAccepted], [{ field: "row", code: "SOMETHING_NEW" }, p.other],
  ])("%o", (error, text) => expect(rowProblemText(copy, error)).toBe(text));
  it("says a phone is missing when the cell is empty, and not valid when it is not", () => {
    expect(rowProblemText(copy, { field: "phone", code: "INVALID_PHONE" }, { phone: "" })).toBe(p.phoneMissing);
    expect(rowProblemText(copy, { field: "phone", code: "INVALID_PHONE" }, { phone: "555" })).toBe(p.phone);
  });
  it("lists a real row's problems once each, the import's own after the preview's", () => {
    const row = ready([...GOOD, "E-1,,Persona,nope,not-an-email,OWNER"]).rows[2];
    expect(rowProblems(copy, row)).toEqual([p.firstNameMissing, p.phone, p.email, p.duplicateId, p.owner]);
    expect(rowProblems(copy, row, [{ field: "phone", code: "CANONICAL_VALIDATION_FAILED" }, { field: "id", code: "DUPLICATE_ID" }])).toHaveLength(6);
  });
  it("ties each error to the field that fixes it", () => {
    expect(editorField({ field: "phone", code: "INVALID_PHONE" })).toBe("phone");
    expect(editorField({ field: "primaryLocationId", code: "LOCATION_REQUIRED" })).toBe("location");
    expect(editorField({ field: "eligibleLocationIds", code: "LOCATION_UNAVAILABLE" })).toBe("location");
    expect(editorField({ field: "initialManagerScope", code: "MANAGER_SCOPE_REQUIRED" })).toBeNull();
    expect(editorField({ field: "row", code: "COLUMN_COUNT" })).toBeNull();
  });
  it("shows what a row resolved to, or the cells as read when it did not resolve", () => {
    const preview = ready([...GOOD, "e-3,,Sin Nombre,nope,,", "E-4,Eva,Soto,7875550104,,"], { primaryLocationId: "bakery" });
    expect(describeRow(copy, preview.rows[0], locations, "bakery")).toEqual({ name: "Ana Pérez", id: "E-1", role: "Employee", location: "Bakery", phone: "787-555-0101", email: "ana@example.invalid" });
    expect(describeRow(copy, preview.rows[1], locations, "bakery")).toMatchObject({ role: "Lead", email: null });
    expect(describeRow(copy, preview.rows[2], locations, "bakery")).toEqual({ name: "Sin Nombre", id: "e-3", role: "Employee", location: "Bakery", phone: "nope", email: null });
    expect(describeRow(copy, preview.rows[3], [], "")).toMatchObject({ location: copy.review.locationNotFound });
  });
});

describe("the three headcounts", () => {
  const team = [{ active: true, role: "OWNER" }, { active: true, role: "MANAGER" }, { active: true, role: "LEAD" }, { active: true, role: "EMPLOYEE" }, { active: false, role: "EMPLOYEE" }];
  it("counts three different groups and never forces them to agree", () => {
    expect(headcountsOf(team)).toEqual({ activePeople: 4, availabilityEligible: 2, planCount: 3 });
  });
  it("adds only the rows that are ready, each to the groups it belongs to", () => {
    const preview = ready([...GOOD, "E-3,Mara,Gerente,7875550103,,MANAGER", "E-4,,Falta,7875550104,,"], { primaryLocationId: "cafe", initialManagerScope: { mode: "COMPANY", locationIds: [] } });
    expect(headcountsAfter(headcountsOf(team), preview)).toEqual({ activePeople: 7, availabilityEligible: 4, planCount: 6 });
    expect(headcountsAfter(headcountsOf(team), null)).toEqual(headcountsOf(team));
  });
});

describe("the requests", () => {
  it("sends the table as CSV with only the defaults the Owner chose", () => {
    expect(JSON.parse(previewBody("id\nE-1", {}))).toEqual({ schemaVersion: 1, format: "csv", text: "id\nE-1" });
    expect(JSON.parse(previewBody("id\nE-1", { primaryLocationId: "cafe", initialManagerScope: { mode: "LOCATIONS", locationIds: ["cafe"] } })))
      .toEqual({ schemaVersion: 1, format: "csv", text: "id\nE-1", defaults: { primaryLocationId: "cafe", initialManagerScope: { mode: "LOCATIONS", locationIds: ["cafe"] } } });
  });
  it("builds the confirm command from the reviewed person objects, the preview's version and one operation ID", () => {
    const preview = ready([...GOOD, "E-3,Mara,Gerente,7875550103,,MANAGER"], { primaryLocationId: "cafe", initialManagerScope: { mode: "COMPANY", locationIds: [] } });
    const command = JSON.parse(importBody(preview, OPERATION) ?? "null");
    expect(Object.keys(command).sort()).toEqual(["expectedVersion", "operationId", "payload", "schemaVersion"]);
    expect(command).toMatchObject({ schemaVersion: 1, operationId: OPERATION, expectedVersion: "7" });
    expect(command.payload.people).toEqual(preview.rows.map(row => row.person));
    expect(command.payload.people[0]).toEqual({ employee: { id: "E-1", firstName: "Ana", lastName: "Pérez", phone: "787-555-0101", email: "ana@example.invalid", role: "EMPLOYEE", primaryLocationId: "cafe", eligibleLocationIds: ["cafe"], positionIds: [] } });
    expect(command.payload.people[2].initialManagerScope).toEqual({ mode: "COMPANY", locationIds: [] });
    // The same text every time: a retry is byte for byte the first request.
    expect(importBody(preview, OPERATION)).toBe(importBody(preview, OPERATION));
  });
  it("makes operation IDs in the contract's UUID form, a new one each time", () => {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    expect(newOperationId()).toMatch(uuid);
    expect(newOperationId()).not.toBe(newOperationId());
    expect(newOperationId({ getRandomValues: crypto.getRandomValues.bind(crypto) })).toMatch(uuid);
  });
});

describe("reading the import answer", () => {
  const preview = ready(GOOD);
  const saved = { ...fixture("recovered-saved").result, createdEmployeeIds: ["E-1", "E-2"] };
  it("is saved only on HTTP 200 with state saved", () => {
    expect(readImportResponse(200, saved)).toEqual({ kind: "saved", createdEmployeeIds: ["E-1", "E-2"] });
    expect(importStep(copy, readImportResponse(200, saved), preview)).toEqual({ to: "done", added: 2 });
  });
  it.each([
    ["HTTP 202 outcome_unknown", fixture("outcome-unknown").http, fixture("outcome-unknown").result], ["HTTP 202 pending", fixture("pending").http, fixture("pending").result],
    ["a service failure", fixture("unavailable").http, fixture("unavailable").result], ["a gateway error page", 504, undefined], ["HTTP 200 without a body", 200, undefined],
    ["a saved answer without the people", 200, fixture("recovered-saved").result], ["HTTP 200 with another state", 200, { state: "ready" }], ["a wrong method", 405, { state: "unavailable" }],
  ])("leaves the outcome unknown for %s, never success and never failure", (_name, status, body) => {
    expect(readImportResponse(status, body)).toEqual({ kind: "unknown" });
    expect(importStep(copy, readImportResponse(status, body), preview)).toEqual({ to: "unknown" });
  });
  it("uses the HTTP status the contract gives each result", () => {
    for (const { http, result } of commandResults) expect(onboardingHttpStatus(result as OnboardingResult)).toBe(http);
  });
  it("a changed setup means check again and make a new command", () => {
    const step = importStep(copy, readImportResponse(fixture("stale").http, fixture("stale").result), preview);
    expect(step).toMatchObject({ to: "review", keepCommand: false, notice: { title: copy.refused.versionChanged.title, action: "recheck" } });
  });
  it("a changed replay is never replaced: the command is kept and the Owner is sent to Team", () => {
    const step = importStep(copy, readImportResponse(fixture("changed-replay").http, fixture("changed-replay").result), preview);
    expect(step).toMatchObject({ to: "review", keepCommand: true, notice: { title: copy.refused.changedReplay.title, action: "team" } });
  });
  it("an ended session, a denial and a rate limit keep the same command for the next try", () => {
    expect(importStep(copy, readImportResponse(fixture("expired-session").http, fixture("expired-session").result), preview)).toMatchObject({ to: "review", keepCommand: true, notice: { action: "signin" } });
    expect(importStep(copy, readImportResponse(fixture("denied").http, fixture("denied").result), preview)).toMatchObject({ to: "review", keepCommand: true, notice: { action: "reload" } });
    expect(importStep(copy, readImportResponse(fixture("limited").http, fixture("limited").result), preview)).toMatchObject({ to: "review", keepCommand: true, notice: { action: "resend" } });
  });
  it.each([
    ["EMPLOYEE_LIMIT", copy.refused.employeeLimit.title, "edit"], ["ID_OR_EMAIL_IN_USE", copy.refused.inUse.title, "recheck"],
    ["CATALOGUE_CHANGED", copy.refused.catalogueChanged.title, "recheck"], ["INVALID_ROSTER", copy.refused.notAccepted.title, "recheck"],
  ])("maps the commit code %s to a sentence and a next step", (code, title, action) => {
    const step = importStep(copy, readImportResponse(400, { state: "invalid", fieldErrors: [{ field: "people", code }] }), preview, "/app/billing");
    expect(step).toMatchObject({ to: "review", keepCommand: false, notice: { title, action } });
    if (step.to === "review") expect(step.notice.billing).toBe(code === "EMPLOYEE_LIMIT" ? "/app/billing" : undefined);
  });
  it("offers billing for the plan limit only where billing exists", () => {
    const step = importStep(copy, { kind: "invalid", errors: [{ field: "people", code: "EMPLOYEE_LIMIT" }] }, preview);
    expect(step.to === "review" && step.notice.billing).toBeUndefined();
  });
  it("marks the rows a commit refused, by the person's place in the command", () => {
    const errors = [{ field: "people.1.phone", code: "CANONICAL_VALIDATION_FAILED" }, { field: "people.1.email", code: "CANONICAL_VALIDATION_FAILED" }];
    expect(commitErrorRow(errors[0], preview)).toEqual({ rowNumber: 3, field: "phone" });
    expect(commitErrorRow({ field: "people", code: "INVALID_ROSTER" }, preview)).toBeNull();
    expect(commitErrorRow({ field: "people.9.phone", code: "CANONICAL_VALIDATION_FAILED" }, preview)).toBeNull();
    const step = importStep(copy, readImportResponse(400, { state: "invalid", fieldErrors: errors }), preview);
    expect(step).toMatchObject({ to: "review", keepCommand: false, notice: { title: copy.refused.rowsNotAccepted.title, action: null } });
    if (step.to === "review") expect(step.rowErrors.get(3)).toEqual([{ field: "phone", code: "CANONICAL_VALIDATION_FAILED" }, { field: "email", code: "CANONICAL_VALIDATION_FAILED" }]);
  });
  it("a request that is too large goes back to the list", () => {
    expect(importStep(copy, readImportResponse(413, { state: "invalid", fieldErrors: [{ field: "request", code: "BODY_TOO_LARGE" }] }), preview)).toMatchObject({ to: "review", keepCommand: false, notice: { action: "edit" } });
  });
});
