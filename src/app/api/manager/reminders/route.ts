import {managerReminderHttp} from '@/lib/manager-reminders/http.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return managerReminderHttp(request);}
