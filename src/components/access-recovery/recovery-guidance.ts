import type { AccessCopy } from "./copy";

/* AccountRecovery decides each outcome and names it with one of its own English sentences (the tests pin them). This
 * maps the sentence on screen to the typed state the contract names (B11), so the next step under it can be written in
 * the page's language without learning anything about the account. Unknown sentences get no extra line. */
export const OFFLINE_MESSAGE = "You’re offline. Nothing was sent.";

export type RecoveryIssue = keyof AccessCopy["recovery"]["next"] | "offline" | "uncertain";

export function recoveryIssue(kind: "request" | "reset", message: string): RecoveryIssue | null {
  if (!message) return null;
  if (message === OFFLINE_MESSAGE) return "offline";
  if (message === "Passwords do not match.") return "mismatch";
  if (message.startsWith("This recovery code")) return "invalidCode";
  if (message.startsWith("The reset outcome")) return "uncertain";
  if (message.startsWith("Your access ended")) return "ended";
  if (message.startsWith("Recovery is unavailable")) return "requestUnavailable";
  if (message.startsWith("Recovery could not be confirmed")) return kind === "reset" ? "resetUnavailable" : "requestFailed";
  return null;
}

/** The sentence under the refusal that says what to do next, or null. A lost reset reply has none of its own: its
 * message already says to try signing in first, and the screen offers that link. */
export function recoveryNext(copy: AccessCopy, kind: "request" | "reset", message: string): string | null {
  const issue = recoveryIssue(kind, message);
  return !issue || issue === "offline" || issue === "uncertain" ? null : copy.recovery.next[issue];
}
