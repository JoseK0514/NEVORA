import {conversationHttp} from '@/lib/conversations/http.server';
export const runtime='nodejs';
export async function POST(request:Request){return conversationHttp(request,'history');}
