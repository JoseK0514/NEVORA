# NEVORA product inventory and commercial readiness (branch `claude-codex-collab-nevora`, state as of 2026-11-18)

Scope note for the report writer: every citation below is a repository path in `/home/user/NEVORA` (relative to the repo root, with line numbers where useful) unless it is an `https://` URL. The checkout is at `d6bfdc77` (2026-11-17 20:25 -0400). It is a **shallow clone**: only 79 commits (Nov 15–17) are visible, so history before Nov 15 comes from dated documents, not git. Docs often record their own dates; where a later doc supersedes an earlier one, that is noted. Nothing was run against a database, server or hosted service; hosted state is as the docs describe it.

## 1. Feature inventory: what is live-by-default, flag-gated, partially built, or planned-only?

### Takeaway
NEVORA has a large, real single-company workforce core (scheduling with auto-drafting, availability, time off, shift swaps, timecards, corrections, hours export, reports, kiosk setup, company access scopes) that needs no flag. But many things a buyer would call "the product" are off by default: kiosk punching itself, pay statements, web push, passkeys, billing, self-service signup, mobile access and the AI "Rondo" advisor. Team messaging, announcements and reminders are hard-held in SQL so they only run on throwaway local test databases. All 17 typed flags default to `false`, and no main/production release of the current code is recorded.

### Cited Findings

**Flag registry and defaults**
- The typed registry has 17 boolean gates, each `true` only on the exact string `"true"`: payroll, commerce, commerceApi, onboarding, onboardingProvider, provisionerWorker, onboardingEmail, invitationDelivery, mobileAccess, mobileSupport, ownerAdvisor, ownerAdvisorKnowledge, ownerAdvisorWeekly, ownerAdvisorBusinessImports, ownerAdvisorBusinessRetrieval, clockerPunch, clockerUiV2 — [src/lib/feature-flags.ts:4-28](src/lib/feature-flags.ts)
- `.env.example` sets every one of them to `false`, plus `NEVORA_ONBOARDING_ADMISSION_MODE=closed`, `NEVORA_WORKSPACE_MODE=single_company`, `NEVORA_ONBOARDING_MAX_NEW_PROJECTS_PER_DAY=0`, `PUSH_FEATURE_ENABLED="false"`, `NEVORA_CLOCKER_PUNCH_ENABLED="false"` — [.env.example:5-27,55,76,101,120](.env.example)
- The Nov 15 environment matrix marks every flag "unobserved" in both hosted development and main/production. A `true` flag is "not proof of a healthy transport or an authorized release" — [docs/handoffs/2026-11-15-feature-environments.md](docs/handoffs/2026-11-15-feature-environments.md)
- The code references 409 distinct environment variable names, a measure of configuration surface (counted by grep over src/services/functions/scripts for this note).

**Live by default (no feature flag; usable once a single-company database is set up and the operator configures origins)**
- Auth: Employee ID + password with hashed credentials and opaque sessions; Owner/Manager/Lead/Employee roles checked server-side on every request — [README.md "Current foundation"](README.md); [docs/product/saas-tenant-diagnosis-2026-10-20.md §1](docs/product/saas-tenant-diagnosis-2026-10-20.md)
- Sign-in limits: 60 failures per address and 10 attempts per Employee ID per 15 minutes — [docs/handoffs/2026-11-02-sign-in-limits-and-spanish-emails.md](docs/handoffs/2026-11-02-sign-in-limits-and-spanish-emails.md)
- Employee records, multi-location eligibility, operational positions, Manager location scopes ("Company Access") — [README.md "Employee record"](README.md); [db/migrations/0008_workspace_positions.sql](db/migrations/0008_workspace_positions.sql); [db/migrations/0032_company_access_invitations.sql](db/migrations/0032_company_access_invitations.sql)
- Invitations are single use with a 7-day (168-hour) lifetime, changed from 15 minutes on Oct 27 — [db/migrations/0042_company_invitation_lifetime.sql:2,16](db/migrations/0042_company_invitation_lifetime.sql). Issuing is Owner-only; a Manager may only read status — [src/lib/company-access/invitation-http.server.ts:22](src/lib/company-access/invitation-http.server.ts)
- Scheduling: week schedule, edit/publish, templates, copy-week receipts, coverage settings, scheduling restrictions, pending edits; routes under `src/app/app/schedule/*` — [src/app/app/schedule/](src/app/app/schedule/); migrations 0009, 0010, 0043, 0065 — [db/migrations/](db/migrations/)
- Automatic weekly drafts: Owner/Manager "Build Week" and "Fill Gaps Only" prepare Draft schedules from configured coverage — [README.md "Automatic weekly drafts"](README.md); [src/lib/scheduling/generation/planner.ts](src/lib/scheduling/generation/planner.ts)
- Availability (with agreement), time-off requests, shift-exchange marketplace (swaps and callouts). Time off, marketplace, updates, pay statements and breaks are Owner-switchable "modules" — [src/lib/workspace-presentation/modules.ts:5,32](src/lib/workspace-presentation/modules.ts)
- Team-term presets: standard, retail, restaurant, field, care — [db/migrations/0032_workspace_words_modules.sql:13](db/migrations/0032_workspace_words_modules.sql)
- Timecards, time corrections (including delegated), management time close, period close — [src/app/app/timecards/](src/app/app/timecards/); [db/migrations/0018_timecards.sql](db/migrations/0018_timecards.sql), 0057, 0058
- Hours export to payroll as CSV (formats `CUSTOM_CSV` and `ADP_RUN_GENERIC_V1`). It is not gated by the payroll flag; the page only adds payroll capabilities when that flag is on — [src/lib/payroll-export/model.ts:15](src/lib/payroll-export/model.ts); [src/app/app/payroll-export/page.tsx:33](src/app/app/payroll-export/page.tsx)
- Reports/insights with CSV export — [src/app/app/reports/page.tsx](src/app/app/reports/page.tsx); [src/app/api/reports/export](src/app/api/reports/export)
- Inbox/action center, Home "Today", finder, in-app notification centre — [src/app/app/inbox/page.tsx](src/app/app/inbox/page.tsx); [src/app/app/notifications/page.tsx](src/app/app/notifications/page.tsx)
- Read-only ICS calendar subscription feeds — [src/app/api/calendar/[token]](src/app/api/calendar)
- Company policies with acknowledgements, staff tasks, branding (logo/colours within contrast rules) — [db/migrations/0025_company_policies.sql](db/migrations/0025_company_policies.sql), [0061_staff_tasks.sql](db/migrations/0061_staff_tasks.sql), [src/app/app/settings/branding/page.tsx](src/app/app/settings/branding/page.tsx)
- Clocker kiosk setup, device authorization, 4-digit PINs. **The punch itself is gated** (next section).
- Account-deletion request flow (all roles) and public Privacy/Terms pages — [docs/compliance/README.md](docs/compliance/README.md); [src/lib/legal/policies.ts:40,81](src/lib/legal/policies.ts)

**Built but flag-gated (default off)**
- Kiosk punching (clock in/out/breaks): the punch API and the kiosk's punch UI read `readFeatureFlags(process.env).clockerPunch`. A configured `NEVORA_CLOCKER_ORIGIN` and a 32-byte `NEVORA_CLOCKER_PIN_KEY` are also required — [src/app/api/clocker/[location]/punch/route.ts:11](src/app/api/clocker/[location]/punch/route.ts); [src/app/clocker/[location]/page.tsx:38](src/app/clocker/[location]/page.tsx); [.env.example:66-76](.env.example)
- Payroll/pay statements ("My pay", payroll runs, statements PDFs, import of externally calculated amounts). `/app/my-pay` returns 404 when the flag is off. Since Nov 15 new work defaults to `NEVORA_PAYROLL_CALCULATION_MODE=external`; native calculation (`native_provisional`) is reserved for operator/test use — [src/app/app/my-pay/page.tsx:30](src/app/app/my-pay/page.tsx); [README.md "What exists"](README.md)
- Web push notifications: `PUSH_FEATURE_ENABLED`/`PUSH_DELIVERY_ENABLED` false, plus VAPID keys and a worker secret needed per environment — [.env.example:50-65](.env.example)
- Passkeys: only when `NEXT_PUBLIC_NEVORA_PASSKEYS=on`, plus `NEVORA_PASSKEY_RP_ID`/`NEVORA_PASSKEY_ORIGIN` — [src/lib/passkeys/client.ts:17-18](src/lib/passkeys/client.ts); [db/migrations/0035_passkeys.sql](db/migrations/0035_passkeys.sql)
- Commerce gate and billing: `/app/billing` returns 404 unless `NEVORA_COMMERCE_ENABLED` — [src/app/app/billing/page.tsx:24](src/app/app/billing/page.tsx). Commerce API and worker — [services/commerce/README.md](services/commerce/README.md)
- Self-service onboarding: registration, verification, provisioning worker, Owner activation, setup, people, invitation batches, isolated workspace routing — [docs/architecture/self-service-onboarding.md](docs/architecture/self-service-onboarding.md); `src/app/api/onboarding/*`
- Owner roster (CSV) import works only where isolated workspace routing is configured; on a single-company deployment the page shows an "off" notice — [src/app/app/employees/import/page.tsx:19-24,35](src/app/app/employees/import/page.tsx)
- Mobile access (warm welcome, mobile sign-in/recovery/activation journey, public help) and mobile support intake — [src/app/welcome/page.tsx:17](src/app/welcome/page.tsx); [docs/plans/2026-10-26-mobile-access-integration.md](docs/plans/2026-10-26-mobile-access-integration.md)
- Owner advisor "Rondo" and its four sub-flags (knowledge, weekly, business imports, business retrieval) — [src/lib/owner-advisor/config.server.ts:24-33](src/lib/owner-advisor/config.server.ts). See section 7.

