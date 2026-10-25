import { notFound } from "next/navigation";
import {
  requireSession,
  requireSessionMutationProof,
} from "@/lib/auth/session";
import { readOperationalAuthority } from "@/lib/company-access/operational-scope.server";
import { OwnerAdvisor } from "@/components/owner-advisor/advisor";
import { OwnersOnlyState } from "@/components/quiet-system-state";
export const metadata = { title: "AI manager" };
export default async function AiManagerPage() {
  const session = await requireSession();
  if (process.env.NEVORA_OWNER_ADVISOR_ENABLED !== "true") notFound();
  // UX-E-47: with the feature on, anyone else sees "Owners only" with Back to Home.
  if (session.role !== "OWNER") return <OwnersOnlyState />;
  const authority = await readOperationalAuthority(
    await requireSessionMutationProof(),
  );
  if (
    authority.state !== "ready" ||
    authority.role !== "OWNER" ||
    authority.scope?.mode !== "COMPANY"
  )
    notFound();
  return <OwnerAdvisor />;
}
