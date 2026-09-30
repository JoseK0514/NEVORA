"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { replaceAvailability } from "@/lib/data/availability";
import {
  getWeekSettings,
  replaceWeeklyAvailability,
} from "@/lib/data/week-settings";
import { isValidWeekStart } from "@/lib/date-utils";

export async function saveAvailabilityAction(formData: FormData) {
  const session = await requireSession();
  const windows: Array<{ dayOfWeek: number; startTime: string; endTime: string }> = [];

  for (let day = 0; day < 7; day += 1) {
    const available = formData.get(`available-${day}`) === "on";
    if (!available) continue;

    const startTime = String(formData.get(`start-${day}`) ?? "");
    const endTime = String(formData.get(`end-${day}`) ?? "");

    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime) || startTime >= endTime) {
      redirect("/app/availability?error=invalid");
    }

    windows.push({ dayOfWeek: day, startTime, endTime });
  }

  await replaceAvailability(session.id, windows);
  revalidatePath("/app/availability");
  redirect("/app/availability?saved=1");
}


export async function saveWeeklyAvailabilityAction(formData: FormData) {
  const session = await requireSession();
  const weekStart = String(formData.get("weekStart") ?? "");

  if (
    !isValidWeekStart(weekStart)
  ) {
    redirect("/app/availability?error=invalid_week");
  }

  const settings = await getWeekSettings(weekStart);

  if (
    settings?.availabilityDeadline &&
    Date.now() > new Date(settings.availabilityDeadline).getTime()
  ) {
    redirect(
      `/app/availability?week=${encodeURIComponent(weekStart)}&error=locked`,
    );
  }

  const windows: Array<{
    dayOfWeek: number;
    startTime: string;
    endTime: string;
  }> = [];

  for (let day = 0; day < 7; day += 1) {
    const available = formData.get(`available-${day}`) === "on";
    if (!available) continue;

    const startTime = String(formData.get(`start-${day}`) ?? "");
    const endTime = String(formData.get(`end-${day}`) ?? "");

    if (
      !/^\d{2}:\d{2}$/.test(startTime) ||
      !/^\d{2}:\d{2}$/.test(endTime) ||
      startTime >= endTime
    ) {
      redirect(
        `/app/availability?week=${encodeURIComponent(
          weekStart,
        )}&error=invalid`,
      );
    }

    windows.push({ dayOfWeek: day, startTime, endTime });
  }

  await replaceWeeklyAvailability(session.id, weekStart, windows);
  revalidatePath("/app/availability");
  revalidatePath("/app/schedule");
  redirect(
    `/app/availability?week=${encodeURIComponent(weekStart)}&saved=1`,
  );
}
