import {communicationHttp} from '@/lib/communications/http.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request){return communicationHttp(request,'MANAGER','list');}
export async function POST(request:Request){return communicationHttp(request,'MANAGER','command');}
