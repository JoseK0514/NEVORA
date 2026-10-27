# Independent Employee mobile Hours UI review

Reviewer: independent UI oversight (UI-1 Visual Systems, UI-2 Interaction & Accessibility, UI-3 Information & Content). Date: 2026-10-27. No application changes by reviewer. Authors own finding closure.

## Review status

**Current UI recommendation: GO WITH CONDITIONS for the tested Employee/Lead Hours navigation on `e17a8e7479988a1b7159b714f8a2af9c146f2cd3`.** See the final reinspection below for exact acceptance and limits. Initial inspected candidate `7efc194a8e72c0df866649ca6e84831876446806`, branch `codex/employee-mobile-hours-20261027`, base `1f88fc70`, was NO-GO; its findings and intermediate failures remain preserved below. This is local UI readiness advice, not production authorization.

Source of truth: repository AGENTS.md, DESIGN.MD, scoped `docs/product/specs/employee-mobile-teal/README.md`, and `docs/execution/employee-mobile-hours/plan.md`. Scoped teal title32px/body16px, token spacing, native controls, Employee/Lead-only authority and desktop preservation govern this review. The independent UI oversight skill governs classification; management statements are not closure.

## Findings on initial candidate

| ID | Classification / severity | Actual observation and evidence | Required closure |
|---|---|---|---|
| UI-H1 | ISSUE / P2 | Hours, Timecards, Time entry, Your correction, and Request a correction titles visibly render at body size, below section headings. `hours.css` uses undefined `--em-size-page` inside its higher-specificity font-size rule; foundation defines `--em-size-title`. Inspect `browser-second/chromium-hours-light-390.png`, `chromium-correction-light-320.png`, and `chromium-approved-detail.png`. | Author restores valid title token while retaining narrow/200% fit; fresh computed heading size and light/dark 320/390/430 + enlarged-text captures. |
| UI-H2 | ISSUE / P2 | At320px and200% text the timecard break label splits into “Rest / brea / k UI0”, impairing readability despite no page overflow. Horizontal `.em-hours-facts` rows reserve up to65% for the value. `browser-second/chromium-timecard-text-200.png`. | Preserve complete words and readable label/value order under enlarged text, e.g. responsive stacking using existing tokens. Fresh timecard and entry-detail200% captures. |
| UI-H3 | ISSUE / P3 | Helpers expose `America/Puerto_Rico` while the shared comparison says “Puerto Rico time”; technical identifier undermines consistent employee-friendly wording. `chromium-hours-dark-320.png`, `chromium-unknown-result.png`, `chromium-timecard-dark-390.png`; `hours-records.tsx`, `hours-cards.tsx`, `hours-corrections.tsx`. | Reuse existing `timeZoneLabel` and verify rendered help text. |
| UI-H4 | BLOCKER / evidence | `browser-second/results.json` contains only9 Chromium checkpoints, ending after timecards; `chromium-failure.png` exists. No completed WebKit/Firefox, missing/replacement, desktop, denial or read-unavailable outcome in this artifact. File existence is not suite success. | Diagnose failure and finish complete frozen-candidate run; reviewer inspects actual new outputs. |

## Verified observations and their limits

- **VERIFIED:** Actual Chromium captures show semantic teal surfaces, restrained lists, consistent rounded controls, explicit raw/effective distinction, and status wording independent of color. Original and effective time use separated hairline rows without inherited comparison card borders. Evidence: `chromium-entry-detail.png`, `chromium-approved-detail.png`, `chromium-timecard-dark-390.png`.
- **VERIFIED:** Correction form captures show labelled native date/time/select/textarea controls, proposed start/end grouping, visible reason focus ring, and explicit manager-review/punch-preservation explanation. Unknown outcome locks fields and provides “Check submission status”. Evidence: `chromium-correction-light-320.png`, `chromium-correction-text-200.png`, `chromium-unknown-result.png`.
- **VERIFIED (bounded automated observation):** Test source records checkpoints only after assertions. The nine recorded Chromium checkpoints cover live entry restrictions, origin focus, offline draft privacy/recovery, deliberate changed-source review, original-operation retry, and original raw clock-out preservation. `src/test/integration/employee-mobile-hours.integration.ts` and `browser-second/results.json` are checked together. These are not full-suite acceptance or independent live reproduction.
- **RISK / evidence limit:** Matrix checks one chosen action height and contrast on each of three surfaces; it is not an exhaustive audit of every control/text color. Only dark200% captures are produced. Break/missing/replacement, loading/empty and later recovery states require direct coverage. Full-page fixed-nav image overlap alone is not evidence of persistent obstruction; the test checks final footer clearance.
- **RISK / separate gate:** Physical iOS/Android native pickers/keyboards, VoiceOver/TalkBack, actual screen zoom and hosted/assembled CI are not certified by local desktop browser emulation. Desktop and Employee/Lead permissions remain required fresh gates.

