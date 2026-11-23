"use client";
import { useViewLang } from "@/components/owner-b/use-owner-lang";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowClockwiseIcon } from "@phosphor-icons/react/dist/ssr/ArrowClockwise";
import { CorpCard, CorpRow, CorpRows } from "@/components/corp/corp";
import { BCallout, BChip, BState } from "@/components/owner-b/b-kit";
import { durationSentence } from "@/lib/duration-format";
import { minutesOf, readLaborCost, type LaborCost } from "@/lib/compensation/compensation-client";
import { moneyText } from "@/lib/compensation/wage-plan";
import { costCopy, type CostLang } from "./cost-copy";

/* SCRUM-214 (Nov 19, 2026): the Owner's draft labor cost on the schedule. One read per location in view through POST
 * /api/compensation/labor-cost (Owner only; preview reads have no side effects). The saved baseline is the working
 * schedule (drafts and held edits included), so the figure follows every saved edit; the planner saves each edit as it is
 * made, so no unsaved changes are sent. A null total is "Incomplete" and says why (shifts with no rate, a shift on a
 * clock change); "0" is a real zero. It is base scheduled pay and says what it leaves out. */

type Row = { id: string; name: string; state: "loading" } | { id: string; name: string; state: "ready"; cost: LaborCost } | { id: string; name: string; state: "unavailable" };

