import { redirect } from "next/navigation";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { employeeViewAuthority } from "@/lib/employee-view-authority.server";
import { getWorkspace } from "@/lib/data/workspaces";
import { RestrictionsScreen } from "@/components/restrictions/restrictions-screen";
import { readPageLang } from "@/lib/i18n/page-lang.server";
import { availabilityCopy } from "@/components/availability-copy";

export async function generateMetadata() {
  return { title: availabilityCopy(await readPageLang()).page.agreedTimes };
}

/* Scheduling restrictions (U02), the Employee and Lead side: their own agreement, what starts later, and a request to
 * change it. Opened from Availability, because that is where a person already thinks about when they can work, and the
 * two must not be confused: this page says the agreement is separate from the availability they send. The agreement is
 * read and requests are sent in the browser through POST /api/employee/scheduling-restrictions (own record only; a
 * request never approves itself). An Owner or Manager keeps agreements on each person's page. */
export default async function AgreedTimesPage() {
  const proof = await requireSessionMutationProof();
  if (!["EMPLOYEE", "LEAD"].includes(proof.employee.role)) redirect("/app/availability");
  const workspace = await getWorkspace();
  return <RestrictionsScreen scope="employee" lang={await readPageLang()} employeeId={proof.employee.id} actorId={proof.employee.id} view={employeeViewAuthority(proof, "planning")} timeZone={workspace.timeZone}
    name={`${proof.employee.firstName} ${proof.employee.lastName}`.trim()} firstName={proof.employee.firstName} backHref="/app/availability" />;
}
