import { notFound } from "next/navigation";
import { EditLocationForm } from "@/components/edit-location-form";
import { requireRoles } from "@/lib/auth/permissions";
import { listLocations } from "@/lib/data/locations";
import { updateLocationAction } from "../../actions";
import { SettingsPageB } from "../../settings-b";
import { currentPresentation } from "@/lib/workspace-presentation/current.server";
import { wordPreset } from "@/lib/workspace-presentation/words";
import { listLocationStaffingSettings } from "@/lib/data/schedule-health";
import { listEmployees } from "@/lib/data/employees";
import { readPageLang } from "@/lib/i18n/page-lang.server";
import { SETTINGS_COPY } from "../../settings-copy";

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export async function generateMetadata() { return { title: SETTINGS_COPY[await readPageLang()].location }; }

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
  const lang = await readPageLang(), t = SETTINGS_COPY[lang];
  const preset = wordPreset((await currentPresentation()).words);
  const words = preset[lang];
  // Quiet (v4): the staffing and eligibility rows read what Scheduling rules and Team already hold; a failed read leaves them blank.
  const [staffing, employees] = await Promise.all([listLocationStaffingSettings().catch(() => []), listEmployees().catch(() => null)]);
  const minimum = staffing.find(setting => setting.locationId === location.id)?.minimumStaffPerShift ?? null;
  const eligible = employees ? employees.filter(employee => employee.active && employee.eligibleLocationIds.includes(location.id)).length : undefined;
  return (
    // Phase 2 (Nov 23, 2026): Settings' Direction B frame. Phones go back to Locations and save from the band (Save shows
    // once something changed); tablets and desktop save from the form card's footer.
    <SettingsPageB title={location.shortName} titleId="edit-location-title" lang={lang === "es" ? "es" : undefined} back={{ href: "/app/settings/locations", label: words.locations }}
      phoneRight={<button type="submit" form="edit-location-form" className="c-setb-save">{t.save}</button>}>
      <EditLocationForm key={location.id} location={location} action={updateLocationAction} words={{ location: words.location, locations: words.locations }}
        wordPresetId={preset.id} staffing={minimum === null ? undefined : t.perShift(minimum)} eligible={eligible} />
    </SettingsPageB>
  );
}
