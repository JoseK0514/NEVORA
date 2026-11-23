import { readPageLang } from "@/lib/i18n/page-lang.server";
import { ACCOUNT_COPY } from "@/components/account-copy";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { activeDeletionRequest } from "@/lib/account-deletion/requests.server";
import { POLICY_FACTS, policiesVisible } from "@/lib/legal/policies";
import { AccountDeletionForm } from "@/components/account-deletion-form";
import { getWorkspace } from "@/lib/data/workspaces";
import "./account-deletion.css";

export async function generateMetadata() { return { title: ACCOUNT_COPY[await readPageLang()].deleteAccount }; }

/** Delete my account, for every role. Identity is the server session; the form asks for the password again.
 * Phase 2 (Nov 23, 2026): every role gets the same Direction B screen from the same client owner; Owners and Managers
 * add their workspace sentence and the last-Owner card (account-deletion-form.tsx). */
export default async function DeleteAccountPage() {
  if (!policiesVisible()) notFound();
  const session = await requireSession();
  const lang = await readPageLang();
  const [existing, workplaceName] = await Promise.all([activeDeletionRequest(session.id), getWorkspace().then(workspace => workspace.name).catch(() => null)]);
  return <AccountDeletionForm
    account={{ name: `${session.firstName} ${session.lastName}`, role: ACCOUNT_COPY[lang].roles[session.role], roleKey: session.role, employeeId: session.id }}
    period={POLICY_FACTS.DELETION_COMPLETION_PERIOD} retention={POLICY_FACTS.RETENTION_SCHEDULE} owner={session.role === "OWNER"}
    existing={existing ? { kind: "duplicate", reference: existing.reference, confirmedAt: existing.confirmedAt } : null} workplaceName={workplaceName} lang={lang} />;
}
