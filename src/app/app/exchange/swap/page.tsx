import {randomUUID} from 'node:crypto';
import { moduleGate } from "@/lib/workspace-presentation/current.server";
import {readShiftChangeAvailability} from '@/lib/data/shift-changes';
import {matchesDisplayedShift} from '../../../../lib/shift-changes/displayed-terms';
import { getWorkspace } from "@/lib/data/workspaces";
import { businessDate } from "@/lib/business-time";
import { redirect } from "next/navigation";
import { SwapPageContent } from '@/components/swap-page-content';
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
  searchParams: Promise<{ sourceShiftId?: string; mode?: string }>;
}) {
  const moduleOff = await moduleGate("marketplace");
  if (moduleOff) return moduleOff;

  const session = await requireSelfService("/app/exchange?tab=requests");
  const workspace = await getWorkspace();
  const params = await searchParams;

  // Opened without choosing a shift (a bare link): back to Shift requests quietly. Only a chosen shift that is
  // missing, someone else's or past is an error.
  if (!params.sourceShiftId) {
    redirect("/app/exchange");
  }

  const source = await getPublishedShift(params.sourceShiftId);

  if (
    !source ||
    source.employeeId !== session.id ||
    source.date < businessDate(new Date(), workspace.timeZone)
  ) {
    redirect("/app/exchange?error=INVALID_SHIFT");
  }

  // Offer it for cover (v5 shift sheet): only the coverage check is needed, no swap candidates.
  const cover = params.mode === 'cover';
  const targets = cover ? [] : await listSwapTargets(source, session.id);
  const proof=await requireSessionMutationProof();
  const reviewed=await readShiftChangeTerms(proof,source.id);if(!reviewed||!matchesDisplayedShift(source,reviewed.source))redirect('/app/exchange?error=EXCHANGE_CHANGED');
  const reviewedSource=source;
  // Each candidate resolves to its reviewed fields, null (refused by the rules) or 'changed' (its terms moved mid-read).
  const reads=await Promise.all(targets.map(async shift=>{const terms=await readShiftChangeTerms(proof,source.id,shift.id);if(!terms?.target||!terms.targetTermsFingerprint||terms.sourceTermsFingerprint!==reviewed.sourceTermsFingerprint||!matchesDisplayedShift(source,terms.source)||!matchesDisplayedShift(shift,terms.target))return 'changed' as const;const allowed=await readShiftChangeAvailability(proof,{kind:'PROPOSE_SWAP',operationId:randomUUID(),sourceShiftId:terms.source.shiftId,sourceEpisodeId:terms.source.assignmentEpisodeId,sourceTermsFingerprint:terms.sourceTermsFingerprint,targetShiftId:terms.target.shiftId,targetEpisodeId:terms.target.assignmentEpisodeId,targetTermsFingerprint:terms.targetTermsFingerprint});if(!allowed.allowed)return null;return {shift,fields:{targetShiftId:terms.target.shiftId,targetEpisodeId:terms.target.assignmentEpisodeId,targetTermsFingerprint:terms.targetTermsFingerprint}};}));
  const changedMidRead=reads.includes('changed');
  const reviewedTargets=reads.filter(t=>t!==null&&t!=='changed');

  const sourceFields={sourceShiftId:reviewed.source.shiftId,sourceEpisodeId:reviewed.source.assignmentEpisodeId,sourceTermsFingerprint:reviewed.sourceTermsFingerprint};
  // Offer it for cover: the real coverage offer, checked the same way as on Shift requests. T-25: a swap with no one to
  // trade with no longer turns into this form; it links to it instead, so only cover mode checks it.
  const coverage=!cover||reviewedTargets.length||changedMidRead?null:await readShiftChangeAvailability(proof,{kind:'OFFER_COVERAGE',operationId:randomUUID(),...sourceFields}).catch(()=>({allowed:false,notice:'Current policy is unavailable.'}));
  return <SwapPageContent source={reviewedSource} sourceFields={sourceFields} targets={reviewedTargets} coverage={coverage} mode={cover ? 'cover' : 'swap'} />;
}
