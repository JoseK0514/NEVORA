"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSelfService } from "@/lib/auth/permissions";
import { isValidWeekStart } from "@/lib/date-utils";
import { acknowledgeScheduleWeek } from "@/lib/data/acknowledgements";

export async function acknowledgeScheduleAction(formData: FormData) {
  const session = await requireSelfService("/app/schedule");
  const weekStart = String(formData.get("weekStart") ?? "");

  if (
    !isValidWeekStart(weekStart)
  ) {
    redirect("/app/schedule?error=INVALID_SHIFT");
  }

  const acknowledged = await acknowledgeScheduleWeek({
    weekStart,
    employeeId: session.id,
  });

  if (!acknowledged) {
    redirect(`/app/schedule?week=${weekStart}&error=NO_SCHEDULE`);
  }

  revalidatePath("/app");
  revalidatePath("/app/schedule");
  redirect(`/app/schedule?week=${weekStart}&acknowledged=1`);
}
