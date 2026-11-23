import { redirect } from "next/navigation";
import { ManagerInboxCorp } from "@/components/manager-inbox-corp";
import { readOperationalAuthority } from "@/lib/company-access/operational-scope.server";
import { scopedObservation } from "@/lib/company-access/observation";
import { ScopedReadFrame } from "@/components/company-access/scoped-read-frame";
import { OperationalUnavailable } from "@/components/company-access/operational-unavailable";
import { requireSession, requireSessionMutationProof } from "@/lib/auth/session";
import { isManagerRole } from "@/lib/auth/permissions";
import { getWorkspace } from "@/lib/data/workspaces";
import { businessDate } from "@/lib/business-time";
import { weekStartFor } from "@/lib/date-utils";
import { readPageLang } from "@/lib/i18n/page-lang.server";
import "./inbox.css";

const INBOX_TITLE = { en: "Things to do", es: "Pendientes" } as const;

/** Things to do (Release 1, board O-Inbox): Managers' one place for what needs a decision. Reads through the existing
 * authority-checked action center; each row opens the full review. Call and Text live on the person's page, so this
 * page no longer reads the company directory's phone numbers. When Things to do is a phone tab (payroll review off), the
 * shell marks it as a tab's own page and the Back header steps aside (corp-shell.css). */
export async function generateMetadata() { return { title: INBOX_TITLE[await readPageLang()] }; }

export default async function InboxPage({ searchParams }: { searchParams?: Promise<{ view?: string }> } = {}) {
  const session = await requireSession();
  if (!isManagerRole(session.role)) redirect("/app/requests/hub");
  const workspace = await getWorkspace();
  const weekStart = weekStartFor(businessDate(new Date(), workspace.timeZone));
  // ?view=more: Older items, the items Things to do lists but doesn't count (Home and the sidebar count the rest).
  const view = (await searchParams)?.view === "more" ? "more" : "today";
  if (session.role === "MANAGER") {
    const access = await readOperationalAuthority(await requireSessionMutationProof());
    if (access.state !== "ready" || !access.scope) {
      return <OperationalUnavailable title={INBOX_TITLE[await readPageLang()]} reason={access.state === "ready" ? "access_denied" : access.reason} scoped />;
    }
    if (access.scope.mode === "LOCATIONS") {
      return <ScopedReadFrame observation={scopedObservation(access)}>
        <ManagerInboxCorp key={access.authority} weekStart={weekStart} actorId={session.id} timeZone={workspace.timeZone} coverageFirst view={view} scoped />
      </ScopedReadFrame>;
    }
  }
  return <ManagerInboxCorp weekStart={weekStart} actorId={session.id} timeZone={workspace.timeZone} coverageFirst view={view} />;
}