## Evidence custody

Browser artifact root: `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-hours/browser-second/`.

Reviewer invocation: `tools.view_image` on each screenshot named in `.omo/evidence/employee-mobile-hours-independent-ui/reviewed-browser-second.json`; source inspection through `cat`, `sed`, `rg` and `git diff --stat 1f88fc70..HEAD`. Binary observables: visible title hierarchy, complete versus broken words, actual displayed timezone wording, existing non-empty captures, and nine recorded checkpoint objects rather than a complete three-engine result. The JSON manifest records exact paths, nonzero bytes and SHA256 of every inspected image and result. No active ULW attempt was found (`ULW_LOOP_PLAN_MISSING`), so reviewer evidence is under `.omo/evidence/`.

No push, merge or deployment performed. Initial findings sent to author for closure; reviewer does not self-implement.

## Independent reinspection — bc6bf5c1 / browser-fourth

**UI-H1, UI-H2 and UI-H3: VERIFIED closed for the inspected Chromium scenarios.** Actual `browser-fourth/chromium-hours-light-390.png` and `chromium-correction-light-320.png` restore clear page-title hierarchy; `chromium-correction-text-200.png` preserves whole heading words; `chromium-timecard-text-200.png` keeps “Rest break UI0” intact with wrapping label/value rows. These captures also display “Puerto Rico time”. Source independently confirms `--em-size-title`, wrapping8rem fact bases, and reuse of `timeZoneLabel`. The matrix now asserts computed h1>=32px at normal text and longest-heading-word fit at200%; this is stronger than overflow checks alone.

**VERIFIED visual additions:** `chromium-missing-time-form.png` distinguishes no recorded entry/no approved adjustment; `chromium-missing-replacement-form.png` shows the existing approved missing interval and disabled original location. `chromium-ineligible-original-recovery.png` and `chromium-superseded-original-recovery.png` both retain a clear original-submission recovery action without a new-send form. `chromium-corrections-empty.png`, `chromium-records-loading.png`, and `chromium-read-unavailable.png` distinguish empty, checking, and failed reads. Actual images inspected with `tools.view_image`; source shows explicit `htmlFor`/`id` associations for native selectors.

**UI-H4 remains BLOCKER:** this run again stopped before three-engine completion. `chromium-desktop-hours.png` shows “Loading recorded time”, and `chromium-failure.png` shows desktop timecards still checking. These verify desktop chrome only, not settled desktop data or functional preservation. No missing screenshot is treated as a pass. The current overall **NO-GO** remains until a complete frozen run and settled desktop evidence. Inspected fourth-run image/result custody is `.omo/evidence/employee-mobile-hours-independent-ui/reviewed-browser-fourth.json`.

## Independent reinspection — c0c1d6c8 / browser-fifth

**VERIFIED:** Chromium desktop Hours now displays actual clocked-in status and recorded totals; desktop timecards displays actual totals, entries and correction count. Desktop mobile-owner absence is asserted by the browser scenario. The Hours correction-history subsection still says loading in its image, so this is not certification of that separate desktop interaction. Chromium confirmed-empty and access-denied captures distinctly communicate no records versus lost access without exposing private entries. WebKit dark320 correction and200% timecard images preserve the closed title/word-wrap fixes. Evidence inspected: `chromium-desktop-hours.png`, `chromium-desktop-timecards.png`, `chromium-records-empty.png`, `chromium-access-denied.png`, `webkit-correction-dark-320.png`, `webkit-timecard-text-200.png`.

