import {workspaceCookies as cookies} from "@/lib/workspace-routing/cookies.server";
import { neonNotificationExecutor } from '@/lib/data/notification-transactions';
import { clockerSecurity } from '@/lib/clocker/setup.server';
import { handleClockerPunch } from '@/lib/clocker/punch-transport.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request,{params}:{params:Promise<{location:string}>}){
 const {location}=await params;
 return handleClockerPunch(request,location,{cookies:await cookies(),executor:neonNotificationExecutor(),
  security:await clockerSecurity(),enabled:process.env.NEVORA_CLOCKER_PUNCH_ENABLED==='true'});
}
