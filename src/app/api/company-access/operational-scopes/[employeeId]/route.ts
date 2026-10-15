import {scopeHttp} from '@/lib/company-access/scope-http.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
type Context={params:Promise<{employeeId:string}>};
export async function GET(request:Request,{params}:Context){return scopeHttp(request,'status',(await params).employeeId);}
export async function POST(request:Request,{params}:Context){return scopeHttp(request,'command',(await params).employeeId);}
