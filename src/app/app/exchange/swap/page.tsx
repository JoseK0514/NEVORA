import {randomUUID} from 'node:crypto';
import {readShiftChangeAvailability} from '@/lib/data/shift-changes';
import {matchesDisplayedShift} from '../../../../lib/shift-changes/displayed-terms';
import { getWorkspace } from "@/lib/data/workspaces";
import { businessDate } from "@/lib/business-time";
import { redirect } from "next/navigation";
import { SwapPageContent } from '@/components/swap-page-content';
import './swap.css';
import {requireSessionMutationProof} from "@/lib/auth/session";
import {readShiftChangeTerms} from "@/lib/data/shift-change-snapshot";

import { requireSelfService } from "@/lib/auth/permissions";
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

  return <SwapPageContent source={reviewedSource} sourceFields={{sourceShiftId:reviewed.source.shiftId,sourceEpisodeId:reviewed.source.assignmentEpisodeId,sourceTermsFingerprint:reviewed.sourceTermsFingerprint}} targets={reviewedTargets} />;
}
