import { notFound } from "next/navigation";
import { EditLocationForm } from "@/components/edit-location-form";
import { requireRoles } from "@/lib/auth/permissions";
import { listLocations } from "@/lib/data/locations";
import { updateLocationAction } from "../../actions";
import { SettingsFrame } from "../../wave-c-kit";
import { currentPresentation } from "@/lib/workspace-presentation/current.server";
import { wordPreset } from "@/lib/workspace-presentation/words";
import { listLocationStaffingSettings } from "@/lib/data/schedule-health";
import { listEmployees } from "@/lib/data/employees";

export default async function EditLocationPage({
  params,
}: {
  params: Promise<{ locationId: string }>;
}) {
  await requireRoles(["OWNER"]);
  const { locationId } = await params;
  const location = (await listLocations({ includeInactive: true })).find(
    (l) => l.id === locationId,
  );
  if (!location) notFound();
  const words = wordPreset((await currentPresentation()).words).en;
  // Quiet (v4): the staffing and eligibility rows read what Scheduling rules and Team already hold; a failed read leaves them blank.
  const [staffing, employees] = await Promise.all([listLocationStaffingSettings().catch(() => []), listEmployees().catch(() => null)]);
  const minimum = staffing.find(setting => setting.locationId === location.id)?.minimumStaffPerShift ?? null;
  const eligible = employees ? employees.filter(employee => employee.active && employee.eligibleLocationIds.includes(location.id)).length : undefined;
  return (
    <SettingsFrame back={{ href: "/app/settings/locations", label: words.locations }} title={location.shortName} save={{ form: "edit-location-form" }}>
      <EditLocationForm key={`${location.id}:${location.updatedAt ?? ""}`} location={location} action={updateLocationAction} words={{ location: words.location, locations: words.locations }}
        staffing={minimum === null ? undefined : `${minimum} per shift`} eligible={eligible} />
    </SettingsFrame>
  );
}
