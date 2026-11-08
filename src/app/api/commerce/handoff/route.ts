import { readSessionMutationProof } from "@/lib/auth/session";
import { readBillingOwnerBinding } from "@/lib/commerce/owner-binding";
import { commerceConnection, commerceEnabled } from "@/lib/commerce/access";
export async function POST(request: Request) {
  const reply = (code: string, status: number) =>
    Response.json(
      { error: { code } },
      { status, headers: { "cache-control": "no-store" } },
    );
  if (!commerceEnabled()) return reply("not_enabled", 404);
  if (
    !process.env.FUEL_PORTAL_ORIGIN ||
    request.headers.get("origin") !== process.env.FUEL_PORTAL_ORIGIN
  )
    return reply("origin_denied", 403);
  const proof = await readSessionMutationProof();
  if (proof?.employee.role !== "OWNER") return reply("owner_required", 403);
  try {
    const c = commerceConnection();
    const readBinding = () => readBillingOwnerBinding(proof, c);
    const binding = await readBinding();
    if (!binding) return reply("owner_required", 403);
    const response = await fetch(`${c.origin}/internal/handoff`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${c.secret}`,
        "x-nevora-installation": c.installationId,
      },
      signal: AbortSignal.timeout(5000),
      redirect: "error",
      cache: "no-store",
    });
    if (!response.ok) throw Error("unavailable");
    const result = await response.json();
    if (
      typeof result.handoff !== "string" ||
      !/^[A-Za-z0-9_-]{43}$/.test(result.handoff) ||
      result.businessId !== binding.business_id ||
      typeof result.url !== "string"
    )
      throw Error("invalid_handoff");
    const destination = new URL(result.url),
      trusted =
        process.env.NEVORA_COMMERCE_UI_ORIGIN ?? "https://www.thevelani.com";
    if (
      new URL(trusted).origin !== trusted ||
      (!trusted.startsWith("https://") &&
        !(
          process.env.NODE_ENV !== "production" &&
          new URL(trusted).protocol === "http:" &&
          ["localhost", "127.0.0.1"].includes(new URL(trusted).hostname)
        )) ||
      destination.origin !== trusted ||
      destination.pathname !== "/pages/plans" ||
      destination.search ||
      destination.hash !== `#handoff=${result.handoff}`
    )
      throw Error("invalid_handoff_destination");
    const current = await readBinding();
    if (!current || current.business_id !== binding.business_id)
      return reply("owner_required", 403);
    return Response.json(
      { url: destination.href },
      {
        headers: {
          "cache-control": "no-store",
          "referrer-policy": "no-referrer",
        },
      },
    );
  } catch {
    return reply("billing_unavailable", 503);
  }
}
