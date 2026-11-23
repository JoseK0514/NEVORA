"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { ArchiveIcon } from "@phosphor-icons/react/dist/ssr/Archive";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/ssr/ArrowSquareOut";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { CaretUpIcon } from "@phosphor-icons/react/dist/ssr/CaretUp";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import { FileTextIcon } from "@phosphor-icons/react/dist/ssr/FileText";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/ssr/PencilSimple";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { StorefrontIcon } from "@phosphor-icons/react/dist/ssr/Storefront";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import {
  CorpBody, CorpButton, CorpButtonLink, CorpCard, CorpEmptyRow, CorpField, CorpFormFooter, CorpNav, CorpNote, CorpPage, CorpPill, CorpRow, CorpRows, CorpSection, CorpTitle,
} from "@/components/corp/corp";
import { BCallout, BState } from "@/components/owner-b/b-kit";
import { FormHead, FormHeadLink } from "@/components/team/team-forms";
import { toast } from "@/components/toaster";
import {
  CATEGORIES, KNOWLEDGE_LIMITS, PROFILE_FIELDS, companyTime, createKnowledgeClient, documentErrors, entryState,
  entrySummary, newRequestId, normalizeText, profileBody, profileErrors, sizeText, utf8Bytes, versionHref, zonedInput, zonedInstant,
  type DateField, type DraftErrors, type KnowledgeClient, type KnowledgeCommand, type KnowledgeEntry, type KnowledgeLocale, type KnowledgeSnapshot,
  type KnowledgeVersion, type ProfileFields, type WriteOutcome,
} from "@/lib/owner-advisor/knowledge-client";
import type { Lang } from "../format";
import { useAdvisorLang } from "../lang";
import { KNOWLEDGE_COPY, type KnowledgeCopy, type KnowledgeVerb } from "./knowledge-copy";
import { viewHref, type KnowledgeView } from "./views";
import "./knowledge.css";

/* Company knowledge (Rondo, Nov 16, 2026). The Owner's business profile and a small library of pasted or .txt/.md text,
 * on the corporate kit the Direction B layers already dress (pushed page, section labels, rows with tinted icons, the sheet
 * form header). Flow: Draft → Review the exact saved text → Publish for Rondo. Every write carries one request ID kept with
 * its exact command until the server answers; an unconfirmed write is only ever sent again unchanged. */

const LIBRARY = viewHref({ name: "library" });
type Issue = { kind: "uncertain" | "conflict" | "limit" | "invalid"; op: KnowledgeCommand["op"] };
type Custody = { command: KnowledgeCommand; status: "sending" | "uncertain" };
type Load = { state: "loading" } | { state: "ready"; snapshot: KnowledgeSnapshot } | { state: "failed" } | { state: "revoked" };
type Ctx = { client: KnowledgeClient; timeZone: string; snapshot: KnowledgeSnapshot; now: number; busy: boolean; t: KnowledgeCopy; lang: Lang;
  send: (command: KnowledgeCommand) => Promise<boolean>; go: (view: KnowledgeView) => void };

