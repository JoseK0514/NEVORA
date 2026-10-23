# Owner AI manager — Task 2 and whole-feature engineering review

Date: 2026-10-22

- codeQualityStatus: BLOCK
- recommendation: REQUEST_CHANGES
- Spec compliance: REQUEST_CHANGES — H1 violates deliberate priority conflict handling.
- Scope: bounded development increment only. No independent QA/UI certification or production approval.
- blockers: H1; completion of the pending final source-bound browser/build verification before approval.

## Inspected source and contracts

Base: `0f8ffee52d85f48cd2fe890dc9aa682e995de4eb`. Packaged review: `.superpowers/sdd/2026-10-22-owner-advisor/review-0f8ffee5..cfaab281.diff`. Worktree HEAD during review: `240728bbf65514ac74795a825a57afb6a4350ff6`; production/UI/unit source remains at `577fc0ac`. The additional HEAD delta from cfaab281 is 55 added browser diagnostic lines, not application behavior. Working tree was clean on entry. No application edits made by this reviewer.

Read final-review-brief, task-2-brief/report, the design spec and plan, superseding task-1-review, and progress.md (coordination notepad). Inspected current controller, lifecycle, response parser, screen/CSS, page/navigation/Home/signout integration, associated unit/render tests, browser journey and launcher diff. Traced backend service/authority/store/tools/contracts/provider boundaries for interactions, relying on the explicitly scoped prior backend review for already resolved backend findings rather than repeating its whole audit.

## CRITICAL

None found.

## HIGH

### H1 — Background refresh silently rebases a dirty priority edit, bypassing conflict review

Locations: `src/components/owner-advisor/controller.ts:145`, `:148`, `:321`.

Trigger: tab A loads priority revision 1 and edits its textarea. Tab B saves revision 2. Tab A's periodic or manual GET receives revision 2 before A presses Save. Refresh replaces `snapshot` with that new profile while retaining A's dirty textarea, without setting conflict. Save then submits `snapshot.profile.revision` (2), even though A's draft was based on revision 1. The server's exact-revision check consequently accepts a stale edit and overwrites B's save without the promised review step.

Independently reproduced against the real exported controller using `node --import tsx --input-type=module` with an injected HTTP transport; no database, provider or production access. Sequence: start -> GET revision1 -> editPriorities('draft based on revision 1') -> refresh returns revision2/'other tab saved' -> save. Actual output:

```json
{"beforeSave":{"draft":"draft based on revision 1","serverProfile":{"priorities":"other tab saved","revision":2},"conflict":false,"dirty":true}}
{"submitted":{"op":"save_priorities","expectedRevision":2,"priorities":"draft based on revision 1"}}
```

The request UUID is omitted above because it is irrelevant. The probe stopped the controller and exited 0. This is an actual controller request construction defect, not an inference that a live database was changed. The store passes expectedRevision directly to the SQL save function, whose intended optimistic concurrency behavior makes the consequence clear.

Required: preserve the revision on which an edit was based, or explicitly enter the existing conflict-review flow when a newer profile arrives while dirty. Review acknowledgment must authorize only the reviewed revision; another later refresh must not silently authorize a further replacement. Retain draft text and current saved priorities. Add a regression covering revision drift BEFORE Save, including another change after review. Existing post-save revision regression does not cover this case. The browser conflict scenario currently saves immediately after its competing request, so it can miss the intervening polling window.

## MEDIUM

### M1 — New UI modules exceed the loaded skills' source-size limit

Locations: `src/components/owner-advisor/advisor.tsx:1`, `src/components/owner-advisor/controller.ts:1`.

Measured nonblank/non-line-comment LOC: screen 301, controller 327. Both exceed the programming/remove-ai-slops 250-line criterion. The screen combines briefing, transcript, priority editor and React lifecycle wiring; the controller combines private-read lifetime management and operation/edit state. This is a maintainability observation, not another demonstrated runtime failure. Keep any remediation narrowly responsibility-based; do not introduce generic factories or split the state machine mechanically. H1 is the correctness blocker; a broad controller refactor is not required to establish its fix. This observation may be carried as explicit follow-up with rationale rather than used to expand the bounded fix wave.

## LOW

- Prior backend review's HTTP test helper definite assignment, cleanup catch and mock-argument cast remain deferred. No new evidence of false success was found.
- Public-response parsing uses checked type assertions and generic Error strings; these depart from programming's strictest type conventions. The assertions follow actual boundary validation, including source destinations, and no unsafe destination or private-data bypass was found. Do not add a validation dependency merely for style parity in this bounded increment.

## Skill-perspective check

Ran both required perspectives by loading `/Users/josek0514/.codex/plugins/cache/sisyphuslabs/omo/5.1.30/skills/remove-ai-slops/SKILL.md` and `programming/SKILL.md`, plus TypeScript README/data-modeling guidance. Consulted repository executive/CTO/CISO/Governance guidance and current DESIGN.MD direction.

