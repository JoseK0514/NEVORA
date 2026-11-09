import {createManagementNotificationReadPost} from '@/lib/employee-view-route.server';
import {markManagementNotificationRead} from '@/lib/data/portal-notification-list.server';
import {readNotificationConfig} from '@/lib/notifications/config';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const POST=createManagementNotificationReadPost((proof,id)=>markManagementNotificationRead(proof,id,readNotificationConfig(process.env).environment));
