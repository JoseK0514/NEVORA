"use client";
import { AllLocationsCheckbox } from "@/components/team/all-locations-checkbox";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { EyeSlashIcon } from "@phosphor-icons/react/dist/ssr/EyeSlash";
import { PencilSimpleIcon } from "@phosphor-icons/react/dist/ssr/PencilSimple";
import { PlusIcon } from "@phosphor-icons/react/dist/ssr/Plus";
import { WarningIcon } from "@phosphor-icons/react/dist/ssr/Warning";
import { WarningCircleIcon } from "@phosphor-icons/react/dist/ssr/WarningCircle";
import { CorpBody, CorpButton, CorpButtonLink, CorpCard, CorpEmptyRow, CorpField, CorpFormFooter, CorpPill, CorpRow, CorpRows, CorpSection } from "@/components/corp/corp";
import { BGlyph, BIcon, BState } from "@/components/owner-b/b-kit";
import type {
  BusinessAccount, BusinessApiResult, BusinessCoverageMap, BusinessDomain, BusinessFinanceQuery, BusinessMapCell, BusinessMetricFamily, BusinessQuery, BusinessReadResult, BusinessCommand,
} from "@/lib/owner-advisor/business/contracts";
import { formatBusinessMinor } from "@/lib/owner-advisor/business/metrics";
import { clockText, newRequestId, periodText, versionState, windowFromDays } from "./business-client";
import type { BusinessCopy } from "./copy";
import { financeFigures, salesFigures } from "./figures";
import { viewHref } from "./views";
import type { BusinessCtx } from "./business-page";
import {useBusinessRead as useLeased,useBusinessReview} from "./use-business-read";

/* Main records (the coverage map) and the figures check (Nov 17, 2026 follow-up). The map says which published records
 * Rondo counts as the whole picture: accounts (the company's, or one location's) and entries (a record, what it covers,
 * main or cross-check, a period). It has the same rhythm and gates as a record: draft → full read → publish with that
 * read's own revision, fingerprint and receipt. The figures check sends the contract's `query_finance` / `query_sales`
 * with exactly the choices it allows and shows what the server answered; nothing is calculated here. */

const MAP = viewHref({ name: "map" });
function ErrorText({ children }: { children: ReactNode }) { return <><WarningCircleIcon weight="bold" className="be-error__ic" aria-hidden="true" />{children}</>; }
function Skeleton({ label }: { label: string }) {
  return <section className="c-card be-skel" aria-busy="true" aria-label={label}>
    <span className="be-skel__bar be-skel__bar--head" />
    {[56, 44, 62].map(width => <span key={width} className="be-skel__row"><span className="be-skel__dot" /><span className="be-skel__lines"><span className="be-skel__bar" style={{ width: `${width}%` }} /><span className="be-skel__bar be-skel__bar--thin" style={{ width: `${width - 18}%` }} /></span></span>)}
  </section>;
}
const METRICS: Record<BusinessDomain, BusinessMetricFamily[]> = { FINANCE: ["CASH", "OBLIGATIONS", "RECEIVABLES"], SALES: ["SALES"] };
const dayIn = (iso: string, timeZone: string) => new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));

/* ---------- What the map says, read-only (the overview and the review share it) ---------- */
function ownerText(ctx: BusinessCtx, account: BusinessAccount) {
  return account.ownership.kind === "COMPANY_SHARED" ? ctx.t.shared : ctx.catalog.activeLocations.find(place => place.id === (account.ownership as { locationId: string }).locationId)?.name ?? ctx.t.unknownPlace;
}
function cellScope(ctx: BusinessCtx, cell: BusinessMapCell) {
  return cell.domain === "SALES" ? cell.locationIds.map(id => ctx.catalog.activeLocations.find(place => place.id === id)?.name ?? ctx.t.unknownPlace).join(", ") : cell.accountRefs.join(", ");
}
export function MapContents({ ctx, map }: { ctx: BusinessCtx; map: BusinessCoverageMap }) {
  const { t } = ctx;
  return <>
    <CorpSection id="be-map-entries" label={t.entries} count={map.cells.length}>
      <CorpCard as="div"><CorpRows label={t.entries}>
        {map.cells.length ? map.cells.map((cell, index) => <li key={index}><CorpRow title={ctx.catalog.sources.find(item => item.sourceId === cell.sourceId)?.name ?? t.record}
          detail={`${t.metric[cell.metric]} · ${cell.currency} · ${periodText(cell.window, ctx.timeZone, ctx.locale)} · ${cellScope(ctx, cell)}`}
          value={cell.role === "PRIMARY" ? t.role.PRIMARY : <CorpPill tone="neutral">{t.role.CORROBORATING}</CorpPill>} valueTone="soft" /></li>) : <CorpEmptyRow as="li">{t.noEntries}</CorpEmptyRow>}
      </CorpRows></CorpCard>
    </CorpSection>
    <CorpSection id="be-map-accounts" label={t.accounts} count={map.accounts.length}>
      <CorpCard as="div"><CorpRows label={t.accounts}>
        {map.accounts.length ? map.accounts.map(account => <li key={account.accountRef}><CorpRow one title={account.accountRef} value={ownerText(ctx, account)} valueTone="soft" /></li>) : <CorpEmptyRow as="li">{t.noAccounts}</CorpEmptyRow>}
      </CorpRows></CorpCard>
      <p className="be-foot">{t.mainNote} {t.mapNoteOnce}</p>
    </CorpSection>
  </>;
}

