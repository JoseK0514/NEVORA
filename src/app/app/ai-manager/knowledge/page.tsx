import { notFound } from "next/navigation";
import { readFeatureFlags } from "@/lib/feature-flags";
import { requireSession, requireSessionMutationProof } from "@/lib/auth/session";
import { readOperationalAuthority } from "@/lib/company-access/operational-scope.server";
import { getWorkspace } from "@/lib/data/workspaces";
import { KnowledgePage } from "@/components/owner-advisor/knowledge/knowledge-page";
import { viewFromParams } from "@/components/owner-advisor/knowledge/views";

import { readPageLang } from '@/lib/i18n/page-lang.server';
import { copy as pageWording } from './page-copy';

export async function generateMetadata() {
  return { title: pageWording[await readPageLang()].knowledge };
}

/* Rondo's company knowledge: the same door as the AI manager (a company-wide Owner with the adviser on). The knowledge
 * API checks Owner and company authority itself on every read and write; this page holds no knowledge text. The editor
 * works without model credentials: retrieval for answers is a separate backend flag. */
export default async function CompanyKnowledgePage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const session = await requireSession();
  if (session.role !== "OWNER" || !readFeatureFlags(process.env).ownerAdvisor) notFound();
  const authority = await readOperationalAuthority(await requireSessionMutationProof());
  if (authority.state !== "ready" || authority.role !== "OWNER" || authority.scope?.mode !== "COMPANY") notFound();
  const [workspace, params] = await Promise.all([getWorkspace(), searchParams]);
  return <KnowledgePage timeZone={workspace.timeZone} view={viewFromParams(params)} />;
}
