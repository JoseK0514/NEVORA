import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { activeDeletionRequest } from "@/lib/account-deletion/requests.server";
import { POLICY_FACTS, policiesVisible } from "@/lib/legal/policies";
import { AccountDeletionForm } from "@/components/account-deletion-form";
import { getWorkspace } from "@/lib/data/workspaces";
import "./account-deletion.css";

const roleName = { OWNER: "Owner", MANAGER: "Manager", LEAD: "Lead", EMPLOYEE: "Employee" } as const;

export const metadata = { title: "Delete account" };

/** Delete my account, for every role. Identity is the server session; the form asks for the password again.
 * Every role gets the Employee's Direction B screen (band, cards, the red Delete my account), from the same client owner. */
export default async function DeleteAccountPage() {
  if (!policiesVisible()) notFound();
  const session = await requireSession();
  const [existing, workplaceName] = await Promise.all([activeDeletionRequest(session.id), getWorkspace().then(workspace => workspace.name).catch(() => null)]);
  // Phase 2 (Nov 23, 2026): one Direction B screen for every role (Employee and Lead's, with the Owner's own lines).
  return <AccountDeletionForm
    account={{ name: `${session.firstName} ${session.lastName}`, role: roleName[session.role], roleKey: session.role, employeeId: session.id }}
    period={POLICY_FACTS.DELETION_COMPLETION_PERIOD} retention={POLICY_FACTS.RETENTION_SCHEDULE} owner={session.role === "OWNER"}
    existing={existing ? { kind: "duplicate", reference: existing.reference, confirmedAt: existing.confirmedAt } : null} workplaceName={workplaceName} />;
}
