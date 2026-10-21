import {invitationHttp} from '@/lib/company-access/invitation-http.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{operationId:string}>}){return invitationHttp(request,'operation',(await params).operationId);}
