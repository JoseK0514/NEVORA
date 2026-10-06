# Spec compliance: ❌ Issues found

T02 implements the requested shared engine, complete retained ledger, mapping extraction and approved fairness comparator, but applicability handling has one Important defect: unrelated historical elapsed-time facts are required even when every operational rule is explicitly reviewed NOT_APPLICABLE (`src/lib/scheduling/operational-rules.ts:28–38`).

# Code quality: Needs fixes

One Important finding and one Minor finding remain. No Critical findings. Review is scoped to the frozen T02 candidate against the external task1-fix1 checkpoint; it is not final Phase 5 acceptance.

## Strengths

- One operational implementation handles rest, per-shift/day ceilings, breaks and overtime, and the existing validator calls it once (`src/lib/scheduling/operational-rules.ts:7`, `src/lib/scheduling/validate-shift.ts:368`). Typed hard/unverifiable/warning results preserve manager restrictions; final assignment decisions prioritize BLOCKED, then UNVERIFIED, then review (`src/lib/scheduling/shift-change-evaluation.ts:65–83`). The explicit manager-approval test covers unknown mandatory rest (`src/lib/scheduling/shift-change-evaluation.test.ts:48`).
- Both outgoing swap assignments are removed before adding their replacements; incoming position, Lead and break terms are retained (`src/lib/scheduling/shift-change-evaluation.ts:34–44`). The tests exercise actual EMPLOYEE_PENDING swaps and preceding/following rest (`src/lib/scheduling/shift-change-evaluation.test.ts:7`, `src/lib/scheduling/shift-change-evaluation.test.ts:20`, `src/lib/scheduling/operational-rules.test.ts:6`).
- Complete nonarchived factual mapping replaces the fixed date slice, with distant cross-location reader evidence (`src/lib/data/scheduling-source-facts.ts:118`, `src/lib/data/schedules.ts:181`, `src/test/integration/shift-change-evaluation.integration.ts:10`). Generation and manual adapters consume configured profiles (`src/lib/scheduling/generation/planner.ts:260`, `src/lib/data/schedules.ts:232`). No numeric policy defaults were added by these changes; the preexisting weekly cap remains visible as an existing contract.
- Candidate ordering calls the unchanged Phase 4 comparator and requires confirmation in every touched week (`src/lib/scheduling/shift-change-evaluation.ts:133–134`, `src/lib/scheduling/coverage-ranking.ts:43–47`). Suggestions are pure and retain MANAGER_REVIEW results; they do not commit assignments or establish consent (`src/lib/scheduling/shift-change-evaluation.test.ts:31`, `src/lib/scheduling/shift-change-evaluation.test.ts:40`).
- Material terms use a fixed field projection and episode-sensitive fingerprint; callout release requires current matching terms and episode (`src/lib/shift-changes/terms.ts:6–19`). Missing production scheduled-break facts remain UNKNOWN (`src/lib/shift-changes/terms.ts:12`); no break editor, punch inference or scheduled-hours deduction was added.
- Mapping extraction preserves management authorization (`src/lib/data/schedule-generation-snapshot.ts:46–47`). A focused check of the entry points confirms that the writer retains TARGET_NOT_DRAFT rejection and the read-only review entry retains its existing unavailable-target behavior (`src/lib/data/schedule-generation-snapshot.ts:81–91`).

## Critical

None found in the reviewed task diff.

## Important

### I1 — Resolve only operational facts needed by applicable rules

**Location:** `src/lib/scheduling/operational-rules.ts:28–38` and `:102–104`; exposed through `src/lib/scheduling/validate-shift.ts:367–370`.

The engine resolves the candidate and every retained shift to strict elapsed instants before checking whether any rule needs elapsed time—or whether any operational rule applies at all. Since T02 now supplies the complete historical/future ledger, a distant legacy DST boundary can make every new assignment for that employee UNVERIFIED even when all five settings have been reviewed NOT_APPLICABLE. A wall-clock per-shift ceiling also unnecessarily depends on historical elapsed boundaries. This makes reviewed non-applicability behave like missing mandatory evidence and can disable manual saving and generation for unrelated current work.

**Focused reproduction, source unchanged:** ran the existing local `tsx` binary with `evaluateOperationalRules` and `fictionalProfile()`. Candidate: employee e2, America/New_York, 2026-10-05 08:00–16:00. With an empty ledger, the result has no issues. Adding only an unrelated retained shift on 2025-11-02 01:30–04:00 produces `RULE_UNVERIFIABLE: Required scheduling rule cannot be verified (dated scheduling facts)`. All five profile settings are reviewed NOT_APPLICABLE in both inputs. The probe exited 0; no existing suite was rerun.

**Fix:** resolve time coordinates lazily according to the applicable rule and time basis. Reviewed NOT_APPLICABLE rules must not demand extra evidence. Preserve strict rejection for relevant ambiguous boundaries; do not guess offsets. For elapsed rest/day/week checks, retain enough adjacent/window facts to establish completeness while avoiding a global dependency on unrelated historical rows. Add a focused regression proving that all-NOT_APPLICABLE and a wall-clock per-shift-only profile do not fail solely because of distant ambiguous history, while relevant elapsed uncertainty remains UNVERIFIED.

