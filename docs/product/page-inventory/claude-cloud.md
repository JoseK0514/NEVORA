# Test NEVORA from the collab branch in Claude Cloud

Use the `claude-codex-collab-nevora` branch of `JoseK0514/NEVORA`. Claude starts its own app and disposable database from the branch. Loopback addresses in the output belong to the machine that runs the command. Use Playwright in that same environment to visit them and save evidence.

## Start from a fresh checkout

Use Node 24.19.0, PostgreSQL 16+ binaries, and the repository's pinned Playwright. Run the commands as a non-root user who can write to the checkout and its temporary directory. PostgreSQL's `initdb` rejects root. On a Linux container started as root, use its non-root workspace account for the steps below. The CI workflow shows the PostgreSQL 16 package setup for Ubuntu.

```bash
git fetch origin claude-codex-collab-nevora
git switch --detach FETCH_HEAD
git rev-parse HEAD
npm ci --ignore-scripts --include=dev
npm --prefix tools/ci-browser-runtime ci --ignore-scripts
node tools/ci-browser-runtime/node_modules/playwright/cli.js install chromium webkit
# Set this if pg_config points to client-only binaries or is missing.
# export NEVORA_TEST_PG_BIN=/usr/lib/postgresql/16/bin
bash scripts/ui-checks/collab-qa.sh --production --full
```

Run one suite at a time. On Linux, install the Playwright Chromium and WebKit OS dependencies if the engine reports a missing library. The isolated launcher requires an environment without `DATABASE_URL` and `FUEL_TEST_DATABASE_URL`. The app listens on an ephemeral loopback port with its own fictional workspace. The browser tests deny other origins. The launcher logs the evidence directory and cleans up its app and database on exit.

- Run `bash scripts/ui-checks/collab-qa.sh --production --full` for all three production-build fixtures. It starts with the profile inventory at phone and desktop widths, then runs central billing and the routed Owner and Clocker workflows. It writes `collab-full-results.json` when all three passes agree on the source commit and the required screenshots are present.
- Run `bash scripts/ui-checks/collab-qa.sh --production --inventory --screenshots` for the production-build workspace and browser inventory alone. The browser driver maps the fictional HTTPS hostname to the workspace’s loopback listener and pins the temporary certificate. It blocks DNS for every other hostname in production-test mode.
- Run `bash scripts/ui-checks/collab-qa.sh --production --scoped-manager` to check B4 and D2 with the Next.js production build and server in a disposable workspace. OpenSSL generates a temporary loopback certificate for the real HTTPS session. It verifies both screens at phone and desktop widths, tests the server feeds against two locations, and makes a fictional decision through the real review UI. Drop `--production` for a faster development-mode run.
- Run `bash scripts/ui-checks/collab-qa.sh --serve` for manual navigation. Keep that process running while a second shell runs Playwright. Read its `runtime.json` for the app URL, current sample week, real fixture record IDs, and commit SHA. Stop it with Ctrl+C.
- Run `bash scripts/ui-checks/collab-qa.sh --inventory-only --screenshots` for a route reconnaissance run without changing the kiosk punch state. The full inventory run adds the Clocker screen checks and their evidence.

## Accounts and workflows

The fictional password is the `TEST_PASSWORD` constant in `src/test/integration/owned-app-fixture.ts`. Use a separate browser context for each profile.

| Profile | Employee ID | Coverage |
|---|---|---|
| Owner | `QAOWNER` | Workspace settings, Rondo tools, creating fictional Clocker tablets and PINs, and authorizing work. |
| Manager | `QACOMPANYMANAGER` | Company-wide, Main Office and West Office, with scheduling and time review grants. |
| Location Manager | `QARONDOMANAGER` | Main Office only, with scheduling and time review grants at that location. |
| Lead | `QA-RONDO-A` | Lead home, availability, own published shift and time. Also the synthetic kiosk user. |
| Employee | `QA-RONDO-B` | Employee home, availability, own published shift and time. |

