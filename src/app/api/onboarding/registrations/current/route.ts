import {runtimeProvisioningHandlers} from '@/lib/onboarding/provisioning/http.server';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(request:Request){return runtimeProvisioningHandlers().current(request);}
