import { getWorkspace } from "@/lib/data/workspaces";
import { shiftBoundaryInstants } from "@/lib/business-time";
import { redirect } from "next/navigation";
import { CalloutView } from "@/components/callout-view";
import {requireSessionMutationProof} from "@/lib/auth/session";
import {readShiftChangeTerms} from "@/lib/data/shift-change-snapshot";
import {matchesDisplayedShift} from "@/lib/shift-changes/displayed-terms";
import { requireSelfService } from "@/lib/auth/permissions";
import { getPublishedShift } from "@/lib/data/exchanges";


export default async function CalloutPage({
  searchParams,
}: {
  searchParams: Promise<{ shiftId?: string; error?: string }>;
}) {
  const session = await requireSelfService("/app/exchange?tab=requests");
  const workspace = await getWorkspace();
  const params = await searchParams;

  if (!params.shiftId) {
    redirect("/app/exchange?tab=my&error=INVALID_SHIFT");
  }

  const shift = await getPublishedShift(params.shiftId);

  if (!shift || shift.employeeId !== session.id) {
    redirect("/app/exchange?tab=my&error=INVALID_SHIFT");
  }
  const proof=await requireSessionMutationProof();
  const reviewed=await readShiftChangeTerms(proof,shift.id);
  let ended=false;
  // The coherent authenticated read supplies the server observation; rendering
  // does not sample a second clock or reinterpret the workspace time zone.
  try {ended=!!reviewed&&Date.parse(shiftBoundaryInstants(shift,shift.timeZone??workspace.timeZone).endAt)<=Date.parse(reviewed.observedAt);}
  catch { /* Keep inability reporting available; never guess an invalid instant. */ }
  if(ended)redirect("/app/exchange?tab=my&error=INVALID_SHIFT");

  const fields=reviewed&&matchesDisplayedShift(shift,reviewed.source)?{kind:"SUBMIT_CALLOUT",sourceShiftId:shift.id,sourceEpisodeId:reviewed.source.assignmentEpisodeId,sourceTermsFingerprint:reviewed.sourceTermsFingerprint}:null;
  return <CalloutView shift={shift} fields={fields} error={params.error} />;
}
