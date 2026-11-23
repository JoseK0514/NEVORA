"use client";
import { useEffect, useRef } from "react";
import { ClockIcon } from "@phosphor-icons/react/dist/ssr/Clock";
import { CorpButton, CorpButtonLink } from "@/components/corp/corp";
import { BCallout, BDoneMark, BIcon, BSegs, BSpin } from "@/components/owner-b/b-kit";
import { weekStartFor } from "@/lib/date-utils";
import type { CoverageActionView, createCoverageActionController } from "./coverage-actions-controller";
import { firstOpenMinute } from "@/lib/owner-advisor/coverage-plan-clock";
import { dayText, hoursText, shiftLength, shiftRange } from "./format";
import { useAdvisorLang } from "./lang";
import { COVERAGE_COPY } from "./coverage-copy";
type Actions = Pick<ReturnType<typeof createCoverageActionController>, "acknowledge" | "save" | "recover" | "check" | "dismiss">;

/* The reviewed coverage draft (Direction B, Nov 18, 2026): a white card under the checks with the glyph, the exact
 * assignments as rows, one acknowledgement and the save. Saving writes drafts only; the words say so. QA S-09 (Nov 22,
 * 2026): hours in plain words, each shift with its length, and for today only the time still ahead, as in the plans. */
export function CoverageActionPanel({ view, actions }: { view: CoverageActionView; actions: Actions }) {
  const lang = useAdvisorLang();
  const t = COVERAGE_COPY[lang], d = t.draft;
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (view.stage !== "idle" && view.stage !== "paused" && view.stage !== "busy") {
      heading.current?.scrollIntoView({ block: "center" }); heading.current?.focus({ preventScroll: true });
    }
  }, [view.stage, view.result]);
  if (view.stage === "idle") return null;
  const r = view.result?.review, receipt = view.result?.receipt, progress = view.result?.progress;
  const busy = view.stage === "busy", review = view.stage === "review";
  const ahead = r && firstOpenMinute(r.date, r.preparedAt, r.timeZone) > 0 ? t.forRestOfToday : "";
  const format = (stamp: string, zone: string) => new Date(stamp).toLocaleString(t.locale, { timeZone: zone, month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  return <section className="c-card oa-draft" aria-label={d.label} aria-busy={busy}>
    <div className="oa-draft__head">
      {receipt ? <BDoneMark /> : <BIcon tone="teal"><ClockIcon weight="bold" /></BIcon>}
      <div className="oa-draft__titles"><p className="oa-draft__eyebrow">{d.eyebrow}</p><h2 className="oa-draft__t" ref={heading} tabIndex={-1}>{receipt ? d.saved : r ? t.reviewDraftChanges : view.stage === "uncertain" ? d.checkRequest : d.title}</h2></div>
    </div>
    <div className="oa-draft__body">
      {view.message && <p className="oa-para" role="status">{view.messageCode ? t.messages[view.messageCode] : view.message}</p>}
      {busy && <p className="oa-para oa-wait" role="status"><BSpin small />{d.checking}</p>}
      {r && <>
        <p className="oa-facts"><BSegs parts={[dayText(r.date, lang), t.zone(r.timeZone)]} /></p>
        <ul className="oa-people oa-people--rows">{r.assignments.map((a, i) => <li key={i}>
          <span className="oa-people__who"><strong>{a.employeeName}</strong><span className="oa-people__when">{shiftRange(a.startTime, a.endTime, lang)} · {shiftLength(a.startTime, a.endTime)}</span></span>
          <span className="oa-facts"><BSegs parts={[a.locationName, a.positionName ?? t.teamMember, a.isDesignatedLead ? d.shiftLead : null]} /></span>
        </li>)}</ul>
        {review && <>
          <p className="oa-para">{d.addedAsDrafts(r.assignments.length)}</p>
          <p className="oa-para">{d.wouldCover(r.assignments.length, hoursText(r.coverage.coveredMinutes), hoursText(r.coverage.requiredMinutes), ahead)} {t.slots(r.coverage.remainingBlocks, true)}</p>
          <p className="oa-para oa-para--quiet">{d.expires(format(r.expiresAt, r.timeZone))}</p>
          {r.partial && <BCallout tone="amber">{d.partial}</BCallout>}
          <label className="oa-consent"><input type="checkbox" checked={view.acknowledged} onChange={e => actions.acknowledge(e.target.checked)} disabled={busy}/><span>{d.consent}</span></label>
          <div className="oa-acts oa-acts--end">
            <CorpButton kind="primary" size="md" onClick={() => void actions.save()} disabled={!view.acknowledged || busy}>{d.save(r.assignments.length)}</CorpButton>
            <CorpButton kind="secondary" size="md" className="b-rowact b-rowact--quiet" onClick={actions.dismiss}>{d.back}</CorpButton>
          </div>
        </>}
        {receipt && <>
          <p className="oa-para">{d.savedLine(receipt.count, format(receipt.savedAt, r.timeZone))}</p>
          {progress && <BCallout role="status" tone={progress.state === "current" ? "teal" : "amber"} heading="h3"
            title={progress.state === "unavailable" ? d.progressUnavailable : progress.state === "changed" ? d.progressChanged : d.progressCurrent}>
            {progress.state === "unavailable" ? <p>{d.unavailableLine}</p> : <>
              <p>{d.present(progress.assignmentsPresent, progress.publishedAssignments, progress.assignmentsTotal)}</p>
              <p>{d.coveredOn(dayText(r.date, lang), hoursText(progress.coverage!.coveredMinutes), hoursText(progress.coverage!.requiredMinutes))} {t.slots(progress.coverage!.remainingBlocks, false)}</p>
              {!progress.scopeComplete && <p>{d.scopeIncomplete}</p>}
            </>}
            <p className="oa-quiet">{t.checkedAt} {format(progress.observedAt, progress.timeZone)} · {t.zone(progress.timeZone)}</p>
          </BCallout>}
          <p className="oa-para oa-para--quiet">{d.notConfirmed}</p>
          <div className="oa-acts">
            <CorpButton kind="secondary" size="md" className="b-rowact b-rowact--go" onClick={() => void actions.check()} disabled={busy}>{d.checkProgress}</CorpButton>
            <CorpButtonLink native href={`/app/schedule?week=${weekStartFor(r.date)}`} kind="secondary" size="md" className="b-rowact b-rowact--quiet">{d.openSchedule}</CorpButtonLink>
          </div>
          <details className="oa-fold oa-fold--inline"><summary>{d.receipt}</summary><div className="oa-fold__body"><p className="oa-para oa-para--quiet oa-digest">{d.operation(receipt.operationId)}</p></div></details>
        </>}
      </>}
      {view.stage === "uncertain" && <div className="oa-acts"><CorpButton kind="secondary" size="md" className="b-rowact b-rowact--go" onClick={() => void actions.recover()}>{d.checkOriginal}</CorpButton></div>}
      {view.stage === "blocked" && <div className="oa-acts"><CorpButton kind="secondary" size="md" className="b-rowact b-rowact--go" onClick={actions.dismiss}>{d.back}</CorpButton></div>}
    </div>
  </section>;
}
