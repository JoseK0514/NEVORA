import {createRestrictionPost} from '@/lib/scheduling/restrictions-route.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export const POST=createRestrictionPost('management');
