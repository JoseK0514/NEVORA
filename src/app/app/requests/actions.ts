"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import {
  createTimeOffRequest,
  reviewTimeOffRequest,
} from "@/lib/data/requests";

export async function requestTimeOffAction(formData: FormData) {
  const session = await requireSession();
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  const partialDay = formData.get("partialDay") === "on";
  const startTime = partialDay ? String(formData.get("startTime") ?? "") : undefined;
  const endTime = partialDay ? String(formData.get("endTime") ?? "") : undefined;
  const reason = String(formData.get("reason") ?? "").trim();

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(endDate) ||
    startDate > endDate ||
    (partialDay && startDate !== endDate) ||
    (partialDay &&
      (!startTime ||
        !endTime ||
        !/^\d{2}:\d{2}$/.test(startTime) ||
        !/^\d{2}:\d{2}$/.test(endTime) ||
        startTime >= endTime))
  ) {
    redirect("/app/requests?error=invalid");
  }

  await createTimeOffRequest({
    employeeId: session.id,
    startDate,
    endDate,
    startTime,
    endTime,
    reason: reason || undefined,
  });

  revalidatePath("/app/requests");
  redirect("/app/requests?submitted=1");
}

export async function reviewTimeOffAction(formData: FormData) {
  const session = await requireRoles(MANAGER_ROLES);
  const requestId = String(formData.get("requestId") ?? "");
  const decision = String(formData.get("decision") ?? "");

  if (!requestId || (decision !== "APPROVED" && decision !== "DENIED")) {
    redirect("/app/requests?error=review");
  }

  await reviewTimeOffRequest({
    requestId,
    managerId: session.id,
    status: decision,
  });

  revalidatePath("/app/requests");
  redirect("/app/requests?reviewed=1");
}
