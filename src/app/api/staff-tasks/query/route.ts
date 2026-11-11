import {staffTaskHttp} from '@/lib/staff-tasks/http.server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) { return staffTaskHttp(request, 'query'); }
