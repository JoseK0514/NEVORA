import {createStaffingReadPost} from '@/lib/time-off-staffing/route.server';
import {readLeaveStaffing} from '@/lib/time-off-staffing/service.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const POST=createStaffingReadPost('employee',readLeaveStaffing);