The overfit/slop pass found no deletion-only tests, removal-verification tests, prompt-prose pins, or tautological implementation-constant assertions in the reviewed new UI behavior. Controller tests operate through observable state/requests with injected transport and fake time; browser preference checks use the real app and owned SQL. Rendering text assertions test visible product output, not model instruction prose. Boundary parsing and normalization protect HTTP/provider/tool contracts and allowlisted links; they are justified, not unsolicited production data extraction. No new `as any`, ignored type errors, test suppression, dependency replacement, or mutation tools were found. Both skills' size perspective flags M1; typing deviations are LOW above. H1 demonstrates a missing concurrency scenario despite otherwise relevant tests.

## Cross-feature assessment

Feature-off and Owner-only page/API gates are server-derived. The page emits the client shell, not server-rendered private transcript data. Browser state has finite leases, generation fencing, cancellation, blur/visibility/offline/signout retirement, and no local/session storage. Post-operation GET fencing addresses previously fixed stale reads and long operations; H1 concerns the separate edit-base revision invariant. Same-tab signout notification precedes existing cleanup.

Source destinations are allowlisted; model/history content uses escaped React text. Current briefing is distinct from history. Owner navigation is minimally additive; Manager/employee lists remain on existing branches. UI uses existing kit/tokens and narrow-width CSS, but final visual/runtime proof remains pending.

Backend interactions retain server-owned identity/history, original Company Access authority checks, owner/workspace persistence scoping, guarded transactions, usage reservation/replay, and finite provider/tool/cancellation limits. Tools preserve position identities and distinguish published facts from draft commitments, disclose truncation, and reuse current scheduling logic. The earlier fixes remain present. No broader business execution or monitoring is claimed. Injection resistance of a live model remains unproven; mock-model behavior and data minimization are not that proof. Provider activation/spend/data-handling decisions remain outside this review.

Migration 0036 remains classified in canonical and disposable order. The owned launcher adds only an explicit feature boolean and does not forward model credentials. Existing production scripts were not replaced with a fake inference implementation.

## Evidence inspected and limitations

- `.omo/evidence/owner-advisor-ui/unit-green.log`: 53 focused UI/navigation/signout tests, exit 0.
- UI `typecheck.log` and `lint.log`: explicit commands and exit 0.
- `.omo/evidence/owner-advisor-backend/round1-completion.txt`: 23 focused tests, 19 owned PostgreSQL integration tests, TypeScript/lint exit 0, cluster stop. These support the prior backend approval, not final browser success.
- `.omo/evidence/owner-advisor-final/unit-final-working-tree.log`: 552 files / 9341 tests passed; 27 files / 801 tests skipped. These skips are reported, not called executed database coverage.
- `lint-final-working-tree.log`: full ESLint invocation present; root reports process success, but this log itself contains no explicit exit marker.
- Provisional run2 browser results are explicitly from older source. Final browser receipts have failures; `browser-final-traced.log` records a competing navigation interruption at browser-test line 143. Earlier final attempts recorded WebKit overlay errors. Root/worker are diagnosing; no zero-error final browser result is claimed here.
- Optimized build and root's personal browser proof remain pending. They are not counted as passed.

No covered full suite was rerun by this reviewer. The narrow H1 probe is the new independently executed behavior check. No live provider, billable inference, production database, publication, merge, or deployment occurred. Root requested the consolidated REQUEST_CHANGES disposition now because H1 already blocks, without waiting for pending receipts.

## Next gate

Implementation owner: root-coordinated UI executor. Correct H1 with red/green concurrency evidence, then supply final exact-source focused/type/lint, owned browser (strict zero-error and no external requests), and build receipts. One scoped re-review of the fix and final evidence suffices; no duplicate broad backend audit is requested. No Jose policy exception is required for the local correction. Production hold remains.

`omo-agent-toolkit ulw-loop status --json` returned `ULW_LOOP_PLAN_MISSING` in the reviewed worktree. Canonical fallback report: `.omo/evidence/owner-advisor-code-review.md`; requested handoff copy: `.superpowers/sdd/2026-10-22-owner-advisor/final-review.md`.


---

## Superseding final scoped re-review — f67ad18d (2026-10-22)

This disposition supersedes the earlier BLOCK/REQUEST_CHANGES for the complete bounded development increment. Scope of this re-review is H1, regressions introduced by its correction, and the previously pending final evidence. The earlier whole-feature review remains the broad review; it was not duplicated.

- codeQualityStatus: **WATCH**
- recommendation: **APPROVE**
- Spec compliance: **APPROVE for the bounded development increment**
- blockers: **[]**
- CRITICAL: none.
- HIGH: none open; H1 closed.
- MEDIUM: M1 remains explicitly deferred and nonblocking; no broad refactor requested.
- LOW: earlier typing/cleanup observations remain nonblocking.

### H1 closed — dirty edits retain their own reviewed revision

