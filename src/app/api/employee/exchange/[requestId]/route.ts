import {createEmployeeViewGet} from '@/lib/employee-view-route.server';
import {readEmployeeExchange} from '@/lib/data/employee-exchange.server';
export const dynamic='force-dynamic';
export async function GET(request:Request,context:{params:Promise<{requestId:string}>}){
 const {requestId}=await context.params;
 return createEmployeeViewGet('exchange',proof=>readEmployeeExchange(proof,undefined,requestId))(request);
}
