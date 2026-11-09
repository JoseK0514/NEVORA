import {nativeRegistrationHandlers} from '@/lib/native-push/enrollment';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function POST(request: Request): Promise<Response> {return (await nativeRegistrationHandlers()).complete(request);}
