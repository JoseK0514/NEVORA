/* Owner roster import: the state of one import and everything that moves it, outside React.
 *
 * Why outside React: the page sits in ScopedReadFrame, which takes its content off the screen whenever the window loses
 * focus or the access check runs again (the Owner going to their spreadsheet for a phone number is enough). Held in a
 * component, the pasted list, the review and, worst, an import command whose answer has not arrived would be thrown
 * away. Held here, the screen comes back as it was, and a request that was out when the screen left still lands.
 *
 * Idempotency, as docs/handoffs/2026-11-14-owner-simplicity.md defines it: one import command (the reviewed people,
 * the preview's version and one new operation ID) is built once and kept as text. Every retry sends that same text, so
 * the server can only answer with the first result. A new command, with a new ID, is made only after the server has
 * given a final refusal and the list has been checked again. While the outcome is unknown (a dropped connection,
 * HTTP 202, a service failure) only "Check again" is offered, and nothing says the import failed. */
import type { FieldError } from "@/lib/onboarding/contracts";
import type { RosterImportCopy } from "./copy";
import { IMPORT_PATH, PREVIEW_PATH, canConfirm, importBody, previewBody, readImportResponse, readPreviewResponse, summarizePreview,
  type PreviewReady, type RosterDefaults } from "./contract";
import { describeRow, importStep, offlineNotice, previewStep, rowProblems, tableProblemText, type ImportLocation, type Notice, type NoticeAction, type RemovedRow } from "./messages";
import { ROSTER_MAX_BODY_BYTES, peopleCount, readTable, removeRow, serializeGrid, updateRow, utf8Bytes, type Grid, type RosterField } from "./table";

export type Phase = "add" | "review" | "importing" | "unknown" | "done";
export type Answer = { status: number; body: unknown };
/** What the page gives every action: its words, the company's active locations, and billing where it exists. */
export type ImportContext = { copy: RosterImportCopy; locations: ImportLocation[]; billingHref: string | null };
/** The outside world, so tests can stand in for the network and the browser. `post` resolves null when no answer came. */
export type ImportDeps = {
  post: (path: string, body: string) => Promise<Answer | null>;
  offline: () => boolean;
  newOperationId: () => string;
  focus: (id: string) => void;
};

export type ImportState = {
  phase: Phase;
  text: string; fileNote: string | null; listError: string | null;
  /** Null until the Owner chooses; the screen then offers the company's only location, if it has just one. */
  locationId: string | null; locationError: string | null;
  scopeChoice: string;
  /** The list as it now stands (after fixes and removals), and whether it differs from what was typed. */
  grid: Grid | null; edited: boolean;
  preview: PreviewReady | null;
  /** The list changed and its check has not come back: the review on screen is of the list as it was. */
  stale: boolean;
  rowErrors: Map<number, FieldError[]>;
  removed: RemovedRow[];
  editing: number | null;
  notice: Notice | null;
  busy: boolean;
  live: string;
  sending: number;
  unknownNote: string | null;
  result: { added: number; withoutEmail: number };
};

export const TITLE_ID = "roster-import-title";
const initial = (): ImportState => ({
  phase: "add", text: "", fileNote: null, listError: null, locationId: null, locationError: null, scopeChoice: "", grid: null, edited: false,
  preview: null, stale: false, rowErrors: new Map(), removed: [], editing: null, notice: null, busy: false, live: "", sending: 0, unknownNote: null,
  result: { added: 0, withoutEmail: 0 },
});
/** The state before anything was typed (also what the server renders). */
export const EMPTY_IMPORT: ImportState = initial();

export function locationFor(state: ImportState, locations: ImportLocation[]): string {
  return state.locationId ?? (locations.length === 1 ? locations[0].id : "");
}
function defaultsFor(locationId: string, scopeChoice: string): RosterDefaults {
  return {
    ...(locationId ? { primaryLocationId: locationId } : {}),
    ...(scopeChoice === "COMPANY" ? { initialManagerScope: { mode: "COMPANY" as const, locationIds: [] } }
      : scopeChoice.startsWith("LOCATION:") ? { initialManagerScope: { mode: "LOCATIONS" as const, locationIds: [scopeChoice.slice("LOCATION:".length)] } } : {}),
  };
}
/** The server's `valid`, a review of the list as it stands, and no row the import itself refused. */
export function confirmable(state: ImportState): boolean {
  return !!state.preview && !state.stale && canConfirm(state.preview) && state.rowErrors.size === 0;
}