const verb = (op: KnowledgeCommand["op"]): KnowledgeVerb => op === "publish" ? "publish" : op === "archive" ? "archive" : op === "delete" ? "delete" : "save";
const LOCALE: Record<Lang, string> = { en: "en-US", es: "es-PR" };
const shortDay = (iso: string, timeZone: string, lang: Lang = "en") => new Intl.DateTimeFormat(LOCALE[lang], { timeZone, month: "short", day: "numeric" }).format(new Date(iso));
/** The lib's company time ("Fri, Nov 20, 2026, 2:30 PM"), read in Spanish as "vie, 20 nov 2026, 2:30 p. m.". */
function zonedTime(iso: string | null, timeZone: string, lang: Lang, withZone = false) {
  if (lang === "en" || !iso) return companyTime(iso, timeZone, withZone);
  return new Intl.DateTimeFormat(LOCALE.es, { timeZone, weekday: "short", month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", ...(withZone ? { timeZoneName: "short" } : {}) }).format(new Date(iso));
}
const topicOf = (t: KnowledgeCopy, value: string) => t.categories[value] ?? t.categories.other;

export function KnowledgePage({ timeZone, view, client: given }: { timeZone: string; view: KnowledgeView; client?: KnowledgeClient }) {
  const client = useMemo(() => given ?? createKnowledgeClient(), [given]);
  const router = useRouter();
  const lang = useAdvisorLang();
  const t = KNOWLEDGE_COPY[lang];
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [custody, setCustody] = useState<Custody | null>(null);
  const [issue, setIssue] = useState<Issue | null>(null);
  // The moment statuses are judged at, taken with each read, so a status doesn't change between two renders.
  const [now, setNow] = useState(() => Date.now());
  const viewKey = viewHref(view);
  const shownView = useRef(viewKey);

  const revoke = useCallback(() => { setLoad({ state: "revoked" }); setCustody(null); setIssue(null); }, []);
  const reload = useCallback((signal?: AbortSignal) => client.list(signal ?? new AbortController().signal).then(result => {
    if (signal?.aborted) return null;
    if (result.kind === "forbidden") { revoke(); return null; }
    if (result.kind !== "ready") { setLoad(old => old.state === "ready" ? old : { state: "failed" }); return null; }
    setNow(Date.now());
    setLoad(old => old.state === "revoked" ? old : { state: "ready", snapshot: result.value });
    return result.value;
  }), [client, revoke]);

  useEffect(() => {
    const controller = new AbortController();
    void reload(controller.signal);
    const visible = () => { if (document.visibilityState === "visible") void reload(); };
    document.addEventListener("visibilitychange", visible);
    return () => { controller.abort(); document.removeEventListener("visibilitychange", visible); };
  }, [reload]);
  // An unconfirmed write is held only on this page: leaving would lose the one safe way to check it.
  useEffect(() => {
    if (!custody) return;
    const hold = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", hold);
    return () => window.removeEventListener("beforeunload", hold);
  }, [custody]);
  // A new view puts focus on its title (the phone header's or the band's, whichever is shown).
  useEffect(() => {
    // Only a change of view moves focus (not the first paint, which may run this twice in development).
    if (shownView.current === viewKey) return;
    shownView.current = viewKey;
    const title = [...document.querySelectorAll<HTMLElement>(".kn > :is(.c-nav, .c-title) h1")].find(heading => heading.getClientRects().length > 0);
    if (!title) return;
    if (!title.hasAttribute("tabindex")) title.tabIndex = -1;
    title.focus();
  }, [viewKey]);
  // A problem is said at the top while the Owner is at the button below: bring it into view and focus it.
  const problem = custody?.status === "uncertain" ? "uncertain" : issue?.kind ?? null;
  useEffect(() => {
    if (!problem) return;
    const card = document.querySelector<HTMLElement>(".kn .kn-issue");
    card?.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    card?.focus({ preventScroll: true });
  }, [problem]);

  const go = useCallback((next: KnowledgeView) => { setIssue(null); router.push(viewHref(next)); }, [router]);

  const settle = useCallback(async (command: KnowledgeCommand, outcome: WriteOutcome) => {
    if (outcome.kind === "uncertain") { setCustody({ command, status: "uncertain" }); return false; }
    setCustody(null);
    if (outcome.kind === "forbidden") { revoke(); return false; }
    if (outcome.kind !== "receipt") {
      setIssue({ kind: outcome.kind, op: command.op });
      if (outcome.kind === "conflict") await reload();
      return false;
    }
    const receipt = outcome.receipt;
    setIssue(null);
    await reload();
    if (receipt.state === "draft_saved" && receipt.versionId) {
      toast(t.toastDraftSaved);
      go({ name: "version", documentId: receipt.documentId, versionId: receipt.versionId });
    } else if (receipt.state === "published") {
      toast(t.toastPublished);
      go({ name: "entry", documentId: receipt.documentId });
    } else if (receipt.state === "archived") {
      toast(t.toastArchived);
      go({ name: "entry", documentId: receipt.documentId });
    } else {
      toast(t.toastDeleted);
      go({ name: "library" });
    }
    return true;
  }, [go, reload, revoke, t]);

  const send = useCallback(async (command: KnowledgeCommand) => {
    if (custody) return false;
    setIssue(null);
    setCustody({ command, status: "sending" });
    return settle(command, await client.write(command));
  }, [client, custody, settle]);
  const retry = useCallback(async () => {
    if (custody?.status !== "uncertain") return;
    const command = custody.command;
    setCustody({ command, status: "sending" });
    await settle(command, await client.write(command));
  }, [client, custody, settle]);
  const abandon = useCallback(async () => {
    setCustody(null);
    await reload();
    toast(t.toastReloaded, "info");
  }, [reload, t]);

  const entries = load.state === "ready" ? load.snapshot.entries : [];
  const entry = "documentId" in view && view.documentId ? entries.find(item => item.documentId === view.documentId) ?? null : null;
  const head = heading(view, entry, load.state === "ready", t);

  if (load.state === "revoked") return <CorpPage className="c-page--narrow kn" labelledBy="kn-title">
    <CorpNav phoneOnly back={{ href: "/app/ai-manager", label: t.rondoAi }} title={t.pageTitle} />
    <CorpTitle wide id="kn-title" title={t.pageTitle} />
    <CorpCard as="div"><BState kind="locked" alert title={t.sessionEnded} line={t.signInAgain}
      action={{ label: t.signIn, href: "/login" }} /></CorpCard>
  </CorpPage>;

  const shown = custody?.status === "uncertain" ? <IssueCard t={t} kind="uncertain" op={custody.command.op} onRetry={() => void retry()} onAbandon={() => void abandon()} />
    : issue ? <IssueCard t={t} kind={issue.kind} op={issue.op} /> : null;
  const frame = `kn ${head.sheet ? "c-sheetpage" : "c-page--narrow"}`;

  if (load.state !== "ready") return <CorpPage className={frame} labelledBy="kn-title">
    {head.node}
    {load.state === "loading" ? <Skeleton label={t.loadingKnowledge} />
      : <CorpCard as="div"><BState kind="failed" alert title={t.loadFailed} line={t.checkConnection}
        action={{ label: t.tryAgain, onClick: () => { setLoad({ state: "loading" }); void reload(); } }} /></CorpCard>}
  </CorpPage>;

  const ctx: Ctx = { client, timeZone, snapshot: load.snapshot, now, busy: custody?.status === "sending", t, lang, send, go };
  return <CorpPage className={frame} labelledBy="kn-title">
    {head.node}
    {view.name === "library" ? <Library ctx={ctx} problem={shown} />
      : view.name === "profile" ? <ProfileEditor key="profile" ctx={ctx} entry={entries.find(item => item.kind === "profile") ?? null} problem={shown} />
      : view.name === "document" ? (view.documentId && !entry ? <Gone t={t} /> : <DocumentEditor key={view.documentId ?? "new"} ctx={ctx} entry={entry} problem={shown} />)
      : !entry ? <Gone t={t} />
      : view.name === "entry" ? <EntryDetail key={`${entry.documentId}:${load.snapshot.revision}`} ctx={ctx} entry={entry} problem={shown} />
      : <VersionReview key={view.versionId} ctx={ctx} entry={entry} versionId={view.versionId} problem={shown} />}
  </CorpPage>;
}

/* ---------- Page heads ---------- */
function latestOf(entry: KnowledgeEntry) { return entry.versions[entry.versions.length - 1]; }
function entryName(entry: KnowledgeEntry | null, t: KnowledgeCopy) {
  if (!entry) return t.document;
  return entry.kind === "profile" ? t.businessProfile : latestOf(entry)?.title ?? t.document;
}
function heading(view: KnowledgeView, entry: KnowledgeEntry | null, ready: boolean, t: KnowledgeCopy): { node: ReactNode; sheet?: boolean } {
  const name = ready ? entryName(entry, t) : "";
  switch (view.name) {
    case "library": return { node: <>
      {/* Rondo fix (Nov 23): adding a document is the Documents card's last row only, not a second band button. */}
      <CorpNav phoneOnly back={{ href: "/app/ai-manager", label: t.rondoAi }} title={t.pageTitle} titleId="kn-nav-title" />
      <CorpTitle wide id="kn-title" title={t.pageTitle} sub={t.ownersOnly} />
    </> };
    case "entry": {
      const edit = entry?.kind === "profile" ? viewHref({ name: "profile" }) : viewHref({ name: "document", documentId: view.documentId });
      const latest = entry ? latestOf(entry) : null;
      const sub = !entry ? undefined : entry.kind === "profile" ? t.sharedWithOwners : `${topicOf(t, latest!.category)} · ${t.locales[latest!.locale]}`;
      // An archived entry can be edited too: saving brings it back as a draft (the server clears its archive mark).
      const editable = ready && !!entry;
      return { node: <>
        <CorpNav phoneOnly back={{ href: LIBRARY, label: t.knowledge }} title={name} titleId="kn-nav-title" right={editable ? <Link href={edit}>{t.edit}</Link> : undefined} />
        <CorpTitle wide id="kn-title" title={name} sub={sub} actions={editable ? <CorpButtonLink href={edit} kind="primary" size="md">{t.edit}</CorpButtonLink> : undefined} />
      </> };
    }
    case "version": {
      const back = { href: viewHref({ name: "entry", documentId: view.documentId }), label: entry?.kind === "profile" ? t.profile : t.document };
      return { node: <>
        <CorpNav phoneOnly back={back} title={t.review} titleId="kn-nav-title" />
        <CorpTitle wide id="kn-title" title={t.reviewSavedText} sub={name || undefined} />
      </> };
    }
    case "profile":
    case "document": {
      const title = view.name === "profile" ? t.businessProfile : view.documentId ? t.editDocument : t.newDocument;
      const cancel = view.name === "document" && view.documentId ? viewHref({ name: "entry", documentId: view.documentId })
        : view.name === "profile" && entry ? viewHref({ name: "entry", documentId: entry.documentId }) : LIBRARY;
      return { sheet: true, node: <FormHead titleId="kn-title" title={title} back={{ href: cancel, label: cancel === LIBRARY ? t.knowledge : view.name === "profile" ? t.profile : t.document }}
        left={<FormHeadLink href={cancel}>{t.cancel}</FormHeadLink>}
        right={ready ? <button type="submit" form="kn-form">{t.save}</button> : undefined} /> };
    }
  }
}

function Skeleton({ label }: { label: string }) {
  return <section className="c-card kn-skel" aria-busy="true" aria-label={label}>
    <span className="kn-skel__bar kn-skel__bar--head" />
    {[56, 44, 62].map(width => <span key={width} className="kn-skel__row"><span className="kn-skel__dot" /><span className="kn-skel__lines"><span className="kn-skel__bar" style={{ width: `${width}%` }} /><span className="kn-skel__bar kn-skel__bar--thin" style={{ width: `${width - 18}%` }} /></span></span>)}
  </section>;
}

function Gone({ t }: { t: KnowledgeCopy }) {
  return <CorpCard as="div"><BState kind="empty" title={t.goneTitle} line={t.goneLine} action={{ label: t.goneBack, href: LIBRARY }} /></CorpCard>;
}

/** What went wrong with a write, in one state card at the top, focused when it appears. */
function IssueCard({ t, kind, op, onRetry, onAbandon }: { t: KnowledgeCopy; kind: Issue["kind"]; op: KnowledgeCommand["op"]; onRetry?: () => void; onAbandon?: () => void }) {
  const copy = {
    uncertain: { title: t.uncertainTitle(verb(op)), line: t.uncertainLine },
    conflict: { title: t.conflictTitle, line: t.conflictLine },
    limit: { title: t.limitTitle, line: t.limitLine },
    invalid: { title: t.invalidTitle(verb(op)), line: t.invalidLine },
  }[kind];
  const failed = kind === "limit" || kind === "invalid";
  return <section className="c-card kn-issue" tabIndex={-1} aria-label={copy.title}>
    <BState kind={failed ? "failed" : "paused"} icon={failed ? undefined : <WarningIcon weight="bold" />} alert title={copy.title} line={copy.line}>
      {onRetry ? <span className="kn-issue__acts"><CorpButton kind="primary" size="md" onClick={onRetry}>{t.checkAgain}</CorpButton><CorpButton kind="secondary" size="md" className="b-rowact b-rowact--quiet" onClick={onAbandon}>{t.stopReload}</CorpButton></span> : null}
    </BState>
  </section>;
}

/* ---------- Library ---------- */
function Library({ ctx, problem }: { ctx: Ctx; problem: ReactNode }) {
  const { t, lang } = ctx;
  const entries = ctx.snapshot.entries;
  const profile = entries.find(entry => entry.kind === "profile") ?? null;
  const documents = entries.filter(entry => entry.kind === "document" && !entry.archived);
  const archived = entries.filter(entry => entry.kind === "document" && entry.archived);
  const count = entries.filter(entry => entry.kind === "document").length;
  const full = count >= KNOWLEDGE_LIMITS.documents;
  const row = (entry: KnowledgeEntry) => {
    const latest = latestOf(entry);
    const summary = entrySummary(entry, ctx.now, ctx.timeZone);
    const isProfile = entry.kind === "profile";
    return <li key={entry.documentId}><CorpRow href={viewHref({ name: "entry", documentId: entry.documentId })}
      icon={isProfile ? <StorefrontIcon weight="bold" /> : <FileTextIcon weight="bold" />}
      title={isProfile ? t.businessProfile : latest.title}
      detail={isProfile ? t.profileUpdated(t.locales[latest.locale], shortDay(latest.createdAt, ctx.timeZone, lang)) : `${topicOf(t, latest.category)} · ${t.locales[latest.locale]}`}
      value={summary.chip ? <CorpPill tone={summary.chip.tone}>{summaryText(summary.chip.label, entry, ctx)}</CorpPill> : summary.value ? summaryText(summary.value, entry, ctx) : undefined} valueTone="soft" /></li>;
  };
  return <>
    {problem}
    <CorpCard as="div" id="kn-profile"><CorpRows label={t.businessProfile}>
      {profile ? row(profile) : <li><CorpRow href={viewHref({ name: "profile" })} icon={<StorefrontIcon weight="bold" />} title={t.writeProfile} detail={t.readsFirst} /></li>}
    </CorpRows></CorpCard>
    <CorpSection id="kn-docs" label={t.documents} aside={count ? <span className="kn-meta">{t.countOf(count, KNOWLEDGE_LIMITS.documents)}</span> : undefined}>
      <CorpCard as="div"><CorpRows label={t.documents}>
        {documents.length ? documents.map(row) : <CorpEmptyRow as="li">{t.noDocuments}</CorpEmptyRow>}
        {full ? null : <li><Link className="kn-addrow" href={viewHref({ name: "document", documentId: null })}><PlusIcon weight="bold" aria-hidden="true" />{t.addDocument}</Link></li>}
      </CorpRows></CorpCard>
    </CorpSection>
    {archived.length ? <CorpSection id="kn-archived" label={t.archivedSection} count={archived.length}>
      <CorpCard as="div"><CorpRows label={t.archivedSection}>{archived.map(row)}</CorpRows></CorpCard>
    </CorpSection> : null}
    {full ? <p className="kn-foot">{t.libraryFull}</p> : null}
  </>;
}

/** A row status from the lib's entrySummary, in the page's language (a later start or an end carries its day). */
function summaryText(label: string, entry: KnowledgeEntry, ctx: Ctx) {
  if (ctx.lang === "en") return label;
  const published = entryState(entry, ctx.now, ctx.timeZone).published;
  if (label.startsWith("Starts ") && published?.effectiveFrom) return ctx.t.startsDay(shortDay(published.effectiveFrom, ctx.timeZone, ctx.lang));
  if (label.startsWith("Ended ") && published?.effectiveUntil) return ctx.t.endedDay(shortDay(published.effectiveUntil, ctx.timeZone, ctx.lang));
  return ctx.t.summary[label] ?? label;
}

/* ---------- Dates ---------- */
type LocalDates = Record<DateField, string>;
const DATE_FIELDS: DateField[] = ["effectiveFrom", "effectiveUntil", "reviewDue"];
const localDates = (version: { effectiveFrom: string | null; effectiveUntil: string | null; reviewDue: string | null } | null, timeZone: string): LocalDates => ({
  effectiveFrom: zonedInput(version?.effectiveFrom ?? null, timeZone), effectiveUntil: zonedInput(version?.effectiveUntil ?? null, timeZone), reviewDue: zonedInput(version?.reviewDue ?? null, timeZone),
});
const instants = (dates: LocalDates, timeZone: string) => ({
  effectiveFrom: dates.effectiveFrom ? zonedInstant(dates.effectiveFrom, timeZone) : null,
  effectiveUntil: dates.effectiveUntil ? zonedInstant(dates.effectiveUntil, timeZone) : null,
  reviewDue: dates.reviewDue ? zonedInstant(dates.reviewDue, timeZone) : null,
});
/** Dates are optional, so they sit behind one disclosure that says what is set. */
function DateFields({ dates, onChange, errors, timeZone, idPrefix, t, lang }: { dates: LocalDates; onChange: (next: LocalDates) => void; errors: DraftErrors; timeZone: string; idPrefix: string; t: KnowledgeCopy; lang: Lang }) {
  const set = DATE_FIELDS.filter(field => dates[field]);
  const [open, setOpen] = useState(set.length > 0);
  const failed = DATE_FIELDS.some(field => errors[field]);
  const expanded = open || failed;
  const summary = set.length ? set.map(field => t.dateSummary(field, shortDay(zonedInstant(dates[field], timeZone) ?? "", timeZone, lang))).join(" · ") : t.startsWhenPublished;
  return <div className="c-field kn-dates">
    <span className="c-field__label" id={`${idPrefix}-dates-label`}>{t.datesOptional}</span>
    <button type="button" className="kn-dates__toggle" aria-expanded={expanded} aria-controls={`${idPrefix}-dates`} aria-describedby={`${idPrefix}-dates-label`} onClick={() => setOpen(value => !value)}>
      <span className="kn-dates__value">{summary}</span>{expanded ? <CaretUpIcon weight="bold" className="kn-dates__caret" aria-hidden="true" /> : <CaretDownIcon weight="bold" className="kn-dates__caret" aria-hidden="true" />}
    </button>
    <div className="kn-dates__body" id={`${idPrefix}-dates`} hidden={!expanded}>
      <div className="kn-dates__grid">
        {DATE_FIELDS.map(field => {
          const id = `${idPrefix}-${field}`, resolved = dates[field] ? zonedTime(zonedInstant(dates[field], timeZone), timeZone, lang, true) : null;
          return <CorpField key={field} label={t.dateLabels[field]} htmlFor={id} error={errors[field] ? <ErrorText>{t.draftError(errors[field])}</ErrorText> : undefined} errorId={`${id}-error`}
            help={resolved ? <span className="kn-resolved">{resolved} · <button type="button" className="kn-textbtn" onClick={() => onChange({ ...dates, [field]: "" })} aria-label={t.clearDate(field)}>{t.clear}</button></span> : undefined}>
            <input className="c-in" id={id} type="datetime-local" value={dates[field]} aria-invalid={errors[field] ? true : undefined} aria-describedby={errors[field] ? `${id}-error` : undefined}
              onChange={event => onChange({ ...dates, [field]: event.target.value })} />
          </CorpField>;
        })}
      </div>
    </div>
  </div>;
}

/** The one error style: a 16px bold warning glyph, then the sentence (no closing period). */
function ErrorText({ children }: { children: ReactNode }) {
  return <><WarningCircleIcon weight="bold" className="kn-error__ic" aria-hidden="true" />{children}</>;
}
function focusFirstError(form: HTMLFormElement | null) {
  requestAnimationFrame(() => form?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
}
/** The latest saved version's text, loaded once per editor: a refetched list never overwrites what the Owner is typing. */
function useLatest(ctx: Ctx, entry: KnowledgeEntry | null) {
  const latest = entry ? latestOf(entry) : null;
  const [state, setState] = useState<{ kind: "idle" | "loading" | "failed" | "ready"; version?: KnowledgeVersion }>(latest ? { kind: "loading" } : { kind: "idle" });
  const latestId = latest?.versionId, documentId = entry?.documentId;
  useEffect(() => {
    if (!latestId || !documentId) return;
    const controller = new AbortController();
    void ctx.client.version(documentId, latestId, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setState(result.kind === "ready" ? { kind: "ready", version: result.value } : { kind: "failed" });
    });
    return () => controller.abort();
    // eslint-disable-next-line hooks-preserved/exhaustive-deps
  }, [documentId]);
  return state;
}
function EditorState({ state, back, t }: { state: { kind: string }; back: string; t: KnowledgeCopy }) {
  if (state.kind === "loading") return <Skeleton label={t.loadingSaved} />;
  return <CorpCard as="div"><BState kind="failed" alert title={t.savedFailed} line={t.goBackTryAgain} action={{ label: t.back, href: back }} /></CorpCard>;
}
function SaveFooter({ ctx, cancel }: { ctx: Ctx; cancel: string }) {
  return <CorpFormFooter>
    <CorpButtonLink href={cancel} kind="secondary" size="md" className="b-rowact b-rowact--quiet">{ctx.t.cancel}</CorpButtonLink>
    <CorpButton type="submit" kind="primary" size="md" disabled={ctx.busy}>{ctx.busy ? ctx.t.saving : ctx.t.saveDraft}</CorpButton>
  </CorpFormFooter>;
}
function LocaleField({ value, onChange, id, t }: { value: KnowledgeLocale; onChange: (value: KnowledgeLocale) => void; id: string; t: KnowledgeCopy }) {
  return <CorpField label={t.writtenIn} htmlFor={id}>
    <select className="c-in" id={id} value={value} onChange={event => onChange(event.target.value as KnowledgeLocale)}>
      {(Object.keys(t.locales) as KnowledgeLocale[]).map(locale => <option key={locale} value={locale}>{t.locales[locale]}</option>)}
    </select>
  </CorpField>;
}

/* ---------- Business profile ---------- */
function ProfileEditor({ ctx, entry, problem }: { ctx: Ctx; entry: KnowledgeEntry | null; problem: ReactNode }) {
  const latest = useLatest(ctx, entry);
  const back = entry ? viewHref({ name: "entry", documentId: entry.documentId }) : LIBRARY;
  if (latest.kind === "loading" || latest.kind === "failed") return <EditorState state={latest} back={back} t={ctx.t} />;
  return <ProfileForm ctx={ctx} cancel={back} version={latest.version ?? null} problem={problem} />;
}
function ProfileForm({ ctx, cancel, version, problem }: { ctx: Ctx; cancel: string; version: KnowledgeVersion | null; problem: ReactNode }) {
  const [fields, setFields] = useState<ProfileFields>(() => ({ ...(version?.profileFields ?? {}) }));
  const [locale, setLocale] = useState<KnowledgeLocale>(version?.locale ?? "en");
  const [dates, setDates] = useState<LocalDates>(() => localDates(version, ctx.timeZone));
  const [tried, setTried] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const requestId = useRef<string | null>(null);
  const validity = instants(dates, ctx.timeZone);
  const errors = profileErrors(fields, validity);
  const shown = tried ? errors : {};
  const bytes = utf8Bytes(profileBody(fields));
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (Object.keys(errors).length || ctx.busy) { focusFirstError(form.current); return; }
    const clean: ProfileFields = {};
    for (const key of PROFILE_FIELDS) { const value = normalizeText(fields[key] ?? ""); if (value) clean[key] = value; }
    requestId.current ??= newRequestId();
    const ok = await ctx.send({ op: "draft_profile", requestId: requestId.current, expectedRevision: ctx.snapshot.revision, locale, fields: clean, ...validity });
    // A deliberate save after a refused one is a new operation.
    if (!ok) requestId.current = null;
  };
  return <form ref={form} id="kn-form" className="c-teamform kn-form" onSubmit={submit} noValidate aria-labelledby="kn-title">
    {problem}
    {PROFILE_FIELDS.map(key => {
      const id = `kn-profile-${key}`, required = key === "businessDescription";
      return <CorpField key={key} label={required ? ctx.t.profileFields[key].label : ctx.t.optional(ctx.t.profileFields[key].label)} htmlFor={id}
        help={<span id={`${id}-help`}>{ctx.t.profileFields[key].help}</span>} error={shown[key] ? <ErrorText>{ctx.t.draftError(shown[key])}</ErrorText> : undefined} errorId={`${id}-error`}>
        <textarea className="c-in kn-area" id={id} rows={required ? 4 : 3} value={fields[key] ?? ""} required={required}
          aria-invalid={shown[key] ? true : undefined} aria-describedby={shown[key] ? `${id}-error` : `${id}-help`}
          onChange={event => setFields(old => ({ ...old, [key]: event.target.value }))} />
      </CorpField>;
    })}
    <p className={bytes > KNOWLEDGE_LIMITS.profileBytes ? "kn-size kn-size--over" : "kn-size"}>{ctx.t.sizeOf(sizeText(bytes), sizeText(KNOWLEDGE_LIMITS.profileBytes))}</p>
    <LocaleField value={locale} onChange={setLocale} id="kn-profile-locale" t={ctx.t} />
    <DateFields dates={dates} onChange={setDates} errors={shown} timeZone={ctx.timeZone} idPrefix="kn-profile" t={ctx.t} lang={ctx.lang} />
    <SaveFooter ctx={ctx} cancel={cancel} />
  </form>;
}

/* ---------- Documents ---------- */
export async function readTextFile(file: File): Promise<{ text: string; name: string } | { error: string }> {
  const name = file.name;
  if (!/\.(txt|md)$/i.test(name)) return { error: "Only .txt and .md files. Paste other text instead" };
  // A rough first gate before reading: UTF-8 text over the limit is over it as bytes too.
  if (file.size > KNOWLEDGE_LIMITS.documentBytes * 2) return { error: `Over the ${sizeText(KNOWLEDGE_LIMITS.documentBytes)} limit. Split it up` };
  try {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer());
    return { text, name };
  } catch {
    return { error: "Not UTF-8 text. Paste it instead" };
  }
}

