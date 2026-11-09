**Independent UI review — Employee mobile Notifications / Updates**

Authored 2026-10-27 UTC by the independent Senior UI reviewer (`/root/communications_ui_review`), reporting directly to Jose. This is the original review record. Subsequent evidence and author-owned closure must be appended; do not rewrite this assessment as if the original candidate passed.

**UI recommendation: NO-GO for local batch acceptance until UI-COM-001 is resolved and independently rechecked.** UI-COM-002 and UI-COM-003 are nonblocking conditions. No P0/P1 UI blocker was established. This recommendation covers the scoped communications batch, not the rest of Phase 2, production, hosted deployment, physical devices, assistive technology, assembly, or release authorization.

Candidate: `f7e331a7859ef55400eb1ce1e6420d4b5a9fdff9`. Review base: `564c71371e16f528a94aa242e42bf906d5890314`. HEAD matched the candidate and the worktree was clean when inspected. The green mirror manifest names this candidate; the eleven relevant UI/lifecycle/validation/browser-test files checked against its recorded hashes matched. I made no source, test, index, or HEAD changes and started no browser runtime.

I applied `AGENTS.md`, `.codex/skills/nevora-independent-ui-oversight/SKILL.md`, the executive routing skill and operating-model document, the current portions of `DESIGN.MD`, the approved Employee mobile teal spec, the communications execution plan, and the Cloud handoff. The approved teal direction and Employee/Lead own-information boundaries were treated as settled.

**Evidence and personal inspection boundary**

The supplied affected-run evidence is `/workspace/nevora-evidence/cloud-green/results.json` (SHA256 `86869114798ead5053ea9a3c52a53b906f1f580e2a5134fb2b43c5ed2dc61e0b`). I inspected its checkpoint definitions and results, all fifteen clearance JSON files, the mirror metadata, the relevant UI/lifecycle code and route separation. The results record 23 checkpoints per engine, 69 total, 210 captures and 90 sampled action contrasts, with minimum ratio `6.089452668960573:1`. It contains zero `pageerror` entries and zero unexpected non-warning console errors. These are supplied automated results I reviewed, not browser interactions I personally executed.

Diagnostics remain real: 26 warning entries are retained (Chromium 9, WebKit 11, Firefox 6), alongside narrowly expected fault-stage console errors and request cancellations/failures. I did not relabel all retained diagnostics as absent or clean. The contrast sample measures the selected action in each case; it is not proof that every text, focus ring, border, and native subcontrol passed a comprehensive contrast audit.

I personally inspected **67 unique green PNGs and one historical RED PNG**. The complete, enumerated filenames, dimensions, hashes, and inspection method are in [PERSONALLY_INSPECTED_PIXELS.json](/workspace/nevora-evidence/reviews/ui-inspection/PERSONALLY_INSPECTED_PIXELS.json). This does not imply personal pixel inspection of the other 143 green captures.

| Personally inspected pixels | Exact selection | Count |
| --- | --- | ---: |
| Chromium complete viewports | `chromium-{notifications,updates,detail,compose,audience}-{light,dark}-{320,390,430}-viewport.png` | 30 |
| WebKit complete viewports | `webkit-{notifications,updates,detail,compose,audience}-{light-320,dark-430,text-200}-viewport.png` | 15 |
| Firefox complete viewports | `firefox-{notifications,updates,detail,compose,audience}-{light-320,dark-430,text-200}-viewport.png` | 15 |
| Chromium complete enlarged full pages | `chromium-{notifications,updates,detail,compose,audience}-text-200.png` | 5 |
| Chromium complete normal full pages | `chromium-{compose,audience}-light-390.png` | 2 |
| Historical RED complete failure viewport | `/workspace/nevora-evidence/cloud-red/chromium-failure.png` | 1 |

Labelled inspection sheets under `ui-inspection/` preserve original pixel dimensions. Long full pages were partitioned into contiguous unscaled strips so their words could be inspected. Their fixed navigation appears at its screenshot capture position; an overlay in a full-page PNG alone is not evidence of unreachable content. The 200% cases use a 320×844 CSS-pixel viewport and a 200% root font setting, in dark theme. They are not physical-device Dynamic Type or full-browser zoom tests.

**ISSUE UI-COM-001 — P2, material: custom compose validation does not identify and associate the invalid field**

Status: **OPEN**. Evidence: source-confirmed defect; I did not execute its browser reproduction. The supplied captures show valid populated compose fields and therefore do not close this issue.

At [messages-compose.tsx:17](/workspace/NEVORA/src/components/employee-mobile/messages-compose.tsx:17), any rejected draft receives the same alert: “Check the title, message, location and date. Use plain text within the shown limits.” No invalid-field identity is retained and this branch returns without focusing the invalid control. At lines 26–30, Title/Message reference only their limit hints, Expiry references only its help, and the alert has no ID. None receives `aria-invalid` or an error description. The past-expiry branch does focus Expiry, but its error is still not associated with that field.

