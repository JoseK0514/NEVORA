import { getPublicWorkspaceName } from "@/lib/data/workspaces";
import { safeReturnTo } from "@/lib/notifications/destinations";
import { PhoneInput } from "@/components/phone-input";
import { AUTH_COPY } from "@/lib/auth-copy";
import { readAuthLang } from "@/lib/auth-lang.server";
import { AuthShell } from "@/components/auth-premium/auth-shell";
import { PasswordInput } from "@/components/auth-premium/password-input";
import { AuthDisclosureSymbol } from "@/components/auth-disclosure-symbol";
import { activateAccountAction } from "./actions";
import { ActivationSubmit } from "./activation-submit";
import "../login/auth-premium.css";

export default async function ActivatePage({ searchParams }: {
  searchParams: Promise<{ error?: string; employeeId?: string; returnTo?: string | string[] }>;
}) {
  const params = await searchParams;
  // The shell reads no workspace; the call stays so the page keeps its existing data dependencies.
  const [, lang] = await Promise.all([getPublicWorkspaceName(), readAuthLang()]);
  const t = AUTH_COPY[lang];
  const returnTo = typeof params.returnTo === "string" ? safeReturnTo(params.returnTo) : null;
  const returnQuery = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
  const errorId = params.error ? "activation-error" : undefined;

  return (
    <AuthShell lang={lang} t={t} variant="sub" back={`/login${returnQuery}`}>
      <h1 className="ap-title">{t.activateTitle}</h1>
      {params.error ? <p className="ap-alert" data-tone="error" id={errorId} role="alert">
        {params.error === "not_found" ? t.activationNotFound : t.activationInvalid}
      </p> : null}
      <form action={activateAccountAction} className="ap-form" data-invalid={params.error ? "" : undefined}>
        {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
        <div className="ap-field">
          <label className="ap-label" htmlFor="activation-employee-id">{t.employeeId}</label>
          <div className="ap-box">
            <input id="activation-employee-id" className="ap-input" name="employeeId" placeholder={t.employeeIdPlaceholder}
              defaultValue={params.employeeId ?? ""} autoComplete="username" autoCapitalize="none"
              spellCheck={false} required aria-describedby={errorId} />
          </div>
        </div>
        <div className="ap-field">
          <label className="ap-label" htmlFor="activation-phone">{t.phoneNumber}</label>
          <div className="ap-box">
            <PhoneInput id="activation-phone" name="phone" autoComplete="tel" required
              aria-describedby={["activation-phone-hint", errorId].filter(Boolean).join(" ")} />
          </div>
          <p className="ap-hint" id="activation-phone-hint">{t.phoneHint}</p>
        </div>
        <div className="ap-field">
          <label className="ap-label" htmlFor="activation-password">{t.createPassword}</label>
          <PasswordInput id="activation-password" name="password" minLength={8} placeholder={t.choosePassword} autoComplete="new-password" required
            aria-describedby={["activation-password-hint", errorId].filter(Boolean).join(" ")}
            controls={["activation-password", "activation-confirm-password"]} showLabel={t.showPasswords} hideLabel={t.hidePasswords} />
          <p className="ap-hint" id="activation-password-hint">{t.atLeast8}</p>
        </div>
        <div className="ap-field">
          <label className="ap-label" htmlFor="activation-confirm-password">{t.confirmPassword}</label>
          <div className="ap-box">
            <input id="activation-confirm-password" className="ap-input" name="confirmPassword" type="password" minLength={8}
              placeholder={t.reenterPassword} autoComplete="new-password" required aria-describedby={errorId} />
          </div>
        </div>
        <ActivationSubmit idle={t.activateAccount} busy={t.activatingAccount} />
      </form>
      <div className="ap-links">
        <details className="ap-help">
          <summary><span>{t.needEmployeeDetails}</span><AuthDisclosureSymbol /></summary>
          <p>{t.needEmployeeDetailsBody}</p>
        </details>
      </div>
    </AuthShell>
  );
}
