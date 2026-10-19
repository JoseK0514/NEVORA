import { NewLocationForm } from "@/components/new-location-form";
import { requireRoles } from "@/lib/auth/permissions";
import { currentPresentation } from "@/lib/workspace-presentation/current.server";
import { lower, wordPreset } from "@/lib/workspace-presentation/words";
import { createLocationAction } from "../../actions";
import { GuideCard, SettingsFrame } from "../../wave-c-kit";

export default async function NewLocationPage() {
  await requireRoles(["OWNER"]);
  const words = wordPreset((await currentPresentation()).words).en;
  const place = lower(words.location);
  return (
    <SettingsFrame back={{ href: "/app/settings/locations", label: words.locations }} title={`Add ${place}`} summary="Give your team a new place to work."
      aside={<GuideCard title="After you add it">
        <p>A {place} needs two things before you can schedule there.</p>
        <ol className="wc-steps">
          <li><strong>Set staffing &amp; coverage</strong>Choose minimum staffing, a Lead rule and coverage periods in Scheduling rules.</li>
          <li><strong>Assign eligible {lower(words.people)}</strong>Open a {lower(words.person)}’s scheduling profile to let them work at this {place}.</li>
        </ol>
      </GuideCard>}>
      <NewLocationForm action={createLocationAction} words={{ location: words.location, locations: words.locations }} />
    </SettingsFrame>
  );
}