function DocumentEditor({ ctx, entry, problem }: { ctx: Ctx; entry: KnowledgeEntry | null; problem: ReactNode }) {
  const latest = useLatest(ctx, entry);
  const back = entry ? viewHref({ name: "entry", documentId: entry.documentId }) : LIBRARY;
  if (latest.kind === "loading" || latest.kind === "failed") return <EditorState state={latest} back={back} t={ctx.t} />;
  return <DocumentForm ctx={ctx} entry={entry} cancel={back} version={latest.version ?? null} problem={problem} />;
}
function DocumentForm({ ctx, entry, cancel, version, problem }: { ctx: Ctx; entry: KnowledgeEntry | null; cancel: string; version: KnowledgeVersion | null; problem: ReactNode }) {
  const t = ctx.t;
  const [title, setTitle] = useState(version?.title ?? "");
  const [category, setCategory] = useState(version && version.category !== "profile" ? version.category : "operations");
  const [locale, setLocale] = useState<KnowledgeLocale>(version?.locale ?? "en");
  const [body, setBody] = useState(version?.body ?? "");
  const [sourceName, setSourceName] = useState<string | null>(version?.sourceName ?? null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [dates, setDates] = useState<LocalDates>(() => localDates(version, ctx.timeZone));
  const [tried, setTried] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const requestId = useRef<string | null>(null);
  const validity = instants(dates, ctx.timeZone);
  const errors = documentErrors({ title, category, locale, body, sourceName, ...validity });
  const bytes = utf8Bytes(normalizeText(body));
  const over = bytes > KNOWLEDGE_LIMITS.documentBytes;
  // A size problem shows as it happens; the others after the first Save.
  const shown: DraftErrors = tried ? errors : over ? { body: errors.body } : {};
  const load = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const result = await readTextFile(file);
    if ("error" in result) { setFileError(result.error); return; }
    setFileError(null);
    setBody(result.text);
    setSourceName(result.name);
    if (!title.trim()) setTitle(result.name.replace(/\.(txt|md)$/i, "").replace(/[-_]+/g, " ").trim().replace(/^./, letter => letter.toUpperCase()).slice(0, 120));
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (Object.keys(errors).length || ctx.busy) { focusFirstError(form.current); return; }
    requestId.current ??= newRequestId();
    const ok = await ctx.send({ op: "draft_document", requestId: requestId.current, expectedRevision: ctx.snapshot.revision, documentId: entry?.documentId ?? null,
      title: normalizeText(title), locale, category, sourceName: sourceName ? normalizeText(sourceName) : null, body: normalizeText(body), ...validity });
    if (!ok) requestId.current = null;
  };
  const fileProblem = fileError ?? shown.sourceName ?? null;
  return <form ref={form} id="kn-form" className="c-teamform kn-form" onSubmit={submit} noValidate aria-labelledby="kn-title">
    {problem}
    {entry?.archived ? <p className="c-field__help">{t.archivedEdit}</p> : null}
    <CorpField label={t.title} htmlFor="kn-doc-title" error={shown.title ? <ErrorText>{t.draftError(shown.title)}</ErrorText> : undefined} errorId="kn-doc-title-error">
      <input className="c-in" id="kn-doc-title" value={title} required maxLength={240} autoComplete="off" enterKeyHint="next"
        aria-invalid={shown.title ? true : undefined} aria-describedby={shown.title ? "kn-doc-title-error" : undefined} onChange={event => setTitle(event.target.value)} />
    </CorpField>
    <div className="c-field__row kn-pair">
      <CorpField label={t.topic} htmlFor="kn-doc-category">
        <select className="c-in" id="kn-doc-category" value={category} onChange={event => setCategory(event.target.value)}>{CATEGORIES.map(item => <option key={item.value} value={item.value}>{topicOf(t, item.value)}</option>)}</select>
      </CorpField>
      <LocaleField value={locale} onChange={setLocale} id="kn-doc-locale" t={t} />
    </div>
    <CorpField label={t.text} htmlFor="kn-doc-body" error={shown.body ? <ErrorText>{t.draftError(shown.body)}</ErrorText> : undefined} errorId="kn-doc-body-error"
      help={<span className="kn-bodyhelp" id="kn-doc-body-help"><span>{t.plainText}</span><span className={over ? "kn-size kn-size--over" : "kn-size"}>{t.sizeOf(sizeText(bytes), sizeText(KNOWLEDGE_LIMITS.documentBytes))}</span></span>}>
      <textarea className="c-in kn-area kn-area--doc" id="kn-doc-body" value={body} rows={12} required
        aria-invalid={shown.body ? true : undefined} aria-describedby={shown.body ? "kn-doc-body-error" : "kn-doc-body-help"} onChange={event => setBody(event.target.value)} />
    </CorpField>
    <div className="kn-file">
      <input ref={fileInput} className="kn-file__input" id="kn-doc-file" type="file" accept=".txt,.md,text/plain,text/markdown" onChange={event => void load(event)} tabIndex={-1} aria-hidden="true" />
      <CorpButton kind="secondary" size="md" className="b-rowact b-rowact--go" onClick={() => fileInput.current?.click()} aria-describedby="kn-doc-file-help">{sourceName ? t.loadAnother : t.loadFile}</CorpButton>
      <span className="c-field__help" id="kn-doc-file-help">{sourceName
        ? <>{t.fromFile(sourceName)} · <button type="button" className="kn-textbtn" onClick={() => setSourceName(null)}>{t.forgetFile}</button></>
        : t.fileHelp}</span>
      {fileProblem ? <span className="c-error" role="alert"><ErrorText>{t.draftError(fileProblem)}</ErrorText></span> : null}
    </div>
    <DateFields dates={dates} onChange={setDates} errors={shown} timeZone={ctx.timeZone} idPrefix="kn-doc" t={t} lang={ctx.lang} />
    <SaveFooter ctx={ctx} cancel={cancel} />
  </form>;
}

