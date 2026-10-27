import {createEmployeeViewGet} from '@/lib/employee-view-route.server';
import {readEmployeeMessageDestination} from '@/lib/data/employee-message-destination.server';
import {readNotificationConfig} from '@/lib/notifications/config';
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{id:string}>}){
 const {id}=await context.params;return createEmployeeViewGet('communications',proof=>readEmployeeMessageDestination(proof,id,readNotificationConfig(process.env).environment))(request);
}
