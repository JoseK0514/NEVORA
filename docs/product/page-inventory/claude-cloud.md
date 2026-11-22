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
node tools/ci-browser-runtime/node_modules/playwright/cli.js install chromium
# Set this if pg_config points to client-only binaries or is missing.
# export NEVORA_TEST_PG_BIN=/usr/lib/postgresql/16/bin
bash scripts/ui-checks/collab-qa.sh --inventory --screenshots
```

Run one suite at a time. On Linux, install the Playwright Chromium OS dependencies if the engine reports a missing library. The isolated launcher requires an environment without `DATABASE_URL` and `FUEL_TEST_DATABASE_URL`. The app listens on an ephemeral loopback port with its own fictional workspace. The browser tests deny other origins. The launcher logs the evidence directory and cleans up its app and database on exit.

- Run `bash scripts/ui-checks/collab-qa.sh` for the focused browser workflow.
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
- **Clocker K8 and K9.** The script uses the Owner's normal settings to connect fictional tablets and set a synthetic PIN. It opens the photo controls and preview using Chromium's fake camera and a test-only policy reply. It stops before upload. A real punch in the disposable database plus an interrupted first request takes the other tablet through **Check if it saved** into **Review current status**. The owner photo settings and review list are J15 and J16.

## Read the inventory evidence

Use [the page inventory](../page-inventory.md) for role expectations, route families, and interaction states. The run reconciles that inventory to the tracked Next.js pages and writes `collab-inventory-results.json` and `collab-priority-results.json` to the printed evidence directory. Concrete links use the fixture's published shift, update, copy receipt, and payroll run. The JSON reports redirects, notices, role exclusions, separate fixtures and browser errors. `rendered` means the route produced a page, and the priority workflow assertions verify the actual actions on the named screens. The route pass does not exhaustively click every control or test every loading, error, confirmation or offline variation.

A location Manager's Things to Do (B4) and Time Corrections (D2) still depend on company-wide access in the app. The fixture assigns the real location-scoped permissions to expose the distinction. Owner and Manager account sections such as Privacy, Device Alerts and Passkeys can land on sections of Profile. The two dev-inspect routes are error-boundary probes and have no page UI of their own. The native Alerts screen is exercised in a browser with the phone bridge simulated.

### Signup and verification

For A8 and A9, use `localhost` with the same port as the app URL. The private signup form accepts `qa-signup@example.invalid` and delivers to the fixture's local SMTP inbox. Read `fictional-signup.eml` from the evidence directory for the confirmation link. The browser check follows that link to the verified business form. It uses a synthetic activation link to capture A10 as a form, then leaves it unsubmitted. The registration and owner-activation suites exercise the corresponding isolated writes.

### Separate environments in the same checkout

| Screen | How to exercise it |
|---|---|
| A15–A19 Central billing | Use the central billing browser suite below. It opens all five routes and uses a local billing service and fictional checkout transport. |
| F3 Staff List Import | The Step 4 local lifecycle suite opens the Owner import form in a routed workspace. The `people` suite covers CSV validation and import. The single-workspace runtime shows the unavailable notice. |
| J18 Owner Billing and K15 Clocker Paused | Use the Step 4 local lifecycle browser suite below. It provides an isolated workspace and transitions the fictional account to restricted billing. |
| J16 populated photo review, live photo storage and facial verification | The main fixture opens the Owner settings and empty review list. Server-backed photo workflows need the isolated photo runtime. The kiosk camera and preview run offline in the main check. |

```bash
node tools/ci-browser-runtime/node_modules/playwright/cli.js install chromium webkit
export NEVORA_TEST_PG_BIN="${NEVORA_TEST_PG_BIN:-$(pg_config --bindir)}"
NEVORA_CENTRAL_BILLING_EVIDENCE="$(mktemp -d /tmp/nevora-billing-qa.XXXXXXXX)" \
  node scripts/onboarding-owned.mjs --suite central-billing
NEVORA_STEP4_EVIDENCE="$(mktemp -d /tmp/nevora-step4-qa.XXXXXXXX)" \
  node scripts/onboarding-owned.mjs --suite step4-local
node scripts/onboarding-owned.mjs --suite registration
node scripts/onboarding-owned.mjs --suite owner-activation
node scripts/onboarding-owned.mjs --suite people
```
