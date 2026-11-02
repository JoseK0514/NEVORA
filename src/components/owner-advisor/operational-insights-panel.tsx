import { INSIGHT_LIMITATIONS, INSIGHT_SOURCE_LIMIT, type OperationalInsights } from "@/lib/owner-advisor/operational-insights";
export function OperationalInsightsPanel({ insights: i, disabled, refresh }: { insights: OperationalInsights; disabled: boolean; refresh: () => void }) {
  const d = i.denominators, o = i.omissions;
  return <section className="oa-section" aria-labelledby="oa-patterns">
    <div className="oa-heading"><h2 id="oa-patterns">Recorded operational patterns</h2><button type="button" className="nv-btn" data-kind="secondary" disabled={disabled} onClick={refresh}>Refresh patterns</button></div>
    <p className="oa-muted">{i.startDate} – {i.endDate} · {i.timeZone}. Observed <time dateTime={i.observedAt}>{new Date(i.observedAt).toLocaleString()}</time>. Updates on open or refresh.</p>
    {i.state === "unavailable" || !d || !o ? <p role="status">Historical sources are unavailable. Refresh to try again; no conclusion can be drawn.</p> : <>
      <p>{d.publishedShiftRecords} published shift records · {d.effectiveEntryRecords} effective entry records · {d.timecardPeriodRecords} timecard period records.</p>
      {i.partial && <p className="oa-notice">Partial history. Some records or location/day summaries are omitted; conclusions are limited to retained records.</p>}
      {i.suggestions.length ? <ul className="oa-priority-list">{i.suggestions.map(s => <li key={s.kind} className="oa-priority-item"><p>{s.detail}</p><p className="oa-muted">{s.limitation}</p></li>)}</ul> : <p>{d.publishedShiftRecords + d.effectiveEntryRecords + d.timecardPeriodRecords === 0 ? "No records were found in this period." : "No investigation was suggested from the retained metadata. This is not an all-clear assessment."}</p>}
      <details className="oa-follow-through"><summary>Evidence, omissions and limits</summary>
        <p>Retained {d.retainedPublishedShiftRecords} shift records, {d.retainedEffectiveEntryRecords} effective entries and {d.retainedTimecardPeriodRecords} timecard period records; source limit {INSIGHT_SOURCE_LIMIT} each.</p>
        <p>Distinct retained entries: {d.openEntryRecords} open, {d.carryInEntryRecords} beginning before this period, {d.adjustmentEntryRecords} adjustment-sourced, {d.correctedRecordedEntryRecords} recorded entries with approved boundary corrections.</p>
        <p>Omitted: {o.publishedShiftRecords} shift records, {o.effectiveEntryRecords} entry records, {o.timecardPeriodRecords} timecard period records and {o.locationDaySummaries} location/day summaries. Showing {i.observations.length} of {d.locationDaySummaries} summaries derived from retained records; maximum 100.</p>
        <ul>{INSIGHT_LIMITATIONS.map(l => <li key={l}>{l}</li>)}</ul>
        <p className="oa-muted">Source version <code className="oa-plain">{i.sourceVersion}</code></p>
        {i.observations.length > 0 && <ul className="oa-priority-list">{i.observations.map(row => <li key={JSON.stringify([row.date, row.locationId])} className="oa-priority-item"><p>{row.date} · {row.locationName}</p><p>{row.publishedShiftRecords} published shifts; {row.entryStarts} entry starts; {row.entryOverlaps} overlapping entries ({row.openEntryOverlaps} open, {row.adjustmentEntryOverlaps} adjustment-sourced).</p></li>)}</ul>}
      </details>
      <p className="oa-muted">Past choices and outcomes are available in Owner memory. Owner-reported results and timestamped draft checks are separate; neither establishes business success.</p>
    </>}
  </section>;
}
