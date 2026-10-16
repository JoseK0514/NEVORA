import Link from "next/link";
import { ConfigurationForm } from "@/components/configuration-form";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr/ArrowLeft";
import { BuildingsIcon } from "@phosphor-icons/react/dist/ssr/Buildings";
import { GlobeHemisphereWestIcon } from "@phosphor-icons/react/dist/ssr/GlobeHemisphereWest";
import { LockKeyIcon } from "@phosphor-icons/react/dist/ssr/LockKey";
import { ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr/ShieldCheck";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { CheckIcon } from "@phosphor-icons/react/dist/ssr/Check";
import { requireRoles } from "@/lib/auth/permissions";
import {
  getWorkspace,
  isWorkspaceTimezoneLocked,
  WorkspaceTimezoneLockedError,
} from "@/lib/data/workspaces";
import { saveWorkspaceProfileAction } from "../actions";
import "./workspace-settings.css";
export default async function WorkspacePage() {
  await requireRoles(["OWNER"]);
  const [workspace, locked] = await Promise.all([
    getWorkspace(),
    isWorkspaceTimezoneLocked(),
  ]);
  return (
    <div className="configuration-page workspace-page">
      <Link className="workspace-back" href="/app/settings">
        <ArrowLeftIcon size={18} aria-hidden="true" />
        Back to Settings
      </Link>
      <header className="workspace-heading">
        <div>
          <h1>Workspace</h1>
          <p>Your business name and the timezone your team works in.</p>
        </div>
        <span className="workspace-access">
          <ShieldCheckIcon size={18} aria-hidden="true" />
          Owner access
        </span>
      </header>

      <div className="workspace-layout">
        <section className="workspace-card" aria-label="Workspace settings">
          <ConfigurationForm action={saveWorkspaceProfileAction} className="workspace-form">
            <fieldset className="workspace-group">
              <legend>
                <span className="workspace-section-icon">
                  <BuildingsIcon size={22} weight="duotone" aria-hidden="true" />
                </span>
                Workspace identity
              </legend>
              <p className="workspace-group-description">The name your team sees throughout NEVORA.</p>
              <label htmlFor="workspace-name">Workspace name</label>
              <input id="workspace-name" name="name" defaultValue={workspace.name} required maxLength={160} autoComplete="organization" aria-describedby="workspace-name-help" />
              <p id="workspace-name-help" className="workspace-field-help">Use a name your team will recognize.</p>
            </fieldset>

            <fieldset className="workspace-group workspace-timezone-group">
              <legend>
                <span className="workspace-section-icon">
                  <GlobeHemisphereWestIcon size={22} weight="duotone" aria-hidden="true" />
                </span>
                Time &amp; scheduling
              </legend>
              <p className="workspace-group-description">A shared timezone keeps schedules and recorded time aligned.</p>
              <div className="workspace-label-row">
                <label htmlFor="workspace-timezone">Business timezone</label>
                {locked ? <span className="workspace-protected"><LockKeyIcon size={14} aria-hidden="true" />Protected</span> : null}
              </div>
              <input id="workspace-timezone" name="timeZone" defaultValue={workspace.timeZone} disabled={locked} required aria-describedby="timezone-help" autoComplete="off" spellCheck={false} />
              <div id="timezone-help" className="workspace-field-help">
                {locked ? (
                  <>
                    <p>Operational records exist, so this timezone is protected. You can still update your workspace name.</p>
                    <details className="workspace-lock-details">
                      <summary>Why is the timezone protected?</summary>
                      <p>{new WorkspaceTimezoneLockedError().message}</p>
                    </details>
                  </>
                ) : <p>Enter an IANA timezone, such as America/New_York.</p>}
              </div>
              <div className="workspace-week">
                <CalendarBlankIcon size={20} aria-hidden="true" />
                <div><span>Workweek starts</span><strong>Monday at 12:00 AM</strong></div>
                <span className="workspace-week-note">In your business timezone</span>
              </div>
            </fieldset>

            <div className="workspace-form-footer">
              <p>Apply changes to your workspace.</p>
              <div className="workspace-form-actions">
                <Link className="workspace-button workspace-button-secondary" href="/app/settings">Cancel</Link>
                <button type="submit" className="workspace-button workspace-button-primary">
                  <CheckIcon size={18} aria-hidden="true" />Save workspace
                </button>
              </div>
            </div>
          </ConfigurationForm>
        </section>

        <aside className="workspace-context" aria-label="About these settings">
          <ShieldCheckIcon size={26} weight="duotone" aria-hidden="true" />
          <h2>A shared foundation</h2>
          <p>These settings apply to your whole team. Only an Owner can change them.</p>
          <div className="workspace-context-divider" />
          <h3>Looking for location settings?</h3>
          <p>Manage your workplaces and their setup separately.</p>
          <Link href="/app/settings/locations">Manage locations<span aria-hidden="true"> →</span></Link>
        </aside>
      </div>
    </div>
  );
}
