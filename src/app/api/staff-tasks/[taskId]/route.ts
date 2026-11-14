import {staffTaskHttp} from '@/lib/staff-tasks/http.server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: {params: Promise<{taskId: string}>}) { return staffTaskHttp(request, 'read', (await context.params).taskId); }
