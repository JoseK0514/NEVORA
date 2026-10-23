"use client";
import { useEffect, useRef } from "react";
import type { AttentionBriefing, AttentionDisposition, AttentionReviewed } from "@/lib/owner-advisor/briefing-contracts";

function reviewText(item: AttentionReviewed) {
  if (item.state === "resolved") return item.kind === "coverage" ? "Current planning records meet coverage rules for the tracked periods." : item.kind === "setup" ? "Coverage rules are now configured." : "Recorded punches now cover the tracked shifts.";
  if (item.state === "not_current") return "The original issue no longer matches current records. Resolution is unconfirmed.";
  if (item.state === "unverified") return "Current records cannot confirm a resolution.";
  if (item.evidenceChanged) return "Evidence changed. This issue is shown for review again.";
  if (item.disposition === "dismissed") return "Marked not relevant today. The business issue remains open.";
  if (item.disposition === "deferred" && item.deferredUntil) return `Deferred until ${new Date(item.deferredUntil).toLocaleString()}. The business issue remains open.`;
  return "Tracking. The business issue remains open.";
}
export function AttentionSection({ briefing, disabled, saving, review, refresh }: {
  briefing: AttentionBriefing; disabled: boolean; saving: boolean;
  review: (id: string, disposition: AttentionDisposition) => void; refresh: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const wasSaving = useRef(false);
  useEffect(() => {
    if (wasSaving.current && !saving) heading.current?.focus();
    wasSaving.current = saving;
  }, [saving]);
  return <section className="oa-section" aria-labelledby="oa-attention" aria-busy={saving}>
    <div className="oa-heading"><h2 id="oa-attention" tabIndex={-1} ref={heading}>Needs your attention</h2>
      <button type="button" className="nv-btn" data-kind="secondary" disabled={disabled} onClick={refresh}>Check again</button></div>
    <p className="oa-muted">Today’s staffing and recorded-punch issues. Your briefing choices do not change schedules or time records.</p>
    {briefing.state === "unavailable" ? <p role="status">The priority briefing is unavailable. Check again to refresh the records.</p> : <>
      {briefing.partial && <p className="oa-notice">Some sources could not be fully assessed. This briefing cannot confirm that everything is clear.</p>}
      {briefing.items.length === 0 ? <p>{briefing.hidden > 0 ? "Your reviewed items are below. Deferring or dismissing an item does not resolve it." : briefing.partial ? "No priority items could be confirmed from the available sources." : "No staffing or recorded-punch issues were found in today's assessed sources."}</p> :
        <ol className="oa-priority-list">{briefing.items.map(item => <li key={item.id} className="oa-priority-item">
          <p className="oa-muted">{item.locationName} · {item.date}</p><h3>{item.title}</h3><p>{item.detail}</p><p className="oa-muted">{item.basis}</p>
          <p className="oa-muted">Observed <time dateTime={item.source.observedAt}>{new Date(item.source.observedAt).toLocaleString()}</time></p>
          <div className="oa-actions"><a className="nv-btn" data-kind="primary" href={item.source.href}>Review source</a>
            <button type="button" className="nv-btn" data-kind="secondary" disabled={disabled || item.disposition === "tracking"} onClick={() => review(item.id, "tracking")}>{item.disposition === "tracking" ? "Tracking" : "Track this issue"}</button>
            <button type="button" className="nv-btn" data-kind="secondary" disabled={disabled} onClick={() => review(item.id, "deferred")}>Later · 1 hour</button>
            <button type="button" className="nv-btn" data-kind="secondary" disabled={disabled} onClick={() => review(item.id, "dismissed")}>Not relevant today</button></div>
        </li>)}</ol>}
      {briefing.total - briefing.hidden > briefing.items.length && <p className="oa-muted">Showing {briefing.items.length} of {briefing.total - briefing.hidden} unreviewed items. Review the source screens for the full picture.</p>}
      {briefing.reviewed.length > 0 && <details className="oa-follow-through" open><summary>Follow-through · {briefing.reviewed.length}</summary><ul className="oa-priority-list">{briefing.reviewed.map(item => <li key={item.id} className="oa-priority-item">
        <h3>{item.title}</h3><p className="oa-muted">{item.locationName} · {item.date}</p><p>{reviewText(item)}</p>
        {item.state === "open" && item.disposition !== "tracking" && <button type="button" className="nv-btn" data-kind="secondary" disabled={disabled} onClick={() => review(item.id, "tracking")}>Restore to briefing</button>}
      </li>)}</ul></details>}
    </>}
  </section>;
}
