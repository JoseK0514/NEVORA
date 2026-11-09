**Independent final UI consistency review — Employee mobile Notifications / Updates**

**UI recommendation: GO WITH CONDITIONS** for frozen candidate `8435c3d81734b1fc4bb8ac574368b331a9e99b9d`. Authored 2026-10-27 UTC by the original independent Senior UI reviewer (`/root/communications_ui_review`), reporting directly to Jose. No material UI finding remains open within this review's scope. UI-COM-002 and UI-COM-003 remain open, nonblocking P3 conditions.

This is a scoped local UI recommendation. The broader QA-owned 20-file / 176-case combined run is still in progress at this report's cutoff. The communications cases below have actually completed; I make no full-run green or overall batch acceptance claim. Independent QA owns its final verdict. No hosted, production, physical-device or assistive-technology acceptance is implied.

**VERIFIED — source consistency and prior record**

I independently compared the reviewed product correction at `8ec15116c1ee37b8b46304d1cbcca439c7778dc7` with 8435c3d8. Their only tracked differences are three integration test files and `vitest.employee-mobile-communications.config.mts`. Product code, assets and application configuration are byte-equivalent. HEAD matched 8435c3d8; the visible working-tree changes were documentation only. The six relevant UI, validator, recovery and browser test files match both final communications mirror manifests. Both completed communications runtimes record the exact candidate, closed custody, source verification and mirror verification.

The original reports remain unchanged:

- [INDEPENDENT_UI_REVIEW.md](/workspace/nevora-evidence/reviews/INDEPENDENT_UI_REVIEW.md), SHA256 `fd02a147838bf7746b62bd9591d63c8ecca857a4010aca2cb7a4f5d008bdb33c`.
- [UI_FINDING_CLOSURE.md](/workspace/nevora-evidence/reviews/UI_FINDING_CLOSURE.md), SHA256 `5b7fd5e34c0dfae81a4a0daf952da24bd0a165ee26b130d19c9a1e31ddb9105e`.

This report adds final-candidate evidence to those authored findings and closure; it does not erase the earlier RED runs or the earlier 3/4 results. The source comparison and mirror checks are retained in [SOURCE_CONSISTENCY.json](/workspace/nevora-evidence/reviews/ui-final-inspection/SOURCE_CONSISTENCY.json). I changed no product files, tests, index, HEAD or prior reports and launched no browser runtime.

**VERIFIED — completed current communications evidence**

Evidence root: `/workspace/nevora-evidence/independent-qa-remediation/8435c3d8/combined/`. I inspected the actual result JSON files, completed-suite lines in `stdout.log`, checkpoint definitions, relevant source, and the pixels and HTML enumerated below.

| Completed case | Actual result |
| --- | --- |
| Main communications browser case | **1/1 passing**, across Chromium, WebKit and Firefox; 69 checkpoints, 216 captures, 90 sampled action contrasts, minimum `6.089452668960573:1`, zero page errors. |
| Focused communications review file | **4/4 passing**, across all three engines; 21 checkpoints, seven per engine, 39 captures, zero page errors. This includes custom field validation, held-open recovery, optional read versus acknowledgement, refused original lookup and actual committed late reply. |

The main result file's SHA256 is `e2fc40488bd8ba1e11261a8994fa4b555e954a083d9ad2a06239b545cfaefc7d`; the focused review result's SHA256 is `c628d1759793a208504b8e4b130bbcfbbcae6748fa6e86352b3968a76a247c31`.

Diagnostics are retained: the main case has 23 warnings and 15 narrowly expected fault-stage console errors; the focused file has 19 warnings and three narrowly expected fault-stage console errors. Neither result has a page error or unexpected console error. This is not a claim that development warnings disappeared. The 90 contrast samples apply to selected actions, not every text, border or native picker subcontrol.

These are browser executions performed by the independent QA-owned runtime. My work was independent artifact and source inspection, not personally executing live interactions.

**VERIFIED — UI-COM-001 remains author-closed; enlarged-error pixel limitation resolved**

The actual field-validation case passes in all three engines for a 121-character ASCII Title, whitespace-only Title, a 2,001-character Message, rejected bidi-control input and a past Expiry. It checks the invalid control's `aria-invalid`, active focus, nonempty field-error association and absence of Send update, then corrects the values and reaches deliberate audience review. The 320px/200% Title case repeats the real invalid-field checks and verifies no horizontal document overflow.

I personally inspected the new centered `*-invalid-title-320-text200-viewport.png` in all three engines. Each shows the complete field-specific error clearly above the opaque navigation, with Title focus preserved. The prior addendum's Chromium/Firefox full-page screenshot-position limitation is therefore resolved by direct final-candidate pixels. The error uses readable ordinary word wrapping; its complete limit and correction guidance remain visible. See [centered-enlarged-title-errors.jpg](/workspace/nevora-evidence/reviews/ui-final-inspection/centered-enlarged-title-errors.jpg).

