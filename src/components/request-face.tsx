import type { CSSProperties } from "react";
import { faceTint } from "@/lib/face-tint";

/** Phase 8 (a.md #12): a request row's 36px face in the person's own tint, the one BAvatar and CorpAvatar draw from the
 * name, so James is the same purple on Time off requests and Shift requests as on Home, Things to do and Team. The
 * request sheet (owner-b-requests.css) paints it from the two custom properties. */
export function RequestFace({ name, initials }: { name: string; initials: string }) {
  const [bg, fg] = faceTint(name);
  return <span className="q-av" data-tint="" style={{ "--av-bg": bg, "--av-fg": fg } as CSSProperties} aria-hidden="true">{initials}</span>;
}
