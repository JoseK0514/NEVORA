import Link from "next/link";
import { notFound } from "next/navigation";
import { EditLocationForm } from "@/components/edit-location-form";
import { requireRoles } from "@/lib/auth/permissions";
import { listLocations } from "@/lib/data/locations";
import { updateLocationAction } from "../../actions";
import "./edit-location.css";
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
    <div className="edit-location-page">
      <nav className="edit-location-breadcrumb" aria-label="Breadcrumb">
        <Link href="/app/settings">Settings</Link>
        <span aria-hidden="true">/</span>
        <Link href="/app/settings/locations">Locations</Link>
        <span aria-hidden="true">/</span>
        <span aria-current="page">Edit</span>
      </nav>
      <header className="edit-location-heading">
        <h1>Edit location</h1>
        <p>Keep your location details up to date for your team.</p>
      </header>
      <EditLocationForm key={`${location.id}:${location.updatedAt ?? ''}`} location={location} action={updateLocationAction} />
    </div>
  );
}
