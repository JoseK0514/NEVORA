import { passkeyHttp } from "@/lib/auth/passkeys/http.server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const GET = (request: Request) => passkeyHttp(request, "list");
