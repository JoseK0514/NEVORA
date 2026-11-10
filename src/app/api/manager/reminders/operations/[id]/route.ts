import {managerReminderHttp} from '@/lib/manager-reminders/http.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){return managerReminderHttp(request,(await params).id);}
