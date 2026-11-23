import { OwnerOnlyNotice } from "@/components/owner-only-notice";
import { requireSessionMutationProof } from "@/lib/auth/session";
import { RequestHub } from "./request-hub";
import { currentPresentation } from "@/lib/workspace-presentation/current.server";
import { listEmployeeTimeOffRequests } from "@/lib/data/requests";
import { getWorkspace } from "@/lib/data/workspaces";
import {ResponsiveEmployeeRequests} from "@/components/employee-mobile/requests";
import {employeeViewAuthority} from "@/lib/employee-view-authority.server";
import { readPageLang } from "@/lib/i18n/page-lang.server";
import { REQUESTS_COPY } from "../requests-copy";

/** Review B1 (NV-022): the page title in the tab and for screen readers. */
export async function generateMetadata() { return { title: REQUESTS_COPY[await readPageLang()].requests }; }

export default async function RequestsHubPage() {
  const proof = await requireSessionMutationProof();
  const { employee } = proof;
  const t = REQUESTS_COPY[await readPageLang()];
  // Review B2 (NV-136): no silent redirect; the page says whose it is and where this person's version is.
  if (!["EMPLOYEE", "LEAD"].includes(employee.role)) return <OwnerOnlyNotice state lang={await readPageLang()} title={t.requests} reason={t.hubClosedReason} help={t.hubClosedHelp} next={{ href: "/app/inbox", label: t.openThingsToDo }} />;
  const { modules } = await currentPresentation();
  // Signature: the hub shows the person's own time-off requests (the same read as Time off's My requests).
  // A failed read shows as unavailable, never as "no requests".
  const [requests, timeZone] = modules.timeOff ? await Promise.all([
    listEmployeeTimeOffRequests(employee.id).catch(() => null),
    getWorkspace().then(workspace => workspace.timeZone).catch(() => "UTC"),
  ]) : [undefined, "UTC"];
  return <ResponsiveEmployeeRequests mode="hub" authority={employeeViewAuthority(proof,'requests')}><RequestHub modules={modules} requests={requests} timeZone={timeZone} lang={(await readPageLang())} /></ResponsiveEmployeeRequests>;
}
