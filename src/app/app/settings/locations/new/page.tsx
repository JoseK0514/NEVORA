import { NewLocationForm } from "@/components/new-location-form";
import { requireRoles } from "@/lib/auth/permissions";
import { currentPresentation } from "@/lib/workspace-presentation/current.server";
import { lower, wordPreset } from "@/lib/workspace-presentation/words";
import { createLocationAction } from "../../actions";
import { SettingsFrame } from "../../wave-c-kit";

export default async function NewLocationPage() {
  await requireRoles(["OWNER"]);
  const words = wordPreset((await currentPresentation()).words).en;
  const place = lower(words.location);
  return (
    <SettingsFrame title={`New ${place}`} modal={{ cancelHref: "/app/settings/locations", form: "new-location-form", submitLabel: "Add" }}>
      <NewLocationForm action={createLocationAction} words={{ location: words.location, locations: words.locations }} />
    </SettingsFrame>
  );
}