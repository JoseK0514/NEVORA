import { QuietSystemState } from "./quiet-system-state";

/** PD9 / UX10, T-21: an Owner-only page opened by someone else (a shared link, a bookmark) is the Quiet "Owners only"
 * state with Back to Home, in place of a silent move to Home. Permissions are unchanged: nothing on the page is read. */
export function OwnerOnlyNotice({ help = "Ask an Owner if you need a change here." }: { help?: string } = {}) {
  return <QuietSystemState kind="owners-only" sentence={help} />;
}
