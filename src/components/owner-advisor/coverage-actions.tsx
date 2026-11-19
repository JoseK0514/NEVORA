"use client";
import { useEffect, useRef } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import { CorpButton, CorpButtonLink } from "@/components/corp/corp";
import { BCallout, BIcon, BSegs, BSpin } from "@/components/owner-b/b-kit";
import { weekStartFor } from "@/lib/date-utils";
import { timeZoneLabel } from "@/lib/time-zone-label";
import type { CoverageActionView, createCoverageActionController } from "./coverage-actions-controller";
import { clockRange, dayText } from "./format";
type Actions = Pick<ReturnType<typeof createCoverageActionController>, "acknowledge" | "save" | "recover" | "check" | "dismiss">;

/* The reviewed coverage draft (Direction B, Nov 18, 2026): a white card under the checks with the glyph, the exact
 * assignments as rows, one acknowledgement and the save. Saving writes drafts only; the words say so, unchanged. */
export function CoverageActionPanel({ view, actions }: { view: CoverageActionView; actions: Actions }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (view.stage !== "idle" && view.stage !== "paused" && view.stage !== "busy") {
      heading.current?.scrollIntoView({ block: "center" }); heading.current?.focus({ preventScroll: true });
    }
  }, [view.stage, view.result]);
  if (view.stage === "idle") return null;
  const r = view.result?.review, receipt = view.result?.receipt, progress = view.result?.progress;
  const busy = view.stage === "busy", review = view.stage === "review";
  const format = (stamp: string, zone: string) => new Date(stamp).toLocaleString("en-US", { timeZone: zone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return <section className="c-card oa-draft" aria-label="Reviewed coverage draft" aria-busy={busy}>
    <div className="oa-draft__head">
      <BIcon tone={receipt ? "green" : "teal"}>{receipt ? <CheckCircleIcon weight="bold" /> : <ClockIcon weight="bold" />}</BIcon>
      <div className="oa-draft__titles"><p className="oa-draft__eyebrow">Coverage · Draft only</p><h2 className="oa-draft__t" ref={heading} tabIndex={-1}>{receipt ? "Draft saved" : r ? "Review draft changes" : view.stage === "uncertain" ? "Check your original request" : "Coverage draft"}</h2></div>
    </div>
    <div className="oa-draft__body">
      {view.message && <p className="oa-para" role="status">{view.message}</p>}
      {busy && <p className="oa-para oa-wait" role="status"><BSpin small />Checking the exact request…</p>}
      {r && <>
        <p className="oa-facts"><BSegs parts={[dayText(r.date), timeZoneLabel(r.timeZone)]} /></p>
        <ul className="oa-people oa-people--rows">{r.assignments.map((a, i) => <li key={i}>
          <span className="oa-people__who"><strong>{a.employeeName}</strong><span className="oa-people__when">{clockRange(a.startTime, a.endTime)}</span></span>
          <span className="oa-facts"><BSegs parts={[a.locationName, a.positionName ?? "Team member", a.isDesignatedLead ? "Shift lead" : null]} /></span>
        </li>)}</ul>
        {review && <>
          <p className="oa-para">These {r.assignments.length} additions preserve existing assignments. They remain drafts; publishing is a separate decision.</p>
          <p className="oa-para">{r.coverage.coveredMinutes} of {r.coverage.requiredMinutes} configured coverage minutes would be covered; {r.coverage.remainingBlocks} configured blocks remain.</p>
          <p className="oa-para oa-para--quiet">Review expires {format(r.expiresAt, r.timeZone)}. Current rules are checked again when you save.</p>
          {r.partial && <BCallout tone="amber">Some locations or requirements are outside this review. Check the full schedule before publishing.</BCallout>}
          <label className="oa-consent"><input type="checkbox" checked={view.acknowledged} onChange={e => actions.acknowledge(e.target.checked)} disabled={busy}/><span>I reviewed these exact assignments and want to save them as drafts.</span></label>
          <div className="oa-acts oa-acts--end">
            <CorpButton kind="secondary" size="md" className="b-rowact b-rowact--quiet" onClick={actions.dismiss}>Back to comparison</CorpButton>
            <CorpButton kind="primary" size="md" onClick={() => void actions.save()} disabled={!view.acknowledged || busy}>Save {r.assignments.length} draft {r.assignments.length === 1 ? "assignment" : "assignments"}</CorpButton>
          </div>
        </>}
        {receipt && <>
          <p className="oa-para">{receipt.count} {receipt.count === 1 ? "assignment" : "assignments"} saved {format(receipt.savedAt, r.timeZone)}. No schedule was published and no employee notification was created.</p>
          {progress && <BCallout role="status" tone={progress.state === "current" ? "teal" : "amber"} heading="h3"
            title={progress.state === "unavailable" ? "Current progress unavailable" : progress.state === "changed" ? "The saved plan has changed" : "Saved assignments are present"}>
            {progress.state === "unavailable" ? <p>The original save is recorded. Check again to verify the current schedule.</p> : <>
              <p>{progress.assignmentsPresent} of {progress.assignmentsTotal} exact assignments present · {progress.publishedAssignments} of {progress.assignmentsTotal} published</p>
              <p>{progress.coverage!.coveredMinutes} of {progress.coverage!.requiredMinutes} configured coverage minutes covered. {progress.coverage!.remainingBlocks} blocks still need review.</p>
              {!progress.scopeComplete && <p>Coverage is partial: excluded or unconfigured locations need a separate review.</p>}
            </>}
            <p className="oa-quiet">Checked {format(progress.observedAt, progress.timeZone)} · {timeZoneLabel(progress.timeZone)}</p>
          </BCallout>}
          <p className="oa-para oa-para--quiet">Planning coverage does not confirm employee acceptance, attendance or resolved business coverage.</p>
          <div className="oa-acts">
            <CorpButton kind="secondary" size="md" className="b-rowact b-rowact--go" onClick={() => void actions.check()} disabled={busy}>Check progress</CorpButton>
            <CorpButtonLink native href={`/app/schedule?week=${weekStartFor(r.date)}`} kind="secondary" size="md" className="b-rowact b-rowact--quiet">Open this schedule</CorpButtonLink>
          </div>
          <details className="oa-fold oa-fold--inline"><summary>Save receipt</summary><div className="oa-fold__body"><p className="oa-para oa-para--quiet oa-digest">Operation {receipt.operationId}</p></div></details>
        </>}
      </>}
      {view.stage === "uncertain" && <div className="oa-acts"><CorpButton kind="secondary" size="md" className="b-rowact b-rowact--go" onClick={() => void actions.recover()}>Check original request</CorpButton></div>}
      {view.stage === "blocked" && <div className="oa-acts"><CorpButton kind="secondary" size="md" className="b-rowact b-rowact--go" onClick={actions.dismiss}>Back to comparison</CorpButton></div>}
    </div>
  </section>;
}
