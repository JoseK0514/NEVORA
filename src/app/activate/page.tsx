import {mobileAccessMetadata} from "@/components/mobile-access/metadata.server";
import {mobileAccessEnabled} from "@/components/mobile-access/config.server";
import { getPublicWorkspaceName } from "@/lib/data/workspaces";
import { safeReturnTo } from "@/lib/notifications/destinations";
import { AUTH_COPY } from "@/lib/auth-copy";
import { readAuthLang } from "@/lib/auth-lang.server";
import { QuietAuthShell } from "@/components/auth-premium/auth-shell";
import { ActivationInvitation } from "./activation-invitation";
import * as sessions from "@/lib/auth/session";

/** Who is signed in on this device, for one line of guidance. Presentation only, so it never throws: any failure to
 * read (no request scope, no session store) just leaves the line out. */
async function deviceSession() {
  try { return await sessions.getSession(); } catch { return null; }
}
import "../login/auth-premium.css";
import "../login/auth-signature.css";
import "./activation.css";

/** Account activation in the Signature sign-in frame. The invitation flow and its wording are development's. */
export default async function ActivatePage({ searchParams }: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const params = await searchParams;
  // U11 (Nov 17, 2026): if someone is already signed in on this device, the page says so (their own first name, read from
  // the session this browser already holds). Presentation only: a failed read just leaves the line out.
  const [workspaceName, lang, session] = await Promise.all([getPublicWorkspaceName(), readAuthLang(), deviceSession()]);
  const otherSession = session ? (session.firstName?.trim() || true) : null;
  const returnTo = typeof params.returnTo === "string" ? safeReturnTo(params.returnTo) : null;
  const returnQuery = returnTo ? `returnTo=${encodeURIComponent(returnTo)}` : "";

  return <QuietAuthShell helpFrom="activate" lang={lang} t={AUTH_COPY[lang]} back={`/login${returnQuery ? `?${returnQuery}` : ""}`}>
    <ActivationInvitation otherSession={otherSession} mobileAccess={mobileAccessEnabled()} lang={lang} workspaceName={workspaceName} loginHref={`/login?activated=1${returnQuery ? `&${returnQuery}` : ""}`} />
  </QuietAuthShell>;
}

export const generateMetadata=()=>mobileAccessMetadata("activate");
