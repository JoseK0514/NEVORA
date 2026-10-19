# Phase 3 coordinator handoff — rolling integration, October 19, 2026

Jose assigned Phase 3/coordinator changes to Claude. This integration task does not modify coordinator application files.

## Existing coordinator findings

The canonical pre-correction source crosswalk on `codex/inspections` is `premium-phase-3/complete-exit-preparation/historical-all-135-crosswalk-cd764f6.md` and its JSON counterpart. It retains all 135 historical IDs, and explicitly does not grant dynamic closure. The remaining proposals/measurement obligations include TC-P3-09/24/25/28/30/34, AL-P3-12/13/28/31, P3-ST-25/26 and P3-WR-12/14. Please reconcile these against the coordinator's new changes and final exit evidence; an existing proposal is not a new independently verified finding.

Wave A's published `ba313d1` handoff assigns the shared `src/components/select-field.tsx` portion of IS-WA-12 to the coordinator. Wave A's Optional-marker changes are integrated; the shared SelectField label/hint naming remainder is not adopted here.

## CI failures requiring coordinator triage

Original PR workflow: `https://github.com/JoseK0514/NEVORA/actions/runs/39337044895`. Its tested checkout is the PR merge commit `8412db5edff186e7426534026d370129e0b4c60f`, not a separately tested head checkout. Preserve that identity when reproducing against the updated candidate.

1. `phase-d-attendance-ui`, job `118349034266`: five real protected-read checks pass, then `scripts/phase-d-attendance-ui-qa.mjs:299` times out waiting for exact visible text `Loading attendance review` during the held session reauthorization check. The assertion also requires private attendance data to clear. Determine whether the loading UI changed or a real privacy/lifecycle condition failed. Preserve the protected-data assertion; do not simply remove the loading check.
2. `phase-e-ui`, job `118349034064`: retained artifact `phase-e-browser-8412db5edff186e7426534026d370129e0b4c60f` identifies a loading-stage assertion failure at `scripts/phase-e-home-browser-scenarios.mjs:37:155`, Chromium 320, `actual:false`, `expected:true`. Correction after checking the exact source column and failure image: column155 is the visible `My Time` link assertion in `Own recorded time`; the earlier `Loading Home…` assertion passed. CSS employee-home-reviewed.module.css327 hides the recordedSlot on first loading. Reproduce this visibility/stability contract and retain private-content suppression; do not treat it as only a loading-label mismatch. The remaining assertions have not received passing credit.

These are observed CI failures, not conclusions that the product or the test is defective. Exact logs and the original artifact are retained under the integration worktree's ignored `.omo/evidence/rolling-integration-20261019/` directory. No assertions, timeouts, CI configuration or coordinator source have been changed by this task.

## Later hosted CI result — exact PR merge36e9ef3

[Workflow39338160480 triage](../preview-integration-33/ci-39338160480/README.md) preserves the later9d6530bc-head run at its actual PR merge36e9ef38. The attendance loading-label failure and Home recorded-time fallback visibility failure repeat. New blockers are59 migration-unit failures caused by missing pinned historical Git objects in shallow checkout, and one real Home SQL source-cap assertion mismatch (39/40pass). An owned shallow-clone reproduction and an unapplied one-line checkout proposal are included. Keep source/authority/completeness assertions intact; no hosted pass is claimed from local evidence.

## Acceptance boundary

The original 33-fix candidate's local gates passed in the existing published report; new rolling merge commits require their own evidence. Targeted browser successes are not full five-area exit verdicts. PR #13 stays draft/open, and neither main merge nor deployment is authorized.
