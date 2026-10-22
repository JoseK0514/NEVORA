import { redirect } from "next/navigation";
import { ManagerInbox } from "@/components/manager-inbox";
import { requireSession, requireSessionMutationProof } from "@/lib/auth/session";
import { readOperationalDirectory } from "@/lib/company-access/operational-read.server";
import { isManagerRole } from "@/lib/auth/permissions";
import { getWorkspace } from "@/lib/data/workspaces";
import { businessDate } from "@/lib/business-time";
import { weekStartFor } from "@/lib/date-utils";
import "./inbox.css";

/** Managers' one place for what needs a decision: exceptions first, then
 * requests. Reads through the existing authority-checked action center. */
export const metadata = { title: "Inbox" };

export default async function InboxPage() {
  const session = await requireSession();
  if (!isManagerRole(session.role)) redirect("/app/requests/hub");
  const workspace = await getWorkspace();
  const weekStart = weekStartFor(businessDate(new Date(), workspace.timeZone));
  // PD5: Call and Text on a shift with no clock-in use the phone numbers this viewer already sees on Team. Only the
  // company-wide directory carries them; a location-scoped Manager, or a failed read, simply gets no Call or Text.
  const directory = await readOperationalDirectory(await requireSessionMutationProof()).catch(() => null);
  const phones = directory?.state === "ready" && directory.data.mode === "COMPANY"
    ? Object.fromEntries(directory.data.employees.filter(employee => employee.active && employee.phone).map(employee => [employee.id, employee.phone]))
    : undefined;
  return <ManagerInbox weekStart={weekStart} actorId={session.id} timeZone={workspace.timeZone} phones={phones} />;
}