export function LaborCostCard({ weekStart, locations, lang: langProp }: { weekStart: string; locations: { id: string; name: string }[]; lang?: CostLang }) {
  const lang = useViewLang(langProp);
  const t = costCopy(lang);
  const [rows, setRows] = useState<Row[]>(locations.map(location => ({ ...location, state: "loading" as const })));
  const [hidden, setHidden] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const key = locations.map(location => location.id).join(",");

  const ids = useMemo(() => key ? key.split(",") : [], [key]);
  const apply = useCallback((results: { id: string; result: Awaited<ReturnType<typeof readLaborCost>> }[]) => {
    if (results.some(item => item.result.kind === "denied" || item.result.kind === "signed_out")) { setHidden(true); return; }
    setRows(old => results.map(({ id, result }) => {
      const name = old.find(row => row.id === id)?.name ?? id;
      return result.kind === "ready" ? { id, name, state: "ready" as const, cost: result.cost } : { id, name, state: "unavailable" as const };
    }));
  }, []);
  const fetchAll = useCallback((signal?: AbortSignal) => Promise.all(ids.map(async id => {
    // A 409 means the schedule moved while it was read: read once more before saying anything.
    let result = await readLaborCost(weekStart, id, [], signal);
    if (result.kind === "conflict") result = await readLaborCost(weekStart, id, [], signal);
    return { id, result };
  })), [ids, weekStart]);
  const load = useCallback((signal?: AbortSignal) => fetchAll(signal).then(results => { if (!signal?.aborted) apply(results); }), [fetchAll, apply]);

  useEffect(() => {
    const controller = new AbortController();
    fetchAll(controller.signal).then(results => { if (!controller.signal.aborted) apply(results); }, () => undefined);
    return () => controller.abort();
  }, [fetchAll, apply]);

  if (hidden || !locations.length) return null;
  const ready = rows.filter((row): row is Extract<Row, { state: "ready" }> => row.state === "ready");
  const loading = rows.some(row => row.state === "loading");
  const failed = !loading && rows.every(row => row.state === "unavailable");
  const observed = ready.map(row => row.cost.scheduleObservedAt).sort().at(-1);
  const zone = ready[0]?.cost.timeZone;

  const refresh = () => { setRefreshing(true); load().catch(() => undefined).finally(() => setRefreshing(false)); };
  const money = (minor: string) => moneyText(minor, t.locale);

  const priced = (p: LaborCost["draft"]) => p.shiftCount - p.missingRateShifts - p.unresolvedTimeShifts;
  function line(row: Row) {
    if (row.state === "loading") return <li key={row.id}><div className="lc-skel" aria-hidden="true"><span className="lc-skel__bar" /><span className="lc-skel__bar lc-skel__bar--v" /></div></li>;
    if (row.state === "unavailable") return <li key={row.id}><CorpRow title={row.name} detail={t.rowUnavailable} trail={<BChip tone="grey">{t.unavailable}</BChip>} /></li>;
    const p = row.cost.draft, hours = durationSentence(minutesOf(p.coveredNanoseconds) + minutesOf(p.missingRateNanoseconds), "0 h");
    const none = p.shiftCount > 0 && minutesOf(p.coveredNanoseconds) === 0 && p.missingRateShifts > 0;
    const gaps = none ? [] : [p.missingRateShifts ? t.missingRate(p.missingRateShifts, durationSentence(minutesOf(p.missingRateNanoseconds), "0 h")) : null,
      p.unresolvedTimeShifts ? t.unresolved(p.unresolvedTimeShifts) : null].filter(Boolean);
    const detail = [t.shifts(p.shiftCount, hours), ...gaps].join(" · ");
    return <li key={row.id}><CorpRow title={row.name} detail={detail}
      value={p.totalMinor !== null && rows.length > 1 ? money(p.totalMinor) : undefined} valueTone="soft"
      trail={p.totalMinor !== null ? undefined : none ? <BChip tone="amber">{t.noRates}</BChip>
        : <span className="lc-inc"><BChip tone="amber">{t.incomplete}</BChip><span className="lc-inc__at">{t.pricedOf(money(p.subtotalMinor), priced(p), p.shiftCount)}</span></span>} /></li>;
  }
  const allReady = !loading && ready.length === rows.length;
  const total = allReady ? ready.reduce<bigint | null>((sum, row) => sum === null || row.cost.draft.totalMinor === null ? null : sum + BigInt(row.cost.draft.totalMinor), BigInt(0)) : undefined;
  const noRatesAnywhere = allReady && ready.every(row => row.cost.draft.shiftCount === 0 || (minutesOf(row.cost.draft.coveredNanoseconds) === 0 && row.cost.draft.missingRateShifts > 0)) && ready.some(row => row.cost.draft.shiftCount > 0);
  // "Estimate" is the card's standing state, so it is grey text; a chip marks an exception. While the amber note shows,
  // the note says "No pay rates" and the header does not repeat it.
  const est = <span className="lc-est">{t.estimate}</span>;
  const head = loading || failed ? est
    : total === null || total === undefined ? <span className="lc-head">{est}{noRatesAnywhere ? null : <BChip tone="amber">{t.incomplete}</BChip>}</span>
    : <span className="lc-head">{est}<strong className="lc-total">{money(total.toString())}</strong></span>;

  return <CorpCard id="schedule-labor-cost" label={t.title} aside={head} lang={lang}>
    {failed ? <BState alert kind="failed" title={t.failedTitle} line={t.failedBody} action={{ label: t.tryAgain, busy: refreshing, busyLabel: t.checking, onClick: refresh }} />
      : <div className="lc">
        <div role="status" aria-busy={loading || undefined} className="lc-sr">{loading ? t.loading : ""}</div>
        {noRatesAnywhere ? <div className="lc-none"><BCallout tone="amber" icon="check" title={t.noRatesTitle} action={{ label: t.openTeam, href: "/app/employees" }}>{t.noRatesBody}</BCallout></div>
          : <CorpRows label={t.title}>{rows.map(line)}</CorpRows>}
        <div className="lc-foot">
          <details className="lc-basis"><summary>{t.included}</summary><p>{t.basis}</p></details>
          <p className="lc-meta">{observed && zone ? t.observed(new Intl.DateTimeFormat(t.locale, { timeZone: zone, hour: "numeric", minute: "2-digit" }).format(new Date(observed))) : null}
            <button type="button" className="lc-refresh" onClick={refresh} disabled={refreshing || loading} aria-busy={refreshing || undefined}>
              <ArrowClockwiseIcon size={14} weight="bold" aria-hidden="true" />{refreshing ? t.checking : t.refresh}</button></p>
        </div>
      </div>}
  </CorpCard>;
}
