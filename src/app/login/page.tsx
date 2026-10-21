import Link from "next/link";
import { getPublicWorkspaceName } from "@/lib/data/workspaces";
import { safeReturnTo } from "@/lib/notifications/destinations";
import { login } from "@/app/login/actions";
import { AUTH_COPY } from "@/lib/auth-copy";
import { readAuthLang } from "@/lib/auth-lang.server";
import { AuthShell, WorkspaceEyebrow } from "@/components/auth-premium/auth-shell";
import { Greeting } from "@/components/auth-premium/greeting";
import { PasswordInput } from "@/components/auth-premium/password-input";
import { PasskeySlot, PasswordSignInMarker } from "@/components/auth-premium/passkey-slot";
import { LoginSubmit } from "./login-submit";
import "./auth-premium.css";
import "./auth-signature.css";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; activated?: string; returnTo?: string | string[] }>;
}) {
  const params = await searchParams;
  const [workspaceName, lang] = await Promise.all([getPublicWorkspaceName(), readAuthLang()]);
  const t = AUTH_COPY[lang];
  const returnTo = typeof params.returnTo === "string" ? safeReturnTo(params.returnTo) : null;
  const returnQuery = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
  const errorId = params.error ? "login-error" : undefined;

  return (
    <AuthShell lang={lang} t={t} variant="signin" bandTitle={<><Greeting words={t.greeting} as="p" className="ap-band__greet" /><span className="ap-band__ws">{workspaceName ?? t.workspaceUnavailable}</span></>}>
      <WorkspaceEyebrow name={workspaceName ?? t.workspaceUnavailable} />
      <Greeting words={t.greeting} />
      <p className="ap-subtitle">{t.signInSubtitle}</p>

      {params.error ? (
        <p className="ap-alert" data-tone="error" id="login-error" role="alert">{params.error === "deleting" ? t.loginDeleting : params.error === "busy" ? t.loginBusy : t.loginError}</p>
      ) : null}
      {params.activated ? (
        <p className="ap-alert" data-tone="done" role="status">{t.activated}</p>
      ) : null}

      {/* Signature (phase 4): on phones Face ID leads; on wider screens it stays under Sign in. */}
      <div className="ap-lead-only"><PasskeySlot t={t} lead /></div>
      <form action={login} className="ap-form" data-invalid={params.error ? "" : undefined}>
        {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
        <PasswordSignInMarker />
        <div className="ap-field">
          <label className="ap-label" htmlFor="login-employee-id">{t.employeeId}</label>
          <div className="ap-box">
            <input id="login-employee-id" className="ap-input" name="employeeId" placeholder={t.employeeIdPlaceholder}
              autoComplete="username" autoCapitalize="none" spellCheck={false} aria-describedby={errorId} required />
          </div>
        </div>
        {/* Forgot access? shows in the label row but follows the password field, so Tab goes ID, password, Forgot. */}
        <div className="ap-field ap-field--aside">
          <label className="ap-label" htmlFor="login-password">{t.password}</label>
          <PasswordInput id="login-password" name="password" placeholder={t.passwordPlaceholder} autoComplete="current-password"
            aria-describedby={errorId} required showLabel={t.showPassword} hideLabel={t.hidePassword} />
          <Link className="ap-aside-link ap-wide" href="/forgot-access">{t.forgotAccess}</Link>
        </div>
        <LoginSubmit idle={t.signIn} busy={t.signingIn} />
      </form>
      <div className="ap-follow-only"><PasskeySlot t={t} /></div>

      <div className="ap-links">
        <p className="ap-narrow"><Link className="ap-link" href="/forgot-access">{t.forgotAccess}</Link></p>
        <p className="ap-alt">{t.newEmployee} <Link className="ap-link" href={`/activate${returnQuery}`}>{t.activateYourAccount}</Link></p>
      </div>
    </AuthShell>
  );
}
