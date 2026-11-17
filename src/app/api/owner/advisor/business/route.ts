import { businessHttp } from '@/lib/owner-advisor/business/http.server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const GET = (request: Request) => businessHttp(request);
export const POST = (request: Request) => businessHttp(request);