The canonical shared validator, native labels, field descriptions, delayed first-invalid focus, preserved draft and deliberate corrected review remain as independently rechecked in the closure addendum. UI-COM-001 stays **VERIFIED / CLOSED by its author**.

**VERIFIED — UI-COM-R1 remains author-closed; both after-release paths now inspected on the final candidate**

I personally inspected the three main pending-operation after-release viewports and matching HTML. After the held outcome response is released and before Updates is restored, each shows unknown original submission status, disabled Check submission status, the Updates-off explanation and no compose fields. This supplements the main test's immediate pre-release assertion with actual after-release DOM and pixels on 8435c3d8.

I also inspected the three focused review captures and HTML after a real server-committed publication reply is released while Updates is off. All retain the same unknown, disabled and private-content-free state without a success heading. After current access is restored, the exercised test deliberately looks up the original operation and reaches its recorded publication with one matching original operation row. UI-COM-R1 stays **VERIFIED / CLOSED by its author** for these exercised sequences.

The complete four-case file now also passes the earlier CR-1 refused-original-lookup scenario in all engines. I inspected its refused and recovered result captures: refusal preserves an unknown original submission while Updates is off; deliberate lookup after restoration shows recorded publication and explicitly keeps reading/acknowledgement separate. The recorded result is not presented as delivered or read. This report records the current passing result; formal closure of code-review findings remains with their independent code-review author.

**Exact personally inspected final-candidate evidence**

The final-candidate ledger [PERSONALLY_INSPECTED_FINAL_PIXELS.json](/workspace/nevora-evidence/reviews/ui-final-inspection/PERSONALLY_INSPECTED_FINAL_PIXELS.json) enumerates **20 PNGs and six HTML artifacts**, with exact paths, dimensions, hashes and inspection method. The following selections are relative to the evidence root above:

| Personally inspected selection | Count |
| --- | ---: |
| `messages/{chromium,webkit,firefox}-module-fence-after-release-viewport.png` | 3 |
| `review/{chromium,webkit,firefox}-invalid-title-320-text200-viewport.png` | 3 |
| `review/{chromium,webkit,firefox}-optional-and-original-refused-original-lookup.png` | 3 |
| `review/{chromium,webkit,firefox}-optional-and-original-original-recovered.png` | 3 |
| `review/{chromium,webkit,firefox}-late-committed-module-fence-after-release.png` | 3 |
| `messages/chromium-notifications-light-320-viewport.png`, `chromium-compose-dark-430-viewport.png`, `chromium-detail-dark-430-viewport.png` | 3 |
| `messages/chromium-detail-text-200.png`, `chromium-audience-text-200.png`, complete full pages via contiguous unscaled strips | 2 |
| `messages/{chromium,webkit,firefox}-module-fence-after-release.html` and `review/{chromium,webkit,firefox}-late-committed-after-release.html` | 6 HTML |

Labelled original-size inspection sheets are retained in `ui-final-inspection/`. This does not imply I personally inspected all 255 final communications captures, other workflow screenshots, or a desktop/device session. The original and closure pixel ledgers retain their separate exact inspection boundaries.

**ISSUE — UI-COM-002 and UI-COM-003 remain open, P3 and nonblocking**

The fresh Chromium enlarged detail and audience full pages still split acknowledgement terms at arbitrary letters, including the acknowledgement action. The fresh dark 430px detail still shows the minor black canvas seam below its footer. These match the original authored conditions, do not hide content or actions, and have not been repaired or self-closed. Their status remains **OPEN / nonblocking**. Their future closure requires this author's recheck of relevant fresh evidence.

The inspected final default-size sample retains the approved teal hierarchy, restrained status/action distinction, native labelled compose controls and opaque navigation. No new material UI inconsistency was observed in this bounded final check.

**RISK / limits and next gate**

The full combined 20-file / 176-case run remains in progress at publication; its earlier completed canonical and communications cases are not a substitute for final completion. Independent QA must publish the actual combined result, source custody and its own acceptance. This report does not certify remaining Phase 2 workflows, physical touch/software keyboards/native picker interaction on actual phones, Dynamic Type, screen readers or other assistive technology, OS background behavior, forced reload, hosted operation, delivery workers, assembly or production. The 200% cases are browser root-text enlargement, not a physical-device accessibility test.

Subject to those distinct gates and retention of the two authored minor conditions, the scoped Notifications/Updates UI is ready for local acceptance on the frozen candidate. Jose's production authority and all existing activation/release controls remain separate.
