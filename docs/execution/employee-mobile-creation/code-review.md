# Employee mobile creation — independent code review

Review date: 2026-10-27. Reviewer: creation_final_code.

- Base: `f3a72860d9737fa7e4d9b3b86415bb0a99d69d91`
- Candidate: `8125d881ac9f3924852a2855b99ee647893492ab`
- Branch: `codex/employee-mobile-creation-20261027`
- Contract/notepad: `docs/execution/employee-mobile-creation/employee-mobile-creation.md`
- Reviewed all 26 changed files, including production adapters, read/model/view/operation, existing helper and RouteSheet changes, unit/SQL/browser tests and runner configuration.
- No ULW loop plan exists (status returned ULW_LOOP_PLAN_MISSING); this is the required fallback report.

## Final decision — 2026-10-27

`codeQualityStatus: CLEAR`
`recommendation: APPROVE`
`blockers: []`

Final reviewed candidate: `351e33a1a7ecb04dfb6de01a9674953ea7eff903`. H1 and M1 independently closed below. This is code-review approval; the separately owned final QA full-suite gate remains required.

## Initial decision (preserved history)

`codeQualityStatus: BLOCK`
`recommendation: REQUEST_CHANGES`

The implementation review has not identified a demonstrated authorization or command correctness regression. Acceptance remains blocked by the current candidate's failed browser integration, not by an assumed root cause.

## CRITICAL

None identified.

## HIGH

**H1 — Current candidate has a failing required creation journey.** `src/test/integration/employee-mobile-creation.integration.ts:51` begins the intercepted-task keyboard/return-focus checks. `.omo/evidence/employee-mobile-creation/browser-final.log` records the creation integration failed in 28.55 seconds. The current external `final/creation/results.json` contains only two Chromium preflight checks and intercepted-task captures, with zero contrast samples; it cannot substantiate the expanded all-form/all-engine acceptance matrix. The precise failing assertion is not yet emitted in the still-running combined suite log. Do not treat this as proof of a particular focus implementation bug, or replace it with the older run2 matrix. Diagnose the actual failure, preserve the red artifact, fix the product or demonstrably incorrect test as appropriate, and rerun the current acceptance matrix without weakening the intended keyboard/focus behavior. Reviewer must inspect closure independently.

Evidence root: `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-creation/final/creation/` (`results.json`, `chromium-failure.html`, `chromium-failure.png`).

## MEDIUM

None identified as a demonstrated additional correctness or maintenance failure.

## LOW

The browser integration is one sequential scenario spanning all engines and workflows. Its early failure prevents later form/engine coverage, as the current artifact illustrates. Named recorded checks make diagnosis possible; continue reporting actual completed checks rather than interpreting one top-level test as complete coverage. This is informational and does not require unrelated test architecture changes in this bounded pass.

## Code and scope assessment

- The new GET uses actual session/binding and existing no-store transport. The reader admits Employee/Lead only, restricts the source to the authenticated employee and allowed locations, checks current exact location scope throughout guarded work and final lease, and exposes a minimal DTO.
- Source and candidate displayed facts must match reviewed terms. New fingerprints invalidate retained consent. Existing command owners remain authoritative; no alternate policy engine or schema/dependency change was introduced.
- The immutable operation delegates capture/reconciliation to ShiftChangeFormState. Pending, uncertain and known-success states lock new creation. Payload building preserves deliberately reviewed source and target terms. Current-route/live-read checks fence stale callbacks.
- Draft fields remain mounted-memory state; pause/denial/binding/module-off prevents rendered private fields. New source/mode/authority keys reset lifetime. Current source changes require explicit review; target changes require reselection.
- Desktop children remain in their original server page trees. Helper executor parameters default to prior behavior. Shared shift-slot export is a reuse-only change. RouteSheet restoration is opt-in, but its required keyboard/focus acceptance must finish passing before approval.

## Skill-perspective check

Ran both `remove-ai-slops` and `programming` review perspectives after reading their local SKILL.md and the TypeScript reference; also consulted repository executive operating model, CTO, CISO, technical assurance and governance instructions.

No deletion-only tests, prompt/prose-only tests, self-derived expectations or unnecessary production data extraction were found. Rendered UI text assertions here distinguish privacy, consent, validation and unavailable-versus-empty user states; these are not model prompt tests. Real SQL tests inject the relevant failure/race at the executor boundary and assert returned authority/data behavior. The HTTP DTO parser is a genuine untrusted boundary, not gratuitous internal normalization. The observable operation wrapper provides a React subscription seam and reuses the existing immutable owner. Several compact assertions/non-null assertions follow surrounding code; no untyped `any` escape hatch or demonstrated unsafe cast was found. No material violation of either perspective identified; the sequential E2E limitation is recorded above.

## Verification actually inspected/run

