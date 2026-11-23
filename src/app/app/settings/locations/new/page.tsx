import { NewLocationForm } from "@/components/new-location-form";
import { requireRoles } from "@/lib/auth/permissions";
import { currentPresentation } from "@/lib/workspace-presentation/current.server";
import { lower, wordPreset } from "@/lib/workspace-presentation/words";
import { createLocationAction } from "../../actions";
import { SettingsPageB } from "../../settings-b";

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export const metadata = { title: "New location" };

export default async function NewLocationPage() {
  await requireRoles(["OWNER"]);
  const words = wordPreset((await currentPresentation()).words).en;
  const place = lower(words.location);
  return (
    // Phase 2 (Nov 23, 2026): Settings' Direction B frame. Phones go back to Locations from the band and add from its
    // right (hidden once the place is added); tablets and desktop have Cancel and Add in the form card's footer.
    <SettingsPageB title={`New ${place}`} titleId="new-location-title" back={{ href: "/app/settings/locations", label: words.locations }}
      phoneRight={<button type="submit" form="new-location-form" className="c-setb-save">Add</button>}>
      <NewLocationForm action={createLocationAction} words={{ location: words.location, locations: words.locations }} />
    </SettingsPageB>
  );
}
