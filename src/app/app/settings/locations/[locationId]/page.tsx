import { notFound } from "next/navigation";
import { EditLocationForm } from "@/components/edit-location-form";
import { requireRoles } from "@/lib/auth/permissions";
import { listLocations } from "@/lib/data/locations";
import { updateLocationAction } from "../../actions";
import { SettingsFrame } from "../../wave-c-kit";
import { currentPresentation } from "@/lib/workspace-presentation/current.server";
import { lower, wordPreset } from "@/lib/workspace-presentation/words";

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
  return (
    <SettingsFrame back={{ href: "/app/settings/locations", label: words.locations }} eyebrow={`Edit ${lower(words.location)}`} title={location.name}
      summary={`Names and status your team sees, and this ${lower(words.location)}’s Clocker link.`}>
      <EditLocationForm key={`${location.id}:${location.updatedAt ?? ""}`} location={location} action={updateLocationAction} words={{ location: words.location, locations: words.locations }} />
    </SettingsFrame>
  );
}
