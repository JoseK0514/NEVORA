**Independent UI finding closure addendum — 2026-10-27 UTC**

Authored by the original independent Senior UI reviewer (`/root/communications_ui_review`), reporting directly to Jose. This addendum records my own recheck and closure. It does not rewrite [INDEPENDENT_UI_REVIEW.md](/workspace/nevora-evidence/reviews/INDEPENDENT_UI_REVIEW.md), whose SHA256 remains `fd02a147838bf7746b62bd9591d63c8ecca857a4010aca2cb7a4f5d008bdb33c`.

**Targeted UI recommendation: GO WITH CONDITIONS.** UI-COM-001 is **VERIFIED / CLOSED by its author**. UI-COM-R1's post-release evidence gap is **VERIFIED / CLOSED by its author** for the exercised late-committed response. UI-COM-002 and UI-COM-003 remain **OPEN, P3, nonblocking conditions**. This removes the original UI-COM-001 acceptance block. It does not declare the communications batch accepted: the full targeted file still has an unrelated CR-1 failure, and final affected/full independent QA and other gates remain pending with their owners.

**Frozen inputs and actual results**

The production correction was frozen at `8ec15116c1ee37b8b46304d1cbcca439c7778dc7`. The enlarged-text regression and revised unrelated CR-1 oracle were frozen at `4f2f5c7fdf24fb805d4be8dbe662344eb56c3d41`; that commit changes only `employee-mobile-communications-review.integration.ts` relative to 8ec15116. At final source inspection, HEAD had advanced to test-only candidate `e05546badebd421c4873dfc8846e6810b956b05e`. The compose, canonical validator, private-reader and recovery files still matched the 4f2f5c7f manifest. The frozen 4f2f5c7f versions of all six relevant files, including both browser test files, matched its mirror manifest via Git blob hashes. I do not transfer an unrun whole-suite success claim to e05546ba.

| Evidence reviewed | Actual outcome and limit |
| --- | --- |
| `review-red`, 79ad39a4309db96d7c3c4df9124b71d101bd4706 | The log reproduces the original custom validation defect: expected Title `aria-invalid="true"`, received `null`. I inspected the RED form failure PNG; it shows the over-limit title and generic unrelated-fields alert. |
| `review-green`, 8ec15116 | The UI-COM-001 case passes all three engines for five invalid input cases and correction. The actual-committed late-response R1 case also passes all three. The overall file is **3/4**, with a CR-1 oracle timeout; its directory name is not an all-green result. |
| `review-green-2`, 4f2f5c7f | The UI-COM-001 case, now including 320px/200% Title validation, passes all three engines. The R1 actual-committed case again passes all three. The overall file is **3/4**, with a CR-1 statement timeout. This run records 16 completed checkpoints and 31 captures; it is not full acceptance. |
| Canonical validation and related unit log | The supplied log records 33/33 passing tests across four files, including the validator's 12 Unicode/control/shape regressions. I reviewed the helper extraction against the preceding implementation; its normalization, code-point limits and rejected control characters are preserved. I did not execute these unit tests myself. |

I read the RED log and both completed later browser logs in `.superpowers/sdd/employee-mobile-communications-plan/`. The `review-green-2/results.json` SHA256 is `a7ec1319b656622d225e1a3e0cd1442c09e879887d3b047fb43fd066b56fe6fb`. It retains 18 warnings and one expected fault-stage console error; it has no `pageerror` or unexpected console error. Both later ownership records report closed, source verified and mirror verified. I started no competing browser and changed no application source, tests, index, or HEAD.

**VERIFIED / CLOSED — UI-COM-001, P2**

The new code at [messages-compose.tsx:18](/workspace/NEVORA/src/components/employee-mobile/messages-compose.tsx:18) retains actual field errors and applies first-invalid focus after their DOM update. Title and Message use the same `validCommunicationText` helper as the canonical validator. Expiry uses the canonical local date/time conversion and distinguishes invalid date/time from an expiry in the past. Editing clears the relevant stale field error while keeping the draft.

At [messages-compose.tsx:37](/workspace/NEVORA/src/components/employee-mobile/messages-compose.tsx:37), Title, Message and Expiry now receive `aria-invalid`, their existing hint and the actual field error's ID in `aria-describedby`, and a nonempty field-specific explanation. Native labels and native missing-required behavior remain in place. A corrected draft reaches deliberate audience review; the error branch does not offer Send update.

