# Owner AI: coverage proposals and period exception review

Both remaining approved increments are implemented and locally verified before full review/integration. This supersedes the remaining-increment status in the earlier briefing handoff; it does not establish hosted or production readiness. Implementation and evidence owner: Codex. Branch: `codex/owner-prioritized-briefing-20261023`. Tested application checkpoint: `2ea94227e8f7344d3ab72cdd7614d0c2b8f0be81`. Documentation added afterward does not change the executed application.

## Delivered behavior

Coverage preparation returns at most three exact, eligible alternatives with person, location, date, interval, position, lead requirement, scheduled/target hours and draft/published effect. It uses the existing canonical scheduling ledger, including draft commitments. Missing setup and capped/unknown evidence are marked incomplete. The Owner opens a source-bound replacement review in Scheduling, where current authority, source version, gap and eligibility are checked again. Preparing a proposal saves nothing. Confirming a draft adds one shift without publishing or queuing notifications. Confirming a published change additionally requires a separate, initially unchecked publication/notification consent, enforced inside the canonical transaction. The saved shift ID and publication revision, where applicable, provide the canonical receipt. Queuing is not a delivery guarantee. Duplicate/concurrent confirmation applies once; stale or revoked previews cannot assign anyone. Existing assignments stay in place, and remaining requirements stay open. Correction uses the existing scheduling workflow; universal undo is not promised.

Attendance/payroll review accepts an explicit period of 1–31 days and English or Spanish. Canonical timecards supply recorded exceptions, employee/location context, review state and revision. Missing records do not establish absence; no punch or compensated time is invented. Finalized cards are explicitly historical snapshots. Payroll supplies only current recorded run revisions, overlapping periods, stored statuses, safe exception categories, recorded rule revision, superseding correction and coverage completeness. Monetary amounts, bank/tax details, documents, private correction notes and reasons are excluded. Unknown exception text becomes a generic review category. Missing/disabled/unavailable data stays visible.

Financial readiness always remains **unverified** in this lightweight reader. An approved stored run, empty exception list or recorded rule revision is not proof that current financial rules/inputs are verified. The Owner is directed to canonical Payroll for that decision. This increment does not calculate pay, approve payroll, change timecards or move money.

Both explicit forms work without model inference. Conversational investigations can call the same two read tools; server-generated evidence supplies the structured cards and action hints. Review hints are excluded from provider input. The original Owner/Company Access checks, same-origin/no-store transport, authority refresh, display lease and lifecycle retirement remain active. No new schema migration, background task, provider budget or model write tool was added.

## Verification at the tested checkpoint

Raw execution evidence: `/Users/josek0514/.codex/owner-reviewed-workflows-evidence-20261023/execution-ledger/`.

| Check | Actual result |
| --- | --- |
| Final full default suite, executed by `task-done … -- npm test` | 9,467 passed; 801 existing skips; exit 0 |
| `node scripts/payroll-postgres.mjs vitest.owner-advisor-integration.config.mts` | 38 passed, owned cluster stopped; `green-review-postgres.log` |
| Canonical coverage PostgreSQL stress suite | 39 passed, real lock waits/expiry/logout, zero-delta checks; `coverage-postgres-current-barriers.log` |
| `npm run typecheck`, `npm run lint`, `npm run build` | Each exit 0; `*-final.log` |
| `npm run test:release-engineering` | 110 passed; `engineering-pre-review.log` |
| Actual owned Next/PostgreSQL browser run | Exit 0, 28 scenario groups in Chromium/WebKit; `browser-final.log` |

Browser artifacts: `/Users/josek0514/.codex/owner-reviewed-workflows-evidence-20261023/browser-final/report.json`, screenshots and six actor/browser traces. The source manifest matches the clean tested checkpoint. Checks include real proposal preparation, canonical draft save, no draft notifications, unchecked published consent, invalid submission, keyboard consent and canonical publication receipt; Spanish period review; 320/390/1440px layout; private-view retirement; revision conflicts; and Manager/Employee page/API denial. Report records `complete: true`, no external requests and no runtime errors. Answer/error/cancel UI scenarios are explicitly intercepted fixtures; business workflows, priorities and access use the owned database. No provider is configured. A 320px result screenshot was visually inspected.

Reproduce PostgreSQL with `NEVORA_TEST_PG_BIN` pointing to the existing runtime recorded in the execution ledger. Keep `DATABASE_URL` unset. The coverage suite uses the retained `generation-prefix.mjs` adapter with `NODE_OPTIONS='--import <absolute adapter path>'` so the existing owned runner chooses a valid generation-prefixed disposable name; all ownership checks remain intact. The browser command additionally uses `NEVORA_OWNER_ADVISOR_BROWSER_EVIDENCE=<new external directory>` and `vitest.owner-advisor-browser.config.mts`. Commit application/test sources and keep them unchanged for the entire browser run, including teardown.

The older coverage harness was updated to create a fresh owned database per scenario instead of truncating immutable ledgers, adopt current Company Access fixtures, and inject races at the actual write transaction after preliminary authority reads. Exact current authorization errors, real database wait barriers and zero-business-delta assertions remain enforced. Earlier wrong-prefix, stale fixture and source-change runner failures are retained in the ledger; they are not counted as passes.

## Engineering review and fixes

The one fresh-context whole-branch review covered `055a383d..e1fcb989` and returned BLOCK/REQUEST_CHANGES. Its raw report is preserved unchanged in [the review record](../reviews/2026-10-23-owner-reviewed-workflows.md). It identified invalid published-consent HTML/unstable accessible naming and missing coverage setup omitted from partial evidence. Both were reproduced RED and corrected GREEN in the single author fix pass at `2ea94227`. The final real browser interaction passes with the same exact accessible-name assertion. The no-window/zero-block service regression passes. The full suite passes after both fixes. No second reviewer approval, independent QA/UI certification or suppression of the historical report is claimed.

## Remaining release gates and limits

The enhancement branch remains local and unpushed. It has not been integrated into development, submitted for full review, deployed or hosted-tested. Existing advisor dependency is draft PR25, https://github.com/JoseK0514/NEVORA/pull/25; that PR does not contain this local enhancement branch yet. Local assembly base is `055a383d`, combining the previously tested advisor candidate with fetched development input `739165b2`. Main/production are unchanged.

The source inventory gate still blocks another assembly. The last fetched check reported an advanced development-CI consolidation branch, an unclassified CI spend-controls branch, and 56 remote branches against ceiling 5. Reconcile those sources and ownership before assembling; no gate was weakened and no unrelated branch was deleted here. Then select the combined candidate for full review and hosted acceptance. Production still requires Jose's explicit authorization.

No additional live inference ran. The earlier narrow fictional-data model pilot exhausted its separate allowance; broad live-model semantic/adversarial evaluation remains unverified and requires a new explicit budget. Engineering results above prove deterministic workflow behavior and transport boundaries, not general model reasoning quality.

Deferred existing minors: canonical scheduling extraction reads historical source before its post-read cap; expired deferrals retain the past timestamp rather than a dedicated expired label. These remain documented performance/wording limits. Stored payroll status is deliberately not current financial readiness.

Product position: both approved recurring workflows are ready for full review as scoped. Engineering position: canonical eligibility, authorization and mutation services remain authoritative. Security position: server-owned proposals, minimal read-only payroll projection and original authority rechecks. Governance position: local evidence complete, integration inventory/hosted acceptance and production authorization remain separate gates. No user action is needed to finish this local implementation; the next program step is source reconciliation and full review of the selected combined candidate.
