"use client";
import { useViewLang } from "@/components/owner-b/use-owner-lang";

/* Owner roster import (docs/handoffs/2026-11-14-owner-simplicity.md): add your list, check it, import. The list is read
 * in the browser; POST /api/onboarding/roster/preview decides what is valid and writes nothing; POST
 * /api/onboarding/roster saves every reviewed person in one transaction or none. The state and the requests are in
 * session.ts; this component draws them inside the Add employee sheet frame. */
import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { FormHead, FormHeadBack, FormHeadLink } from "@/components/team/team-forms";
import { rosterImportCopy, type RosterImportLang } from "./copy";
import { newOperationId, type Headcounts } from "./contract";
import type { ImportLocation, NoticeAction } from "./messages";
import { EMPTY_IMPORT, TITLE_ID, confirmable, createImportStore, locationFor, type Answer, type ImportStore } from "./session";
import { decodeFile } from "./table";
import { AddListStep, DoneStep, ImportingStep, NoticeCard, ReviewStep, StepActions, UnknownStep } from "./views";

const TEAM_HREF = "/app/employees";
/** A CSV of 50 people is a few kilobytes; anything near this is not a staff list. */
const MAX_FILE_BYTES = 1024 * 1024;
/** How long an unfinished import is kept after its screen leaves (the access frame clears the page whenever the window
 * loses focus). An import that is out, or whose outcome is unknown, is kept until the page itself is closed. */
const KEEP_MS = 30 * 60 * 1000;

/** POST one JSON body to a roster route on this origin. Null when no answer arrived (offline, a timeout, a redirect). */
async function post(path: string, body: string): Promise<Answer | null> {
  const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(path, { method: "POST", headers: { "content-type": "application/json" }, body, cache: "no-store", credentials: "same-origin", redirect: "error", signal: controller.signal });
    return { status: response.status, body: await response.json().catch(() => undefined) };
  } catch { return null; }
  finally { clearTimeout(timer); }
}
const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;
function watchConnection(changed: () => void) {
  window.addEventListener("online", changed); window.addEventListener("offline", changed);
  return () => { window.removeEventListener("online", changed); window.removeEventListener("offline", changed); };
}
const focusSoon = (id: string) => { requestAnimationFrame(() => document.getElementById(id)?.focus()); };

/* One import per signed-in person per tab, in memory only (never in browser storage: it holds people's names, phone
 * numbers and emails). It is gone on reload, and after KEEP_MS away from the page. */
let held: { actorId: string; store: ImportStore; expiry: ReturnType<typeof setTimeout> | null } | null = null;
const warnBeforeLeaving = (event: BeforeUnloadEvent) => { event.preventDefault(); };
function storeFor(actorId: string): ImportStore {
  if (held?.actorId === actorId) return held.store;
  const store = createImportStore({ post, offline: isOffline, newOperationId, focus: focusSoon });
  // Closing the page while the import is out, or its outcome unknown, would lose the command that recovers the result.
  store.subscribe(() => {
    const phase = store.get().phase;
    if (phase === "importing" || phase === "unknown") window.addEventListener("beforeunload", warnBeforeLeaving);
    else window.removeEventListener("beforeunload", warnBeforeLeaving);
  });
  held = { actorId, store, expiry: null };
  return store;
}
function arrive() {
  if (held?.expiry) { clearTimeout(held.expiry); held.expiry = null; }
}
function leave() {
  const mine = held;
  if (!mine) return;
  const drop = () => { const phase = mine.store.get().phase; if (held === mine && phase !== "importing" && phase !== "unknown") held = null; };
  // A finished import has nothing to come back to.
  if (mine.store.get().phase === "done") drop(); else mine.expiry = setTimeout(drop, KEEP_MS);
}
const noStore = () => () => undefined;
const emptyImport = () => EMPTY_IMPORT;

