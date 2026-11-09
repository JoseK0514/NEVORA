# NEVORA commerce backend verification

Completed locally on 2026-11-08, America/Puerto_Rico. This records implementation evidence, not production acceptance.

## Source and ownership

- Isolated managed worktree: `/Users/josek0514/.codex/worktrees/nevora-subscriptions-backend/NEVORA-UI-READINESS`.
- Development base: `e2872f30ea8548b1310ea4a9b25813352decf82a`, freshly fetched before this work. Detached HEAD preserves the repository's three-branch policy. No merge, push or deployment was performed.
- Codex implemented the backend, tests and operator/API documentation. No UI components or Shopify theme were changed. Other sessions' checkouts were preserved. Claude owns the UI.
- Start with [Claude's API handoff](2026-11-07-commerce-backend.md) and [the operator README](../../services/commerce/README.md). The spec and completed plan are in `docs/superpowers/`.

## Final checks

All checks below ran after the review fixes, with application/catalog credentials absent and fictional fixtures only. Source files were frozen during the final full-suite run.

| Command | Observed result | Saved evidence |
|---|---|---|
| `npm test -- --maxWorkers=4` | 728 files passed, 31 skipped; 10,999 tests passed, 831 skipped; exit 0 | [Unit suite](commerce-evidence-20261108/unit-green.txt) |
| `NEVORA_TEST_PG_BIN=/path/to/local/bin node scripts/commerce-postgres.mjs` | 7 files, 40 tests passed; exit 0 | [Owned commerce PostgreSQL](commerce-evidence-20261108/owned-postgres-green.txt) |
| `NEVORA_TEST_PG_BIN=/path/to/local/bin node scripts/payroll-postgres.mjs vitest.company-setup-integration.config.mts` | 3 existing company-setup integration tests passed; exit 0 | [Company setup](commerce-evidence-20261108/company-setup-green.txt) |
| `NEVORA_TEST_PG_BIN=/path/to/local/bin node scripts/commerce-postgres.mjs -t 'preserves the original trial deadline'` | The selected Stripe scenario passed independently; 39 unselected tests skipped | [Independent Stripe case](commerce-evidence-20261108/filtered-stripe-green.txt) |
| `npx vitest run src/app/api/commerce/routes.test.ts src/lib/commerce/access.test.ts services/commerce/config.test.ts` | 12 tests passed | [Bridge, gate and configuration](commerce-evidence-20261108/handoff-gate-green.txt) |
| `npm run lint` | Exit 0 | [Lint](commerce-evidence-20261108/lint-green.txt) |
| `npm run build` | Next.js production build completed; exit 0 | [Build](commerce-evidence-20261108/build-green.txt) |
| `npm run typecheck` after build | Exit 0 | [Type checking](commerce-evidence-20261108/typecheck-green.txt) |
| `git diff --check` | No whitespace errors | Rechecked before commit |

Owned SQL runners created, stopped and removed their own new loopback PostgreSQL clusters. Local PostgreSQL 17.10 binaries were obtained in a temporary directory; no application database was reused. Stripe integration uses the real SDK with a fictional transport, including signed events, simulated lost responses and provider idempotency checks. These tests do not establish behavior of an authenticated Stripe account, SMTP deliverability, hosted ingress or a deployed company.

The default suite intentionally skips the explicitly owned SQL scenarios without their runner. The separate commerce run exercises signup verification/setup, concurrent job claims, mail retries, isolated provisioning, readiness/trial timing, database safety, billing lifecycle and headcount eligibility. The company-setup rollback fault fixture now uses a test-only function in `pg_catalog` of its disposable database so that it reaches the intended migration fault without violating the new empty-application-schema guard. All original rollback and retry assertions remain.

## Independent review and fixes

The required whole-change review at `ed00a517d7a4d19d67f0eb6e630ee04ac21cc795` returned **BLOCK / REQUEST_CHANGES**. Its original findings are retained in [the review report](2026-11-07-commerce-code-review.md). The author then fixed the findings in one pass with regression evidence and the full checks above. There was no second independent review or hosted QA certification; the original review is not being represented as approval of the fixes.

| Finding | Final change and regression evidence |
|---|---|
| Critical cross-company Owner handoff and pre-ready admission | The bridge checks the real local Owner, installation ID, secret hash and business before and after the network call; catalog installation authentication admits only ready businesses. The actual earlier route failed the new cross-installation and staging regressions: [RED](commerce-evidence-20261108/handoff-red.txt), [GREEN](commerce-evidence-20261108/handoff-gate-green.txt). The owned provisioning test also exercises the binding against real SQL. |
| Driver URL target overrides | Shared URL validation rejects query overrides and duplicate connection parameters before `pg` receives them. Both catalog/slot selection and company setup use it. [RED](commerce-evidence-20261108/core-red.txt), final configuration/unit checks above. |
| Previously empty capacity occupied before install; unsafe catalog targets | The transactional mutation boundary repeats the all-user-schema guard and refuses maintenance databases. Private-schema fixture data remains unchanged on refusal. [RED](commerce-evidence-20261108/database-red.txt), final owned suite above. |
| Expired-account export method/prerequisite mismatch | The gate permits the actual timecards/profile/export recovery methods while keeping profile writes and payroll finalization gated. Original role/scope authorization remains. [RED](commerce-evidence-20261108/core-red.txt), [GREEN](commerce-evidence-20261108/handoff-gate-green.txt). Browser acceptance belongs to Claude. |
| Terminal subscriptions could not restart | A catalog-authorized successor can replace a canceled or incomplete-expired predecessor. Late terminal predecessor events cannot overwrite the successor; existing paid coverage survives. Cancellation/successor regression: [RED](commerce-evidence-20261108/billing-red.txt), final owned suite above. |
| Ambiguous Checkout creates reused a key with changed parameters | The encrypted intent commits stable parameters, return proof and a 45-minute expiration before the remote call. New operation IDs reuse the open intent, and reconciliation recovers a lost provider result. Lost-response regression: [RED](commerce-evidence-20261108/billing-red.txt), final owned suite above. |
| One failed business stopped reconciliation | Each business is attempted separately; failures are audited, the summary reports partial failure and the CLI exits 1 for monitoring. [RED](commerce-evidence-20261108/billing-red.txt), final owned suite above. |
| Smaller paid band allowed excessive active population indefinitely | Capacity remains at the previously paid band until the replacement price has paid coverage. Actual active headcount above the current band restricts operations while preserving billing/export recovery; no staff deletion or automatic charge. [RED](commerce-evidence-20261108/billing-red.txt), final owned suite above. |
| Order-dependent Stripe fixtures and production-only handoff destination | Every Stripe case now has a fresh database/provider fixture; the filtered case passes alone. Handoffs use the trusted UI origin for their environment. The early isolated grace test also needed its own explicitly expired trial precondition; its assertions were preserved. |

The Stripe orchestration was separated into checkout intent, installation facts/policy and ownership helpers while applying these fixes. No standalone cleanup expansion or frontend redesign was included.

## Scoped local security utilities

The engineering-toolkit README was read before running its local tools. No paid scans or external AI analysis were used.

- Semgrep starter configuration: 2 rules, 38 tracked targets, 0 findings; metrics and version checks off. This is a narrow eval/TLS check, not a complete security audit. [Scan summary](commerce-evidence-20261108/semgrep.txt).
- Gitleaks `dir services/commerce --redact`: exit 1 with 3 `generic-api-key` matches. All are deliberately fictional test passwords in `account.integration.test.ts` (lines 70 and 131) and `provision.integration.test.ts` (line 50). No real credentials were identified in those matches. No suppressions or allowlists were added; this was not a zero-finding scan. [Redacted scan summary](commerce-evidence-20261108/gitleaks.txt).

## Decisions retained and work before launch

- Approved empty installation inventory preserves the supported database-and-deployment-per-company model without creating metered cloud resources. No capacity means pending setup. Incorrect capacity planning would delay onboarding, so monitor the queue before inviting customers.
- Early subscribers use Checkout setup mode and then a subscription with the original trial deadline. This preserves the full trial, including its last 48 hours; retries never grant a second trial.
- Frontend and email presentation stay with Claude. Use the exact API states and fictional data in the handoff; do not invent a live commerce endpoint.
- Real Stripe prices/Portal/webhooks, approved SMTP and test inbox, worker/reconciliation scheduling, capacity slots, backups, ingress identity/rate limiting, hosted acceptance and production deployment are **not configured or verified by this implementation**. These external checks remain before launch; Claude can implement the UI now.
- Refund/dispute handling and long-term retention remain operator/product policies; the backend performs no automatic refunds or record deletion. Existing installations stay unenrolled by default.
- The reviewer did not establish a public-route Server Action bypass from the inspected manifest. This limited observation is not a general security certification.

No required code check remains failing. The next bounded task is Claude's UI implementation in unpublished previews, followed by authorized environment integration and end-to-end acceptance.
