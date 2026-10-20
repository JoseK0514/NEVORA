# Scoped CI round 2 specification and code review amendment

- specStatus: PASS
- codeQualityStatus: WATCH
- recommendation: APPROVE
- blockers: [] for advancing this bounded change to final build and hosted CI
- releaseRecommendation: NO-GO
- reportPath: /tmp/nevora-verify-33-ci-round2-review.md
- requiredFallback: .omo/evidence/clean-manager-ci-round2-code-review.md

## Scope and source custody

Reviewed exact 07eff2b23132ed465ebdbf80c6ee3e29b96403ba..24f4f0d06c2aed7d076be0405a87357c0e63a94d, plus the requested documentation-only correction through 86e85806efdf6127832d8793a1c3fb9a633b0ec8. Four files, 170 additions/5 deletions. HEAD is 86e85806 on codex/verify-preview-33; tracked status is clean and git diff --check passes. The 24f..86e change only corrects the reported initial WebKit active element from BODY to MAIN, matching its actual artifact. From tested 7a5aa1ce to this endpoint, only the handoff document changes.

Inputs inspected: task-2-ci-round2-review-brief.md, task-2-ci-round2-report.md, full four-file Git diff, package.json, AGENTS.md, PHASE-D-CI-ROUND2-FOCUS-HANDOFF.md and CLEAN-MANAGER-FINAL-REVIEW-2026-10-20.md. Notepad consulted: .superpowers/sdd/CLEAN-MANAGER-VERIFICATION-PLAN/progress.md. The prior whole-branch verdict is amended, not replaced by a claim to re-audit its entire evidence set.

## Findings by severity

### CRITICAL
None introduced by the reviewed delta.

### HIGH
None introduced by the reviewed delta. The seven independent exit findings remain open, including the previously recorded four P1 findings. They are not downgraded or self-closed here.

### MEDIUM
No new medium finding. Carry forward the prior nonblocking fake-SQL typing debt and enlarged native-select clipping limitation from CLEAN-MANAGER-FINAL-REVIEW-2026-10-20.md unchanged.

### LOW
L1: src/components/private-fragment-focus.test.ts:28 and :59 use non-null assertions to retrieve the captured effect. This is a limited departure from programming's no-unchecked-assertion preference. The preceding synchronous hook invocation currently establishes the invariant, and omission would fail the test rather than create false success. A helper with an explicit missing-effect failure could clarify it when this fixture next changes; no blocking code change is required. The unused getComputedStyle stub at :36 is minor fixture residue, not a useless test or production complexity.

The prior absence DTO invariant finding remains carried forward. Existing large browser-script structure is unchanged in kind; extracting the entire runner would expand this bounded causal fix unnecessarily.

## Correctness and specification

The production fix is at the shared seam. A ready protected row with zero layout rectangles is observed until reveal. The completed fragment is recorded only after native focus actually makes that row active. Hash replacement disconnects the old observation and schedules the current target; cleanup cancels pending frames, removes the listener, disconnects observation and prevents disposed callbacks from focusing. Success stops observation and prevents repeated focus for that completed target. The existing ready gate and malformed/unrelated/absent fragment behavior remain intact.

Inspected manager-time-corrections, manager-attendance-review, timecards and ManagerIssueFocus callers. Their completed-read gating and disclosure/popover reveal behavior are preserved. The concrete CSS cause is premium-desktop.css:194: attendance aria-busy hides the correction section independently of the correction read. The hook change addresses that actual display:none race without adding data normalization or changing authorization, private-data lifetime, CSS, receipts or API contracts.

The browser regression holds the actual attendance request, waits for the real correction row to attach, verifies hidden/unfocused state, then releases attendance and retains the native activeElement assertion and existing timeout. It does not substitute focus, force clicks, increase timeouts or weaken the prior assertions. The additional layout/read extraction is test evidence, not production parsing. Fake lifecycle tests are useful supplementary checks of cancellation, target changes and single consumption; they are not accepted as browser-layout proof.

