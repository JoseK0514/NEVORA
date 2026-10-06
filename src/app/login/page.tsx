import Link from "next/link";
import { getPublicWorkspaceName } from "@/lib/data/workspaces";
import { safeReturnTo } from "@/lib/notifications/destinations";
import { BrandLockup } from "@/components/brand-lockup";
import { BrandLegal } from "@/components/brand-legal";
import { login } from "@/app/login/actions";
import { NUVORA_BRAND } from "../../lib/brand";

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
    <main className="auth-page employee-login-page">
      <div className="employee-login-shell">
        <header className="employee-login-brand">
          <BrandLockup variant="large" />
        </header>

        <section className="auth-card employee-login-card">
          <div className="employee-login-heading">
            <p className="eyebrow">{workspaceName ?? "Workspace unavailable"}</p>
            <h1>Employee Login</h1>
            <p>
              Access your schedule, availability, requests, time, and profile.
            </p>
          </div>

          {params.error ? (
            <p className="form-error">Employee ID or password is incorrect.</p>
          ) : null}
          {params.activated ? (
            <p className="form-success">Account activated. You can sign in now.</p>
          ) : null}

          <form action={login} className="form-stack employee-login-form">
            {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
            <label>
              Employee ID
              <input
                name="employeeId"
                placeholder="Enter your employee ID"
                autoComplete="username"
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
                required
              />
            </label>
            <button type="submit" className="button primary full employee-login-submit">
              Sign In
            </button>
          </form>

          <div className="auth-secondary employee-login-secondary">
            <span>New employee?</span>
            <Link href={`/activate${returnQuery}`}>Activate your account</Link>
          </div>
        </section>

        <footer className="employee-login-footer">
          <span>{workspaceName ?? "Workspace unavailable"}</span>
          <small>{NUVORA_BRAND.poweredBy}</small>
          <BrandLegal />
        </footer>
      </div>
    </main>
  );
}
