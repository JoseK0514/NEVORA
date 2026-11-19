import {compensationRequest} from '@/lib/compensation/http.server';
import {draftLaborCost} from '@/lib/compensation/labor-cost.server';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const POST = (request:Request) => compensationRequest(request,draftLaborCost);
