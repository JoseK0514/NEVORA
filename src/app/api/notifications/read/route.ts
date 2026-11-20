import {createManagementNotificationReadPost} from '@/lib/employee-view-route.server';
import {markManagementNotificationRead} from '@/lib/data/portal-notification-list.server';
import {readClockerFaceAlert} from '@/lib/clocker/face-verification/open-alert.server';
import {readNotificationConfig} from '@/lib/notifications/config';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const POST=createManagementNotificationReadPost(async(proof,id)=>id.startsWith('clocker-face-')?Boolean(await readClockerFaceAlert(proof,id,true)):markManagementNotificationRead(proof,id,readNotificationConfig(process.env).environment));