**Built but hard-held in code (no flag can turn them on)**
- Updates (announcements), Conversations (messaging) and manager Reminders run only when the database server is loopback **and** the database name and comment match disposable-test patterns (`nevora_foundation_test_…` etc.) — [src/lib/communications/sql.ts:3-5](src/lib/communications/sql.ts); [src/lib/conversations/access.server.ts:15](src/lib/conversations/access.server.ts); [src/lib/workspace-presentation/service.ts:51,57-60](src/lib/workspace-presentation/service.ts); [src/lib/manager-reminders/service.server.ts:126,168](src/lib/manager-reminders/service.server.ts)
- Reason: communications retention decision "D04 remains unapproved. Communications are restricted to owned disposable development data" — [docs/product/operations-closeout-2026-11-11.md (R28)](docs/product/operations-closeout-2026-11-11.md)
- Clocker punch photos: "Optional isolated staging photo operations. Production capture stays unavailable" — [.env.example:78-85](.env.example)

**Partially built**
- Self-service signup UI: "Claude onboarding/signup page surfaces are absent from this checkout and the inspected current collab tree. There is no honest browser wizard acceptance yet." — [docs/handoffs/self-service-onboarding-readiness.md "Open integration and release gates"](docs/handoffs/self-service-onboarding-readiness.md). No `/signup` or `/onboarding` page exists in `src/app` (route listing for this note).
- Central billing pages exist in the app (`/pages/plans`, `/pages/nevora-billing`, `/pages/nevora-billing-return`, `/pages/es-facturacion`, `/pages/es-pago`) — [src/app/pages/](src/app/pages/); [next.config.ts](next.config.ts) (security headers block)
- Account deletion: intake, sign-in block and manual runbook fulfilment exist; "the automatic purge is a later push" — [docs/compliance/README.md](docs/compliance/README.md); [docs/compliance/account-deletion-runbook.md](docs/compliance/account-deletion-runbook.md)
- Native iOS/Android WebView shells exist locally but are unsigned and undistributed (section 4) — [native/README.md](native/README.md); [docs/native/phase-3-status.md](docs/native/phase-3-status.md)
- Spanish: sign-in and account pages, Clocker, emails and statements are bilingual; signed-in app pages are English (section 4).
- Rondo business connectors: a read-only connector contract exists, but "no real adapter is registered by the application in this release" — [src/lib/owner-advisor/business/connector.server.ts:12-14](src/lib/owner-advisor/business/connector.server.ts)
- Shared-database multi-tenancy ("Phase F"): `src/lib/tenancy/` and held migrations 0026/0027 are preparation that "no running path depends on" — [docs/product/saas-tenant-diagnosis-2026-10-20.md §2](docs/product/saas-tenant-diagnosis-2026-10-20.md); [db/migrations/README.md](db/migrations/README.md)

**Planned only (no implementing code found)**
- Puerto Rico labour-rules pack (Ley 379 overtime and meal periods). No code matches "379"/meal-penalty outside Rondo's legal-source list; it waits for labour-counsel sign-off — [docs/product/direction.md:164](docs/product/direction.md); [docs/product/FIXED-AND-REMAINING.md "Decisions only Jose can make"](docs/product/FIXED-AND-REMAINING.md)
- Phone clock-in: "phone clock-in is off"; no geolocation code — [src/components/employee-home-corp.tsx:22](src/components/employee-home-corp.tsx)
- Offline Clocker punch queue (B6) — [docs/product/direction.md:161](docs/product/direction.md)
- Leave balances/accruals, labour cost/budgets, sales forecasting, SMS: no implementing code found (grep for accrual/labor cost/Twilio/SMS returned nothing relevant). The Oct 20 business-analyst review listed them as gaps (rows 8, 9, 22) — [docs/product/reviews/gap-analysis-2026-10-20/business-analyst.md](docs/product/reviews/gap-analysis-2026-10-20/business-analyst.md)
- Rondo for Managers, business-system connectors, full 50-question qualification — [docs/product/2026-11-15-rondo-manager-roadmap.md](docs/product/2026-11-15-rondo-manager-roadmap.md)
- Automatic deletion of unpaid trial workplaces after 30 days: chosen by Jose, "an unshipped pure policy" — [docs/handoffs/2026-11-09-claude-website-backend-contract.md §4](docs/handoffs/2026-11-09-claude-website-backend-contract.md)
- Public uptime alerting (R34): "actual public uptime alerts/response are not established" — [docs/product/operations-closeout-2026-11-11.md](docs/product/operations-closeout-2026-11-11.md)

**Release state of everything above**
- Release 1's final local gate passed on Nov 4 (10,514 unit tests, plus migrations, Clocker and payroll integration suites) — [docs/handoffs/2026-11-04-release-1-gate-summary.txt](docs/handoffs/2026-11-04-release-1-gate-summary.txt). No later document records a promotion to main/production.
- Nov 16: "Phase 5 operating-readiness … HELD / NOT VERIFIED for hosted operation" — [docs/handoffs/2026-11-16-backend-phase5-operating-readiness.md](docs/handoffs/2026-11-16-backend-phase5-operating-readiness.md)
- Nov 9: "There is no verified usable production sign-in URL today." `nevora.team` was GoDaddy-parked. The `nevora` Vercel project's latest Production deployment was in ERROR (`missing_lock_file`) and its public alias returned 404 — [docs/handoffs/2026-11-09-claude-website-backend-contract.md §1](docs/handoffs/2026-11-09-claude-website-backend-contract.md)
- Oct 21: the operations reviewer found "Production's database sits at about migration 0002, and the release needs roughly 34 more migrations" — [docs/product/reviews/50-inspectors-2026-10-21/reports/46-ops-release.md](docs/product/reviews/50-inspectors-2026-10-21/reports/46-ops-release.md). The repo now holds 79 migration files up to 0067 — [db/migrations/](db/migrations/)
- The Nov 17 UI delivery on this branch says it is "local. Not pushed" as of writing, with 14,846 unit tests passing, 944 skipped and 1 failing (manual-publication) — [docs/handoffs/2026-11-17-claude-ui-delivery/README.md](docs/handoffs/2026-11-17-claude-ui-delivery/README.md). Note: `git status` now reports the branch up to date with origin.

### Inferences
- The live coffee customer is most likely running an older production build. A legacy `fuel-scheduler` Vercel project appears in docs ([docs/handoffs/2026-11-15-rondo-claude-credit-migration.md](docs/handoffs/2026-11-15-rondo-claude-credit-migration.md); [docs/handoffs/2026-10-27-pr36-merge-readiness.md](docs/handoffs/2026-10-27-pr36-merge-readiness.md)). None of the Oct–Nov feature work (payroll statements, Rondo, commerce, onboarding, passkeys, invitations at 7 days) is documented as reaching that customer.
- Gating the kiosk punch matters commercially. Time capture is the core of an hourly-workforce product, so a default deployment can schedule people but cannot record their hours at a kiosk unless an operator enables the punch flag and Clocker keys.
- The SQL hold on Updates/Conversations/Reminders means team communication, a standard demo feature for competitors, is unavailable in any hosted environment until a retention policy is approved and the code changes.

### Gaps
- Actual hosted flag values for the live customer and for development are explicitly "unobserved"; the docs do not show which flags the live coffee deployment uses.
- Shallow clone: the date of the last production deployment cannot be read from git.
- I did not check each route for module gating or runtime health; "live by default" means "no feature flag found", not "verified working in production".

## 2. Acquisition-to-revenue path: discover, evaluate, sign up, provision, onboard staff, pay

### Takeaway
A complete self-service funnel is designed and largely implemented on the backend: verified signup, automatic per-company Neon provisioning, Owner activation, invitation batches, Stripe trial, checkout, portal, plan change, dunning grace and lifecycle mail. It was exercised end to end only on isolated staging with two fictional companies and the Stripe sandbox. In practice the funnel is closed:
- the public marketing site and signup screens live outside this repo or don't exist yet;
- admission defaults to "closed" and new projects per day to 0;
- the production billing API origin is not accepted by code;
- the $19/$29 prices are labelled sandbox/proposed;
- tax is off;
- deletion, refunds, over-30-employee deals and support remain manual.

### Cited Findings

**Discover and evaluate**
- In this repo the bare domain is not a landing page: `/` redirects signed-out visitors to `/login` and signed-in ones to `/app` — [src/app/page.tsx:11-14](src/app/page.tsx)
- The marketing site is a separate Shopify theme on `www.thevelani.com` (VELANI brand). The commerce UI origin defaults to `https://www.thevelani.com` — [services/commerce/README.md (Catalog process configuration)](services/commerce/README.md); [docs/handoffs/2026-11-09-claude-website-backend-contract.md §3](docs/handoffs/2026-11-09-claude-website-backend-contract.md)
- On Nov 9 the staging commerce API did not allow `https://www.thevelani.com` in CORS. "No currently enabled website billing API can be assigned to `commerce_api_url`." `signup-staging.nevora.team` sat behind Vercel SSO — [docs/handoffs/2026-11-09-claude-website-backend-contract.md §3](docs/handoffs/2026-11-09-claude-website-backend-contract.md)
- `nevora.team` (the purchased product domain) was GoDaddy-parked on Nov 9; the apex is planned as the platform entry point — [same §1](docs/handoffs/2026-11-09-claude-website-backend-contract.md)
- Evaluation aids found in the repo: `/ui-preview/home` (a fictional preview for developers, per [CLAUDE.md](CLAUDE.md)), six web guides plus PDFs (Owner, Manager/Lead, Employee, Rondo, Operations, Developer) — [docs/guides/web/](docs/guides/web/). No public demo or sandbox account was found.

