# Final whole-branch code and specification review

Reviewed 2026-10-20.

- specStatus: PASS for the bounded implementation and honest verification/planning packet; final build and hosted CI remain pending.
- codeQualityStatus: WATCH
- recommendation: APPROVE
- blockers: [] for advancing this implementation to final gates.
- releaseRecommendation: NO-GO
- executionReadiness: BLOCKED for production migration.
- reportPath: `/tmp/nevora-verify-33-final-branch-review.md`
- Required fallback copy: `.omo/evidence/clean-manager-final-branch-code-review.md`

Approval means the controller may record this review and proceed to the already-required exact-candidate build and hosted CI. It does not mean those gates passed, that independent exit findings are closed, or that production actions are authorized.

## Scope and custody

Reviewed `30058003e3e3a77932016fa1aff0b4dcbe69c1a5..2cb99bfc3bf74c33f05b7d4ca2b9470bcc3d8ab9`: 42 commits, 54 changed files, on `codex/verify-preview-33`. HEAD matched the supplied endpoint and tracked status was clean. The supplied 537,564-byte review package contains the exact Git U10 diff; its additional bytes are package metadata. `git diff --check` passed. Git ancestry confirms `2eb2a03a` is an ancestor of the requested `30058003` baseline.

Inputs: `docs/product/specs/codex-joint/CODEX-HANDOFF-CLEAN-MANAGER.md`, `CLEAN-MANAGER-VERIFICATION-PLAN.md`, final-review brief, supplied full diff, task reviews and referenced evidence. Notepad: `.superpowers/sdd/CLEAN-MANAGER-VERIFICATION-PLAN/progress.md`.

Read executable hunks in passes, recovering truncated sections separately. Inspected the shared manager scope/session guards, workspace guard, deadline writer and session-proof boundary for concrete authorization/concurrency risks. Checked the Phase E pass/failure lifecycle and prior request-note contract to distinguish current behavior from weakened legacy assertions. No application runtime, database query, broad test rerun, push, source/index/HEAD mutation or subagent was used. Only review artifacts were written.

## Findings by severity

### CRITICAL

None introduced by this reviewed range.

### HIGH

None introduced by this reviewed range requiring implementation changes before final gates. The pre-existing four P1 independent exit findings and migration execution blockers remain open; this verdict does not downgrade them.

### MEDIUM

**M1 — Retain the deferred unit-fake typing debt.** `src/lib/data/weekly-approved-absences.server.test.ts:7` accepts `object[]` and converts its SQL-text-dispatched fake with `as unknown as SqlExecutor`. This bypasses interface checking and can admit fixture shapes the real adapter cannot return. Replace it in a subsequent bounded test cleanup with explicit row types and a typed executor seam. This is a programming-perspective violation. It is nonblocking here: the unit tests assert projection/error outcomes, and the separately inspected five actual PostgreSQL cases cover live authorization, scoped Manager/Owner reads, inactive records, inclusive overlap and final session rejection. No production security failure follows from the cast.

**M2 — Retained enlarged native-select readability limitation.** `src/app/app/portal-premium.css:2138` fixes sizing/caret while the closed selected label still clips at 200% text scale. The retained `select-focused-r6/report.json` records 282.21px text against 132px available at 320px and 265.61px against 260px at 768px, in both engines. This is accurately disclosed, with native selection retained. Carry it to the UI follow-up/release decision; do not call this a zero-clipping or complete 200% readability pass. It does not block the bounded fix.

### LOW

**L1 — The absence DTO leaves its paired-time invariant implicit.** `src/lib/scheduling/manager-roster-presentation.ts:40` declares independently optional `startTime`/`endTime`; `src/components/manager-weekly-roster.tsx:49` asserts both non-null when formatting partial leave. The current server projection validates the pair and full-day union covers absent bounds, so no current failing flow is established. A discriminated full-day/partial-day DTO would express that invariant without assertions when this seam next changes. This is a limited programming-perspective departure, not a request for broad refactoring.

The native empty Rules datetime placeholder crop at 320px/200% is also retained in the server review; no stored-value loss was established. Existing exit findings are listed in `VERIFY-CLEAN-MANAGER-2026-10-20.md:25` onward, not self-closed here.

## Correctness and integration assessment

The deadline action accepts only the exact local Rules return path, defaults other inputs to Schedule, rejects invalid weeks before writes, preserves week/error input and uses the existing timezone conversion and authoritative writer. Existing workspace-version/session checks and week serialization remain. The Rules section reuses the established form behavior and does not change payroll/legal contracts.

The new approved-absence reader selects only approved overlapping rows and active scoped employees, deriving workspace and Manager grants on the server. Checked employee IDs and leave rows come from one observation; failed or unauthorized reads remain unavailable. Actor/grant/session locks and the final live session check preserve the existing authority pattern. Private reasons/request IDs do not enter the DTO. The roster distinguishes unavailable, full-day and partial-day leave, unions touching ranges, keeps existing shifts visible and suppresses misleading empty Add cells. This is approval of the new read, not certification of all legacy Schedule reads.

