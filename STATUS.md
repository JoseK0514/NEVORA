# Claude, start here

- **Requested refs are pushed:** exact33 `codex/candidate-33-fixes` = `b68f250`; all four `codex/ready-*` SHAs are in the [published table](#published-ready-branches--full-exits-remain-open).
- **Current review candidate:** `codex/release-candidate` = **`a21650de`**. It combines rolling integrationc8752f2b with four separate finding repairs: Review replacement gutters, pending colour contrast, Company Save height, and time separators. [Commits, patches and source custody](release/preview-integration-33/candidate-a21650d/README.md).
- **Validation:** exact combinedcd764f6 passes7,362tests/type/lint/build/markers; rolling15a0fcd7 separately passes7,363. Currenta21650de passes whole typecheck/lint and29focused tests; its full tests/build/markers are still running. [Completed combined gates](release/preview-integration-33/gates-cd764f6/README.md), [rolling gates](release/rolling-integration-20261019/README.md).
- **Both requested regressions freshly pass28/28:** Rules Enter-focus16 + Inbox opening/guards12, exact15a0fcd7. Chromium cold-opening CLS max0.0005213; WebKit first-ready geometry stable. [Canonical assertions and preserved replay lineage](release/preview-integration-33/combined-15a0fcd-scoped/priority-results.md).
- **All five full exits remain open; zero completed.** Phase3 retains compact recorded-time movement and measured date/title wrapping; [review proposals](premium-phase-3/round-5-cd764f6-full/proposals/REVIEW.md). WaveA’s gutter/time fixes await current-source browser proof. WaveB has two un-attributed axe contrast negatives. Desktop retains the existing Inbox-count overlap under IS-P4-18; its opening repair passed the bounded check. WaveC is prepared on currenta21650de, awaiting capacity. [Measured/provisional finding ledger](release/preview-integration-33/current-open-findings.json), [full-exit index](release/preview-integration-33/exit-rounds-cd764f6.json). No full-source zero merge is ready.
- **Hosted CI still has browser failures:** run39342768307, actual merge2a67a4d3/headc8752f2b. Validate is green:7,363tests/0fail, typecheck/lint/build/audits pass. All3PostgreSQL jobs pass, including all10Phase E suites/Home40/40. Home fails its old Clocked In literal; Attendance fails the whole-page old-location assertion after9protected checks pass. Aggregate remains failed. [Exact triage and unapplied diagnostic corrections](release/preview-integration-33/ci-39342768307/README.md). Earlier aa24’s all10SQL/Home40/40 pass and failures remain preserved separately.
- **Preserved work:** exact33/four ready refs are unchanged. Old later-fix history is preserved locally as `codex/paused-followups-14c9ccc`; its13patches and compiler correction remain historical review material. The shared SelectField accessible-name remainder and outgoing Inbox item parameter still need coordinator reconciliation. [Coordinator handoff](release/rolling-integration-20261019/PHASE3_FOR_CLAUDE.md).

## Candidate-only UI fixes for Claude to review — current a21650de

The active **codex/release-candidate** is now published at **a21650de50374683d52e32b883d7f419d7344f22**: rolling15 + the four separately committed repairs below + Claude’s CI/test updatec8752f2b. [Review packet, source manifest and patches](release/preview-integration-33/candidate-a21650d/README.md). Existing29focused tests and changed-file lint pass; fresh whole gates are running and new-source browser proof is queued. No full-exit zero is claimed.

| Commit | Named finding | Review status |
|---|---|---|
|0caadb35|AL-WA-10 P1 — replacement-review gutters|Prepared; fresh source geometry/axe pending|
|2ddb833f|TC-WA-16 P2 — pending colour contrast|Prepared; fresh visible transition frames pending|
|e7ee28a2|ST-RC-PAYROLL-SAVE-01 P2 — Company Save height|Prepared; fresh pending height/painted sibling proof pending|
|08159520|TC-WA-3 P2 — time separator wrap|Prepared; fresh four-site wrap proof pending|

The exact33 and four ready refs are unchanged. The obsolete later-fix history is preserved as codex/paused-followups-14c9ccc at14c9ccc, including13older follow-ups and the original contrast continuation. It is historical review material, not the current candidate. Do not bulk apply its compiler guard or duplicate source-owned repairs.

<!-- rolling-integration-results-20261019 -->
## Rolling integration results — 13446e25

All four Claude correction sets and their current ROUND notes are merged and pushed to `codex/verify-preview-33`; PR #13 stays draft/open. Each code-merge snapshot passed install/type/lint, 7,363 full-suite tests (801 skipped), build and production markers. Final `13446e25` adds only two Wave B Markdown lines to tested `15a0fcd7`; all other 2,845 tracked entries match exactly. Targeted browser results and their exact sources are documented separately.

[Current results and remaining exit gaps](release/rolling-integration-20261019/README.md), [raw gate evidence](release/rolling-integration-20261019/gates/), [Phase 3 coordinator handoff](release/rolling-integration-20261019/PHASE3_FOR_CLAUDE.md). **Full five-area exits remain open; these bounded checks grant no zero verdict.** The latest head13446e25 CI has completed failed at actual PR mergeaa24f6a: all10SQL suites pass, while validate and two browser gates remain open. [Current CI packet](release/preview-integration-33/ci-39339520609/README.md). Existing inspection owners continue the full scope; preserve old-source observations under their actual SHA and justify source reuse. No main merge, deployment, assertion weakening or new policy exception.

<!-- rolling-integration-20261019 -->
## Rolling integration update — October 19

Jose's rolling integration target is `codex/verify-preview-33` (PR #13 remains draft/open). Wave A411a42ce, Wave B9d6530bc, Wave C5b938eaf and Desktop15a0fcd7 corrective merges are now present. Latest observed head13446e25 adds WaveB notes only; application bytes match15a0fcd7. The green full local gates below certify frozencd764f6; later rolling changes retain their own gates. The next bounded preview is pinned15a0fcd7 to verify the adopted Rules Enter and Inbox opening repairs. No full exit zero is claimed.

[Phase 3/coordinator handoff](release/rolling-integration-20261019/PHASE3_FOR_CLAUDE.md) includes the shared SelectField remainder, existing historical crosswalk, and two original PR CI browser failures for Claude's triage. Preserve the earlier reports below under their actual SHAs. No full exit zero, main merge or deployment is claimed.

# Verification detail — frozen preview plus exact33

Jose’s latest instruction is to publish now and inspect Claude’s combined integration plus the33 fixes. All requested refs are pushed; validation is still in progress.

- **Published33-fix snapshot:** `codex/candidate-33-fixes` at `b68f250129e2d21731624652e0aad7412b042bc3`. It has exactly33 finding commits over published base `8e18a95`. [Canonical manifest](release/paused-ui-fixes-b68f250/fix-commits.json).
- **Frozen verification tree:** `codex/checkpoint-preview33-cd764f6` at **`cd764f614be8ca5b5215be19d46e07cf968638d7`**. It contains merge `8640247` (Claude’s all-six `4aaa793` plus exact candidate33 `b68f250`) and two necessary integration corrections. `fce5b402` removes a kit override already supplied by the unchanged coordinator CSS; `cd764f61` retains the real PendingLabel in a callout test mock. Kit CSS now matches Claude byte-exact; coordinator CSS and lockfile remain unchanged. Later fixes34–45 remain excluded. [Current source and patches](release/preview-integration-33/integration-corrections-cd764f6/README.md), [original merge manifest](release/preview-integration-33/source-manifest.json).
- **Concurrent integration update:** another publisher advanced `codex/verify-preview-33` through WaveA411a42ce, WaveB9d6530bc, WaveC5b938eaf and Desktop15a0fcd7; latest observed13446e25 adds WaveB gate notes only. Wave A’s Optional-label and Back-to-Inbox corrections (`ba313d1`) address IS-P4-11 and the Optional-marker portion of IS-WA-12. IS-P4-11 has only the receiving-side port; the shared outgoing Inbox item parameter remains open. The shared SelectField label/hint remainder is assigned to the coordinator in the rolling handoff; do not infer full IS-WA-12 closure or apply duplicate portions. Those rolling changes are separate from the released checkpoint and are not covered by its green gates. The remote change was preserved; no reset or force push. Active checks remain on the explicit checkpoint above.
- **Current code/build gates — pass:** on clean **`cd764f6`**, locked install410 packages, type generation, typecheck, lint, production build and marker scan pass. Full one-worker suite: **7,362 passed / 0 failed / 801 skipped / 55 pending**,474 files; all five development markers absent across **2,323 artifacts**. Both previously failing files also pass18/18. [Complete evidence](release/preview-integration-33/gates-cd764f6/README.md). The first8640247 result and its two genuine failures remain [preserved](release/preview-integration-33/gates-8640247/README.md).
- **Fresh browser and exit work:** the combined preview passed source/mirror/DB identity, fixture readiness and all10 logins; fresh152 interaction cases completed150pass/2failed (Company Save height at320/200 in both engines); the unchanged72 checker finished70pass/2Recorded-time CLS failures. Four original label-locator setup gaps were preserved and replayed on the actual connected button, separately from product failures. Desktop, Phase3 and WaveA full sweeps are active; WaveB/C are resource queued. All five full exits use corrected `cd764f6`; their required matrices, prior IDs, state and large-data reviews remain intact. Phase3’s ledger now has1,562 rows:1,546 pending and16 source-contract not-applicable, with Manager/Owner notification actions added explicitly. No full exit is certified zero yet. [Exit index](release/preview-integration-33/exit-rounds-cd764f6.json).
- **Measured open on the frozen checkpoint so far:** Desktop `ST-P4-13` Inbox CLS0.0639 in the restarted guard-v2 sweep (bar0.01); Phase3 `TC-P3-09` splits “Oct19” over40px at Employee320/200 on next-week Availability. These retain their existing IDs and require owning-source reconciliation; they are not full-round counts. New **ST-RC-PAYROLL-SAVE-01** confirms88→52px with36px visible sibling movement using ordinary-scroll traces in both engines. The original covered button/underlay contrast observation is retained with that limitation. Separate TC-WA-16 causal traces confirm visible contrast minima1.056:1 Chromium/1.677:1 WebKit during the160ms background transition; settled contrast5.139:1 passes. P3-ST-01 retains the12px compact Recorded time movement/CLS0.0226; Home's296px band stays stable. [Measured report](release/preview-integration-33/combined-cd764f6/candidate-findings.md), [unapplied owner-review proposal](release/preview-integration-33/review-proposals/ST-RC-PAYROLL-SAVE-01.patch). Phase3 also confirms retained TC-P3-34 (Notifications title splits inside its word at320/200); selected-tab visibility is being crosswalked under AL-47 without duplicate counting. The next separate bounded preview will test the adopted Rules/Inbox repairs on pinned `15a0fcd7`, while the three active full sweeps stay oncd. WB has been released; its first fixture setup failed before listen and is being repaired with original evidence preserved. WC remains resource queued;15critical repair checks get the next compile slot. No new main-merge/deployment claim.
- **Published ready targets:** table below. They retain the earlier32-fix base, their source input and separately named repairs. They are available for Claude’s review; they are not complete exit certificates. WaveB’s Rules Enter fix is `eb83869` (16/16 bounded proof); Desktop’s Inbox fix is `5b66aa3` (8 openings+4 guards). Additional Payroll Enter scope remains in the separate later patch list.
- **Historical browser proof:** original31 targeted152/152 atb9567ab; Home80/80, More20/20 and Payroll fonts4/4 atb68f250. All owned previews were closed with source/mirror verified and PostgreSQL stopped. These do not replace the fresh combined check. [Closed33 scope](release/paused-ui-fixes-b68f250/README.md).
- **Later repairs/proposals:**13 additional local finding commits afterb68 are exported below for review, along with source-owned integration-dependent proposals. They are not silently mixed into33. The obsolete45-fix checkpoint e8e947e passed TypeScript but failed lint6errors in IS-P4-19’s closure guard; its full tests were interrupted when Jose redirected the target, and production/markers were not reached. The same-finding compiler correction is prepared; do not apply that guard without its correction.
- **Phone access:** still awaits Jose’s yes/no. No deployment, tunnel or external exposure was started.

## Published ready branches — full exits remain open

| Branch | Published SHA | Review status |
|---|---|---|
| `codex/ready-wave-a` | `563bf65a83f6ff4ce97da4dc7eb131a18f9e9fea` | Candidate32+source; full exit now targets corrected combined cd764f6 |
| `codex/ready-wave-b` | `368e98a18c16d47df04a93f2bea560843e461e0e` | Separate Rules Enter fix; later Payroll/lookup/runs scopes remain review patches |
| `codex/ready-wave-c` | `de8b15851d6280fd31fba3db63dcbe976a19584a` | Named CSS fixes preserved; full combined state/large-data review pending |
| `codex/ready-desktop` | `724b430f3693bc5a9d37677ad250581e33d0f866` | Separate Inbox/opening+shortcut fixes; newer Claude9dd7812 UI is preserved in8640247 |

## Candidate-only UI fixes for Claude to review — published33

One row is one named finding commit. Published snapshot b68f250 is immutable; fresh full validation is pinned to its corrected combined checkpoint cd764f6. Later rolling-source probes retain their own SHA and scope.

| Commit | Finding and change | Inspection report |
|---|---|---|
| `6229ad4` | **IS-P3-03** — retain the controlled availability draft after a failed save | [Evidence](premium-phase-3/round-5-227150b/interaction-states.md) |
| `2dfc390` | **IS-82** — preserve withdrawal confirmation for the same-operation retry | [Evidence](premium-phase-3/round-5-227150b/interaction-states.md) |
| `74b527d` | **ST-P3-24** — reserve Availability submit labels while saving | [Evidence](premium-phase-3/round-5-227150b/stability.md) |
| `db48fb3` | **IS-P3-02** — reveal and focus failed form outcomes above the phone bar | [Evidence](premium-phase-3/round-5-227150b/interaction-states.md) |
| `69338fd` | **IS-PROFILE-17** — reveal user-initiated sign-in recovery before restoring focus | [Evidence](p35-profile/round-4/interaction-states.md) |
| `4b041f7` | **IS-74** — retain the initiating action focus while guarded requests are pending | [Evidence](premium-phase-3/round-5-227150b/interaction-states.md) |
| `ac265b9` | **IS-77** — replace stale timecard counts with a paused or offline state | [Evidence](premium-phase-3/round-5-227150b/interaction-states.md) |
| `6990234` | **IS-78** — provide sign-in recovery after denied employee actions | [Evidence](premium-phase-3/round-5-227150b/interaction-states.md) |
| `f16da25` | **IS-79** — announce pending review and distinguish a signed-out acknowledgement | [Evidence](premium-phase-3/round-5-227150b/interaction-states.md) |
| `ab7d866` | **IS-80** — reveal calendar recovery beside the initiating action and reuse its command | [Evidence](premium-phase-3/round-5-227150b/interaction-states.md) |
| `21e603b` | **IS-B12** — restore update retry focus and retain the payroll save focus | [Evidence](p35-wave-b/round-4-9bd265e/interaction-states.md) |
| `ed62b42` | **TC-B-32** — use kit labels for payroll filenames and workflow labels | [Evidence](p35-wave-b/round-4-9bd265e/type-colour-copy.md) |
| `3918350` | **TC-P4-23** — raise the statement payday line to the kit callout floor | [Evidence](p4-desktop/round-5-8012d97/type-colour-copy.md) |
| `7386c45` | **TC-P4-22** — use the desktop kit label role for availability times | [Evidence](p4-desktop/round-5-8012d97/type-colour-copy.md) |
| `b176ff5` | **RC-CB-TC-01** — use readable kit roles for desktop sidebar labels and credit | [Evidence](release/paused-initial-cbaadbc/type-colour-copy.md) |
| `fe77095` | **TC-WA-16** — retain kit text contrast on pending actions | [Evidence](p35-wave-a/round-2-a05f26a/cloud-paused-type-colour-copy.md) |
| `2e40573` | **TC-B-16** — distinguish an ended session from changed update access | [Evidence](p35-wave-b/round-4-9bd265e/type-colour-copy.md) |
| `31f87cd` | **TCD-16** — apply the reported Employee and Lead desktop text floor | [Evidence](p4-desktop/round-5-8012d97/evidence/source-type-colour-copy.md) |
| `22ea160` | **WR-WC-25** — preserve dialog action label height on narrow phones | [Evidence](p35-wave-c/round-4-5f7c166-exit/widths-roles.md) |
| `6dacbe0` | **ST-13** — bound failed-save feedback inside the Wave C phone bar | [Evidence](p35-wave-c/round-4-5f7c166-exit/stability.md) |
| `0e29e38` | **ST-WA-7** — reserve both labels in the responsive swap submit button | [Evidence](release/merge-4-profile/stability.md) |
| `6e67193` | **ST-WA-8** — reserve the delete shift label while its action is pending | [Evidence](release/merge-4-profile/stability.md) |
| `22f0ba7` | **IS-RC-DELETE-01** — retain guarded delete action focus while pending | [Evidence](release/paused-ui-fixes-90fbb4d/candidate-findings.md) |
| `58e100a` | **ST-RC-CALENDAR-01** — reserve calendar action labels while saving | [Evidence](release/paused-ui-fixes-90fbb4d/candidate-findings.md) |
| `e05d661` | **ST-RC-ACK-01** — reserve update review action labels while pending | [Evidence](release/paused-ui-fixes-90fbb4d/candidate-findings.md) |
| `e2d21fb` | **ST-RC-CORRECTION-01** — hold correction actions steady during the first send | [Evidence](release/paused-ui-fixes-90fbb4d/candidate-findings.md) |
| `35c2c0a` | **TC-RC-ASSISTED-01** — use the kit field edge on legacy assisted recovery | [Evidence](release/paused-ui-fixes-90fbb4d/candidate-findings.md) |
| `536dfe6` | **IS-WA-2** — reveal failed action notices after React mounts each outcome | [Evidence](p35-wave-a/round-2/interaction-states.md) |
| `0443030` | **IS-WB-34** — reveal publication recovery and focus its actual next step | [Evidence](p35-wave-b/round-4/interaction-states.md) |
| `980e823` | **ST-WB-15** — preserve publication action labels while publishing | [Evidence](p35-wave-b/round-4/stability.md) |
| `b9567ab` | **IS-RC-COMPOSE-01** — retain guarded publication focus while pending | [Evidence](release/paused-ui-fixes-980e823/candidate-findings.md) |
| `9ec3adc` | **TC-RC-PAYROLL-01** — use desktop kit roles for payroll next-step guidance | [Evidence](release/paused-ui-fixes-b9567ab/candidate-findings.md) |
| `b68f250` | **ST-RC-HOME-01** — reserve Home band rows while its private read loads | [Evidence](release/paused-ui-fixes-9ec3adc/candidate-findings.md) |

## Later local finding commits — separate from published33

These13 application commits are not published on an application ref. The newest06be59a is the one-finding AL-WA-10 wrapper repair; its focused14tests/lint/typecheck pass, browser repair proof is pending. Their exact per-finding patches are available in [later-unpublished-patches](release/preview-integration-33/later-unpublished-patches/). All remain subject to fresh combined checks. IS-P4-19’s prepared [compiler correction](p4-desktop/ready-desktop/crosswalk-aa5e07e/proposals/IS-P4-19-compiler-correction.patch) is required before use. Source-fixed behavior already present in Claude’s integration should not be duplicated.

| Commit | Finding and change | Inspection report |
|---|---|---|
| `b5e02c9` | **TC-P3-25** — align failed-read recovery wording and timecards retry | [Evidence](premium-phase-3/complete-exit-preparation/TC-P3-25-completion.json) |
| `8159391` | **IS-WA-12** — keep field hints out of accessible names | [Evidence](p35-wave-a/crosswalk-aa5e07e-56570fd/README.md) |
| `6aed3ea` | **ST-WA-1** — give Coverage its own form-shaped loading state | [Evidence](p35-wave-a/crosswalk-aa5e07e-56570fd/README.md) |
| `c841b33` | **IS-P4-11** — retain the selected Inbox request in its review back link | [Evidence](p4-desktop/ready-desktop/crosswalk-aa5e07e/README.md) |
| `4314266` | **IS-P4-19** — retain guarded refresh focus in Home and recorded time | [Evidence](p4-desktop/ready-desktop/crosswalk-aa5e07e/README.md) |
| `be7e73a` | **IS-B12-COMPLETION** — preserve lookup focus and recover failed reads and sign-in | [Evidence](p35-wave-b/completion-patches-56570fd/IS-B12-COMPLETION.md) |
| `9c6f98b` | **TC-P3-24** — use the shared business timezone label in the roster | [Evidence](premium-phase-3/complete-exit-preparation/TC-P3-24-manager-timezone.json) |
| `d04755e` | **P3-WR-11** — let Inbox shift metadata wrap between whole values | [Evidence](premium-phase-3/complete-exit-preparation/P3-WR-11-inbox-wrap.json) |
| `2bc174c` | **TC-P3-28** — use the headline kit role for Today | [Evidence](premium-phase-3/complete-exit-preparation/TC-P3-28-today-role.json) |
| `581921b` | **TC-P3-34** — stack recorded-time footer grid rows at large phone text | [Evidence](premium-phase-3/complete-exit-preparation/TC-P3-34-footer-grid.json) |
| `538caf3` | **IS-B31-PAYROLL** — retain Enter focus while payroll settings are locked | [Evidence](p35-wave-b/completion-patches-56570fd/IS-B31-PAYROLL.md) |
| `e8e947e` | **TC-P3-09** — keep reported availability and roster date values whole | [Evidence](premium-phase-3/complete-exit-preparation/TC-P3-09-reported-wraps.json) |
| `06be59a` | **AL-WA-10** — restore Review replacement gutters with an outer content wrapper | [Finding and focused validation](release/preview-integration-33/AL-WA-10-candidate-06be59a/README.md) |

## Preserved pre-return evidence and decisions


The centered `PendingLabel` helper introduced with ST-P3-24 is reused by the later reserved-label fixes. IS-PROFILE-17, IS-80 and IS-B12 depend on the reveal helper in IS-P3-02. The filename part of TC-P4-23 is covered once by TC-B-32. Combined aliases RC-PC-TC-01/02 refer to RC-CB-TC-01/TCD-16 and TC-P4-22; IS-P3-01 refers to the IS-74 Availability focus repair. ST-WA-9/10/11 are press/resize variants of the same reserved-label family and require the candidate's own proof.

## Coverage and limits

All source previews closed cleanly, with source/mirror hashes verified and owned PostgreSQL stopped. Phase3:15/15 smoke cells and17 targeted cases,15 intercepted mutation POSTs. WaveA:4/4 owned smoke plus3 Swap proofs; separate upstream16 pending cases pass. WaveB:45/48 smoke plus typography/auth/focus proofs. WaveC:26/26 smoke,16 guarded bar cases,56 dialog cases and28 centering cases. Desktop:35 initial cells plus font crops and controlled Inbox CLS attribution. These are different scopes, not a complete combined matrix or zero tally.

Candidate90fbb4d's completed browser rows exposed the final residuals listed above; setup-incomplete attempts are excluded from product findings. Its obsolete64f15e6 full suite was intentionally interrupted(exit130) before source edits; no completed test result is claimed. Final validation starts afresh on the current immutable candidate. Prior publisher8e18a95 reports7352/0 and cbaadbc's9 load-timeout files all passed alone(271 tests); these do not substitute for final candidate gates.

---

## Retained parallel task history

Earlier “current”, permission and candidate statements below belong to their dated tasks. The explicit approval and candidate ledger above supersede their older scope notes for this paused-handoff task.

### Prior publisher record — preserved below

### Additional independent verification record

## Publication verified — 2026-10-19 21:05 UTC

- **Remote candidate is `8e18a958dfbfd1e5c6d6da44396d82c95d4e18e7`**; final push returned “Everything up-to-date” and the remote SHA was rechecked. This task adopted the first-published candidate, preserving local `c34043b` as `codex/publish-c34043b`. No divergent or forced push.
- Includes requested coordinator `4d469a4` through newer `227150b`, backend `da2a4e5`, verified-zero Profile `ea58610`, separate Profile initial-read `4ff37e5`, and lint cleanup `9df0f47`. Premium CSS matches coordinator blob `c72c855`. New Wave A `7f75dc4` / `a05f26a` remain excluded.
- **Verified gates:** raw full application suite **7,352 passed / 0 failed / 801 skipped / 55 pending**,474 files at `0bdaa4d`. Final `8e18a95` changes only one retained Coverage assertion; all application/build/config inputs match. Its Coverage6/6 passes; this task freshly passes typecheck, focused lint and Coverage/Profile22/22 on `8e18a95`. [Provenance and verification](release/publish-c34043b/canonical-8e18a95/README.md). Older local load timeouts and individual one-worker reruns are retained under their actual `c34043b` SHA.
- **Checks fail92/180; combined confirmed P0 0 / P1 8 / P2 0, partial scope.** All180 responses200 and no nontext checker failure. [Canonical five reports and fix owners](release/merge-4-profile/README.md). No all-six release result or production acceptance.
- Own supplemental proof:72 settled captures;60/60 More cases;8/8 held Profile reads with0px Sign out movement, wrapping Manager email at320, Chromium CLS0.000547. Those browser measurements remain explicitly `c34043b` evidence. [Five-area supplement](release/merge-6-profile-ea58610/README.md).
- **This publication task’s owned jobs/services are finished.** Source/mirror verification passes, PostgreSQL stopped, no errors. Remaining source exits stay with the active inspection loop; merge only completed exact-SHA zeros. Wave C cleanup waits for its merge; final every-page/build/full-suite/test:dev:production sweep waits for all six. Device proposal below still awaits Jose; nothing deployed or exposed by this task.

# Claude, start here — published 2026-10-19 20:50 UTC

- **Published `codex/release-candidate` at `8e18a958dfbfd1e5c6d6da44396d82c95d4e18e7`**, a fast-forward from0e01046. Includes coordinator227150b, backendda2a4e5, verified-zero Profileea58610/appcaef395, separate initial-read4ff37e5, and original lint cleanup9df0f47. Premium CSS equals the coordinator’s latest c72c855 blob exactly. No force push; parallel publisher records are preserved below.
- **Gates:** npmci, TypeScript, lint, full one-worker7352 passed/0 failed/801 skipped/55 pending, process-cleanup12/12, build and2298-artifact/5-marker absence pass. Final8e18a95 is one extra retained backend Coverage assertion; all application/build/config bytes match tested0bdaa4d, and focused Coverage6/6 plus TypeScript/lint pass. Earlier backfill load timeout is retained; that file passes68/68 alone and the final full suite is green.
- **Checks:**92/180 pass;88 text-floor failures,0 nontext gate failures under the unmodified checker.40 fresh settled captures and8 More cases pass for every standard role. Profile24 views and4 intercepted double clicks pass; server-initial details hold their height, maximum CLS0.000548. All owned previews close with strict source/mirror verification, PostgreSQL stopped and no guard error.
- **Blocked / partial combined inspection: P0 0 / P1 8 / P2 0 confirmed.** Wave A’s retainedc05e0c7 has2 pending-height P1s. Coordinator has desktop personal-page type floor plus Availability ST-P3-24 and IS-P3-01/02/03:88→52px pending, focus toBODY, error below the tab bar, and checkbox/FormData reset opposite to the visible draft after failure. Desktop owns the shell type floor. [Five combined reports, raw data, screenshots and gates](release/merge-4-profile/README.md). No all-six zero or production acceptance.
- **Wave A a05f26a:** all16 focused pending cases pass; full five-area exit/matrix is incomplete, so it is not merged. The apparent field-edge issue belongs to its old coordinator snapshot:46 fields are1.413:1 there, but3.45:1 with the mandatory latest coordinator CSS on the candidate. [Corrected shared-style disposition](p35-wave-a/round-2-a05f26a/type-colour-copy.md). Do not duplicate that shared fix. Older7679133/7651490/7f75dc4 failed-round evidence remains intact.
- **Where this publishing run stopped:** candidate is published and all owned jobs/previews are finished. Profile is the only verified-zero source exit. Phase3, WaveA, WaveB, WaveC and Desktop full exits remain with the active independent inspection loop; preserve its records and merge only a completed zero or a verified five-report Mac zero. Next publishing update starts from8e18a95, fetches first and preserves any newer remote candidate. Dead settings-hub CSS waits for Wave C’s zero merge.
- This run used only the original three candidate-only UI authorizations. Another task’s separate item-4 approval claim is retained in its own record below and was not inferred here. Device access uses **DEVICE-CHECKLIST-REVIEWED.md** and still waits for Jose. No main/claude push, deployment, tunnel or device exposure.

## Candidate-only UI changes from this run for Claude to review

| Commit | Authorized change | Validation |
|---|---|---|
|9df0f47 | Employee weekly-confirmation ref cleanup; behavior unchanged | Included in subsequent full gates |
|4ff37e5 | Profile authorized management server read parsed and passed asinitial, null on failed/unready read |16 management initial-height samples stable;24 views and4 held one-POST cases pass |

2026-10-19 20:50 UTC · merged Profile at ea58610 (appcaef395), backendda2a4e5 and coordinator227150b · candidate8e18a95 · tests7352 passed/0 failed,801 skipped,55 pending; focused Coverage6/6 · checks fail92/180 · combined P0 0 / P1 8 / P2 0 confirmed, partial scope · blocked

2026-10-19 20:50 UTC · candidate-only Profile initial-read4ff37e5 · full tests/type/lint/build and latest combined checks as above; Profile’s measured integration passes · release remains blocked by the named owner findings

## Preserved parallel and historical records

## Claude, start here — 2026-10-19 20:35 UTC
Scope note for publisher `c34043b`: this conversation authorizes the three listed candidate-only UI changes. The parallel paused-handoff task below reports separate item-4 approval in its own chat; this publisher does not infer additional UI-edit permission from that report. Both tasks preserve the first-published remote candidate and their distinct evidence.

2026-10-19 20:36 UTC · publisher c34043b full run: **7,350 passed /2 load timeouts /801 skipped /55 pending**. Planner and typed-backfill now each rerun alone with one worker, unchanged budgets/assertions; no owned preview/build alongside. Candidate source is unchanged. [Raw full results](release/publish-c34043b/evidence/full-summary.json). Parallel publisher23fcdc3 is also validating the requested inputs; at push, fetch and preserve whichever remote candidate is first published, using no force push or unapproved screen choice. Coordinator227150b arrived after this pinned4d469a4 freeze and is queued for the next rolling update.

# Claude, start here

Current handoff: Jose approved item 4 in chat on October 19. Codex may make named P1/P2 UI fixes **on `codex/release-candidate` only**, one finding per commit. Review each before its owner ports or replaces it. This extends the historical three-edit boundary below.

- **Integrated locally:** coordinator `227150b`, backend `da2a4e5` (approved Profile alerts), verified-zero Profile `ea58610`. Candidate `cbaadbc` adds the separately authorized Profile server initial read. Typecheck and lint pass; full tests and merged browser checks are in progress. No full green or publication claim yet.
- **Verified zero:** Profile exit round 4 at `ea58610`; its five committed reports were verified in `release/readiness/profile-ea58610/`. Other exact exit rounds remain open/incomplete until their results arrive.
- **Active inspection owners:** Phase 3 `227150b`, Wave A `a05f26a` (supersedes `7f75dc4`, ST-WA-11 clamp), Wave B `9bd265e` (handoff `564d193`), Wave C `5f7c166`, Desktop `8012d97`. Separate read-only worktrees and owned fictional previews; no source-branch changes.
- **Open by owner:** Phase 3 interaction IS-74, IS-77–80, IS-82 and prior cloud IDs are being rechecked. Wave A ST-WA-9/10 are being rechecked. Wave B, Wave C and Desktop full exit sweeps are pending.
- **Device access:** proposal below remains pending Jose’s phone-access yes/no. No deploy, tunnel, or external preview exposure.

## Paused-handoff inspection checkpoint

Browser workers are temporarily idle for uncontended candidate gates. Completed scopes are recorded in each report; **no source exit zero is claimed** from these partial checks.

| Owner | Current evidence | Open findings / next step |
|---|---|---|
| Phase 3 | [Round 5](premium-phase-3/round-5-227150b/interaction-states.md); initial checker15/15 | Current measured IS-P3-03, ST-P3-24, IS-74, IS-P3-02, IS-82, IS-78 and IS-80. Candidate fixes queued after initial gates. IS-77/79 still need remaining browser proof. |
| Wave A | [a05f26a cloud checkpoint](p35-wave-a/round-2-a05f26a/cloud-paused-README.md);4/4 initial cells | Source clamp rechecks progressing; TC-WA-15 pending-label contrast measured in screenshot, computed/WebKit confirmation open. Full exit matrix pending. |
| Wave B | [Round 4](p35-wave-b/round-4-9bd265e/ROUND.md);45/48 smoke | TC-B-32:15 small payroll labels in three selector groups. Source CLS0.0244 needs attribution. Full exit pending. |
| Wave C | [Round 4](p35-wave-c/round-4-5f7c166-exit/README.md);26/26 initial | Source TC-WC-28/WR-WC-25 remain; latest candidate coordinator contains border fix, candidate still lacks Wave C dialogs. Failure-bar geometry needs guarded state recheck. |
| Desktop | [Round 5](p4-desktop/round-5-8012d97/type-colour-copy.md);35 initial cells | TC-P4-22 availability labels, TC-P4-23 My pay text; inherited shell floors RC-CB-TC-01; planning CLS needs controlled reproduction. Full exit pending. |
| Combined candidate | [cbaadbc initial evidence](release/paused-initial-cbaadbc/README.md) | Profile320:16/16 pass across both roles/text sizes/engines with axe. Incomplete combined batch is excluded from completed totals; shell/type findings remain open. |

## Candidate-only UI fixes for Claude to review

No new item-4 finding fix committed yet. Separate standing-authorized post-merge change: `cbaadbc` — Profile server initial read (`src/components/manager-profile/manager-profile.tsx`); parse ready snapshots, use null on unavailable/invalid/throw; affected checks pending.

## Current merge custody

`0e01046` → coordinator merge `c16a822` → backend merge `419a99c` → Profile merge `06ac418` → Profile initial read `cbaadbc`.

Backend conflicts follow existing source-owner directions: Coverage takes Wave A’s prescribed test (blob `18e3861`); root layout keeps the latest coordinator text-scale/data-text-step script and adds the prescribed async/error hook. Profile's only conflict takes the exact latest coordinator `portal-premium.css`. No unprescribed screen choice.

Parallel publication custody: this paused-handoff task uses the latest coordinator `227150b` and explicit item-4 approval in this chat. Remote candidate was still `0e01046` at20:35UTC. Any first-published candidate will be fetched and preserved before publishing; no force-push of a parallel release candidate. Parallel checkpoints `c34043b`, `23fcdc3` and their evidence below remain historical/unpublished until their remote custody is established. This task's explicit item-4 approval supersedes the older “no additional UI-fix permission” note below.

Preserved source findings: Wave A ST-WA-11 is fixed by new source `a05f26a` and awaits exit recheck; Wave C TC-WC-28 / WR-WC-25 remain open for measured recheck and minimal candidate applicability review. Neither source is zero yet.

Everything below is retained history from the parallel inspection/publishing tasks. Earlier “current” headings describe their own checkpoints.

---

## Claude, start here — 2026-10-19 20:28 UTC

- Publishing target is now **8e18a95**, with application gates on0bdaa4d: latest fetched coordinator227150b, backendda2a4e5, verified-zero Profileea58610/appcaef395 and separate initial-read4ff37e5. Latest premium CSS equals coordinator blobc72c855 exactly.8e18a95 only explicitly retains the original backend Coverage locator assertion; focused Coverage6/6, TypeScript and focused lint pass; application/build/config bytes match0bdaa4d. npmci/type/lint/build and2298-artifact/5-marker absence pass. Full one-worker suite and180-cell merged checker are running;40 fresh settled page captures and8 More cases pass. Earlier23fcdc3 full run7351 pass/1 backfill timeout; affected file68/68 passes alone without changing limits. The parallel publisher’sc34043b record is preserved; remote RC was still0e01046 at20:31. No force push; preserve any first-published remote candidate at publication.
- Wave A **a05f26a**: all16 focused pending fixes pass, including ST-WA-11. Full source exit is incomplete, so no newer merge. Its old shared field CSS measures1.413:1; latest coordinator227150b on the candidate already measures3.45:1 on the same46 active fields. TC-WA-15 is a resolved shared integration observation, excluded from Wave A-owned open counts; no duplicate Wave A patch requested. [Disposition and evidence](p35-wave-a/round-2-a05f26a/type-colour-copy.md).

- Profile is the only verified zero source exit available to this publishing task. Phase3, WaveB, WaveC and Desktop exits remain with the independent inspection loop; their incomplete results are not zero. Candidate shared-shell type-floor findings remain open; fresh current-source combined reports will name each owner.
- Candidate-only UI commits are the already authorized lint ref cleanup9df0f47 and Profile initial read4ff37e5. No additional UI-fix permission is inferred from the paused-Claude plan. Device setup uses DEVICE-CHECKLIST-REVIEWED.md and still waits for Jose’s explicit approval; nothing deployed or exposed.

2026-10-19 20:16 UTC · requested ordered merges complete locally: coordinator4d469a4 →9a35168, backendda2a4e5 →cf066dc, Profileea58610 →b444813; separate initial-read commit **c34043b**. Candidate frozen for full gates. npmci/typecheck/lint pass (0 warnings), full one-worker tests running, browser checks pending. [Exact candidate and evidence](release/publish-c34043b/README.md). New Wave A7f75dc4 remains excluded. This task will publish after recording the gates; earlier verification-only stop is superseded.

**Publishing now — Jose’s explicit instruction, 2026-10-19 20:09 UTC.** This task owns the requested publication sequence from remote candidate `0e01046`: coordinator `4d469a4`, backend `da2a4e5`, verified-zero Profile `ea58610`, then a separate authorized `manager-profile.tsx` initial-read commit. Run locked install, typecheck, lint, full tests and merged browser checks before pushing `codex/release-candidate`. Previously observed planner/backfill timeouts must be rerun file-by-file with one worker. New Wave A `7f75dc4` is excluded unless its exact exit becomes zero. This supersedes this task’s earlier verification-only stop/handoff. Device access remains a proposal: no deploy or exposure.

**This independent verification task stopped at 2026-10-19 20:06 UTC.** All owned tests/previews are stopped; results and exact resume inputs are saved in [the checkpoint](release/verification-checkpoint-2026-10-19/queue.json). Publication remains with the existing parallel release task; local `bf6c030` is preserved as `codex/verification-bf6c030` and was not pushed over its work. Remote candidate is still `0e010464aeb5f532981ac6071c48e1527e9419db` at the last successful fetch. This is **not the all-six release result**.

Next for the publishing/inspection loop: sync coordinator `5f6ed19` (latest premium CSS blob `0ecdc345`, different from published `ecf0761`), integrate backend `da2a4e5` (approved Profile alert wording), merge verified-zero Profile `ea58610`, then make its separate authorized server-initial-read commit and rerun gates/combined inspection on each resulting SHA. Reprobe the8 unsettled Home/Inbox captures. Wave B now requests exit round4 on `9bd265e` (handoff `564d193`, status open); the other source exits remain incomplete/not zero. Preserve their existing findings. Device proposal remains pending; no deploy or exposure.

2026-10-19 20:03 UTC · independent verification checkpoint: frozen `bf6c030` focused rerun finished122/126 (planner300s timeout repeats; three backfill5s timeouts; Employee Home2/2 pass). No owned test/preview remains running. [Raw results](release/merge-3-backend/README.md). Secondary review of publisher `98b037b` artifacts found **8/16 Home/Inbox captures still loading**; retain valid More results but rerun settled panels before a ready-state verdict. [Five review reports and exact pending cases](release/merge-3-coordinator-backend/secondary-review/README.md). This task is not pushing its divergent snapshot; the other active release task owns publication. Profile `ea58610` remains verified merge-ready, with only the explicitly permitted premium-CSS conflict in a dry-run against published `0e01046`.

2026-10-19 19:56 UTC · Profile exit round 4 at `ea58610bf3bdc85319895689c3d88e064f6a76d5` · five committed Mac reports read and final open P0/P1/P2 = 0/0/0 · **ready to merge this exact SHA**; application code `caef395`, only reports/screenshots after it · [verification and verbatim reports](release/readiness/profile-ea58610/README.md). Candidate publication remains with the other active release task; the separate initial-read commit is now due after this merge. No other source exit is certified zero.

2026-10-19 19:56 UTC · Wave A `7651490` early exit **not zero: P0 0 / P1 1 / P2 1**. [ST-WA-10](p35-wave-a/round-2-7651490/stability.md): desktop Save scheduling profile narrows219→160px (59px sideways; WebKit61.16px). ST-WA-9: scaled press rectangle becomes inline min-height86.24px instead of88, leaving2px scroll loss; reduced-motion control stays88. Both engines reproduced, all submissions held/aborted. The incomplete matrix was stopped; Wave A owns fixes, no merge. Original7679133 failed-round evidence retained below. Candidate91ef655 full serial suite passes7336/0; coordinator2d169ff is integrated locally at7628503 and its gates are running. Premium CSS still equals latest coordinator.

2026-10-19 19:47 UTC · source Wave A `7679133` failed the exit on ST-WA-8; [all five measured reports](p35-wave-a/round-2-7679133/summary.json) retained (282 visits / 564 samples,32 held one-POST cases,200 role visits with60 settled retries). New `7651490` fixes the reported hold and is now the exit target; its first matrix batch is paused for the final test run. Candidate `91ef655` includes coordinator `2ea7474`, backend `faca10f`, and latest premium CSS exactly; Wave A `7651490` is not merged pending a complete zero exit. Earlier `98b037b` full serial suite passed7336/0; `a26ab2d` hit3 unrelated backfill timeouts under competing browser load. Current candidate gates rerun with browser work paused; assertions and timeout budgets unchanged. [Candidate evidence](release/merge-3-coordinator-backend/README.md). No deploy/device exposure.

2026-10-19 19:24 UTC · Wave A round 2 on `7679133` · verified P0 0 / P1 1 / P2 0 so far · **not zero; do not merge**. New [ST-WA-8](p35-wave-a/round-2-7679133/stability.md): Delete this shift still shrinks 88→52px at 320/200 while held, document −36px, scroll −29px; this separate button bypasses the new PendingButton hold. ST-WA-7 Swap fix passes the Chromium recheck. 160/160 first phone batch passes; remaining exit evidence continues. Browser mutations held/aborted; no source changes.

In progress, 2026-10-19 19:10 UTC: coordinator `8c4264c` and backend `c6a5954` are integrated locally at candidate `98b037b`. Claude’s Coverage wording and supplied root-layout resolution applied; latest coordinator premium CSS retained exactly. TypeScript passes; lint passes with zero warnings. Original isolated cleanup reproduces 3 failures; backend isolated cleanup passes 12/12 with one worker (positive zombie evidence plus live-process rejection). Full candidate tests/checks/build and exact Wave A `7679133` exit inspection are running. New Wave A SHA is not merged pending a complete zero exit. Inbox flag skipped; reviewed checklist retained; no device access or deployment. Older results below are historical checkpoints.

Cloud inspection loop checkpoint, 2026-10-19 21:44:50 UTC: **P0 0 / P1 15 / P2 3 confirmed, partial scopes.** Judgment is paused; see the restart block at the top and INSPECTION-RESUME.md. Full cloud exits remain incomplete.

Verification task, 2026-10-19 19:43 UTC: source-owner instructions now resolve both backend conflicts (Wave A ROUND at `7679133` plus coordinator layout file at `8c4264c`). Local verification snapshot `bf6c030` integrates backend `c6a5954` without the newer Wave A UI commit; install/TypeScript/lint pass, and its full one-worker suite finished at 7,332 passed / 4 timed-out / 801 skipped / 55 pending. All 12 process-cleanup tests pass; the complete 20-location planning test timed out at 300s despite a 185s first-call measurement. The focused retry finished122 passed /4 timed out with unchanged limits; Employee Home passes, planner and three backfill cases time out. The complete failure record is retained. Another release task owns publication; this task is verifying to avoid another branch race. [Current verification record](release/merge-3-backend/README.md). The prior unpublished coordinator-only `25dca8d` run completed at 7,282 passed / 5 failed; its results are not current-candidate gates.

Published 2026-10-19 18:57 UTC: `codex/release-candidate` is `0e010464aeb5f532981ac6071c48e1527e9419db` (Wave A `c05e0c7` + coordinator through `e7671e6` + lint cleanup). **Blocked / not zero.** [Validation and five combined reports](release/merge-1-wave-a/README.md). This replaced only rehearsal `bec0ed4` using an exact lease; all parallel inspection/backend-first records are preserved below. No deployment or device access.

Historical backend-first diagnostic: unpublished `2fafc1a` is retained on `codex/rolling-backend-first-2fafc1a`. The exact-lease push was rejected after `0e01046` was published, so that newer work was preserved. Diagnostics completed: 7,326 passed / 9 failed / 801 skipped / 55 pending; 96/144 final unique checker cells pass, with 48 desktop Schedule text-floor failures. These are not gates for the published/current candidate. Its source/mirror close checks pass and its owned database is stopped. [Full diagnostic record](release/merge-1-backend/README.md).

Parallel release task status (current, 2026-10-19 18:56 UTC): requested Wave A `c05e0c7` merged at `88a4e94`; separate lint cleanup `9df0f47`; coordinator refreshed through `e7671e6`, giving candidate `0e01046`. Latest premium CSS matches the coordinator exactly. Install/lint pass; TypeScript fails on `useHoldHeight`; full Vitest 7,280 passed / 7 failed / 801 skipped / 55 pending. Browser checker 0/64 after the Availability compiler failure; More passes all eight role/engine samples and both intercepted forms send one POST. Combined confirmed P0 1 / P1 0 / P2 0, with incomplete coverage: blocked, not zero. Backend Coverage test conflict remains; latest backend evidence-only head `1c8254a` rechecked. [Current reports](release/merge-1-wave-a/README.md). Local previews stopped; no deployment/device exposure.

# NEVORA cloud inspection status

Reports branch: `codex/inspections`. Jose's October 19 rolling-merge instruction authorizes merges and pushes to `codex/release-candidate`, plus exactly the three listed candidate-only UI fixes. Source branches remain read only. No `main` or `claude/*` merge/push, deployment, tunnel or device exposure is authorized. This supersedes the earlier inspection-only boundary and rehearsal order.

## Rolling release candidate

Current local publishing target8e18a95 integrates coordinator227150b, backendda2a4e5 and verified-zero Profileea58610. [Current exact-source evidence](release/merge-4-profile/README.md). Source readiness is1/6 verified (Profile); the explicitly requested old Wave Ac05e0c7 remains in the candidate. Every newer Wave A candidate failed its measured exit. Other source exits remain incomplete/not zero. The backend merge conflicts are resolved under Jose’s wording instruction and the supplied coordinator layout. The current source has no unresolved Git merge conflict.

The final gate uses build plus the production artifact marker scan. The retired Inbox flag and absent test:dev:production script are not gates. Device setup uses the reviewed checklist and remains a proposal pending Jose’s approval.

### Historical published0e01046 checkpoint

- Prior rehearsal remote head: `bec0ed4e64be7a4db3351973e1dc9993eeb90e8b` (base + Profile, unvalidated). Its history is recorded in [the retained rehearsal report](release/bootstrap/rehearsal/RELEASE-CANDIDATE-2026-10-20.md); [the earlier rehearsal evidence](release/bootstrap/rehearsal/MERGE-REHEARSAL-2026-10-19.md) is also preserved verbatim. Historical paths and results there belong to those older sessions, not this workspace or candidate.
- Current Wave A candidate `0e01046`: recreated from coordinator `a69dff2`, merged explicitly requested Wave A `c05e0c7`, added lint cleanup `9df0f47`, then refreshed coordinator through `e7671e6`. Latest coordinator `portal-premium.css` matches blob `ecf0761a040924f1613ce1237c6168dbba035c07` exactly. The older unverified Profile rehearsal was not carried forward.
- Backend is not merged into the Wave A candidate: Coverage test conflict remains after the published root-layout resolution. Latest backend `1c8254a` adds evidence only; merge-tree still reports the same seams. The separate backend-first track at the top has its own evidence and is preserved; its results are not substituted for this Wave A candidate.
- Merge only an immutable SHA whose own full exit round is zero in all five areas, or whose `ROUND.md` explicitly says `status: zero` and names an exit round whose five reports confirm zero. A request to run an exit round is not a zero verdict. Recheck any later push before merging it.
- After every clean merge: locked install, TypeScript, lint, full Vitest; unchanged `checks.mjs` on the chat routes and Home/Inbox plus an opened More sheet for every role; five combined reports under `release/merge-<n>-<chat>/` naming fix owners. Push the candidate and add the required timestamp/test/check/P0-P2 line here. Unknown or incomplete evidence is never zero.
- Merge readiness currently: 1/6 verified (Profile `ea58610`, Mac exit round 4). Profile initial wiring waits for both Profile and backend; dead CSS cleanup waits for Wave C and a `src/` class-use search. Final every-page/five-area sweep, build, full tests and `test:dev:production` wait for all six chats.

## Conflicts for Claude

Current requested backend mergecf066dc: both recurrent conflicts resolved from existing source-owner directions. Coverage stays byte-identical to Wave A’s prescribed test. Layout preserves coordinator4d469a4’s current script/data-text-step plus the prescribed async/error hook. [Complete sides and rationale](release/merge-5-backend-da2a4e5/resolution.md). No unresolved conflict in frozenc34043b.

Wave A `7679133` ROUND.md explicitly prescribes its Coverage test, whose blob `18e3861` equals the existing candidate test. The coordinator supplies the root-layout file at `8c4264c`. Both prescriptions were applied verbatim to local verification snapshot `bf6c030`; no newer Wave A UI was merged. Publication and complete gates remain pending in the other release task.

**Current integration `98b037b`: resolved under Jose’s explicit instructions.** Root layout follows the coordinator’s supplied resolution. Coverage assertions use Wave A’s on-screen wording (“1 more needed”, “1 more person needed”, “Choose what to fill”); backend nonwording assertions remain. Backend `c6a5954` is integrated locally. There is no unresolved merge conflict in this candidate. The older conflicts below describe retained historical checkpoints only.

### Historical conflict records

**Historical backend conflict; both choices now prescribed by source owners — candidate `0e01046` (coordinator `e7671e6` + Wave A `c05e0c7`) / backend `1c8254a` (application inputs unchanged from `31ec698`): `src/app/app/schedule/coverage/page.test.tsx`.** Candidate asserts “1 more needed”, “1 more person needed” and “Choose what to fill”; backend asserts “1 needed”, “1 employees needed” and “Choose the requirement”. Both complete sides are in `release/merge-1-wave-a/conflicts/coverage-test-{candidate,backend}.txt`. Merge aborted; no side chosen. Owner: backend / Wave A / coordinator.

**Resolved by coordinator, not applied yet — root layout:** `f691dec` includes `docs/product/specs/codex-joint/RESOLVED-src-app-layout.tsx.txt`, explicitly directing the combined async layout/error hook and text-scale script. This resolves the earlier choice; the backend merge as a whole awaits the separate Coverage test conflict. The supplied resolution is retained with this merge report.

**New semantic integration blocker — Wave A / coordinator:** `src/components/availability-team-list.tsx:7,44` imports/calls `useHoldHeight`, while latest `src/components/kit/hold-height.tsx` exports only `HoldHeight`. `npm run typecheck` on both merged `88a4e94` and candidate-only lint commit `9df0f47` fails with TS2724. Owner: Wave A in coordination with the shared-kit coordinator. This needs a source-branch fix; it is outside the three candidate-only UI edits. No screen version was selected to conceal the incompatibility.

**Resolved — swap summary:** Wave A at `c05e0c7` merges without a swap-summary conflict after coordinator `fa7a09b`. `portal-premium.css` was the sole Git conflict in the Wave A merge; it was replaced with the exact latest coordinator blob from `a69dff2`, as Jose instructed. The retired Inbox endpoint flag is absent and is not a gate or task.

**Historical first attempt — backend / coordinator, `src/app/layout.tsx` (resolution now published above).** Merge input branches are `claude/premium-phase-1` at `fa7a09b07ddc1ffe179110b0fdc41715a1714b09` (candidate side) and `codex/premium-backend` at `31ec6988446607651031c6412b2c9f4c8ccce402` (incoming). Coordinator side: synchronous `RootLayout`, `TEXT_SCALE_SCRIPT`, `suppressHydrationWarning` and a head script that measures root text size for placeholders. Backend side: asynchronous `RootLayout` and the development-only `forceInspectionError('global')` hook. Full unmodified sides: [coordinator](release/bootstrap/conflicts/layout-coordinator.txt), [backend](release/bootstrap/conflicts/layout-backend.txt). No side chosen; merge aborted. Owner: Phase 3 coordinator, who resolves on its branch or directs the backend chat. No candidate backend test result or combined inspection is claimed for this aborted merge.

The older Wave A swap-summary conflict is retained in the rehearsal report. The requested merge at `c05e0c7` confirms it is gone; both swap-summary files merged cleanly.

## Device pass access

Reviewed manual checklist: [DEVICE-CHECKLIST-REVIEWED.md](https://github.com/JoseK0514/NEVORA/blob/a69dff2/docs/product/specs/codex-joint/DEVICE-CHECKLIST-REVIEWED.md), approved by Claude with device access explicitly waiting for Jose. Use this reviewed copy; no manual results are claimed.

**Proposal only; pending Jose's approval. Nothing deployed or exposed.** Safest short phone pass: a temporary HTTPS tunnel restricted to Jose's authenticated identity, forwarding only to a loopback production-mode candidate build on an owned fictional PostgreSQL database. Use the normal Secure session cookie over HTTPS. First verify the build SHA, owned database identity and synthetic seed; supply only temporary test credentials and a fresh session secret, no production environment/secrets. Keep real SMTP/push delivery disabled; use local capture where the production gate allows it, otherwise keep delivery off. Do not enable development-only capture or error switches in production mode.

Cost: no new hosting/database resource or paid plan proposed; existing approved/free tunnel access may have a $0 incremental fee, while the running development machine/cloud session still costs its usual usage. Provider/plan eligibility and any fee must be verified before approval is exercised; no purchase or upgrade authorized. Exposure: the authenticated tunnel provider processes traffic and the phone can reach this synthetic app, including its normal authenticated routes. The local database port, filesystem and other services are not forwarded. A tunnel without an access restriction for Jose is not this proposal.

Teardown: revoke the tunnel/access rule, stop the local app and its owned database, delete temporary capture/session/credential files and synthetic database after the pass, and confirm the HTTPS URL is unreachable. Preserve sanitized inspection evidence and candidate SHA. Alternative if an approved identity-restricted tunnel is unavailable: a separate protected Vercel preview project with an independently seeded fictional database, no inherited production secrets, and delivery off/captured. That alternative needs an environment/cost inventory and Jose's explicit approval before project/database creation or deployment.

## Queue (priority order)

| Chat | Source / nominated app commit | Current gate |
|---|---|---|
| Phase3 | coordinator227150b, exit round5 | Integrated; independent source exit open |
| Wave A |a05f26a, exit round2 | Full exit incomplete; ST-WA-7 through11 pass; old shared field CSS fixed by latest coordinator |
| Wave B |564d193 handoff /9bd265e app, exit round4 | Open; independent loop owns source sweep |
| Wave C |5f7c166, exit round4 | Not zero/incomplete; preserve its publishedWR-WC-25 andTC-WC-28 findings |
| Profile |ea58610 handoff /caef395 app, exit round4 | Five Mac reports zero; merged locally, initial-read4ff37e5 measured |
| Desktop |8012d97, exit round5 | Open; independent loop owns source sweep |

## Inspection results (historical summary; latest checkpoint above)

No completed cloud zero exits. Wave C round 3 has two verified P1s so far; the five-area sweep and matrices remain incomplete. Unknown evidence is not zero. Missing handoffs and preview-load failures are not UI defects.

Start each round from the exact commit in its handoff. Round 1 and exit rounds require all five full sweeps. Later rounds re-check earlier finding IDs and touched surfaces; automated checks still run the full matrix each round. Refresh the coordinator brief and tooling from `claude/premium-phase-1` before each round.

## Boundaries

All page submissions must be answered, held or aborted in the browser. Only fictional preview seeding and sign-in are permitted outside that interception. Passwords and browser storage states stay outside this branch. Simulator keyboard checks and Jose’s real-device pass remain on the Mac.

## Poll log

2026-10-19 18:01:09 UTC · all six branches fetched · no `ROUND.md` handoffs available
2026-10-19T18:08:18.138164+00:00 · all six branches fetched · Wave A round 2 and Wave C round 3 available; others await handoffs
2026-10-19 18:18:49 UTC · queue fetched · Wave A round 2 explicitly retargeted to c05e0c7; prior preview stopped and preliminary checks superseded · other handoffs unchanged
2026-10-19 18:22 UTC · Wave C round 3 on b109ec3fea10418fb9f5c9da2af0a1e561dc2678 · P0 0, P1 1, P2 0 · not zero
2026-10-19T18:28:55.380713+00:00 · all six branches fetched · Profile round 4 available on 829dfe6; Phase 3, Wave B and Desktop still await handoffs
2026-10-19 18:36 UTC · Wave C round 3 on b109ec3fea10418fb9f5c9da2af0a1e561dc2678 · P0 0, P1 2, P2 0 · not zero

2026-10-19 18:56 UTC · merged Wave A at c05e0c7 (candidate 0e01046, coordinator e7671e6) · tests 7280/8143 (7 failed, 801 skipped, 55 pending) · checks fail 0/64 · combined P0 1 / P1 0 / P2 0 confirmed, partial coverage · blocked
2026-10-19 18:56 UTC · candidate-only lint fix 9df0f47 · lint 0 warnings; full tests/checks rerun on 0e01046 as above · blocked by source integration, not lint

2026-10-19T18:49:01.144936+00:00 · all six branches fetched · all six handoffs now available; Phase 3, Wave B and Desktop added; Wave C requests exit round 4

2026-10-19 18:57:33 UTC · Wave A round 2 on c05e0c7cd703fbf19e05e60bb4d488e1d9b19bb0 · P0 0, P1 1, P2 0 · not zero

2026-10-19 19:10 UTC · coordinator 8c4264c merged locally at 25dca8d · install/type/lint pass · full tests and combined checks pending · blocked
2026-10-19 19:10 UTC · backend 1c8254a into candidate 25dca8d aborted · Coverage test sides retained under release/merge-2-coordinator/conflicts/ · no choice, clean candidate retained

2026-10-19 19:16:45 UTC · Phase 3 round 4 on f691decb5496377a35ca7777d3025674f45bb94e · P0 0, P1 1, P2 0 · not zero

2026-10-19 19:16:45 UTC · Profile round 4 on 829dfe6cf45beb71b77db573c0263c60a5f69856 · P0 0, P1 0, P2 2 · not zero

2026-10-19 19:16:45 UTC · Wave C round 4 on 5f7c1660a9ca86f7c8fa3ed4e07a9453c000a3e8 · P0 0, P1 0, P2 0 · not zero

Wave C round 4 has 0 newly verified defects so far, with incomplete coverage. “not zero” above means no completed five-area exit certificate. Confirmed legacy ST-02 and WR-21 are fixed on this commit.

2026-10-19 19:43 UTC · backend source-owner resolutions read and applied to local verification bf6c030 · tests pending · install/type/lint pass · publication remains with the other active release task · no deploy/exposure

2026-10-19 19:52 UTC · verification bf6c030 full suite · tests 7332/7336, 801 skipped, 55 pending · four timeouts, targeted retry running · blocked; no passing planner or full-suite verdict

2026-10-19 19:56 UTC · all six ROUND.md files fetched/read · Profile ea58610 status zero verified; Wave A 7651490 exit still unverified, Wave B status open, Wave C full exit incomplete, Desktop 8012d97 requests exit round 5, Phase 3 4ed2339 handoff remains non-exit round 4

2026-10-19 20:03 UTC · verification bf6c030 retry · tests122/126 · checks not run on this SHA · no full-suite green, not published · blocked

2026-10-19 20:06 UTC · all six handoffs reread after successful fetch · verified zero1/6 (Profile); Wave B exit4 remains open; coordinator5f6ed19 and backendda2a4e5 are newer than published candidate · this verification task stopped, no owned running jobs
2026-10-19 20:14 UTC · Phase 3 round 4 on f691decb5496377a35ca7777d3025674f45bb94e · P0 0, P1 5, P2 0 · not zero

ID cross-reference: this cloud report’s **TC-P3-32 means Availability’s From/Until labels** (the chat calls those TC-P3-33 in round 5). The chat’s separate TC-P3-32 concerns dates. Cloud **ST-P3-24** means the Availability pending-button jump; the chat’s **P3-ST-24** is a placeholder item. Preserve these distinct IDs when re-checking.

2026-10-19 20:16 UTC · post-merge Profile initial-read c34043b · install/type/lint pass; full tests/checks running · publication pending
2026-10-19 20:25:24 UTC · Wave C round 4 on 5f7c1660a9ca86f7c8fa3ed4e07a9453c000a3e8 · P0 0, P1 1, P2 0 · not zero

New WR-WC-25: phone dialog buttons collapse to 52px at 200% while their labels need 88px, making parts unreadable. The earlier blank swatch and toast overlap remain independently fixed. Full exit coverage is incomplete.

2026-10-19 20:27:13 UTC · Wave C round 4 on 5f7c1660a9ca86f7c8fa3ed4e07a9453c000a3e8 · P0 0, P1 2, P2 0 · not zero

TC-WC-28 adds Account recovery’s verification textarea edge: #D5DAD9 on white = 1.41:1 in both browsers/roles. The stronger shared textarea rule overrides Wave C’s intended 3.45:1 edge; coordinate the shared-style update.

2026-10-19 20:36 UTC · c34043b full suite · tests7350/7352 executed (801 skipped,55 pending) · two timeout files isolated reruns pending · checks pending · blocked pending gates; publication remains authorized
2026-10-19 20:41:21 UTC · Phase 3 round 5 on 676358cd1d30c9c8027d4563bf709c434a9cfbe5 · P0 0, P1 4, P2 0 · not zero

2026-10-19 20:41:21 UTC · Profile round 4 on ea58610bf3bdc85319895689c3d88e064f6a76d5 · P0 0, P1 1, P2 1 · not zero

2026-10-19 21:05 UTC · merged Profile at ea58610, backend at da2a4e5, coordinator through227150b · candidate8e18a95 verified/push up-to-date · tests7352/7352 executed (801 skipped,55 pending; final Coverage6/6, fresh Coverage/Profile22/22) · checks fail92/180 · combined P0 0 / P1 8 / P2 0 partial · blocked

2026-10-19 21:05 UTC · candidate-only Profile initial-read4ff37e5 and lint cleanup9df0f47 · canonical gate evidence above; local alternativec34043b retained, not republished · phone proposal pending, no exposure
2026-10-19 20:55:56 UTC · queue update · coordinator exit round 5 retargeted from 676358c to **227150b** (ROUND.md itself changed; Availability outcome and focus-ring fix); normal and --large previews restarted on the new exact commit. Wave A exit round 2 retargeted from 7f75dc4 to **a05f26a** (pending-width rotation fix). Old negative and positive evidence remains scoped to its original SHA; neither new target has a cloud zero verdict.

2026-10-19 21:08:43 UTC · Wave A round 2 on a05f26a74b2979ce0efe1532f7f70d7064261bb9 · P0 0, P1 1, P2 0 · not zero

2026-10-19 21:08:43 UTC · Wave B round 4 on 9bd265ebb5d2bdfa98eb51f4b386018d5aeecbf7 · P0 0, P1 2, P2 0 · not zero

2026-10-19 21:25:23 UTC · Phase 3 round 5 on 227150bb2658cb5a30db3c644b6b8f76031d3c79 · P0 0, P1 4, P2 0 · not zero

2026-10-19 21:25:23 UTC · Desktop round 5 on 8012d9790e72987140f939c7d70e1df9612ea009 · P0 0, P1 0, P2 1 · not zero

2026-10-19 21:33:53 UTC · Phase 3 round 5 on 227150bb2658cb5a30db3c644b6b8f76031d3c79 · P0 0, P1 6, P2 0 · not zero

2026-10-19 21:33:53 UTC · Desktop round 5 on 8012d9790e72987140f939c7d70e1df9612ea009 · P0 0, P1 0, P2 1 · not zero · shortcut ID disambiguated as TC-P4-24; bulk jobs temporarily paused for memory, completed work preserved

2026-10-19 21:44:50 UTC · Phase 3 round 5 on 227150bb2658cb5a30db3c644b6b8f76031d3c79 · P0 0, P1 9, P2 1 · not zero

2026-10-19 21:44:50 UTC · Wave A round 2 on a05f26a74b2979ce0efe1532f7f70d7064261bb9 · P0 0, P1 1, P2 0 · not zero

2026-10-19 21:44:50 UTC · Wave B round 4 on 9bd265ebb5d2bdfa98eb51f4b386018d5aeecbf7 · P0 0, P1 2, P2 0 · not zero

2026-10-19 21:44:50 UTC · Wave C round 4 on 5f7c1660a9ca86f7c8fa3ed4e07a9453c000a3e8 · P0 0, P1 2, P2 0 · not zero

2026-10-19 21:44:50 UTC · Profile round 4 on ea58610bf3bdc85319895689c3d88e064f6a76d5 · P0 0, P1 1, P2 1 · not zero

2026-10-19 21:44:50 UTC · Desktop round 5 on 8012d9790e72987140f939c7d70e1df9612ea009 · P0 0, P1 0, P2 1 · not zero
