import {nativeRegistrationHandlers} from '@/lib/native-push/enrollment';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export function POST(request: Request): Promise<Response> {return nativeRegistrationHandlers().complete(request);}
