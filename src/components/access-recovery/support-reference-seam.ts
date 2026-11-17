/* Bind each failed response to its own validated, content-free diagnostic header. */
import { readSupportReference } from "@/lib/support-reference";
export { readSupportReference } from "@/lib/support-reference";
export type SupportReferenceReader = (response: Pick<Response, "headers">) => string | null;


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
 * action does not carry one today; when Codex adds `supportReference` to a failed state this reads it, validated, with no
 * change here. Anything else answers null. */
export function supportReferenceOfState(state: unknown): string | null {
  if (!state || typeof state !== "object" || !("supportReference" in state)) return null;
  return shown((state as { supportReference?: unknown }).supportReference as string | null | undefined);
}
