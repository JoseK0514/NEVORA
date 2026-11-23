/* Owner roster import: from the contract's answers and codes to what the screen says and where it goes next. Pure
 * functions, so every code in docs/handoffs/2026-11-14-owner-simplicity.md has a tested sentence and a next step. */
import type { FieldError } from "@/lib/onboarding/contracts";
import type { RosterRow } from "@/lib/onboarding/roster";
import type { RosterImportCopy } from "./copy";
import { commitErrorRow, type ImportOutcome, type PreviewOutcome, type PreviewReady } from "./contract";

/** A problem with the whole list (the server's `text` and `request` codes, and the browser's own from table.ts). */
export function tableProblemText(copy: RosterImportCopy, code: string): string {
  const known: Record<string, string> = {
    EMPTY: copy.table.EMPTY, NO_ROWS: copy.table.NO_ROWS, TOO_MANY_ROWS: copy.table.TOO_MANY_ROWS, ROW_COUNT: copy.table.ROW_COUNT,
    TABLE_TOO_LARGE: copy.table.TABLE_TOO_LARGE, BODY_TOO_LARGE: copy.table.TABLE_TOO_LARGE, TOO_MANY_COLUMNS: copy.table.TOO_MANY_COLUMNS,
    MALFORMED_TABLE: copy.table.MALFORMED_TABLE, DUPLICATE_COLUMNS: copy.table.DUPLICATE_COLUMNS, REQUIRED_COLUMNS: copy.table.REQUIRED_COLUMNS,
  };
  return known[code] ?? copy.table.other;
}

/** One row error in plain words. `values` is the row as the server read it (an empty phone reads "missing", not "invalid"). */
export function rowProblemText(copy: RosterImportCopy, error: FieldError, values: Record<string, string> = {}): string {
  const p = copy.problems;
  switch (error.code) {
    case "REQUIRED": return error.field === "id" ? p.idMissing : error.field === "firstName" ? p.firstNameMissing : error.field === "lastName" ? p.lastNameMissing : p.other;
    case "INVALID_TEXT": return error.field === "id" ? p.idText : error.field === "firstName" ? p.firstNameText : error.field === "lastName" ? p.lastNameText : p.other;
    case "INVALID_PHONE": return values.phone ? p.phone : p.phoneMissing;
    case "INVALID_EMAIL": return p.email;
    case "DUPLICATE_ID": return p.duplicateId;
    case "DUPLICATE_EMAIL": return p.duplicateEmail;
    case "ID_IN_USE": return p.idInUse;
    case "EMAIL_IN_USE": return p.emailInUse;
    case "OWNER_NOT_IMPORTABLE": return p.owner;
    case "INVALID_ROLE": return p.role;
    case "MANAGER_SCOPE_REQUIRED": return p.managerScope;
    case "LOCATION_REQUIRED": return p.locationRequired;
    case "INVALID_LOCATIONS": return p.locations;
    case "INVALID_POSITIONS": return p.positions;
    case "LOCATION_UNAVAILABLE": return error.field === "initialManagerScope" ? p.scopeLocationUnavailable : p.locationUnavailable;
    case "POSITION_UNAVAILABLE": return p.positionUnavailable;
    case "COLUMN_COUNT": return p.columnCount;
    case "CANONICAL_VALIDATION_FAILED": return p.notAccepted;
    default: return p.other;
  }
}

/** Every problem on a row, once each, the preview's first and then any the import itself reported for that row. */
export function rowProblems(copy: RosterImportCopy, row: RosterRow, fromImport: FieldError[] = []): string[] {
  return [...new Set([...row.fieldErrors, ...fromImport].map(error => rowProblemText(copy, error, row.values)))];
}

export type EditorField = "id" | "firstName" | "lastName" | "phone" | "email" | "role" | "location";
/** The field of the row editor an error belongs to; null when the fix is somewhere else (Manager access, the list). */
export function editorField(error: FieldError): EditorField | null {
  switch (error.field) {
    case "id": case "firstName": case "lastName": case "phone": case "email": case "role": return error.field;
    case "primaryLocationId": return "location";
    case "eligibleLocationIds": return error.code === "LOCATION_UNAVAILABLE" ? "location" : null;
    default: return null;
  }
}

export type ImportLocation = { id: string; name: string };
/** A row the Owner took off the list while checking, and what was wrong with it (or that nothing was). */
export type RemovedRow = { rowNumber: number; name: string; why: string };

export type RowDisplay = { name: string; id: string; role: string; location: string; phone: string; email: string | null };
/** What a row shows: the person the server resolved when there is one, otherwise the cells as they were read. */
export function describeRow(copy: RosterImportCopy, row: RosterRow, locations: ImportLocation[], defaultLocationId: string): RowDisplay {
  const r = copy.review, e = row.person?.employee;
  const locationName = (id: string) => id ? locations.find(location => location.id === id)?.name ?? r.locationNotFound : r.noLocation;
  const roleKey = (e?.role ?? (row.values.role ?? "").toUpperCase()) || "EMPLOYEE";
  return {
    name: (e ? `${e.firstName} ${e.lastName}` : `${row.values.firstName ?? ""} ${row.values.lastName ?? ""}`).trim() || r.blank,
    id: e?.id ?? (row.values.id || r.blank),
    role: roleKey in r.roles ? r.roles[roleKey as keyof typeof r.roles] : row.values.role ?? "",
    location: locationName(e?.primaryLocationId ?? (row.values.primaryLocationId || defaultLocationId)),
    // Package X: a row that still needs a fix shows a 10-digit phone as the checked rows do (787-555-0144), not raw digits.
    phone: e?.phone ?? (shownPhone(row.values.phone) || r.blank),
    email: e ? e.email : row.values.email || null,
  };
}

