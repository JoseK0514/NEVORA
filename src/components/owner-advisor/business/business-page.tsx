"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";
import { ArrowSquareOutIcon } from "@phosphor-icons/react/dist/ssr/ArrowSquareOut";
import { BankIcon } from "@phosphor-icons/react/dist/ssr/Bank";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ClockCounterClockwise";
import { EyeSlashIcon } from "@phosphor-icons/react/dist/ssr/EyeSlash";
import { ListChecksIcon } from "@phosphor-icons/react/dist/ssr/ListChecks";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { MinusCircleIcon } from "@phosphor-icons/react/dist/ssr/MinusCircle";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/ssr/PencilSimple";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { ReceiptIcon } from "@phosphor-icons/react/dist/ssr/Receipt";
import { TrashIcon } from "@phosphor-icons/react/dist/ssr/Trash";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { CorpBody, CorpButton, CorpButtonLink, CorpCard, CorpEmptyRow, CorpField, CorpFormFooter, CorpNav, CorpNote, CorpPage, CorpPill, CorpRow, CorpRows, CorpSection, CorpTitle } from "@/components/corp/corp";
import { BCallout, BState } from "@/components/owner-b/b-kit";
import { FormHead, FormHeadLink } from "@/components/team/team-forms";
import "@/components/team/team-forms.css";
import { toast } from "@/components/toaster";
import type {
  BusinessApiResult, BusinessCatalog, BusinessCsvMapping, BusinessCurrency, BusinessDomain, BusinessFinding, BusinessRecord, BusinessSourceSpec, BusinessSourceView,
  BusinessValidationDetail,
} from "@/lib/owner-advisor/business/contracts";
import { formatBusinessMinor } from "@/lib/owner-advisor/business/metrics";
import {
  BUSINESS_LIMITS, CONSTANT_FIELDS, RECORD_FIELDS, RECORD_KINDS, citationHref, clearPending, createBusinessClient, csvHeader, currentUntil, instantFromLocal, loadPending, momentText,
  namespaceFrom, newRequestId, pendingFor, periodText, recordSummary, recordsFromJson, savePending, sizeText, utf8Bytes, versionState, windowFromDays,
  type BusinessClient, type BusinessWrite, type BusinessWriteOp, type PendingOperation, type RefusedCode,
} from "./business-client";
import { BUSINESS_COPY, BUSINESS_LOCALE, type BusinessCopy, type BusinessLang } from "./copy";
import { financeFigures, salesFigures } from "./figures";
import { viewHref, type BusinessView } from "./views";
import { FiguresPanel, MapReview, MapView } from "./business-map";
import "./business.css";
import {useBusinessReview} from "./use-business-read";
import { useAdvisorLang } from "../lang";

/* Rondo business records (Nov 17, 2026). The Owner's sales and cash records that Rondo may cite: what exists, its period,
 * whether it is in use, and the same Draft → Review the exact rows → Publish rhythm as company knowledge, on the corporate
 * kit the Direction B layers dress. Nothing reads as published until the server's receipt says so. A write that wasn't
 * confirmed keeps its exact command in memory and only its identifiers in session storage; it is checked by its original
 * identity and never replaced. Private rows stay on screen for the server's short lease and are cleared when it ends or
 * the Owner steps away. */

const LIBRARY = viewHref({ name: "library" });
type Op = "stage" | "publish" | "discard" | "withdraw" | "delete";
const opOf = (op: BusinessWriteOp | string): Op => op.startsWith("stage") ? "stage" : op.startsWith("publish") ? "publish" : op.startsWith("discard") ? "discard" : op.startsWith("withdraw") ? "withdraw" : "delete";
export type BusinessIssue = { code: Exclude<RefusedCode, "forbidden">; op: Op; detail: BusinessValidationDetail | null; sourceId: string | null; mapOp?: boolean };
export type BusinessPending = { meta: PendingOperation; payload: BusinessWrite | null; status: "sending" | "uncertain" | "checking" | "unconfirmed" | "foreign" };
export type BusinessLoad = { state: "loading" } | { state: "ready"; catalog: BusinessCatalog; authority: string } | { state: "failed" } | { state: "offline" } | { state: "revoked" } | { state: "off" };
export type BusinessCtx = Ctx;
type Ctx = { authority?: string; client: BusinessClient; t: BusinessCopy; lang: BusinessLang; locale: string; timeZone: string; catalog: BusinessCatalog; now: number; busy: boolean; locked: boolean;
  send: (command: BusinessWrite) => Promise<boolean>; revoke: () => void };

const catalogForeground=()=>document.visibilityState!=="hidden"&&navigator.onLine&&document.hasFocus();
const sessionStore = () => { try { return typeof window === "undefined" ? null : window.sessionStorage; } catch { return null; } };


