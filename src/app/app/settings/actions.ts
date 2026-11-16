"use server";
import { revalidatePath } from "next/cache";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { requireRoles } from "@/lib/auth/permissions";
import { getWorkspace, saveWorkspaceProfile } from "@/lib/data/workspaces";
import { createLocation, updateLocation, LocationConcurrencyError } from "@/lib/data/locations";
import { createPosition, updatePosition, PositionConcurrencyError } from "@/lib/data/positions";
import type { ConfigurationResult } from "@/components/configuration-form";
const value = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();
/** Exposes known configuration/concurrency messages without leaking arbitrary database errors. */
function failure(error: unknown): ConfigurationResult {
  if (error instanceof LocationConcurrencyError || error instanceof PositionConcurrencyError) return { error: error.message };
  const message = error instanceof Error ? error.message : "";
  const safe =
    /^(?:Location name|Short name|Position name|Clocker key|Workspace name|Enter your business name|A valid|Time zone|Changing the business timezone|Choose|Only an active|Workspace configuration|Position not found|Location not found)/;
  return {
    error: safe.test(message)
      ? message
      : "Changes could not be saved. Check the name and key for duplicates, then try again.",
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
    return { success: "Company profile saved." };
  } catch (error) {
    return failure(error);
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
      clockerKey: value(data, "clockerKey") || undefined,
      actorEmployeeId: actor.id,
      proof,
    });
    revalidatePath("/app/settings/locations");
    return {
      success:
        "Location added. Open Locations, then Scheduling Rules to finish setup.",
    };
  } catch (error) {
    return failure(error);
  }
}
/** Uses the rendered update version to reject stale edits; location Clocker identity is retained. */
export async function updateLocationAction(
  data: FormData,
): Promise<ConfigurationResult> {
  const actor = await requireRoles(["OWNER"]);
  const proof = await requireSessionMutationProof();
  try {
    const location = await updateLocation({
      id: value(data, "id"),
      name: value(data, "name"),
      shortName: value(data, "shortName"),
      active: data.get("active") === "on",
      expectedUpdatedAt: value(data, "expectedUpdatedAt"),
      actorEmployeeId: actor.id,
      proof,
    });
    revalidatePath("/app", "layout");
    return { success: "Location updated. Its Clocker link is unchanged.", updatedAt: location.updatedAt };
  } catch (error) {
    return failure(error);
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
    return { success: "Position added." };
  } catch (error) {
    return failure(error);
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
      success:
        "Position updated. Existing memberships and history are retained.",
    };
  } catch (error) {
    return failure(error);
  }
}