- **Rondo H1.** Open `/app/ai-manager` as each Manager and select **How many hours are scheduled?**. The company-wide Manager can select both locations. The location Manager gets only Main Office. Preset answers use the fictional schedule. Model-backed and custom questions depend on a provider.
- **Find Cover C5 and Review replacement C3.** Sign in as the location Manager. Open Schedule for the week in `runtime.json` and choose a **Find cover** link in **Open shifts**. The script selects a real gap with an eligible candidate and follows **Review replacement**. It also checks that a direct request for West Office returns the scope notice.
- **Clocker K8, K9 and J16.** In production-build mode the fixture connects fictional tablets, records a punch, tests the interrupted-request recovery screen, and uses Chromium’s fake camera with the normal private photo policy and upload endpoints. The Owner opens the stored image in Photo review. The photo lifecycle is configured only inside this disposable test workspace.
- **Lead and Employee C14–C15.** Open a scheduled shift, then Swap, Offer for cover, and Can’t work. The browser tests all three sheets and Escape dismissal at phone and desktop widths.
- **Passkeys I5.** The production browser fixture uses Chromium’s virtual authenticator against the same authenticated enrollment and sign-in endpoints used by the app.
- **Alerts I4 and L1.** The browser suite exercises enrollment and revocation with a fictional push subscription against the actual server endpoints. Native Alerts uses a simulated phone bridge to show off, checking, on, and blocked. External delivery stays off.

For free navigation in the production build, run `bash scripts/ui-checks/collab-qa.sh --production --serve`. Build the Chromium launch options from the printed evidence directory’s `runtime.json`.

```js
const { url, browserHttps } = runtime;
const browser = await chromium.launch({ args: [
  '--host-resolver-rules=MAP ' + new URL(url).hostname
    + ' 127.0.0.1:' + browserHttps.proxyPort + ', MAP * ~NOTFOUND',
  '--ignore-certificate-errors-spki-list=' + browserHttps.spki,
] });
```

Navigate to `url + '/login'` with one of the fictional profiles above.

## Read the inventory evidence

Use [the page inventory](../page-inventory.md) for role expectations, route families, and interaction states. The run reconciles that inventory to the tracked Next.js pages and writes `collab-inventory-results.json` and `collab-priority-results.json` to the printed evidence directory. Concrete links use the fixture's published shift, update, copy receipt, and payroll run. The JSON reports redirects, notices, role exclusions, separate fixtures and browser errors. `rendered` means the route produced a page, and the priority workflow assertions verify the actual actions on the named screens. The route pass does not exhaustively click every control or test every loading, error, confirmation or offline variation.

Things to Do (B4) shows coverage, clock-ins and reviewable requests for the Manager’s assigned locations. Time Corrections (D2) uses the Owner’s Review time exceptions grant at each location in the request’s complete footprint. Use the seeded Main Office request to try a decision. The West Office request is a control visible to the company-wide Manager. Owner and Manager account sections such as Privacy, Device Alerts and Passkeys can land on sections of Profile. The two dev-inspect routes are error-boundary probes and have no page UI of their own. The native Alerts screen is exercised in a browser with the phone bridge simulated.

### Signup and verification

The private signup form accepts `qa-signup@example.invalid` and sends mail to the fixture’s loopback inbox. The production-build runner uses authenticated TLS for that connection. The browser follows the received link to the verified business form. It opens A10 with a synthetic activation link. The separately owned registration and owner-activation suites cover activation writes.

### Separate environments in the same checkout

| Screen | How to exercise it |
|---|---|
| A15–A19 Central billing | The central billing production suite opens all five English and Spanish routes in Chromium and WebKit. It uses the commerce API and isolated SQL with a fictional Stripe checkout fixture. |
| F3 Staff List Import | Sign in as the Owner of the routed fictional workspace and select **Import a staff list** in Employees. The production suite captures the form in both engines and imports a fictional employee through preview and receipt in both engines. |
| J18 Owner Billing and K15 Clocker Paused | The routed production suite verifies Owner Billing during a trial and after access pauses. It opens a separate tablet session through its location link and follows the Clocker redirect and retry in both engines. |
| Facial verification, provider-backed Rondo and native delivery | The regular browser suite uses fictional input and keeps external delivery disabled. Use the dedicated isolated tests for face matching, model-provider contracts, and notification delivery. |

```bash
node tools/ci-browser-runtime/node_modules/playwright/cli.js install chromium webkit
export NEVORA_TEST_PG_BIN="${NEVORA_TEST_PG_BIN:-$(pg_config --bindir)}"
NEVORA_CENTRAL_BILLING_EVIDENCE="$(mktemp -d /tmp/nevora-billing-qa.XXXXXXXX)" \
  node scripts/onboarding-owned.mjs --suite central-billing --production
NEVORA_STEP4_EVIDENCE="$(mktemp -d /tmp/nevora-step4-qa.XXXXXXXX)" \
  node scripts/onboarding-owned.mjs --suite step4-local --production
node scripts/onboarding-owned.mjs --suite registration
node scripts/onboarding-owned.mjs --suite owner-activation
node scripts/onboarding-owned.mjs --suite people
```
