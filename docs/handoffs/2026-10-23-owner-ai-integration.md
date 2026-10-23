# Owner AI combined candidate: independent review and integration handoff

Status: LOCAL REVIEW COMPLETE WITH CONDITIONS; PUBLICATION/DEVELOPMENT/HOSTED GATES OPEN.

Jose authorized full review and development integration of the Owner advisor, prioritized briefing and reviewed workflows. Production remains a separate decision. This handoff records actual executions and distinguishes the local application candidate from the still-unmodified remote PR.

## Source and scope

- Worktree: `/Users/josek0514/.codex/worktrees/owner-ai-integration-20261023/Fuel Scheduler`.
- Local branch: `codex/owner-ai-integration-20261023`.
- Fresh development base: `40282f12c9f42ba00ed0f116c1dc6e42775efe8d`, merged PR26.
- Enhancement input: `0ba7613138de2f1ba0158e84447aac8525aa12ec`, including original advisor PR25 head `2530a701bf554020a696e30ebb7fbb1131dcec44`.
- Combined merge: `2830a1484b6f28c5a5f4baed20c9a5cbebcf9f46`. The automatic owned-Next merge retains verified runtime cleanup plus advisor configuration.
- Tested application candidate: `69ce51458b49031cb2c6a17db73d7d5d182e5992`, tree `31b0f8ff6377f756e441a8bf5a48b13c1b894f55`. Later review documentation does not change tested application code.
- Remote [PR25](https://github.com/JoseK0514/NEVORA/pull/25) remains draft at `2530a701`. Publish this reviewed descendant by normal fast-forward to its existing head branch only after the source gate. Do not create an extra remote branch, force-push, include unrelated CI spending PR27, or touch main.

The release adds Owner-only cited investigation, private conversation/priorities, shared daily limits and cancellation; deterministic prioritized operational briefing and issue review; canonical eligibility-based coverage proposals with exact human confirmation and separate published notification consent; and read-only English/Spanish attendance/payroll exception reviews for 1–31 days. Payroll readiness remains unverified. AI has no publish, payroll-approval or message-delivery tool. Provider/data approval flags default off; deterministic workflows do not require a provider.

## Findings and independently reproduced closures

1. Security M1 / QA-I01: valid multi-period answers produced nine or fifteen citations while the public parser accepted eight. The real loop→parser regression failed twice before the fix. The corrected answer bound derives from the unchanged eight-tool budget; only answer parsing accepts fifteen, and destination/time/label validation remains enforced. Independent security and QA reran the affected boundaries, accepted 9/15, rejected 16 and retained external-destination rejection. They independently transferred unchanged service/security scope to `69ce5145`.
2. UI-1: the native WebKit language select measured 25px, below the approved 44px target. `min-height:44px` alone still failed independent replay at `783bb7e`; both failures remain preserved. Reusing the existing SelectField yields 48px for all four workflow controls in both engines at all three widths. Independent UI closes UI-1 at `69ce5145` after real geometry, typeahead/focus and full workflow replay.

Three additional native arrow/menu keyboard attempts remain failed. Plain native selects in both headless engines reproduce the same behavior; no app-specific defect was established. Real `e` typeahead selects English and Español with retained focus in the application. Physical/native arrow-menu operation remains unverified. Independent reports retain their original findings; this implementation handoff does not rewrite or self-close them.

## Checks actually run

| Check | Actual result and custody |
| --- | --- |
| Final default suite at `69ce5145` | 9,487 passed, 801 existing skips, zero failures; 564 passed files / 27 skipped; 299.78s, `--maxWorkers=1`, original assertions/timeouts |
| Earlier combined default suite | 9,482 passed, two 5s migration-test timeouts, 801 skips. Both unchanged tests pass in the focused 68-case replay and full final replay. No proven exclusive timing cause is claimed |
| Final typecheck / repository lint | Both exit 0 at `69ce5145` |
| Final production build | `release-build.mjs` exit 0; clean candidate, all 5,198 source hashes unchanged; receipt hashes 3,287 build files. This is build custody, not deployment |
| Independent advisor SQL | 38 passed at corrected candidate, transferred unchanged scope to `69ce5145` |
| Independent canonical coverage / foundation / supplemental period SQL | 39 / 281 / seven passed; byte-identical service/schema scope explicitly transferred, not relabeled as fresh final-head executions |
| Independent affected security tests | 85 passed plus independent nine-citation/external-URL probe at `783bb7e`, transferred after entire two-file UI diff review |
| Independent affected QA boundaries | 64 passed at `783bb7e`, transferred after source/evidence hash comparison |
| Independent actual browser baseline | 28 groups passed, 71.56s, Chromium/WebKit at `69ce5145` |
| Independent supplemental browser | 36 groups passed, 74.04s, including English/Spanish results, control sizes, exact consent and real native typeahead/focus |
| Browser custody | All five owned runtimes closed; every 1,866-file source manifest independently matched; source/mirror verified, owned caches released, PostgreSQL stopped. Failed attempts remain incomplete, never green |
| Release-engineering | 110 passed on combined source; relevant scripts unchanged |
| Pilot guard / inventory and inspection guard regressions | Exit 0 at final application candidate; no paid calls |
| Historical inspector custody check | PASS: 409 files / 50 reports / 310 screenshots. Historical archive custody only, no findings acceptance |
| Dependency audits | Production-only audit: zero vulnerabilities; final full dependency audit: zero vulnerabilities |

All database testing used fresh owned loopback PostgreSQL and fictional data. No production credentials, customer records, real notifications, hosted database writes or newly metered inference were used. Browser answer/error/cancel fixtures are explicitly synthetic; they do not establish real-model semantics.

## Independent positions and limits

- Engineering/security: APPROVE for reviewed code, WATCH for nonblocking controller complexity, historical extraction growth and diagnostic debt; no open code-scope blocker.
- Independent QA: GO WITH CONDITIONS for local SQL/service/provider-contract scope. Whole-public-table nonmutation, authority revocation, date bounds, unavailable payroll, capped recorded runs and historical/private-field projection probes passed. No scale/load or live-model certification.
- Independent UI: GO WITH CONDITIONS for local observed surfaces; UI-1 closed. Physical devices, native arrow menus, full accessibility/contrast, larger populations, payroll-enabled contents and model-generated reasoning remain outside its certification. Density and raw DRAFT localization remain minor follow-ups.
- Release governance: source inventory and exact remote CI remain mandatory. Base development CI success cannot certify this unpublished candidate. No exception or production approval was inferred.

Raw reviewer reports are copied unchanged under [the review directory](../reviews/2026-10-23-owner-ai-integration/). Initial security/UI findings, failed UI closure, successful independent closures and explicit scope-transfer notes are all retained. Detailed logs, custody manifests, SQL probes, screenshots and traces remain outside the checkout at `/Users/josek0514/.codex/owner-ai-integration-evidence-20261023/`. See the [approved execution plan](../superpowers/plans/2026-10-23-owner-ai-integration-review.md).

## Remaining release gates

1. The active “Verify Manager/Owner rebuild” task owns archived-branch retirement. Base development's actual workflow [39988584243](https://github.com/JoseK0514/NEVORA/actions/runs/39988584243) passed all 12 mandatory jobs. At last remote check, 56 heads remained; the five-branch ceiling and final PR26 recovery tag still block source-inventory compliance. Do not race the existing cleanup owner or weaken the ceiling. Fetch and rerun `npm run check:development-sources` after its work.
2. Once the source gate passes, verify remote PR25 still has the expected ancestor, publish the combined candidate by normal fast-forward, attach/update its title and review description, and obtain complete exact-candidate/test-merge cloud CI. Preserve actual SHA and artifacts; no pending/skipped mandatory job counts as success.
3. Merge only into development as authorized after all mandatory candidate gates. Verify the actual merge parents/tree and matching development-push CI before calling development integration verified.
4. Hosted acceptance needs an approved isolated non-production database, least-privilege credentials, exact environment binding and rollback. The separately prepared Preview setup is still held for hosted database authorization. Never substitute its legacy Preview database or production bindings. This candidate's canonical chain has 40 BASE plus two FINAL migrations; held tenant migration files stay excluded. AI additions are `0036_owner_advisor.sql` and `0037_owner_briefing_reviews.sql`; neither was run on a hosted target here.
5. The original $5 pilot is exhausted at 20 reserved attempts. A new cap question is pending. Preserve the original ledger; do not reset it, create another allocation under the old authorization or call a provider without a newly authorized campaign. Live answer-quality acceptance remains open.

Owner: Codex for candidate/remediation/integration, independent reviewers for their own conclusions, existing rebuild task for branch retirement/its prepared Preview setup, Jose for additional spend/hosted setup decisions and production authorization. No user action is needed for the completed local fixes. The outstanding spend/setup decisions cannot be inferred from elapsed time.