export function RosterImport({ lang: langProp, actorId, locations, headcounts, billingHref = null }: {
  lang?: RosterImportLang;
  /** The signed-in Owner: an unfinished import is never shown to someone else in the same tab. */
  actorId: string;
  locations: ImportLocation[]; headcounts: Headcounts; billingHref?: string | null;
}) {
  const lang = useViewLang(langProp);
  const copy = rosterImportCopy[lang], router = useRouter();
  const [store] = useState(() => typeof window === "undefined" ? null : storeFor(actorId));
  const state = useSyncExternalStore(store?.subscribe ?? noStore, store?.get ?? emptyImport, emptyImport);
  const offline = useSyncExternalStore(watchConnection, isOffline, () => false);
  useEffect(() => { arrive(); return leave; }, []);
  const ctx = { copy, locations, billingHref };
  const { phase, preview, busy } = state;

  async function chooseFile(file: File) {
    if (!store) return;
    if (file.size > MAX_FILE_BYTES) { store.loadFile(ctx, file.name, null, true); return; }
    try { store.loadFile(ctx, file.name, decodeFile(await file.arrayBuffer())); } catch { store.loadFile(ctx, file.name, null); }
  }
  function onNotice(action: NoticeAction) {
    if (action === "reload") window.location.reload(); else void store?.act(ctx, action);
  }
  function startOver() {
    store?.startOver();
    // The headcounts on this page are the server's; read them again now that people were added.
    router.refresh();
  }

  const step = phase === "add" ? 1 : phase === "review" ? 2 : 3;
  return <>
    <FormHead titleId={TITLE_ID} title={copy.title} back={{ href: TEAM_HREF, label: copy.team }}
      step={<><span className="c-formhead__dots" aria-hidden="true"><i data-on="" /><i data-on={step >= 2 ? "" : undefined} /><i data-on={step === 3 ? "" : undefined} /></span>{copy.stepOf(step)}</>}
      left={phase === "add" ? <FormHeadLink href={TEAM_HREF}>{copy.cancel}</FormHeadLink>
        : phase === "review" ? <FormHeadBack onClick={() => store?.editList()}>{copy.back}</FormHeadBack> : null} />
    <form className="c-teamform rimp" noValidate onSubmit={event => event.preventDefault()} aria-labelledby={TITLE_ID}>
      <p className="c-sr" role="status" aria-live="polite">{state.live}</p>
      {state.notice && (phase === "add" || phase === "review") ? <NoticeCard copy={copy} notice={state.notice} busy={busy} onAction={onNotice} /> : null}
      {phase === "add" ? <>
        <AddListStep copy={copy} text={state.text} fileNote={state.fileNote} listError={state.listError} locations={locations} locationId={locationFor(state, locations)}
          locationError={state.locationError} busy={busy} onText={text => store?.setText(text)} onFile={file => void chooseFile(file)} onLocation={id => store?.setLocation(id)} />
        <StepActions primary={{ label: busy ? copy.review.checking : copy.add.check, onClick: () => void store?.checkList(ctx), disabled: busy || !locations.length }}
          secondary={{ label: copy.cancel, href: TEAM_HREF }} />
      </> : null}
      {phase === "review" && preview ? <>
        <ReviewStep copy={copy} preview={preview} locations={locations} defaultLocationId={locationFor(state, locations)} headcounts={headcounts} removedCount={state.removed.length}
          rowErrors={state.rowErrors} editing={state.editing} busy={busy} scopeChoice={state.scopeChoice} onEdit={rowNumber => store?.setEditing(rowNumber)}
          onSaveRow={(rowNumber, changes) => void store?.saveRow(ctx, rowNumber, changes)} onRemoveRow={rowNumber => void store?.removeRow(ctx, rowNumber)}
          onScope={choice => void store?.setScope(ctx, choice)} />
        <StepActions primary={{ label: busy ? copy.review.checking : copy.review.importAction(preview.rows.length), onClick: () => void store?.send(ctx), disabled: busy || !confirmable(state) }}
          secondary={{ label: copy.review.editList, onClick: () => store?.editList(), disabled: busy }} />
      </> : null}
      {phase === "importing" ? <ImportingStep copy={copy} count={state.sending} /> : null}
      {phase === "unknown" ? <UnknownStep copy={copy} offline={offline} busy={busy} note={state.unknownNote} onRetry={() => void store?.send(ctx)} /> : null}
      {phase === "done" ? <DoneStep copy={copy} added={state.result.added} withoutEmail={state.result.withoutEmail} removed={state.removed} onAnother={startOver} /> : null}
    </form>
  </>;
}
