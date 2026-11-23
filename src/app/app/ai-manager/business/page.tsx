import { notFound } from "next/navigation";
import { readFeatureFlags } from "@/lib/feature-flags";
import { requireSession, requireSessionMutationProof } from "@/lib/auth/session";
import { readOperationalAuthority } from "@/lib/company-access/operational-scope.server";
import { getWorkspace } from "@/lib/data/workspaces";
import { BusinessPage } from "@/components/owner-advisor/business/business-page";
import { viewFromParams } from "@/components/owner-advisor/business/views";
import { readPageLang } from '@/lib/i18n/page-lang.server';
import { ROUTE_COPY } from '../../route-copy';

export async function generateMetadata() { return { title: ROUTE_COPY[await readPageLang()].businessRecords }; }

/* Rondo's business records (contract: docs/handoffs/2026-11-16-rondo-business-evidence-ui-contract.md and the Nov 17
 * answers, question 8). The same door as the AI manager and company knowledge: a company-wide Owner with the adviser on.
 * This page holds no business data: the API checks Owner and company authority itself on every read and write, and with
 * the imports switch off the screen asks for no list at all (it keeps only the check of a change made earlier). */
export default async function BusinessRecordsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireSession();
  const flags = readFeatureFlags(process.env);
  if (session.role !== "OWNER" || !flags.ownerAdvisor) notFound();
  const authority = await readOperationalAuthority(await requireSessionMutationProof());
  if (authority.state !== "ready" || authority.role !== "OWNER" || authority.scope?.mode !== "COMPANY") notFound();
  const [workspace, params] = await Promise.all([getWorkspace(), searchParams]);
  return <BusinessPage timeZone={workspace.timeZone} view={viewFromParams(params)} importsEnabled={flags.ownerAdvisorBusinessImports} retrievalEnabled={flags.ownerAdvisorBusinessRetrieval} />;
}
