import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ConfigurationForm } from "@/components/configuration-form";
import { LocationConfigurationFields } from "@/components/location-configuration-fields";
import { requireRoles } from "@/lib/auth/permissions";
import { createLocationAction } from "../../actions";
export default async function NewLocationPage() {
  await requireRoles(["OWNER"]);
  return (
    <div className="configuration-page">
      <PageHeader
        title="Add Location"
        eyebrow="Owner controls"
        description="New locations need staffing rules, coverage periods and eligible employees."
      />
      <section className="panel form-panel">
        <ConfigurationForm action={createLocationAction}>
          <LocationConfigurationFields />
          <div className="form-footer">
            <Link className="button secondary" href="/app/settings/locations">
              Locations
            </Link>
            <button className="button primary" type="submit">
              Add Location
            </button>
          </div>
        </ConfigurationForm>
      </section>
    </div>
  );
}