/** What a notice's one button does. `recheck` asks for the preview again; `resend` sends the same import command again. */
export type NoticeAction = "recheck" | "resend" | "signin" | "reload" | "team" | "edit";
export type Notice = { kind: "failed" | "offline"; title: string; line: string; action: NoticeAction | null; actionLabel: string | null; billing?: string };
const notice = (text: { title: string; line: string; action?: string }, action: NoticeAction | null, extra: Partial<Notice> = {}): Notice =>
  ({ kind: "failed", title: text.title, line: text.line, action, actionLabel: text.action ?? null, ...extra });

export function offlineNotice(copy: RosterImportCopy, action: "recheck" | "resend"): Notice {
  return { kind: "offline", title: copy.offline.title, line: copy.offline.line, action, actionLabel: copy.refused.unavailable.action };
}

/** Where the screen goes after a preview answer. */
export type PreviewStep =
  | { to: "review"; preview: PreviewReady }
  | { to: "add"; field: "list" | "location"; text: string }
  | { to: "notice"; notice: Notice };
export function previewStep(copy: RosterImportCopy, outcome: PreviewOutcome): PreviewStep {
  const f = copy.refused;
  switch (outcome.kind) {
    case "ready": return { to: "review", preview: outcome.preview };
    case "invalid": {
      const code = outcome.errors[0]?.code ?? "";
      return code === "INVALID_DEFAULTS" ? { to: "add", field: "location", text: copy.table.defaults } : { to: "add", field: "list", text: tableProblemText(copy, code) };
    }
    case "too_large": return { to: "add", field: "list", text: copy.table.TABLE_TOO_LARGE };
    case "signin": return { to: "notice", notice: notice(f.signin, "signin") };
    case "denied": return { to: "notice", notice: notice(f.denied, "reload") };
    case "limited": return { to: "notice", notice: notice(f.limited, "recheck") };
    // A preview writes nothing, so a conflict or an unreadable answer is only "couldn't check".
    case "conflict": case "unavailable": return { to: "notice", notice: notice(f.unavailable, "recheck") };
  }
}

/** Where the screen goes after an import answer. `keepCommand`: the next try must send the same command and operation
 * ID (the server has not given a final answer for it, or must not have it replaced); false means the list has to be
 * checked again and a new command made. `rowErrors`: problems the import reported for single rows, by row number. */
export type ImportStep =
  | { to: "done"; added: number }
  | { to: "unknown" }
  | { to: "review"; notice: Notice; keepCommand: boolean; rowErrors: Map<number, FieldError[]> };
export function importStep(copy: RosterImportCopy, outcome: ImportOutcome, preview: PreviewReady, billingHref: string | null = null): ImportStep {
  const f = copy.refused, none = new Map<number, FieldError[]>();
  const back = (text: Notice, keepCommand: boolean, rowErrors = none): ImportStep => ({ to: "review", notice: text, keepCommand, rowErrors });
  switch (outcome.kind) {
    case "saved": return { to: "done", added: outcome.createdEmployeeIds.length };
    case "unknown": return { to: "unknown" };
    case "signin": return back(notice(f.signin, "signin"), true);
    case "denied": return back(notice(f.denied, "reload"), true);
    case "limited": return back(notice(f.limited, "resend"), true);
    case "too_large": return back(notice(f.tooLarge, "edit"), false);
    case "conflict":
      return outcome.reason === "version_changed" ? back(notice(f.versionChanged, "recheck"), false) : back(notice(f.changedReplay, "team"), true);
    case "invalid": {
      const codes = new Set(outcome.errors.map(error => error.code));
      if (codes.has("EMPLOYEE_LIMIT")) return back(notice(f.employeeLimit, "edit", billingHref ? { billing: billingHref } : {}), false);
      if (codes.has("ID_OR_EMAIL_IN_USE")) return back(notice(f.inUse, "recheck"), false);
      if (codes.has("CATALOGUE_CHANGED")) return back(notice(f.catalogueChanged, "recheck"), false);
      const rowErrors = new Map<number, FieldError[]>();
      for (const error of outcome.errors) {
        const at = commitErrorRow(error, preview);
        if (at) rowErrors.set(at.rowNumber, [...(rowErrors.get(at.rowNumber) ?? []), { field: at.field, code: error.code }]);
      }
      // Rows the import named stay marked until the Owner fixes or removes them; the preview alone can't see why.
      return rowErrors.size ? back(notice(f.rowsNotAccepted, null), false, rowErrors) : back(notice(f.notAccepted, "recheck"), false);
    }
  }
}

/** A phone as typed, shown like a checked one when it is exactly 10 digits (787-555-0144); anything else as typed. */
export function shownPhone(raw: string | undefined): string {
  const digits = (raw ?? "").replace(/\D/g, "");
  return digits.length === 10 && !/[^\d\s().+-]/.test(raw ?? "") ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}` : raw ?? "";
}
