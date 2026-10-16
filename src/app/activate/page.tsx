import Link from "next/link";
import { getPublicWorkspaceName } from "@/lib/data/workspaces";
import { safeReturnTo } from "@/lib/notifications/destinations";
import { AuthBrand } from "@/components/auth-brand";
import { AuthDisclosureSymbol } from "@/components/auth-disclosure-symbol";
import { BrandLegal } from "@/components/brand-legal";
import { PhoneInput } from "@/components/phone-input";
import { NUVORA_BRAND } from "@/lib/brand";
import { activateAccountAction } from "./actions";
import { ActivationVisual } from "./activation-visual";
import { ActivationPasswords } from "./activation-passwords";
import { ActivationSubmit } from "./activation-submit";
import "../login/login.css";
import "./activation.css";
import "../login/auth-refinement.css";
import "../login/auth-support.css";

export default async function ActivatePage({ searchParams }: {
  searchParams: Promise<{ error?: string; employeeId?: string; returnTo?: string | string[] }>;
}) {
  const params = await searchParams;
  const workspaceName = await getPublicWorkspaceName();
  const returnTo = typeof params.returnTo === "string" ? safeReturnTo(params.returnTo) : null;
  const returnQuery = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";
  const errorId = params.error ? "activation-error" : undefined;

  return <main className="auth-page employee-login-page auth-refinement-page auth-support-page activation-page">
    <div className="employee-login-shell">
      <header className="employee-login-brand">
        <AuthBrand />
        <span className="login-workspace">{workspaceName ?? "Workspace unavailable"}</span>
      </header>
      <div className="employee-login-composition">
        <ActivationVisual />
        <section className="auth-card employee-login-card activation-card">
          <div className="employee-login-heading">
            <h1>Activate account</h1>
          </div>
          {params.error ? <p className="form-error" id={errorId} role="alert">
            {params.error === "not_found"
              ? "We could not activate that account. Check the Employee ID and phone number, or the account may already be activated."
              : "Enter your Employee ID and phone number, and choose a matching password of at least 8 characters."}
          </p> : null}
          <form action={activateAccountAction} className="form-stack employee-login-form activation-form">
            {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
            <label htmlFor="activation-employee-id">Employee ID
              <input id="activation-employee-id" name="employeeId" placeholder="Enter your employee ID"
                defaultValue={params.employeeId ?? ""} autoComplete="username" autoCapitalize="none"
                spellCheck={false} required aria-describedby={errorId} />
            </label>
            <div className="activation-phone-field">
              <label htmlFor="activation-phone">Phone number
                <PhoneInput id="activation-phone" name="phone" autoComplete="tel" required
                  aria-describedby={["activation-phone-hint", errorId].filter(Boolean).join(" ")} />
              </label>
              <p className="activation-hint" id="activation-phone-hint">Use the number your workplace has on file.</p>
            </div>
            <ActivationPasswords errorId={errorId} />
            <ActivationSubmit />
          </form>
          <div className="activation-secondary">
            <details className="activation-help">
              <summary><span>Need your employee details?</span><AuthDisclosureSymbol /></summary>
              <p>Your workplace sets up your employee record first. Ask your manager or Owner for your Employee ID and to confirm the phone number on file.</p>
            </details>
            <Link href={`/login${returnQuery}`} className="activation-back">
              <span>Already activated? Sign in</span>
            </Link>
          </div>
        </section>
      </div>
      <footer className="employee-login-footer"><small>{NUVORA_BRAND.poweredBy}</small><BrandLegal /></footer>
    </div>
  </main>;
}
