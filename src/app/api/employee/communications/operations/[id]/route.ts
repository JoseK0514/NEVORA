import {communicationHttp} from '@/lib/communications/http.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{id:string}>}){return communicationHttp(request,'EMPLOYEE','operation',(await context.params).id);}