**UI-H4 remains BLOCKER:** fifth results reach the full Chromium scenario and WebKit desktop preservation, then stop before WebKit second-actor empty/denied and all Firefox scenarios. `webkit-failure.png` displays the sign-in page; the image does not establish the cause. No overall pass inferred. Manifest: `.omo/evidence/employee-mobile-hours-independent-ui/reviewed-browser-fifth.json`.

## Independent reinspection — 80877d53 / replay-final

Fresh artifact root: `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-hours/independent-qa/replay-final/`. Candidate is exactly `80877d534e9f690478e2926e8529725d7580a58f`. Direct git comparison confirms only the server reader and SQL regression tests changed after9f36; the inspected UI fixes are unchanged.

**VERIFIED:** `hours/results.json` records51 checkpoints,17 each for Chromium, WebKit (Lead fixture), and Firefox. Each engine now reaches settled desktop main views, confirmed own empty state, and current denial. Representative actual captures across all three engines were opened with `tools.view_image`, including Hours light/dark, correction native controls,200% timecard, missing/replacement forms, original-submission recovery after eligibility loss/supersession, empty and denied screens, and desktop Hours/timecards. No new visual defect found. UI-H1/H2/H3 closure holds across the inspected engines; readable titles and whole break labels remain, timezones are friendly, authority explanations remain employee-only. Exact inspected images and result hashes: `.omo/evidence/employee-mobile-hours-independent-ui/reviewed-80877-replay.json`.

**UI-H4 remains BLOCKER / diagnostic acceptance:** all51 checkpoints do not establish a successful test. The actual `integration.log` marks the Hours browser test failed. `hours-diagnostic-failure.json` and raw results contain unexpected WebKit pageerrors during missing-time (`Load failed` and Next dev stack-frame fetch errors), plus a Firefox `JSHandle@object` console error. QA must reproduce/classify the actual errors and obtain a successful relevant run without suppressing unexplained failures. Current recommendation remains **NO-GO** for completed UI readiness certification; the visual observations above stand separately.

**Scope limits retained:** desktop capture verifies the main recorded facts and timecard surface, not deeper untouched desktop correction/history interactions (Hours correction-history is still loading in the captured moment). Native picker/keyboard behavior on physical iOS/Android, VoiceOver/TalkBack, real-device zoom, hosted/assembled CI and production remain separate gates. No deployment or production approval is implied.

## Final independent UI verdict — e17a8e74 navigation preflight

**UI recommendation: GO WITH CONDITIONS. UI-H1, UI-H2, UI-H3 and UI-H4 are VERIFIED closed for the tested local Employee/Lead Hours navigation.** No unresolved visual implementation issue identified in the inspected scope. The preceding NO-GO decisions remain historical evidence, superseded only for this explicitly bounded successful scenario.

Artifact root: `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-hours/browser-navigation-preflight/`. Actual results contain51 checkpoints (17 each Chromium/WebKit/Firefox),105 nonempty captures and54 selected-action contrast readings (minimum6.089:1). No unexpected console error or pageerror remains. `.superpowers/sdd/plan/HQ-02-preflight.log` reports1/1 passing test in87.65s and owned-cluster shutdown. The source diff changes only three test lines: wait for enabled Refresh, then use the visible own-detail/list/new-missing/Hours links. Error filtering, assertion thresholds and timeouts were not relaxed.

