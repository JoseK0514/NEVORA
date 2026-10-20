import { passkeyHttp } from "@/lib/auth/passkeys/http.server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const POST = (request: Request) => passkeyHttp(request, "register_verify");