/* ---------- One document ---------- */
function EntryDetail({ ctx, entry, problem }: { ctx: Ctx; entry: KnowledgeEntry; problem: ReactNode }) {
  const { t, lang } = ctx;
  const day = (iso: string) => shortDay(iso, ctx.timeZone, lang);
  const state = entryState(entry, ctx.now, ctx.timeZone);
  const [confirm, setConfirm] = useState<"archive" | "delete" | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const requestId = useRef<string | null>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  const name = entry.kind === "profile" ? t.theProfile : `“${state.latest.title}”`;
  useEffect(() => { if (confirm) confirmRef.current?.querySelector<HTMLElement>("h2")?.focus(); }, [confirm]);
  const act = async (op: "archive" | "delete") => {
    requestId.current ??= newRequestId();
    const base = { requestId: requestId.current, expectedRevision: ctx.snapshot.revision, documentId: entry.documentId };
    const ok = await ctx.send(op === "archive" ? { op, ...base } : { op, ...base, acknowledged: true });
    if (!ok) requestId.current = null;
  };
  const cancel = () => { setConfirm(null); setAcknowledged(false); requestId.current = null; };
  const number = (versionId: string) => entry.versions.findIndex(version => version.versionId === versionId) + 1;
  const published = state.published;
  const startsLater = !!published?.effectiveFrom && Date.parse(published.effectiveFrom) > ctx.now;
  const ended = !!published?.effectiveUntil && Date.parse(published.effectiveUntil) <= ctx.now;
  const overdue = !!published?.reviewDue && Date.parse(published.reviewDue) <= ctx.now;
  const versions = [...entry.versions].reverse();
  return <>
    {problem}
    <CorpSection id="kn-status" label={t.status}>
      <CorpCard as="div"><CorpRows label={t.status}>
        <li><CorpRow icon={entry.archived ? <ArchiveIcon weight="bold" /> : <CheckCircleIcon weight="bold" />}
          title={entry.archived ? t.archived : !published ? t.notInUse : startsLater ? t.startsAt(zonedTime(published.effectiveFrom, ctx.timeZone, lang) ?? "") : ended ? t.ended : t.inUseByRondo}
          detail={entry.archived ? t.editToUse : !published ? t.publishToUse
            : t.publishedLine(number(published.versionId), day(published.publishedAt!), published.effectiveUntil && !ended ? day(published.effectiveUntil) : null)} /></li>
        {state.draft ? <li><CorpRow href={viewHref({ name: "version", documentId: entry.documentId, versionId: state.draft.versionId })} icon={<PencilSimpleIcon weight="bold" />}
          title={t.draftWaiting} detail={t.savedLine(number(state.draft.versionId), day(state.draft.createdAt))} /></li> : null}
        {published?.reviewDue && !entry.archived ? <li><CorpRow icon={<ClockIcon weight="bold" />} title={t.reviewBy(day(published.reviewDue))}
          detail={overdue ? undefined : t.stillUsed} value={overdue ? <CorpPill tone="amber">{t.pastDue}</CorpPill> : undefined} /></li> : null}
      </CorpRows></CorpCard>
    </CorpSection>

    <CorpSection id="kn-versions" label={t.versions} count={entry.versions.length}>
      <CorpCard as="div"><CorpRows label={t.versions}>{versions.map(version => {
        const current = version.versionId === entry.publishedVersionId;
        return <li key={version.versionId}><CorpRow href={viewHref({ name: "version", documentId: entry.documentId, versionId: version.versionId })}
          title={t.version(number(version.versionId))}
          detail={`${t.savedDay(day(version.createdAt))}${version.sourceName ? ` · ${version.sourceName}` : ""}`}
          value={!version.publishedAt ? <CorpPill tone="amber">{t.draft}</CorpPill> : current ? t.inUse : t.earlier} valueTone="soft" /></li>;
      })}</CorpRows></CorpCard>
    </CorpSection>

    <CorpSection id="kn-remove" label={entry.archived ? t.delete : t.archiveOrDelete}>
      {confirm ? <CorpCard as="div"><div ref={confirmRef} className="kn-confirm">
        <h2 tabIndex={-1} className="kn-confirm__t">{confirm === "archive" ? t.archiveQ(name) : t.deleteQ(name)}</h2>
        {confirm === "archive"
          ? <p className="kn-confirm__b">{t.archiveBody}</p>
          : <ul className="kn-confirm__list">
              <li>{t.erases(entry.versions.length)}</li>
              <li>{t.providerStays}</li>
            </ul>}
        {confirm === "delete" ? <label className="kn-check"><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} /><span>{t.cantUndo}</span></label> : null}
        <div className="kn-actions">
          <CorpButton kind="secondary" size="md" className="b-rowact b-rowact--quiet" disabled={ctx.busy} onClick={cancel}>{t.cancel}</CorpButton>
          <CorpButton kind={confirm === "delete" ? "danger" : "primary"} size="md" disabled={ctx.busy || (confirm === "delete" && !acknowledged)} onClick={() => void act(confirm)}>
            {ctx.busy ? (confirm === "archive" ? t.archiving : t.deleting) : confirm === "archive" ? t.archive : t.delete}</CorpButton>
        </div>
      </div></CorpCard>
      : <CorpCard as="div"><CorpRows label={t.archiveOrDelete}>
          {entry.archived ? null : <li><CorpRow onClick={() => setConfirm("archive")} icon={<ArchiveIcon weight="bold" />} title={t.archive} detail={t.stopsUsing} /></li>}
          <li><CorpRow onClick={() => setConfirm("delete")} danger icon={<TrashIcon weight="bold" />} title={t.delete} detail={t.erasesEvery} /></li>
        </CorpRows></CorpCard>}
    </CorpSection>
  </>;
}