/* ---------- Main records: what is in use, a draft waiting, and the editor ---------- */
type DraftCell = { sourceId: string; metric: BusinessMetricFamily | ""; role: "PRIMARY" | "CORROBORATING"; first: string; last: string; accountRefs: string[]; locationIds: string[] };
type DraftAccount = { accountRef: string; owner: string };   // "" = the whole company, else a location ID
type MapErrors = { accounts: Record<number, string>; cells: Record<number, string> };
export function mapDraftErrors(t: BusinessCopy, accounts: DraftAccount[], cells: DraftCell[], timeZone: string): MapErrors {
  const errors: MapErrors = { accounts: {}, cells: {} };
  accounts.forEach((account, index) => {
    const ref = account.accountRef.trim();
    if (!/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,127}$/.test(ref)) errors.accounts[index] = t.mapError.accountName;
    else if (accounts.findIndex(other => other.accountRef.trim() === ref) !== index) errors.accounts[index] = t.mapError.accountTwice;
  });
  cells.forEach((cell, index) => {
    if (!cell.sourceId || !cell.metric) errors.cells[index] = t.mapError.record;
    else if (!cell.first || !cell.last) errors.cells[index] = t.error.days;
    else if (!windowFromDays(cell.first, cell.last, timeZone)) errors.cells[index] = t.error.dayOrder;
    else if (!(cell.metric === "SALES" ? cell.locationIds : cell.accountRefs).length) errors.cells[index] = t.mapError.scope;
  });
  return errors;
}
export function MapView({ ctx, problem, initialEditing = false }: { ctx: BusinessCtx; problem?: ReactNode; initialEditing?: boolean }) {
  const { t, catalog } = ctx;
  const current = catalog.maps.find(item => item.current && item.status === "PUBLISHED") ?? null;
  const drafts = catalog.maps.filter(item => item.status === "DRAFT");
  const [editing, setEditing] = useState(initialEditing);
  if (editing) return <MapEditor ctx={ctx} problem={problem} from={current?.input ?? null} onCancel={() => setEditing(false)} />;
  return <>
    {problem}
    <CorpSection id="be-map-status" label={t.status}>
      <CorpCard as="div">{current || drafts.length ? <CorpRows label={t.status}>
        {current ? <li><CorpRow icon={<CheckCircleIcon weight="bold" />} title={t.mapInUse} detail={t.entriesCount(current.input?.cells.length ?? 0)} /></li> : null}
        {drafts.map(draft => <li key={draft.mapVersionId}><CorpRow href={viewHref({ name: "mapreview", mapVersionId: draft.mapVersionId })} icon={<PencilSimpleIcon weight="bold" />} title={t.mapDraftRow} /></li>)}
      </CorpRows> : <BState kind="empty" title={t.mainEmpty} line={t.mapEmptyLine} action={{ label: t.setUp, onClick: () => setEditing(true) }} />}</CorpCard>
    </CorpSection>
    {current?.input ? <MapContents ctx={ctx} map={current.input} /> : null}
    {current || drafts.length ? <div className="be-actions be-actions--page"><CorpButton kind="primary" size="md" disabled={ctx.locked} onClick={() => setEditing(true)}>{current ? t.mapChange : t.setUp}</CorpButton></div> : null}
  </>;
}
function MapEditor({ ctx, problem, from, onCancel }: { ctx: BusinessCtx; problem?: ReactNode; from: BusinessCoverageMap | null; onCancel: () => void }) {
  const { t, catalog } = ctx;
  const usable = catalog.sources.filter(source => source.active && !source.deleted && catalog.versions.some(item => item.sourceId === source.sourceId && item.status === "PUBLISHED" && item.current));
  const [accounts, setAccounts] = useState<DraftAccount[]>(() => (from?.accounts ?? []).map(account => ({ accountRef: account.accountRef, owner: account.ownership.kind === "EXCLUSIVE_LOCATION" ? account.ownership.locationId : "" })));
  const [cells, setCells] = useState<DraftCell[]>(() => (from?.cells ?? []).map(cell => ({ sourceId: cell.sourceId, metric: cell.metric, role: cell.role, first: dayIn(cell.window.fromAt, ctx.timeZone),
    last: dayIn(new Date(Date.parse(cell.window.toAt) - 1).toISOString(), ctx.timeZone), accountRefs: [...cell.accountRefs], locationIds: [...cell.locationIds] })));
  // On a phone one item is open at a time; from tablet width every item shows its fields (the grid).
  const [open, setOpen] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const form = useRef<HTMLFormElement>(null), requestId = useRef<string | null>(null);
  const errors = mapDraftErrors(t, accounts, cells, ctx.timeZone), bad = Object.keys(errors.accounts).length + Object.keys(errors.cells).length > 0;
  const shown = tried ? errors : { accounts: {}, cells: {} };
  const names = accounts.map(account => account.accountRef.trim()).filter(Boolean);
  const patchCell = (index: number, change: Partial<DraftCell>) => setCells(old => old.map((cell, i) => i === index ? { ...cell, ...change } : cell));
  const toggle = (list: string[], value: string) => list.includes(value) ? list.filter(item => item !== value) : [...list, value];
  const focusItem = (id: string) => requestAnimationFrame(() => form.current?.querySelector<HTMLElement>(`[data-item="${id}"] :is(input, select)`)?.focus());
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (bad || ctx.busy || ctx.locked) {
      const first = Object.keys(errors.accounts)[0] !== undefined ? `a${Object.keys(errors.accounts)[0]}` : `c${Object.keys(errors.cells)[0]}`;
      setOpen(first); focusItem(first); return;
    }
    const map: BusinessCoverageMap = {
      // The latest list's map revision (0 before any map); the server orders accounts and entries itself (answer 4).
      expectedRevision: catalog.mapRevision ?? 0,
      accounts: accounts.map(account => ({ accountRef: account.accountRef.trim(), ownership: account.owner ? { kind: "EXCLUSIVE_LOCATION", locationId: account.owner } : { kind: "COMPANY_SHARED" } })),
      cells: cells.map(cell => { const source = catalog.sources.find(item => item.sourceId === cell.sourceId)!, sales = source.domain === "SALES";
        return { sourceId: cell.sourceId, domain: source.domain, metric: cell.metric as BusinessMetricFamily, currency: source.currency, window: windowFromDays(cell.first, cell.last, ctx.timeZone)!, role: cell.role,
          accountRefs: sales ? [] : cell.accountRefs.filter(ref => names.includes(ref)), locationIds: sales ? cell.locationIds : [] }; }),
    };
    requestId.current ??= newRequestId();
    const ok = await ctx.send({ op: "stage_coverage_map", requestId: requestId.current, map });
    if (!ok) requestId.current = null;
  };
  return <form ref={form} id="be-form" className="be-mapform" onSubmit={submit} noValidate aria-labelledby="be-title">
    {problem}
    <CorpSection id="be-map-accounts" label={t.accounts} count={accounts.length}>
      <CorpCard as="div"><ul className="be-items">
        {accounts.length ? accounts.map((account, index) => { const id = `a${index}`, error = shown.accounts[index];
          return <li key={index} className="be-item2" data-item={id} data-open={open === id ? "" : undefined}>
            <button type="button" className="be-item2__sum" aria-expanded={open === id} onClick={() => setOpen(open === id ? null : id)}>
              <span><strong>{account.accountRef.trim() || t.newAccount}</strong><small>{account.owner ? catalog.activeLocations.find(place => place.id === account.owner)?.name ?? t.unknownPlace : t.shared}</small></span><em>{open === id ? t.doneItem : t.editItem}</em></button>
            <div className="be-item2__fields be-item2__fields--two">
              <CorpField label={t.accountName} htmlFor={`be-acc-${index}`} help={index === 0 ? t.accountNameHelp : undefined} error={error ? <ErrorText>{error}</ErrorText> : undefined} errorId={`be-acc-${index}-error`}>
                <input className="c-in" id={`be-acc-${index}`} value={account.accountRef} maxLength={128} autoComplete="off" aria-invalid={error ? true : undefined} aria-describedby={error ? `be-acc-${index}-error` : undefined}
                  onChange={event => setAccounts(old => old.map((item, i) => i === index ? { ...item, accountRef: event.target.value } : item))} /></CorpField>
              <CorpField label={t.belongsTo} htmlFor={`be-acc-owner-${index}`}>
                <select className="c-in" id={`be-acc-owner-${index}`} value={account.owner} onChange={event => setAccounts(old => old.map((item, i) => i === index ? { ...item, owner: event.target.value } : item))}>
                  <option value="">{t.shared}</option>{catalog.activeLocations.map(place => <option key={place.id} value={place.id}>{place.name}</option>)}</select></CorpField>
              <CorpButton kind="secondary" size="md" className="b-rowact b-rowact--quiet be-item2__remove" onClick={() => { setAccounts(old => old.filter((_, i) => i !== index)); setOpen(null); }}>{t.removeItem}</CorpButton>
            </div>
          </li>; }) : <li className="c-empty c-empty--row">{t.noAccounts}</li>}
        <li><button type="button" className="be-addrow be-addrow--btn" onClick={() => { setAccounts(old => [...old, { accountRef: "", owner: "" }]); setOpen(`a${accounts.length}`); focusItem(`a${accounts.length}`); }}><PlusIcon weight="bold" aria-hidden="true" />{t.addAccount}</button></li>
      </ul></CorpCard>
    </CorpSection>
    <CorpSection id="be-map-entries" label={t.entries} count={cells.length}>
      <CorpCard as="div"><ul className="be-items">
        {cells.length ? cells.map((cell, index) => { const id = `c${index}`, error = shown.cells[index], source = catalog.sources.find(item => item.sourceId === cell.sourceId) ?? null, sales = source?.domain === "SALES";
          const summary = source ? [cell.metric ? t.metric[cell.metric] : null, t.role[cell.role], (() => { const period = cell.first && cell.last ? windowFromDays(cell.first, cell.last, ctx.timeZone) : null; return period ? periodText(period, ctx.timeZone, ctx.locale) : null; })()].filter(Boolean).join(" · ") : t.mapError.record;
          return <li key={index} className="be-item2" data-item={id} data-open={open === id ? "" : undefined}>
            <button type="button" className="be-item2__sum" aria-expanded={open === id} onClick={() => setOpen(open === id ? null : id)}><span><strong>{source?.name ?? t.newEntry}</strong><small>{summary}</small></span><em>{open === id ? t.doneItem : t.editItem}</em></button>
            <div className="be-item2__fields">
              <CorpField label={t.entryRecord} htmlFor={`be-cell-${index}`}>
                <select className="c-in" id={`be-cell-${index}`} value={cell.sourceId} aria-invalid={error && !cell.sourceId ? true : undefined} aria-describedby={error ? `be-cell-${index}-error` : undefined} onChange={event => { const next = catalog.sources.find(item => item.sourceId === event.target.value);
                  patchCell(index, { sourceId: event.target.value, metric: next ? METRICS[next.domain][0] : "", accountRefs: [], locationIds: [] }); }}>
                  <option value="">{t.choose}</option>{usable.map(item => <option key={item.sourceId} value={item.sourceId}>{item.name}</option>)}
                  {source && !usable.includes(source) ? <option value={source.sourceId}>{source.name}</option> : null}</select></CorpField>
              <CorpField label={t.entryCovers} htmlFor={`be-cell-metric-${index}`}>
                <select className="c-in" id={`be-cell-metric-${index}`} value={cell.metric} disabled={!source} onChange={event => patchCell(index, { metric: event.target.value as BusinessMetricFamily })}>
                  {source ? METRICS[source.domain].map(metric => <option key={metric} value={metric}>{t.metric[metric]}</option>) : <option value="">{t.choose}</option>}</select></CorpField>
              <CorpField label={t.entryRole} htmlFor={`be-cell-role-${index}`}>
                <select className="c-in" id={`be-cell-role-${index}`} value={cell.role} onChange={event => patchCell(index, { role: event.target.value as DraftCell["role"] })}>
                  <option value="PRIMARY">{t.role.PRIMARY}</option><option value="CORROBORATING">{t.role.CORROBORATING}</option></select></CorpField>
              <CorpField label={t.firstDay} htmlFor={`be-cell-first-${index}`}><input className="c-in" id={`be-cell-first-${index}`} type="date" value={cell.first} aria-invalid={error && (!cell.first || !cell.last) ? true : undefined} onChange={event => patchCell(index, { first: event.target.value })} /></CorpField>
              <CorpField label={t.lastDay} htmlFor={`be-cell-last-${index}`}><input className="c-in" id={`be-cell-last-${index}`} type="date" value={cell.last} min={cell.first || undefined} onChange={event => patchCell(index, { last: event.target.value })} /></CorpField>
              <fieldset className="be-picks"><legend className="c-field__label">{sales ? t.entryLocations : t.entryAccounts}</legend>
                {sales && <AllLocationsCheckbox lang={ctx.lang} ids={catalog.activeLocations.map(place => place.id)} selected={cell.locationIds} className="be-pick"
                  disabled={catalog.activeLocations.length > 200} onToggle={all => patchCell(index, { locationIds: all ? catalog.activeLocations.map(place => place.id) : [] })} />}
                {(sales ? catalog.activeLocations.map(place => ({ value: place.id, label: place.name })) : names.map(ref => ({ value: ref, label: ref }))).map(option => <label key={option.value} className="be-pick">
                  <input type="checkbox" checked={(sales ? cell.locationIds : cell.accountRefs).includes(option.value)} onChange={() => patchCell(index, sales ? { locationIds: toggle(cell.locationIds, option.value) } : { accountRefs: toggle(cell.accountRefs, option.value) })} /><span>{option.label}</span></label>)}
                {!sales && !names.length ? <span className="c-field__help">{t.noAccounts}</span> : null}</fieldset>
              {error ? <span className="c-error be-item2__error" id={`be-cell-${index}-error`} role="alert"><ErrorText>{error}</ErrorText></span> : null}
              <CorpButton kind="secondary" size="md" className="b-rowact b-rowact--quiet be-item2__remove" onClick={() => { setCells(old => old.filter((_, i) => i !== index)); setOpen(null); }}>{t.removeItem}</CorpButton>
            </div>
          </li>; }) : <li className="c-empty c-empty--row">{usable.length ? t.noEntries : t.noRecordsToCount}</li>}
        {usable.length ? <li><button type="button" className="be-addrow be-addrow--btn" onClick={() => { setCells(old => [...old, { sourceId: "", metric: "", role: "PRIMARY", first: "", last: "", accountRefs: [], locationIds: [] }]); setOpen(`c${cells.length}`); focusItem(`c${cells.length}`); }}>
          <PlusIcon weight="bold" aria-hidden="true" />{t.addEntry}</button></li> : null}
      </ul></CorpCard>
      <p className="be-foot">{t.mainNote} {t.mapNoteOnce}</p>
    </CorpSection>
    <p className="c-field__help be-formnote">{t.draftNote}</p>
    <CorpFormFooter>
      <CorpButton kind="secondary" size="md" className="b-rowact b-rowact--quiet" onClick={onCancel}>{t.cancel}</CorpButton>
      <CorpButton type="submit" kind="primary" size="md" disabled={ctx.busy || ctx.locked}>{ctx.busy ? t.saving : t.saveDraft}</CorpButton>
    </CorpFormFooter>
  </form>;
}