- Reviewer independently ran `npx vitest run src/lib/employee-creation.test.ts src/lib/data/employee-creation.server.test.ts src/components/employee-mobile/creation-operation.test.ts src/components/employee-mobile/creation-view.test.tsx src/lib/employee-view-route.test.ts`: **5 files, 21 tests passed**, exit 0. Artifact `.omo/evidence/employee-mobile-creation-code-review/unit.log`.
- Inspected actual `.omo/evidence/employee-mobile-creation/privacy.log`: **3 real PostgreSQL tests passed**, owned cluster stopped. This is executor-run evidence, not a reviewer rerun.
- Inspected current combined browser log: creation failed; responses and pickup subsequently passed. Remaining combined completion was still pending at report time.
- Type/lint output files are empty; empty files alone are not treated as independently verified success. No production/build/deployment claim is made.

## Required closure

Root owns diagnosis/remediation and fresh frozen-candidate evidence for H1. Reviewer owns closure. No product/test/config edits were made by this reviewer. This approval does not authorize assembly, Phase 3, merge, push or production deployment.

## Bounded recheck — candidate 2db6f316a30ca308aad79b71bc46fa59e7329fbd (pending acceptance)

Reviewed the complete three-file delta from 8125d881. Independently inspected `outputs/employee-mobile-creation/focus-diagnostic/results.json`: Chromium Tab steps 0–4 remain inside the dialog with document.hasFocus() true; step 5 records BODY, hasFocus false, and private state paused. This supports a browser-chrome departure rather than focused in-document background escape. The corrected test preserves strict containment while the document owns focus, verifies released shift facts on departure, a fresh private GET after real pointer return and a subsequent contained native Tab, plus unchanged Escape and Back origin restoration. No custom focus trap or authority behavior changed.

The accepted owned-app manifest names candidate 2db6f316; independently compared all 1,943 file hashes to the current workspace: zero differences. Artifact: `.omo/evidence/employee-mobile-creation-code-review/accepted-custody.json`.

**M1 (MEDIUM, nonblocking):** `src/components/employee-mobile/creation-view.test.tsx:31` adds a test that only asserts the new paused sentence. This pins editorial wording rather than a behavioral distinction; actual pause/privacy/return behavior is already covered. Under the required remove-ai-slops/programming perspectives, remove this copy-only test and keep the behavioral coverage. Also rename the preceding duplicate-empty test to its actual single concern. This is not a security or functional blocker. The previous whole-change skill assessment predates this added test.

H1 remains open until the currently running accepted browser matrix completes successfully; no green claim is made from diagnosis or a corrected assertion alone.

## Independent closure — 351e33a1a7ecb04dfb6de01a9674953ea7eff903

**H1 CLOSED.** Inspected `.omo/evidence/employee-mobile-creation/browser-accepted.log`: the affected creation integration passed in 115.96 seconds and its owned cluster stopped. Inspected the actual accepted `results.json`: 40 named checks across Chromium, WebKit and Firefox, 54 measured primary contrast samples (minimum 6.089:1), and 192 captures. Native focus traces show Chromium/WebKit yielding to browser chrome with document.hasFocus false/private paused, returning with focus contained after a fresh private read; Firefox remains contained for all eight native steps. Escape and explicit My schedule dismissal complete their origin-focus checks. All three forms complete Light/Dark 320/390/430 and 200% text checks, immutable submission/reconciliation, exact own details and authority-loss handling. Three deliberately induced console errors and nine WebKit development preload warnings remain recorded; zero page errors/unmatched console errors. Diagnosis and corrected oracle were inspected, not merely executor assurances. The original failed run is retained.

**M1 CLOSED.** Inspected the entire 2db6f316→351e33a1 delta: only the green copy-only pause test is removed and the duplicate-empty test title is corrected. Actual privacy/pause rendering and native browser return checks remain. This removes the identified useless test, not a failing behavioral assertion. No remaining material remove-ai-slops/programming finding.

Reviewer independently reran the five affected unit/route files on 351e33a1: **22/22 tests passed, five files, exit 0**. Artifact: `.omo/evidence/employee-mobile-creation-code-review/unit-final.log`.

Source custody: accepted browser manifest identifies `2db6f316a30ca308aad79b71bc46fa59e7329fbd`. Compared all 1,943 manifest entries to 351e33a1: the sole differing file is `src/components/employee-mobile/creation-view.test.tsx`, exactly the reviewed cleanup. All application/browser-suite/config inputs are unchanged. Artifact: `.omo/evidence/employee-mobile-creation-code-review/final-custody.json`.

No open CRITICAL, HIGH or MEDIUM code-review findings remain. Existing sequential-browser-test LOW observation is informational. Root/independent QA still own the final serial combined regression run and UI/QA acceptance on the final candidate; this report does not claim that not-yet-completed full48 rerun or a production deployment.
