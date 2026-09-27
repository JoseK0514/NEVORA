export default function LoginPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <span className="brand-mark large">F</span>
          <div>
            <p className="eyebrow">Fuel Coffee Drive</p>
            <h1>Employee Scheduling</h1>
          </div>
        </div>

        <div className="form-stack">
          <label>
            Employee ID
            <input placeholder="FC-0001" autoComplete="username" />
          </label>
          <label>
            Password
            <input type="password" placeholder="••••••••" autoComplete="current-password" />
          </label>
          <button type="button" className="button primary full">Sign In</button>
        </div>

        <p className="auth-note">
          Authentication wiring will be added after the employee and permission model is finalized.
        </p>
      </section>
    </main>
  );
}
