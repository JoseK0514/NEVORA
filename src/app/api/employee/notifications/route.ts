import {createEmployeeViewGet} from '@/lib/employee-view-route.server';
import {readEmployeeNotificationList} from '@/lib/data/employee-notification-list.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const GET=createEmployeeViewGet('notifications',proof=>readEmployeeNotificationList(proof,process.env.PUSH_ENVIRONMENT));
