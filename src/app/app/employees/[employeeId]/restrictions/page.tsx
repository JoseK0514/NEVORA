import { readPageLang } from "@/lib/i18n/page-lang.server";
import { EMPLOYEES_COPY } from "../../employees-copy";
import { scopedObservation } from "@/lib/company-access/observation";
import { withOperationalCompany } from "@/lib/company-access/operational-scope.server";
import { readOperationalEmployeeProfile } from "@/lib/company-access/operational-read.server";
import { OperationalUnavailable } from "@/components/company-access/operational-unavailable";
import { ScopedReadFrame } from "@/components/company-access/scoped-read-frame";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { MANAGER_ROLES, requireRoles } from "@/lib/auth/permissions";
import { employeeViewAuthority } from "@/lib/employee-view-authority.server";
import { getWorkspace } from "@/lib/data/workspaces";
import { RestrictionsScreen } from "@/components/restrictions/restrictions-screen";

export async function generateMetadata() { return { title: EMPLOYEES_COPY[await readPageLang()].restrictions }; }

/* Scheduling restrictions (U02), the management side: the agreement an Owner or Manager keeps for one person, opened from
 * that person's page. This page reads only what the person's page already reads (their name, through the same scoped
 * profile read) and the workplace's time zone. The agreement itself is read and changed in the browser through
 * POST /api/manager/scheduling-restrictions, which checks the session, the role, the person's whole location footprint
 * and Owner-only records on every call; the view value below is a lifetime binding, never a credential. */
export default async function EmployeeRestrictionsPage({ params }: { params: Promise<{ employeeId: string }> }) {
  await requireRoles(MANAGER_ROLES);
  const { employeeId } = await params;
  const proof = await requireSessionMutationProof();
  const t = EMPLOYEES_COPY[await readPageLang()];
  const source = await withOperationalCompany(proof, async () => {
    const profile = await readOperationalEmployeeProfile(proof, employeeId);
    return { profile, workspace: profile.state === "unavailable" ? null : await getWorkspace() };
  });
  if (source.state === "unavailable") return <OperationalUnavailable title={t.profileUnavailable} reason={source.reason} />;
  const { profile, workspace } = source.data;
  if (profile.state === "unavailable" || !workspace) return <OperationalUnavailable title={t.profileUnavailable} reason={profile.state === "unavailable" ? profile.reason : "read_failed"} />;
  const employee = profile.data.profile;
  const base = `/app/employees/${encodeURIComponent(employee.id)}`;
  return <ScopedReadFrame observation={scopedObservation(source)}>
    <RestrictionsScreen key={employee.id} scope="management" employeeId={employee.id} actorId={proof.employee.id} view={employeeViewAuthority(proof, "planning")} timeZone={workspace.timeZone}
      name={`${employee.firstName} ${employee.lastName}`.trim()} firstName={employee.firstName} backHref={base}
      availabilityHref={`/app/availability?employeeId=${encodeURIComponent(employee.id)}`} ownerRecord={employee.role === "OWNER" && proof.employee.role !== "OWNER"} />
  </ScopedReadFrame>;
}