export function BusinessPage({ timeZone, view, importsEnabled, retrievalEnabled, client: given, lang: langProp, initial, initialPending = null, initialIssue = null }: {
  timeZone: string; view: BusinessView; importsEnabled: boolean; retrievalEnabled: boolean; client?: BusinessClient; lang?: BusinessLang;
  /** For tests and stories: a first state to render without a read. */
  initial?: BusinessLoad; initialPending?: BusinessPending | null; initialIssue?: BusinessIssue | null;
}) {
  // An explicit language wins; otherwise the person's Rondo language.
  const advisorLang = useAdvisorLang(), lang: BusinessLang = langProp ?? advisorLang;
  const t = BUSINESS_COPY[lang], locale = BUSINESS_LOCALE[lang];
  const client = useMemo(() => given ?? createBusinessClient(), [given]);
  const router = useRouter();
  const [load, setLoad] = useState<BusinessLoad>(initial ?? (importsEnabled ? { state: "loading" } : { state: "off" }));
  const [pending, setPending] = useState<BusinessPending | null>(initialPending);
  const [issue, setIssue] = useState<BusinessIssue | null>(initialIssue);
  const [now, setNow] = useState(() => Date.now());
  const viewKey = viewHref(view);
  const shownView = useRef(viewKey);
  const authority = load.state === "ready" ? load.authority : null;

  const catalogDeadline=useRef(0),catalogGeneration=useRef(0),mounted=useRef(false),focused=useRef(true),catalogRequest=useRef<AbortController|null>(null);
  const catalogTimers=useRef<{end?:ReturnType<typeof setTimeout>;renew?:ReturnType<typeof setTimeout>}>({});
  const retireCatalog=useCallback((state:BusinessLoad["state"]="loading")=>{
    catalogGeneration.current++;catalogDeadline.current=0;catalogRequest.current?.abort();catalogRequest.current=null;
    clearTimeout(catalogTimers.current.end);clearTimeout(catalogTimers.current.renew);catalogTimers.current={};
    if(mounted.current){setLoad({state} as BusinessLoad);setIssue(null);}
  },[]);
  const revoke=useCallback(()=>retireCatalog("revoked"),[retireCatalog]);
  const reload=useCallback(async function refreshCatalog(){
    if(!importsEnabled||!mounted.current||!focused.current||!catalogForeground())return null;
    const generation=++catalogGeneration.current,controller=new AbortController();catalogRequest.current?.abort();catalogRequest.current=controller;
    clearTimeout(catalogTimers.current.renew);
    const outcome=await client.catalog(controller.signal);
    if(!mounted.current||generation!==catalogGeneration.current||!focused.current||!catalogForeground())return null;
    catalogRequest.current=null;
    if(outcome.kind==="refused"&&outcome.code==="forbidden"){revoke();return null;}
    if(outcome.kind==="refused"&&outcome.code==="disabled"){retireCatalog("off");return null;}
    if(outcome.kind!=="ok"||!outcome.result.catalog){retireCatalog(navigator.onLine?"failed":"offline");return null;}
    const catalog=outcome.result.catalog,by=outcome.result.authority;
    clearTimeout(catalogTimers.current.end);
    catalogDeadline.current=performance.now()+outcome.result.validForMs;
    catalogTimers.current.end=setTimeout(()=>retireCatalog("failed"),outcome.result.validForMs);
    catalogTimers.current.renew=setTimeout(()=>void refreshCatalog(),Math.max(1,outcome.result.validForMs*.7));
    setNow(Date.now());setLoad({state:"ready",catalog,authority:by});
    setPending(old=>old&&old.status!=="sending"&&old.meta.authority!==by?{...old,status:"foreign"}:old);
    return catalog;
  },[client,importsEnabled,revoke,retireCatalog]);
  useEffect(()=>{
    mounted.current=true;focused.current=catalogForeground();
    if(initial)return()=>{mounted.current=false;retireCatalog();};
    const generation=catalogGeneration.current;
    queueMicrotask(()=>{if(!mounted.current||generation!==catalogGeneration.current)return;const kept=loadPending(sessionStore());if(kept)setPending(old=>old??{meta:kept,payload:null,status:"uncertain"});void reload();});
    const away=()=>{focused.current=false;retireCatalog(navigator.onLine?"loading":"offline");};
    const back=()=>{if(catalogForeground()){focused.current=true;void reload();}};
    const visible=()=>document.visibilityState==="hidden"?away():back();
    document.addEventListener("visibilitychange",visible);window.addEventListener("online",back);window.addEventListener("focus",back);window.addEventListener("pageshow",back);
    window.addEventListener("blur",away);window.addEventListener("offline",away);window.addEventListener("pagehide",away);
    return()=>{mounted.current=false;retireCatalog();document.removeEventListener("visibilitychange",visible);window.removeEventListener("online",back);window.removeEventListener("focus",back);window.removeEventListener("pageshow",back);window.removeEventListener("blur",away);window.removeEventListener("offline",away);window.removeEventListener("pagehide",away);};
  },[initial,reload,retireCatalog]);
  // An unconfirmed write's exact command lives only on this page: leaving would lose the one way to send it again unchanged.
  const holding = !!pending?.payload && pending.status !== "foreign";
  useEffect(() => {
    if (!holding) return;
    const hold = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", hold);
    return () => window.removeEventListener("beforeunload", hold);
  }, [holding]);
  // A new view puts focus on its title (the phone header's or the band's, whichever is shown).
  useEffect(() => {
    if (shownView.current === viewKey) return;
    shownView.current = viewKey;
    const title = [...document.querySelectorAll<HTMLElement>(".be > :is(.c-nav, .c-title) h1")].find(heading => heading.getClientRects().length > 0);
    if (!title) return;
    if (!title.hasAttribute("tabindex")) title.tabIndex = -1;
    title.focus();
  }, [viewKey]);
  // A problem is said at the top while the Owner is at the button below: bring it into view and focus it.
  const problemKey = pending && pending.status !== "sending" ? `pending:${pending.status}` : issue ? `issue:${issue.code}` : null;
  useEffect(() => {
    if (!problemKey || initial) return;
    const card = document.querySelector<HTMLElement>(".be .be-issue");
    card?.scrollIntoView({ block: "center", behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    card?.focus({ preventScroll: true });
  }, [problemKey, initial]);

  const go = useCallback((next: BusinessView) => { router.push(viewHref(next)); }, [router]);
  const finish = useCallback(async (kind: string, receipt: NonNullable<BusinessApiResult["receipt"]>) => {
    clearPending(sessionStore());
    setPending(null);
    setIssue(null);
    const op = opOf(kind);
    const catalog = await reload();
    toast(t.toast[op]);
    if (kind.endsWith("coverage_map")) go(op === "stage" && receipt.mapVersionId ? { name: "mapreview", mapVersionId: receipt.mapVersionId } : { name: "map" });
    else if (op === "stage" && receipt.sourceId && receipt.versionId) go({ name: "version", sourceId: receipt.sourceId, versionId: receipt.versionId });
    else if (op === "delete" || !receipt.sourceId || (catalog && !catalog.sources.some(item => item.sourceId === receipt.sourceId))) go({ name: "library" });
    else go({ name: "record", sourceId: receipt.sourceId });
  }, [go, reload, t]);

  const deliver = useCallback(async (command: BusinessWrite, meta: PendingOperation) => {
    setPending({ meta, payload: command, status: "sending" });
    const outcome = await client.send(command);
    if (outcome.kind === "ok" && outcome.result.state === "saved" && outcome.result.receipt) { await finish(outcome.result.receipt.kind, outcome.result.receipt); return true; }
    if (outcome.kind === "refused" && outcome.code === "forbidden") { setPending({ meta, payload: command, status: "uncertain" }); revoke(); return false; }
    if (outcome.kind === "refused" && outcome.code !== "forbidden") {
      // The server refused this exact request before saving it. A conflict shows what is current; the Owner decides again.
      clearPending(sessionStore());
      setPending(null);
      setIssue({ code: outcome.code, op: opOf(command.op), detail: outcome.detail, sourceId: meta.sourceId, mapOp: command.op.endsWith("coverage_map") });
      if (outcome.code === "conflict") await reload();
      return false;
    }
    setPending({ meta, payload: command, status: "uncertain" });
    return false;
  }, [client, finish, reload, revoke]);
  const send = useCallback(async (command: BusinessWrite) => {
    if (pending || !authority) return false;
    if(!mounted.current||!focused.current||!catalogForeground()||performance.now()>=catalogDeadline.current){retireCatalog();return false;}
    setIssue(null);
    const meta = pendingFor(command, authority);
    // Kept before the request leaves, so a reload mid-flight can still check it. Identifiers only.
    savePending(sessionStore(), meta);
    return deliver(command, meta);
  }, [authority, deliver, pending,retireCatalog]);
  const check = useCallback(async () => {
    if (!pending || pending.status === "sending" || pending.status === "checking") return;
    const { meta, payload } = pending;
    setPending({ meta, payload, status: "checking" });
    const outcome = await client.send({ op: "check_source_operation", requestId: newRequestId(), operationId: meta.operationId });
    if (outcome.kind === "refused" && outcome.code === "forbidden") { setPending({ meta, payload, status: "uncertain" }); revoke(); return; }
    if (outcome.kind === "ok" && outcome.result.authority !== meta.authority) { setPending({ meta, payload, status: "foreign" }); return; }
    if (outcome.kind === "ok" && outcome.result.state === "saved" && outcome.result.receipt) { await finish(outcome.result.receipt.kind, outcome.result.receipt); return; }
    // "Not saved" means no finished receipt was seen. It is not proof the request can't still finish.
    setPending({ meta, payload, status: outcome.kind === "ok" ? "unconfirmed" : "uncertain" });
    if (outcome.kind === "ok") await reload();
  }, [client, finish, pending, reload, revoke]);
  const resend = useCallback(async () => { if (pending?.payload && pending.status !== "sending") await deliver(pending.payload, pending.meta); }, [deliver, pending]);
  const stop = useCallback(async () => { clearPending(sessionStore()); setPending(null); await reload(); }, [reload]);

  const head = heading(view, load.state === "ready" ? load.catalog : null, t);
  const pendingCard = pending && pending.status !== "sending" ? <PendingCard t={t} pending={pending} onCheck={() => void check()} onResend={() => void resend()} onStop={() => void stop()} /> : null;
  const frame = `be ${head.sheet ? "c-sheetpage" : "c-page--narrow"}`;

  if (load.state === "revoked") return <CorpPage className="c-page--narrow be" labelledBy="be-title">
    <CorpNav phoneOnly back={{ href: "/app/ai-manager", label: t.backToAdvisor }} title={t.title} />
    <CorpTitle wide id="be-title" title={t.title} />
    <CorpCard as="div"><BState kind="locked" alert title={t.sessionEnded} line={t.sessionLine} action={{ label: t.signIn, href: "/login" }} /></CorpCard>
  </CorpPage>;
  // Maintenance off: no list, no drafts, no records. Only the original-operation check stays (answer 8), and "off" is said once.
  if (load.state === "off") return <CorpPage className="c-page--narrow be" labelledBy="be-title">
    <CorpNav phoneOnly back={{ href: "/app/ai-manager", label: t.backToAdvisor }} title={t.title} titleId="be-nav-title" />
    <CorpTitle wide id="be-title" title={t.title} sub={t.sub} />
    {pendingCard}
    <CorpCard as="div"><BState kind="locked" title={retrievalEnabled ? t.readOnlyOff : t.off} line={retrievalEnabled ? t.readOnlyOffLine : t.offLine} /></CorpCard>
  </CorpPage>;
  if (load.state !== "ready") return <CorpPage className={frame} labelledBy="be-title">
    {head.node}
    {pendingCard}
    {load.state === "loading" ? <Skeleton label={t.loading} />
      : <CorpCard as="div">{load.state === "offline"
        ? <BState kind="offline" alert title={t.offline} line={t.offlineLine} action={{ label: t.tryAgain, onClick: () => { setLoad({ state: "loading" }); void reload(); } }} />
        : <BState kind="failed" alert title={t.loadFailed} line={t.checkConnection} action={{ label: t.tryAgain, onClick: () => { setLoad({ state: "loading" }); void reload(); } }} />}</CorpCard>}
  </CorpPage>;

  const catalog = load.catalog;
  const ctx: Ctx = { authority: load.authority, client, t, lang, locale, timeZone: catalog.timeZone || timeZone, catalog, now, busy: pending?.status === "sending", locked: !!pending, send, revoke };
  const source = "sourceId" in view && view.sourceId ? catalog.sources.find(item => item.sourceId === view.sourceId) ?? null : null;
  const problem = <>{pendingCard}{issue ? <IssueCard t={t} issue={issue} /> : null}</>;
  return <CorpPage key={load.authority} className={frame} labelledBy="be-title">
    {head.node}
    {view.name === "library" ? <Library ctx={ctx} problem={problem} />
      : view.name === "new" ? (view.sourceId && !source ? <Gone t={t} /> : <RecordForm key={view.sourceId ?? "new"} ctx={ctx} source={source} problem={problem} />)
      : view.name === "map" ? <MapView key={`map:${catalog.revision}:${catalog.mapRevision ?? 0}`} ctx={ctx} problem={problem} />
      : view.name === "mapreview" ? <MapReview key={view.mapVersionId} ctx={ctx} mapVersionId={view.mapVersionId} problem={problem} />
      : view.name === "figures" ? <FiguresPanel ctx={ctx} problem={problem} />
      : !source ? <>{problem}<Gone t={t} /></>
      : view.name === "record" ? <RecordDetail key={`${source.sourceId}:${catalog.revision}`} ctx={ctx} source={source} problem={problem} />
      : <VersionReview key={view.versionId} ctx={ctx} source={source} versionId={view.versionId} problem={problem} />}
  </CorpPage>;
}

/* ---------- Page heads ---------- */
function heading(view: BusinessView, catalog: BusinessCatalog | null, t: BusinessCopy): { node: ReactNode; sheet?: boolean } {
  const source = catalog && "sourceId" in view && view.sourceId ? catalog.sources.find(item => item.sourceId === view.sourceId) ?? null : null;
  switch (view.name) {
    case "library": return { node: <>
      {/* Rondo fix (Nov 23): adding a record is the card's one action (the empty card's button, or the list's last row). */}
      <CorpNav phoneOnly back={{ href: "/app/ai-manager", label: t.backToAdvisor }} title={t.title} titleId="be-nav-title" />
      <CorpTitle wide id="be-title" title={t.title} sub={t.sub} />
    </> };
    case "record": return { node: <>
      <CorpNav phoneOnly back={{ href: LIBRARY, label: t.titleShort }} title={source?.name ?? t.record} titleId="be-nav-title" />
      <CorpTitle wide id="be-title" title={source?.name ?? t.record} sub={source ? `${t.domain[source.domain]} · ${source.currency}` : undefined} />
    </> };
    case "version": return { node: <>
      <CorpNav phoneOnly back={{ href: viewHref({ name: "record", sourceId: view.sourceId }), label: t.record }} title={t.reviewShort} titleId="be-nav-title" />
      <CorpTitle wide id="be-title" title={t.reviewTitle} sub={source?.name} />
    </> };
    case "map": return { node: <>
      <CorpNav phoneOnly back={{ href: LIBRARY, label: t.titleShort }} title={t.mainRecords} titleId="be-nav-title" />
      <CorpTitle wide id="be-title" title={t.mainRecords} sub={t.mapSub} />
    </> };
    case "mapreview": return { node: <>
      <CorpNav phoneOnly back={{ href: viewHref({ name: "map" }), label: t.mainRecords }} title={t.reviewShort} titleId="be-nav-title" />
      <CorpTitle wide id="be-title" title={t.mapReviewTitle} sub={t.mapSub} />
    </> };
    case "figures": return { node: <>
      <CorpNav phoneOnly back={{ href: LIBRARY, label: t.titleShort }} title={t.figuresRow} titleId="be-nav-title" />
      <CorpTitle wide id="be-title" title={t.figuresRow} sub={t.figuresSub} />
    </> };
    case "new": {
      const cancel = view.sourceId ? viewHref({ name: "record", sourceId: view.sourceId }) : LIBRARY;
      return { sheet: true, node: <FormHead titleId="be-title" title={view.sourceId ? t.newVersionTitle : t.newTitle} back={{ href: cancel, label: view.sourceId ? t.record : t.titleShort }}
        left={<FormHeadLink href={cancel}>{t.cancel}</FormHeadLink>} right={catalog ? <button type="submit" form="be-form">{t.save}</button> : undefined} /> };
    }
  }
}

function Skeleton({ label }: { label: string }) {
  return <section className="c-card be-skel" aria-busy="true" aria-label={label}>
    <span className="be-skel__bar be-skel__bar--head" />
    {[56, 44, 62].map(width => <span key={width} className="be-skel__row"><span className="be-skel__dot" /><span className="be-skel__lines"><span className="be-skel__bar" style={{ width: `${width}%` }} /><span className="be-skel__bar be-skel__bar--thin" style={{ width: `${width - 18}%` }} /></span></span>)}
  </section>;
}
function Gone({ t }: { t: BusinessCopy }) {
  return <CorpCard as="div"><BState kind="empty" title={t.gone} line={t.goneLine} action={{ label: t.backToRecords, href: LIBRARY }} /></CorpCard>;
}

/* ---------- Problems and recovery ---------- */
/** What the server said about a file it refused: the safe code, field and position only, never the rejected value. */
export function validationText(t: BusinessCopy, detail: BusinessValidationDetail) {
  const code = t.validation[detail.code], field = detail.field ? t.validationField[detail.field] : null, at = t.problemAt(detail.row, detail.line);
  if (!code || (detail.field && !field)) return t.notAcceptedLine;
  return [`${code}.`, field ? `${t.check(field)}${at ? ` · ${at}` : ""}.` : at ? `${at.charAt(0).toUpperCase()}${at.slice(1)}.` : null].filter(Boolean).join(" ");
}
export function IssueCard({ t, issue }: { t: BusinessCopy; issue: BusinessIssue }) {
  const tooLarge = issue.detail?.code === "INPUT_LIMIT";
  const copy = issue.code === "conflict" ? { title: t.conflict, line: t.conflictLine }
    : issue.code === "disabled" ? { title: t.offNothing, line: t.nothingSaved }
    : tooLarge ? { title: t.tooLarge, line: t.tooLargeLine }
    : issue.code === "limit" ? { title: t.full, line: t.nothingSaved }
    : { title: t.notAccepted, line: issue.detail ? validationText(t, issue.detail) : t.notAcceptedLine };
  const amber = issue.code === "conflict" || issue.code === "disabled";
  return <section className="c-card be-issue" tabIndex={-1} aria-label={copy.title}>
    <BState kind={amber ? "paused" : "failed"} icon={amber ? <WarningIcon weight="bold" /> : undefined} alert title={copy.title} line={copy.line}
      action={issue.code === "conflict" && (issue.sourceId || issue.mapOp) ? { label: t.seeCurrent, href: issue.mapOp ? viewHref({ name: "map" }) : viewHref({ name: "record", sourceId: issue.sourceId! }) } : undefined} />
  </section>;
}
/** A write the server hasn't confirmed. Never shown as failed and never as done; the original is checked, not replaced. */
export function PendingCard({ t, pending, onCheck, onResend, onStop }: { t: BusinessCopy; pending: BusinessPending; onCheck: () => void; onResend: () => void; onStop: () => void }) {
  if (pending.status === "checking") return <section className="c-card be-issue" tabIndex={-1} aria-busy="true"><BState kind="loading" title={t.checking} /></section>;
  if (pending.status === "foreign") return <section className="c-card be-issue" tabIndex={-1} aria-label={t.foreign}>
    <BState kind="paused" icon={<WarningIcon weight="bold" />} alert title={t.foreign} line={t.foreignLine}><span className="be-acts"><CorpButton kind="primary" size="md" onClick={onStop}>{t.ok}</CorpButton></span></BState>
  </section>;
  const line = pending.status === "unconfirmed" ? (pending.payload ? t.notConfirmedStill : `${t.notConfirmedStill} ${t.notConfirmedReload}`) : pending.payload ? t.notConfirmedLine(opOf(pending.meta.op)) : t.notConfirmedReload;
  return <section className="c-card be-issue" tabIndex={-1} aria-label={t.notConfirmed}>
    <BState kind="paused" icon={<WarningIcon weight="bold" />} alert title={t.notConfirmed} line={line}>
      <span className="be-acts">
        <CorpButton kind="primary" size="md" onClick={onCheck}>{t.checkAgain}</CorpButton>
        {pending.payload ? <CorpButton kind="secondary" size="md" className="b-rowact b-rowact--go" onClick={onResend}>{t.sendAgain}</CorpButton> : null}
      </span>
    </BState>
  </section>;
}

/* ---------- Library ---------- */
function stateValue(t: BusinessCopy, summary: ReturnType<typeof recordSummary>): ReactNode {
  if (summary.state === "withdrawn") return t.state.withdrawn;
  if (summary.state === "draft") return <CorpPill tone="amber">{t.state.draft}</CorpPill>;
  if (summary.draftWaiting) return <CorpPill tone="amber">{t.state.draftWaiting}</CorpPill>;
  return summary.state === "in_use" ? t.state.in_use : t.state.past;
}
export function Library({ ctx, problem }: { ctx: Ctx; problem?: ReactNode }) {
  const { t, catalog } = ctx;
  const sources = [...catalog.sources].filter(item => !item.deleted).sort((a, b) => a.name.localeCompare(b.name, ctx.locale) || a.sourceId.localeCompare(b.sourceId));
  const active = sources.filter(item => item.active), withdrawn = sources.filter(item => !item.active);
  const row = (source: BusinessSourceView) => {
    const summary = recordSummary(catalog, source, ctx.now), shown = summary.current[0] ?? summary.drafts[0] ?? summary.versions[0];
    return <li key={source.sourceId}><CorpRow href={viewHref({ name: "record", sourceId: source.sourceId })}
      icon={source.domain === "SALES" ? <ReceiptIcon weight="bold" /> : <BankIcon weight="bold" />} title={source.name}
      detail={[t.domain[source.domain], source.currency, shown?.metadata ? periodText(shown.metadata.window, ctx.timeZone, ctx.locale) : null].filter(Boolean).join(" · ")}
      value={stateValue(t, summary)} valueTone="soft" /></li>;
  };
  const map = catalog.maps.find(item => item.current && item.status === "PUBLISHED")?.input ?? null;
  const cells = (map?.cells ?? []).filter(cell => catalog.sources.some(item => item.sourceId === cell.sourceId));
  if (!sources.length) return <>
    {problem}
    <CorpCard as="div"><BState kind="empty" title={t.empty} line={t.emptyLine} action={{ label: t.add, href: viewHref({ name: "new", sourceId: null }) }} /></CorpCard>
  </>;
  return <>
    {problem}
    <CorpSection id="be-records" label={t.records} aside={<span className="be-meta">{t.countOf(active.length)}</span>}>
      <CorpCard as="div"><CorpRows label={t.records}>
        {active.length ? active.map(row) : <CorpEmptyRow as="li">{t.empty}</CorpEmptyRow>}
        <li><Link className="be-addrow" href={viewHref({ name: "new", sourceId: null })}><PlusIcon weight="bold" aria-hidden="true" />{t.add}</Link></li>
      </CorpRows></CorpCard>
    </CorpSection>
    {withdrawn.length ? <CorpSection id="be-withdrawn" label={t.withdrawnSection} count={withdrawn.length}>
      <CorpCard as="div"><CorpRows label={t.withdrawnSection}>{withdrawn.map(row)}</CorpRows></CorpCard>
    </CorpSection> : null}
    <CorpSection id="be-main" label={t.mainRecords}>
      <CorpCard as="div"><CorpRows label={t.mainRecords}>
        <li><CorpRow href={viewHref({ name: "map" })} icon={<ListChecksIcon weight="bold" />} title={t.mainRecords} detail={map ? t.entriesCount(cells.length) : t.mapEmptyLine}
          value={catalog.maps.some(item => item.status === "DRAFT") ? <CorpPill tone="amber">{t.state.draftWaiting}</CorpPill> : map ? t.state.in_use : t.mainEmpty} valueTone="soft" /></li>
        <li><CorpRow href={viewHref({ name: "figures" })} icon={<MagnifyingGlassIcon weight="bold" />} title={t.figuresRow} detail={t.figuresRowLine} /></li>
      </CorpRows></CorpCard>
    </CorpSection>
  </>;
}

/* ---------- One record ---------- */
export function RecordDetail({ ctx, source, problem, initialConfirm = null }: { ctx: Ctx; source: BusinessSourceView; problem?: ReactNode; initialConfirm?: "withdraw" | "delete" | null }) {
  const { t, catalog } = ctx;
  const summary = recordSummary(catalog, source, ctx.now);
  const [confirm, setConfirm] = useState<"withdraw" | "delete" | null>(initialConfirm);
  const [acknowledged, setAcknowledged] = useState(false);
  const requestId = useRef<string | null>(null);
  const confirmRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (confirm) confirmRef.current?.querySelector<HTMLElement>("h2")?.focus(); }, [confirm]);
  const act = async (op: "withdraw" | "delete") => {
    requestId.current ??= newRequestId();
    // The latest list's own revision and fingerprint for this record (answer 4); never the list's revision.
    const ok = await ctx.send({ op: op === "withdraw" ? "withdraw_source" : "delete_source", requestId: requestId.current, sourceId: source.sourceId, expectedRevision: source.revision, digest: source.scopeDigest, acknowledged: true });
    if (!ok) requestId.current = null;
  };
  const cancel = () => { setConfirm(null); setAcknowledged(false); requestId.current = null; };
  const current = summary.current.find(item => versionState(source, item, ctx.now) === "in_use") ?? summary.current[0] ?? null;
  const until = current ? currentUntil(source, current) : null;
  const dependents = (catalog.maps.find(item => item.current && item.status === "PUBLISHED")?.input?.cells ?? []).filter(cell => cell.sourceId === source.sourceId).length;
  const fact = (label: string, value: ReactNode) => <li key={label}><CorpRow one title={label} value={value} valueTone="soft" /></li>;
  const working = ctx.busy || ctx.locked;
  return <>
    {problem}
    <CorpSection id="be-status" label={t.status}>
      <CorpCard as="div"><CorpRows label={t.status}>
        <li>{summary.state === "withdrawn" ? <CorpRow icon={<MinusCircleIcon weight="bold" />} title={t.state.withdrawn} detail={t.withdrawnLine} />
          : summary.state === "draft" ? <CorpRow icon={<CheckCircleIcon weight="bold" />} title={t.notInUse} detail={t.notInUseLine} />
          : summary.state === "in_use" ? <CorpRow icon={<CheckCircleIcon weight="bold" />} title={t.inUseTitle} detail={until ? t.currentUntil(momentText(new Date(until).toISOString(), ctx.timeZone, ctx.locale)) : undefined} />
          : <CorpRow icon={<ClockCounterClockwiseIcon weight="bold" />} title={t.pastTitle} detail={t.pastLine} />}</li>
        {source.active ? summary.drafts.map(draft => <li key={draft.versionId}><CorpRow href={viewHref({ name: "version", sourceId: source.sourceId, versionId: draft.versionId })} icon={<PencilSimpleIcon weight="bold" />}
          title={t.draftRow} detail={[draft.metadata ? periodText(draft.metadata.window, ctx.timeZone, ctx.locale) : null, draft.metadata ? t.rows(draft.metadata.rowCount) : null].filter(Boolean).join(" · ")} /></li>) : null}
      </CorpRows></CorpCard>
    </CorpSection>

    <CorpSection id="be-versions" label={t.versions} count={summary.versions.length}>
      <CorpCard as="div"><CorpRows label={t.versions}>
        {summary.versions.map(item => {
          const state = versionState(source, item, ctx.now);
          return <li key={item.versionId}><CorpRow href={viewHref({ name: "version", sourceId: source.sourceId, versionId: item.versionId })}
            title={item.metadata ? periodText(item.metadata.window, ctx.timeZone, ctx.locale) : t.record}
            detail={[item.publishedAt ? t.published(momentText(item.publishedAt, ctx.timeZone, ctx.locale)) : t.notPublished, item.metadata ? t.rows(item.metadata.rowCount) : null].filter(Boolean).join(" · ")}
            value={state === "draft" || state === "draft_locked" ? <CorpPill tone="amber">{t.versionState[state]}</CorpPill> : t.versionState[state]} valueTone="soft" /></li>;
        })}
        {source.active ? <li><Link className="be-addrow" href={viewHref({ name: "new", sourceId: source.sourceId })}><PlusIcon weight="bold" aria-hidden="true" />{t.addVersion}</Link></li> : null}
      </CorpRows></CorpCard>
    </CorpSection>

    <CorpSection id="be-details" label={t.details}>
      <CorpCard as="div"><CorpRows label={t.details}>
        {fact(t.type, t.domain[source.domain])}
        {fact(t.currency, t.currencyName[source.currency])}
        {fact(t.comesFrom, source.namespace)}
        {fact(t.currentFor, t.age(source.maxAgeMinutes))}
      </CorpRows></CorpCard>
    </CorpSection>

    <CorpSection id="be-remove" label={source.active ? t.remove : t.removeDeleteOnly}>
      {confirm ? <CorpCard as="div"><div ref={confirmRef} className="be-confirm">
        <h2 tabIndex={-1} className="be-confirm__t">{confirm === "withdraw" ? t.withdrawTitle(source.name) : t.deleteTitle(source.name)}</h2>
        {confirm === "withdraw" ? <p className="be-confirm__b">{t.withdrawBody}</p>
          : <ul className="be-confirm__list"><li>{t.deleteErases}</li><li>{t.deleteRetires}</li>{dependents ? <li>{t.deleteMain(dependents)}</li> : null}<li>{t.deleteStays}</li></ul>}
        {/* Each consequence has its own confirmation; a publish acknowledgement is never reused here. */}
        {confirm === "delete" ? <label className="be-check"><input type="checkbox" checked={acknowledged} onChange={event => setAcknowledged(event.target.checked)} /><span>{t.cantUndo}</span></label> : null}
        <div className="be-actions">
          <CorpButton kind="secondary" size="md" className="b-rowact b-rowact--quiet" disabled={ctx.busy} onClick={cancel}>{t.cancel}</CorpButton>
          <CorpButton kind={confirm === "delete" ? "danger" : "primary"} size="md" disabled={working || (confirm === "delete" && !acknowledged)} onClick={() => void act(confirm)}>
            {ctx.busy ? (confirm === "withdraw" ? t.withdrawing : t.deleting) : confirm === "withdraw" ? t.withdraw : t.deleteLabel}</CorpButton>
        </div>
      </div></CorpCard>
      : <CorpCard as="div"><CorpRows label={source.active ? t.remove : t.removeDeleteOnly}>
          {source.active ? <li><CorpRow onClick={() => setConfirm("withdraw")} icon={<MinusCircleIcon weight="bold" />} title={t.withdraw} detail={t.withdrawLine} /></li> : null}
          <li><CorpRow onClick={() => setConfirm("delete")} danger icon={<TrashIcon weight="bold" />} title={t.deleteLabel} detail={t.deleteLine} /></li>
        </CorpRows></CorpCard>}
    </CorpSection>
  </>;
}