This matters for values that native `required` validation accepts but the real business validator rejects: a whitespace-only title, 121 ASCII title characters (the native maximum permits 240 UTF-16 units), or text with rejected control characters. The canonical validator correctly rejects these values; the UI does not tell a keyboard or screen-reader user which field needs repair. A generic alert at the end of the form cannot satisfy the plan's “invalid actual-field associations” requirement.

Concrete reproduction for the operating team: use an authorized current compose page with a valid team location and body, enter a 121-character ASCII title, and choose Review audience. Repeat with a whitespace-only title and with a valid but past expiry. Verify which field receives focus, its error identity and accessible description, whether the invalid field is marked invalid, and that no preview/send becomes available. Keep native missing-required behavior and Unicode code-point limits intact.

Closure requires field-specific explanation linked to the actual invalid control, a deliberate first-invalid focus result (the past-expiry case must keep its appropriate focus), preserved draft and no preview/command admission. Supply RED→GREEN interaction evidence on the next frozen candidate, including DOM/accessibility association checks and readable error captures at 320/200% and default size. I must independently review the resulting code and evidence before closing this finding. No new product policy or redesign is needed.

**ISSUE UI-COM-002 — P3, nonblocking: acknowledgement terms break at arbitrary letters at 320/200%**

Status: **OPEN, nonblocking local condition**. This is personally observed pixel evidence, not an inferred overflow failure. Examples, with coordinates in the original PNG:

- `chromium-detail-text-200.png`, region `(36,1400)–(284,1640)`: the primary button reads “Acknowledg” on one line and “e update” on the next.
- `chromium-updates-text-200.png`, region `(65,930)–(280,1080)`: the own status reads “Acknowledge” followed by an isolated “d”.
- `chromium-audience-text-200.png`, region `(36,2390)–(284,2650)`: “acknowledgement” leaves an isolated final “t”.
- `webkit-detail-text-200-viewport.png`, region `(36,0)–(284,290)`, and `firefox-audience-text-200-viewport.png`, region `(36,0)–(284,190)`: the same acknowledgement wording splits mid-word.

See [word-readability-regions.jpg](/workspace/nevora-evidence/reviews/ui-inspection/word-readability-regions.jpg). The narrow card interiors inherit `overflow-wrap:anywhere` from [requests.css:7](/workspace/NEVORA/src/components/employee-mobile/requests.css:7), with nested padding in [messages.css:20](/workspace/NEVORA/src/components/employee-mobile/messages.css:20) and line 27. All letters remain present and actions remain operable; I am not asserting a formal WCAG text-loss violation. The result falls short of the plan's word-readability expectation and makes the distinction between read and acknowledgement harder to scan. The heading-width oracle checks only `h1`; it does not detect these words.

Closure should preserve the approved type system and enlarged-text behavior while giving these terms natural or deliberate syllable breaks. Recheck the actual own status, acknowledgement action and review copy in all three engines at 320/200%, with no clipping or loss of navigation clearance. Do not reduce the assigned feature scope or hide the text.

**ISSUE UI-COM-003 — P3, minor visual polish: short-page dark canvas seam**

Status: **OPEN, nonblocking local condition**. In `chromium-detail-dark-430-viewport.png` and `firefox-detail-dark-430-viewport.png`, a black area begins around y=700 and continues to y=764, immediately above navigation. In `webkit-detail-dark-430-viewport.png` it spans approximately y=695–765. Sample `(40,750)` is exactly RGB `(0,0,0)` in all three, different from the approved `#0c1817` canvas. The same short-page area is white in light captures. See the `*-dark-430-viewports.jpg` inspection sheets.

This is a canvas continuity issue below the footer. It hides no text, state or action, changes no information, and is not a material acceptance blocker. The exact CSS ancestor responsible was not isolated by live computed-style inspection. The relevant mobile frame/root styling is [requests.css:5](/workspace/NEVORA/src/components/employee-mobile/requests.css:5) and [messages.tsx:44](/workspace/NEVORA/src/components/employee-mobile/messages.tsx:44). If corrected later, verify the short page in both themes without changing the settled teal design or desktop shell.

**VERIFIED — bounded visual, interaction and information results**

