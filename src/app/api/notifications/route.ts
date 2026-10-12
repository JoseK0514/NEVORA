import {createPortalNotificationViewGet} from '@/lib/employee-view-route.server';
import {readPortalNotificationList} from '@/lib/data/portal-notification-list.server';
import {readNotificationConfig} from '@/lib/notifications/config';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const GET=createPortalNotificationViewGet(proof=>readPortalNotificationList(proof,readNotificationConfig(process.env).environment));
