import {readFeatureFlags} from '../../../lib/feature-flags';
import { notFound } from "next/navigation";
import {
  requireSession,
  requireSessionMutationProof,
} from "@/lib/auth/session";
import { readOperationalAuthority } from "@/lib/company-access/operational-scope.server";
import { businessDate } from "@/lib/business-time";
import { weekStartFor } from "@/lib/date-utils";
import { getWorkspace } from "@/lib/data/workspaces";
import { OwnerAdvisor } from "@/components/owner-advisor/advisor";
import { ManagerRondo } from "@/components/owner-advisor/manager/manager-rondo";
import { readPageLang } from '@/lib/i18n/page-lang.server';
import { ROUTE_COPY } from '../route-copy';
export async function generateMetadata() { return { title: ROUTE_COPY[await readPageLang()].rondo }; }
/* Rondo AI. An Owner with company-wide authority gets the Owner adviser. A Manager gets the Manager view when both the
 * adviser's switch and the Manager switch are on (contract docs/handoffs/2026-11-18-rondo-manager-ui-contract.md); the
 * Manager API checks the Manager's current locations on every read, so this page only opens the door and names the
 * company's current week. Everyone else gets not found, as before. */
export default async function AiManagerPage() {
  const session = await requireSession();
  const flags = readFeatureFlags(process.env);
  if (session.role === "MANAGER") {
    if (!flags.ownerAdvisor || !flags.managerAdvisor) notFound();
    const workspace = await getWorkspace();
    return <ManagerRondo timeZone={workspace.timeZone} currentWeek={weekStartFor(businessDate(new Date(), workspace.timeZone))} />;
  }
  if (
    session.role !== "OWNER" ||
    !flags.ownerAdvisor
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
  return <OwnerAdvisor tools={{ weekly: flags.ownerAdvisorWeekly, knowledge: flags.ownerAdvisorKnowledge, business: flags.ownerAdvisorBusinessImports }} />;
}
