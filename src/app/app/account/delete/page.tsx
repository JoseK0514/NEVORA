import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { activeDeletionRequest } from "@/lib/account-deletion/requests.server";
import { POLICY_FACTS, policiesVisible } from "@/lib/legal/policies";
import { QuietPage } from "@/components/quiet/quiet";
import { AccountDeletionForm } from "@/components/account-deletion-form";
import "@/components/quiet/quiet.css";
import "./account-deletion.css";

const roleName = { OWNER: "Owner", MANAGER: "Manager", LEAD: "Lead", EMPLOYEE: "Employee" } as const;

export const metadata = { title: "Delete your account" };

/** Delete my account, for every role. Identity is the server session; the form asks for the password again.
 * Quiet (v4, inspection Oct 24): the same white page and grouped rows for every role, wording unchanged.
 * Employee/Lead phones get the teal presentation from the same client owner. */
export default async function DeleteAccountPage() {
  if (!policiesVisible()) notFound();
  const session = await requireSession();
  const existing = await activeDeletionRequest(session.id);
  return (
    <QuietPage className="q-delete">
      <AccountDeletionForm
        account={{ name: `${session.firstName} ${session.lastName}`, role: roleName[session.role], roleKey: session.role, employeeId: session.id }}
        period={POLICY_FACTS.DELETION_COMPLETION_PERIOD} retention={POLICY_FACTS.RETENTION_SCHEDULE} owner={session.role === "OWNER"}
        existing={existing ? { kind: "duplicate", reference: existing.reference, confirmedAt: existing.confirmedAt } : null} />
    </QuietPage>
  );
}
