import { redirect } from "next/navigation";
import { ManagerInboxCorp } from "@/components/manager-inbox-corp";
import { requireSession } from "@/lib/auth/session";
import { isManagerRole } from "@/lib/auth/permissions";
import { getWorkspace } from "@/lib/data/workspaces";
import { businessDate } from "@/lib/business-time";
import { weekStartFor } from "@/lib/date-utils";
import "./inbox.css";

/** Things to do (Release 1, board O-Inbox): Managers' one place for what needs a decision. Reads through the existing
 * authority-checked action center; each row opens the full review. Call and Text live on the person's page, so this
 * page no longer reads the company directory's phone numbers. When Things to do is a phone tab (payroll review off), the
 * shell marks it as a tab's own page and the Back header steps aside (corp-shell.css). */
export const metadata = { title: "Things to do" };

export default async function InboxPage({ searchParams }: { searchParams?: Promise<{ view?: string }> } = {}) {
  const session = await requireSession();
  if (!isManagerRole(session.role)) redirect("/app/requests/hub");
  const workspace = await getWorkspace();
  const weekStart = weekStartFor(businessDate(new Date(), workspace.timeZone));
  // ?view=more: Older items, the items Things to do lists but doesn't count (Home and the sidebar count the rest).
  const view = (await searchParams)?.view === "more" ? "more" : "today";
  return <ManagerInboxCorp weekStart={weekStart} actorId={session.id} timeZone={workspace.timeZone} coverageFirst={session.role === "OWNER"} view={view} />;
}

