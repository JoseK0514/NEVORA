# Employee Profile mobile — independent UI and design-system review

Reviewer: `/root/profile_local_ui_review`, reporting independently to Jose. Candidate: `8f1b53d4406e819f6738dbbf29b9559cfaa254a6`; batch base: `e7f1c76804aae3bfe8897388824194d53607bd8a`. Worktree: `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/work/employee-mobile-local-resume`.

**recommendation: REQUEST_CHANGES. UI recommendation: NO-GO until UI-PROFILE-001 and UI-PROFILE-002 are corrected and independently verified.** This initial review is immutable history; remediation requires an authored closure addendum. No implementation, test, configuration, HEAD or index change and no browser runtime was performed by this reviewer.

## Goal and reference

Review actual Employee/Lead mobile Profile, preferences, contextual canonical support/legal and native sign-out against the existing clean teal system, own-information scope, logical interaction order and mobile accessibility. The approved scoped authority is `docs/product/specs/employee-mobile-teal/README.md`; it supersedes historical global Signature/Quiet presentation only for these Employee mobile surfaces. The approved prototype at `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile/index.html` exists and its independently computed SHA256 is `06c548a89f01e46c687c1d7e0a961da01c74952d6b7bfff34a1f7459e2396469`, matching the design record. This review does not claim a new competitor audit or pixel-identical clone of ADP/Homebase.

## Findings by severity

### CRITICAL

None found in reviewed code and pixels.

### HIGH

None found in reviewed code and pixels.

### MEDIUM — UI-PROFILE-001 — ISSUE / blocking UI acceptance

At320px with200% text, wrapped account labels visibly collide. `chromium-profile-text200-viewport.png` clearly shows “Delete my / account” with32px glyphs crowded into22px lines. The same compression appears in the Calendar disclosure's multi-line title in all inspected enlarged captures. Profile CSS raises label font size using rem tokens but retains fixed legacy line-height: `src/components/employee-mobile/profile.css:39` leaves `src/components/quiet/quiet.css:65` (`.q-rt b { line-height:22px }`) in effect. The Calendar title has the corresponding inherited22px line-height from the incumbent summary rule at `quiet.css:821` while Profile CSS uses enlarged body text at `profile.css:43`.

Required result: proportional token line-height and enough natural row height for wrapped text, including the already visible Calendar summary. Verify the actual rendered labels at320px/200% in all three engines with pixel evidence and an assertion that measures rendered line spacing or nonoverlap. The existing test only checks heading scaling and overall horizontal overflow; those passing checks do not detect this defect.

### MEDIUM — UI-PROFILE-002 — ISSUE / blocking UI acceptance

The mobile visual order and native DOM/focus order disagree. `src/components/employee-mobile/profile.css:10` moves the private work panel before Settings with `order:-1`. In `src/components/employee-mobile/profile.tsx:41–52`, Settings and Calendar remain before the common AccountPanel in DOM order. The visible layout is More → work profile/Refresh → Settings → Calendar; default keyboard traversal is More → language → appearance → Notifications → Calendar → Refresh, jumping back above the settings. This mismatch is particularly disruptive after text enlargement and for screen-reader reading sequence. Evidence: source ordering and independently viewed `chromium-profile-light-390.png`, `webkit-profile-dark-320.png`, and enlarged captures. This review did not execute a live Tab sequence; the DOM-derived order should be reproduced by the amended browser regression.

Required result: the mobile DOM and visual ordering agree, with actual More → Refresh → Sign-in language traversal and reverse traversal verified. Preserve the existing stable service/controller lifetimes across responsive changes; do not solve focus order by remounting Calendar or the private read on every resize.

### LOW — UI-PROFILE-003 — ISSUE / nonblocking polish condition

The held sign-out state has a different content alignment and canvas from the rest of Profile. In `webkit-profile-signout-held-native-submission.png`, the notice touches both viewport edges while the button retains the content inset; a large pure-black area appears below the short dark canvas. `profile.tsx:40` renders the notice directly, outside the inset private wrapper, and the notice rule at `profile.css:26` specifies zero margin. This state is transient in ordinary successful logout, and private facts are visibly removed; this finding does not assert a logout/security failure. Align the notice with the established inset and continue the semantic page canvas through the viewport if addressed in this batch. The similar trailing canvas seam in larger full-page captures is consistent with an already documented shared presentation limitation; this reviewer does not close the older Communications finding.

## Verified design-system properties

- **VERIFIED:** real React/DOM controls and existing primitives render the interface. The page composes `QuietPage`, `QuietRow`, `EmployeeAccountPanel`, `PortalSignout`, native labelled selects and native details/summary. No screenshot/raster image substitutes for app UI.
- **VERIFIED:** Profile styling consumes shared `--em-*` palette, type, spacing, radius and target tokens. Regular Phosphor caret icons are actual vector components; select arrows retain a semantic16px inset and cannot intercept pointer input. Literal icon dimensions and border widths are geometry, not a replacement palette/layout system.
- **VERIFIED:** inspected light/dark default layouts use restrained surfaces, consistent field widths, legible hierarchy and honest preference scope. Language says sign-in only and explains reload; appearance says this device/System. No employee editing or manager actions are invented in these screens.
- **VERIFIED in inspected pixels/source:** loading, offline pause, read failure and current denial remove own identity/work facts, preserve independent settings/help/sign-out, and provide distinct recovery copy. Native sign-out intent removes private content; new-account capture displays the new fixture identity. Authentication/data-isolation correctness remains QA/security scope beyond pixel inspection.
- **VERIFIED with limits:** contextual Support/privacy/terms use canonical policy data and `BlockView`, allowlisted slugs, native disclosures and fixed Profile return links. The inspected390px dark documents are readable. No real message was sent.
- **VERIFIED source preservation / limited pixels:** the profile route retains Manager/Owner separation, while the desktop capture retains the legacy tree. I did not run independent management navigation or baseline pixel comparison. Existing Calendar/passkeys/alerts/deletion/Pay destinations are subsequent capability batches and are not certified by their links here.

## Evidence and coverage limits

Evidence root: `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-profile/local-preflight-6/`. The exact16 PNGs personally inspected and their hashes are in adjacent `PERSONALLY_INSPECTED_PIXELS.json`. I independently read `results.json`, owned mirror `ownership.json`, current source, relevant diff, shared tokens, Profile plan/source map, AGENTS and independent UI oversight instructions. The recorded run contains36 checkpoints,81 captures and54 contrast samples; its minimum recorded sampled ratio is5.028921154815613 and its metadata says closed/sourceVerified/mirrorVerified. Those are inspected recorded results, not tests independently run by this reviewer and not evidence that all81 images or all contrast pairs were personally checked.

**RISK / coverage gap:** legal/support currently have390px dark captures; narrow320px/enlarged text and light contextual document evidence must be supplied before claiming broad responsive coverage for this batch. I requested those in the next affected run. Physical devices, VoiceOver/TalkBack, hosted behavior, background lifecycle and release readiness remain separate gates. Existing historical failures, including Firefox appearance emulation behavior, remain in the execution record and belong to QA disposition.

No source changes were made. Root was notified promptly of001/002 and the low polish condition. Root's proposed remediation is not closure; this reviewer must inspect the new code and actual evidence before changing this recommendation.
