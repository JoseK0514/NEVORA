# Hosted onboarding, billing and operations checkpoint — November 12, 2026

Codex owns backend and operations; Claude owns UI. Native is excluded. This is
an isolated staging checkpoint, **not public signup or production acceptance**.
Application baseline: `f39c1e23badb3ddc056dece2eeca60c8ad69d500`.
Cancellation fix: `c1cc366a741a7b870b6d67137f981ece377390fe`.

## Source change

The managed process primitive now explicitly reports whether a worker started.
When cancellation wins before spawn, the cycle can drain and release its host
lease without demanding an impossible child receipt. Started or uncertain work
still retains custody unless its source/company/command-bound receipt confirms
cleanup. Real-process regressions prove both cases. No automatic stale-lock
deletion, job reset, start-command change or security-gate weakening was added.

The hosted restart failure motivated this regression; the exact hosted trigger
has not been proven. A corrected-source hosted restart drill remains required.

## Actual staging evidence

- Six native Neon onboarding/commerce roles were rebuilt and ZIP-verified from
  clean baseline source, then deployed to `damp-haze-17022523` /
  `br-hidden-mud-bbnc2fxk`. Correct staging account/origins/profile and existing
  Small/Team Portal configuration IDs were installed. Health/readiness passed;
  unsigned webhooks, forged schedules and unauthorized authority calls rejected.
- Existing canonical control migrations `0006_workforce_monitor.sql` and
  `0007_worker_enrollments.sql` were applied after a staging snapshot. Two
  per-company readers and a separate monitor role passed real logins and nine
  base-table access denials. Original A/B credential fingerprints were unchanged.
- Native issuance completed one bounded enrollment for each original fictional
  company. The host received only company-specific enrollment material, never
  shared onboarding/commerce roots. Payroll alone was configured and tested.
- The approved separate Render workforce service and 1 GB disk were created at
  the reviewed $7.25/month baseline, within the $10/month incremental ceiling.
  Git auto-deploy is off. Actual A/B payroll receipts confirmed cleanup;
  authenticated host health and the independent native monitor reported healthy.
- A restart retained the prior host marker. Recovery checked the old PID absent,
  source/marker/owner/mode, both clean receipts, and empty queued/leased jobs
  before reversibly renaming only that exact marker and syncing the directory.
  This was a manual staging recovery, not automatic lease expiration.
- Exactly one approved outage alert and one recovery alert were provider
  delivered to `support@thevelani.com`. Jose confirmed outage inbox receipt.
  Backup-responder routing and continuous 24/7 coverage remain untested.
- Two protected baseline-source Vercel Previews were built. Only the existing
  fictional A/B company aliases moved to the bounded acceptance Preview; the
  original Claude Preview remains available. Normal fictional Owner recovery
  reached success and its email was provider delivered. No Owner session was
  inserted or bypassed.
- The existing Stripe sandbox worker key was audited. Its existing Invoices
  group includes InvoicePayments reads; Customer Portal write on the separate
  API key includes configuration reads. Jose approved adding only Charges and
  Refunds **Read** to the existing worker key; saved readback confirms it.
  No key was copied or rotated, no refund write permission was granted, and the
  API key was left unchanged. The existing receiver's risk-event subscriptions
  were updated while its endpoint stayed disabled.

Private local evidence: `/Users/josek0514/.codex/nevora-hosted-closeout-20261112/`.
Do not copy its `private/` contents into source, tickets or browser output.
Jira release umbrella: [SCRUM-190](https://thevelani-team.atlassian.net/browse/SCRUM-190).

## Closed after the finite test

The approved company test window ended at `2026-11-12T12:45:44.935Z`.
Original Neon active-time caps were restored before it ended (A 7,200 seconds;
B 3,600 seconds), with both companies on Free. The Render workforce service is
suspended and its stored processing flag was verified false. Monitor host/mail
and trigger are disabled; provisioner/enrollment gates and commerce schedules
are closed. Stripe's sandbox endpoint remains disabled. Public signup remains
disabled, production and native unchanged. The two-alert allowance is consumed.

Enrollment runtime expires at `2026-11-12T14:12:35.039Z`; subsequent execution
must use valid enrollment, not extend or bypass an expired token.

## Remaining acceptance and next gate

1. Finish clean-source local qualification, source-bound guide regeneration,
   fresh whole-change review, candidate Actions and protected development
   publication. Record exact source and run receipts separately from hosting.
2. Prepare corrected-source host/monitor artifacts. A new explicitly bounded
   original-company test window is needed before resuming hosted company work.
   Verify real cancellation/redeploy and durable lease release without manual
   recovery. Environment updates themselves deploy on Render even when Git
   auto-deploy is off; never queue a redundant explicit deploy afterward.
3. Complete the normal Owner setup/invitation journey with a human-owned
   credential step and Claude's UI. Existing billing API/handoff contracts are in
   `2026-11-11-codex-to-claude-payments-billing.md`; `/app/billing` remains UI work.
4. Complete genuine Stripe-signed delivery, durable queue/reconciliation,
   duplicate/reordered events and same-operation recovery; then hosted initial
   subscription, payment-success upgrade, renewal downgrade and failure/reauth
   acceptance against fictional bindings. Local Stripe fixtures do not satisfy
   these hosted gates. Leave live payments and Tax collection off.
5. Joint UI/backend acceptance precedes public signup/website trial-button
   activation. Main, production, live billing, tax registration policy and
   continuous incident coverage require their own evidence and authorization.

Director positions: Engineering accepts the narrow cancellation fix subject to
qualification; Security preserves separate secret custody and existing fail-closed
locks; Program Delivery keeps source delivery, hosted acceptance and public
release separate; Governance retains the finite budget and release gates. No
material policy exception or production authorization is inferred.
