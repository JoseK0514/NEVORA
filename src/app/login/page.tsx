import {mobileAccessMetadata} from "@/components/mobile-access/metadata.server";
import Link from "next/link";
import {mobileAccessEnabled} from "@/components/mobile-access/config.server";
import {MOBILE_ACCESS_COPY} from "@/components/mobile-access/copy";
import {AccessEmployeeIdInput} from "@/components/mobile-access/journey";
import {CaretRightIcon} from "@phosphor-icons/react/dist/ssr/CaretRight";
import { getPublicWorkspaceName } from "@/lib/data/workspaces";
import { safeReturnTo } from "@/lib/notifications/destinations";
import { login } from "@/app/login/actions";
import { AUTH_COPY } from "@/lib/auth-copy";
import { readAuthLang } from "@/lib/auth-lang.server";
import { QuietAuthShell } from "@/components/auth-premium/auth-shell";
import { Greeting } from "@/components/auth-premium/greeting";
import { PasswordInput } from "@/components/auth-premium/password-input";
import { PasskeySlot, PasswordSignInMarker } from "@/components/auth-premium/passkey-slot";
import "@/components/quiet/quiet.css";
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
  const t = AUTH_COPY[lang], mobile=mobileAccessEnabled(), mt=MOBILE_ACCESS_COPY[lang];
  const returnTo = typeof params.returnTo === "string" ? safeReturnTo(params.returnTo) : null;
  const returnQuery = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
  const errorId = params.error ? "login-error" : undefined;

  // Quiet (v4, approved Oct 23): the wordmark and Español, the greeting and the workspace, two fields, Sign in, Face ID,
  // then Forgot access? and Activate account on one line.
  return (
    <QuietAuthShell lang={lang} t={t}>
      <div className="q-hd q-auth__hd"><Greeting words={t.greeting} className="" mobileTitle={mobile ? mt.signInTitle : undefined}/><p>{workspaceName ?? t.workspaceUnavailable}</p></div>
      {params.error ? <p className="q-error q-auth__alert" id="login-error" role="alert">{params.error === "deleting" ? t.loginDeleting : params.error === "busy" ? t.loginBusy : t.loginError}</p> : null}
      {params.activated ? <p className="q-help q-auth__alert" role="status">{t.activated}</p> : null}
      <form action={login} className="q-auth__form" data-invalid={params.error ? "" : undefined}>
        {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
        <PasswordSignInMarker />
        <div className="q-fl">
          <label htmlFor="login-employee-id">{t.employeeId}</label>
          <AccessEmployeeIdInput id="login-employee-id" className="q-in" name="employeeId" placeholder={t.quiet.idPlaceholder}
            autoComplete="username" autoCapitalize="none" spellCheck={false} aria-describedby={errorId} required />
        </div>
        <div className="q-fl">
          <label htmlFor="login-password">{t.password}</label>
          <PasswordInput quiet id="login-password" name="password" placeholder={t.quiet.passwordPlaceholder} autoComplete="current-password"
            aria-describedby={errorId} required showLabel={t.showPassword} hideLabel={t.hidePassword} />
        </div>
        <LoginSubmit idle={t.signIn} busy={t.signingIn} className="q-btn" />
      </form>
      <PasskeySlot t={mobile ? {...t,passkeyPhone:t.passkeyDesktop,passkeyBusyPhone:t.passkeyBusyDesktop,passkeyNotFoundPhone:t.passkeyNotFoundDesktop,passkeyUnavailablePhone:t.passkeyUnavailableDesktop} : t} quiet />
      <nav className="q-auth__links" aria-label={t.signIn}>
        <Link href="/forgot-access">{t.forgotAccess}</Link>
        <Link href={`/activate${returnQuery}`}>{t.activateAccount}</Link>
      </nav>
      {mobile ? <details id="login-id-help" className="ma-details ma-only"><summary><CaretRightIcon size={16} aria-hidden="true"/>{mt.idHelp}</summary><p>{mt.idHelpBody}</p></details> : null}
    </QuietAuthShell>
  );
}

export const generateMetadata=()=>mobileAccessMetadata("signin");
