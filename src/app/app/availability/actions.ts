"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSelfService } from "@/lib/auth/permissions";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { replaceAvailability } from "@/lib/data/availability";
import {
  AvailabilityDeadlineError,
  AvailabilityConcurrencyError,
  getWeekSettings,
  replaceWeeklyAvailability,
} from "@/lib/data/week-settings";
import { businessDateStart, timeMinutes } from "@/lib/scheduling/periods";
import { isValidWeekStart } from "@/lib/date-utils";

/**
 * Replaces the signed-in employee's recurring windows. Day numbers use Sunday=0;
 * an unchecked day contributes no window, and an end entered as 00:00 is stored
 * as 24:00 to distinguish end-of-day from the start of the same day.
 */
export async function saveAvailabilityAction(formData: FormData) {
  const session = await requireSelfService("/app/availability");
  const proof = await requireSessionMutationProof();
  const windows: Array<{ dayOfWeek: number; startTime: string; endTime: string }> = [];

  for (let day = 0; day < 7; day += 1) {
    const available = formData.get(`available-${day}`) === "on";
    if (!available) continue;

    const startTime = String(formData.get(`start-${day}`) ?? "");
    const endInput = String(formData.get(`end-${day}`) ?? "");
    const endTime = endInput === "00:00" ? "24:00" : endInput;

    if (!/^\d{2}:\d{2}$/.test(startTime) || !/^\d{2}:\d{2}$/.test(endTime) || startTime >= endTime) {
      redirect("/app/availability?error=invalid");
    }

    try { timeMinutes(startTime); timeMinutes(endTime, true); } catch { redirect("/app/availability?error=invalid"); }
    windows.push({ dayOfWeek: day, startTime, endTime });
  }

  await replaceAvailability(session.id, windows, proof);
  revalidatePath("/app/availability");
  redirect("/app/availability?saved=1");
}


/**
 * Submits weekly overrides for a Monday-start week. changedDays preserves the
 * distinction between untouched recurring days and explicitly unavailable days.
 * The early deadline read improves feedback; the writer must still reject a
 * deadline or concurrency conflict at commit time.
 */
export async function saveWeeklyAvailabilityAction(formData: FormData) {
  const session = await requireSelfService("/app/availability");
  const proof = await requireSessionMutationProof();
  const weekStart = String(formData.get("weekStart") ?? "");

  try { businessDateStart(weekStart); } catch { redirect("/app/availability?error=invalid_week"); }
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
    const endInput = String(formData.get(`end-${day}`) ?? "");
    const endTime = endInput === "00:00" ? "24:00" : endInput;

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

    try { timeMinutes(startTime); timeMinutes(endTime, true); } catch { redirect("/app/availability?error=invalid"); }
    windows.push({ dayOfWeek: day, startTime, endTime });
  }

  const changedRaw = formData.get("changedDays");
  const changedDays = changedRaw === null ? undefined : String(changedRaw) === "" ? [] : String(changedRaw).split(",").map(Number);
  if (changedDays?.some(day => !Number.isInteger(day) || day < 0 || day > 6)) redirect(`/app/availability?week=${weekStart}&error=invalid`);
  try { await replaceWeeklyAvailability(session.id, weekStart, windows, changedDays, proof); }
  catch (error) { if (error instanceof AvailabilityDeadlineError) redirect(`/app/availability?week=${weekStart}&error=locked`); if (error instanceof AvailabilityConcurrencyError) redirect(`/app/availability?week=${weekStart}&error=concurrent`); throw error; }
  revalidatePath("/app/availability");
  revalidatePath("/app/schedule");
  redirect(
    `/app/availability?week=${encodeURIComponent(weekStart)}&saved=1`,
  );
}
