"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import { SlidersHorizontalIcon } from "@phosphor-icons/react/dist/ssr/SlidersHorizontal";
import { CorpButton, CorpButtonLink, CorpCard, CorpEmptyRow, CorpSection } from "@/components/corp/corp";
import { BCallout, BCount, BIcon, BSegs, BState } from "@/components/owner-b/b-kit";
import type { AttentionBriefing, AttentionDisposition, AttentionKind, AttentionReviewed } from "@/lib/owner-advisor/briefing-contracts";
import { attentionDetail, dayText, whenText, type Clock } from "./format";

function reviewText(item: AttentionReviewed, clock: Clock) {
  if (item.state === "resolved") return item.kind === "coverage" ? "Current planning records meet coverage rules for the tracked periods." : item.kind === "setup" ? "Coverage rules are now configured." : "Recorded punches now cover the tracked shifts.";
  if (item.state === "not_current") return "The original issue no longer matches current records. Resolution is unconfirmed.";
  if (item.state === "unverified") return "Current records cannot confirm a resolution.";
  if (item.evidenceChanged) return "Evidence changed. This issue is shown for review again.";
  if (item.disposition === "dismissed") return "Marked not relevant today. The business issue remains open.";
  if (item.disposition === "deferred" && item.deferredUntil) return `Deferred until ${whenText(item.deferredUntil, clock.timeZone, clock.today)}. The business issue remains open.`;
  return "Tracking. The business issue remains open.";
}

/** What the issue is about, in the app's own glyphs: timecards (Clock), the schedule (CalendarBlank), its rules (Sliders). */
const KIND_ICON: Record<AttentionKind, ReactNode> = {
  clock_in: <ClockIcon weight="bold" />, missing_punches: <ClockIcon weight="bold" />,
  coverage: <CalendarBlankIcon weight="bold" />, setup: <SlidersHorizontalIcon weight="bold" />,
};

/* Needs your attention (Direction B, Nov 18, 2026): one card of issue rows. Each row is a tinted glyph, the title, one facts
 * line (place · day · when observed), the server's sentence and its basis, then the row's actions: the tinted "Review
 * source" and three quiet choices. Choices only record how the Owner tracks the issue; they never change business records. */
export function AttentionSection({ briefing, disabled, saving, review, refresh, clock = {} }: {
  briefing: AttentionBriefing; disabled: boolean; saving: boolean;
  review: (id: string, disposition: AttentionDisposition) => void; refresh: () => void; clock?: Clock;
}) {
  const wasSaving = useRef(false);
  useEffect(() => {
    // After a saved choice the list is read again; focus returns to the section's heading, as before.
    if (wasSaving.current && !saving) {
      const heading = document.getElementById("oa-attention-label");
      if (heading) { heading.tabIndex = -1; heading.focus(); }
    }
    wasSaving.current = saving;
  }, [saving]);
  const year = clock.today?.slice(0, 4);
  const unreviewed = briefing.total - briefing.hidden;
  return <CorpSection id="oa-attention" label="Needs your attention"
    aside={<button type="button" className="c-link oa-headbtn" disabled={disabled} onClick={refresh}>Check again</button>}>
    <CorpCard as="div">
      <div className="oa-att" aria-busy={saving}>
        <p className="oa-lede oa-pad">Today’s staffing and recorded-punch issues. Your briefing choices do not change schedules or time records.</p>
        {briefing.state === "unavailable"
          ? <BState kind="failed" title="The priority briefing is unavailable." line="Check again to refresh the records." />
          : <>
            {briefing.partial ? <div className="oa-pad"><BCallout tone="amber">Some sources could not be fully assessed. This briefing cannot confirm that everything is clear.</BCallout></div> : null}
            {briefing.items.length === 0
              ? <CorpEmptyRow>{briefing.hidden > 0 ? "Your reviewed items are below. Deferring or dismissing an item does not resolve it." : briefing.partial ? "No priority items could be confirmed from the available sources." : "No staffing or recorded-punch issues were found in today's assessed sources."}</CorpEmptyRow>
              : <ol className="oa-items">{briefing.items.map(item => <li key={item.id} className="oa-item">
                <BIcon tone="amber">{KIND_ICON[item.kind]}</BIcon>
                <div className="oa-item__main">
                  <h3 className="oa-item__t">{item.title}</h3>
                  <p className="oa-facts"><BSegs parts={[item.locationName, dayText(item.date, "en", year),
                    <>Observed <time dateTime={item.source.observedAt}>{whenText(item.source.observedAt, clock.timeZone, clock.today)}</time></>]} /></p>
                  <p className="oa-item__d">{attentionDetail(item.detail)}</p>
                  <p className="oa-item__basis">{item.basis}</p>
                  <div className="oa-acts">
                    <CorpButtonLink native href={item.source.href} kind="secondary" size="md" className="b-rowact b-rowact--go">Review source</CorpButtonLink>
                    <CorpButton kind="secondary" size="md" className="b-rowact b-rowact--quiet" disabled={disabled || item.disposition === "tracking"} onClick={() => review(item.id, "tracking")}>{item.disposition === "tracking" ? "Tracking" : "Track this issue"}</CorpButton>
                    <CorpButton kind="secondary" size="md" className="b-rowact b-rowact--quiet" disabled={disabled} onClick={() => review(item.id, "deferred")}>Later · 1 hour</CorpButton>
                    <CorpButton kind="secondary" size="md" className="b-rowact b-rowact--quiet" disabled={disabled} onClick={() => review(item.id, "dismissed")}>Not relevant today</CorpButton>
                  </div>
                </div>
              </li>)}</ol>}
            {unreviewed > briefing.items.length ? <p className="oa-foot">Showing {briefing.items.length} of {unreviewed} unreviewed items. Review the source screens for the full picture.</p> : null}
            {briefing.reviewed.length > 0 ? <details className="oa-fold" open>
              <summary><span>Follow-through</span><BCount label={`${briefing.reviewed.length} reviewed`}>{briefing.reviewed.length}</BCount></summary>
              <ul className="oa-items oa-items--quiet">{briefing.reviewed.map(item => <li key={item.id} className="oa-item oa-item--flat">
                <div className="oa-item__main">
                  <h3 className="oa-item__t">{item.title}</h3>
                  <p className="oa-facts"><BSegs parts={[item.locationName, dayText(item.date, "en", year)]} /></p>
                  <p className="oa-item__d">{reviewText(item, clock)}</p>
                  {item.state === "open" && item.disposition !== "tracking"
                    ? <div className="oa-acts"><CorpButton kind="secondary" size="md" className="b-rowact b-rowact--go" disabled={disabled} onClick={() => review(item.id, "tracking")}>Restore to briefing</CorpButton></div> : null}
                </div>
              </li>)}</ul>
            </details> : null}
          </>}
      </div>
    </CorpCard>
  </CorpSection>;
}
