import {communicationHttp} from '@/lib/communications/http.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export function GET(request:Request){return communicationHttp(request,'EMPLOYEE','context');}
