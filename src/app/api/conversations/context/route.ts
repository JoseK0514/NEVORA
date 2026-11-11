import {conversationHttp} from '@/lib/conversations/http.server';
export const runtime='nodejs';
export async function GET(request:Request){return conversationHttp(request,'context');}