/* ---------- Review a staged map, then publish or discard it ---------- */
export function MapReview({ ctx, mapVersionId, problem }: { ctx: BusinessCtx; mapVersionId: string; problem?: ReactNode }) {
  const { t } = ctx;
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const reviewed = useRef<string | null>(null), requestId = useRef<string | null>(null);
  const reset=()=>{reviewed.current=null;requestId.current=null;setAcknowledged(false);setConfirmDiscard(false);};
  const {state,read,publishable}=useBusinessReview(ctx,id=>({op:"read_coverage_map",requestId:id,mapVersionId}),
    result=>!!result.map?.input&&!!result.receipt&&!!result.readReceiptId,result=>{
      const identity=`${result.map!.digest}:${result.receipt!.revision}:${result.readReceiptId}`;
      if(reviewed.current!==identity){reset();reviewed.current=identity;}
    },reset);
  const back = <CorpCard as="div"><BState kind="empty" title={t.gone} line={t.goneLine} action={{ label: t.mainRecords, href: MAP }} /></CorpCard>;
  if (state.kind === "gone") return <>{problem}{back}</>;
  if (state.kind === "loading" || state.kind === "idle") return <>{problem}<Skeleton label={t.loading} /></>;
  if (state.kind === "hidden") return <>{problem}<CorpCard as="div"><BState kind="locked" icon={<EyeSlashIcon weight="bold" />} title={t.detailsHidden} line={t.detailsHiddenLine} action={{ label: t.showAgain, onClick: () => void read() }} /></CorpCard></>;
  if (state.kind === "failed") return <>{problem}<CorpCard as="div"><BState kind="failed" alert title={t.mapFailed} line={t.checkConnection} action={{ retry: true, label: t.tryAgain, onClick: () => void read() }} /></CorpCard></>;
  const result = state.result, map = result.map!;
  // The full map read's own revision, fingerprint and receipt (answer 4): never the staged draft's expected revision.
  const exactCommand = { mapVersionId, expectedRevision: result.receipt!.revision, digest: map.digest, acknowledged: true as const };
  const publish = async () => {
    if (!publishable()) { void read(); return; }
    requestId.current ??= newRequestId();
    const ok = await ctx.send({ op: "publish_coverage_map", requestId: requestId.current, readReceiptId: result.readReceiptId!, ...exactCommand });
    if (!ok) { requestId.current = null; reviewed.current = null; setAcknowledged(false); void read(); }
  };
  return <MapReviewContent ctx={ctx} result={result} acknowledged={acknowledged} setAcknowledged={setAcknowledged} confirmDiscard={confirmDiscard} setConfirmDiscard={setConfirmDiscard}
    onPublish={() => void publish()} onDiscard={() => void ctx.send({ op: "discard_coverage_map", requestId: newRequestId(), ...exactCommand })} problem={problem} />;
}
export function MapReviewContent({ ctx, result, acknowledged, setAcknowledged, confirmDiscard, setConfirmDiscard, onPublish, onDiscard, problem }: {
  ctx: BusinessCtx; result: BusinessApiResult; acknowledged: boolean; setAcknowledged: (value: boolean) => void; confirmDiscard: boolean; setConfirmDiscard: (value: boolean) => void;
  onPublish: () => void; onDiscard: () => void; problem?: ReactNode;
}) {
  const { t } = ctx, map = result.map!, working = ctx.busy || ctx.locked;
  const confirmRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (confirmDiscard) confirmRef.current?.querySelector<HTMLElement>("h2")?.focus(); }, [confirmDiscard]);
  return <>
    {problem}
    <MapContents ctx={ctx} map={map.input!} />
    {map.status === "DRAFT" ? <CorpSection id="be-publish" label={t.publishSection}>
      <CorpCard as="div">{confirmDiscard ? <div ref={confirmRef} className="be-confirm">
        <h2 tabIndex={-1} className="be-confirm__t">{t.discardTitle}</h2>
        <p className="be-confirm__b">{t.discardBody}</p>
        <div className="be-actions">
          <CorpButton kind="secondary" size="md" className="b-rowact b-rowact--quiet" disabled={ctx.busy} onClick={() => setConfirmDiscard(false)}>{t.cancel}</CorpButton>
          <CorpButton kind="danger" size="md" disabled={working} onClick={onDiscard}>{ctx.busy ? t.discarding : t.discardConfirm}</CorpButton>
        </div>
      </div> : <CorpBody><div className="be-publish">
        <p className="be-para">{t.mapPublishStarts}</p>
        <label className="be-check"><input type="checkbox" checked={acknowledged} disabled={working} onChange={event => setAcknowledged(event.target.checked)} /><span>{t.mapAcknowledge}</span></label>
        <p className="be-fine">{t.mapOwnClaim}</p>
        <div className="be-actions">
          <CorpButton kind="secondary" size="md" className="b-rowact b-rowact--quiet" disabled={working} onClick={() => setConfirmDiscard(true)}>{t.discard}</CorpButton>
          <CorpButton kind="primary" size="md" disabled={working || !acknowledged} onClick={onPublish}>{ctx.busy ? t.publishing : t.publish}</CorpButton>
        </div>
      </div></CorpBody>}</CorpCard>
    </CorpSection> : <div className="be-actions be-actions--page"><CorpButtonLink href={MAP} kind="secondary" size="md" className="b-rowact b-rowact--go">{t.mainRecords}</CorpButtonLink></div>}
  </>;
}

