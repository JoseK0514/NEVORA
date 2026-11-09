import {workspaceCookies as cookies} from "@/lib/workspace-routing/cookies.server";
import { neonNotificationExecutor } from '@/lib/data/notification-transactions';
import { clockerSecurity } from '@/lib/clocker/setup.server';
import { handleClockerPin } from '@/lib/clocker/pin-transport.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request,{params}:{params:Promise<{location:string}>}){
 const {location}=await params;
 return handleClockerPin(request,location,{cookies:await cookies(),executor:neonNotificationExecutor(),security:await clockerSecurity()});
}
