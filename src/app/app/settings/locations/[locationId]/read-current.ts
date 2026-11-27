"use server";

import { requireRoles } from "@/lib/auth/permissions";
import { listLocations } from "@/lib/data/locations";

/** Read the same Owner catalog record as the edit page, including a concurrently retired location. */
export async function readEditedLocation(id: string) {
  await requireRoles(["OWNER"]);
  const locations = await listLocations({ includeInactive: true });
  return locations.find(location => location.id === id) ?? null;
}
