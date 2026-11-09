import {createEmployeeViewGet} from '@/lib/employee-view-route.server';
import {readEmployeeMessages} from '@/lib/data/employee-messages.server';
import {readNotificationConfig} from '@/lib/notifications/config';
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{view:string;selection:string}>}){
 const {view,selection}=await context.params;
 return createEmployeeViewGet('communications',proof=>readEmployeeMessages(proof,view,selection,readNotificationConfig(process.env).environment))(request);
}
