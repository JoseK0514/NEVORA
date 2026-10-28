# Employee mobile Alerts — independent clone fidelity/UI review
Latest disposition: **APPROVE / UI GO WITH CONDITIONS** on application72b1c192, verification7ddf3771. Both authored UI findings and the three-engine UI evidence condition are closed; see final disposition at the end. Historical initial findings remain below.
Date: 2026-10-27. Author: alerts_ui_acceptance, read-only independent UI reviewer.

## Initial recommendation
**REQUEST_CHANGES / UI NO-GO for final batch acceptance pending bounded copy corrections and complete planned UI evidence.** This is not a finding that the design is fake or that source authorization has failed. The live design-system implementation is sound in the reviewed scope. No CRITICAL or HIGH implementation finding is established. The two MEDIUM content issues below are concrete, bounded improvements required before this reviewer issues final acceptance. Evidence incompleteness is recorded separately.

Candidate: b368200d33e6c3498d468f2ea386b99c21a68b3a; base 059f4ac2fbd4cc50bb526bb0f1001465de2e2ce2. The integration fixture was modified concurrently for endpoint isolation and broader geometry; those pending assertions are not executed proof. No application changes authored by this reviewer.

## Findings
### CRITICAL
None established.
### HIGH
None established.
### MEDIUM — DEV-UI-1: cancellation implies an enabled state even when status is unknown/blocked
ISSUE. src/components/employee-mobile/device-alerts.tsx:24 exposes Turn off alerts from enabled, revoked, error and denied states. The shared confirmation at line30 always labels cancellation “Keep alerts on.” In denied/error/revoked branches, it cannot truthfully assure that alerts are on. The same concern applies to the sentence “This stops alerts” when current setup cannot be verified; wording must describe the requested operation, not guarantee an already known enabled state.
Evidence: direct control/state branches and confirmation source; root-run-02/chromium-permission-blocked.png independently inspected confirms the entry into this flow exists in denied state. No screenshot of denied-state confirmation supplied, so exact visual confirmation is source-verified, not runtime-verified.
Closure: state-independent cancellation (“Cancel” or “Keep current setup”) or state-aware copy; no affirmative current-on claim for unknown/blocked status. Add/render corresponding state evidence and retain exact opener focus return.

### MEDIUM — DEV-UI-2: uncertain turn-off recovery requires technical interpretation
ISSUE. device-alerts.tsx:15,20,24,26,31 and src/lib/notifications/device-client.ts:82,195 (current source; source may advance) combine “Check device cleanup,” “server cleanup,” “suppressed locally,” and two equally styled “Retry turn off” / “Check again” controls. The text does not explain that one retries the original off request and the other only reads its current status. A nontechnical employee must infer the distinction while the outcome is uncertain. A repeated technical feedback block adds density without clarifying the choice.
Evidence: root-run-02/chromium-cleanup-pending.png and chromium-lost-cleanup-reply.png (latter artifact available, not visually inspected in initial pass); cleanup-pending image independently inspected. This is a comprehension issue, not a request to make uncertain cleanup look successful.
Closure: plain-language unknown outcome and distinct descriptions for retrying the original request versus checking status. Preserve caveats about queued/delayed alerts and continued sign-out; do not claim guaranteed suppression or delivery. Avoid merely hiding the unknown outcome.

### LOW
No additional mandatory styling finding. Several desktop fallback dimensions in device-alerts.css:1-17 are literal, but mobile overrides at18-33 use the approved scoped tokens for all material palette/type/spacing/radius/target roles. The180px flex basis and focus outline are layout/a11y geometry, not a second palette or one-off visual system. No token-system HIGH finding warranted.

## Verified design-system evidence
- Live React section, heading, buttons, links, native details/summary and regular Phosphor Bell/Caret icons; no screenshot, background-image or raster substitute in new Alerts source.
- Existing EmployeeProfileDocumentFrame/QuietPage and em-request primary/secondary primitives are reused. requests.css:38-40 supplies shared48px targets, rem action typography, colors and12px control radii. Device CSS uses em-* tokens scoped to Employee mobile, including the coarse-landscape query.
- Approved target is docs/product/specs/employee-mobile-teal/README.md; it explicitly supersedes stale global Signature presentation only for this scope. DESIGN.MD and AGENTS read; independent UI oversight skill read and applied. Historical screenshot references are composition guidance, not invented runtime state.
- Independently inspected ready390, enabled dark320, cleanup pending, permission denied, access changed and200%-text confirmation renders from root-run-02. Card hierarchy, restraint, inset carets, palette and typography match Profile/Calendar/Passkeys documented system.
- Single shell-scoped EmployeeDeviceProvider, shared desktop popover, server Employee/Lead route admission, own/current installation controls and no coworker/topics/device-inventory controls verified in source. This is not independent security certification.
- Scope of turn-off, browser permission, other devices and queued alerts is explicit. Enabled wording does not claim guaranteed delivery. Access-changed view removes setup actions and retains sign-in/sign-out routes.
- Confirmation group and feedback receive explicit focus outlines; Keep returns to its exact opener by ref. No independent browser execution yet; source and root-run02 Chromium execution evidence are distinct.

