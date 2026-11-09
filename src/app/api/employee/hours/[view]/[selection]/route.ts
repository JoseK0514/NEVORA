import {createEmployeeViewGet} from '@/lib/employee-view-route.server';
import {readEmployeeHours} from '@/lib/data/employee-hours.server';
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{view:string;selection:string}>}){const {view,selection}=await context.params;return createEmployeeViewGet('hours',proof=>readEmployeeHours(proof,undefined,view,selection))(request);}