/* ---------- Check figures: the contract's query, with exactly the choices it allows ---------- */
type Ask = { domain: BusinessDomain; first: string; last: string; use: "main" | "one"; sourceId: string; time: "CURRENT" | "HISTORICAL"; places: "ALL" | "SELECTED"; locationIds: string[] };
export function FiguresPanel({ ctx, problem, initialResult = null }: { ctx: BusinessCtx; problem?: ReactNode; initialResult?: BusinessReadResult | null }) {
  const { t, catalog, client } = ctx;
  const [ask, setAsk] = useState<Ask>({ domain: "SALES", first: "", last: "", use: "main", sourceId: "", time: "CURRENT", places: "ALL", locationIds: [] });
  const [tried, setTried] = useState(false);
  const sent = useRef<Extract<BusinessCommand,{op:"query_finance"|"query_sales"}> | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const {state,read}=useLeased(ctx,(signal)=>sent.current?client.send(sent.current,signal):Promise.resolve({kind:"unavailable"}),result=>!!result.result,false);
  const period = ask.first && ask.last ? windowFromDays(ask.first, ask.last, ctx.timeZone) : null;
  const records = catalog.sources.filter(source => source.active && !source.deleted && source.domain === ask.domain);
  const errors: Partial<Record<"days" | "record" | "places", string>> = {};
  if (!ask.first || !ask.last) errors.days = t.error.days; else if (!period) errors.days = t.error.dayOrder;
  if (ask.use === "one" && !records.some(source => source.sourceId === ask.sourceId)) errors.record = t.figuresError.record;
  if (ask.places === "SELECTED" && !ask.locationIds.length) errors.places = t.figuresError.places;
  const displayedIds = ask.places === "ALL" ? catalog.activeLocations.map(place => place.id) : ask.locationIds;
  const shown = tried ? errors : {};
  const set = (change: Partial<Ask>) => setAsk(old => ({ ...old, ...change }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTried(true);
    if (Object.keys(errors).length || !period) { requestAnimationFrame(() => form.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus()); return; }
    const query:BusinessQuery = { window: period, selection: ask.use === "one" ? { kind: "SOURCE", sourceId: ask.sourceId } : { kind: "PRIMARY_PERIMETER" },
      locationScope: ask.places === "ALL" ? { kind: "ALL" } : { kind: "SELECTED", locationIds: [...ask.locationIds].sort() }, temporalUse: ask.time };
    sent.current=ask.domain==="FINANCE"?{op:"query_finance",requestId:newRequestId(),query:{...query,scenario:null} as BusinessFinanceQuery}:{op:"query_sales",requestId:newRequestId(),query};
    void read();
  };
  const answer = state.kind === "ready" ? state.result.result : state.kind==="idle"?initialResult:null;
  return <>
    {problem}
    <CorpCard as="div"><CorpBody><form ref={form} className="c-teamform be-form be-askform" onSubmit={submit} noValidate aria-labelledby="be-title">
      <div className="c-field__row be-pair">
        <CorpField label={t.type} htmlFor="be-q-domain"><select className="c-in" id="be-q-domain" value={ask.domain} onChange={event => set({ domain: event.target.value as BusinessDomain, sourceId: "" })}>
          <option value="SALES">{t.domain.SALES}</option><option value="FINANCE">{t.domain.FINANCE}</option></select></CorpField>
        <CorpField label={t.readAs} htmlFor="be-q-time"><select className="c-in" id="be-q-time" value={ask.time} onChange={event => set({ time: event.target.value as Ask["time"] })}>
          <option value="CURRENT">{t.timeCurrent}</option><option value="HISTORICAL">{t.timePast}</option></select></CorpField>
      </div>
      <div className="c-field__row be-pair">
        <CorpField label={t.firstDay} htmlFor="be-q-first" error={shown.days ? <ErrorText>{shown.days}</ErrorText> : undefined} errorId="be-q-days-error">
          <input className="c-in" id="be-q-first" type="date" value={ask.first} aria-invalid={shown.days ? true : undefined} aria-describedby={shown.days ? "be-q-days-error" : undefined} onChange={event => set({ first: event.target.value })} /></CorpField>
        <CorpField label={t.lastDay} htmlFor="be-q-last"><input className="c-in" id="be-q-last" type="date" value={ask.last} min={ask.first || undefined} aria-invalid={shown.days ? true : undefined} onChange={event => set({ last: event.target.value })} /></CorpField>
      </div>
      <div className="c-field__row be-pair">
        <CorpField label={t.readFrom} htmlFor="be-q-use"><select className="c-in" id="be-q-use" value={ask.use} onChange={event => set({ use: event.target.value as Ask["use"] })}>
          <option value="main">{t.useMain}</option><option value="one">{t.useOne}</option></select></CorpField>
        {ask.use === "one" ? <CorpField label={t.entryRecord} htmlFor="be-q-record" error={shown.record ? <ErrorText>{shown.record}</ErrorText> : undefined} errorId="be-q-record-error">
          <select className="c-in" id="be-q-record" value={ask.sourceId} aria-invalid={shown.record ? true : undefined} aria-describedby={shown.record ? "be-q-record-error" : undefined} onChange={event => set({ sourceId: event.target.value })}>
            <option value="">{t.choose}</option>{records.map(source => <option key={source.sourceId} value={source.sourceId}>{source.name}</option>)}</select></CorpField>
          : <CorpField label={t.places} htmlFor="be-q-places"><select className="c-in" id="be-q-places" value={ask.places} onChange={event => set({ places: event.target.value as Ask["places"] })}>
            <option value="ALL">{t.allPlaces}</option><option value="SELECTED">{t.chooseLocations}</option></select></CorpField>}
      </div>
      {ask.use === "one" ? <CorpField label={t.places} htmlFor="be-q-places"><select className="c-in" id="be-q-places" value={ask.places} onChange={event => set({ places: event.target.value as Ask["places"] })}>
        <option value="ALL">{t.allPlaces}</option><option value="SELECTED">{t.chooseLocations}</option></select></CorpField> : null}
      <fieldset className="be-picks"><legend className="c-field__label">{t.places}</legend>
        {catalog.activeLocations.slice(0, 200).map(place => <label key={place.id} className="be-pick"><input type="checkbox" checked={displayedIds.includes(place.id)} disabled={ask.places === "ALL" ? displayedIds.length > 21 : !ask.locationIds.includes(place.id) && ask.locationIds.length >= 20}
          aria-invalid={shown.places ? true : undefined} onChange={() => set({ places: "SELECTED", locationIds: displayedIds.includes(place.id) ? displayedIds.filter(id => id !== place.id) : [...displayedIds, place.id] })} /><span>{place.name}</span></label>)}
        {shown.places ? <span className="c-error" role="alert"><ErrorText>{shown.places}</ErrorText></span> : null}</fieldset>
      <div className="be-actions"><CorpButton type="submit" kind="primary" size="md" disabled={state.kind === "loading"}>{state.kind === "loading" ? t.reading : t.showFiguresNow}</CorpButton></div>
    </form></CorpBody></CorpCard>
    <div id="be-figures" className="be-results" aria-live="polite">
      {state.kind === "failed" || state.kind === "gone" ? <CorpCard as="div"><BState kind="failed" alert title={t.figuresFailed} line={state.kind === "gone" ? t.notAcceptedLine : t.checkConnection} action={{ retry: true, label: t.tryAgain, onClick: () => void read() }} /></CorpCard>
        : state.kind === "hidden" ? <CorpCard as="div"><BState kind="locked" icon={<EyeSlashIcon weight="bold" />} title={t.figuresHidden} line={t.detailsHiddenLine} action={{ label: t.showAgain, onClick: () => void read() }} /></CorpCard>
        : state.kind === "loading" ? <Skeleton label={t.reading} />
        : answer ? <FiguresResult ctx={ctx} result={answer} /> : null}
    </div>
  </>;
}
/** What the server answered. Unavailable is one card with its reason and no figures; nothing is ever shown as zero. */
export function FiguresResult({ ctx, result }: { ctx: BusinessCtx; result: BusinessReadResult }) {
  const { t, catalog } = ctx;
  if (result.state === "unavailable") return <CorpCard as="div"><BState kind="paused" icon={<WarningIcon weight="bold" />} title={t.figuresUnavailable} line={`${t.unavailable[result.reason!]}.`}
    action={result.reason === "MISSING_MAP" ? { label: t.setUp, href: MAP } : undefined} /></CorpCard>;
  const metrics = result.finance ?? result.sales;
  const groups = result.finance ? result.finance.currencies.map(c => ({ currency: c.currency, figures: financeFigures(t, c) })) : (result.sales?.currencies ?? []).map(c => ({ currency: c.currency, figures: salesFigures(t, c) }));
  if (!groups.length) return <CorpCard as="div"><BState kind="empty" title={t.figuresNone} line={t.figuresNoneLine} /></CorpCard>;
  const zone = catalog.timeZone;
  const partial = !result.completeScope && !result.sourceSubtotal;
  return <>
    {/* Phase 9: a note on the page's canvas is the kit's notice card (amber, the check glyph in its circle). */}
    {partial ? <div className="b-card be-notice" role="note"><div className="b-notice"><BIcon tone="amber"><BGlyph meaning="check" /></BIcon><span className="b-notice__tx"><span className="b-notice__t">{t.incomplete}</span></span></div></div> : null}
    {groups.map(group => { const from = result.citations.filter(citation => citation.currency === group.currency);
      return <CorpSection key={group.currency} id={`be-fig-${group.currency}`} label={`${t.domain[result.domain]} · ${group.currency}`} aside={<span className="be-meta">{periodText(result.window, zone, ctx.locale)} · {t.checkedAt(clockText(result.observedAt, zone, ctx.locale))}</span>}>
        <CorpCard as="div"><CorpRows label={`${t.domain[result.domain]} · ${group.currency}`}>
          {group.figures.map(figure => <li key={figure.key}><CorpRow one title={figure.note ? <>{figure.label}<span className="be-fignote"> · {figure.note}</span></> : figure.label} value={<span className="be-num">{figure.value}</span>} /></li>)}
        </CorpRows></CorpCard>
        {/* Every figure in this card is read from these records together; each one names its period and whether it is still in use. */}
        <CorpCard as="div" label={t.figuresFrom}><CorpRows label={t.figuresFrom}>
          {from.map(citation => { const source = catalog.sources.find(item => item.sourceId === citation.sourceId), listed = catalog.versions.find(item => item.versionId === citation.versionId);
            const stateText = source && listed ? (!source.active ? t.state.withdrawn : t.versionState[versionState(source, listed, ctx.now)]) : t.state.replaced;
            return <li key={citation.versionId}><CorpRow href={viewHref({ name: "version", sourceId: citation.sourceId, versionId: citation.versionId })} title={citation.name}
              detail={periodText(citation.window, citation.timeZone, ctx.locale)} value={stateText} valueTone="soft" /></li>; })}
        </CorpRows></CorpCard>
      </CorpSection>; })}
    {metrics?.findings.length ? <CorpSection id="be-fig-checks" label={t.checks} count={metrics.findings.length}>
      <CorpCard as="div"><CorpRows label={t.checks}>{metrics.findings.map((finding, index) => { const count = finding.count ?? finding.recordIds.length, currency = groups[0].currency;
        return <li key={index}><CorpRow icon={<WarningCircleIcon weight="bold" />} title={t.finding[finding.code]} detail={[finding.accountRef ? t.account(finding.accountRef) : null,
          finding.differenceMinor !== null ? t.checkDifference(formatBusinessMinor(finding.differenceMinor, currency)) : null, count ? t.checkCount(count) : null].filter(Boolean).join(" · ") || undefined} /></li>; })}</CorpRows></CorpCard>
    </CorpSection> : null}
    <CorpSection id="be-fig-know" label={t.goodToKnow}>
      <CorpCard as="div"><CorpBody><ul className="be-notes">
        <li>{result.temporalUse === "HISTORICAL" ? t.pastPeriod : t.timeCurrent} · {result.selection.kind === "SOURCE" ? t.countsOne : t.countsMain} · {result.locationScope.kind === "ALL" ? t.allPlaces : t.somePlaces(result.locationScope.locationIds.length)}</li>
        {result.qualifiers.map(code => <li key={code}>{t.qualifier[code]}</li>)}
      </ul></CorpBody></CorpCard>
    </CorpSection>
  </>;
}
