# Resumed inspection backend — validation and integration gate

Independent backend implementation and local qualification are complete. Combined integration is held by Jose's explicit Nov 15 instruction until Claude supplies the exact reviewed and pushed collaboration SHA. `ce4de4bc` is only the baseline and excludes uncommitted Round 1 / Phase 1 / Phase 2 changes. No development, main or production push/deployment is part of this checkpoint.

Scope and reconciled decisions: [backend contract](2026-11-15-inspection-backend-remaining.md). Authentication integration findings: [auth review](2026-11-15-authentication-review.md). Original batch-review findings and author dispositions: [review record](reviews/2026-11-15-backend-remaining-review.md).

## Source identity and ownership

| Checkpoint | Identity |
| --- | --- |
| Previous foundation | `2d082042e` |
| Remaining implementation | `ac9972937`, `71a24d73d`, `7bfc4e7c3` |
| Whole-batch review | `2d082042e..7bfc4e7c3`; changes required, no independent release certification |
| Review corrections | `5cbf97b145ff0bf628055d55826b9c91f40852c7` |
| Final application/QA source | `062d0b65b50581098eb1144d551a764f93d7ab53`, tree `ece9beafb7c8af014d46f0230136f2a98d9f2a41` |
| Manual publication | `978dda669`, six PDFs and manifest bound to `062d0b65b50581098eb1144d551a764f93d7ab53` |
| Development after final fetch | `18c75692b841c20cc34590e233abdfdbe2b757ea` |
| Collaboration after final fetch | `ce4de4bc492f1e8a1635bc55a7a335bd82f067fe` |
| Main after final fetch | `46d6dc76922bb273379baccd329e0af636d1dcb6` |

This is a detached backend checkout under Jose's existing branch policy. No new branch or remote ref was created. Claude's checkout and uncommitted UI were preserved. The final application/QA checkpoint changes only the configuration coverage inspector and a route unit fixture relative to the real browser checkpoint; password, authorization and runtime source are identical between those two checkpoints. Later publication/evidence commits are documentation only.

`npm run check:development-sources` after fetching still reports `Branch advanced: claude-codex-collab-nevora`. The historical assembly inventory was not rewritten to conceal drift. Reconciliation remains a mandatory combined-assembly gate.

## Checks actually run

Raw logs are retained under `.superpowers/sdd/2026-11-15-external-payroll-statements/`. They are also preserved with a SHA-256 inventory in `/Users/josek0514/Documents/NEVORA-Evidence/2026-11-15-inspection-backend-resumed-062d0b65b`. Owned fixtures use fictional local data, owned loopback PostgreSQL and captured mail/Stripe responses. No customer data, production credential, real mail/SMS, hosted mutation or live payment was used. Each owned database runner stopped and removed its own cluster.

| Verification | Observed result | Log/receipt |
| --- | --- | --- |
| Whole default unit project after manual publication | **13,023 passed, 944 skipped, 0 failed**; 882 passed/35 skipped files, 917 total; 126.48 seconds | `unit-final2.log` |
| Recovery SQL, including initial proof, EMAIL/ASSISTED reuse and flag-only race | **18 passed** | `review-auth-green.log` |
| Signed WebAuthn and passkey HTTP/JSON boundaries | **38 passed** | `passkeys-sql2.log` |
| Native/external policy, actual Manager import/approval/PDF, scope revocation, overlap/replacement | **64 passed**, 3 files | `review-manager-green2.log` |
| External import/approval/publication/employee download, 2027 payday, exact correction parent beyond 300 rows | **41 passed** | `review-parent-green.log` |
| Onboarding commerce, real enrollment and APP principals, activation-to-ready mail, post-queue readiness refusal and replay | **20 passed** | `review-commerce-ready-final.log` |
| Commerce, explicit installer password origins and durable first/refused billing replay | **247 passed**, 19 files | `review-refusal-green.log` |
| Company Access final rerun | **521 passed**, 32 files; owned cluster stopped | `company-access-final.log` |
| Today and setup scoped SQL | **65 passed**, 6 files | `today-sql.log` |
| Roster preview/capacity and atomic people flow | **18 passed** | `onboarding-people2.log` |
| Scoped Manager invitation HTTP/read admission | **30 passed** | `manager-http-green.log` |
| Final exact-source real Next operator login/reset browser | **1 passed**, no page errors, at `5cbf97b145ff0bf628055d55826b9c91f40852c7` | `password-browser-final.log`; external `operator-password/operator-password-result.json` |
| Required release-engineering checks | **363 passed** | `release-engineering-final2.log` |
| Named configuration inventory/orphan regression | **80 registered**, no orphan; regression **1 passed** | `npm run check:test-projects`, `npm run test:test-projects` |
| Employee effective execution-contract inventory | **36 files/36 contracts**, 13 configurations, no missing contract | external `employee-coverage.json`; root name checked explicitly while preserving all execution checks |
| Canonical bootstrap/migration manifest | Matches `4a9db3b1d7d988e18404b09fd4eee4849ac45a1d83bb0ace038979d713f79bd4` | `npm run check:onboarding-manifest` |
| Whole TypeScript | Passed | `typecheck-final.log` |
| Whole ESLint | 0 errors; 1 existing warning at `services/hosted/neon/workforcemonitor.entry.ts:17` | `lint-final.log` |
| Exact-source production build | Passed; source clean and unchanged; **4,899 hashed files** | `build-062d0b65b.log`; external `build-source.json` |
| Actual production-marker scan and build restoration | Passed; development markers absent in **4,899 artifacts**; all **4,899 original hashes** match afterward, no extra/missing file | `marker-final.log`; external `build-restoration.json` |
| Six source-qualified guides/PDFs | Build and verification passed; application hash `f7883d1ddc3af03b2334461f78745f1af61620fe8026f93a366cd1203d16f024` | `manuals-final.log`; checked-in publication manifest |