## Evidence / unfinished acceptance
Inspected:
- src/components/employee-mobile/device-alerts.tsx and .css (full)
- src/components/employee-mobile/device-owner.tsx (full)
- base..candidate diffs for AppShell, Profile and route; overall diff inventory
- shared requests.css control rules, mobile.css token/nav rules, Profile document frame
- relevant DeviceController refresh/turn-off branches; Alerts render tests
- docs/execution/employee-mobile-device-alerts/plan.md
- root-run-02/failure.json, integration source assertions, screenshot artifacts above

Root-run02 records complete Chromium journey but stops at WebKit enrollment. Its failure does NOT establish a UI defect: the fixture reused a fictional endpoint across separate accounts and canonical409 was expected protection. It also does not establish three-engine acceptance.
Before final acceptance require source-bound rerun evidence across three engines, both-theme200% actual viewport button/focus clearance, coarse landscape, and planned disabled/role/install state supplementation. Pending fixture now contains these expanded checks but they have not been counted as passes.
Full-page captures show fixed nav at original viewport position. I do NOT infer permanent overlap from those images; root-run02 normal-width assertions explicitly scroll and compare button bounds to nav. Enlarged confirmation control clearance requires its supplemental viewport evidence.
No real OS permission/installation, physical phone, delivery provider, assistive technology, hosted/release or production acceptance is claimed. Existing upstream QA conditions are not closed by this report.

Source SHA256:
- device-alerts.tsx: 86a8ebef16306ddc1a6bfa26d42bf7fb4017a0554239d1cc24fa62e615894e6b
- device-alerts.css: e96c5e8f1a003a60bae36f91ad985f064f7252fd8bcd3906e45f1fdd9c4c4b5c
- device-owner.tsx: 2e18abfac2bf4f4b47af59f6e6332b574780e8b4ecc23cf68ad09bd32555c9b6

Only this author may close DEV-UI-1/2 after inspecting remediation evidence. The report will retain initial findings and append a dated re-review, not erase the record.

## Independent re-review — application 72b1c192e8f2f05bcdd51b41cbf895ebce0d3dc5

**Current recommendation: APPROVE for bounded design-system/UI continuation; UI GO WITH CONDITIONS.** This supersedes the initial UI recommendation above while retaining its findings/history. DEV-UI-1 and DEV-UI-2 are CLOSED by their original author after source and rendered evidence review. No open CRITICAL, HIGH or MEDIUM implementation/UI finding remains in this review. Full batch/phase/release acceptance still depends on the explicit QA conditions below; this is not a claim that the pending all-three-engine lifecycle replay has passed.

### Findings closure
- **DEV-UI-1 CLOSED:** device-alerts.tsx:30 now uses state-neutral “Keep current setup” and describes an attempted request plus verification before confirming off. Scope/queued-alert caveats remain. The same branch is used for known and unknown status. Chromium and WebKit actual native keyboard captures show this corrected confirmation; no disabled-control/tabindex workaround. Ref-based cancellation focus return is exercised in the bounded diagnostic and original Chromium journey.
- **DEV-UI-2 CLOSED:** device-alerts.tsx:15,20,24-26,31 now presents “Alerts may still be on,” explicitly distinguishes reading the latest status from retrying the earlier off request, makes status checking primary, and replaces technical cleanup feedback with an honest plain-language unknown outcome. Independently inspected full-run-01/device/chromium-cleanup-pending.png shows the corrected composition and no affirmative off/suppression promise.
- **QA-A11Y-1:** QA owns the feature-off busy-state issue. I verified source line17 now limits aria-busy to allowed active work. Its formal closure remains with QA, not this reviewer.
- **No new visual-system drift:** current UI source/CSS/owner hashes match the actual07 owned mirror exactly. The palette/type/spacing/radii/action primitives remain approved em-* tokens and shared components. Actual Passkeys run09/chromium-light-390.png was independently inspected as a neighboring visual reference, corroborating restraint, teal controls, white cards and native disclosure treatment.

