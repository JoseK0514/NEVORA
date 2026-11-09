import {runtimeRegistrationHandlers} from '@/lib/onboarding/registration-http.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return runtimeRegistrationHandlers().verify(request);}
