import {createEmployeeViewGet} from '@/lib/employee-view-route.server';
import {readEmployeePlanning} from '@/lib/data/employee-planning.server';
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{view:string;selection:string}>}){
 const {view,selection}=await context.params;
 return createEmployeeViewGet('planning',proof=>readEmployeePlanning(proof,undefined,view,selection))(request);
}
