"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { currentDateInPuertoRico } from "@/lib/date-utils";
import {
  approveCalloutAndOpenCoverage,
  cancelPendingCallout,
  createCallout,
  denyCallout,
  getCallout,
  type CalloutReasonCode,
} from "@/lib/data/callouts";
import { getPublishedShift } from "@/lib/data/exchanges";
import { clearWeekAcknowledgements } from "@/lib/data/acknowledgements";

const REASONS: CalloutReasonCode[] = [
  "ILLNESS",
  "FAMILY_EMERGENCY",
  "TRANSPORTATION",
  "SCHOOL",
  "PERSONAL_EMERGENCY",
  "OTHER",
];

export async function submitCalloutAction(formData: FormData) {
  const session = await requireSession();
  const shiftId = String(formData.get("shiftId") ?? "");
  const reasonCode = String(formData.get("reasonCode") ?? "") as CalloutReasonCode;
  const reasonNote = String(formData.get("reasonNote") ?? "").trim();

  if (!shiftId || !REASONS.includes(reasonCode)) {
    redirect(
      `/app/exchange/callout?shiftId=${encodeURIComponent(
        shiftId,
      )}&error=invalid`,
    );
  }

  if (reasonCode === "OTHER" && reasonNote.length < 3) {
    redirect(
      `/app/exchange/callout?shiftId=${encodeURIComponent(
        shiftId,
      )}&error=details`,
    );
  }

  const shift = await getPublishedShift(shiftId);

  if (
    !shift ||
    shift.employeeId !== session.id ||
    shift.date < currentDateInPuertoRico()
  ) {
    redirect("/app/exchange?tab=my&error=INVALID_SHIFT");
  }

  try {
    const created = await createCallout({
      shiftId,
      employeeId: session.id,
      reasonCode,
      reasonNote: reasonNote || undefined,
    });

    if (!created) {
      redirect("/app/exchange?tab=my&error=INVALID_SHIFT");
    }
  } catch {
    redirect("/app/exchange?tab=my&error=CALLOUT_EXISTS");
  }

  if (decision === "APPROVED") {
    await clearWeekAcknowledgements(callout.weekStart);
  }

  revalidatePath("/app/exchange");
  revalidatePath("/app/schedule");
  redirect("/app/exchange?tab=requests&calloutSubmitted=1");
}

export async function reviewCalloutAction(formData: FormData) {
  const session = await requireRoles(MANAGER_ROLES);
  const calloutId = String(formData.get("calloutId") ?? "");
  const decision = String(formData.get("decision") ?? "");

  if (!calloutId || !["APPROVED", "DENIED"].includes(decision)) {
    redirect("/app/exchange?tab=requests&error=INVALID_DECISION");
  }

  const callout = await getCallout(calloutId);

  if (!callout) {
    redirect("/app/exchange?tab=requests&error=EXCHANGE_UNAVAILABLE");
  }

  const updated =
    decision === "APPROVED"
      ? await approveCalloutAndOpenCoverage({
          calloutId,
          managerId: session.id,
        })
      : await denyCallout({
          calloutId,
          managerId: session.id,
        });

  if (!updated) {
    redirect("/app/exchange?tab=requests&error=EXCHANGE_CHANGED");
  }

  revalidatePath("/app/exchange");
  revalidatePath("/app/schedule");
  redirect(
    decision === "APPROVED"
      ? "/app/exchange?tab=requests&calloutApproved=1"
      : "/app/exchange?tab=requests&calloutDenied=1",
  );
}

export async function cancelCalloutAction(formData: FormData) {
  const session = await requireSession();
  const calloutId = String(formData.get("calloutId") ?? "");

  const cancelled = await cancelPendingCallout({
    calloutId,
    employeeId: session.id,
  });

  if (!cancelled) {
    redirect("/app/exchange?tab=requests&error=EXCHANGE_UNAVAILABLE");
  }

  revalidatePath("/app/exchange");
  revalidatePath("/app/schedule");
  redirect("/app/exchange?tab=requests&calloutCancelled=1");
}
