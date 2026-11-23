"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import { SlidersHorizontalIcon } from "@phosphor-icons/react/dist/ssr/SlidersHorizontal";
import { CorpButton, CorpButtonLink, CorpCard, CorpEmptyRow, CorpSection } from "@/components/corp/corp";
import { BCallout, BCount, BIcon, BSegs, BState } from "@/components/owner-b/b-kit";
import type { AttentionBriefing, AttentionDisposition, AttentionKind, AttentionReviewed } from "@/lib/owner-advisor/briefing-contracts";
import { attentionDetail, dayText, whenText, type Clock } from "./format";

/** QA S-09 recheck (Nov 22, 2026): the briefing's basis is a fixed contract value; the person reads plain words. */
/** The closing sentence the server puts on every planning-gap item (src/lib/owner-advisor/briefing.ts). */
const DRAFT_NOTE = "Includes draft commitments; verify published staffing separately.";
const basisWords = (basis: string) => basis === "Current planning ledger, including drafts" ? "From the current schedule, including drafts" : basis;

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
  // Rondo fix (Nov 23): what every item shares (day, observed time, basis) is said once above the list, and items with
  // the same title sit under one title by place, so a briefing never repeats a line per item.
  const items = briefing.items;
  const shared = <T,>(pick: (item: (typeof items)[number]) => T) => items.length > 1 && items.every(item => pick(item) === pick(items[0]));
  const oneDay = shared(i => i.date), oneTime = shared(i => whenText(i.source.observedAt, clock.timeZone, clock.today)), oneBasis = shared(i => i.basis);
  const groups: { title: string; items: typeof items }[] = [];
  for (const item of items) {
    const group = groups.find(g => g.title === item.title);
    if (group) group.items.push(item); else groups.push({ title: item.title, items: [item] });
  }
  const observed = (at: string) => <>Observed <time dateTime={at}>{whenText(at, clock.timeZone, clock.today)}</time></>;
  /* Follow-up (lead, Nov 23): in a group, a closing sentence every place shares (the draft-commitments note) and a source
   * link every place shares are said once under the title. Track, Later and Not relevant stay with each place: each saves
   * that place's own issue record, one save at a time. */
  const groupShared = (group: { items: typeof items }) => {
    const note = DRAFT_NOTE;
    return { note: group.items.length > 1 && group.items.every(item => item.detail.endsWith(note)) ? note : null,
      href: group.items.length > 1 && group.items.every(item => item.source.href === group.items[0].source.href) ? group.items[0].source.href : null };
  };
  const reviewLink = (href: string) => <CorpButtonLink native href={href} kind="secondary" size="md" className="b-rowact b-rowact--go">Review source</CorpButtonLink>;
  const itemBody = (item: (typeof items)[number], withPlace: boolean, groupBasis = false, inGroup: { note: string | null; href: string | null } = { note: null, href: null }) => {
    const facts = [withPlace ? item.locationName : null, oneDay ? null : dayText(item.date, "en", year), oneTime ? null : observed(item.source.observedAt)];
    const detail = inGroup.note ? item.detail.slice(0, -inGroup.note.length).trimEnd() : item.detail;
    return <>
      {facts.some(Boolean) ? <p className="oa-facts"><BSegs parts={facts} /></p> : null}
      <p className="oa-item__d">{attentionDetail(detail)}</p>
      {oneBasis || groupBasis ? null : <p className="oa-item__basis">{basisWords(item.basis)}</p>}
      <div className={inGroup.href ? "oa-acts oa-acts--att oa-acts--three" : "oa-acts oa-acts--att"}>
        {inGroup.href ? null : reviewLink(item.source.href)}
        <CorpButton kind="secondary" size="md" className="b-rowact b-rowact--go" disabled={disabled || item.disposition === "tracking"} onClick={() => review(item.id, "tracking")}>{item.disposition === "tracking" ? "Tracking" : "Track this issue"}</CorpButton>
        <CorpButton kind="secondary" size="md" className="b-rowact b-rowact--go" disabled={disabled} onClick={() => review(item.id, "deferred")}>Later · 1 hour</CorpButton>
        <CorpButton kind="secondary" size="md" className="b-rowact b-rowact--go" disabled={disabled} onClick={() => review(item.id, "dismissed")}>Not relevant today</CorpButton>
      </div>
    </>;
  };
  return <CorpSection id="oa-attention" label="Needs your attention"
    aside={<button type="button" className="c-link oa-headbtn" disabled={disabled} onClick={refresh}>Check again</button>}>
    <CorpCard as="div">
      <div className="oa-att" aria-busy={saving}>
        <p className="oa-lede oa-pad">Today’s staffing and recorded-punch issues.</p>
        {oneDay || oneTime || oneBasis ? <p className="oa-facts oa-pad oa-att__shared"><BSegs parts={[oneDay ? dayText(items[0].date, "en", year) : null,
          oneTime ? observed(items[0].source.observedAt) : null, oneBasis ? basisWords(items[0].basis) : null]} /></p> : null}
        {briefing.state === "unavailable"
          ? <BState kind="failed" title="The priority briefing is unavailable." line="Check again to refresh the records." />
          : <>
            {briefing.partial ? <div className="oa-pad"><BCallout tone="amber">Some sources could not be fully assessed. This briefing cannot confirm that everything is clear.</BCallout></div> : null}
            {briefing.items.length === 0
              ? <CorpEmptyRow>{briefing.hidden > 0 ? "Your reviewed items are below. Deferring or dismissing an item does not resolve it." : briefing.partial ? "No priority items could be confirmed from the available sources." : "No staffing or recorded-punch issues were found in today's assessed sources."}</CorpEmptyRow>
              : <ol className="oa-items">{groups.map(group => <li key={group.items[0].id} className="oa-item">
                <BIcon tone="amber">{KIND_ICON[group.items[0].kind]}</BIcon>
                <div className="oa-item__main">
                  <h3 className="oa-item__t">{group.title}</h3>
                  {group.items.length === 1 ? itemBody(group.items[0], true) : (() => {
                    const groupBasis = !oneBasis && group.items.every(item => item.basis === group.items[0].basis);
                    const inGroup = groupShared(group);
                    return <>
                      {inGroup.note ? <p className="oa-item__d">{inGroup.note}</p> : null}
                      {groupBasis ? <p className="oa-item__basis">{basisWords(group.items[0].basis)}</p> : null}
                      {inGroup.href ? <div className="oa-acts oa-acts--one">{reviewLink(inGroup.href)}</div> : null}
                      {group.items.map(item => <div key={item.id} className="oa-subitem">
                        <h4 className="oa-subitem__t">{item.locationName}</h4>
                        {itemBody(item, false, groupBasis, inGroup)}
                      </div>)}
                    </>;
                  })()}
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
