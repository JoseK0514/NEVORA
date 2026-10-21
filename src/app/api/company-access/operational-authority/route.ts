import {scopeHttp} from '@/lib/company-access/scope-http.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){return scopeHttp(request,'authority');}
