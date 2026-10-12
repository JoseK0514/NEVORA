import Link from "next/link";
import { NewLocationForm } from "@/components/new-location-form";
import { requireRoles } from "@/lib/auth/permissions";
import { createLocationAction } from "../../actions";
import "./new-location.css";

export default async function NewLocationPage() {
  await requireRoles(["OWNER"]);
  return (
    <div className="add-location-page">
      <nav className="add-location-breadcrumb" aria-label="Breadcrumb">
        <Link href="/app/settings">Settings</Link>
        <span aria-hidden="true">/</span>
        <Link href="/app/settings/locations">Locations</Link>
      </nav>
      <header className="add-location-heading">
        <h1>Add location</h1>
        <p>Give your team a new place to work.</p>
      </header>
      <NewLocationForm action={createLocationAction} />
    </div>
  );
}
