import {createEmployeeViewGet} from '@/lib/employee-view-route.server';
import {readEmployeeCreation} from '@/lib/data/employee-creation.server';
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{mode:string;sourceId:string}>}){
 const {mode,sourceId}=await context.params;
 return createEmployeeViewGet('creation',proof=>readEmployeeCreation(proof,undefined,mode,sourceId))(request);
}
