"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { requireSelfService } from "@/lib/auth/permissions";
import { isValidWeekStart } from "@/lib/date-utils";
import { acknowledgeScheduleWeek } from "@/lib/data/acknowledgements";

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
