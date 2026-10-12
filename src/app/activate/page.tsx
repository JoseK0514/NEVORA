import Link from "next/link";
import { getPublicWorkspaceName } from "@/lib/data/workspaces";
import { safeReturnTo } from "@/lib/notifications/destinations";
import { BrandLockup } from "@/components/brand-lockup";
import { BrandLegal } from "@/components/brand-legal";
import { PhoneInput } from "@/components/phone-input";
import { activateAccountAction } from "@/app/activate/actions";

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; employeeId?: string; returnTo?: string | string[] }>;
}) {
  const params = await searchParams;
  const workspaceName = await getPublicWorkspaceName();
  const returnTo = typeof params.returnTo === "string" ? safeReturnTo(params.returnTo) : null;
  const returnQuery = returnTo ? `?returnTo=${encodeURIComponent(returnTo)}` : "";

  return (
    <main className="auth-page">
      <div className="auth-activation-shell">
        <section className="auth-card">
          <BrandLockup variant="large" />
          <div className="auth-activation-heading">
            <h1>Activate Account</h1>
            <p className="auth-workspace">{workspaceName ?? "Workspace unavailable"}</p>
          </div>

          {params.error ? (
            <p className="form-error">
              {params.error === "not_found"
                ? "We could not activate that account. Check the Employee ID and phone number, or the account may already be activated."
                : "Enter your Employee ID and phone number, and choose a matching password of at least 8 characters."}
            </p>
          ) : null}

          <form action={activateAccountAction} className="form-stack">
            {returnTo ? <input type="hidden" name="returnTo" value={returnTo} /> : null}
            <label>
              Employee ID
              <input
                name="employeeId"
                placeholder="Enter your employee ID"
                defaultValue={params.employeeId ?? ""}
                autoComplete="username"
                required
              />
            </label>
            <label>
              Phone Number
              <PhoneInput name="phone" autoComplete="tel" required />
            </label>
            <label>
              Create Password
              <input
                name="password"
                type="password"
                minLength={8}
                autoComplete="new-password"
                required
              />
            </label>
            <label>
              Confirm Password
              <input
                name="confirmPassword"
                type="password"
                minLength={8}
                autoComplete="new-password"
                required
              />
            </label>
            <button type="submit" className="button primary full">Activate Account</button>
          </form>

          <div className="auth-secondary">
            <span>Already activated?</span>
            <Link href={`/login${returnQuery}`}>Back to Sign In</Link>
          </div>
        </section>
        <footer className="auth-legal"><BrandLegal /></footer>
      </div>
    </main>
  );
}
