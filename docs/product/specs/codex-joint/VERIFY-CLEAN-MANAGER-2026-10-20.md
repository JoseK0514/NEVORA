# Clean Manager verification ledger

Owner: Codex. Working branch: `codex/verify-preview-33`. The requested baseline was `30058003e3e3a77932016fa1aff0b4dcbe69c1a5`, fast-forwarded from `2eb2a03a` before verification work.

**Release recommendation: NO-GO.** Four P1 and three P2 independent Manager/Owner findings remain open. Production migration, recovery, performance acceptance and authorization gates also remain open. No risk exception or production approval has been granted.

This ledger is frozen before the final build and hosted CI so those gates can identify its exact commit. The [final gate receipt](</Users/josek0514/.codex/visualizations/2026/10/20/01a15962-cdee-7dd0-8a92-023551b076fb/final-gates/verification.json>) records the immutable candidate, build, push and CI result after that freeze. Read its SHA and actual status; a local pass or this ledger alone is not hosted or production verification.

## Changes and checks

| Work | Observed result and evidence |
| --- | --- |
| Baseline gates | Types, full lint and source-bound production build passed at the requested baseline. Units: 7,377 passed, 801 skipped; 448 files passed, 27 skipped. Original logs: `/tmp/nevora-verify-33-{types,lint,unit,build}.log`; build receipt: `/tmp/nevora-verify-33-build.json`. |
| CI custody | The push filter omitted this verification branch. A regression reproduced that omission, then the exact branch was added without removing mandatory jobs. [Run 39426840311](https://github.com/JoseK0514/NEVORA/actions/runs/39426840311) failed legacy browser selectors. [Checkpoint 39439404431](https://github.com/JoseK0514/NEVORA/actions/runs/39439404431) passed validate and the Clocker/release/Phase E PostgreSQL jobs, but failed downstream browser audits and Phase E's 30-minute macro limit. Neither run is an overall pass. |
| Exit sweeps | 6,160 cases over 308 navigations, with no failed navigation or document overflow. Independent findings below remain open. The 268 raw legacy-checker cases use obsolete assumptions and are not current acceptance results. Independent report reviews verified all 77 referenced artifacts. [Exit packet](clean-manager-exit-2026-10-20/README.md). |
| Browser contracts | Timecards approval now opens the detail sheet; Insights, Inbox, corrections, Clocker and Phase E selectors follow current surfaces. Existing Sign in labels were already correct. Authorized request-note detail, compact/unrelated exclusion, private clearing, retries, receipts and native interaction gates remain. Original D passed 201 checks; each of five E suites passed 14 cells at separate documented checkpoints. These are not one final 70-cell pass. [Original verification](CLEAN-MANAGER-BROWSER-VERIFICATION-2026-10-20.md), [review](CLEAN-MANAGER-BROWSER-REVIEW-2026-10-20.md). |
| Browser follow-up | Real Reports region focusability and scoped Safari correction-select sizing/caret fixes accompany current-control tests. Account 14, missing 6, Reports 14 native + 14 axe, Clocker 90, select 26, affected D2 helper 130, component 49 and release-engineering 61 checks passed at their recorded checkpoints. D2's 224-check prefix ended nonzero; its counts overlap the complete focused helper and must not be summed or called a local full-chain pass. Final hosted D2 and all 70 E cells remain mandatory. [Follow-up](CLEAN-MANAGER-BROWSER-HOSTED-FOLLOWUP-2026-10-20.md), [scoped review](CLEAN-MANAGER-BROWSER-HOSTED-REVIEW-2026-10-20.md): APPROVE, WATCH, no scoped blockers. |
| Server contracts | Safe deadline return destination and Scheduling rules section preserve week and existing authority. A batched, live-authorized, minimal approved-absence read supplies same-snapshot checked employee IDs; full-day and unavailable cells have no Add, partial leave remains distinguishable. Task 3: 81 focused, 5 actual PostgreSQL, 25 inset tests; four browser state cells and 36 geometry cases. All 13 source and 147 evidence hashes verified. [Implementation](CLEAN-MANAGER-SERVER-CONTRACTS-2026-10-20.md), [review](CLEAN-MANAGER-SERVER-REVIEW-2026-10-20.md): APPROVE with a nonblocking test-typing concern. |
| Application checks after fixes | At application checkpoint `293ffcf6304ea258697a4614d46a59fa3c626cc1`, types, full lint and units exited 0 using the existing safe environment. Units: **7,394 passed, 801 skipped; 449 files passed, 27 skipped**. Later task changes are documentation only. [Logs, receipts and hashes](</Users/josek0514/.codex/visualizations/2026/10/20/01a15962-cdee-7dd0-8a92-023551b076fb/final-gates/local-summary.json>). Final exact-candidate build/CI are recorded separately above. |
| Migration planning | [Runbook](PRODUCTION-MIGRATION-RUNBOOK-2026-10-20.md) and [ordered manifest](PRODUCTION-MIGRATION-MANIFEST-2026-10-20.json) completed. [Initial review](PRODUCTION-MIGRATION-REVIEW-2026-10-20.md) requested two authorization clarifications; [scoped re-review](PRODUCTION-MIGRATION-REREVIEW-2026-10-20.md) approves the corrected planning document. **Execution remains BLOCKED.** No backup, rehearsal, restore or apply occurred. |

[Final whole-branch review](CLEAN-MANAGER-FINAL-REVIEW-2026-10-20.md) approved the bounded implementation and verification/planning packet: spec PASS, quality WATCH, no blocking findings. It reviewed `30058003..2cb99bfc`, verified application and migration custody, and explicitly permits this review-record-only documentation descendant to proceed to exact-candidate build and hosted CI. Its nonblocking findings are test-fake typing debt, enlarged-select clipping and an implicit paired-time DTO invariant. Review approval does not close independent exit findings or authorize production operations.

## Independent exit findings

| ID | Severity | Observed issue |
| --- | --- | --- |
| TC-MAN-01 | P1 | Schedule inline link has 1.03:1 contrast against surrounding text and no underline. |
| ST-MAN-01 | P1 | Home placeholder/content growth causes measured layout shifts. |
| ST-MAN-02 | P1 | Timecards at 768px grows from 0 to 874px after a held read and shifts the footer. |
| IS-MAN-02 | P1 | Tablet at 125% text: Inbox's sidebar hit area overlaps adjacent rows; an actual tap opens Schedule. |
| IS-MAN-01 | P2 | Pending Timecards action uses Retry wording and the sheet shifts. |
| IS-MAN-03 | P2 | Inbox at 320px/125%: All's effective target is 39.453 × 44px; an adjacent tap selects Act now. |
| IS-MAN-04 | P2 | Schedule at 320px: day targets measure 43.422 × 64px, below the approved 44px touch ruling. This is not a claim that WCAG AA requires 44px. |

The [independent addendum review](clean-manager-exit-2026-10-20/evidence-addendum-review.md) preserves the final count. These findings have not been independently closed by later implementation work. Large matrices and pseudo-element declarations do not replace actual hit tests, loading/state checks or native interaction. Physical-device, VoiceOver and TalkBack acceptance remain outstanding.

Separate limitations remain documented: the empty native Rules datetime placeholder internally crops at 320px/200%, without observed stored-value loss; the correction select's closed label truncates at 320px/200% and slightly at 768px/200%, while full native option text and selection remain available. Outer geometry does not certify native internal text readability. The absence-reader unit fake's double cast remains nonblocking test-typing debt; actual PostgreSQL authority tests ran separately. No full Schedule authorization or production-security certification is claimed.

## Schedule load recommendation

Hold broad Schedule performance acceptance pending query, CPU, rendering and payload profiles, then evaluate a narrower request-scoped projection with the same authorization checks. [The historical load report](LOAD-2026-10-19.md) measured full-HTML p95 of 10,631ms at concurrency 20 and 6,122ms at concurrency 10 with 200 fictional employees. Its test transport differs from production Neon HTTP. This is not a fresh post-change hosted benchmark, an established bottleneck or an approved SLO. No speculative cache/index change was made, and Codex has not accepted 10.6 seconds for Jose. Jose owns any material residual-risk acceptance.

## Migration, controls and next owner

The target is `rough-fire-63258908` / `br-green-night-b87vx3ud` / `fuel_scheduler`. Read-only snapshots show partial post-0002 objects, not exact migration completion. The application loader has 36 entries including two baseline comparisons and 34 potential upgrades through 0033; duplicate prefixes require full filename order. Both 0019 and 0033 need explicit transaction wrappers. The two guarded F10 migrations require their separate protocol; 0034 is absent and requires Jose's separate compliance integration/migration approval. The manifest hash is `ccdc7c7150bdb6732d3d8944ce5a762d8680f67d743fc58c60d5e3e234e383d5`.

Before any apply: reconcile baseline and backfills; prepare the reviewed executor, journal and unknown-commit recovery; prove restricted backup/rehearsal, supported restore, retention and inherited-role isolation; verify deployed-app compatibility and freeze/resumption; obtain Jose's exact-candidate approvals. The runbook contains proposed approval text, not granted approval. Existing approved read-only diagnostics need no extra permission stop; expanded access and production write continuation retain their approval boundaries.

Engineering owns bounded implementation evidence. Security requires minimal live-authorized reads, safe return paths and isolated credentials/data. Product preserves approved v3 behavior and legal/payroll wording. Technical assurance retains the performance condition. Governance recommends NO-GO while mandatory exit and migration/recovery/authorization gates remain open. Program delivery owner for this verification packet is Codex; production operator and recovery owner are unassigned.

Next gates: exact-source production build and hosted CI, recorded in the external final gate receipt; then UI remediation with independent re-audit, the performance decision, and the runbook's preparation/rehearsal gates. Jose's production, main-merge, deployment, compliance and delivery/payroll activation decisions remain separate. No material exception has been accepted.

Only fictional owned test data was mutated. Production access was metadata/catalog reads only: no customer rows or credentials were retrieved. No production data writes, backup branch, restore, real notification, main merge or production deployment occurred. Work remains on the own verification branch; final commit/push state is in the gate receipt.
