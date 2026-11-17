import { correctionJson, correctionResponseHeaders } from '@/lib/time-corrections/http.server';
import { knowledgeHttp } from '@/lib/owner-advisor/company-knowledge-http.server';
import { readKnowledgeVersion } from '@/lib/owner-advisor/company-knowledge.server';
import { AdvisorStore } from '@/lib/owner-advisor/store.server';
import { admitOwner } from '@/lib/owner-advisor/authority.server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = (request: Request, context: { params: Promise<{ documentId: string; versionId: string }> }) => knowledgeHttp(request, async (proof, ex) => {
  const { documentId, versionId } = await context.params;
  const version = await readKnowledgeVersion(new AdvisorStore(proof, await admitOwner(proof, ex), ex), documentId, versionId);
  if (request.headers.get('accept') === 'application/json') return correctionJson(version);
  const status = !version.publishedAt ? 'Unpublished draft' : version.archived || !version.current ? 'Historical version; not current guidance' : 'Published version; check effective dates before use';
  return new Response(`${version.title}\n${status}\nVersion: ${version.versionId}\nSHA-256 of source text: ${version.textDigest}\nPublished: ${version.publishedAt ?? 'never'}\nEffective from: ${version.effectiveFrom ?? 'unspecified'}\nEffective until: ${version.effectiveUntil ?? 'unspecified'}\nReview due (advisory): ${version.reviewDue ?? 'unspecified'}\n\nOwner-published guidance, not verified law or operational authorization.\n\n${version.body}\n`, { headers: { ...correctionResponseHeaders, 'Content-Type': 'text/plain; charset=utf-8', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'self'", 'X-Content-SHA256': version.textDigest } });
}, { navigation: true });
