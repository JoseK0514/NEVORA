# G10 closure and Cloud continuation preflight

**G10 is complete locally.** The filename is retained for continuity with the earlier in-progress handoff draft. Final verification finished before the handoff freeze; there is no unfinished G10 implementation or known material G10 finding.

## Exact closed boundary

- Final runtime: `f6e3f5b3b332a61f12a2607c9a9728d7086a77747472f5217badc786ad543a3f`.
- 20 suites in Chromium, WebKit and Firefox: 60 completed suites, **2,601 browser executions**, zero failed suites/cases, page errors or external requests in the required reports. Each engine additionally measures 28 G10 responsive renders; the focused G10 runner has 48 cases per engine.
- 12 model runners: **424 model cases**; **109 authored-JS syntax checks**; zero failures. Build manifest binds **126 inputs**.
- Limited documentation comparison reconstructs all 126 sources, compares 13 incumbent files and resolves all extension CSS variables. It is a documentation adapter, not a second code/UI review.
- Eight raw native full-page JPEGs at the unchanged 589px actual in-app host width; console warnings/errors empty. Physical devices/assistive technology are not certified.
- Read-only mobile handoff refreshed through separately reported mobile batch 3.5. No mobile edit or approval transfer.
- `finalize-g10.py` exited 0. `audit-g10.py` exited 0 with **PASS**. Published coverage: **72 interactive / 3 partial / 21 pending / 4 role exclusions**. G11 remains planned/unstarted.
- All three local matrix processes exited 0. Nothing is paused or running for Cloud to resume.

## Evidence to read

- `outputs/owner-desktop/group-10-payroll-runs-review.md` and `group-10-payroll-runs-verification.json`.
- `work/owner-desktop/g10-brief.md`, the output G10 plan and `work/owner-desktop/evidence/g10/progress.md`.
- In that evidence folder: three complete `*-matrix.json`, `models.json`, `syntax.json`, `documentation-check.md`, `native-captures.json`, `mobile-handoff.json`, `final-audit.log` and `review-disposition.json`.
- Original reviewer identity/report/probes/candidate remain immutable under `reviewer/` and `original-review-identity.json`. R1/R2/N1 plus the explicitly authorized minor N2 and executor S1/S2 have reproduced correction evidence. No independent post-fix certification is implied.
- Read the final review’s complete ordered rulings/costs and deferred-minor section. Inherited G08 singular/plural copy remains; no new G10 minor was intentionally deferred.

## What Cloud does first

1. Verify `STATUS.json`, `verification-cutoff.json`, archive checksum and file manifest. Extract the full bundle into its own directory; do not overwrite the actual application or another chat’s files.
2. Build the prototype and confirm the exact HTML SHA. A path-only environment adaptation must not change runtime bytes or weaken assertions. Core ZIP alone omits historical images: restore the full evidence before attempting the original complete-deliverable-manifest audit.
3. Confirm a clean actual-app reference at pinned commit `46e202786863279302026ee03a0e225c359fa55c` is available before any source-gated finalizer/auditor. `NEVORA_REFERENCE_ROOT` is a path-only override. If unavailable, state that Cloud re-audit is unverified; the included local PASS remains historical evidence, not a fabricated new Cloud PASS.
4. No full rerun is needed merely to read this unchanged handoff. For a new runtime change, run the affected regressions and the required whole exact-build gate before claiming a new milestone. Read existing commands before running them; old milestone packagers must not overwrite G10.
5. Next feature work is **G11 Statements and payment-job visibility**, P-17/P-18/F-04. Read the exact contracts and dependencies in `REMAINING-ROADMAP.md` and `roadmap.json`; preserve G10’s approved-vs-document/publication/job/payment boundaries. Start when Jose authorizes that next bounded group, not merely because the handoff was opened.
6. Continue G12–G16 sequentially and preserve Q-01–Q-12. Actual Next/React integration, server authorization/durability, live calculator/tax/provider/bank/payment, physical-device/screen-reader and production release remain separate authorized work.

## Matrix membership retained for future regression

Payroll runs; Payroll settings; exports; timecards; operating rules/devices; Company; attendance; warning surfaces; Requests; scheduling; base workflows/catalog; Team; foundation; all warnings; feedback; dialog focus; request-notice spacing; published/shift form spacing; calendar; select coverage. All 20 must remain represented per engine. `g10-verify.cjs` names the native JSON locations; the finalizer copies them to G10 publication without overwriting historical G09 output reports.
