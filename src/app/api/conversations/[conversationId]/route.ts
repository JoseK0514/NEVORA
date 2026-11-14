import {conversationHttp} from '@/lib/conversations/http.server';
export const runtime='nodejs';
export async function POST(request:Request,context:{params:Promise<{conversationId:string}>}){return conversationHttp(request,'detail',(await context.params).conversationId);}
