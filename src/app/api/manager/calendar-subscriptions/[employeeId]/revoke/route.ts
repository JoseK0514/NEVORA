import {managerCalendarRevokeHandler} from '@/lib/calendar/http.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request,context:{params:Promise<{employeeId:string}>}){return managerCalendarRevokeHandler(request,(await context.params).employeeId);}
