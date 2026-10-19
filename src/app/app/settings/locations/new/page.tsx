import { NewLocationForm } from "@/components/new-location-form";
import { requireRoles } from "@/lib/auth/permissions";
import { createLocationAction } from "../../actions";
import { GuideCard, SettingsFrame } from "../../wave-c-kit";

export default async function NewLocationPage() {
  await requireRoles(["OWNER"]);
  return (
    <SettingsFrame back={{ href: "/app/settings/locations", label: "Locations" }} title="Add location" summary="Give your team a new place to work."
      aside={<GuideCard title="After you add it">
        <p>A location needs two things before you can schedule there.</p>
        <ol className="wc-steps">
          <li><strong>Set staffing &amp; coverage</strong>Choose minimum staffing, a Lead rule and coverage periods in Scheduling rules.</li>
          <li><strong>Assign eligible employees</strong>Open an employee’s scheduling profile to let them work at this location.</li>
        </ol>
      </GuideCard>}>
      <NewLocationForm action={createLocationAction} />
    </SettingsFrame>
  );
}