/* ---------- Review the exact rows ---------- */
function VersionReview({ ctx, source, versionId, problem }: { ctx: Ctx; source: BusinessSourceView; versionId: string; problem: ReactNode }) {
  const { t } = ctx;
  const [acknowledged,setAcknowledged]=useState(false),[confirmDiscard,setConfirmDiscard]=useState(false);
  const reviewed=useRef<string|null>(null),requestId=useRef<string|null>(null),sourceId=source.sourceId;
  const reset=()=>{reviewed.current=null;requestId.current=null;setAcknowledged(false);setConfirmDiscard(false);};
  const {state,read,publishable}=useBusinessReview(ctx,id=>({op:"read_source_version",requestId:id,sourceId,versionId}),
    result=>!!result.version&&!!result.receipt&&!!result.readReceiptId,result=>{
      const identity=`${result.version!.digest}:${result.receipt!.revision}:${result.readReceiptId}`;
      if(reviewed.current!==identity){reset();reviewed.current=identity;}
    },reset);
  const meta = ctx.catalog.versions.find(item => item.versionId === versionId && item.sourceId === sourceId) ?? null;
  if (state.kind === "gone" || (!meta && state.kind !== "loading" && state.kind !== "ready")) return <>{problem}<Gone t={t} /></>;
  if (state.kind === "loading" || state.kind === "idle") return <>{problem}<Skeleton label={t.loadingRows} /></>;
  if (state.kind === "hidden") return <>{problem}<CorpCard as="div"><BState kind="locked" icon={<EyeSlashIcon weight="bold" />} title={t.hidden} line={t.hiddenLine} action={{ label: t.showAgain, onClick: () => void read() }} /></CorpCard></>;
  if (state.kind === "failed") return <>{problem}<CorpCard as="div"><BState kind="failed" alert title={t.rowsFailed} line={t.checkConnection} action={{ label: t.tryAgain, onClick: () => void read() }} /></CorpCard></>;
  const result = state.result, version = result.version!;
  const exactCommand = { sourceId, versionId, expectedRevision: result.receipt!.revision, digest: version.digest, acknowledged: true as const };
  const publish = async () => {
    // The receipt's own expiry, with room for the trip. An expired review is read again, never sent.
    if (!publishable()) { void read(); return; }
    requestId.current ??= newRequestId();
    const ok = await ctx.send({ op: "publish_source_version", requestId: requestId.current, readReceiptId: result.readReceiptId!, ...exactCommand });
    // Not published: whatever the reason, the next publish is a new decision on a fresh read (a new receipt, digest and
    // revision). The acknowledgement is never carried over to get past a conflict.
    if (!ok) { requestId.current = null; reviewed.current = null; setAcknowledged(false); void read(); }
  };
  const discard = async () => { await ctx.send({ op: "discard_source_version", requestId: newRequestId(), ...exactCommand }); };
  return <ReviewContent ctx={ctx} source={source} result={result} eligible={meta?.publishEligible ?? version.publishEligible ?? false} acknowledged={acknowledged} setAcknowledged={setAcknowledged}
    confirmDiscard={confirmDiscard} setConfirmDiscard={setConfirmDiscard} onPublish={() => void publish()} onDiscard={() => void discard()} problem={problem} />;
}

