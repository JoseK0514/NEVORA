import type { ReactNode } from "react";
import { EmployeeCoreProfileForm } from "@/components/employee-core-profile-form";
import { EmployeeSchedulingFields } from "@/components/employee-scheduling-fields";
import { ConfigurationForm } from "@/components/configuration-form";
import { OperationalRuleFields } from "@/components/operational-rule-fields";
import { EmployeeProfileTabs } from "@/components/employee-profile-tabs";
import { KeyIcon } from "@phosphor-icons/react/dist/ssr/Key";
import { LockKeyIcon } from "@phosphor-icons/react/dist/ssr/LockKey";
import { Card, MetaParts, PageBand, Row, Rows, Tile } from "@/components/kit/kit";
import { FormActions, Notice } from "@/components/wave-a/parts";
import { PendingButton } from "@/components/wave-a/pending-button";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import {
  getEmployeeManagementProfile,
  listLocations,
} from "@/lib/data/employees";
import { listPositions } from "@/lib/data/positions";
import { readOperationalRuleProfileView } from "@/lib/data/shift-change-views";
import { employeeInitials, employeeRoleLabel } from "@/lib/employee-display";
import { formatPhoneNumber } from "@/lib/phone";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  saveEmployeeCoreProfileAction,
  saveEmployeeSchedulingProfileAction,
} from "../actions";

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const actor = await requireRoles(MANAGER_ROLES);
  const { employeeId } = await params;

  const [employee, locations, positions] = await Promise.all([
    getEmployeeManagementProfile(employeeId),
    listLocations({ includeInactive: true }),
    listPositions({ includeInactive: true }),
  ]);

  if (!employee) notFound();

  const proof = await requireSessionMutationProof();
  let operational = null;
  let profileUnavailable = false;
  try {
    operational = await readOperationalRuleProfileView(proof, employee.id);
  } catch {
    profileUnavailable = true;
  }

  const primaryLocation = locations.find(
    (location) => location.id === employee.primaryLocationId,
  );
  const canManageCore = actor.role === "OWNER" || employee.role !== "OWNER";

  const roleLabel = employeeRoleLabel(employee.role);
  // Phase 3.5 Wave A: Team member detail on the kit. Who they are in the band, contact at a glance,
  // then Details (contact, access, tablet PIN, sign-in help) and Scheduling (positions, locations, Owner rules).
  return (
    <div className="nv-page wa-page wa-member" data-nv-page="">
      <PageBand overlap={false} back={{ href: "/app/employees", label: "Team" }} eyebrow={`${roleLabel} · ${employee.active ? "Active" : "Inactive"}`}
        title={`${employee.firstName} ${employee.lastName}`}
        summary={<MetaParts text={[primaryLocation ? `${primaryLocation.shortName}${primaryLocation.active ? "" : " (inactive)"}` : "No primary location", formatPhoneNumber(employee.phone), employee.email].filter(Boolean).join(" · ")} />} />
      <div className="nv-content wa-narrow">
        <EmployeeProfileTabs
          details={<>
            <Card title="Employee details" id="member-details">
              {canManageCore ? (
                <EmployeeCoreProfileForm employee={employee} locations={locations} actorRole={actor.role} action={saveEmployeeCoreProfileAction} />
              ) : (
                <div className="wa-card-body"><p className="wa-text wa-muted">Only an Owner can change another Owner. Scheduling information remains available in Scheduling.</p></div>
              )}
            </Card>
            {canManageCore && employee.active ? <Card title="Access">
              <Rows label="Access">
                <Row href={`/app/employees/${encodeURIComponent(employee.id)}/clocker-pin`} title="Clocker PIN" meta="For the shared tablet. Separate from portal sign-in."
                  leading={<Tile><KeyIcon size={20} weight="bold" /></Tile>} />
                {employee.id !== actor.id ? <Row href={`/app/account-recovery?employee=${encodeURIComponent(employee.id)}`} title="Account recovery" meta="Help them back in after you check who they are."
                  leading={<Tile><LockKeyIcon size={20} weight="bold" /></Tile>} /> : null}
              </Rows>
            </Card> : null}
          </>}
          scheduling={<>
            <Card title="Scheduling profile" id="member-scheduling">
              <p className="wa-card-lead">Positions and locations decide where they can be scheduled.</p>
              <ConfigurationForm action={saveEmployeeSchedulingProfileAction} className="wa-form" reviewedUpdatedAt={employee.updatedAt}>
                <input type="hidden" name="employeeId" value={employee.id} />
                <div className="wa-fields"><EmployeeSchedulingFields employee={employee} locations={locations} positions={positions} /></div>
                <div className="wa-card-body"><FormActions><PendingButton pending="Saving…" block>Save scheduling profile</PendingButton></FormActions></div>
              </ConfigurationForm>
            </Card>
            <Card title="Operational rules" id="member-rules">
              {profileUnavailable ? (
                <div className="wa-card-body"><Notice tone="urgent" title="Couldn’t load the rules">Reconnect and reload the page.</Notice></div>
              ) : operational ? (
                <OperationalRuleFields employeeId={employee.id} profile={operational} canEdit={actor.role === "OWNER"} />
              ) : (
                <div className="wa-card-body">
                  <p className="wa-text wa-muted">Set this person’s weekly hours first. No maximum is created by this review.</p>
                  <KitLinkInline href={`/app/schedule/settings#target-${encodeURIComponent(employee.id)}`}>Set weekly hours</KitLinkInline>
                </div>
              )}
            </Card>
          </>}
        />
      </div>
    </div>
  );
}

function KitLinkInline({ href, children }: { href: string; children: ReactNode }) {
  return <Link className="nv-link" href={href}>{children}</Link>;
}
