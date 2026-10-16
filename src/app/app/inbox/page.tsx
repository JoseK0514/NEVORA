import { redirect } from "next/navigation";
import { ManagerInbox } from "@/components/manager-inbox";
import { requireSession } from "@/lib/auth/session";
import { isManagerRole } from "@/lib/auth/permissions";
import { getWorkspace } from "@/lib/data/workspaces";
import { businessDate } from "@/lib/business-time";
import { weekStartFor } from "@/lib/date-utils";
import "./inbox.css";

/** Managers' one place for what needs a decision: exceptions first, then
 * requests. Reads through the existing authority-checked action center. */
export default async function InboxPage() {
  const session = await requireSession();
  if (!isManagerRole(session.role)) redirect("/app/requests/hub");
  const workspace = await getWorkspace();
  const weekStart = weekStartFor(businessDate(new Date(), workspace.timeZone));
  return <ManagerInbox weekStart={weekStart} actorId={session.id} timeZone={workspace.timeZone} />;
}
