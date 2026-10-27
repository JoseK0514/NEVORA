# Owner MOBILE 3.5 C-07 independent review

Terminal verdict: **PASS** for the bounded local mockup.

- codeQualityStatus: **WATCH**
- recommendation: **APPROVE**
- blockers: **[]**
- Candidate: `65f2a5d5cbb596f90a2d08adb2fca30c869e1142e8325e9d25f23326e70d1c64`
- Accepted baseline: `db40503c66ed08fc2bbaf25902e3f932e7d4ee10e2a0cfe911fd4f79ea3cc06f`
- Scope: standalone in-memory Features and words, its affected integration surfaces, and supporting verification. No production certification.

## Evidence and method

Read the review package, brief, source contract, plan, ledger rulings, implementation diff and relevant current/baseline sources. Consulted the actual read-only words/modules definitions, presentation command model/service, FeaturesEditor autosave, and migration 0032 replay/blocker ordering. Inspected the imported presentation data and importer. Used the requesting-code-review senior-review template and reasonable user effect as the severity standard.

Independent checks are recorded in `outputs/owner-features/independent-review/audit.json`: both artifact hashes match the package, and the candidate exactly embeds the canonical template/style/script manifest. All 48 effective command entries have existing log paths, zero recorded exit codes, and matching candidate hashes before and after. Those records are executor evidence, not 48 newly rerun commands.

Independently reran the 19 model cases and 35 focused Chromium browser cases: **54 passed, 0 failed**. Copies only redirect output into this review directory; assertions are unchanged. Evidence: `model.json`, `model-run.log`, `browser-chromium.json`, `browser-run.log`, and the copied runners in this directory. The browser runner also asserts no page errors or operational/remote requests in each case. Inspected retained failing harness evidence, baseline-selector probe, and Timeoff/Exchange test-port diffs. The ports replace obsolete selectors with actual request identities, count deltas, filter state and return focus; they do not simply delete failing behavior assertions.

Visually inspected the current main 320/200%, words 390/100%, conflict 320/200%, and payroll-unavailable captures. Also ran separate live resize/keyboard probes with JSON and screenshots in this directory. The 45 captures, 162 contrast samples, 1230 browser cases, 125 model checks and 8 source checks remain the executor's aggregate evidence; I did not independently reproduce that entire matrix.

## Findings

### CRITICAL

None.

### HIGH

None.

### MEDIUM

None established for this bounded mockup.

### LOW

**L1 — Sticky clearance remains based on the previous layout until another render.** `work/owner-mobile/features.js:14` writes `--fe-header-height` once per frame; `features.css:4` consumes that value for scroll clearance. Reproduction: open Team words at 430px/100%, change root text to 200%, resize to 320px without changing page, then keyboard-focus the radio group. `live-resize.json` records a 135.39px header with a 77px scroll margin (the old 61px header plus 16px). The focus probe still showed the focused radio visibly below the header; the actual save path rerenders and remeasures, and the focused enlarged-text autosave regression passed. Therefore this is a demonstrated stale measurement, **not a demonstrated blocked control or failed save**. Optional follow-up: observe header size changes or measure immediately before an explicit scroll. No material repair is required on the evidence available.

## Correctness and scope assessment

- Autosave queues are cancelled on departure/pause; serial and authority checks prevent late callbacks from reopening results. Unknown commands retain their original operation, and the UI requires checking that save before accepting another choice.
- Store replay precedes revision and new blocker checks, while authority checks precede replay. One-section commands preserve branding and unrelated choices; conflicts require explicit review before resubmission.
- Blockers use raw company-wide statuses, including stored OPEN coverage that projects as expired. The History handoff explains the source constraint instead of inventing a completion writer. Payroll availability does not erase the hidden saved pay-statement preference.
- Presentation outage differs from disabled state. Navigation/action/store gates and triage counts reflect that distinction. Approved time off and recorded schedule/break data remain available to their existing constraint/history consumers.
- Label changes occur at deliberate slots with fixed source presets. Internal IDs and app access roles remain distinct. Native radio/switch controls, explicit consequences and focused editor pages fit the accepted system type/teal/neutral design.
- Future Updates and pay-statement editors remain explicitly previews. Nothing inspected claims a real delivery, durable save, server authorization, or production integration.

## Skill-perspective check

**Ran:** loaded `/Users/josek0514/.codex/plugins/cache/sisyphuslabs/omo/5.1.30/skills/remove-ai-slops/SKILL.md` and the sibling `programming/SKILL.md` before judging tests/maintainability. Applied their overfit, abstraction, boundary, and test-relevance criteria as a read-only review, without invoking their implementation/delegation workflow.

No material violation of either perspective established. The new behavior tests exercise state transitions, replay, races, preserved data, disabled gates and native focus rather than only pinning the requested diff. UI text assertions identify meaningful visible state, not natural-language agent prompts. The importer mechanically preserves the source vocabulary; command parsing/canonicalization is required by the explicit protocol boundary, not speculative normalization. Dense one-line functions follow the existing mockup convention and make inspection harder, but this review does not impose an unrelated formatting/refactoring project. No new untyped TypeScript escape hatch, deletion-only test, tautological test, or needless production extraction was identified as an approval blocker.

## Declined to judge / bounded exclusions

- Real server/DB transactions, distributed concurrency, authenticated authorization, deployed APIs, real receipt storage, tenant isolation, production network behavior, CI, deployment and rollback: no actual app scripts or real services were run.
- Physical phones, software keyboards, VoiceOver/TalkBack and other real assistive technology: native semantics, browser keyboard checks and captures are evidence only for the simulated browser environment.
- Live resize beyond the recorded Chromium probe: stale clearance is recorded as L1, but other engines/device behavior is not inferred.
- `branding-store.js:16` computes `facts()` before returning a denied/unavailable read, and `exchanges-store.js:54` activates its sample before its own access check. This can initialize the local fixture, but I found no exposed denied payload, operational request or demonstrated user-visible violation from it in the supported flow. I decline to label it a production privacy breach; short-circuiting earlier would be a reasonable integration cleanup.
- Dormant legacy `originalShow` fallback surfaces are not certified as live current Home/Inbox flows. In particular, their raw editable-location interpolation deserves escaping before those fallback screens are revived; current triage renders escaped names. No current UI reproduction was established, so no current security failure is claimed.
- Actual Clocker break start/end controls, full Updates/pay-statement editors, Spanish/full-sentence dictionaries, durable reload persistence, and source expiry maintenance: explicitly outside this slice. The reviewed local feature choices do not establish those workflows.
- Previously accepted unrelated functionality and unchanged visual details are not comprehensively recertified. Supplied affected regressions were inspected; only the focused checks listed above were independently rerun.

## Handoff

No implementation edits, app execution, Git operations, service/customer changes, cross-chat messages or nested agents. This is a non-Git artifact review; no branch, commit or deployment was produced. The supplied actual-app clean/detached status remains the executor's claim, not a fresh Git certification from this reviewer.

`omo-agent-toolkit ulw-loop status --json` returned `ULW_LOOP_PLAN_MISSING`. The required fallback report is `.omo/evidence/owner-features-code-review.md`; the requested review-package copy is this file. Ledger/notepad consulted: `work/owner-features/ledger.md`. No user action or blocker is required for this bounded approval.