**Sign up (built, closed)**
- Backend: verified-email registration (same response whether or not an account exists), 30-minute verification, 24-hour pre-business session, 5 sends per email/IP per 15 minutes, separate control database, consent custody bound to `NEVORA_ONBOARDING_TERMS_VERSION`/`_PRIVACY_VERSION` — [docs/architecture/self-service-onboarding.md](docs/architecture/self-service-onboarding.md)
- Admission defaults closed. "Production admission defaults closed. Open admission with an approved-inbox fence must fail closed." A positive total provisioning cap is required — [docs/product/operations-closeout-2026-11-11.md "Controls and acceptance"](docs/product/operations-closeout-2026-11-11.md); [.env.example:14,120](.env.example)
- The legacy standalone commerce signup (`/v1/signup`, `/v1/setup`, `/v1/login-link`, `/v1/verify`) now returns 409 `use_onboarding` — [services/commerce/service.ts:89](services/commerce/service.ts)

**Provision (automated in design, gated)**
- A separate provisioner worker creates one Neon project per business through Neon REST v2. It applies the canonical migrations, creates an inactive Owner and restricted APP/WORKER roles, and writes an immutable receipt. Unknown creates are never blindly retried. "No database is dropped as compensation." — [docs/architecture/self-service-onboarding.md "Provisioning implementation checkpoint"](docs/architecture/self-service-onboarding.md)
- Each workplace gets its own hostname, `<slug>.<approved portal base domain>`, not a shared login with a company picker — [docs/handoffs/2026-11-09-claude-website-backend-contract.md §2](docs/handoffs/2026-11-09-claude-website-backend-contract.md)
- Staging proof (Nov 8): "two genuinely provisioned companies, real approved-inbox mail, sandbox payment/failure/Portal recovery, protected READY Preview and exact company DNS/TLS verified. All processing ends OFF." — [docs/handoffs/self-service-onboarding-readiness.md](docs/handoffs/self-service-onboarding-readiness.md). The Nov 12 window closed at 12:45 UTC, with the Render worker suspended — [docs/handoffs/2026-11-12-hosted-onboarding-billing-operations.md](docs/handoffs/2026-11-12-hosted-onboarding-billing-operations.md)
- Legacy path for existing or managed customers: an engineer runs `setup:company` against an empty database (one transaction; refuses existing schemas), then creates a separate Vercel project with per-company keys — [README.md "Single-company deployment"](README.md); [docs/product/multi-company-database-per-company-20261021.md](docs/product/multi-company-database-per-company-20261021.md)

**Onboard staff**
- Owner activation is a one-use bootstrap URL (first-Owner grant expires after 15 minutes). The Owner then signs in with a workplace-local ID and password — [docs/runbooks/self-service-onboarding.md](docs/runbooks/self-service-onboarding.md); [docs/handoffs/2026-11-09-claude-website-backend-contract.md §2](docs/handoffs/2026-11-09-claude-website-backend-contract.md)
- Invitation batches: at most 5 per POST, up to 50 reviewed targets, 168-hour validity — [docs/runbooks/self-service-onboarding.md](docs/runbooks/self-service-onboarding.md)
- Employees sign in with a workplace-local Employee ID + password, not email + password. Shared tablets use a 4-digit PIN — [docs/handoffs/2026-11-09-claude-website-backend-contract.md §2 table](docs/handoffs/2026-11-09-claude-website-backend-contract.md)
- Owner CSV roster import exists, but only on isolated (routed) deployments, and it is English-only "like every signed-in page" — [src/app/app/employees/import/page.tsx:19-27](src/app/app/employees/import/page.tsx)
- No automated "workplace ready" email existed on Nov 9 ("a later ready-notification email was not established") — [docs/handoffs/2026-11-09-claude-website-backend-contract.md §1](docs/handoffs/2026-11-09-claude-website-backend-contract.md). A later backend handoff adds a readiness-checked "ready" notice job — [docs/handoffs/2026-11-15-inspection-backend-remaining.md:53](docs/handoffs/2026-11-15-inspection-backend-remaining.md); [services/commerce/lifecycle-mail.ts:21](services/commerce/lifecycle-mail.ts)

**Pay: pricing model encoded in code**
- Two plans, priced flat per company by headcount band: **Small $19/month for up to 15 active non-Owner employees; Team $29/month for 16–30**. Above 30 the code throws `assisted_quote_required` — [services/commerce/model.ts:13-20](services/commerce/model.ts)
- Monthly USD only (`STRIPE_PRICE_SMALL`, `STRIPE_PRICE_TEAM` = 1900/2900 minor units, quantity one) — [services/commerce/README.md](services/commerce/README.md). No annual plan and no per-location or per-seat component; `planFor` takes only an employee count.
- Trial: 30 days, no card, counted from original provisioning; `/v1/plans` returns `trialDays: 30` — [services/commerce/service.ts:82-88](services/commerce/service.ts); [services/commerce/store.ts:92](services/commerce/store.ts); [src/lib/commerce/central-billing.ts:7,36](src/lib/commerce/central-billing.ts)
- Grace: 7 days after a failed renewal, only when paid coverage existed. Afterwards the state is `restricted`: operations blocked (HTTP 402 `subscription_required`) while billing and export stay available — [services/commerce/model.ts:27-48](services/commerce/model.ts); [services/commerce/README.md "Approved capacity"](services/commerce/README.md)
- Sandbox Stripe prices: `price_1UZb7J…` ($19/month), `price_1UZb7K…` ($29/month), account `livemode:false`; "No live account/charge is qualified." — [docs/handoffs/2026-11-11-codex-to-claude-payments-billing.md:100-105](docs/handoffs/2026-11-11-codex-to-claude-payments-billing.md)
- "Existing $19/$29 values are sandbox/proposed fixtures, not newly approved commercial prices." — [docs/handoffs/2026-11-09-claude-website-backend-contract.md §5](docs/handoffs/2026-11-09-claude-website-backend-contract.md). This conflicts with the Oct 21 recommendation of "~$39/$79 per location/month, 30-day trial" — [docs/product/FIXED-AND-REMAINING.md "Decisions only Jose can make"](docs/product/FIXED-AND-REMAINING.md) — and with the market analyst's advice to "Charge per location, not per user" — [docs/product/reviews/gap-analysis-2026-10-20/market-analyst.md:199](docs/product/reviews/gap-analysis-2026-10-20/market-analyst.md)
- Over 30 employees: Jose approved "Velani reviews eligibility … same 30-day, no-card trial … response within two business days". The implementation state is "approved policy, not an enabled assisted-capacity product" — [docs/handoffs/2026-11-09-claude-website-backend-contract.md §5](docs/handoffs/2026-11-09-claude-website-backend-contract.md)

**Checkout, subscription, invoices, dunning, cancellation**
- Path: Owner signs in → `POST /api/commerce/handoff` → one-time `/v1/handoff/exchange` → `/v1/status`, `/v1/checkout`, `/v1/portal`. Employees and Managers have no billing rights — [docs/handoffs/2026-11-09-claude-website-backend-contract.md §3](docs/handoffs/2026-11-09-claude-website-backend-contract.md)
- During the trial, Checkout runs in setup mode; the worker then creates the subscription keeping the original trial end. Plan change goes through `POST /v1/plan-change`. Downgrading to Small requires ≤15 active non-Owners — [services/commerce/README.md "Billing operations", "Self-service plan confirmation"](services/commerce/README.md)
- Invoices and cancellation run through the Stripe Customer Portal ("payment methods/invoices, and end-of-paid-period cancellation"). Collection retries are configured for the 7-day window — [services/commerce/README.md](services/commerce/README.md)
- Lifecycle mail templates: `ready`, `trial` ("Your NEVORA trial is ending"), `renewal_failed`/`payment_failed` — [services/commerce/lifecycle-mail.ts:21](services/commerce/lifecycle-mail.ts). Seven-day and one-day trial reminder jobs — [docs/handoffs/2026-11-15-inspection-backend-remaining.md:51-53](docs/handoffs/2026-11-15-inspection-backend-remaining.md)
- "Refund/dispute decisions remain operator procedures; this release does not automatically delete records, issue refunds, or invent retention policy." — [services/commerce/README.md](services/commerce/README.md)
- Sales tax: "Jose has not confirmed tax registrations. **Keep Tax disabled.**" — [services/commerce/README.md "Restricted-key capabilities and Tax activation"](services/commerce/README.md)
- The production billing API origin is not accepted by code. `centralBillingApiOrigin` returns an origin only for local development over loopback HTTP, or for staging + `isolated` mode + onboarding env `test` on a Neon `br-…-commerceapi` host. Otherwise it returns `null` — [src/lib/commerce/central-billing-config.ts:9-16](src/lib/commerce/central-billing-config.ts)
- "Existing customers are not automatically enrolled." — [services/commerce/README.md "Activation and rollback"](services/commerce/README.md)

**Account and workplace deletion**
- Person-level deletion is a verified request completed manually within 30 calendar days by policy — [src/lib/legal/policies.ts:18,74,120](src/lib/legal/policies.ts); [docs/compliance/account-deletion-runbook.md](docs/compliance/account-deletion-runbook.md)
- Workplace-level: "No automatic trial-workplace deletion job or three-day deletion deadline was found." "Payroll export is not a complete workplace-data export." — [docs/handoffs/2026-11-09-claude-website-backend-contract.md §4](docs/handoffs/2026-11-09-claude-website-backend-contract.md)
- R27: "Fulfillment is manual; restored company stays suspended" — [docs/product/operations-closeout-2026-11-11.md](docs/product/operations-closeout-2026-11-11.md)

