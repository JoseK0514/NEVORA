"use client";
import { useEffect, useRef } from "react";
import { CheckCircleIcon } from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import { weekStartFor } from "@/lib/date-utils";
import type { CoverageActionView, createCoverageActionController } from "./coverage-actions-controller";
type Actions = Pick<ReturnType<typeof createCoverageActionController>, "acknowledge" | "save" | "recover" | "check" | "dismiss">;
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
  return <section className="oa-section oa-draft-panel" aria-label="Reviewed coverage draft" aria-busy={busy}>
    <div className="oa-draft-heading"><span className="oa-draft-icon" aria-hidden="true">{receipt ? <CheckCircleIcon size={24}/> : <ClockIcon size={24}/>}</span>
      <div><p className="oa-muted">Coverage · Draft only</p><h2 ref={heading} tabIndex={-1}>{receipt ? "Draft saved" : r ? "Review draft changes" : view.stage === "uncertain" ? "Check your original request" : "Coverage draft"}</h2></div>
    </div>
    {view.message && <p role="status">{view.message}</p>}
    {busy && <p role="status">Checking the exact request…</p>}
    {r && <>
      <p className="oa-draft-context">{r.date} <span>· {r.timeZone}</span></p>
      <ul className="oa-draft-list">{r.assignments.map((a, i) => <li key={i}>
        <div className="oa-draft-person"><strong>{a.employeeName}</strong><span>{a.startTime}–{a.endTime}</span></div>
        <p>{a.locationName} · {a.positionName ?? "Team member"}{a.isDesignatedLead ? " · Designated lead" : ""}</p>
      </li>)}</ul>
      {review && <>
        <p>These {r.assignments.length} additions preserve existing assignments. They remain drafts; publishing is a separate decision.</p>
        <p className="oa-muted">Review expires {format(r.expiresAt, r.timeZone)}. Current rules are checked again when you save.</p>
        {r.partial && <p>Some locations or requirements are outside this review. Check the full schedule before publishing.</p>}
        <label className="oa-draft-consent"><input type="checkbox" checked={view.acknowledged} onChange={e => actions.acknowledge(e.target.checked)} disabled={busy}/><span>I reviewed these exact assignments and want to save them as drafts.</span></label>
        <div className="oa-actions"><button className="nv-btn" data-kind="primary" onClick={() => void actions.save()} disabled={!view.acknowledged || busy}>Save {r.assignments.length} draft {r.assignments.length === 1 ? "assignment" : "assignments"}</button><button className="nv-btn" data-kind="secondary" onClick={actions.dismiss}>Back to comparison</button></div>
      </>}
      {receipt && <>
        <p>{receipt.count} {receipt.count === 1 ? "assignment" : "assignments"} saved {format(receipt.savedAt, r.timeZone)}. No schedule was published and no employee notification was created.</p>
        {progress && <div className="oa-draft-progress" role="status">
          <h3>{progress.state === "unavailable" ? "Current progress unavailable" : progress.state === "changed" ? "The saved plan has changed" : "Saved assignments are present"}</h3>
          {progress.state === "unavailable" ? <p>The original save is recorded. Check again to verify the current schedule.</p> : <>
            <p>{progress.assignmentsPresent} of {progress.assignmentsTotal} exact assignments present · {progress.publishedAssignments} of {progress.assignmentsTotal} published</p>
            <p>{progress.coverage!.coveredMinutes} of {progress.coverage!.requiredMinutes} configured coverage minutes covered. {progress.coverage!.remainingBlocks} blocks still need review.</p>
            {!progress.scopeComplete && <p>Coverage is partial: excluded or unconfigured locations need a separate review.</p>}
          </>}
          <p className="oa-muted">Checked {format(progress.observedAt, progress.timeZone)} · {progress.timeZone}</p>
        </div>}
        <p className="oa-muted">Planning coverage does not confirm employee acceptance, attendance or resolved business coverage.</p>
        <div className="oa-actions"><button className="nv-btn" data-kind="secondary" onClick={() => void actions.check()} disabled={busy}>Check progress</button><a className="nv-btn" data-kind="secondary" href={`/app/schedule?week=${weekStartFor(r.date)}`}>Open this schedule</a></div>
        <details className="oa-follow-through"><summary>Save receipt</summary><p className="oa-muted">Operation {receipt.operationId}</p></details>
      </>}
    </>}
    {view.stage === "uncertain" && <button className="nv-btn" data-kind="secondary" onClick={() => void actions.recover()}>Check original request</button>}
    {view.stage === "blocked" && <button className="nv-btn" data-kind="secondary" onClick={actions.dismiss}>Back to comparison</button>}
  </section>;
}
