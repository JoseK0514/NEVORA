import Link from "next/link";
import { getPublicWorkspaceName } from "@/lib/data/workspaces";
import { safeReturnTo } from "@/lib/notifications/destinations";
import { BrandWordmark } from "@/components/brand-mark";
import { BrandLegal } from "@/components/brand-legal";
import { login } from "@/app/login/actions";
import { NUVORA_BRAND } from "../../lib/brand";
import { LockKeyIcon } from "@phosphor-icons/react/dist/ssr/LockKey";
import { IdentificationBadgeIcon } from "@phosphor-icons/react/dist/ssr/IdentificationBadge";
import { LoginVisual } from "./login-visual";
import { LoginSubmit } from "./login-submit";
import "./login.css";
import "./login-refinement.css";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; activated?: string; returnTo?: string | string[] }>;
}) {
  const params = await searchParams;
  const workspaceName = await getPublicWorkspaceName();
  const returnTo = typeof params.returnTo === "string" ? safeReturnTo(params.returnTo) : null;
  const returnQuery = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";

  return (
    <main className="auth-page employee-login-page login-refinement-page">
      <div className="employee-login-shell">
        <header className="employee-login-brand">
          <span className="login-brand-lockup">
            <BrandWordmark />
            <span className="login-brand-module">{NUVORA_BRAND.module}</span>
          </span>
          <span className="login-workspace">{workspaceName ?? "Workspace unavailable"}</span>
        </header>

        <div className="employee-login-composition">
        <LoginVisual />
        <section className="auth-card employee-login-card">
          <div className="employee-login-heading">
            <h1>Employee Login</h1>
          </div>

          {params.error ? (
            <p className="form-error" id="login-error" role="alert">Employee ID or password is incorrect.</p>
          ) : null}
          {params.activated ? (
            <p className="form-success" role="status">Account activated. You can sign in now.</p>
          ) : null}

          <form action={login} className="form-stack employee-login-form">
            {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
            <label>
              Employee ID
              <input
                name="employeeId"
                placeholder="Enter your employee ID"
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                aria-describedby={params.error ? "login-error" : undefined}
                required
              />
            </label>
            <label>
              Password
              <input
                name="password"
                type="password"
                placeholder="Enter your password"
                autoComplete="current-password"
                aria-describedby={params.error ? "login-error" : undefined}
                required
              />
            </label>
            <LoginSubmit />
          </form>

          <div className="auth-secondary employee-login-secondary">
            <Link href="/forgot-access" className="login-access-link">
              <span className="login-access-symbol" aria-hidden="true">
                <LockKeyIcon size={24} weight="duotone" focusable="false" />
              </span>
              <span>Forgot access?</span>
            </Link>
            <Link href={`/activate${returnQuery}`} className="login-access-link">
              <span className="login-access-symbol" aria-hidden="true">
                <IdentificationBadgeIcon size={24} weight="duotone" focusable="false" />
              </span>
              <span><small>New employee?</small>Activate your account</span>
            </Link>
          </div>
        </section>
        </div>

        <footer className="employee-login-footer">
          <small>{NUVORA_BRAND.poweredBy}</small>
          <BrandLegal />
        </footer>
      </div>
    </main>
  );
}
