import { correctionJson } from '@/lib/time-corrections/http.server';
import { companyKnowledgeService } from '@/lib/owner-advisor/company-knowledge.server';
import { knowledgeHttp } from '@/lib/owner-advisor/company-knowledge-http.server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const handle = (request: Request, write: boolean) => knowledgeHttp(request, async (proof, ex, signal, value) => correctionJson(await companyKnowledgeService(proof, ex, signal, value)), { write });
export const GET = (request: Request) => handle(request, false);
export const POST = (request: Request) => handle(request, true);
