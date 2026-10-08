import {createEmployeeViewGet} from '@/lib/employee-view-route.server';
import {readEmployeeProfile} from '@/lib/data/employee-profile.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const GET=createEmployeeViewGet('profile',readEmployeeProfile);