### Keyboard evidence discrimination
Independently read qa/static-keyboard/results.json and its script: untouched native buttons reproduce WebKit Tab skipping to summary, while native Alt+Tab reaches Keep, Turn off, then link. Chromium Tab reaches those controls normally. This is a platform traversal difference, consistent with [Apple’s documented Safari keyboard behavior](https://support.apple.com/en-gb/guide/safari/cpsh003/mac), not evidence that Alerts excludes its buttons from keyboard access. No OS preference, positive tabindex, product DOM or programmatic control-focus substitution was used to claim closure.

Independently inspected qa/actual-app-characterization-07/result.json and:
- webkit-light-Alt-Tab-Keep-current-setup.png
- webkit-dark-Alt-Tab-Turn-off-alerts.png
- webkit-dark-landscape-viewport-1.png

At320px/200% in both themes, native Alt+Tab reaches exact intended buttons with3px solid focus outlines. Keep height115.59px and Turn-off70.80px both clear navigation whose top is595.44px. Chromium native Tab equivalent is recorded in full-run-01/device and characterization03/05; I inspected chromium-dark-text200-Turn-off-alerts.png. These are actual viewport captures, unlike earlier full-page captures.

### Landscape evidence discrimination
The original full-run-01/device/chromium-coarse-landscape.png is visibly wrong and stays preserved; it must not be presented as an approved mobile capture. Characterization03/04 proved actual coarse media was false before the landscape capture, not simply an image-only layout illusion. Independently read qa/static-touch-transition.json: the installed Chromium fullPage screenshot alone changes maxTouchPoints1→0 and pointer coarse→fine; click, Tab and viewport-only screenshot preserve touch. No product CSS mutation was justified.

The unchanged application’s viewport-only characterization05 Chromium and07 WebKit restore valid evidence: true coarse844×390 media, approved tokens present, opaque five-column navigation, both primary settings and Sign out fully reachable above navigation. Supporting-copy contrast is5.42085 light /7.71297 dark; controls48.39px high; nav top311.41px. I inspected chromium-light-landscape-viewport-1.png, chromium-dark-landscape-viewport-2.png and WebKit dark viewport1. After-data intentionally reproducing screenshot-induced touch loss is diagnostic evidence, not an approved screen.

### Evidence inventory added
All relative paths below resolve beneath outputs/employee-mobile-device-alerts/reviews/qa:
- full-run-01/device/failure.json and corrected Chromium cleanup/native-Tab/canvas captures
- actual-app-characterization-03/failure.json (actual viewport/media failure, preserved)
- static-keyboard/results.json and characterize-native-keyboard.mjs
- static-touch-transition.json
- actual-app-characterization-05/failure.json, Chromium both-theme actual landscape captures/metrics (Chromium portion valid; later WebKit navigation interruption means this is not a whole-file pass)
- actual-app-characterization-07/result.json (actual WebKit diagnostic passed; it is not the entire lifecycle suite)
- actual-app-characterization-07/owned-next-rq77u8/source-manifest.json and three exact mirrored implementation files
Additionally inspected root-run-03/gates-result.json plus install, unsupported and Employee feature-off captures. Capability gates remain distinct from the interrupted main run03.

SHA256 verified against actual07 mirror:
- device-alerts.tsx: fdb4ec6506525803605059a07c3a3d742a219d01c52f1bd5d36bc1ce60badd4d
- device-alerts.css: e96c5e8f1a003a60bae36f91ad985f064f7252fd8bcd3906e45f1fdd9c4c4b5c
- device-owner.tsx: 1e0448f5cb1161f859398f78a20bd0dbef50e3ffbca540c61da56ec39e4a796f

### Remaining conditions / exact limits
1. Complete and inspect source-bound final three-engine lifecycle replay using the characterized native WebKit chord and screenshots that preserve actual pointer media. Firefox complete final lifecycle is not established by this re-review yet. Root/QA must retain earlier failures and show the corrected fixture’s full outcome. This is a full-batch acceptance gate, not an open design-system defect or permission to declare Phase2 complete.
2. QA owns original full-gate failures, invocation recovery, quiet-hours-fixture distinctions, source custody and QA-A11Y-1 closure. This UI review does not convert those into a pass or close upstream Communications/Calendar/default-suite risks.
3. Physical devices, actual OS permission/Home Screen setup, provider delivery, assistive technology and hosted/release checks remain unexecuted. No production or whole-repository-green certification.
4. Reviewer performed independent source, artifact, screenshot and metric inspection. Browser execution was performed by QA/root; I did not run a competing application runtime or modify product/tests/configuration. No deception or raster substitute found.

Current UI blockers: none established in the bounded reviewed implementation. Remaining overall completion blocker: final QA lifecycle/gate disposition, not yet supplied at this addendum.

## Final UI disposition — verification 7ddf37715ff89ba4b397cf22ec8b67ae5d53de2e

**APPROVE / UI GO WITH CONDITIONS for the bounded Employee mobile Alerts implementation.** The prior pending three-engine UI/lifecycle evidence condition is now CLOSED by this reviewer after independent inspection. Application remains72b1c192; git diff72..7dd changes only verification fixtures. Initial findings, failures and diagnostic history above remain preserved. No open CRITICAL, HIGH, MEDIUM or LOW implementation finding is established by this UI review. No UI blocker remains.

### Final source-bound evidence inspected
Directory: outputs/employee-mobile-device-alerts/reviews/qa/affected-recovery-02/device.
- result.json: **passed**,45 checkpoints across Chromium/WebKit/Firefox,63 viewport captures,24 sampled contrast values, minimum5.420851497656459, zero unexpected console/page errors. All six engine/theme landscape records have true intended coarse media and valid token values.
- gates-result.json: **passed** Employee/Lead feature-off, Manager/Owner route separation, install and unsupported supplement. It explicitly limits its browser coverage to Chromium and fictional native boundaries.
- Independently inspected final screenshot samples: firefox-light-text200-Keep-current-setup.png, firefox-dark-text200-Turn-off-alerts.png, firefox-cleanup-pending.png, firefox-light-coarse-landscape-1.png, webkit-dark-coarse-landscape-2.png, chromium-light-text200-Turn-off-alerts.png. The prior Chromium/WebKit current-source captures inspected above remain corroborating evidence. I inspected these representative renders plus all JSON records; I did not visually inspect every one of the63 final images.
- owned-next-HhYuZK/source-manifest.json and actual mirrored files. Current device-alerts.tsx, device-alerts.css, device-owner.tsx and integration fixture SHA256 exactly match their executed mirrors. Implementation hashes are unchanged from the preceding addendum; final integration fixture hash5431d5e2fdec5d202538e933e2bda91904cf6f623d8da8879d1abad86005c0ca.
- Final integration source lines59-79: actual native Tab, macOS WebKit Alt+Tab, exact activeElement and>=3px outline assertions;44px+ controls and viewport/nav bounds; exact Keep return; both-theme844×390 actual media/token/contrast assertions before and after screenshots; pointer-back center hit-test, ordinary click and destination readiness. The correction uses viewport-only captures to avoid the independently reproduced touch-emulation loss; no forced click, control-focus shortcut, product tabindex or CSS workaround was used.

### Assessment
The final screenshots match the approved restrained teal system in all sampled browsers: consistent typography, card/control radii, semantically paired light/dark colors, calm uncertainty state, inset native disclosure carets and clear primary/secondary recovery hierarchy. Enlarged text wraps without truncating action names and the focused controls remain above the expanded navigation. Actual short landscape keeps the intended mobile styling, readable copy and reachable turn-off/sign-out controls. This is live React/native DOM with shared primitives, not a screenshot clone.

Completed lifecycle evidence now covers entry without prompting, postponement, current own-role boundary, pause/resume, enrollment, unknown cleanup, original retry, lost reply, blocked permission, session loss and sign-out across all three engines. Fictional browser/provider boundaries are explicit; this result does not demonstrate real push delivery.

### Conditions remaining outside this UI approval
- Overall27-test recovery/gate exit and complete custody disposition belong to independent QA/root and were still finishing when this final UI report was authored. UI acceptance does not predeclare those broader checks green or close any other author’s finding.
- Physical phones/OS permission and installation, actual delivery, assistive technology and hosted/release acceptance remain separate.
- Earlier Communications/Calendar/default-suite conditions remain owned by their prior reports. Phase2/Phase3, merge and deployment require their own completion/authorization.

Reviewer changes: authored review artifacts only. Product, fixtures and configuration were not edited by this reviewer.



