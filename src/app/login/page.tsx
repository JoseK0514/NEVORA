import {mobileAccessMetadata} from "@/components/mobile-access/metadata.server";
import Link from "next/link";
import {mobileAccessEnabled} from "@/components/mobile-access/config.server";
import {MOBILE_ACCESS_COPY} from "@/components/mobile-access/copy";
import {AccessEmployeeIdInput} from "@/components/mobile-access/journey";
import {AccessCard, AccessOutside} from "@/components/mobile-access/chrome";
import {CaretDownIcon} from "@phosphor-icons/react/dist/ssr/CaretDown";
import {WarningCircleIcon} from "@phosphor-icons/react/dist/ssr/WarningCircle";
import {HourglassMediumIcon} from "@phosphor-icons/react/dist/ssr/HourglassMedium";
import {CheckCircleIcon} from "@phosphor-icons/react/dist/ssr/CheckCircle";
import { getPublicWorkspaceName } from "@/lib/data/workspaces";
import { safeReturnTo } from "@/lib/notifications/destinations";
import { login } from "@/app/login/actions";
import { AUTH_COPY } from "@/lib/auth-copy";
import { readAuthLang } from "@/lib/auth-lang.server";
import { QuietAuthShell } from "@/components/auth-premium/auth-shell";
import { Greeting } from "@/components/auth-premium/greeting";
import { PasswordInput } from "@/components/auth-premium/password-input";
import { PasskeySlot, PasswordSignInMarker } from "@/components/auth-premium/passkey-slot";
import { AuthValidation, FieldInvalid } from "@/components/auth-premium/auth-validation";
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
  // Review B4 (Nov 10, 2026, NV-189): a wrong ID or password marks both fields red (it never says which one). Too many
  // attempts is a wait (amber) and a deleting account is not a field problem, so neither marks the fields.
  const fieldsInvalid = params.error && params.error !== "busy" && params.error !== "deleting" ? true : undefined;
  const wait = params.error === "busy";
  const greeting = <div className="q-hd q-auth__hd"><Greeting words={t.greeting} className=""/><p>{workspaceName ?? t.workspaceUnavailable}</p></div>;

  // Quiet (v4, approved Oct 23): the wordmark and Español, the greeting and the workspace, two fields, Sign in, Face ID,
  // then Forgot password? and Activate account on one line. With mobile Access on, phones show the form on a card
  // with Forgot password? under the password field and the other links below the card (approved Oct 27).
  // Mock 7 (review B4, NV-192): with mobile Access on the greeting and the workspace sit on the teal band above the card,
  // as without it; the card holds only the form.
  return (
    <QuietAuthShell lang={lang} t={t}>
      {mobile ? greeting : null}
      <AccessCard mobile={mobile}>
        {mobile ? null : greeting}
        <form action={login} className="q-auth__form" data-invalid={params.error ? "" : undefined}>
          <AuthValidation />
          {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
          {/* Direction B (Nov 8, 2026): the error and the activated notice read at the top of the form card. Red stops you,
            * amber means wait, green is done; each note leads with its icon. */}
          {params.error ? <p className={`q-error q-auth__alert${wait ? " q-auth__alert--wait" : ""}`} id="login-error" role="alert">{wait ? <HourglassMediumIcon size={20} weight="bold" aria-hidden="true" /> : <WarningCircleIcon size={20} weight="bold" aria-hidden="true" />}<span>{params.error === "deleting" ? t.loginDeleting : wait ? t.loginBusy : t.loginError}</span></p> : null}
          {params.activated ? <p className="q-help q-auth__alert" role="status"><CheckCircleIcon size={20} weight="bold" aria-hidden="true" /><span>{t.activated}</span></p> : null}
          <PasswordSignInMarker />
          <div className="q-fl">
            <label htmlFor="login-employee-id">{t.employeeId}</label>
            <AccessEmployeeIdInput id="login-employee-id" className="q-in" name="employeeId" placeholder={t.quiet.idPlaceholder}
              autoComplete="username" autoCapitalize="none" spellCheck={false} aria-describedby={[errorId, "login-employee-id-invalid"].filter(Boolean).join(" ")} required
              aria-invalid={fieldsInvalid} data-msg-required={t.invalid.employeeId} />
            <FieldInvalid id="login-employee-id" />
          </div>
          <div className="q-fl">
            <label htmlFor="login-password">{t.password}</label>
            <PasswordInput quiet id="login-password" name="password" placeholder={t.quiet.passwordPlaceholder} autoComplete="current-password"
              aria-describedby={[errorId, "login-password-invalid"].filter(Boolean).join(" ")} required showLabel={t.showPassword}
              aria-invalid={fieldsInvalid} data-msg-required={t.invalid.password} />
            <FieldInvalid id="login-password" />
            {mobile ? <Link className="ma-forgot ma-only" href="/forgot-access">{t.forgotAccess}</Link> : null}
          </div>
          <LoginSubmit idle={t.signIn} busy={t.signingIn} className="q-btn" />
        </form>
        <PasskeySlot t={mobile ? {...t,passkeyPhone:t.passkeyDesktop,passkeyBusyPhone:t.passkeyBusyDesktop,passkeyNotFoundPhone:t.passkeyNotFoundDesktop,passkeyUnavailablePhone:t.passkeyUnavailableDesktop} : t} quiet />
      </AccessCard>
      <AccessOutside mobile={mobile}>
        <nav className="q-auth__links" aria-label={t.accountHelp}>
          <Link className={mobile ? "ma-desktop" : undefined} href="/forgot-access">{t.forgotAccess}</Link>
          <Link href={`/activate${returnQuery}`}>{t.activateAccount}</Link>
        </nav>
        {mobile ? <details id="login-id-help" className="ma-details ma-only"><summary>{mt.idHelp}<CaretDownIcon className="ma-caret" size={16} weight="bold" aria-hidden="true"/></summary><p>{mt.idHelpBody}</p></details> : null}
      </AccessOutside>
    </QuietAuthShell>
  );
}

export const generateMetadata=()=>mobileAccessMetadata("signin");