| Acceptance | Scenario / invocation and binary observable | Captured evidence |
|---|---|---|
| UI-H1/H2/H3 closure | Three-engine matrix, normal320/390/430 light/dark and320/200% text; existing computed heading/word fit and no-overflow assertions pass. Direct visual inspection finds readable hierarchy, intact break words and friendly timezone wording. | `chromium-hours-light-390.png`, `webkit-correction-dark-320.png`, `firefox-timecard-text-200.png`; `results.json` |
| UI-H4 closure | Affected Hours integration scenario completes all51 checkpoints and final diagnostic assertion with1/1 pass, using settled visible navigation. | `results.json`, `.superpowers/sdd/plan/HQ-02-preflight.log` |
| Missing/replacement/recovery clarity | Same three-engine scenario exercises native eligible location, approved missing context, original-operation recovery after eligibility loss and supersession; no duplicate replacement and no raw mutation assertions pass. Actual inspected state remains understandable without exposing management controls. | `webkit-missing-replacement-form.png`, `firefox-superseded-original-recovery.png`, `results.json` |
| Desktop main surface preservation | Scenario asserts mobile owner absent; actual main timecard and recorded facts remain visible in existing desktop layout. | `chromium-desktop-timecards.png`; prior fresh80877 desktop Hours captures plus unchanged UI source |
| Evidence matches candidate | Independent SHA256 comparison of13 relevant UI/reader/scenario files against git e17a8e74, source manifest, current tree and owned runtime mirror—all equal. | `.omo/evidence/employee-mobile-hours-independent-ui/reviewed-e17a8-preflight.json` |

Exact review invocations were `tools.view_image` on the named fresh screenshots, JSON parsing of results, log inspection, `git diff 80877d53..HEAD`, and independent SHA256/git-show comparison. The manifest records exact artifact paths, bytes, hashes, source-custody files and scenario command. Runtime ownership records a closed owned Next/PostgreSQL instance. Reviewer made no application or test edits.

Underlying preflight command: `node scripts/payroll-postgres.mjs vitest.employee-mobile-hours.config.mts src/test/integration/employee-mobile-hours.integration.ts`, cwd this worktree. `browser-navigation-preflight/invocation-record.json` records the actual root tool call after completion (session5191), explicitly retrospective rather than a contemporaneous runner receipt; reviewer read it and separately verified frozen source custody and passing output.

Conditions and non-certified cases:

- Final combined71-case independent QA on this same candidate remains a separate acceptance gate; this UI recommendation does not predict its result.
- Physical iOS/Android native pickers/keyboards, VoiceOver/TalkBack, real-device zoom and assembled hosted/CI remain unverified by this local review.
- Abrupt forced full reload while a server-action RSC response is settling is outside this successful scenario. The prior diagnostic failure is not claimed fixed as a generic product/framework behavior.
- Desktop acceptance is limited to captured main data and surface separation. Deeper untouched desktop correction/history interaction is not certified; the captured Hours correction-history subsection had not settled.
- Selected-action contrast/target assertions and representative visual inspection are not an exhaustive screen-reader or every-element contrast audit. All105 capture files were verified nonempty; only screenshots named in the reviewer manifests were personally viewed.

Owner for remaining QA/release gates: implementing team and independent QA; production authority remains Jose. No push, merge or deployment by this reviewer, and no new Jose approval is needed for the already-authorized local work.

## Final independent-QA replay confirmation — same e17a8e74

**GO WITH CONDITIONS reaffirmed; UI-H4 is closed from both passing preflight and fresh independent-QA Hours execution.** Independently read `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-hours/independent-qa/acceptance/hours/results.json`:51 checkpoints,105 nonempty captures,54 contrast measurements, no unexpected console/pageerrors. The actual combined `integration.log` marks the Hours orchestration test passing in58,676ms. Its pass line was copied to a stable reviewer-owned log snapshot while the remaining combined tests continued.

Fresh WebKit replacement and Firefox200% timecard images were personally viewed and remain consistent. Repeated independent source custody comparison again matched13 relevant files across git e17a8e74, live tree, fresh owned runtime mirror, and fresh source manifest. Evidence: `.omo/evidence/employee-mobile-hours-independent-ui/reviewed-e17a8-independent-acceptance.json` and `acceptance-hours-log-snapshot.txt` beside it. Underlying fresh invocation is `node scripts/payroll-postgres.mjs vitest.employee-mobile-hours.config.mts` from the worktree, recorded by independent QA's `integration-invocation.json`.

This confirms the Hours portion only. Overall71-case result, full-mirror custody audit and units were still running at this review; their completion is not claimed here. All listed physical-device/AT/hosted, abrupt-reload and deeper-desktop limitations remain in force.
