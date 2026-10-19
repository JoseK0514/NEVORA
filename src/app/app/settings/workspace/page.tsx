import Link from "next/link";
import { CalendarBlankIcon } from "@phosphor-icons/react/dist/ssr/CalendarBlank";
import { CaretDownIcon } from "@phosphor-icons/react/dist/ssr/CaretDown";
import { CaretRightIcon } from "@phosphor-icons/react/dist/ssr/CaretRight";
import { LockKeyIcon } from "@phosphor-icons/react/dist/ssr/LockKey";
import { requireRoles } from "@/lib/auth/permissions";
import { keepWhole } from "@/lib/keep-whole";
import {
  getWorkspace,
  isWorkspaceTimezoneLocked,
  WorkspaceTimezoneLockedError,
} from "@/lib/data/workspaces";
import { saveWorkspaceProfileAction } from "../actions";
import { Fact, GuideCard, SettingsFrame } from "../wave-c-kit";
import { Field, SettingsForm } from "../wave-c-form";

export default async function WorkspacePage() {
  await requireRoles(["OWNER"]);
  const [workspace, locked] = await Promise.all([
    getWorkspace(),
    isWorkspaceTimezoneLocked(),
  ]);
  return (
    <SettingsFrame title="Company profile" summary="Your business name and the timezone your team works in."
      aside={<GuideCard title="Applies to everyone" action={<Link className="nv-link" href="/app/settings/locations">Manage locations<CaretRightIcon size={16} weight="bold" aria-hidden="true" /></Link>}>
        <p>Your team sees this name across NEVORA, and every schedule and timecard uses this timezone. Only an Owner can change them.</p>
        <p>Each place your team works is set up under Locations.</p>
      </GuideCard>}>
      <SettingsForm action={saveWorkspaceProfileAction} label="Company profile" submitLabel="Save changes" successTitle="Company profile saved" showServerSuccess={false}
        secondary={<Link className="nv-btn" data-kind="secondary" href="/app/settings">Cancel</Link>}
        messages={{ name: { missing: "Enter your business name." }, timeZone: { missing: "Enter a timezone, such as America/New_York." } }}>
        <section className="nv-card" aria-labelledby="workspace-identity-title">
          <div className="nv-card__head"><h2 className="nv-card__title" id="workspace-identity-title">Your business</h2></div>
          <div className="nv-card__body">
            <Field label="Business name" help="Use the name your team knows you by."
              id="workspace-name" name="name" defaultValue={workspace.name} required maxLength={160} autoComplete="organization" />
          </div>
        </section>
        <section className="nv-card" aria-labelledby="workspace-time-title">
          <div className="nv-card__head"><h2 className="nv-card__title" id="workspace-time-title">Time and scheduling</h2></div>
          <div className="nv-card__body wc-fields">
            {locked ? <div className="wc-field">
              <div className="wc-field__label-row">
                <span className="wc-label" id="workspace-timezone-label">Business timezone</span>
                <span className="wc-tag"><LockKeyIcon size={14} weight="bold" aria-hidden="true" />Protected</span>
              </div>
              <p className="wc-readonly" id="workspace-timezone" aria-labelledby="workspace-timezone-label" aria-describedby="timezone-help">{workspace.timeZone}</p>
              <div className="wc-help" id="timezone-help">
                <p>Schedules and time records already use this timezone, so it’s protected. You can still change your business name.</p>
                <details className="wc-disclosure">
                  <summary>Why is the timezone protected?<CaretDownIcon className="wc-caret" size={16} weight="bold" aria-hidden="true" /></summary>
                  <div className="wc-disclosure__body"><p>{new WorkspaceTimezoneLockedError().message}</p></div>
                </details>
              </div>
            </div> : <Field label="Business timezone" helpId="timezone-help"
              help={<p>Enter a timezone name, such as America/New_York.</p>}
              id="workspace-timezone" name="timeZone" defaultValue={workspace.timeZone} required autoComplete="off" spellCheck={false} autoCapitalize="none" />}
            <Fact icon={<CalendarBlankIcon size={20} aria-hidden="true" />} label="Workweek starts" value={keepWhole("Monday at 12:00 AM")} note="In your business timezone" />
          </div>
        </section>
      </SettingsForm>
    </SettingsFrame>
  );
}
