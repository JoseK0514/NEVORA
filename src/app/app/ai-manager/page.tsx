import { notFound } from "next/navigation";
import {
  requireSession,
  requireSessionMutationProof,
} from "@/lib/auth/session";
import { readOperationalAuthority } from "@/lib/company-access/operational-scope.server";
import { OwnerAdvisor } from "@/components/owner-advisor/advisor";
export const metadata = { title: "AI manager" };
export default async function AiManagerPage() {
  const session = await requireSession();
  if (
    session.role !== "OWNER" ||
    process.env.NEVORA_OWNER_ADVISOR_ENABLED !== "true"
  )
    notFound();
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
