import { redirect } from "next/navigation";
import { ManagerInbox } from "@/components/manager-inbox";
import { requireSession, requireSessionMutationProof } from "@/lib/auth/session";
import { readOperationalDirectory } from "@/lib/company-access/operational-read.server";
import { readOperationalAuthority } from "@/lib/company-access/operational-scope.server";
import { isManagerRole } from "@/lib/auth/permissions";
import { correctionAuthority } from "@/lib/time-corrections/authority.server";
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
  const proof = await requireSessionMutationProof();
  const directory = await readOperationalDirectory(proof).catch(() => null);
  const contacts = directory?.state === "ready" && directory.data.mode === "COMPANY"
    ? { observation: { authority: directory.authority, observedAt: directory.observedAt, validForMs: directory.validForMs },
        phones: Object.fromEntries(directory.data.employees.filter(employee => employee.active && employee.phone).map(employee => [employee.id, employee.phone])) }
    : undefined;
  // B-12: a location-scoped Manager's Inbox holds their people's time off, corrections and timecards; today's
  // company-wide clock-ins stay with company-wide access.
  const authority = await readOperationalAuthority(proof).catch(() => null);
  const companyWide = !(authority?.state === "ready" && authority.scope?.mode === "LOCATIONS");
  // UX-O-06: time corrections are decided in Requests, through the same correction binding On shift uses.
  return <ManagerInbox weekStart={weekStart} actorId={session.id} role={session.role} correctionAuthority={correctionAuthority(proof)} timeZone={workspace.timeZone} contacts={contacts} companyWide={companyWide} />;
}
