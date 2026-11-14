import {staffTaskHttp} from '@/lib/staff-tasks/http.server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request: Request, context: {params: Promise<{operationId: string}>}) { return staffTaskHttp(request, 'operation', (await context.params).operationId); }
