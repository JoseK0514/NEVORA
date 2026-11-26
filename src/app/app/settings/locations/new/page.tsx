import { copy } from "./page-copy";
import { formatPortalCopy } from "@/lib/i18n/format-portal-copy";
import { SettingsBackLabel } from "../../settings-back-label";
import { NewLocationForm } from "@/components/new-location-form";
import { requireRoles } from "@/lib/auth/permissions";
import { currentPresentation } from "@/lib/workspace-presentation/current.server";
import { lower, wordPreset } from "@/lib/workspace-presentation/words";
import { createLocationAction } from "../../actions";
import { SettingsPageB } from "../../settings-b";
import { readPageLang } from "@/lib/i18n/page-lang.server";
import { SETTINGS_COPY } from "../../settings-copy";

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export async function generateMetadata() { return { title: SETTINGS_COPY[await readPageLang()].newLocation }; }

export default async function NewLocationPage() {
  await requireRoles(["OWNER"]);
  const lang = await readPageLang(), t = SETTINGS_COPY[lang];
  const words = wordPreset((await currentPresentation()).words)[lang];
  const place = lower(words.location);
  return (
    // Phase 2 (Nov 23, 2026): Settings' Direction B frame. Phones go back to Locations from the band and add from its
    // right (hidden once the place is added); tablets and desktop have Cancel and Add in the form card's footer.
    <SettingsPageB title={t.newPlace(place)} titleId="new-location-title" lang={lang === "es" ? "es" : undefined} back={{
      href: "/app/settings/locations", label: lang === "es" ? <SettingsBackLabel destination={words.locations} compactLabel={copy.es.compactBack} /> : words.locations,
      ariaLabel: lang === "es" ? formatPortalCopy(copy.es.backToDestination, { destination: words.locations }) : undefined,
    }}
      phoneRight={<button type="submit" form="new-location-form" className="c-setb-save">{t.add}</button>}>
      <NewLocationForm action={createLocationAction} words={{ location: words.location, locations: words.locations }} />
    </SettingsPageB>
  );
}
