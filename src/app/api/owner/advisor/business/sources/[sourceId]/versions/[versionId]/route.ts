import { businessHttp } from '@/lib/owner-advisor/business/http.server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = (request: Request, context: { params: Promise<{ sourceId: string; versionId: string }> }) => businessHttp(request, context);