The completed three-engine case exercises a 121-character ASCII Title, whitespace-only Title, a 2,001-character Message, a Message containing the rejected bidi override, and a past Expiry. It checks `aria-invalid`, that the actual invalid control is the active element, that its description resolves to a nonempty alert, and that Send update is absent. It then corrects the values and successfully reviews the audience. The enlarged Title case repeats the same association/focus assertions at 320×844 with 200% root text, and asserts no horizontal document overflow, before restoring defaults.

I personally inspected all fifteen default-size error full pages from each later run. They show a readable field-specific explanation beside the affected field and visible focus on that field. I also inspected all three 320/200% Title-error full-page PNGs from 4f2f5c7f. WebKit exposes the complete, readable inline explanation. Chromium and Firefox paint their fixed navigation over most of that paragraph at the full-page capture position; I inspected those images but do **not** claim to have seen the obscured paragraph pixels. Their actual DOM/focus assertions pass. This capture limitation does not establish an unreachable error or reopen the semantic P2; an unobscured viewport capture remains useful supplementary evidence.

The source review, reproduced RED, three-engine field/focus/association assertions, corrected-review result, default error pixels and enlarged-text sample meet the substantive closure requirement. I close UI-COM-001. This is browser artifact/code verification, not a physical screen-reader or native phone keyboard certification.

**VERIFIED / CLOSED — UI-COM-R1 post-release evidence gap**

The dedicated `UI-COM-R1` test first executes a real publication against the owned database and observes its committed server reply, then holds that reply from the browser. The actual Owner module writer disables Updates. A fresh own read produces immediate unknown recovery state; the test then releases the real committed reply **before** restoring Updates.

After release, all three engines assert no publication-success heading, no Title field, unknown status retained, and disabled original lookup. I inspected all six late-committed after-release PNGs from the two later runs and their six corresponding HTML files. They show the same honest result: the original submission has not been confirmed in the current UI, Updates is off, Check submission status is disabled, and private compose inputs are absent. The 4f2f5c7f HTML also contains no input, textarea or select and no success heading.

After module restoration and a fresh read, the exercised case deliberately checks the original submission, reaches the recorded publication, and confirms one matching original operation row. This addresses the specific gap in my original report with actual after-release pixels and DOM, including a committed late reply. It is stronger than treating the old pre-release sample as proof of the intervening screen. The source's generation/abort fence remains consistent with the observed result.

I close UI-COM-R1's evidence gap for this exercised sequence. The strengthened original affected test now also contains a synthetic-outcome after-release capture/assertion, but that original test is not part of the completed review-only invocation inspected here; its fresh affected rerun remains a separate gate. No broader hosted, reload, operating-system background or physical-device guarantee is implied.

**Exactly which new pixels I inspected**

The new recheck ledger is [PERSONALLY_INSPECTED_CLOSURE_PIXELS.json](/workspace/nevora-evidence/reviews/ui-closure-inspection/PERSONALLY_INSPECTED_CLOSURE_PIXELS.json). It enumerates **40 unique PNG files**, each with candidate, path, dimensions, hash and inspection method. This is additional to the original report's separate 68-file personal ledger; it is not a claim to inspect every captured state.

| Run and exact PNG selection | Count |
| --- | ---: |
| `review-red/chromium-form-and-original-failure.png` | 1 |
| `review-green/{chromium,webkit,firefox}-form-and-original-invalid-{title-long,title-empty,body-long,body-control,expiry}.png` | 15 |
| `review-green/{chromium,webkit,firefox}-late-committed-module-fence-after-release.png` | 3 |
| `review-green-2/{chromium,webkit,firefox}-form-and-original-invalid-{title-long,title-empty,body-long,body-control,expiry}.png` | 15 |
| `review-green-2/{chromium,webkit,firefox}-form-and-original-invalid-title-320-text200.png` | 3 |
| `review-green-2/{chromium,webkit,firefox}-late-committed-module-fence-after-release.png` | 3 |

Inspection sheets are retained in `ui-closure-inspection/`. Full-page fixed-navigation overlays are treated as capture-position limitations, not automatically as inaccessible content.

**Conditions and remaining gates**

UI-COM-002's arbitrary acknowledgement word breaks and UI-COM-003's minor short-page canvas seam were not repaired by this correction and remain open as originally authored. They remain nonblocking local UI conditions. Their closure still belongs to this author after relevant fresh pixels; operating acknowledgement alone is not closure.

The CR-1 failure in the overall review file remains with its independent code/QA owners. This addendum neither diagnoses it away nor closes it. The operating team is refining its barrier; final three-engine affected checks, the complete review file, full independent QA, current unit/type/lint/SQL evidence and applicable source custody must still pass on the final frozen input before batch acceptance. All original physical-device, assistive-technology, hosted, assembly and release limits remain in force. No production or hosted release authorization is claimed.
