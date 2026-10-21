# Independent Home held-response review amendment

- specStatus: PASS (bounded Home harness/CI scope)
- codeQualityStatus: WATCH
- recommendation: APPROVE
- blockers: [] for this scoped implementation; release remains NO-GO
- reportPath: .omo/evidence/home-held-response-ci-code-review.md
- Requested handoff copy: /tmp/nevora-verify-33-e-home-review.md

## Scope and method

Reviewed immutable `351b3a9dd11639574131f1bcfd31de4a4bcee99b..b258f4a163d1a2ca45e72b49b8fe0530659e34d0` in `/Users/josek0514/.codex/worktrees/verify-preview-33/Fuel Scheduler`. Exactly four changed files: `.github/workflows/ci.yml`, `scripts/phase-e-home-browser-scenarios.mjs`, `scripts/phase-e-home-held-response.check.mjs`, and `docs/product/specs/codex-joint/2026-10-20-home-held-response-ci.md`. No product Home/controller/API code changed. Unrelated Navigation work and moving HEAD were excluded.

Inputs inspected: task-2-e-home-ci-brief.md, task-2-e-home-ci-review-brief.md, task-2-e-home-ci-report.md under `.superpowers/sdd/CLEAN-MANAGER-VERIFICATION-PLAN/`; durable report; full immutable diff; package scripts; relevant source-custody helpers; CI job and rollup; external artifacts below. The handoff report is the supplied notepad-equivalent; no separate notepad was supplied.

Read AGENTS.md, executive operating model, CTO skill, `remove-ai-slops`, `programming`, and Superpowers verification-before-completion. Skill-perspective check ran. No application/browser/DB runtimes, tests, builds, network service operations, implementation edits, commits, or subagents were run by this reviewer. Test results below are independently inspected existing artifacts, not new executions. Fresh read-only checks rehashed evidence and immutable source objects. `omo-agent-toolkit ulw-loop status --json` returned ULW_LOOP_PLAN_MISSING; the required fallback report location is used.

## Findings by severity

### CRITICAL
None.

### HIGH
None.

### MEDIUM
M1 — scenario module now exceeds the skill size threshold. `scripts/phase-e-home-browser-scenarios.mjs:201` adds request recording, DOM observation, lifecycle recording and handler cleanup inside the existing long `runScenario`. Immutable source measurement excluding blank and `//` comment lines increased from 200 to 264. Both loaded skill perspectives flag modules over 250 pure LOC; the densely packed lifecycle blocks also make ordering/cleanup review harder. This is a bounded maintainability concern, not demonstrated acceptance failure. Prefer a focused extraction of the held-response observation/scenario responsibility at the next change, preserving actual browser assertions and clean evidence. No broad refactor or product change is required for this scoped approval. No HIGH escalation is justified by the inspected evidence.

### LOW
None separately raised.

## Specification and behavioral assessment

H06 now waits on the actual fresh fictional location in visible ready/partial, not-busy DOM, and requires a completed newer Home request before releasing the old real response. It verifies the held payload contains old data, settles the handler, and rejects any recorded post-fresh observation restoring old rows. The post-release assertion does not wait for recovery to conceal an overwrite.

H07 waits for a paused commit while the old MyTime response remains held; it asserts zero Clocked-in rows and exactly one started protected request (the existing held request), then checks paused/zero rows after fulfillment before re-entry. This preserves the invalidated-read contract while acknowledging React commit timing. All 14 receipts report ready/Clocked-in immediately after dispatch and paused clearing observed 5–12 ms later. This is neither synchronous DOM clearing nor an approved privacy SLO. The screenshot from the earlier WebKit430 failed immediate assertion already shows paused/Updates paused. No product privacy correction is established or claimed here.

The controlled check imports the actual H06 helper and exercises old-ready, loading, then fresh-ready states in Chromium and WebKit. The stored RED resolves against the old busy DOM; GREEN remains pending until fresh/not-busy. This is a meaningful harness scheduling regression, not a product integration substitute. No deletion-only tests, removal-pinning tests, prompt/prose pins, tautological expected values, or tests merely mirroring implementation constants were found. Fictional location strings serve as observable old/new data identities. There are no new production parsers, normalizers, abstractions, or untyped TypeScript escape hatches. The only identified skill-perspective violation is M1.

