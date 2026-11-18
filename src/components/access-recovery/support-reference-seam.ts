/* The one seam between the screens and the support-reference reader (contract B10, Nov 16, 2026; switched on Nov 17).
 *
 * `src/lib/support-reference.ts` reads X-Nevora-Request-Id from that one response and returns it only when it is a UUID.
 * The callers pass only the failed response and bind the result to that one failure. */
import { readSupportReference } from "@/lib/support-reference";
export type SupportReferenceReader = (response: Pick<Response, "headers">) => string | null;

export { readSupportReference };

/** The reference of one failed response, or null. Never throws, never keeps anything between calls, and never falls
 * back to another kind of ID (an operation, a `DEL-…` deletion reference). Only failures are read: a success has none. */
export function supportReferenceOf(response: Pick<Response, "headers" | "ok"> | null | undefined, read: SupportReferenceReader = readSupportReference): string | null {
  if (!response || response.ok) return null;
  try { return shown(read(response)); } catch { return null; }
}

/** The block shows a UUID or nothing: the reader validates too, and this keeps a wrong value off the screen. */
const UUID = /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;
export function shown(reference: string | null | undefined): string | null {
  return typeof reference === "string" && UUID.test(reference) ? reference : null;
}

/** A server action has no response headers, so a reference can only arrive as a field of its returned state. Deletion's
 * action puts `supportReference` on its failed and uncertain states; this reads it, validated. Anything else answers null. */
export function supportReferenceOfState(state: unknown): string | null {
  if (!state || typeof state !== "object" || !("supportReference" in state)) return null;
  return shown((state as { supportReference?: unknown }).supportReference as string | null | undefined);
}