## Minor

### M1 — Expand dense tests and composite expressions for maintainable review

**Location:** `src/lib/scheduling/shift-change-evaluation.test.ts:8–21`, `src/lib/scheduling/shift-change-evaluation.ts:14`, `:44`, `:64`, `:133–134`, and `src/lib/scheduling/coverage-ranking.ts:43–47`.

Many new scenario tests combine setup, multiple conditionals and assertions on single very long lines; the candidate adapter and final-ledger assembly do the same. The behaviors are substantive, but this formatting obscures exactly which facts a test changes and makes future contract edits harder to review. Expand these into normal multiline setup/action/assertion blocks and named local values. This is polish, not an additional gate blocker.

## Verification and scope

- Reviewed the complete 1,254-line provided diff in bounded chunks. Initial combined output was truncated, so omitted portions were recovered from the diff. No source, index, HEAD or branch mutations; only this requested report was written. Initial checkout status was read before the reviewer template; no subsequent Git commands were run.
- Used the supplied Superpowers task-reviewer template and the personal preservation skill as the review frame. Package scripts were inspected; no build, migration, provider or live-app actions were run.
- Named focused unchanged-code checks: (1) comparator context/deduplication risk: `src/lib/scheduling/generation/fairness.ts:11–63`; comparator is reused, not duplicated. (2) shared-validator/planner ledger propagation risk: the enclosing validator filtering and planner evaluation functions were read because their diff hunks cut the function; `validate-shift.ts:231–250` filters employee, released and excluded rows, and `generation/planner.ts:223–230` supplies the complete employee ledger. (3) profile normalization risk: `src/lib/shift-changes/policy.ts:18–37` preserves reviewed NOT_APPLICABLE and zero and maps invalid settings to UNKNOWN. (4) affected-health comparison risk: the existing health block segmentation and released-row handling in `src/lib/scheduling/schedule-health.ts:103–322` were inspected. (5) extraction authorization risk: focused generation entry-point check described above. No unrelated code crawl.
- Recorded evidence was inspected, not regenerated. `task2/red-captured-exit.log:12–18,74` records four assertion failures and process exit 1; `task2/green-captured-exit.log:5–11` records 49 tests and process exit 0. The report correctly discloses the original RED wrapper exit-capture limitation and labels the later replay.
- `task2/affected.log:5–8`: 27 files / 330 tests passed. `task2/final-focused.log:5–8`: 8 files / 78 tests passed. `task2/sql-readers-final.log:9–12`: one real disposable-SQL reader test passed. The typecheck and lint final logs contain clean command output. No warnings or stderr noise found in these inspected final logs. Most logs do not embed numeric exit markers, so the corresponding numeric exits are implementer-recorded, while successful summaries/clean output are directly observed.
- `task2/full-unit.log:14–38` confirms the one failed old bounded-query assertion and 117 files / 1,257 tests passing. The change at `src/lib/data/scheduling-inputs.test.ts:116–118` correctly updates the argument contract to the complete employee ledger and retains/adds dated cross-location assertions; it does not suppress a failure or weaken the underlying requirement. `task2/source-reader-regression.log:5–6` shows 19/19 passing, and the final focused run includes that file. A final all-green full-suite run is **not** claimed; T06 owns it.
- No new tests were run except the specific unchanged-code probe for I1. Its exact scenario and output are recorded above. Earlier recorded generator mutation evidence, broader acceptance claims and performance timing remain bounded implementer evidence, not production guarantees.

## ⚠️ Cannot verify from this T02 diff

- T03 must establish coherent source/facts/profile/session construction, session revocation checks after locks, lifecycle/deadline legality, same-owning-week trade restrictions, consent persistence, atomic writes, first-valid-volunteer semantics, policy races and operation retry reconciliation. The evaluator is not that authority boundary (`src/lib/scheduling/shift-change-evaluation.ts:85–119`; handoff report interfaces 2–6).
- T03 must complete the other callout-release readers/writers and canonical consent integration. The old manual SQL approved-callout predicate remains at `src/lib/data/schedules.ts:183`; the implementer openly identifies this as downstream work, so this gate does not certify release parity beyond the new mapper.
- T05 must project safe role-specific client data. Candidate results still intentionally contain private management evaluation/projection data (`src/lib/scheduling/shift-change-evaluation.ts:121–135`). No actual employee serialization, client privacy journey or authenticated app is present here to certify.
- T05/T06 own actual-app integration, UI/browser/mobile/keyboard states and final full-suite/release evidence. Required scheduled breaks remain an activation limitation until authoritative facts exist. None of the 98 whole acceptance cases is certified merely by this review.
- The task diff contains no migration, provider, UI, deployment or Phase 6 changes. It cannot independently prove every external operational action or all prior-checkpoint migration hashes; controller checkpoint evidence remains the source for those facts.

## Assessment

**Spec compliance:** Needs fixes for I1. **Task quality:** Needs fixes for I1; M1 is optional cleanup. The shared structure and recorded focused verification are strong, but the eager complete-ledger elapsed conversion incorrectly introduces mandatory facts for explicitly inapplicable rules.
