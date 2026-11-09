import {runtimeProvisioningHandlers} from '@/lib/onboarding/provisioning/http.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function POST(request:Request){return runtimeProvisioningHandlers().request(request);}