Inspected fix `31a8adb1..f67ad18d2b571cf0eb8dd2da04cf3ad532aafe87`, limited to controller, controller tests and browser scenario. The packaged `.superpowers/sdd/2026-10-22-owner-advisor/review-31a8adb1..f67ad18d.diff` exactly matches `git diff -U10` for that range. Worktree HEAD was f67ad18d and clean throughout the verification inspected.

`controller.ts` now captures `draftRevision` when a clean field first becomes dirty. A refreshed different revision preserves the draft and opens conflict review instead of advancing its save baseline. `reviewConflict()` binds only the currently displayed saved revision, and later drift opens conflict again. `save()` submits that independent baseline and rejects unresolved conflict/absent draft state. Retirement clears the baseline. Successful saves set their acknowledged revision, while the preexisting post-save check retains conflict if a later revision has already appeared. Suppressing refresh-driven conflict during an active save does not silently authorize a later write: the actual request already holds its captured revision and successful completion separately checks newer state.

Inspected both new tests and `.omo/evidence/owner-advisor-ui/h1-red.log`: both relevant cases failed before correction (conflict stayed false). They now demonstrate that pre-save refresh drift sends no POST until review, and another revision after acknowledgment again blocks POST until renewed review. Expected revisions derive from distinct fixture revisions rather than implementation constants. Existing long-operation, stale-read, uncertainty, signout and post-save tests remain in the affected suite. No material new regression was found.

### Final evidence verified

- UI `h1-green.log` and `stop-verification.txt`: 55 affected tests pass; full TypeScript, touched-source ESLint and diff checks exit 0. Stop receipt binds final checks to clean f67ad18d.
- Final owned browser `h1-browser.log`: successful integration run, 48.86 seconds, owned cluster stopped. Original `/Users/josek0514/.codex/owner-advisor-ui-evidence-20261022/h1-final/report.json`: complete true, 18 scenario groups, errors=[], external=[], providerConfigured=false. The updated actual PostgreSQL/browser journey exercises pre-save drift and drift after acknowledgment in both Chromium and WebKit, with draft/current text retained and Save disabled until review. Other groups retain mobile/keyboard/disconnected/access/privacy behavior.
- Independently compared every one of the browser report's **1,838 source SHA256 entries against committed git blobs at f67ad18d**: zero mismatches. `h1-final/owned-next-XGFUr5/ownership.json` confirms closed, sourceVerified and mirrorVerified true. Inspected WebKit priority-review screenshot; it corroborates displayed draft/current text/review controls. Disabled behavior comes from browser assertions, not visual inference.
- `.omo/evidence/owner-advisor-final/unit-final.log`: 552 test files and **9,343 tests passed**; 27 files and 801 existing tests skipped. Exit 0 is recorded in the combined completion receipt and supplied process result. Skipped tests are not claimed as executed.
- Full `lint-final.log` plus `completion-verification.txt`: full-project ESLint exit 0 at final source.
- `build-final.log`: optimized Next build compiled, completed TypeScript/static generation and route output. Original `/Users/josek0514/.codex/owner-advisor-final-evidence-20261022/build-source.json`: checkpoint f67ad18d, sourceClean=true, sourceUnchanged=true, exitCode=0; 2,813 artifact-file entries and 4,693 source-hash entries. The combined receipt records the exact source-bound release-build invocation. No database migration or deployment is inferred from the build.
- `manual-browser.md`, its runtime.json and full-page preview screenshot inspected: root's actual CUA browser check on a separate fictional-data runtime at f67ad18d covers login, Home entry, starter fill, actual priority save/reload and disconnected Ask; reported console warnings/errors empty. Screenshot shows the dated briefing and persisted 77-character fictional priorities. This is root's interaction evidence inspected by this reviewer, not a claim that this reviewer personally operated that browser. The deliberate local demo remains running; the integration-test runtime above is closed.

Backend evidence remains the unchanged, previously approved 23 focused/19 real owned PostgreSQL checks and prior scoped backend review. No redundant suite rerun occurred in this re-review.

### Skill perspectives, limits and handoff

Reapplied the previously loaded remove-ai-slops and programming criteria to this fix. Both regression tests observe the failed concurrency behavior and resulting requests; no deletion-only, prompt-prose, tautological or constant-mirroring tests were added. The single draft baseline is required state for optimistic concurrency, not needless parsing or abstraction. M1 and earlier LOW style deviations remain explicitly recorded; they do not prevent this bounded development approval.

Engineering recommendation: approve the development increment. Root owns final handoff/bookkeeping. No application changes after f67ad18d are covered by this approval. No production authorization, hosted certification, live model compatibility, provider authentication, prompt-injection resistance or billable inference is claimed. Answer/error/cancel browser responses remain clearly identified UI fixtures. Provider/data-handling/spend activation and business execution/monitoring remain subsequent scope. No new Jose policy exception is required for completing the local handoff.

Canonical report remains `.omo/evidence/owner-advisor-code-review.md`; identical requested handoff copy remains `.superpowers/sdd/2026-10-22-owner-advisor/final-review.md`.
