import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { ConfigurationForm } from "@/components/configuration-form";
import { LocationConfigurationFields } from "@/components/location-configuration-fields";
import { requireRoles } from "@/lib/auth/permissions";
import { listLocations } from "@/lib/data/locations";
import { updateLocationAction } from "../../actions";
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
    <div className="configuration-page">
      <PageHeader
        title="Edit Location"
        eyebrow="Owner controls"
        description="Name changes preserve the Clocker link."
      />
      <section className="panel form-panel">
        <ConfigurationForm action={updateLocationAction} reviewedUpdatedAt={location.updatedAt}>
          <LocationConfigurationFields location={location} />
          <p>
            Clocker:{" "}
            <Link href={`/clocker/${location.clockerKey}`}>
              /clocker/{location.clockerKey}
            </Link>
            {!location.active ? " (unavailable while inactive)" : ""}
          </p>
          <Link href="/app/schedule/settings">Scheduling Rules</Link>
          <div className="form-footer">
            <Link className="button secondary" href="/app/settings/locations">
              Locations
            </Link>
            <button className="button primary" type="submit">
              Save Location
            </button>
          </div>
        </ConfigurationForm>
      </section>
    </div>
  );
}
