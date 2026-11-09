import {runtimeOwnerActivationHandlers} from '@/lib/onboarding/owner-activation-http.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return runtimeOwnerActivationHandlers().grant(request);}