The route error boundary projects operation/stage/boolean transport facts rather than raw Playwright error messages or headers. Fetch/parse failures populate runtimeErrors and fail the scenario; there is no retry or connection workaround. Fulfillment cancellation is limited to a failed request or an explicit navigation release after the document URL has changed. H08/H11 await handlers and assert no recorded failure. H06/H07 release, settle, unroute and remove observers/listeners in finally blocks. Expected cancellation handling does not turn initial fetch failures into passing cells.

CI registers the exact helper check unconditionally after pinned Playwright/browser installation, inheriting PHASE_E_EXPECTED_SHA and using an explicit external evidence directory. Existing captureSource/externalEvidence/assertSourceUnchanged enforce exact clean source, external canonical paths and before/after hashes. The required 70-cell command, 15-second assertions, 45-minute macro budget, 50-minute job and required aggregate dependencies are unchanged. Evidence upload includes helper JSON/PNGs and held-response JSON.

## Evidence independently inspected

Evidence root E: `/Users/josek0514/.codex/visualizations/2026/10/20/01a15962-cdee-7dd0-8a92-023551b076fb/ci-e-home`.

- `E/final-custody.json`: all 30 referenced files are nonempty and independently match recorded byte counts and SHA-256 values.
- `E/verified-home14/source-manifest.json`: all 2,927 captured hashes independently match Git objects at a300bfdb9a0274cf6810415a0c9f063594af068c. `E/readiness-ci/source-manifest.json`: all 2,928 hashes match f276c41be069c82bea1570a5fa223ef15dbb8a54. Immutable a300..b258 diff changes only CI, helper-check script and documentation, preserving actual Home helper/application bytes.
- `E/verified-home14/browser-report.json` and `owned-browser-report.json`: 14 passed executions, no errors, exact checkpoint, Playwright 1.62.1. All 28 H06/H07 per-cell raw JSON receipts were checked against summary claims: fresh observations remain fresh/no-old, newer finished requests exist, all held outcomes fulfilled, one protected request, paused zero count, and zero restored rows.
- The mirror source manifest matches original captured hashes and explicitly records only database adapter/type-reference substitutions. Next and PostgreSQL ownership receipts are closed; Next records sourceVerified/mirrorVerified. `closure-check.json` records 54 absent owned processes and refused ports 49401/49362. These are historical closure observations, not new process liveness probes.
- `readiness-red/readiness-report.json`, `readiness-ci/readiness-report.json`, readiness custody and CI gate receipt substantiate RED both engines and exact-source GREEN both engines. CI receipt has exit 0 and closed browsers/source unchanged.
- `gates.json`, `ci-registration-gates.json` and underlying logs substantiate types/lint exit 0, release-engineering 61 passed/no failures, default units 7,401 passed/801 skipped, 450 passed files/27 skipped. Skips are not execution evidence.
- Viewed original hosted WebKit320 failure PNG: loading placeholders. Viewed local WebKit430 H07 failure PNG: paused with Updates paused. Neither screenshot alone proves the complete causal timing; raw receipts and controlled regression provide the stronger evidence.

## Limitations and next gates

Earlier failed attempts remain failures. Transport-diagnostic 14-pass evidence used temporary socket instrumentation and is not final-source acceptance. ECONNRESET cause remains unproved; no transport fix is claimed. The initial diagnostic Next receipt remains unclosed despite recorded absent processes/refused ports. Sanitization removed isolated fixture Cookie/Home-binding headers before capturing an original-byte hash; that hash cannot be reconstructed. The durable report and `sanitization.json` disclose this. The bounded log scan is not a repository-wide privacy audit.

APPROVE applies only to this four-file Home harness/CI amendment. Final production build, exact-final-source hosted all-70 execution and required CI remain pending, along with Navigation follow-up, seven independent exit findings, and migration/performance/authorization gates. No release approval, production authorization or closure of independent findings is granted. Root owns the next build/hosted gates and consolidation; no Jose policy decision is required for this scoped review.
