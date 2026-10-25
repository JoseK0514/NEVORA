"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { requireSelfService } from "@/lib/auth/permissions";
import { isValidWeekStart } from "@/lib/date-utils";
import { acknowledgeScheduleWeek } from "@/lib/data/acknowledgements";

/**
 * Confirms the exact revision shown to an employee, not merely a week label.
 * Forward the original revision, operation ID and authority binding unchanged;
 * only a committed receipt triggers page revalidation. Other outcomes remain
 * structured so the client can reconcile rather than invent a confirmation.
 */
export async function acknowledgeScheduleAction(formData: FormData) {
  await requireSelfService("/app/schedule");
  const weekStart = String(formData.get("weekStart") ?? "");

  if (
    !isValidWeekStart(weekStart)
  ) {
    redirect("/app/schedule?error=INVALID_SHIFT");
  }

  const acknowledged = await acknowledgeScheduleWeek({
    weekStart,
    proof: await requireSessionMutationProof(),
    expectedRevisionId: String(formData.get("expectedRevisionId") ?? ""),
    operationId: String(formData.get("operationId") ?? ""),
    authority: String(formData.get("authority") ?? ""),
  });

  if (acknowledged.status !== "committed") return acknowledged;

  revalidatePath("/app");
  revalidatePath("/app/schedule");
  return acknowledged;
}
