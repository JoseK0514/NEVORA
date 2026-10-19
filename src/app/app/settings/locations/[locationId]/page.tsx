import { notFound } from "next/navigation";
import { EditLocationForm } from "@/components/edit-location-form";
import { requireRoles } from "@/lib/auth/permissions";
import { listLocations } from "@/lib/data/locations";
import { updateLocationAction } from "../../actions";
import { SettingsFrame } from "../../wave-c-kit";

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
  return (
    <SettingsFrame back={{ href: "/app/settings/locations", label: "Locations" }} eyebrow="Edit location" title={location.name}
      summary="Names and status your team sees, and this location’s Clocker link.">
      <EditLocationForm key={`${location.id}:${location.updatedAt ?? ""}`} location={location} action={updateLocationAction} />
    </SettingsFrame>
  );
}
