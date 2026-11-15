# Resumed inspection backend — validation and integration gate

Independent backend qualification is in progress. Combined integration is held by Jose's explicit Nov 15 instruction until Claude supplies the exact reviewed and pushed collaboration SHA. `ce4de4bc` is only the baseline and excludes uncommitted Round 1 / Phase 1 / Phase 2 changes. No development, main or production push/deployment is part of this checkpoint.

Scope and reconciled decisions: [backend contract](2026-11-15-inspection-backend-remaining.md). Authentication integration findings: [auth review](2026-11-15-authentication-review.md). Original batch-review findings and author dispositions: [review record](reviews/2026-11-15-backend-remaining-review.md).

## Pending exact-source results

The final check results, exact source hashes and external receipt locations will be recorded here after qualification. Raw logs are retained under `.superpowers/sdd/2026-11-15-external-payroll-statements/`. Owned fixtures use fictional local data, loopback PostgreSQL and captured mail/Stripe responses; they do not establish hosted delivery, real Stripe traversal or production behavior.

## Combined-source next gate — Claude retains UI ownership

1. Receive Claude's exact reviewed and pushed collaboration SHA; fetch and verify its ancestry and reviewed diff. Reconcile the changed source inventory before assembly. Do not consume the dirty checkout or infer review from a branch head.
2. Integrate in an isolated detached checkout of freshly fetched development. Preserve both backend and Claude UI, including the password replacement transfer alongside kept-ID handling, canonical-origin return validation, all four schedule-settings role redirects and billing pending-state refresh after a durable refusal. Keep existing authorization and unknown-outcome billing recovery.
3. Update guide labels and source-qualified PDFs against the combined source. Update the existing QA drivers to the reviewed Employee ID then PIN kiosk flow: `clocker-ipad-ui-qa.mjs`, `clocker-journal-mounted-browser.mjs`, `clocker-staging-acceptance.mjs`, `phase-c-*-ui-qa.mjs`, `phase-c-punch-http-qa.mjs`, `phase-d-browser-qa.mjs` (card order), `six-findings-ui-qa.mjs`, `payroll-workflow-ui-qa.mjs`; include kiosk steps in Step4 lifecycle/commerce browser suites. Do not change selectors for UI absent from this backend checkout.
4. Rerun affected real browser flows: Employee pay/Phase 1, delegated corrections, Owner inbox, central billing, commerce recovery/effects, generation cross-layer and kiosk. Include mobile, keyboard/focus, empty/loading/error/success states and approved references. Reuse owned runners and external evidence custody. No real recipients, charges or customer data.
5. Qualify the exact combined commit locally and on development, with required CI, deployment/source identity, flag matrix, log-digest correlation and retention, invitation transport and sandbox billing origin/CORS traversal. Prove each environment/database before tests. Local fixture success cannot substitute for hosted acceptance.
6. Main/production remain unchanged. Only Jose can authorize promoting the exact verified development release.
