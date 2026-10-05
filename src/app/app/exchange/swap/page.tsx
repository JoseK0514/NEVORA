import {randomUUID} from 'node:crypto';
import {readShiftChangeAvailability} from '@/lib/data/shift-changes';
import {matchesDisplayedShift} from '../../../../lib/shift-changes/displayed-terms';
import { getWorkspace } from "@/lib/data/workspaces";
import { businessDate } from "@/lib/business-time";
import Link from "next/link";
import { NavIcon } from "@/components/nav-icon";
import { redirect } from "next/navigation";
import {ReviewedSwapForm} from "@/components/reviewed-swap-form";
import {ShiftSlot} from "@/components/shift-slot";
import {requireSessionMutationProof} from "@/lib/auth/session";
import {readShiftChangeTerms} from "@/lib/data/shift-change-snapshot";

import { requireSelfService } from "@/lib/auth/permissions";
import {  formatDayLabel, formatTime } from "@/lib/date-utils";
import {
  getPublishedShift,
  listSwapTargets,
} from "@/lib/data/exchanges";


export default async function SwapPage({
  searchParams,
}: {
  searchParams: Promise<{ sourceShiftId?: string }>;
}) {
  const session = await requireSelfService("/app/exchange?tab=requests");
  const workspace = await getWorkspace();
  const params = await searchParams;

  if (!params.sourceShiftId) {
    redirect("/app/exchange?error=INVALID_SHIFT");
  }

  const source = await getPublishedShift(params.sourceShiftId);

  if (
    !source ||
    source.employeeId !== session.id ||
    source.date < businessDate(new Date(), workspace.timeZone)
  ) {
    redirect("/app/exchange?error=INVALID_SHIFT");
  }

  const targets = await listSwapTargets(source, session.id);
  const proof=await requireSessionMutationProof();
  const reviewed=await readShiftChangeTerms(proof,source.id);if(!reviewed||!matchesDisplayedShift(source,reviewed.source))redirect('/app/exchange?error=EXCHANGE_CHANGED');
  const reviewedSource=source;
  const reviewedTargets=(await Promise.all(targets.map(async shift=>{const terms=await readShiftChangeTerms(proof,source.id,shift.id);if(!terms?.target||!terms.targetTermsFingerprint||terms.sourceTermsFingerprint!==reviewed.sourceTermsFingerprint||!matchesDisplayedShift(source,terms.source)||!matchesDisplayedShift(shift,terms.target))return null;const allowed=await readShiftChangeAvailability(proof,{kind:'PROPOSE_SWAP',operationId:randomUUID(),sourceShiftId:terms.source.shiftId,sourceEpisodeId:terms.source.assignmentEpisodeId,sourceTermsFingerprint:terms.sourceTermsFingerprint,targetShiftId:terms.target.shiftId,targetEpisodeId:terms.target.assignmentEpisodeId,targetTermsFingerprint:terms.targetTermsFingerprint});if(!allowed.allowed)return null;return {shift,fields:{targetShiftId:terms.target.shiftId,targetEpisodeId:terms.target.assignmentEpisodeId,targetTermsFingerprint:terms.targetTermsFingerprint}};}))).filter(t=>t!==null);
  const date = formatDayLabel(reviewedSource.date);

  return (
    <div className="employee-view employee-exchange-detail-view">
      <header className="employee-view-heading"><div><p className="employee-view-eyebrow">Shift trade</p><h1>Choose a shift</h1><p className="employee-view-description">Both employees must consent. Valid trades complete automatically when policy permits; exceptions wait for management.</p></div></header>

      <section className="content-grid two swap-builder">
        <article className="panel">
          <p className="eyebrow">Your shift</p>
          <h2>{date.weekday} · {date.day}</h2>
          <p className="large-detail">
            {formatTime(source.startTime)} – {formatTime(source.endTime)}
          </p>
          <ShiftSlot shift={reviewedSource} contextOnly/>
        </article>

        <article className="panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Trade for</p>
              <h2>Available shifts this week</h2>
            </div>
          </div>

          {reviewedTargets.length ? (
            <ReviewedSwapForm source={reviewedSource} sourceFields={{sourceShiftId:reviewed.source.shiftId,sourceEpisodeId:reviewed.source.assignmentEpisodeId,sourceTermsFingerprint:reviewed.sourceTermsFingerprint}} targets={reviewedTargets}/>
          ) : (
            <div className="empty-state">
              <span className="employee-empty-icon"><NavIcon name="exchange" employee size={16} /></span>
              <strong>No shifts to trade</strong>
              <span>No other published shifts are available this week; you can still offer your shift for coverage.</span>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
