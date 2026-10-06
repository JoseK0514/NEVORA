import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { ConfigurationForm } from "@/components/configuration-form";
import { requireRoles } from "@/lib/auth/permissions";
import {
  getWorkspace,
  isWorkspaceTimezoneLocked,
  WorkspaceTimezoneLockedError,
} from "@/lib/data/workspaces";
import { saveWorkspaceProfileAction } from "../actions";
export default async function WorkspacePage() {
  await requireRoles(["OWNER"]);
  const [workspace, locked] = await Promise.all([
    getWorkspace(),
    isWorkspaceTimezoneLocked(),
  ]);
  return (
    <div className="configuration-page">
      <PageHeader
        title="Workspace"
        eyebrow="Owner controls"
        description="Business identity and scheduling timezone."
        actions={
          <Link className="button secondary" href="/app/settings">
            Back to Settings
          </Link>
        }
      />
      <section className="panel form-panel">
        <ConfigurationForm action={saveWorkspaceProfileAction}>
          <label>
            Workspace name
            <input
              name="name"
              defaultValue={workspace.name}
              required
              maxLength={160}
            />
          </label>
          <label>
            Business timezone
            <input
              name="timeZone"
              defaultValue={workspace.timeZone}
              disabled={locked}
              required
              aria-describedby="timezone-help"
            />
          </label>
          <p id="timezone-help" className="form-help">
            {locked
              ? new WorkspaceTimezoneLockedError().message
              : "Enter an IANA timezone, for example America/New_York. The workweek starts Monday at 00:00 in this timezone."}
          </p>
          <div className="form-footer">
            <Link className="button secondary" href="/app/settings">
              Cancel
            </Link>
            <button type="submit" className="button primary">
              Save Workspace
            </button>
          </div>
        </ConfigurationForm>
      </section>
    </div>
  );
}