export type ImportStore = ReturnType<typeof createImportStore>;
export function createImportStore(deps: ImportDeps) {
  let state = initial();
  const listeners = new Set<() => void>();
  /** The last check asked for, so "Try again" repeats exactly it. */
  let lastCheck: { grid: Grid; scope: string; removing: RemovedRow | null; focus: string } | null = null;
  /** The one import command, kept until the server gives a final answer for it. */
  let command: { body: string; people: number; withoutEmail: number } | null = null;
  const set = (patch: Partial<ImportState>) => { state = { ...state, ...patch }; for (const listener of listeners) listener(); };

  /** Back to step 1 with the list as it stands and the reason under the field it belongs to. */
  function toAdd(current: Grid | null, field: "list" | "location" | null, message: string | null) {
    command = null;
    set({
      ...(current && state.edited ? { text: serializeGrid(current), fileNote: null } : {}), edited: false,
      phase: "add", stale: false, preview: null, rowErrors: new Map(), editing: null, notice: null, busy: false, live: message ?? "",
      listError: field === "list" ? message : null, locationError: field === "location" ? message : null,
    });
    deps.focus(field === "location" ? "rimp-location" : field === "list" ? "rimp-list" : TITLE_ID);
  }

  async function check(ctx: ImportContext, grid: Grid, scope: string, removing: RemovedRow | null, focus: string) {
    const { copy } = ctx;
    lastCheck = { grid, scope, removing, focus };
    // The list is kept as the Owner left it even if this check fails, so a second fix builds on the first.
    set({ grid, stale: true, notice: null });
    if (deps.offline()) { set({ notice: offlineNotice(copy, "recheck") }); return; }
    const body = previewBody(serializeGrid(grid), defaultsFor(locationFor(state, ctx.locations), scope));
    if (utf8Bytes(body) > ROSTER_MAX_BODY_BYTES) { toAdd(grid, "list", copy.table.TABLE_TOO_LARGE); return; }
    set({ busy: true, live: copy.review.checking });
    const answer = await deps.post(PREVIEW_PATH, body);
    if (!answer && deps.offline()) { set({ busy: false, live: copy.offline.title, notice: offlineNotice(copy, "recheck") }); return; }
    const step = previewStep(copy, answer ? readPreviewResponse(answer.status, answer.body) : { kind: "unavailable" });
    if (step.to === "notice") { set({ busy: false, live: "", notice: step.notice }); return; }
    if (step.to === "add") { toAdd(grid, step.field, step.text); return; }
    // A new review replaces the old one, and with it any command made from the old one.
    command = null;
    const summary = summarizePreview(step.preview);
    set({
      busy: false, stale: false, scopeChoice: scope, preview: step.preview, rowErrors: new Map(), editing: null, phase: "review",
      removed: removing ? [...state.removed.filter(row => row.rowNumber !== removing.rowNumber), removing] : state.removed,
      live: copy.review.summary(summary.ready, summary.needFix),
    });
    deps.focus(focus);
  }

  function checkList(ctx: ImportContext) {
    const { copy } = ctx, read = readTable(state.text);
    if (!read.ok) { set({ locationError: null, listError: tableProblemText(copy, read.problem) }); deps.focus("rimp-list"); return Promise.resolve(); }
    if (!locationFor(state, ctx.locations) && !read.fields.includes("primaryLocationId")) { set({ listError: null, locationError: copy.table.locationRequired }); deps.focus("rimp-location"); return Promise.resolve(); }
    set({ listError: null, locationError: null });
    return check(ctx, read.grid, state.scopeChoice, null, TITLE_ID);
  }

  async function send(ctx: ImportContext) {
    const { copy } = ctx, preview = state.preview, recovering = state.phase === "unknown";
    if (!preview || state.busy || (!recovering && state.stale)) return;
    if (!command) {
      const body = confirmable(state) ? importBody(preview, deps.newOperationId()) : null;
      if (!body) return;
      command = { body, people: preview.rows.length, withoutEmail: summarizePreview(preview).withoutEmail };
    }
    const sent = command;
    // Offline while recovering: the card already says so (it follows the connection); nothing is sent.
    if (deps.offline()) { if (!recovering) set({ notice: offlineNotice(copy, "resend") }); return; }
    set({ notice: null, busy: true, editing: null, sending: sent.people, live: recovering ? copy.unknown.busy : copy.importing.title(sent.people),
      ...(recovering ? {} : { phase: "importing" as const, unknownNote: null }) });
    if (!recovering) deps.focus(TITLE_ID);
    const answer = await deps.post(IMPORT_PATH, sent.body);
    const outcome = answer ? readImportResponse(answer.status, answer.body) : { kind: "unknown" as const };
    const step = importStep(copy, outcome, preview, ctx.billingHref);
    // While recovering, an answer that isn't final (the session ended, too many tries) says nothing about the first
    // attempt: the outcome stays unknown and the same command stays ready.
    if (step.to === "unknown" || (recovering && step.to === "review" && step.keepCommand)) {
      set({ busy: false, phase: "unknown", live: copy.unknown.title, unknownNote: outcome.kind === "signin" ? copy.unknown.signin : null });
      if (!recovering) deps.focus(TITLE_ID);
      return;
    }
    if (step.to === "done") {
      command = null;
      set({ busy: false, phase: "done", result: { added: step.added, withoutEmail: sent.withoutEmail }, live: copy.done.title(step.added) });
      deps.focus("rimp-done");
      return;
    }
    if (!step.keepCommand) command = null;
    // "Check list again" on this notice checks the list as it stands.
    if (state.grid) lastCheck = { grid: state.grid, scope: state.scopeChoice, removing: null, focus: "rimp-summary" };
    set({ busy: false, phase: "review", rowErrors: step.rowErrors, live: "", notice: step.notice });
    deps.focus(TITLE_ID);
  }

  return {
    get: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    /** The command's text, for tests: what would be sent again. */
    pendingCommand: () => command?.body ?? null,

    setText(text: string) { set({ text, edited: false, removed: [], fileNote: null, listError: null }); },
    setLocation(locationId: string) { set({ locationId, locationError: null }); },
    setEditing(rowNumber: number | null) { set({ editing: rowNumber }); },
    /** A chosen file, already read: its text, or null when it could not be read as a list. */
    loadFile(ctx: ImportContext, name: string, text: string | null, tooLarge = false) {
      if (text === null) { set({ fileNote: null, listError: tooLarge ? ctx.copy.table.TABLE_TOO_LARGE : ctx.copy.add.uploadFailed }); deps.focus("rimp-list"); return; }
      set({ text, edited: false, removed: [], listError: null, fileNote: ctx.copy.add.loaded(name) });
    },
    checkList,
    editList() { toAdd(state.grid, null, null); },
    saveRow(ctx: ImportContext, rowNumber: number, changes: Partial<Record<RosterField, string>>) {
      if (!state.grid) return Promise.resolve();
      set({ edited: true });
      return check(ctx, updateRow(state.grid, rowNumber, changes), state.scopeChoice, null, `rimp-r${rowNumber}-change`);
    },
    removeRow(ctx: ImportContext, rowNumber: number) {
      const row = state.preview?.rows.find(one => one.rowNumber === rowNumber);
      if (!state.grid || !row) return Promise.resolve();
      const why = rowProblems(ctx.copy, row, state.rowErrors.get(rowNumber)).join(" ") || ctx.copy.done.removedByYou;
      const removing = { rowNumber, name: describeRow(ctx.copy, row, ctx.locations, locationFor(state, ctx.locations)).name, why };
      const next = removeRow(state.grid, rowNumber);
      if (!peopleCount(next)) { set({ text: "", fileNote: null, removed: [], edited: false }); toAdd(null, "list", ctx.copy.table.NO_ROWS); return Promise.resolve(); }
      set({ edited: true });
      return check(ctx, next, state.scopeChoice, removing, "rimp-summary");
    },
    setScope(ctx: ImportContext, choice: string) {
      return state.grid ? check(ctx, state.grid, choice, null, "rimp-scope") : Promise.resolve();
    },
    send,
    /** A notice's button. Reload, sign-in and Team are links or the page's own; these are the ones that act here. */
    act(ctx: ImportContext, action: NoticeAction) {
      if (action === "edit") { toAdd(state.grid, null, null); return Promise.resolve(); }
      if (action === "resend") return send(ctx);
      if (action !== "recheck") return Promise.resolve();
      return state.phase === "add" || !lastCheck ? checkList(ctx) : check(ctx, lastCheck.grid, lastCheck.scope, lastCheck.removing, lastCheck.focus);
    },
    /** A new import after one is saved. Never while an outcome is unknown: that command must stay. */
    startOver() {
      if (state.phase === "importing" || state.phase === "unknown") return;
      command = null; lastCheck = null;
      state = initial();
      for (const listener of listeners) listener();
      deps.focus(TITLE_ID);
    },
  };
}
