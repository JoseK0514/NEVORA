import {workspaceCookies as cookies} from "@/lib/workspace-routing/cookies.server";
import {neonNotificationExecutor} from '@/lib/data/notification-transactions';
import {clockerSecurity} from '@/lib/clocker/setup.server';
import {handleClockerReviewRequest} from '@/lib/clocker/review-transport.server';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(request:Request,{params}:{params:Promise<{location:string}>}){return handleClockerReviewRequest(request,(await params).location,{cookies:await cookies(),executor:neonNotificationExecutor(),security:await clockerSecurity()});}
