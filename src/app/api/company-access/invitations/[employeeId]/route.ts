import {invitationHttp} from '@/lib/company-access/invitation-http.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Context={params:Promise<{employeeId:string}>};
export async function GET(request:Request,{params}:Context){return invitationHttp(request,'status',(await params).employeeId);}
export async function POST(request:Request,{params}:Context){return invitationHttp(request,'command',(await params).employeeId);}