function recordRow(t: BusinessCopy, record: BusinessRecord, currency: BusinessCurrency, places: Map<string, string>, timeZone: string, locale: string) {
  const when = "occurredAt" in record ? record.occurredAt : "recordedAt" in record ? record.recordedAt : record.at;
  const amount = "amountMinor" in record ? record.amountMinor : "deltaMinor" in record ? record.deltaMinor : "feeMinor" in record ? record.feeMinor : "collectedMinor" in record ? record.collectedMinor : null;
  const ref = "accountRef" in record ? record.accountRef : record.orderRef;
  const detail = [momentText(when, timeZone, locale), "locationId" in record ? places.get(record.locationId) ?? t.unknownPlace : null,
    "state" in record ? t.rowState[record.state] : null, "dueDate" in record ? t.due(new Intl.DateTimeFormat(locale, { timeZone: "UTC", month: "short", day: "numeric" }).format(new Date(`${record.dueDate}T12:00:00Z`))) : null, record.recordId].filter(Boolean).join(" · ");
  return <li key={record.recordId}><CorpRow title={`${t.kind[record.kind]} · ${ref}`} detail={detail} value={amount === null ? undefined : formatBusinessMinor(amount, currency)} valueTone="soft" /></li>;
}
function findingRow(t: BusinessCopy, finding: BusinessFinding, currency: BusinessCurrency, index: number) {
  const count = finding.count ?? finding.recordIds.length;
  const detail = [finding.accountRef ? t.account(finding.accountRef) : null, finding.differenceMinor !== null ? t.checkDifference(formatBusinessMinor(finding.differenceMinor, currency)) : null,
    count ? t.checkCount(count) : null].filter(Boolean).join(" · ");
  return <li key={index}><CorpRow icon={<WarningCircleIcon weight="bold" />} title={t.finding[finding.code]} detail={detail || undefined} /></li>;
}
/** The review itself: every row the server sent, its totals, what to check, then the decision. */
export function ReviewContent({ ctx, source, result, eligible, acknowledged, setAcknowledged, confirmDiscard, setConfirmDiscard, onPublish, onDiscard, problem }: {
  ctx: Ctx; source: BusinessSourceView; result: BusinessApiResult; eligible: boolean; acknowledged: boolean; setAcknowledged: (value: boolean) => void;
  confirmDiscard: boolean; setConfirmDiscard: (value: boolean) => void; onPublish: () => void; onDiscard: () => void; problem?: ReactNode;
}) {
  const { t } = ctx, version = result.version!, input = version.input!, check = version.validation!;
  const places = new Map(ctx.catalog.activeLocations.map(place => [place.id, place.name]));
  const metrics = check.finance ?? check.sales, currencies = check.finance?.currencies.map(c => ({ currency: c.currency, figures: financeFigures(t, c) }))
    ?? check.sales?.currencies.map(c => ({ currency: c.currency, figures: salesFigures(t, c) })) ?? [];
  const state = versionState(source, { ...version, publishEligible: eligible, metadata: { window: input.window, sourceAsOf: input.sourceAsOf, completeness: input.completeness, rowCount: input.records.length, payloadBytes: 0 } }, ctx.now);
  const draft = version.status === "DRAFT";
  const blocked = check.qualifiers.includes("PARTIAL_NOT_PUBLISHABLE") ? t.cantPartial : check.qualifiers.includes("SOURCE_TIMEZONE_CHANGED_RESTAGE_REQUIRED") ? t.cantZone : !eligible ? t.cantOwner : null;
  const replaces = ctx.catalog.versions.some(item => item.sourceId === source.sourceId && item.current && item.status === "PUBLISHED" && item.metadata &&
    item.metadata.window.fromAt < input.window.toAt && input.window.fromAt < item.metadata.window.toAt);
  const period = periodText(input.window, version.timeZone, ctx.locale);
  const fact = (label: string, value: ReactNode) => <li key={label}><CorpRow one title={label} value={value} valueTone="soft" /></li>;
  const working = ctx.busy || ctx.locked;
  const confirmRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (confirmDiscard) confirmRef.current?.querySelector<HTMLElement>("h2")?.focus(); }, [confirmDiscard]);
  return <>
    {problem}
    <CorpSection id="be-summary" label={t.summary} aside={<span className="be-meta">{t.versionState[state]}</span>}>
      <CorpCard as="div"><CorpRows label={t.summary}>
        {fact(t.period, period)}
        {fact(t.dataAsOf, momentText(input.sourceAsOf, version.timeZone, ctx.locale))}
        {fact(t.rowCount, input.records.length.toLocaleString(ctx.locale))}
        {fact(t.wholePeriod, input.completeness === "COMPLETE" ? t.yes : t.noPartial)}
      </CorpRows></CorpCard>
    </CorpSection>

    <CorpSection id="be-totals" label={t.totals} aside={metrics?.excludedRows ? <span className="be-meta">{t.leftOut(metrics.excludedRows)}</span> : undefined}>
      {currencies.length ? currencies.map(group => <CorpCard as="div" key={group.currency}><CorpRows label={`${t.totals} · ${group.currency}`}>
        {group.figures.map(figure => <li key={figure.key}><CorpRow one title={figure.note ? <>{figure.label}<span className="be-fignote"> · {figure.note}</span></> : figure.label} value={<span className="be-num">{figure.value}</span>} /></li>)}
      </CorpRows></CorpCard>) : <CorpCard as="div"><CorpRows label={t.totals}><CorpEmptyRow as="li">{t.totalsNone}</CorpEmptyRow></CorpRows></CorpCard>}
    </CorpSection>

    {metrics?.findings.length ? <CorpSection id="be-checks" label={t.checks} count={metrics.findings.length}>
      <CorpCard as="div"><CorpRows label={t.checks}>{metrics.findings.map((finding, index) => findingRow(t, finding, source.currency, index))}</CorpRows></CorpCard>
    </CorpSection> : null}

    <CorpSection id="be-rows" label={t.allRows} count={input.records.length}>
      <CorpCard as="div"><div className="be-rowsbox" tabIndex={0} role="region" aria-label={`${t.allRows} · ${t.rows(input.records.length)}`}>
        <CorpRows label={t.allRows}>{input.records.map(record => recordRow(t, record, input.source.currency, places, version.timeZone, ctx.locale))}</CorpRows>
      </div></CorpCard>
    </CorpSection>

    <CorpSection id="be-know" label={t.goodToKnow}>
      <CorpCard as="div"><CorpBody><ul className="be-notes">{check.qualifiers.map(code => <li key={code}>{t.qualifier[code]}</li>)}</ul></CorpBody></CorpCard>
    </CorpSection>

    {draft ? <CorpSection id="be-publish" label={t.publishSection}>
      <CorpCard as="div">{confirmDiscard ? <div ref={confirmRef} className="be-confirm">
        <h2 tabIndex={-1} className="be-confirm__t">{t.discardTitle}</h2>
        <p className="be-confirm__b">{t.discardBody}</p>
        <div className="be-actions">
          <CorpButton kind="secondary" size="md" className="b-rowact b-rowact--quiet" disabled={ctx.busy} onClick={() => setConfirmDiscard(false)}>{t.cancel}</CorpButton>
          <CorpButton kind="danger" size="md" disabled={working} onClick={onDiscard}>{ctx.busy ? t.discarding : t.discardConfirm}</CorpButton>
        </div>
      </div> : <CorpBody><div className="be-publish">
        {blocked ? <BCallout tone="amber">{blocked}</BCallout> : <>
          <p className="be-para">{t.publishStarts(period)}{replaces ? ` ${t.publishReplaces}` : ""}</p>
          <label className="be-check"><input type="checkbox" checked={acknowledged} disabled={working} onChange={event => setAcknowledged(event.target.checked)} /><span>{t.acknowledge}</span></label>
          <p className="be-fine">{t.ownClaim}</p>
        </>}
        <div className="be-actions">
          <CorpButton kind="secondary" size="md" className="b-rowact b-rowact--quiet" disabled={working} onClick={() => setConfirmDiscard(true)}>{t.discard}</CorpButton>
          {blocked ? null : <CorpButton kind="primary" size="md" disabled={working || !acknowledged} onClick={onPublish}>{ctx.busy ? t.publishing : t.publish}</CorpButton>}
        </div>
      </div></CorpBody>}</CorpCard>
    </CorpSection> : null}

    <CorpSection id="be-file" label={t.details}>
      <CorpCard as="div"><CorpRows label={t.details}>
        {version.publishedAt ? fact(t.versions, t.published(momentText(version.publishedAt, version.timeZone, ctx.locale))) : null}
        <li><CorpRow title={t.fingerprint} detail={<span className="be-digest">{version.digest}</span>} /></li>
        <li><a className="c-row be-extrow" href={citationHref(version.sourceId, version.versionId)} target="_blank" rel="noreferrer">
          <span className="c-row__icon" aria-hidden="true"><ArrowSquareOutIcon weight="bold" /></span>
          <span className="c-row__main"><span className="c-row__title">{t.plainText}</span><span className="c-row__detail"><span>{t.plainTextLine}</span></span></span>
        </a></li>
      </CorpRows></CorpCard>
    </CorpSection>
    {state === "replaced" ? <CorpNote>{t.replacedNote} <Link className="c-link" href={viewHref({ name: "record", sourceId: source.sourceId })}>{t.seeRecord}</Link></CorpNote> : null}
  </>;
}

