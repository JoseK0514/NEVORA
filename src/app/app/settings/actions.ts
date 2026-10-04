"use server";
import { revalidatePath } from "next/cache";
import { requireRoles } from "@/lib/auth/permissions";
import { getWorkspace, saveWorkspaceProfile } from "@/lib/data/workspaces";
import { createLocation, updateLocation } from "@/lib/data/locations";
import { createPosition, updatePosition } from "@/lib/data/positions";
import type { ConfigurationResult } from "@/components/configuration-form";
const value = (data: FormData, key: string) =>
  String(data.get(key) ?? "").trim();
function failure(error: unknown): ConfigurationResult {
  const message = error instanceof Error ? error.message : "";
  const safe =
    /^(?:Location name|Short name|Position name|Clocker key|Workspace name|A valid|Time zone|Changing the business timezone|Choose|Only an active|Workspace configuration|Position not found|Location not found)/;
  return {
    error: safe.test(message)
      ? message
      : "Changes could not be saved. Check the name and key for duplicates, then try again.",
  };
}
export async function saveWorkspaceProfileAction(
  data: FormData,
): Promise<ConfigurationResult> {
  const actor = await requireRoles(["OWNER"]);
  try {
    const workspace = await getWorkspace();
    await saveWorkspaceProfile({
      name: value(data, "name"),
      timeZone: data.has("timeZone")
        ? value(data, "timeZone")
        : workspace.timeZone,
      actorEmployeeId: actor.id,
    });
    revalidatePath("/app", "layout");
    return { success: "Workspace updated." };
  } catch (error) {
    return failure(error);
  }
}
export async function createLocationAction(
  data: FormData,
): Promise<ConfigurationResult> {
  const actor = await requireRoles(["OWNER"]);
  try {
    await createLocation({
      name: value(data, "name"),
      shortName: value(data, "shortName"),
      clockerKey: value(data, "clockerKey") || undefined,
      actorEmployeeId: actor.id,
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
export async function updateLocationAction(
  data: FormData,
): Promise<ConfigurationResult> {
  const actor = await requireRoles(["OWNER"]);
  try {
    await updateLocation({
      id: value(data, "id"),
      name: value(data, "name"),
      shortName: value(data, "shortName"),
      active: data.get("active") === "on",
      actorEmployeeId: actor.id,
    });
    revalidatePath("/app", "layout");
    return { success: "Location updated. Its Clocker link is unchanged." };
  } catch (error) {
    return failure(error);
  }
}
export async function createPositionAction(
  data: FormData,
): Promise<ConfigurationResult> {
  const actor = await requireRoles(["OWNER"]);
  try {
    await createPosition({
      name: value(data, "name"),
      actorEmployeeId: actor.id,
    });
    revalidatePath("/app/settings/positions");
    return { success: "Position added." };
  } catch (error) {
    return failure(error);
  }
}
export async function updatePositionAction(
  data: FormData,
): Promise<ConfigurationResult> {
  const actor = await requireRoles(["OWNER"]);
  try {
    await updatePosition({
      id: value(data, "id"),
      name: value(data, "name"),
      active: data.get("active") === "on",
      actorEmployeeId: actor.id,
    });
    revalidatePath("/app", "layout");
    return {
      success:
        "Position updated. Existing memberships and history are retained.",
    };
  } catch (error) {
    return failure(error);
  }
}