**Pre-launch checklist the team itself lists as unmet**
- "verify Stripe account/test-mode checkout, approved SMTP …, worker scheduling, exact deployment SHA, database separation/backup restore, ingress/client-IP rate limiting, current retention/commercial notices and cost per company. None of these external states is established by local tests." — [services/commerce/README.md "Activation and rollback"](services/commerce/README.md)
- Governance verdict: "**NO-GO for public Production** until exact source, recovery/UI, environment/restore, hosted billing and Jose release gates are evidenced." — [docs/handoffs/2026-11-09-claude-website-backend-contract.md "Checks and release boundary"](docs/handoffs/2026-11-09-claude-website-backend-contract.md)

### Inferences
- **Per-company flat banding at $19/$29** is cheaper than the market references the team itself collected:
  - per user: $2.50–$9;
  - per location: $24–$135, e.g. Homebase $30/$70/$120 per location, 7shifts ~$40–$135 per location ([docs/product/competitive-2026-10.md:82-93](docs/product/competitive-2026-10.md));
  - payroll add-ons: $39–$49 base plus $6–$8 per person (same source).

  NEVORA's banding has no location dimension, so a 3-location business with 30 staff would pay $29/month total.
- Revenue per customer is capped at $29/month until the over-30 assisted tier is built. A 1,000-customer base would yield at most ~$29k MRR before payroll or AI add-ons, none of which are priced.
- Steps that still need a human operator: opening admission and raising project caps; approving Neon resource policy; DNS for workplace hosts; any >30-employee customer; refunds and disputes; deletion fulfilment; Tax decisions; support by email; and migrating or enrolling legacy single-company customers.

### Gaps
- The Shopify marketing site, pricing page and the separate `velani-ai` website-chat service are not in this repo, so their content and conversion flow could not be inspected.
- No final pricing decision document was found. Whether $19/$29 or per-location pricing will be adopted is undecided in the docs.
- No discounting, coupons, annual billing, multi-currency or partner/reseller model is encoded.

## 3. Tenancy and scaling model: what "one company per database" costs from 1 → 100 → 1,000 customers

### Takeaway
Isolation is by separate database per company, enforced by a singleton constraint. The team's own docs conclude this is safe and needs no code changes, but operator effort and release windows "grow linearly". The newer isolated-onboarding design automates provisioning (one Neon project per company behind one shared app deployment with per-company hostnames). Migrations, monitoring, backups and support remain per-database with no fleet tooling or cross-company console.

Neon's own plan limits cap projects at 100 on Free/Launch and 1,000 on Scale, so the one-project-per-company design hits a provider ceiling at roughly 100 customers unless it moves to Scale or Neon's platform program. The shared-database alternative is an unscheduled draft PRD with four open decisions.

### Cited Findings
- "NEVORA is a single-company application, enforced by the database … A shared multi-tenant database would be a new project, not a feature to switch on." `workspaces.singleton` is UNIQUE; a second workspace fails with `23505` — [docs/product/saas-tenant-diagnosis-2026-10-20.md "Short answer", §1](docs/product/saas-tenant-diagnosis-2026-10-20.md)
- 61 of 103 tables have `workspace_id`; core tables (employees, sessions, shifts, time_entries …) do not. "No table has row-level security turned on." — [same §2](docs/product/saas-tenant-diagnosis-2026-10-20.md)
- Approved direction (Oct 21) for more companies: a separate Neon project and separate Vercel project (or environment) per company, with fresh VAPID keys, worker secret and SMTP identity per company — [docs/product/multi-company-database-per-company-20261021.md "Per-company provisioning"](docs/product/multi-company-database-per-company-20261021.md)
- Costs the team itself names:
  - "Releases: one frozen SHA, deployed once per company. A migration runs once per database … a release window scales with the company count."
  - "Support: every question starts with 'which company'."
  - "Cost: each company adds a Neon project and a Vercel project. Track per-company cost before committing to a price."
  - "Operational effort grows linearly with companies. Past a handful, the shared-database project … becomes the better investment."
  - No cross-company reporting or administration.

  — [docs/product/multi-company-database-per-company-20261021.md "Operating several companies", "Limits"](docs/product/multi-company-database-per-company-20261021.md)
- Isolated self-service mode: one deployment with registered per-company hosts, a control database for routing, and a per-company Neon project created by the provisioner. Staging companies ran on Neon Free at 0.25 CU with 6-hour history — [docs/architecture/self-service-onboarding.md](docs/architecture/self-service-onboarding.md); [docs/handoffs/2026-11-08-integrated-onboarding-commerce.md:32,60](docs/handoffs/2026-11-08-integrated-onboarding-commerce.md)
- Upgrades: "An upgrade/restore must apply only verified missing additive migrations from the approved source, while suspended." — [docs/runbooks/self-service-onboarding.md:7](docs/runbooks/self-service-onboarding.md). Migration order is a hand-maintained registry because prefixes repeat (0023–0027, 0031, 0032): "Never apply these files in filename order." — [db/migrations/README.md](db/migrations/README.md). There are 79 migration files — [db/migrations/](db/migrations/)
- Only rehearsal tooling exists for migration plans: `scripts/rehearsal/migration-plan.mts`, `database-rehearsal.mts` — [scripts/rehearsal/](scripts/rehearsal/). No multi-database migration orchestrator was found. "Production application remains a separately authorized, per-database operation" — [db/migrations/README.md](db/migrations/README.md)
- Restore leaves the company "SUSPENDED and disables old logins/secrets"; reactivation needs a separate review — [docs/handoffs/self-service-onboarding-readiness.md](docs/handoffs/self-service-onboarding-readiness.md)
- Operator tooling is CLI only:
  - `onboarding:operator` supports `status`, `suspend`, `restore`, `retire-restored` — [scripts/onboarding-operator.mts](scripts/onboarding-operator.mts)
  - `commerce:operator` supports `migrate`, `register-slot` — [services/commerce/operator.ts](services/commerce/operator.ts)
