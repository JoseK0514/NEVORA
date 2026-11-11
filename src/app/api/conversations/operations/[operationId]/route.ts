import {conversationHttp} from '@/lib/conversations/http.server';
export const runtime='nodejs';
export async function POST(request:Request,context:{params:Promise<{operationId:string}>}){return conversationHttp(request,'operation',(await context.params).operationId);}
