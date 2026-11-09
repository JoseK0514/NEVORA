import {runtimeProvisioningHandlers} from '@/lib/onboarding/provisioning/http.server';
export const runtime='nodejs';
export const dynamic='force-dynamic';
export async function GET(request:Request,{params}:{params:Promise<{operationId:string}>}){return runtimeProvisioningHandlers().read(request,(await params).operationId);}