## Skill-perspective check

Loaded and consulted remove-ai-slops/SKILL.md and programming/SKILL.md from /Users/josek0514/.codex/plugins/cache/sisyphuslabs/omo/5.1.30/skills/, including programming's test-discipline and boundary criteria. Consulted repository executive operating model and CTO instructions. Read-only scope takes precedence over implementation/refactoring workflows.

Ran the overfit/slop review pass over all added tests and production hunks. No deletion-only, removal-verification-only, tautological, prompt-prose or implementation-constant-only test was found. Tests exercise active focus and lifecycle behavior; the real browser RED/GREEN independently corroborates the fake's important layout assumption. No needless production extraction, normalization, parsing, wrapper or untyped production escape hatch was added. Minor programming-perspective departure L1 is nonblocking; no substantive anti-slop violation was found. Prior typing/DTO departures remain carried as previously recorded.

## Evidence independently checked

Evidence root E: /Users/josek0514/.codex/visualizations/2026/10/20/01a15962-cdee-7dd0-8a92-023551b076fb/ci-round2

- Recomputed all 127 artifact-inventory.json entries' byte sizes and SHA-256 hashes: zero mismatches.
- Recomputed each of the 1,493 original-source hashes in both red/owned-next-zSf6pG/source-manifest.json and green/owned-next-IenzlG/source-manifest.json against its recorded Git checkpoint: zero mismatches. Compared both retained application hook mirrors directly with the corresponding Git blob: identical. Browser scripts run from source and are not copied into the application mirror; their absence there is expected, not missing application custody.
- Inspected clean red/report.json and red/chromium-correction-focus.json: 67 checks followed by the native-focus timeout; target changes from zero rectangles/display none to one rectangle/display block while BODY remains active and targetFocused=false. Protected reads return 200.
- Inspected green/report.json, green.log and both engine correction-focus JSON files: 201 checks, zero errors, exit 0; hidden targets become visible and natively focused ARTICLEs. Chromium initially has BODY active; WebKit initially has MAIN active. Both retain successful ordinary keyboard timecard focus, privacy clearing, reconnect and authority checks.
- Inspected unit-red.log (3 fail/4 pass), scoped-tests.log (47 pass), lint-final.log and types-committed.log (exit 0). Unit RED predates helper naming cleanup and is not represented as the final test-file checksum. Native RED/GREEN is the causal acceptance proof.
- Inspected final-handoff.json, verification.json and original RED/GREEN ownership receipts: clean source and mirror verification, closed runtimes. The earlier deterministic-red custody rejection remains disclosed and excluded; it is not used as passing evidence. I did not launch runtimes or independently repeat a live PID audit.

No broad tests were rerun: root owns current full type/lint/default-unit gates. The reviewer ran read-only Git, source/artifact/hash checks only, and wrote review artifacts. Root reports its full-gate wrapper began at 24f before the docs-only 86e commit; any final all-source guard failure must be reported separately from actual command results and reconciled with explicit source identity. This review does not pre-certify that reconciliation, build or hosted CI.

## Handoff and final-review amendment

The bounded implementation may advance to source-custodied final build and exact-candidate hosted CI. A review-record-only documentation descendant may proceed without recursive review if executable/configuration/migration input identity is checked and recorded. Final build/new hosted CI remain pending; no release approval is granted.

Preserve all seven independent exit findings and prior typing/clipping/DTO debt. Migration SQL/loader are unchanged; retain the approved planning packet's pinned checkpoint and require matching the final candidate before future approval. Production migration execution remains blocked, and release remains NO-GO pending its existing independent and authorization gates. No source edit, commit, push, deployment, database operation, runtime or subagent was performed by this reviewer.

omo-agent-toolkit ulw-loop status --json returned ULW_LOOP_PLAN_MISSING, so the required fallback artifact is supplied alongside the requested /tmp report.
