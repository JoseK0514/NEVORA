import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { activeDeletionRequest } from "@/lib/account-deletion/requests.server";
import { POLICY_FACTS, SUPPORT_EMAIL, policiesVisible } from "@/lib/legal/policies";
import { QuietGroup, QuietHeader, QuietNav, QuietPage } from "@/components/quiet/quiet";
import { AccountDeletionForm } from "@/components/account-deletion-form";
import "@/components/quiet/quiet.css";
import "./account-deletion.css";

const roleName = { OWNER: "Owner", MANAGER: "Manager", LEAD: "Lead", EMPLOYEE: "Employee" } as const;

/** Delete my account, for every role. Identity is the server session; the form asks for the password again.
 * Quiet (v4, inspection Oct 24): the same white page and grouped rows for every role, wording unchanged. */
export default async function DeleteAccountPage() {
  if (!policiesVisible()) notFound();
  const session = await requireSession();
  const existing = await activeDeletionRequest(session.id);
  const period = POLICY_FACTS.DELETION_COMPLETION_PERIOD;
  const retention = POLICY_FACTS.RETENTION_SCHEDULE;
  return (
    <QuietPage className="q-delete">
      <QuietNav back={{ href: "/app/profile", label: "Profile" }} />
      <QuietHeader title="Delete your NEVORA account" sub="Read what happens before you confirm." />
      <AccountDeletionForm
        account={{ name: `${session.firstName} ${session.lastName}`, role: roleName[session.role], employeeId: session.id }}
        period={period} retention={retention} existing={existing ? { kind: "duplicate", reference: existing.reference, confirmedAt: existing.confirmedAt } : null} />
      <QuietGroup id="deletion-workplace" label="Your job and your workplace">
        <div className="q-body q-deletion__effects">
          <p>Deleting your NEVORA account doesn’t end your employment or remove records your employer has to keep.</p>
          {session.role === "OWNER" ? <p>Your company’s workspace stays open for the rest of your team. To close it, email {SUPPORT_EMAIL}.</p> : null}
        </div>
      </QuietGroup>
    </QuietPage>
  );
}
