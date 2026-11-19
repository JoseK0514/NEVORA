import {compensationRequest} from '@/lib/compensation/http.server';
import {employeeWages} from '@/lib/compensation/wages.server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = (request: Request) => compensationRequest(request, employeeWages);
