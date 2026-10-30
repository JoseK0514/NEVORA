"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { isValidWeekStart } from "@/lib/date-utils";
import { getSchedulePublishReadiness } from "@/lib/data/schedule-publication-review";
import { publishScheduleWithRevision } from "@/lib/data/publication-revisions";
import { assertOperationalAccess, assertOriginalOperationalAccess, isOperationalAuthorizationError } from "@/lib/company-access/operational-scope.server";
import { isManagementAuthorizationError } from "@/lib/data/management-session";

const denied = (error: unknown) => isOperationalAuthorizationError(error) || isManagementAuthorizationError(error);
const back = (weekStart: string, suffix = "") => `/app/schedule/publish?week=${encodeURIComponent(weekStart)}${suffix}`;

/**
 * Build and publish (Release 1, board O-BuildPublish): "Publish N drafts" publishes each chosen draft location of the
 * week through the same revision writer as one location's Publish. Readiness warnings are reviewed first (the page
 * lists them per location; "Publish anyway" confirms). Company access is checked before and re-checked after every
 * write, exactly as publishScheduleAction does; each location commits on its own.
 */
export async function publishDraftsAction(formData: FormData) {
  const session = await requireRoles(MANAGER_ROLES);
  const proof = await requireSessionMutationProof();
  const weekStart = String(formData.get("weekStart") ?? "");
  const locationIds = [...new Set(formData.getAll("locationId").map(String).filter(Boolean))];
  const confirmWarnings = formData.get("confirmWarnings") === "yes";
  let admission: Awaited<ReturnType<typeof assertOperationalAccess>>;
  try { admission = await assertOperationalAccess(proof, { kind: "COMPANY" }); } catch (error) { if (denied(error)) redirect("/app/schedule?error=ACCESS_DENIED"); throw error; }
  const stillAdmitted = async () => { try { await assertOriginalOperationalAccess(proof, admission); return true; } catch (error) { if (denied(error)) return false; throw error; } };
  if (!isValidWeekStart(weekStart) || !locationIds.length) redirect("/app/schedule?error=INVALID_PUBLISH");

  if (!confirmWarnings) {
    const readiness = await Promise.all(locationIds.map(locationId => getSchedulePublishReadiness(weekStart, locationId)));
    if (!await stillAdmitted()) redirect("/app/schedule?error=ACCESS_DENIED");
    if (readiness.some(item => item.hasWarnings)) redirect(back(weekStart, "&review=1#publish-review"));
  }

  let published = 0;
  for (const locationId of locationIds) {
    try { if ((await publishScheduleWithRevision({ locationId, weekStart, managerId: session.id, proof })).published) published++; }
    catch (error) { if (denied(error)) redirect("/app/schedule?error=ACCESS_DENIED"); throw error; }
    if (!await stillAdmitted()) redirect("/app/schedule?error=ACCESS_DENIED");
  }
  revalidatePath("/app/schedule");
  redirect(`/app/schedule?week=${encodeURIComponent(weekStart)}${published ? `&published=${locationIds.length === 1 ? encodeURIComponent(locationIds[0]) : "all"}` : "&error=NO_SCHEDULE"}`);
}
