import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { activeDeletionRequest } from "@/lib/account-deletion/requests.server";
import { POLICY_FACTS, SUPPORT_EMAIL, policiesVisible } from "@/lib/legal/policies";
import { GuideCard, SettingsFrame } from "@/app/app/settings/wave-c-kit";
import { AccountDeletionForm } from "@/components/account-deletion-form";
import "./account-deletion.css";

const roleName = { OWNER: "Owner", MANAGER: "Manager", LEAD: "Lead", EMPLOYEE: "Employee" } as const;

/** Delete my account, for every role. Identity is the server session; the form asks for the password again. */
export default async function DeleteAccountPage() {
  if (!policiesVisible()) notFound();
  const session = await requireSession();
  const existing = await activeDeletionRequest(session.id);
  const period = POLICY_FACTS.DELETION_COMPLETION_PERIOD;
  const retention = POLICY_FACTS.RETENTION_SCHEDULE;
  return (
    <SettingsFrame back={{ href: "/app/profile", label: "Profile" }} width="narrow"
      title="Delete your NEVORA account" summary="Read what happens before you confirm."
      aside={<GuideCard title="Your job and your workplace">
        <p>Deleting your NEVORA account doesn’t end your employment or remove records your employer has to keep.</p>
        {session.role === "OWNER" ? <p>Your company’s workspace stays open for the rest of your team. To close it, email {SUPPORT_EMAIL}.</p> : null}
      </GuideCard>}>
      <AccountDeletionForm
        account={{ name: `${session.firstName} ${session.lastName}`, role: roleName[session.role], employeeId: session.id }}
        period={period} retention={retention} existing={existing ? { kind: "duplicate", reference: existing.reference, confirmedAt: existing.confirmedAt } : null} />
    </SettingsFrame>
  );
}