/* ---------- Review the exact saved version ---------- */
function VersionReview({ ctx, entry, versionId, problem }: { ctx: Ctx; entry: KnowledgeEntry; versionId: string; problem: ReactNode }) {
  const { t, lang } = ctx;
  const [state, setState] = useState<{ kind: "loading" } | { kind: "ready"; version: KnowledgeVersion } | { kind: "failed" | "missing" }>({ kind: "loading" });
  const [attempt, setAttempt] = useState(0);
  const requestId = useRef<string | null>(null);
  const meta = entry.versions.find(version => version.versionId === versionId) ?? null;
  useEffect(() => {
    const controller = new AbortController();
    void ctx.client.version(entry.documentId, versionId, controller.signal).then(result => {
      if (controller.signal.aborted) return;
      setState(result.kind === "ready" ? { kind: "ready", version: result.value } : { kind: result.kind === "missing" ? "missing" : "failed" });
    });
    return () => controller.abort();
  }, [ctx.client, entry.documentId, versionId, attempt]);
  if (!meta) return <Gone t={t} />;
  if (state.kind === "missing") return <Gone t={t} />;
  if (state.kind === "loading") return <Skeleton label={t.loadingSaved} />;
  if (state.kind !== "ready") return <CorpCard as="div"><BState kind="failed" alert title={t.savedFailed} line={t.checkConnection}
    action={{ label: t.tryAgain, onClick: () => { setState({ kind: "loading" }); setAttempt(value => value + 1); } }} /></CorpCard>;
  const version = state.version;
  const number = (id: string) => entry.versions.findIndex(item => item.versionId === id) + 1;
  const publishable = !version.publishedAt && version.versionId === latestOf(entry)?.versionId;
  // The list and the text must describe one saved version; if not, this screen is stale and can't publish.
  const mismatch = meta.textDigest !== version.textDigest;
  const current = entryState(entry, ctx.now, ctx.timeZone).published;
  const futureStart = !!version.effectiveFrom && Date.parse(version.effectiveFrom) > ctx.now;
  const edit = entry.kind === "profile" ? viewHref({ name: "profile" }) : viewHref({ name: "document", documentId: entry.documentId });
  const publish = async () => {
    if (mismatch) return;
    requestId.current ??= newRequestId();
    const ok = await ctx.send({ op: "publish", requestId: requestId.current, expectedRevision: ctx.snapshot.revision, documentId: entry.documentId, versionId: version.versionId, reviewedTextDigest: version.textDigest });
    if (!ok) requestId.current = null;
  };
  const status = version.current ? t.inUse : version.publishedAt ? t.earlierVersion : t.draft;
  const short = (iso: string | null) => iso ? new Intl.DateTimeFormat(LOCALE[lang], { timeZone: ctx.timeZone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(new Date(iso)) : null;
  const fact = (label: string, value: ReactNode) => <li key={label}><CorpRow one title={label} value={value} valueTone="soft" /></li>;
  const effect = current ? t.replaces(number(current.versionId))
    : futureStart ? t.startsSentence(zonedTime(version.effectiveFrom, ctx.timeZone, lang, true) ?? "") : t.rightAway;
  return <>
    {problem}
    <CorpSection id="kn-text" label={t.version(number(version.versionId))} aside={<span className="kn-meta">{t.plainTextMeta(status)}</span>}>
      <CorpCard as="div">
        <pre className="kn-source" tabIndex={0} aria-label={t.savedTextOf(number(version.versionId))}>{version.body}</pre>
      </CorpCard>
    </CorpSection>

    {publishable ? <CorpSection id="kn-publish" label={t.publishForRondo}>
      <CorpCard as="div"><CorpBody>
        <div className="kn-publish">
          {current && futureStart ? <BCallout tone="amber" title={t.gapUntil(shortDay(version.effectiveFrom!, ctx.timeZone, lang))}>{t.stopsWhenPublish(number(current.versionId))}</BCallout> : null}
          <p className="kn-para">{effect}</p>
          {mismatch ? <p className="c-error" role="alert"><ErrorText>{t.outOfDate}</ErrorText></p> : null}
          <div className="kn-actions">
            <CorpButtonLink href={edit} kind="secondary" size="md" className="b-rowact b-rowact--quiet">{t.edit}</CorpButtonLink>
            <CorpButton kind="primary" size="md" disabled={ctx.busy || mismatch} onClick={() => void publish()}>{ctx.busy ? t.publishing : t.publishForRondo}</CorpButton>
          </div>
        </div>
      </CorpBody></CorpCard>
    </CorpSection> : null}

    <CorpSection id="kn-details" label={t.details}>
      <CorpCard as="div"><CorpRows label={t.details}>
        {fact(t.title, version.title)}
        {fact(t.writtenIn, t.locales[version.locale])}
        {version.kind === "document" ? fact(t.topic, topicOf(t, version.category)) : null}
        {version.sourceName ? fact(t.fromFileLabel, version.sourceName) : null}
        {fact(t.dateLabels.effectiveFrom, short(version.effectiveFrom) ?? t.whenPublished)}
        {version.effectiveUntil ? fact(t.dateLabels.effectiveUntil, short(version.effectiveUntil)) : null}
        {version.reviewDue ? fact(t.dateLabels.reviewDue, short(version.reviewDue)) : null}
        {fact(t.saved, short(version.createdAt))}
        <li><CorpRow title={t.fingerprint} detail={<span className="kn-digest">{version.textDigest}</span>} /></li>
        <li><a className="c-row kn-extrow" href={versionHref(entry.documentId, version.versionId)} target="_blank" rel="noreferrer">
          <span className="c-row__icon" aria-hidden="true"><ArrowSquareOutIcon weight="bold" /></span>
          <span className="c-row__main"><span className="c-row__title">{t.openPlain}</span><span className="c-row__detail"><span>{t.privateTab}</span></span></span>
        </a></li>
      </CorpRows></CorpCard>
    </CorpSection>
    {!publishable && !version.publishedAt ? <CorpNote>{t.newerDraft}</CorpNote> : null}
  </>;
}

/** The views a loaded page shows, for render tests (the page itself reads the list after the first paint). */
export const KNOWLEDGE_VIEWS = { Library, EntryDetail, ProfileForm, DocumentForm, IssueCard };