- **UI-1:** The inspected default-size light/dark 320/390/430 Chromium screens retain consistent title, supporting copy, list row, primary action and quieter status hierarchy. Regular icons remain secondary. The enlarged complete pages retain content and vertical scrolling. The explicit word-break issue above is the exception.
- **UI-2:** The valid compose captures show real labels, native inputs/select/textarea, visible textarea focus, clear action separation, and a review surface reached without removing the draft. Code uses `htmlFor`/`id`, native `required`, and explicit heading/return-row focus. The supplied test checks real Title→Message Tab movement and return-to-origin focus in all engines. I did not personally perform keyboard or touch interaction.
- **UI-2:** All fifteen recorded enlarged-text clearance observations place Refresh above the opaque fixed navigation, with a 55.875–56.922px gap. Recorded Refresh heights are 55–55.2px and navigation heights 248–248.6px. The browser matrix asserts 48px primary/44px secondary selected action minima. These measurements do not establish the geometry of every interactive target or native picker subcontrol.
- **UI-3:** List search is explicitly limited to “this page”, partial data gets a current-source warning, and no-match copy does not claim an all-history empty inbox. Read, acknowledgement, publication and original submission status use distinct copy. The inspected detail shows the acknowledgement consequence before its button and says opening does not record acknowledgement. Compose preview shows a current audience count and location without coworker receipt names or a delivery claim.
- **UI-3:** Withdrawal code requires a separate explicit confirmation and explains that it does not undo earlier reading/acknowledgement. Publication success says recorded, with reading and acknowledgement separate. Notifications have destination actions without a generic Employee Mark read control. Employee compose stays Today’s team with optional acknowledgement, not management authoring.
- **UI-2 / privacy:** The supplied checkpoints cover held initial read, read error and recovery, mounted draft pause/resume, genuine empty account and draft isolation, unassigned-author refusal, module disable/restoration, real session revocation, lost-response receipt lookup after route change/source withdrawal, and deliberate original replay after not-found. The source keeps mounted authority-scoped memory above disposable content, removes private fields when the current read is absent/denied, and gates new commands on current exact-path admission. I reviewed these assertions and code; there are no personally inspected green pixels for these non-matrix states.
- **Desktop boundary:** The route adapters preserve incumbent Employee desktop and Manager/Owner branches; message CSS is scoped to the Employee/Lead mobile root/media rules. The supplied three-engine checkpoint asserts no visible `.em-messages` at 1440px. I did not inspect a desktop screenshot or certify all management interactions.

**RISK UI-COM-R1 — pending-module after-release evidence remains narrower than the checkpoint name**

The latest callback at [use-messages.ts:11](/workspace/NEVORA/src/components/employee-mobile/use-messages.ts:11) now pauses recovery when a current ready read reports Updates off/unavailable. The recovery controller increments its generation, aborts the pending request, retains the original operation and publishes unknown on authorization loss; stale completions are fenced at [recovery.ts:34](/workspace/NEVORA/src/lib/communications/recovery.ts:34) and line 46. This is consistent with the intended immediate fence.

However, [employee-mobile-communications.integration.ts:95](/workspace/NEVORA/src/test/integration/employee-mobile-communications.integration.ts:95) stores `permissionFenced` **before** `releasePending()`, then asserts the stored value after release. It proves the immediate pre-release unknown state and later recovery after restoration; it does not inspect the settled off-module UI after the held response has been processed. None of the green matrix PNGs captures that interval.

I inspected the historical RED `chromium-failure.png`: after release it already shows “The result hasn’t been confirmed”, a disabled Check submission status action, the Updates-off explanation, and no compose fields. That historical image must not be described as a final-candidate failure, nor does it establish final-candidate post-release success. The original failure concerns the earlier sample timing.

No surviving post-release bug is established by this review. For complete closure of this timing gap, provide coordinated same-source evidence after release and settled processing **before** module restoration: DOM and screenshot showing no stale success/private form/new action admission, unknown original operation retained, lookup disabled while off, then enabled deliberate original lookup after restoration. A late committed response should remain fenced as well. I have requested this through the operating coordinator; I have not launched a competing runtime.

**RISK — remaining acceptance limits**

The current affected-run artifacts are not the fresh full combined acceptance run, SQL/unit/type/lint gates or final code review. Those remain with their actual owners and must be reported on the final frozen source. This review does not certify screen readers, physical touch, software keyboards/native picker behavior on actual phones, safe-area/OS background handling, forced reload recovery, full browser zoom, hosted operation, worker delivery, source assembly, or production. Expiry was blank in the inspected native controls; a populated expiry at enlarged text/native picker interaction has not been personally verified here.

**Unresolved items and next gate**

UI-COM-001 remains a material local acceptance issue. The operating team may implement a bounded correction after owned runtime teardown, but it cannot close the finding. Return the new frozen candidate, meaningful regression result and error/focus evidence to this author for recheck. UI-COM-002/003 remain nonblocking authored conditions; UI-COM-R1 remains an explicit evidence gap until the described post-release evidence is independently reviewed. The approved workflow scope and visual direction remain the review authority. No production or release authorization is implied.
