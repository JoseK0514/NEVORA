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
import { WagesScreen } from "@/components/wages/wages-screen";

export async function generateMetadata() { return { title: EMPLOYEES_COPY[await readPageLang()].payRate }; }

/* SCRUM-214 (Nov 19, 2026): one person's pay rates, for Owners only (a Manager is sent to the restricted page before
 * anything is read). The page reads only the person's name and locations (the same scoped profile read as their page),
 * the workplace's time zone and the Owners' names for the history. Rates and history are read and saved in the browser
 * through POST /api/compensation/wages, which checks the Owner's session on every call. */
export default async function EmployeePayPage({ params }: { params: Promise<{ employeeId: string }> }) {
  await requireRoles(["OWNER"]);
  const { employeeId } = await params;
  const proof = await requireSessionMutationProof();
  let lang: "en" | "es" = "en";
  try { lang = (await readPortalLanguage(proof)).language; } catch { /* English until the language read answers */ }
  const source = await withOperationalCompany(proof, async () => {
    const profile = await readOperationalEmployeeProfile(proof, employeeId);
    if (profile.state === "unavailable") return { profile, workspace: null, owners: {} as Record<string, string> };
    const workspace = await getWorkspace();
    let owners: Record<string, string> = {};
    try { owners = Object.fromEntries((await listEmployees()).filter(e => e.role === "OWNER").map(e => [e.id, `${e.firstName} ${e.lastName}`.trim()])); } catch { /* "Another Owner" */ }
    return { profile, workspace, owners };
  });
  const title = lang === "es" ? "Perfil no disponible" : "Employee profile unavailable";
  if (source.state === "unavailable") return <OperationalUnavailable title={title} reason={source.reason} />;
  const { profile, workspace, owners } = source.data;
  if (profile.state === "unavailable" || !workspace) return <OperationalUnavailable title={title} reason={profile.state === "unavailable" ? profile.reason : "read_failed"} />;
  const { profile: employee, locations } = profile.data;
  const defaults = [employee.primaryLocationId, ...employee.eligibleLocationIds.filter(id => id !== employee.primaryLocationId)];
  return <ScopedReadFrame observation={scopedObservation(source)}>
    <WagesScreen key={employee.id} employeeId={employee.id} name={`${employee.firstName} ${employee.lastName}`.trim()} firstName={employee.firstName}
      backHref={`/app/employees/${encodeURIComponent(employee.id)}`} timeZone={workspace.timeZone} today={businessDate(new Date(), workspace.timeZone)}
      locations={locations.map(location => ({ id: location.id, name: location.shortName || location.name, active: location.active }))}
      defaultLocationIds={defaults} actors={owners} actorId={proof.employee.id} lang={lang} />
  </ScopedReadFrame>;
}
