"use client";
import { useEffect, useRef } from "react";
import { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import { CorpButton, CorpButtonLink } from "@/components/corp/corp";
import { BCallout, BDoneMark, BIcon, BSegs, BSpin } from "@/components/owner-b/b-kit";
import { weekStartFor } from "@/lib/date-utils";
import { timeZoneLabel } from "@/lib/time-zone-label";
import type { CoverageActionView, createCoverageActionController } from "./coverage-actions-controller";
import { firstOpenMinute } from "@/lib/owner-advisor/coverage-plan-clock";
import { dayText, hoursText, shiftLength, shiftRange } from "./format";
type Actions = Pick<ReturnType<typeof createCoverageActionController>, "acknowledge" | "save" | "recover" | "check" | "dismiss">;

/* The reviewed coverage draft (Direction B, Nov 18, 2026): a white card under the checks with the glyph, the exact
 * assignments as rows, one acknowledgement and the save. Saving writes drafts only; the words say so. QA S-09 (Nov 22,
 * 2026): hours in plain words, each shift with its length, and for today only the time still ahead, as in the plans. */
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
  const ahead = r && firstOpenMinute(r.date, r.preparedAt, r.timeZone) > 0 ? " for the rest of today" : "";
  const slots = (n: number, would: boolean) => n === 0 ? `No time slots ${would ? "would be left" : "are"} uncovered.` : `${n} time ${n === 1 ? "slot" : "slots"} ${would ? "would still need" : n === 1 ? "still needs" : "still need"} someone.`;
  const format = (stamp: string, zone: string) => new Date(stamp).toLocaleString("en-US", { timeZone: zone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return <section className="c-card oa-draft" aria-label="Reviewed coverage draft" aria-busy={busy}>
    <div className="oa-draft__head">
      {receipt ? <BDoneMark /> : <BIcon tone="teal"><ClockIcon weight="bold" /></BIcon>}
      <div className="oa-draft__titles"><p className="oa-draft__eyebrow">Coverage · Draft only</p><h2 className="oa-draft__t" ref={heading} tabIndex={-1}>{receipt ? "Draft saved" : r ? "Review draft changes" : view.stage === "uncertain" ? "Check your original request" : "Coverage draft"}</h2></div>
    </div>
    <div className="oa-draft__body">
      {view.message && <p className="oa-para" role="status">{view.message}</p>}
      {busy && <p className="oa-para oa-wait" role="status"><BSpin small />Checking the exact request…</p>}
      {r && <>
        <p className="oa-facts"><BSegs parts={[dayText(r.date), timeZoneLabel(r.timeZone)]} /></p>
        <ul className="oa-people oa-people--rows">{r.assignments.map((a, i) => <li key={i}>
          <span className="oa-people__who"><strong>{a.employeeName}</strong><span className="oa-people__when">{shiftRange(a.startTime, a.endTime)} · {shiftLength(a.startTime, a.endTime)}</span></span>
          <span className="oa-facts"><BSegs parts={[a.locationName, a.positionName ?? "Team member", a.isDesignatedLead ? "Shift lead" : null]} /></span>
        </li>)}</ul>
        {review && <>
          <p className="oa-para">{r.assignments.length === 1 ? "This assignment is" : `These ${r.assignments.length} assignments are`} added as drafts. Existing shifts stay as they are, and publishing is a separate decision.</p>
          <p className="oa-para">With {r.assignments.length === 1 ? "it" : "them"}, {hoursText(r.coverage.coveredMinutes)} of the {hoursText(r.coverage.requiredMinutes)} that need someone{ahead} would be covered. {slots(r.coverage.remainingBlocks, true)}</p>
          <p className="oa-para oa-para--quiet">Review expires {format(r.expiresAt, r.timeZone)}. Current rules are checked again when you save.</p>
          {r.partial && <BCallout tone="amber">Some locations or requirements are outside this review. Check the full schedule before publishing.</BCallout>}
          <label className="oa-consent"><input type="checkbox" checked={view.acknowledged} onChange={e => actions.acknowledge(e.target.checked)} disabled={busy}/><span>I checked these assignments and want to save them as drafts.</span></label>
          <div className="oa-acts oa-acts--end">
            <CorpButton kind="primary" size="md" onClick={() => void actions.save()} disabled={!view.acknowledged || busy}>Save {r.assignments.length} draft {r.assignments.length === 1 ? "assignment" : "assignments"}</CorpButton>
            <CorpButton kind="secondary" size="md" className="b-rowact b-rowact--quiet" onClick={actions.dismiss}>Back to comparison</CorpButton>
          </div>
        </>}
        {receipt && <>
          <p className="oa-para">{receipt.count} {receipt.count === 1 ? "assignment" : "assignments"} saved {format(receipt.savedAt, r.timeZone)}. No schedule was published and nobody was notified.</p>
          {progress && <BCallout role="status" tone={progress.state === "current" ? "teal" : "amber"} heading="h3"
            title={progress.state === "unavailable" ? "Current progress unavailable" : progress.state === "changed" ? "The saved plan has changed" : "Saved assignments are present"}>
            {progress.state === "unavailable" ? <p>The original save is recorded. Check again to verify the current schedule.</p> : <>
              <p>{progress.assignmentsPresent} of {progress.assignmentsTotal} exact assignments present · {progress.publishedAssignments} of {progress.assignmentsTotal} published</p>
              <p>Covered on {dayText(r.date)}: {hoursText(progress.coverage!.coveredMinutes)} of the {hoursText(progress.coverage!.requiredMinutes)} that need someone. {slots(progress.coverage!.remainingBlocks, false)}</p>
              {!progress.scopeComplete && <p>Some locations are left out of this check and need their own review.</p>}
            </>}
            <p className="oa-quiet">Checked {format(progress.observedAt, progress.timeZone)} · {timeZoneLabel(progress.timeZone)}</p>
          </BCallout>}
          <p className="oa-para oa-para--quiet">Saved drafts don’t confirm that people agreed to these shifts or will show up.</p>
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
