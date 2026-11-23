import { readPageLang } from "@/lib/i18n/page-lang.server";
import { EMPLOYEES_COPY } from "../../employees-copy";
import { scopedObservation } from "@/lib/company-access/observation";
import { withOperationalCompany } from "@/lib/company-access/operational-scope.server";
import { readOperationalEmployeeProfile } from "@/lib/company-access/operational-read.server";
import { OperationalUnavailable } from "@/components/company-access/operational-unavailable";
import { ScopedReadFrame } from "@/components/company-access/scoped-read-frame";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { requireRoles } from "@/lib/auth/permissions";
import { readPortalLanguage } from "@/lib/activation/language.server";
import { businessDate } from "@/lib/business-time";
import { getWorkspace } from "@/lib/data/workspaces";
import { listEmployees } from "@/lib/data/employees";
import { AccountScreen } from "@/components/time-off-admin/account-screen";

export async function generateMetadata() { return { title: EMPLOYEES_COPY[await readPageLang()].timeOffBalance }; }

/* PTO screens (Nov 20, 2026): one person's time off balance, for Owners only (a Manager is sent to the restricted page
 * before anything is read). The page reads the person's name, the workplace's date and the Owners' names; the balance,
 * history and adjustments go through /api/workforce/pto/{employeeId} and /api/workforce/settings, Owner-checked on every call. */
export default async function EmployeeTimeOffPage({ params }: { params: Promise<{ employeeId: string }> }) {
  await requireRoles(["OWNER"]);
  const { employeeId } = await params;
  const proof = await requireSessionMutationProof();
  let lang: "en" | "es" = "en";
  try { lang = (await readPortalLanguage(proof)).language; } catch { /* English */ }
  const source = await withOperationalCompany(proof, async () => {
    const profile = await readOperationalEmployeeProfile(proof, employeeId);
    if (profile.state === "unavailable") return { profile, workspace: null, owners: {} as Record<string, string> };
    const workspace = await getWorkspace();
    let owners: Record<string, string> = {};
    try { owners = Object.fromEntries((await listEmployees()).filter(e => e.role === "OWNER").map(e => [e.id, `${e.firstName} ${e.lastName}`.trim()])); } catch { /* "another Owner" */ }
    return { profile, workspace, owners };
  });
  const title = lang === "es" ? "Perfil no disponible" : "Employee profile unavailable";
  if (source.state === "unavailable") return <OperationalUnavailable lang={lang} title={title} reason={source.reason} />;
  const { profile, workspace, owners } = source.data;
  if (profile.state === "unavailable" || !workspace) return <OperationalUnavailable lang={lang} title={title} reason={profile.state === "unavailable" ? profile.reason : "read_failed"} />;
  const employee = profile.data.profile;
  return <ScopedReadFrame observation={scopedObservation(source)}>
    <AccountScreen key={employee.id} employeeId={employee.id} name={`${employee.firstName} ${employee.lastName}`.trim()} firstName={employee.firstName}
      backHref={`/app/employees/${encodeURIComponent(employee.id)}`} today={businessDate(new Date(), workspace.timeZone)} actors={owners} actorId={proof.employee.id} lang={lang} />
  </ScopedReadFrame>;
}