Browser updates retain actual timecard approvals/finalization/reopen history, private clearing, correction command identity, exactly-once persistence and native keyboard checks. The old blanket request-note exclusion is replaced by the already-approved scoped detail contract documented in `codex-joint/README.md:89`; tests still exclude compact/unrelated disclosure and clear details on offline/error/authority loss. Actual publication revisions replace direct fixture status flipping. Reports retain semantic cells, known hours, full names, overflow scrolling, native forward/reverse traversal, no-trap and axe checks. The real tabindex change fixes a reproduced defect.

Contrast measurement now includes same-layer paint and conservative alpha bounds with explicit unsupported cases. Phase E keeps all 70 cells, 15-second assertions, ownership/source guards and cleanup. Only the all-browser macro budget rises to 45 minutes inside the unchanged 50-minute job; single-suite and SQL budgets remain 30 and 8 minutes. Progress excludes arbitrary actor/URL payloads, and a cell passes only after context close and custody checks.

## Skill-perspective check

Loaded `remove-ai-slops/SKILL.md` and `programming/SKILL.md` from `/Users/josek0514/.codex/plugins/cache/sisyphuslabs/omo/5.1.30/skills/`, plus the TypeScript reference. Consulted Superpowers requesting-code-review and repository executive/CTO/CISO/governance instructions. Their implementation/refactoring workflows do not override this read-only assignment.

The anti-slop/overfit pass found no deletion-only, requested-removal-only, prompt-prose or tautological added tests. DOM accessibility attributes are machine-consumed contracts with native-browser corroboration. Budget values specify an authorized operational policy rather than incidental constants; progress tests exercise privacy-safe projection and rejection. Date/time validation occurs at the storage-to-client boundary, and browser paint/geometry extraction serves required verification rather than production complexity. No needless application abstraction or parsing was found. Programming departures M1/L1 remain nonblocking; existing large modules and repository tooling conventions do not justify expanding this task into a rewrite.

## Evidence independently inspected

Evidence root: `/Users/josek0514/.codex/visualizations/2026/10/20/01a15962-cdee-7dd0-8a92-023551b076fb`.

- Recomputed all six `final-gates/local-summary.json` artifact hashes/byte sizes and inspected logs/receipts. Types and full `eslint .` recorded exit 0; default units recorded 7,394 passed/801 skipped, 449 files passed/27 skipped at application checkpoint `293ffcf6`. Confirmed all changes from that checkpoint to reviewed HEAD are documentation only.
- Recomputed all 13 `server-contracts/verification.json` current source hashes. Inspected `absences-postgres-final.log`: five tests passed, owned cluster stopped. Read the actual test bodies rather than inferring SQL authority from the fake.
- Inspected actual follow-up reports: Reports 28 checks/zero errors, with all four native regions reached in each of 14 engine/width traversals; Clocker 90/zero errors; select 26/zero errors plus the four explicit clipping records; D2 r6 224 checks plus a native-focus failure; complete affected UI helper 130/zero errors at its distinct checkpoint. These are overlapping historical checkpoints, not one full D2 pass.
- Parsed durable `manager-owner-exit/matrix.json`: 6,160 cells and 308 navigation records. Consulted the independent evidence/addendum review supporting four P1/three P2 findings and actual hit tests. Did not repeat all manual cases or the previously independently verified 77/1,190 artifact inventories.
- Recomputed all 36 migration-entry hashes/byte sizes, loader hash and exact loader order, both F10 excluded-file hashes and ordered payload digest. Manifest hash matches `ccdc7c7150bdb6732d3d8944ce5a762d8680f67d743fc58c60d5e3e234e383d5`. Reviewed initial migration findings, corrected runbook, re-review and fix-round evidence.
- `final-gates/verification.json` currently says pending build/hosted CI and NO-GO. The root ledger consistently freezes before those gates. No misleading final-success claim was found.

The migration packet correctly distinguishes 34 potential upgrades from an established pending set, retains 0019/0033 wrappers, per-file atomicity, persistent direct-session lock, external journal/UNKNOWN recovery, reconciliation, restricted PG17 rehearsal and supported restore/isolation/retention gates. It excludes F10 and absent 0034 without waiving their controls. These future gates make the plan reviewable; unauthorized backup/database operations are not prerequisites to approving the document.

## Handoff

Controller owns the source-bound production build and exact-final-SHA hosted CI, including whole D2 and all 70 E cells. A review-record-only documentation descendant needs custody verification that executable/migration bytes are unchanged; this review does not demand an endless self-review/CI documentation loop.

Release remains NO-GO pending independent UI remediation/re-audit, physical-device/assistive-technology acceptance, performance decision and migration/recovery/production authorization gates. The historical Schedule p95 is not a post-change hosted benchmark or Jose's acceptance. No main merge, deployment, database write, backup, real notification or payroll activation is authorized by this review.

`omo-agent-toolkit ulw-loop status --json` returned `ULW_LOOP_PLAN_MISSING`; the required fallback report is supplied alongside the requested external handoff artifact.