/* ---------- Add a record, or a newer file for one ---------- */
type FormErrors = Partial<Record<"name" | "from" | "days" | "asOf" | "file" | "mapping" | "constants", string>>;
function ErrorText({ children }: { children: ReactNode }) { return <><WarningCircleIcon weight="bold" className="be-error__ic" aria-hidden="true" />{children}</>; }
type Loaded = { name: string; text: string; bytes: number; kind: "csv" | "json"; headers: string[] | null; rows: unknown[] | null };
export async function readRecordFile(file: File, t: BusinessCopy): Promise<Loaded | { error: string }> {
  const kind = /\.csv$/i.test(file.name) ? "csv" : /\.json$/i.test(file.name) ? "json" : null;
  if (!kind) return { error: t.error.fileType };
  if (file.size > BUSINESS_LIMITS.bytes) return { error: t.error.fileBig };
  let text: string;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(await file.arrayBuffer()); } catch { return { error: t.error.fileUtf }; }
  if (kind === "json") { const rows = recordsFromJson(text); return rows ? { name: file.name, text, bytes: utf8Bytes(text), kind, headers: null, rows } : { error: t.error.json }; }
  const headers = csvHeader(text);
  return headers ? { name: file.name, text, bytes: utf8Bytes(text), kind, headers, rows: null } : { error: t.error.csvHead };
}
export function RecordForm({ ctx, source, problem }: { ctx: Ctx; source: BusinessSourceView | null; problem?: ReactNode }) {
  const { t } = ctx;
  const [name, setName] = useState(source?.name ?? "");
  const [domain, setDomain] = useState<BusinessDomain>(source?.domain ?? "SALES");
  const [currency, setCurrency] = useState<BusinessCurrency>(source?.currency ?? "USD");
  const [from, setFrom] = useState(source?.namespace ?? "");
  const [maxAge, setMaxAge] = useState(source?.maxAgeMinutes ?? 1440);
  const [first, setFirst] = useState(""), [last, setLast] = useState(""), [asOf, setAsOf] = useState("");
  const [complete, setComplete] = useState(true);
  const [file, setFile] = useState<Loaded | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [unit, setUnit] = useState<BusinessCsvMapping["amountUnit"]>("DECIMAL_MAJOR");
  const [columns, setColumns] = useState<Record<string, string>>({});   // header → field
  const [constants, setConstants] = useState<Record<string, string>>({});
  const [tried, setTried] = useState(false);
  const form = useRef<HTMLFormElement>(null), fileInput = useRef<HTMLInputElement>(null), requestId = useRef<string | null>(null);
  const cancel = source ? viewHref({ name: "record", sourceId: source.sourceId }) : LIBRARY;

  const period = first && last ? windowFromDays(first, last, ctx.timeZone) : null;
  const sourceAsOf = asOf ? instantFromLocal(asOf, ctx.timeZone) : null;
  const namespace = source?.namespace ?? namespaceFrom(from);
  const mapped = Object.values(columns).filter(Boolean);
  const openConstants = CONSTANT_FIELDS[domain].filter(field => !mapped.includes(field));
  const errors: FormErrors = {};
  if (!name.trim()) errors.name = t.error.name; else if (utf8Bytes(name.trim()) > BUSINESS_LIMITS.nameBytes || /[\x00-\x1f\x7f]/.test(name)) errors.name = t.error.nameLong;
  if (!namespace) errors.from = t.error.from;
  if (!first || !last) errors.days = t.error.days; else if (!period) errors.days = t.error.dayOrder;
  if (!sourceAsOf) errors.asOf = t.error.asOf; else if (complete && period && sourceAsOf < period.toAt) errors.asOf = t.error.asOfEarly;
  if (!file) errors.file = fileError ?? t.error.file;
  if (file?.kind === "csv") {
    if (file.headers!.some(header => !columns[header])) errors.mapping = t.error.mapEach; else if (new Set(mapped).size !== mapped.length) errors.mapping = t.error.mapTwice;
    if (openConstants.some(field => !constants[field]?.trim())) errors.constants = t.error.constant;
  }
  const shown: FormErrors = tried ? errors : {};

  const load = async (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0];
    event.target.value = "";
    if (!picked) return;
    const result = await readRecordFile(picked, t);
    if ("error" in result) { setFileError(result.error); setFile(null); return; }
    setFileError(null); setFile(result); setColumns({}); setConstants({});
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (Object.keys(errors).length || ctx.busy || ctx.locked || !file || !period || !sourceAsOf || !namespace) { requestAnimationFrame(() => form.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus()); return; }
    // A new record expects revision 0 and no ID; a newer file expects this record's latest revision (answer 4).
    const spec: BusinessSourceSpec = { sourceId: source?.sourceId ?? null, expectedRevision: source?.revision ?? 0, name: name.trim(), domain, namespace, currency, scale: 2, maxAgeMinutes: maxAge };
    const metadata = { source: spec, window: period, sourceAsOf, completeness: complete ? "COMPLETE" as const : "PARTIAL" as const };
    requestId.current ??= newRequestId();
    const command: BusinessWrite = file.kind === "json"
      ? { op: "stage_source_version", requestId: requestId.current, format: "JSON", input: { ...metadata, records: file.rows as BusinessRecord[] } }
      : { op: "stage_source_version", requestId: requestId.current, format: "CSV", csv: file.text, metadata,
          mapping: { amountUnit: unit, columns: Object.fromEntries(Object.entries(columns).map(([header, field]) => [field, header])), constants: Object.fromEntries(openConstants.map(field => [field, constants[field].trim()])) } };
    const ok = await ctx.send(command);
    // A deliberate save after a refused one is a new operation.
    if (!ok) requestId.current = null;
  };
  const invalid = (key: keyof FormErrors) => shown[key] ? true : undefined;
  const fieldLabel = (field: string) => t.field[field] ?? field;
  return <form ref={form} id="be-form" className="c-teamform be-form" onSubmit={submit} noValidate aria-labelledby="be-title">
    {problem}
    <CorpField label={t.name} htmlFor="be-name" help={<span id="be-name-help">{t.nameHelp}</span>} error={shown.name ? <ErrorText>{shown.name}</ErrorText> : undefined} errorId="be-name-error">
      <input className="c-in" id="be-name" value={name} maxLength={240} required disabled={!!source} autoComplete="off" aria-invalid={invalid("name")} aria-describedby={shown.name ? "be-name-error" : "be-name-help"} onChange={event => setName(event.target.value)} />
    </CorpField>
    <div className="c-field__row be-pair">
      <CorpField label={t.type} htmlFor="be-domain">
        <select className="c-in" id="be-domain" value={domain} disabled={!!source} onChange={event => { setDomain(event.target.value as BusinessDomain); setColumns({}); setConstants({}); }}>
          <option value="SALES">{t.domain.SALES}</option><option value="FINANCE">{t.domain.FINANCE}</option>
        </select>
      </CorpField>
      <CorpField label={t.currency} htmlFor="be-currency">
        <select className="c-in" id="be-currency" value={currency} disabled={!!source} onChange={event => setCurrency(event.target.value as BusinessCurrency)}>
          <option value="USD">{t.currencyName.USD}</option><option value="EUR">{t.currencyName.EUR}</option>
        </select>
      </CorpField>
    </div>
    <div className="c-field__row be-pair">
      <CorpField label={t.from} htmlFor="be-from" help={<span id="be-from-help">{t.fromHelp}</span>} error={shown.from ? <ErrorText>{shown.from}</ErrorText> : undefined} errorId="be-from-error">
        <input className="c-in" id="be-from" value={from} maxLength={64} disabled={!!source} autoComplete="off" aria-invalid={invalid("from")} aria-describedby={shown.from ? "be-from-error" : "be-from-help"} onChange={event => setFrom(event.target.value)} />
      </CorpField>
      <CorpField label={t.currentFor} htmlFor="be-age">
        <select className="c-in" id="be-age" value={maxAge} disabled={!!source} onChange={event => setMaxAge(Number(event.target.value))}>
          {(t.ageOptions.some(option => option.value === maxAge) ? t.ageOptions : [...t.ageOptions, { value: maxAge, label: t.age(maxAge) }]).map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
        </select>
      </CorpField>
    </div>
    <div className="c-field__row be-pair">
      <CorpField label={t.firstDay} htmlFor="be-first" error={shown.days ? <ErrorText>{shown.days}</ErrorText> : undefined} errorId="be-days-error">
        <input className="c-in" id="be-first" type="date" value={first} required aria-invalid={invalid("days")} aria-describedby={shown.days ? "be-days-error" : undefined} onChange={event => setFirst(event.target.value)} />
      </CorpField>
      <CorpField label={t.lastDay} htmlFor="be-last">
        <input className="c-in" id="be-last" type="date" value={last} min={first || undefined} required aria-invalid={invalid("days")} aria-describedby={shown.days ? "be-days-error" : undefined} onChange={event => setLast(event.target.value)} />
      </CorpField>
    </div>
    <div className="c-field__row be-pair">
      <CorpField label={t.asOf} htmlFor="be-asof" help={<span id="be-asof-help">{t.asOfHelp}</span>} error={shown.asOf ? <ErrorText>{shown.asOf}</ErrorText> : undefined} errorId="be-asof-error">
        <input className="c-in" id="be-asof" type="datetime-local" value={asOf} required aria-invalid={invalid("asOf")} aria-describedby={shown.asOf ? "be-asof-error" : "be-asof-help"} onChange={event => setAsOf(event.target.value)} />
      </CorpField>
      <CorpField label={t.completeness} htmlFor="be-complete" help={<span id="be-complete-help">{t.completeHelp}</span>}>
        <select className="c-in" id="be-complete" value={complete ? "yes" : "no"} aria-describedby="be-complete-help" onChange={event => setComplete(event.target.value === "yes")}>
          <option value="yes">{t.completeYes}</option><option value="no">{t.completeNo}</option>
        </select>
      </CorpField>
    </div>
    <div className="be-file">
      <span className="c-field__label" id="be-file-label">{t.file}</span>
      <input ref={fileInput} className="be-file__input" id="be-file" type="file" accept=".csv,.json,text/csv,application/json" onChange={event => void load(event)} tabIndex={-1} aria-hidden="true" />
      <CorpButton kind="secondary" size="md" className="b-rowact b-rowact--go" onClick={() => fileInput.current?.click()} aria-describedby="be-file-help" aria-invalid={invalid("file")}>{file ? t.loadAnother : t.loadFile}</CorpButton>
      <span className="c-field__help" id="be-file-help">{file ? t.fileFrom(file.name, file.rows ? `${t.rows(file.rows.length)} · ${sizeText(file.bytes, ctx.lang)}` : sizeText(file.bytes, ctx.lang)) : t.fileHelp}</span>
      {fileError || shown.file ? <span className="c-error" role="alert"><ErrorText>{fileError ?? shown.file}</ErrorText></span> : null}
    </div>
    {file?.kind === "csv" ? <fieldset className="be-map">
      <legend className="c-field__label">{t.columns}</legend>
      <p className="c-field__help" id="be-map-help">{t.columnsHelp}</p>
      <div className="be-map__grid">
        {file.headers!.map((header, index) => <CorpField key={header} label={t.column(header)} htmlFor={`be-col-${index}`}>
          <select className="c-in" id={`be-col-${index}`} value={columns[header] ?? ""} aria-invalid={shown.mapping && (!columns[header] || mapped.filter(field => field === columns[header]).length > 1) ? true : undefined}
            aria-describedby={shown.mapping ? "be-map-error" : "be-map-help"} onChange={event => setColumns(old => ({ ...old, [header]: event.target.value }))}>
            <option value="">{t.choose}</option>
            {RECORD_FIELDS[domain].map(field => <option key={field} value={field}>{fieldLabel(field)}</option>)}
          </select>
        </CorpField>)}
        <CorpField label={t.amountUnit} htmlFor="be-unit">
          <select className="c-in" id="be-unit" value={unit} onChange={event => setUnit(event.target.value as BusinessCsvMapping["amountUnit"])}>
            <option value="DECIMAL_MAJOR">{t.unitMajor}</option><option value="MINOR">{t.unitMinor}</option>
          </select>
        </CorpField>
      </div>
      {shown.mapping ? <span className="c-error" id="be-map-error" role="alert"><ErrorText>{shown.mapping}</ErrorText></span> : null}
      {openConstants.length ? <>
        <span className="c-field__label be-map__sub">{t.sameForAll}</span>
        <div className="be-map__grid">
          {openConstants.map(field => <CorpField key={field} label={fieldLabel(field)} htmlFor={`be-const-${field}`} help={field === "revision" ? t.revisionHelp : undefined}>
            {field === "kind" ? <select className="c-in" id={`be-const-${field}`} value={constants.kind ?? ""} aria-invalid={shown.constants && !constants.kind ? true : undefined} onChange={event => setConstants(old => ({ ...old, kind: event.target.value }))}>
                <option value="">{t.choose}</option>{RECORD_KINDS[domain].map(kind => <option key={kind} value={kind}>{t.kind[kind]}</option>)}</select>
              : field === "locationId" ? <select className="c-in" id={`be-const-${field}`} value={constants.locationId ?? ""} aria-invalid={shown.constants && !constants.locationId ? true : undefined} onChange={event => setConstants(old => ({ ...old, locationId: event.target.value }))}>
                <option value="">{t.choose}</option>{ctx.catalog.activeLocations.map(place => <option key={place.id} value={place.id}>{place.name}</option>)}</select>
              : <input className="c-in" id={`be-const-${field}`} value={constants[field] ?? ""} maxLength={128} autoComplete="off" aria-invalid={shown.constants && !constants[field]?.trim() ? true : undefined} onChange={event => setConstants(old => ({ ...old, [field]: event.target.value }))} />}
          </CorpField>)}
        </div>
        {shown.constants ? <span className="c-error" role="alert"><ErrorText>{shown.constants}</ErrorText></span> : null}
      </> : null}
    </fieldset> : null}
    <p className="c-field__help be-formnote">{t.draftNote}</p>
    <CorpFormFooter>
      <CorpButtonLink href={cancel} kind="secondary" size="md" className="b-rowact b-rowact--quiet">{t.cancel}</CorpButtonLink>
      <CorpButton type="submit" kind="primary" size="md" disabled={ctx.busy || ctx.locked}>{ctx.busy ? t.saving : t.saveDraft}</CorpButton>
    </CorpFormFooter>
  </form>;
}

/** For tests: the context the screens share, from a catalog. */
export function businessContext(catalog: BusinessCatalog, lang: BusinessLang, now: number, extra: Partial<Ctx> = {}): Ctx {
  return { client: createBusinessClient(async () => new Response("{}", { status: 503 })), t: BUSINESS_COPY[lang], lang, locale: BUSINESS_LOCALE[lang], timeZone: catalog.timeZone, catalog, now, busy: false, locked: false,
    send: async () => false, revoke: () => {}, ...extra };
}
