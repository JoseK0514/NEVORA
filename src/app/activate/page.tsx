import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { PhoneInput } from "@/components/phone-input";
import { activateAccountAction } from "@/app/activate/actions";

export default async function ActivatePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; employeeId?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="auth-page employee-login-page employee-activate-page">
      <div className="employee-login-overlay" aria-hidden="true" />
      <div className="employee-login-scene-copy" aria-hidden="true"><span>GOOD PEOPLE</span><strong>GREAT COFFEE</strong></div>
      <div className="employee-login-shell">
        <header className="employee-login-brand">
          <BrandMark large />
          <div><strong>Fuel Coffee Drive</strong><span>Employee Portal</span></div>
        </header>
        <section className="auth-card employee-login-card">
          <div className="employee-login-heading">
            <p className="eyebrow">EMPLOYEE PORTAL</p>
            <h1>Activate Account</h1>
            <p>Set up your account to access your Fuel schedule and requests.</p>
          </div>

        {params.error ? (
          <p className="form-error">
            {params.error === "not_found"
              ? "We could not activate that account. Check the Employee ID and phone number, or the account may already be activated."
              : params.error === "mismatch"
                ? "Passwords do not match. Please enter them again."
              : "Enter your Employee ID and phone number, and choose a matching password of at least 8 characters."}
          </p>
        ) : null}

        <form action={activateAccountAction} className="form-stack employee-login-form">
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
              <small>Use at least 8 characters.</small>
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
          <button type="submit" className="button primary full employee-login-submit">Activate Account</button>
        </form>

        <div className="auth-secondary employee-login-secondary">
          <span>Already activated?</span>
          <Link href="/login">Back to Sign In</Link>
        </div>
        </section>
        <footer className="employee-login-footer"><span>Fuel Coffee Drive • Employee Portal</span><small>People fuel possibility.</small></footer>
      </div>
    </main>
  );
}