- Workers: one managed workforce host (Render, $7.25/month baseline within a $10/month ceiling, 1 GB disk) enrolled per company, plus an independent monitor — [docs/handoffs/2026-11-12-hosted-onboarding-billing-operations.md](docs/handoffs/2026-11-12-hosted-onboarding-billing-operations.md)
- Neon plan limits (live pricing page, Nov 2026):
  - Free: 100 projects, 100 CU-hours/project, 1 GB storage per project (20 GB total), 6-hour history.
  - Launch: 100 projects, $0.106/CU-hour, up to 7-day history.
  - Scale: 1,000 projects ("more on request"), $0.222/CU-hour, up to 30-day history.
  - No per-project fee; an "Agent Plan" program exists for platforms that provision databases for their users.

  — [https://neon.com/pricing](https://neon.com/pricing)
- Vercel: Hobby allows 200 projects, Pro unlimited, Pro $20 per developer seat per month — [https://vercel.com/docs/plans/hobby](https://vercel.com/docs/plans/hobby). The team's Vercel account was Hobby and both Neon orgs were Launch on Nov 5. A proposed Vercel Pro team ($20/month plus usage) was put on hold — [docs/native/phase-3-status.md "Isolated staging packet prepared"](docs/native/phase-3-status.md)
- Open decisions in the shared-database PRD (status: "draft for Jose's approval — not scheduled, not authorized"):
  - D1: tenant entry (subdomain, path or company code);
  - D2: Employee ID namespace;
  - D3: push key strategy;
  - D4: timing.

  — [docs/product/prd-shared-multitenancy-draft-20261021.md](docs/product/prd-shared-multitenancy-draft-20261021.md)
- Also undecided: the production portal base domain and wildcard DNS ("must be finalized with the release candidate") — [docs/handoffs/2026-11-09-claude-website-backend-contract.md §1](docs/handoffs/2026-11-09-claude-website-backend-contract.md)
- Known scale defects found in Oct (status not re-verified here):
  - whole-table JSON snapshots and table locks on every guarded schedule write ("10.6s p95" Manager Schedule on one seeded week);
  - row caps that blank Home/Inbox at ~250 employees;
  - Timecards throws above 300 employee cards.

  — [docs/product/code-inspection-2026-10-21.md P2, P5](docs/product/code-inspection-2026-10-21.md); [docs/product/FIXED-AND-REMAINING.md "Backend" item 5](docs/product/FIXED-AND-REMAINING.md). Index migration `0038_read_path_indexes.sql` was added later — [db/migrations/](db/migrations/)

### Inferences
- **1 customer** (today): manual `setup:company` plus a hand-configured deployment is workable.
- **100 customers**: the 100-project cap on Neon Free and Launch is reached. Each release means 100 suspended, additive per-database migrations, with no orchestrator and an operator CLI that handles one company at a time. Support must pick the right database for each question with no admin console. The privacy policy promises a 7-day restore-history window ([src/lib/legal/policies.ts:20](src/lib/legal/policies.ts)) that Neon Free's 6-hour history cannot meet, so Launch or Scale is needed anyway.
- **1,000 customers**: requires Neon Scale (1,000-project cap, "more on request") or the Agent program, fleet migration and monitoring automation, and very likely the shared-database project the team itself says "becomes the better investment" past a handful.
- **Compute against price** (my arithmetic, not a team figure): a 0.25 CU database running continuously on Launch would cost about 182.5 CU-h × $0.106 ≈ $19.35/month in compute alone, equal to the Small plan price. Unit economics therefore depend on scale-to-zero behaviour for each customer's database, plus per-company worker, mail and AI costs. No per-company cost model exists in the docs ("Track per-company cost before committing to a price").

### Gaps
- No measured hosted per-company cost (Neon CU-hours, storage, Vercel functions, Render, SMTP) exists in the docs.
- No load test on hosted Neon. The p95 figures are local or seeded.
- Whether the 61-of-103 `workspace_id` count and the scale defects have changed since Oct 21 was not re-measured.

## 4. Distribution: PWA, native iOS/Android, app stores, localization, accessibility

### Takeaway
- **PWA:** NEVORA ships as a web app/PWA, but the service worker is registered only when a user turns on push notifications.
- **Native:** iOS and Android WebView shells are built and tested locally. Neither is signed or uploaded: Apple enrollment for VELANI LLC was "Pending" on Nov 5, and only a Google Play development app record exists.
- **Spanish:** limited to the signed-out/account pages, Clocker, emails, statements and some prepared copy modules. Every signed-in app page renders in English, and full translation was estimated at 8–11 engineering weeks, even though Puerto Rico is the first market.
- **Accessibility:** a strong design target (WCAG 2.2 AA, axe scans), but physical-device and screen-reader passes are outstanding.

### Cited Findings
- PWA manifest route `src/app/fuel-portal.webmanifest`, linked from the app and login layouts — [src/app/app/layout.tsx:94](src/app/app/layout.tsx). The service worker `/fuel-portal-sw.js` is registered with scope `/app` from the notification device client only — [src/lib/notifications/device-client.ts:415](src/lib/notifications/device-client.ts). Branded offline page: [public/fuel-portal-offline.html](public/fuel-portal-offline.html)
- Oct 21 backlog item: "PWA: register the service worker for every role, widen the manifest scope, keep last-known shifts offline" — [docs/product/FIXED-AND-REMAINING.md UI item 9](docs/product/FIXED-AND-REMAINING.md)
- The code inspection found push silently lost: the service-worker whitelist omitted six server-built kinds — [docs/product/code-inspection-2026-10-21.md P3](docs/product/code-inspection-2026-10-21.md) (fix status not re-checked)
- Native architecture: "direct iOS WKWebView and Android WebView shells" loading the Next.js UI. Development bundle id `com.velani.nevora.development`. The Capacitor prototype is retained separately under `native/capacitor-spike/` — [native/README.md](native/README.md). The Capacitor route was approved Oct 17 only as a two-week spike — [docs/product/prd-capacitor-spike.md](docs/product/prd-capacitor-spike.md)
- Store status (Nov 5–6):
  - Apple Developer "VELANI LLC (Pending) … Your documentation is in review"; 0 provisioned devices.
  - Google Play account and "NEVORA Development" app record created (Free, English).
  - Firebase project on the no-cost Spark plan.
  - "Play distribution-key selection, actual provider enrollment/delivery, uploads and internal distribution have not occurred."
  - "Phase 3 is not complete." Paid hosting "ON HOLD".

  — [docs/native/phase-3-status.md](docs/native/phase-3-status.md)
- Android minimum Android 10/API 29 with WebView 156.0.8078.50+. A WebView-149 accessibility-tree failure on repeated recreation was a release blocker until the runtime guard — [docs/native/phase-3-status.md](docs/native/phase-3-status.md). No later native status document was found (latest `docs/native` commits predate the shallow window).
- Native push (APNs/FCM) code exists — [src/lib/native-push/providers/fcm.ts](src/lib/native-push/providers/fcm.ts); [db/migrations/0046_native_push.sql](db/migrations/0046_native_push.sql). Real delivery is unverified — [docs/native/phases-1-2-status.md:27](docs/native/phases-1-2-status.md)
- The app-store account-deletion requirement (Apple 5.1.1) is addressed by in-app "Delete my account" — [docs/compliance/README.md](docs/compliance/README.md)
- Localization:
  - The root layout hard-codes `<html lang="en">` — [src/app/layout.tsx:37](src/app/layout.tsx)
  - Sign-in language comes from an `nv-lang` cookie or Accept-Language — [src/lib/auth-lang.server.ts](src/lib/auth-lang.server.ts)
  - The roster page says it is "English for now, like every signed-in page; the Spanish copy is in the same module" — [src/app/app/employees/import/page.tsx:26-27](src/app/app/employees/import/page.tsx)
- Spanish copy modules exist for auth, Clocker, mobile access, support, account deletion, payroll import, roster import, reminders, restrictions, review details, Owner "moments" and Rondo business, but most signed-in pages render `.en` — [src/lib/auth-copy.ts](src/lib/auth-copy.ts), [src/components/roster-import/copy.ts](src/components/roster-import/copy.ts), [src/components/clocker-owner-copy.ts](src/components/clocker-owner-copy.ts)
- Invitation, reset and password-changed emails are sent in English then Spanish because "the recipient's language isn't stored". "The policy pages … are still English only; translating legal text needs Legal." — [docs/handoffs/2026-11-02-sign-in-limits-and-spanish-emails.md](docs/handoffs/2026-11-02-sign-in-limits-and-spanish-emails.md)
- Billing pages and Stripe pages support `en`/`es` — [docs/handoffs/2026-11-09-claude-website-backend-contract.md "Spanish journey"](docs/handoffs/2026-11-09-claude-website-backend-contract.md). Pay statement PDFs are planned in EN and ES — [docs/product/reviews/gap-analysis-2026-10-20/business-analyst.md "End-to-end flow check"](docs/product/reviews/gap-analysis-2026-10-20/business-analyst.md)
- "Spanish-first is the weakest trait today. Outside the Clocker, you can't use NEVORA in Spanish yet." (Oct 17) — [docs/product/direction.md:18,35](docs/product/direction.md). Full translation "~8–11 engineering weeks" — [docs/product/FIXED-AND-REMAINING.md](docs/product/FIXED-AND-REMAINING.md). TEAM-RULES still claims "full Spanish set it apart" — [docs/product/TEAM-RULES.md "What we are building"](docs/product/TEAM-RULES.md)
- A Spanish register decision ("tú" or "usted") is still pending — [docs/handoffs/2026-11-17-claude-ui-delivery/README.md](docs/handoffs/2026-11-17-claude-ui-delivery/README.md)
- Accessibility constants: targets ≥44px, WCAG 2.2 AA, visible focus, reduced motion — [docs/product/TEAM-RULES.md](docs/product/TEAM-RULES.md). Axe is used in 14 QA scripts/tests (count for this note).
- Outstanding: "By hand: a real touch device, Safari and Firefox, a screen reader, Windows High Contrast, 200% text on the signed-in screens…" — [docs/handoffs/2026-11-17-claude-ui-delivery/README.md "Pending checks"](docs/handoffs/2026-11-17-claude-ui-delivery/README.md). The VoiceOver/TalkBack device pass is still open from cycle 1 — [docs/product/README.md](docs/product/README.md)

### Inferences
- Competitors all ship rated native apps ("All eleven competitors ship native apps rated 4.4 or higher" — [docs/product/prd-capacitor-spike.md §2](docs/product/prd-capacitor-spike.md)). NEVORA cannot be "downloaded" by employees until Apple enrollment completes and signing, upload and review happen; none of these is scheduled in the docs.
- The PR-market differentiator (Spanish) is true for the kiosk and sign-in only, not for daily employee or manager use.

### Gaps
- Whether Apple enrollment has been approved since Nov 5 is not recorded.
- No accessibility statement or VPAT was found.

## 5. Integrations ecosystem

### Takeaway
NEVORA connects to its own infrastructure providers (Stripe, Neon, Vercel, Render, SMTP, Web Push, APNs/FCM, AI model APIs) and offers file-based payroll interchange: a CSV hours export, including one ADP RUN layout, and CSV import of pay amounts calculated by outside payroll providers. It has no API integration with any payroll, POS, accounting, HRIS, SSO, SMS or chat system. There is no public API, webhook or Zapier surface. Rondo's business-data "connector" is a contract with no adapter.

### Cited Findings
- Dependencies: `stripe` 23.1.0, `nodemailer` 10.4.0 (SMTP), `web-push` 3.6.7, `@simplewebauthn/server` (passkeys), `@neondatabase/serverless`, `@neon/functions`, `pdf-lib` — [package.json](package.json)
- Payroll interchange:
  - export formats limited to `CUSTOM_CSV` and `ADP_RUN_GENERIC_V1`, with per-employee provider ID mapping — [src/lib/payroll-export/model.ts:15,42,55](src/lib/payroll-export/model.ts)
  - imported statements tag `sourceProvider` as `ADP_RUN | QUICKBOOKS_PAYROLL | PAYCHEX | GUSTO | OTHER` (labels on CSV imports, not API connections) — [src/lib/payroll/contracts.ts:23](src/lib/payroll/contracts.ts); [src/lib/payroll/csv-import.ts](src/lib/payroll/csv-import.ts)
- The Oct 20 review found the hours export "cannot express overtime, meal penalties or paid leave" (one constant earnings code) — [docs/product/reviews/gap-analysis-2026-10-20/business-analyst.md row 3](docs/product/reviews/gap-analysis-2026-10-20/business-analyst.md). Later mapping sources add `paidHours`, `unpaidBreakHours`, `paidRestHours` — [src/lib/payroll-export/model.ts:13](src/lib/payroll-export/model.ts). No regular/overtime split field was found.
- Calendar: one-way ICS feeds only — [src/app/api/calendar/[token]](src/app/api/calendar)
- Email: SMTP for recovery, invitations, onboarding verification and billing lifecycle. Remote SMTP in test environments is restricted to one approved mailbox — [.env.example:87-97](.env.example); [docs/runbooks/self-service-onboarding.md](docs/runbooks/self-service-onboarding.md)
- Push: Web Push via VAPID; native APNs/FCM — [src/lib/native-push/providers/fcm.ts](src/lib/native-push/providers/fcm.ts)
- AI providers: OpenAI (Responses/Chat), Neon AI Gateway, Anthropic Messages — [src/lib/owner-advisor/config.server.ts:39-56](src/lib/owner-advisor/config.server.ts)
- Rondo finance/sales: "Strict JSON and explicitly mapped CSV imports … USD/EUR remain separate" — [docs/handoffs/2026-11-16-rondo-business-evidence-backend.md](docs/handoffs/2026-11-16-rondo-business-evidence-backend.md). "No route accepts a registration, URL, credential or handle … no real adapter is registered" — [src/lib/owner-advisor/business/connector.server.ts:12-14](src/lib/owner-advisor/business/connector.server.ts)
- Roadmap: "Read-only source inventory comes before selecting accounting, POS, inventory or other provider-specific connectors" — [docs/product/2026-11-15-rondo-manager-roadmap.md §0, §3](docs/product/2026-11-15-rondo-manager-roadmap.md)
- Not found in code: grep found zero implementing files for Clover, Xero, Okta, SAML, Twilio, SendGrid, Postmark, Slack and Square/Toast as integrations. (`toast`/`square` hits are UI toasts and shapes; the 2 `oidc` hits are unrelated.)
- The Oct 20 review flagged "no POS or payroll API integrations", SMS absence and push-only alerts as P1/P2 gaps — [docs/product/reviews/gap-analysis-2026-10-20/business-analyst.md rows 8, 22](docs/product/reviews/gap-analysis-2026-10-20/business-analyst.md)
- `/api/mobile/v1` serves the native shells (an internal surface, not a public API) — [src/app/api/mobile/v1](src/app/api/mobile)

### Inferences
- Missing integrations an hourly-workforce SMB buyer would expect:
  - payroll API sync (Gusto, ADP, QuickBooks Payroll, Paychex);
  - POS sales and labour-percentage (Square, Toast, Clover — directly relevant to a coffee drive-through);
  - accounting (QuickBooks/Xero);
  - Google/Microsoft sign-in or SSO;
  - SMS shift alerts;
  - two-way Google/Outlook calendar;
  - Slack/Teams;
  - hiring, onboarding and e-signature;
  - an open API, webhooks or Zapier.
- File-only payroll interchange keeps NEVORA dependent on manual export/import every pay period.

### Gaps
- Which payroll provider the live coffee customer uses, and whether its CSV is accepted, is not documented.

## 6. Product analytics, instrumentation and operator console

### Takeaway
There is no product analytics of any kind: no event tracking, activation/retention/churn metrics, feature-usage telemetry or analytics vendor. PRD "metrics" are lab UX measures (taps, positions). Diagnostics exist (bounded server-error classes, support reference IDs, a worker/queue health monitor), but there is no error-tracking service, and Oct 21 found zero server-side logging. There is no web admin or operator console for running many customers; operations happen through CLIs, provider dashboards and Jira.

### Cited Findings
- Grep for analytics, telemetry, track, PostHog, Mixpanel, Amplitude, Segment, gtag, Vercel Analytics, Sentry, Datadog and OpenTelemetry finds no instrumentation in `src`/`services`. Only a finder keyword string `'reports insights hours analytics'` matches — [src/lib/finder.ts:24](src/lib/finder.ts)
- Firebase "Google Analytics was unlinked" on the native project — [docs/native/phase-3-status.md](docs/native/phase-3-status.md)
- PRD metrics are UI lab measures, e.g. "Taps from Home to the coverage periods page at 390" — [docs/product/prd-owner-setup-card.md §8](docs/product/prd-owner-setup-card.md)
- Oct 21: "zero server-side logging anywhere — every catch discards the error" — [docs/product/code-inspection-2026-10-21.md "Observability"](docs/product/code-inspection-2026-10-21.md)
- Since then, a server-error helper extracts error class and SQLSTATE without leaking data — [src/lib/server-error.ts](src/lib/server-error.ts). A response-local diagnostic/support reference contract was added (commit `722babea`, "feat(support): add response-local diagnostic reference contract") — [git log](.git). Observability spec: "validate static route + generated request UUID + bounded error class/SQLSTATE/digest only" — [docs/handoffs/2026-11-16-backend-phase5-operating-readiness.md item 6](docs/handoffs/2026-11-16-backend-phase5-operating-readiness.md)
- Health monitoring: an independent workforce monitor and queue health exist — [services/hosted/neon/workforcemonitor.entry.ts](services/hosted/neon/workforcemonitor.entry.ts); [src/lib/operations/queue-health.ts](src/lib/operations/queue-health.ts). "No current alert route, backup responder or end-to-end log-reference drill verified." — [docs/handoffs/2026-11-16-backend-phase5-operating-readiness.md](docs/handoffs/2026-11-16-backend-phase5-operating-readiness.md)
- On-call: "Primary: Jose. Secondary: Ilianis Soto. Coverage: 24/7." No drill record exists. Critical acknowledgement target is 15 minutes — [docs/runbooks/renewal-and-on-call.md](docs/runbooks/renewal-and-on-call.md)
- Operator tooling is CLI only (section 3). The commerce catalog has an audit table, but the README says to inspect "durable job state and the audit table" directly — [services/commerce/README.md](services/commerce/README.md)
- The Oct 20 review: "No admin console or safe 'view as' for support. … Debugging a customer issue needs direct database access" — [docs/product/reviews/gap-analysis-2026-10-20/business-analyst.md row 12](docs/product/reviews/gap-analysis-2026-10-20/business-analyst.md). No such console was found in `src/app` routes (none under `/admin` or `/operator`).
- In-product health signals that exist per company: an Owner setup card and readiness evaluator — [src/lib/onboarding/readiness.server.ts](src/lib/onboarding/readiness.server.ts); [docs/product/prd-owner-setup-card.md](docs/product/prd-owner-setup-card.md)

### Inferences
- Without instrumentation NEVORA cannot measure trial-to-paid conversion, time-to-first-published-schedule, weekly active managers or employees, punch volume, feature adoption, or churn risk.
- The commerce catalog holds trial, paid and restricted states and could become the basis of a billing dashboard, but none exists.
- Support at many customers would depend on per-database queries by a two-person on-call roster.

### Gaps
- The docs do not say whether Vercel or Neon dashboards are used informally for usage insight.

## 7. The AI "Owner advisor" (Rondo) and other differentiators

### Takeaway
Rondo is a substantial Owner-only, tool-using assistant that reads company data (staffing, coverage, timecards, insights, memory, fixed legal sources, optional company knowledge and imported finance/sales records). It can prepare schedule coverage drafts that the Owner explicitly approves. It is off by default behind a parent flag plus data-approval, model, daily-cap and key settings. Its Anthropic route is hard-coded to a promotional credit grant that expired 2026-11-18 00:00 UTC.

Model evaluations so far were tiny (≈$0.15 of tokens, single-digit dollar caps). The team's own 50-question 10/10 target is unexecuted, no recurring AI budget exists, and competitors already bundle AI free.

### Cited Findings
- Admission: Owner only — [src/lib/owner-advisor/authority.server.ts:25,41](src/lib/owner-advisor/authority.server.ts); "Manager admission is not implemented" — [docs/product/rondo-operating-contract.md "Current capability inventory"](docs/product/rondo-operating-contract.md)
- Gating: `readConfig` returns null unless all of these hold — [src/lib/owner-advisor/config.server.ts:17-33](src/lib/owner-advisor/config.server.ts):
  - the ownerAdvisor flag is on;
  - `NEVORA_OWNER_ADVISOR_DATA_APPROVED=true`;
  - a model is set;
  - a daily limit of 1–100 is set;
  - the provider and API style are valid;
  - a key is present.
- Sub-flags: knowledge, weekly, business imports, business retrieval — [.env.example:17-25](.env.example)
- Anthropic path requires model `claude-sonnet-5-5` and an active credit window ending no later than `ANTHROPIC_CREDIT_GRANT_END = "2026-11-18T00:00:00Z"` — [src/lib/owner-advisor/anthropic-policy.ts:1-9](src/lib/owner-advisor/anthropic-policy.ts); [src/lib/owner-advisor/config.server.ts:40-44](src/lib/owner-advisor/config.server.ts). The grant: "$200 … granted November 13 … Expiry is November 18 at 00:00 UTC" — [docs/handoffs/2026-11-15-rondo-claude-credit-migration.md:58-62](docs/handoffs/2026-11-15-rondo-claude-credit-migration.md)
- Capabilities (tools):
  - `company_briefing`, `published_staffing`;
  - `coverage_investigation`/`coverage_proposals`/`coverage_plan`;
  - `operational_insights`, `attendance_payroll_review`;
  - explicit private memory and notebook;
  - fixed-source `legal_research` (6 sources: PR DTRH Law 41 notice, OGP Law 379 PDF, four US federal eCFR/GPO items);
  - optional `company_knowledge`;
  - business finance/sales tools.

  "Sales, banking, cash flow, inventory, customers, contracts and external tools: No such tools." "Continuous monitoring … unattended business management are not established." — [docs/product/rondo-operating-contract.md](docs/product/rondo-operating-contract.md); [src/lib/owner-advisor/legal-sources.ts](src/lib/owner-advisor/legal-sources.ts)
- Actions: separate canonical coverage prepare/apply/check commands with server rechecks. Model read tools "do not independently publish, notify, transfer money" — [docs/product/rondo-operating-contract.md](docs/product/rondo-operating-contract.md); [src/lib/owner-advisor/coverage-actions.server.ts](src/lib/owner-advisor/coverage-actions.server.ts)
- Legal research gives no legal clearance: "`QUALIFIED_LEGAL_REVIEWS` defaults to empty … always returns `readiness: unverified`, `financialClearance: false`" — [docs/operations/owner-advisor-legal-review.md](docs/operations/owner-advisor-legal-review.md)
- Cost evidence:
  - Sonnet 5.5 at "$2/$10 per million input/output tokens".
  - Seven native attempts used 44,198 input / 1,319 output tokens, a list-price estimate of $0.101586 (reservation $0.759830). Combined comparison estimate $0.145418.
  - Median accepted-answer latency 3.077 s.

  — [docs/handoffs/2026-11-15-rondo-claude-credit-migration.md:36-40,160-178](docs/handoffs/2026-11-15-rondo-claude-credit-migration.md)
- An earlier OpenAI-model evaluation ran under a "$10/40-attempt approval". The high-reasoning variant "failed on its second HTTP exchange"; 7 attempts reserved at most $1.75 — [docs/handoffs/2026-11-09-owner-ai-live-evaluation-result.md:3-9](docs/handoffs/2026-11-09-owner-ai-live-evaluation-result.md)
- "Governance is **NO-GO for cutover** until credential/spend/data/hosted gates pass." "Hosted development configured/deployed/switched/production: no." — [docs/handoffs/2026-11-15-rondo-claude-credit-migration.md](docs/handoffs/2026-11-15-rondo-claude-credit-migration.md)
- Target: "all 50 Owner questions at 10/10 each". The standard "proposes at least 500 transcripts" but this is "not an authorized spend". "No completion date or recurring spend has been fabricated." — [docs/product/2026-11-15-rondo-manager-roadmap.md](docs/product/2026-11-15-rondo-manager-roadmap.md). The 16-scenario leadership pack has model judgment "not executed" — [docs/product/rondo-operating-contract.md](docs/product/rondo-operating-contract.md)
- Phase 5 (Nov 16): "AI/Rondo … no model call … Fifty unexecuted cases are not qualification." — [docs/handoffs/2026-11-16-backend-phase5-operating-readiness.md](docs/handoffs/2026-11-16-backend-phase5-operating-readiness.md)
- Market context the team recorded: "AI became a free inclusion. Deputy's pricing page now says Deputy AI comes with every plan … Gusto charges nothing for Gus or Cofounder" — [docs/product/competitive-2026-10.md:28](docs/product/competitive-2026-10.md)
- The privacy policy's processor list names only Vercel, Neon, an email provider and browser push services. It names no AI model provider, Stripe or Render — [src/lib/legal/policies.ts:21](src/lib/legal/policies.ts) (grep for stripe/anthropic/openai/render/Rondo in that file: 0 matches)
- Other differentiators in code:
  - automatic weekly drafting (Build Week/Fill Gaps);
  - append-only corrections, timecard revisions and immutable payroll receipts with exact-rational money math;
  - location-scoped Manager authority;
  - shared-tablet Clocker with PINs and optional photo evidence;
  - bilingual kiosk;
  - Puerto Rico time zone / Monday-to-Sunday week as configuration.

  — [docs/product/code-inspection-2026-10-21.md "What the inspectors found sound"](docs/product/code-inspection-2026-10-21.md); [docs/product/reviews/gap-analysis-2026-10-20/business-analyst.md "What already works"](docs/product/reviews/gap-analysis-2026-10-20/business-analyst.md); [README.md](README.md)

### Inferences
- **Per-answer cost:** at the measured token mix, one Rondo attempt costs about $0.015 at list price (≈6.3k input and 190 output tokens). At the maximum configurable daily limit of 100 that is roughly $1.50/day, or ~$45/month per company. This exceeds the $19 and $29 plan prices if heavily used. The conservative reservation (~$0.11/attempt) would imply up to ~$11/day. Real usage and the meaning of the daily limit (per company or per Owner) were not verified.
- **Anthropic cut-off:** after 2026-11-18 any deployment configured for the Anthropic provider gets a null config (advisor unavailable) until code changes the grant constant. OpenAI or the Neon gateway would need their own funded keys.
- **Differentiator reach:** Rondo is Owner-only and not yet qualified, so it does not reach Managers or Leads, who do most day-to-day scheduling.

### Gaps
- No production or hosted AI usage, cost or quality data exists.
- How `dailyLimit` is counted (per Owner or per company) was not traced beyond `service.server.ts:168`.

## 8. Process and governance overhead versus product code; implications for speed to market

### Takeaway
By volume the repository is mostly process:
- 78% of tracked files and 94% of bytes sit in `docs/`, mostly evidence screenshots, logs and JSON receipts;
- 165k lines of markdown, 638 handoff docs and 15 executive/governance skills;
- 82 Vitest configs and a 1:1 ratio of test lines to product lines.

The model requires frozen SHAs, independent QA/UI oversight, Jose's explicit authorization for every activation, spend or deploy, and "NO-GO"/"GO WITH CONDITIONS" verdicts at each step. Release 1 passed its local gate on Nov 4, yet no production promotion is recorded two weeks later. The Phase 5 publication went through at least five failed candidates (R3–R7) on browser and accessibility gate flakes. A two-person founding team (Jose plus one office backup) and AI agents carry this.

### Cited Findings (measured on this checkout for this note unless a doc is cited)
- **Tracked files:** 19,235 total; `docs/` 15,055 (78%); `src/` 3,223; `scripts/` 258; `native/` 216; `db/` 87; `services/` 82.
- **Bytes:** whole repo ~1,057 MB; `docs/` ~994.5 MB (~94%). Paths containing "evidence": 10,104 files, ~646 MB.
- **docs/ file types:** 7,001 PNG, 2,943 JSON, 1,702 Markdown, 1,527 .log, 569 .gz, 435 HTML, 313 TXT, 196 JPG.
- **docs/ subfolders:** `execution` 6,416 files (e.g. `employee-mobile-passkeys` 2,171; `employee-mobile-device-alerts` 1,860); `product` 3,835 (`specs` 2,440); `handoffs` 3,063; `native` 1,341.
- **Prose:** 165,783 lines of Markdown in `docs/`; 638 handoff Markdown files; ~2.26M lines across docs' md/json/txt/log/csv/jsonl.
- **Product code:**
  - 1,585 non-test TS/TSX files in `src` (149,399 lines);
  - 46,586 lines of CSS;
  - services non-test 4,129 lines;
  - db 7,712 lines (79 migrations);
  - native Kotlin/Swift/TS/Python/Gradle ~6,914 lines.
- **Test and QA code:**
  - 1,368 test/integration/fixture TS files in `src` (150,541 lines);
  - services tests 2,583 lines;
  - 258 scripts (22,922 lines, mostly QA/evidence runners);
  - 82 root `vitest.*.config.mts` files.

  Unit suite: 14,846 pass / 944 skipped — [docs/handoffs/2026-11-17-claude-ui-delivery/README.md](docs/handoffs/2026-11-17-claude-ui-delivery/README.md)
- **CI:** 5 workflows, ~28 jobs, 1,301 YAML lines — [.github/workflows/](.github/workflows/)
- **Governance artefacts:**
  - 15 `.codex/skills` (executive operating model, Deputy COO, CPO, CTO, CISO, program delivery, technical assurance, product-experience strategy, governance & risk, policy controls, risk exceptions, release governance audit, independent QA oversight, independent UI oversight, plus a UI skill), 1,113 lines — [.codex/skills/](.codex/skills/)
  - 8 Claude product-team agents with three Jose checkpoints per cycle — [docs/product/README.md](docs/product/README.md)
  - DESIGN.MD at 2,152 lines plus .21st/DESIGN.md at 646.
  - AGENTS.md requires loading the executive routing skill and director skills before "material" work, and states that independent QA/UI report to Jose and "may not" be directed by operating executives — [AGENTS.md](AGENTS.md)
- Release rule: "a commit is not production-authorized until the frozen SHA has passed required CI, hosted verification, independent QA/UI review, and owner authorization" — [README.md "Branch workflow"](README.md). Only three branches are permitted (Oct 28 policy) — [AGENTS.md](AGENTS.md)
- Example of gate friction: Phase 5 candidates R3, R5 and R6 each failed one browser leaf (Attention WebKit runtime, a missing document title in an axe scan). Each needed a new amendment, 14-cell replay and republication; "Main/production, deployment and new spending remain unauthorized." — [docs/handoffs/2026-11-16-backend-phase5-development-publication.md:5-15](docs/handoffs/2026-11-16-backend-phase5-development-publication.md)
- Example of ceremony: a single fictional Rondo comparison was capped at $5 of a $200 promotional grant, with a 3-hour key, a Keychain reference and a ledger that "cannot be overwritten/restarted" — [docs/handoffs/2026-11-15-rondo-claude-credit-migration.md](docs/handoffs/2026-11-15-rondo-claude-credit-migration.md)
- Delivery cadence (shallow clone only): 79 commits on Nov 15 (15), Nov 16 (29), Nov 17 (35). 47 of 79 touch `src`/`services`/`db`/native code and 26 are docs-only. Many Nov 16 subjects are evidence custody ("docs(rondo): seal combined Development acceptance and source custody", "retain every declared qualification log in the sealed packet") — `git log` on this checkout.
- Dated milestones from docs:
  - Oct 3 workspace foundation;
  - Oct 4 auto-scheduler;
  - Oct 12 single-company handoff;
  - Oct 17 product-team cycle 1;
  - Oct 21 50-reviewer inspection;
  - Nov 4 Release 1 gate;
  - Nov 7–12 commerce, onboarding and hosted staging;
  - Nov 15–17 Rondo and UI phases.

  — [README.md](README.md); [docs/product/README.md](docs/product/README.md); [docs/handoffs/](docs/handoffs/)
- Jira is used for tracking (SCRUM-166 self-service still "In Progress"; SCRUM-190 release umbrella) — [docs/handoffs/self-service-onboarding-readiness.md](docs/handoffs/self-service-onboarding-readiness.md); [docs/handoffs/2026-11-12-hosted-onboarding-billing-operations.md](docs/handoffs/2026-11-12-hosted-onboarding-billing-operations.md)
- People: on-call is Jose plus one office backup — [docs/runbooks/renewal-and-on-call.md](docs/runbooks/renewal-and-on-call.md). Commits in the visible window: 77 by Jose's accounts and 2 by Claude (git log). Codex (backend) and Claude (UI) agents do the engineering per the handoffs.

### Inferences
- Engineering throughput is high: about 150k lines of product code and an equal volume of tests in roughly two months, by AI agents. The binding constraint on revenue is not code. It is authorization, evidence custody and hosted activation, all of which route through one person.
- Every commercial capability (billing, signup, payroll statements, push, punch, AI) needs a hosted activation window, an evidence packet and Jose's sign-off, and many have only had a single fictional staging window. Time-to-market is therefore set by approval bandwidth.
- Storing ~650 MB of evidence screenshots and logs in git makes clones heavy (≈1 GB) and slows CI and onboarding. Evidence could live in artifact storage.
- The overhead suits payroll-grade trust, but at the current scale (one live customer) it delays learning from paying customers.

### Gaps
- Calendar time from first commit to today, and the share of agent time spent on process versus product, cannot be measured from the shallow clone.
- No document estimates the remaining time to public launch.

## 9. Security, privacy and compliance posture for selling to businesses

### Takeaway
- **Strong:** server-side authorization and in-transaction rechecks, parameterized SQL, rate-limited sign-in, append-only audit histories for time and payroll, least-privilege database roles in isolated mode, strict CSP on sensitive routes, published Privacy and Terms (effective Oct 20, 2026) with a concrete retention schedule, and an in-app deletion request.
- **Thin for B2B selling:**
  - no MFA requirement or TOTP (passkeys optional and flag-gated) and no SSO;
  - account deletion and data export are manual or partial;
  - no DPA, sub-processor list matching actual vendors, SOC 2, penetration test or security page;
  - no error tracking and an untested incident drill.
- **Unrecorded fixes:** Oct 21 found high-severity auth and recovery issues; later reviews exist, but resolution of every item was not traced.

### Cited Findings
- Authentication:
  - Employee ID + password (scrypt), opaque 32-byte sessions with no workspace on the session in single-company mode — [docs/product/saas-tenant-diagnosis-2026-10-20.md §1](docs/product/saas-tenant-diagnosis-2026-10-20.md)
  - Per-address and per-ID rate limits — [docs/handoffs/2026-11-02-sign-in-limits-and-spanish-emails.md](docs/handoffs/2026-11-02-sign-in-limits-and-spanish-emails.md)
  - Operator-set Owner passwords must be replaced at first login — [docs/handoffs/2026-11-15-authentication-review.md](docs/handoffs/2026-11-15-authentication-review.md); [db/migrations/0063_initial_password_replacement.sql](db/migrations/0063_initial_password_replacement.sql)
- Passkeys are optional and need `NEXT_PUBLIC_NEVORA_PASSKEYS=on` — [src/lib/passkeys/client.ts:17-18](src/lib/passkeys/client.ts). No TOTP or SSO code was found. The Oct 20 review: "Owner and Manager accounts that see pay have no second factor" (P1) — [docs/product/reviews/gap-analysis-2026-10-20/business-analyst.md row 18](docs/product/reviews/gap-analysis-2026-10-20/business-analyst.md)
- Oct 21 high findings:
  - no login throttle and timing disclosure of IDs (throttling later added);
  - "Assisted recovery lets any company-scope Manager take over any non-Owner account";
  - anonymous exhaustion of recovery budgets;
  - privacy payloads exposing coworker phone, email and IDs.

  — [docs/product/code-inspection-2026-10-21.md P1, "Privacy payloads"](docs/product/code-inspection-2026-10-21.md). The Nov 9 contract still says "Managers can assist Employee/Lead accounts through current permission checks; Owners can assist additional roles" — [docs/handoffs/2026-11-09-claude-website-backend-contract.md §2](docs/handoffs/2026-11-09-claude-website-backend-contract.md)
- Headers: `no-store`, `X-Frame-Options: DENY`, `frame-ancestors 'none'` and CSP on Clocker, recovery, activation, billing pages and native user agents — [next.config.ts](next.config.ts)
- Isolation: separate database per company. In isolated mode the runtime principals "cannot own relations … inherit roles, or have elevated PostgreSQL flags" — [docs/architecture/self-service-onboarding.md](docs/architecture/self-service-onboarding.md). No RLS ([docs/product/saas-tenant-diagnosis-2026-10-20.md §2](docs/product/saas-tenant-diagnosis-2026-10-20.md)). Staging hazard: "VELANI Preview still shares Production database configuration; do not mutate it as if isolated." — [docs/compliance/account-deletion-runbook.md](docs/compliance/account-deletion-runbook.md); [docs/handoffs/](docs/handoffs/) (Nov backend handoffs)
- Legal pages:
  - Privacy and Terms `effective: true` (EFFECTIVE_DATE Oct 20, 2026; POLICY_VERSION 2026-11-10); Support and Account-deletion pages `effective: false` — [src/lib/legal/policies.ts:9,16,40,81,98,113](src/lib/legal/policies.ts)
  - Policies are hidden in production while any fact is null — [docs/compliance/README.md](docs/compliance/README.md)
- Retention schedule:
  - attendance, timecards, payroll and statements: 3 years;
  - employment-tax records: at least 4 years after the tax is due or paid, whichever is later;
  - security/access logs: 90 days;
  - privacy-request records: 24 months;
  - deletion completion target: 30 days;
  - backup: 7-day restore-history window.

  — [src/lib/legal/policies.ts:17-21](src/lib/legal/policies.ts)
- Roles: VELANI LLC acts as processor "on your employer's documented instructions" — [src/lib/legal/policies.ts:24](src/lib/legal/policies.ts). The Oct 20 review called for a customer DPA (row 5); none was found. The processor list omits Stripe, Render and AI providers — [src/lib/legal/policies.ts:21](src/lib/legal/policies.ts)
- Compliance frameworks: the only "SOC 2" mention is a QA note that Rondo "did not invent integrations, SOC 2 or legal certification" — [docs/qa/2026-11-09-rondo-live-replay.md:22](docs/qa/2026-11-09-rondo-live-replay.md). No SOC 2, ISO 27001, penetration test, DPA or security whitepaper exists in `docs/` (grep).
- Audit trails: append-only histories for punches, corrections, timecard revisions (approver ≠ employee), payroll receipts, invitations and company-access operations, plus an activity history panel — [docs/product/reviews/gap-analysis-2026-10-20/business-analyst.md row 14](docs/product/reviews/gap-analysis-2026-10-20/business-analyst.md); [src/lib/activity/project.ts](src/lib/activity/project.ts). The Oct 20 review found time-off decisions lacked an event history and that there was no Owner-exportable activity export (row 14). Not re-verified.
- Repository controls: dependency audits at 0 findings (Nov 8) — [docs/handoffs/self-service-onboarding-readiness.md "Dependency review"](docs/handoffs/self-service-onboarding-readiness.md); [docs/security/repository-controls](docs/security/repository-controls)
- Payroll trust: the native tax maths had "no accountant or CPA validation" (Oct 20, P0). The Nov 15 policy switches new work to externally calculated amounts — [docs/product/reviews/gap-analysis-2026-10-20/business-analyst.md row 2](docs/product/reviews/gap-analysis-2026-10-20/business-analyst.md); [README.md](README.md). The native ruleset hard-stopped at the first 2027 payday (Oct 21 finding) — [docs/product/code-inspection-2026-10-21.md P4](docs/product/code-inspection-2026-10-21.md); [docs/operations/payroll-2027-input-readiness.md](docs/operations/payroll-2027-input-readiness.md)
- Incident readiness: no alert drill; "Actual mailbox/responder access and an alert-response rehearsal remain unverified." — [docs/runbooks/renewal-and-on-call.md](docs/runbooks/renewal-and-on-call.md)

### Inferences
- Mid-size buyers' security questionnaires will ask for SSO, MFA enforcement, SOC 2 or a pen test, a DPA and sub-processor list, uptime/SLA, a backup/restore test and an incident process. NEVORA can currently answer only with policies and code-level controls.
- The privacy policy's processor list will become inaccurate the moment billing (Stripe), the Render worker or Rondo (AI provider) is activated.
- Two potential inconsistencies:
  - Employee ID + password as the only credential, combined with Manager-assisted resets, is a weak point for payroll-bearing accounts.
  - Storing a 7-day restore window in policy while staging companies used Neon Free's 6-hour history.

### Gaps
- Whether the Oct 21 P1 auth findings (assisted recovery scope, dummy hash, recovery budget) were all fixed was not verified line by line.
- Hosted TLS, WAF and rate limiting at ingress are unverified. The commerce README notes "choose an ingress strategy before public-scale signup".