Reproduction uses the existing runners. `NEVORA_TEST_PG_BIN` points at the installed local PostgreSQL bin; never supply an existing application `DATABASE_URL`. Recovery/native/configurable/Company Access/passkey suites use `node scripts/payroll-postgres.mjs <existing-config>`. Commerce uses `node scripts/commerce-postgres.mjs`; onboarding uses `node scripts/onboarding-owned.mjs --suite <existing-suite>`. Build custody requires the full `PHASE_E_EXPECTED_SHA` and explicit external `NEVORA_BUILD_RECEIPT`; `scripts/release-build.mjs` scrubs runtime environment values. Browser fixtures also require explicit external evidence and the matching pinned Playwright runtime.

The first broad run exposed the stale publication, a route fixture missing the new readiness boolean and a coverage inspector rejecting project-name metadata. The first release-engineering run also rejected the newly tracked mail module without an entrypoint disposition. Those failures were retained; the explicit fixture/metadata identity and boundary-inventory corrections passed focused regressions before the final green runs. No assertion, unknown-boundary refusal, test admission guard or source-binding check was removed. Registration of 80 projects is not a claim that CI executes all 80 on every event. Performance is an observed local duration, not a hosted CI guarantee.

Five previously untracked fictional output files were moved intact to `/private/tmp/nevora-inspection-20261115-retained-outputs`; every SHA-256 was compared before/after the move. The archive includes their hash manifest. They were preserved outside exact source custody, not deleted.

## Author rulings and limits

- Retain the restricted F1 canonical adapter; correction requested/recorded times are only in the authorized action DTO. Cost if wrong: an unrelated canonical consumer does not receive these fields; its privacy contract remains bounded.
- Load only the selected named test project. Cost: registration proves reachability, not per-event execution of every owned suite. Loading all projects would violate their mandatory admission guards.
- Demonstrate a 2027 payday using an approved closed period. Cost: this does not test future-period finalization; the existing refusal remains enforced.
- Explicitly mark established-account test fixtures as not requiring replacement. Cost: those fixtures model returning accounts, while separate true-flag SQL, browser and signed-passkey regressions carry initial-password enforcement.
- Restore genuine Company Access and native-mode admission in previously unselected overlap/replacement tests. The PARTIAL case omits required Oct 4, retaining BLOCKED/null assertions. Cost: this is deterministic fictional calendar evidence, not every customer schedule.
- Reviewer did not certify hosted SMTP, hosted log custody, production, final legal copy or Claude's mutable UI. Those remain gated and are not self-closed by local engineering success.

Product position is externally calculated statements with historical bytes preserved. Engineering position is additive read contracts, transactional receipts, source fences and explicit calculation policy. Security position is no operational session before required replacement and current scoped authority for private facts/documents. Program/Governance position is **hold combined development acceptance** pending the exact reviewed UI checkpoint and required hosted evidence; no policy exception or production approval is inferred. Codex owns this backend evidence; Claude owns UI. No new Jose product decision is required for the approved independent work.

## Combined-source next gate — Claude retains UI ownership

1. Receive Claude's exact reviewed and pushed collaboration SHA; fetch and verify its ancestry and reviewed diff. Reconcile the changed source inventory before assembly. Do not consume the dirty checkout or infer review from a branch head.
2. Integrate in an isolated detached checkout of freshly fetched development. Preserve both backend and Claude UI, including the password replacement transfer alongside kept-ID handling, canonical-origin return validation, all four schedule-settings role redirects and billing pending-state refresh after a durable refusal. Keep existing authorization and unknown-outcome billing recovery.
3. Update guide labels and source-qualified PDFs against the combined source. Update the existing QA drivers to the reviewed Employee ID then PIN kiosk flow: `clocker-ipad-ui-qa.mjs`, `clocker-journal-mounted-browser.mjs`, `clocker-staging-acceptance.mjs`, `phase-c-*-ui-qa.mjs`, `phase-c-punch-http-qa.mjs`, `phase-d-browser-qa.mjs` (card order), `six-findings-ui-qa.mjs`, `payroll-workflow-ui-qa.mjs`; include kiosk steps in Step4 lifecycle/commerce browser suites. Do not change selectors for UI absent from this backend checkout.
4. Rerun affected real browser flows: Employee pay/Phase 1, delegated corrections, Owner inbox, central billing, commerce recovery/effects, generation cross-layer and kiosk. Include mobile, keyboard/focus, empty/loading/error/success states and approved references. Reuse owned runners and external evidence custody. No real recipients, charges or customer data.
5. Qualify the exact combined commit locally and on development, with required CI, deployment/source identity, flag matrix, log-digest correlation and retention, invitation transport and sandbox billing origin/CORS traversal. Prove each environment/database before tests. Local fixture success cannot substitute for hosted acceptance.
6. Main/production remain unchanged. Only Jose can authorize promoting the exact verified development release.
