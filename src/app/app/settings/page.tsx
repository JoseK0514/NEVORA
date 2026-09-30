import Link from "next/link";
import "./settings-premium.css";
import { NavIcon } from "@/components/nav-icon";
import { requireRoles } from "@/lib/auth/permissions";
import { listLocations } from "@/lib/data/employees";

export default async function SettingsPage() {
  await requireRoles(["OWNER"]);

  const locations = await listLocations();
  const locationNames = locations.map((location) => location.shortName);

  return (
    <div className="settings-page">
      <section className="settings-hero">
        <div className="settings-hero-copy">
          <p>Owner controls</p>
          <h1>Settings</h1>
          <span>Manage the business rules that power Fuel Scheduler.</span>
        </div>
      </section>

      <section className="settings-card-grid">
        <article className="settings-control-card">
          <span className="settings-card-icon">
            <NavIcon name="location" size={31} />
          </span>

          <div className="settings-card-copy">
            <h2>Locations</h2>
            <p>Configure and manage your Fuel Coffee Drive locations.</p>
          </div>

          <div className="settings-card-detail">
            <span>
              <NavIcon name="location" size={18} />
              <strong>{locations.length} active location{locations.length === 1 ? "" : "s"}</strong>
              <b aria-hidden="true">›</b>
            </span>
            <small>
              {locationNames.length ? locationNames.join("  ·  ") : "No active locations"}
            </small>
          </div>

          <button className="button primary settings-card-action" type="button">
            Manage locations
            <span aria-hidden="true">→</span>
          </button>
        </article>

        <article className="settings-control-card">
          <span className="settings-card-icon">
            <NavIcon name="employees" size={31} />
          </span>

          <div className="settings-card-copy">
            <h2>Roles &amp; permissions</h2>
            <p>Manage Owner, Manager, Lead, and Employee access.</p>
          </div>

          <div className="settings-card-detail">
            <span>
              <NavIcon name="employee" size={18} />
              <strong>4 roles configured</strong>
              <b aria-hidden="true">›</b>
            </span>
            <small>Owner  ·  Manager  ·  Lead  ·  Employee</small>
          </div>

          <Link className="button primary settings-card-action" href="/app/employees">
            Manage access
            <span aria-hidden="true">→</span>
          </Link>
        </article>

        <article className="settings-control-card">
          <span className="settings-card-icon">
            <NavIcon name="rules" size={31} />
          </span>

          <div className="settings-card-copy">
            <h2>Scheduling rules</h2>
            <p>Set staffing coverage targets and employee weekly hour goals.</p>
          </div>

          <div className="settings-card-detail">
            <span>
              <NavIcon name="calendar" size={18} />
              <strong>Rules configured</strong>
              <b aria-hidden="true">›</b>
            </span>
            <small>Staffing  ·  Hour targets  ·  Coverage windows</small>
          </div>

          <Link
            className="button primary settings-card-action"
            href="/app/schedule/settings"
          >
            Manage rules
            <span aria-hidden="true">→</span>
          </Link>
        </article>
      </section>

      <section className="settings-brand-card" aria-label="Fuel Coffee Drive">
        <div className="settings-brand-copy">
          <strong>Built around<br />the way Fuel works.</strong>
          <span className="settings-brand-line" aria-hidden="true" />
          <small>People Fuel Possibility.</small>
        </div>
        <div className="settings-brand-script" aria-hidden="true">
          <span>Same</span>
          <span>People.</span>
          <span>Bigger</span>
          <span>Possibilities.</span>
        </div>
      </section>
    </div>
  );
}
