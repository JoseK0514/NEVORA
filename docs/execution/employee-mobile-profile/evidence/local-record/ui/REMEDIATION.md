# Employee Profile — independent remediation review

- Reviewer: `/root/profile_local_ui_review`, author of the original findings.
- Frozen candidate: `f52f314ed33f0aafae11afc4cb5fcb1103e5ddff`.
- Original reviewed candidate: `8f1b53d4406e819f6738dbbf29b9559cfaa254a6`.
- Recommendation: **APPROVE — UI GO WITH CONDITIONS**, limited to this Profile batch and the inspected controlled-browser evidence.
- No remaining CRITICAL, HIGH, or MEDIUM findings in this bounded re-review. One LOW condition remains partially open.
- This addendum does not rewrite the original NO-GO report, close another reviewer's findings, or certify the entire Employee mobile product.

## Findings and author-owned disposition

### MEDIUM / VERIFIED CLOSED — UI-PROFILE-001

The 320px/200% deletion label now wraps with readable separation in Chromium, WebKit, and Firefox viewport captures. The Calendar heading also has separated lines in the current Chromium full-page capture. `src/components/employee-mobile/profile.css:40` and `:43–45` now use the semantic unitless body line-height with rem font size. The actual regression at `src/test/integration/employee-mobile-profile.integration.ts:84` rejects visible affected labels whose computed line-height is below 1.4 times font size; all three engines record completion. The source correction, current pixels, and meaningful computed-style assertion together support closure. This is not inferred merely from a test-pass count.

### MEDIUM / VERIFIED CLOSED — UI-PROFILE-002

`src/components/employee-mobile/profile.tsx:39–55` supplies stable keyed siblings in mobile DOM order work details → settings → Calendar, retaining desktop settings → Calendar → work details. CSS no longer reverses visual order. Current full-page pixels show the same mobile sequence. Integration lines 55–57 press native Tab (Mac WebKit Alt/Option+Tab) after focusing More and assert Refresh details, then language are active. Lines 106–107 retain a Calendar element handle across desktop/mobile resizing and verify it remains connected. Recorded engine checkpoints include both checks. I inspected source and recorded execution evidence; I did not personally drive a live keyboard. Reverse Shift+Tab is not expressly asserted by this test and remains an additional coverage limit, not evidence of a remaining order defect.

### LOW / ISSUE PARTIALLY OPEN — UI-PROFILE-003

The sign-out status notice now has the normal 24px side inset and aligns with the disabled button. That portion is VERIFIED corrected (`profile.css:27`). The canvas portion is **not closed**: `webkit-profile-signout-held-native-submission.png` still shows the dark semantic content ending around y=307, then a large pure-black region until the navigation at approximately y=765. The new min-height declaration at `profile.css:3` is therefore insufficient evidence of a visually continuous canvas. This is a transient polish issue, not an asserted logout or permission failure. Parent was notified before the report. Preserve this open item until actual current pixels demonstrate the canvas is continuous; do not mark the whole finding fixed based on the declaration.

## Design-system verification

- VERIFIED: existing live React primitives and native form/disclosure elements remain; no rasterized interface or screenshot substitute was introduced by the remediation.
- VERIFIED: font, color, spacing, radii and control dimensions continue to use the approved Employee teal tokens. The change fixes an inherited fixed line-height rather than introducing a new visual direction.
- VERIFIED: current light320 and dark430 Profile examples retain clear header / own facts / preferences / account structure, appropriate native select arrow inset, and visible focus treatment.
- VERIFIED: loading, failed read and denied-access examples retain calm contextual status copy while removing private identity/work facts. These are visual/source observations; they do not independently certify server authorization.
- VERIFIED WITH LIMITS: newly supplied 320px/200% Support (light), Privacy and Terms viewport captures have readable header line spacing and horizontal fit. Tall full-page captures show natural reflow, stacked disclosures and link organization, but renderer downscaling prevents a claim that every legal paragraph was personally read at native size. Current normal light Support capture is also inspected. The earlier complete absence of enlarged contextual-document evidence is addressed; this is still a sampled matrix rather than exhaustive legal/palette/device verification.
- VERIFIED WITH LIMITS: current Firefox desktop image retains the incumbent desktop tree and the responsive source branch preserves its slot order. This is not a complete desktop regression certification or independent Owner/Manager navigation test.
- RISK / boundary: the JavaScript-disabled prehydration image shows a streaming loading skeleton, not a usable no-JavaScript Profile. No static personal identity is visible in that inspected image. Do not describe this as verified no-JavaScript accessibility or sign-out availability. The broader SSR privacy finding is owned by code review.

## Evidence provenance and limits

Current HEAD resolved to the frozen candidate and git status was clean at review. The preflight9 manifest names the same full SHA. I independently matched current SHA256 values for profile.tsx, profile.css and the Profile integration test to that manifest. Ownership records say sourceVerified=true, mirrorVerified=true, closed=true; no runtime was started by me.

`local-preflight-9/results.json` contains 42 checkpoints (14 per engine), 108 listed captures and 54 sampled contrast results, minimum 5.028921154815613. It also contains ten diagnostics: three expected error entries and seven WebKit unused-preload warnings; do not report an entirely warning-free console. These are inspected existing execution records, not tests independently run by this reviewer. The three extra prehydration PNGs are present, and one was personally viewed.

Nineteen current screenshots were personally displayed. Their exact paths and SHA256 hashes are in `PERSONALLY_INSPECTED_PIXELS_REMEDIATION.json`; the original sixteen-image ledger remains unchanged. Full-page screenshots place fixed navigation at its capture scroll position, which can obscure part of a long capture; this artifact was not treated as a layout defect. Unscaled viewport screenshots corroborate the critical label fix.

## Conditions / remaining coverage

1. Keep UI-PROFILE-003 canvas continuity open at LOW severity; the notice-inset portion alone is closed.
2. Preserve the independent combined QA gate. This UI approval does not claim the full 22-file combined run has passed.
3. Physical devices, VoiceOver/TalkBack, hosted environments, provider enrollment and release remain separate gates. I did not run reverse keyboard traversal or independently exercise a live browser in this pass.
4. Existing Communications authored minor conditions remain separate and open under their authors. Calendar, passkeys, device alerts, deletion and Pay later-batch lifecycles are not certified simply because Profile links to them.

There is no new blocking UI defect identified in the inspected remediation evidence. Approval is bounded and conditional; it is not a claim of perfect UI or production readiness.
