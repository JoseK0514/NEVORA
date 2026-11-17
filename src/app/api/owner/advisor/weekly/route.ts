import { weeklyHttp } from '@/lib/owner-advisor/weekly-http.server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = (request: Request) => weeklyHttp(request);
