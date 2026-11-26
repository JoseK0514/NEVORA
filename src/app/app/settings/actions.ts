"use server";
import { revalidatePath } from "next/cache";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { requireRoles } from "@/lib/auth/permissions";
import { getWorkspace, saveWorkspaceProfile } from "@/lib/data/workspaces";
import { createLocation, updateLocation, LocationConcurrencyError } from "@/lib/data/locations";
import { LOCATION_RETIREMENT_BLOCKED, LocationRetirementBlockedError, type LocationRetirementBlocker } from "@/lib/data/location-retirement";
import { createPosition, updatePosition, PositionConcurrencyError } from "@/lib/data/positions";
import type { ConfigurationResult } from "@/components/configuration-form";
import { readPageLang } from "@/lib/i18n/page-lang.server";
import { serverMessage } from "@/lib/i18n/server-messages";
import { SETTINGS_ACTIONS_COPY } from "./actions-copy";
const value = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();
const addressField = (data: FormData) => {
  const address = data.get("address");
  if (address === null) return undefined;
  if (typeof address !== "string") throw new Error("Location address must be text.");
  return address;
};
/** Exposes known configuration/concurrency messages without leaking arbitrary database errors. */
async function failure(error: unknown): Promise<ConfigurationResult> {
  const lang = await readPageLang();
  if (error instanceof LocationConcurrencyError || error instanceof PositionConcurrencyError) return { error: serverMessage(lang, error.message) };
  const message = error instanceof Error ? error.message : "";
  const safe =
    /^(?:Location name|Location address|Short name|Position name|Clocker key|Workspace name|Enter your business name|A valid|Time zone|Changing the business timezone|Choose|Only an active|Workspace configuration|Position not found|Location not found)/;
  return {
    error: safe.test(message)
      ? serverMessage(lang, message)
      : SETTINGS_ACTIONS_COPY[lang].saveFailed,
  };
}
/** Owner-only profile edit; omitted timezone preserves the currently configured business timezone. */
export async function saveWorkspaceProfileAction(
  data: FormData,
): Promise<ConfigurationResult> {
  const actor = await requireRoles(["OWNER"]);
  const proof = await requireSessionMutationProof();
  try {
    const workspace = await getWorkspace();
    await saveWorkspaceProfile({
      name: value(data, "name"),
      timeZone: data.has("timeZone")
        ? value(data, "timeZone")
        : workspace.timeZone,
      actorEmployeeId: actor.id,
      proof,
    });
    revalidatePath("/app", "layout");
    return { success: SETTINGS_ACTIONS_COPY[await readPageLang()].profileSaved };
  } catch (error) {
    return await failure(error);
  }
}
/** Creates location identity; staffing and coverage rules require their own later configuration. */
export async function createLocationAction(
  data: FormData,
): Promise<ConfigurationResult> {
  const actor = await requireRoles(["OWNER"]);
  const proof = await requireSessionMutationProof();
  try {
    await createLocation({
      name: value(data, "name"),
      shortName: value(data, "shortName"),
      address: addressField(data),
      clockerKey: value(data, "clockerKey") || undefined,
      actorEmployeeId: actor.id,
      proof,
    });
    revalidatePath("/app/settings/locations");
    return { success: SETTINGS_ACTIONS_COPY[await readPageLang()].locationAdded };
  } catch (error) {
    return await failure(error);
  }
}
export type UpdateLocationResult = ConfigurationResult & { locationRetirementBlockers?: LocationRetirementBlocker[] };

/** Uses the rendered update version to reject stale edits; location Clocker identity is retained. */
export async function updateLocationAction(
  data: FormData,
): Promise<UpdateLocationResult> {
  const actor = await requireRoles(["OWNER"]);
  const proof = await requireSessionMutationProof();
  try {
    const location = await updateLocation({
      id: value(data, "id"),
      name: value(data, "name"),
      shortName: value(data, "shortName"),
      address: addressField(data),
      active: data.get("active") === "on",
      expectedUpdatedAt: value(data, "expectedUpdatedAt"),
      actorEmployeeId: actor.id,
      proof,
    });
    revalidatePath("/app", "layout");
    return { success: SETTINGS_ACTIONS_COPY[await readPageLang()].locationUpdated, updatedAt: location.updatedAt };
  } catch (error) {
    if (error instanceof LocationRetirementBlockedError) {
      return { error: error.message, issueCode: LOCATION_RETIREMENT_BLOCKED, locationRetirementBlockers: error.blockers };
    }
    return await failure(error);
  }
}
/** Creates an operational qualification, which is independent of application access roles. */
export async function createPositionAction(
  data: FormData,
): Promise<ConfigurationResult> {
  const actor = await requireRoles(["OWNER"]);
  const proof = await requireSessionMutationProof();
  try {
    await createPosition({
      name: value(data, "name"),
      actorEmployeeId: actor.id,
      proof,
    });
    revalidatePath("/app/settings/positions");
    return { success: SETTINGS_ACTIONS_COPY[await readPageLang()].positionAdded };
  } catch (error) {
    return await failure(error);
  }
}
/** Version-checked position edit; deactivation retains memberships and historical references. */
export async function updatePositionAction(
  data: FormData,
): Promise<ConfigurationResult> {
  const actor = await requireRoles(["OWNER"]);
  const proof = await requireSessionMutationProof();
  try {
    const position = await updatePosition({
      id: value(data, "id"),
      name: value(data, "name"),
      active: data.get("active") === "on",
      expectedUpdatedAt: value(data, "expectedUpdatedAt"),
      actorEmployeeId: actor.id,
      proof,
    });
    revalidatePath("/app", "layout");
    return {
      updatedAt: position.updatedAt,
      success: SETTINGS_ACTIONS_COPY[await readPageLang()].positionUpdated,
    };
  } catch (error) {
    return await failure(error);
  }
}
