import { getPublicWorkspaceName } from "@/lib/data/workspaces";
import { safeReturnTo } from "@/lib/notifications/destinations";
import { AUTH_COPY } from "@/lib/auth-copy";
import { readAuthLang } from "@/lib/auth-lang.server";
import { AuthShell } from "@/components/auth-premium/auth-shell";
import { ActivationInvitation } from "./activation-invitation";
import "../login/auth-premium.css";
import "../login/auth-signature.css";
import "./activation.css";

export default async function ActivatePage({ searchParams }: {
  searchParams: Promise<{ returnTo?: string | string[] }>;
}) {
  const params = await searchParams;
  const [workspaceName, lang] = await Promise.all([getPublicWorkspaceName(), readAuthLang()]);
  const t = AUTH_COPY[lang];
  const returnTo = typeof params.returnTo === "string" ? safeReturnTo(params.returnTo) : null;
  const returnQuery = returnTo ? "?returnTo=" + encodeURIComponent(returnTo) : "";
  const loginHref = "/login?activated=1" + (returnTo ? "&returnTo=" + encodeURIComponent(returnTo) : "");
  return <AuthShell lang={lang} t={t} variant="sub" back={"/login" + returnQuery}>
    <span className="ap-sr">{workspaceName ?? t.workspaceUnavailable}</span>
    <h1 className="ap-title">{t.activateTitle}</h1>
    <div className="activation-page">
      <p className="ap-intro">Open your email invitation, then choose a password.</p>
      <ActivationInvitation loginHref={loginHref} />
    </div>
  </AuthShell>;
}
