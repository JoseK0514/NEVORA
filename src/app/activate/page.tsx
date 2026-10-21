import { getPublicWorkspaceName } from "@/lib/data/workspaces";
import { safeReturnTo } from "@/lib/notifications/destinations";
import { AUTH_COPY } from "@/lib/auth-copy";
import { readAuthLang } from "@/lib/auth-lang.server";
import { AuthShell } from "@/components/auth-premium/auth-shell";
import { ActivationInvitation } from "./activation-invitation";
import "../login/auth-premium.css";
import "../login/auth-signature.css";
import "./activation.css";

/** Account activation in the Signature sign-in frame. The invitation flow and its wording are development's. */
export default async function ActivatePage({ searchParams }: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const params = await searchParams;
  const [workspaceName, lang] = await Promise.all([getPublicWorkspaceName(), readAuthLang()]);
  const returnTo = typeof params.returnTo === "string" ? safeReturnTo(params.returnTo) : null;
  const returnQuery = returnTo ? `returnTo=${encodeURIComponent(returnTo)}` : "";

  return <AuthShell lang={lang} t={AUTH_COPY[lang]} variant="sub" back={`/login${returnQuery ? `?${returnQuery}` : ""}`}>
    <ActivationInvitation workspaceName={workspaceName} loginHref={`/login?activated=1${returnQuery ? `&${returnQuery}` : ""}`} />
  </AuthShell>;
}
