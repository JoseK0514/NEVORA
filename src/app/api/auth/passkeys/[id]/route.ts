import { passkeyHttp } from "@/lib/auth/passkeys/http.server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return passkeyHttp(request, "remove", (await context.params).id);
}
