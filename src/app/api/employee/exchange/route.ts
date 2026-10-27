import {createEmployeeViewGet} from '@/lib/employee-view-route.server';
import {readEmployeeExchange} from '@/lib/data/employee-exchange.server';
export const dynamic='force-dynamic';
export const GET=createEmployeeViewGet('exchange',readEmployeeExchange);
