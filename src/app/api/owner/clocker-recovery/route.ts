import {POST as protectedReview} from '../../manager/clocker-recovery/route';
export const runtime='nodejs';export const dynamic='force-dynamic';
export async function POST(request:Request){return protectedReview(request);}
