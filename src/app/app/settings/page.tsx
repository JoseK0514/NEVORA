import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { requireRoles } from "@/lib/auth/permissions";
export default async function SettingsPage() {
  await requireRoles(["OWNER"]);
  return (
    <>
      <PageHeader
        eyebrow="Owner controls"
        title="Settings"
        description="Configure your workspace and operational catalogs."
      />
      <section className="panel settings-list">
        {[
          [
            "Workspace",
            "Business name and timezone.",
            "/app/settings/workspace",
          ],
          [
            "Locations",
            "Location names, status, Clocker links and setup.",
            "/app/settings/locations",
          ],
          [
            "Positions",
            "Job qualifications, separate from access roles.",
            "/app/settings/positions",
          ],
          [
            "Scheduling Rules",
            "Staffing, coverage periods and weekly hour goals.",
            "/app/schedule/settings",
          ],
        ].map(([name, description, href]) => (
          <div key={href}>
            <strong>{name}</strong>
            <span>{description}</span>
            <Link className="button ghost" href={href}>
              Manage {name}
            </Link>
          </div>
        ))}
      </section>
    </>
  );
}
