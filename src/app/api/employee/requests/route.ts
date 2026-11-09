import {createEmployeeViewGet} from '@/lib/employee-view-route.server';
import {readEmployeeRequests} from '@/lib/data/employee-requests.server';
export const dynamic='force-dynamic';
export const GET=createEmployeeViewGet('requests',readEmployeeRequests);
