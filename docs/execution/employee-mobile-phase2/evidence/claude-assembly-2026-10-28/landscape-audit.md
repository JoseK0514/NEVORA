# Employee/Lead mobile: audit of earlier landscape evidence

Revision audited: worktree `emp-p2-assembly` at detached `99e1dbe5`. Read-only: files and git only. No browsers, servers, databases or vitest were run, so every verdict below comes from source, scripts, result JSON and commit ancestry, not from re-rendering.

## 1. What a capture has to prove

`EMPLOYEE_MOBILE_QUERY` (src/components/employee-mobile/use-mobile.ts:3) is used verbatim by mobile.css:6 and by every batch stylesheet (requests.css:2, exchange.css:1, creation.css:1, planning.css:1, hours.css:1, messages.css:2, profile.css:2, calendar.css:2, passkeys.css:13, device-alerts.css:18, deletion.css:2, pay.css:2):

`(max-width: 767px), (max-width: 900px) and (max-height: 430px) and (orientation: landscape) and (pointer: coarse)`

Other rules that switch at the same boundary:
- globals.css:560 and mobile-workforce.css:12 use the same query with 760px.
- globals.css:12863 is a coarse-only landscape rule. It sets the 4-column employee nav, `page-frame` bottom padding of 100px plus the safe area, a static savebar, and inputs at 1rem.
- Desktop styling deliberately excludes landscape phones: employee-style.css:107 (`min-width:768px and not(short coarse landscape)`), premium-desktop.css:9 and portal-motion.css:96.
- `useEmployeeMobile` runs matchMedia in JavaScript. When the media condition changes, React re-renders, so the DOM changes as well as the CSS.
- navigation-layout.ts writes `--em-nav-height` from the measured `.mobile-nav`. mobile.css:38 uses it as `padding-bottom`, which is what gives content its clearance above the nav.

What each viewport depends on:

| Viewport | Employee mobile CSS when coarse | When touch is lost (fine pointer) | Affected by fullPage? |
|---|---|---|---|
| 844x390 | Yes, through the 900/430 coarse clause | **No.** employee-style.css:107 desktop styling turns on, giving the "black desktop style" seen in Alerts full-run-01 | **Yes. Image and DOM are both wrong** |
| 667x375 | Yes, through the 767 clause, whatever the pointer | Still mobile, but globals.css:12863 (nav columns, page-frame clearance, savebar, input size) drops out | **Partly.** Clearance and nav rules are wrong |
| 932x430 (and 926x428) | **No.** Wider than 900, and the desktop rules exclude coarse short landscape, so neither mobile nor Employee/premium desktop CSS applies (a hybrid of base and global `min-width:761` rules) | Desktop rules turn back on and the image looks "fine" | **Yes. A fullPage capture would hide a likely gap.** Static reading only, needs replay |

Proven runtime facts:
- Installed Chromium `fullPage:true` changes touch points from 1 to 0 and the pointer from coarse to fine (device-alerts capture-keyboard-characterization.md:15-17).
- The loss persists for later captures in the same page (calendar evidence/execution/progress.md:11).
- WebKit keeps coarse through fullPage, although it reports `maxTouchPoints` 0.
- Firefox with `hasTouch:true` does match coarse (Alerts affected-recovery-02 result.json `landscapes[4..5]` coarse:true).

## 2. Inventory

Validity labels:
- **VALID** means a viewport capture with the coarse media confirmed in the page.
- **INVALID-fullPage** means a Chromium fullPage capture made while touch emulation was on.
- **UNVERIFIED** means the coarse media was not checked.
- **NOT-CLAIMED** means no landscape claim was made.
- "Checks" lists which of nav clearance, 44px targets and tokens/contrast were actually asserted at landscape.

| Batch | Landscape claim (where) | How it was captured | Validity | What an exact replay needs |
|---|---|---|---|---|
| **Phase 1** | None. Handoff, ui-review and qa-review never mention landscape. | phase1.integration.ts:39 context 390x844 with no `hasTouch`; `shot` at :57 is `fullPage:true`. No landscape step anywhere in the file's history (`git log -G landscape` is empty). | **NOT-CLAIMED.** The coarse-landscape CSS (mobile.css:6, globals.css:12863, navigation-layout.ts) has never been exercised. | `/app`, `/app/schedule`, `/app/exchange`, `/app/profile` and nav tabs. Employee and Lead (Manager/Owner as the desktop boundary). 844x390 and 667x375, plus 932x430 as a boundary probe. Chromium (`hasTouch`+`isMobile`), WebKit and Firefox (`hasTouch`). Assert the full query, the `data-employee-mobile` marker, 4/5-column nav, `--em-nav-height` > 0, the last control's bottom ≤ nav top, 44px targets, `--em-teal`, contrast ≥ 4.5. Both themes. |
| **Requests** | None | requests.integration.ts:64 (no touch); `shot` :75 `fullPage:true` | **NOT-CLAIMED** | `/app/requests/hub`, `/app/exchange`. Employee and Lead (Owner peer). Same viewports, engines and assertions as Phase 1. |
| **Responses** | None | responses.integration.ts:72; `shot` :86 takes fullPage first, then viewport | **NOT-CLAIMED** | `/app/exchange` respond and decline states. Employee (Manager desktop boundary). Same matrix. |
| **Creation** | None | creation.integration.ts:40; `shot` :52 loops `[true,false]`, so fullPage comes first and would poison the viewport capture | **NOT-CLAIMED.** Highest risk: creation.css:24 makes the sheet `height:100dvh`, which is only 390px in landscape. | `/app/exchange/callout?shiftId=`, `/app/exchange/swap?sourceShiftId=` (and `&mode=cover`). Employee and Lead. Assert the sheet savebar and primary action are visible within 390px height at 100% and 200% text. |
| **Planning** | None. qa-review.md:37 lists landscape as an unexecuted gap. | planning.integration.ts:25; `shot` :34 `fullPage:true` | **NOT-CLAIMED** | `/app/availability`, `/app/requests`. Employee and Lead. Same matrix, plus the savebar static/visible (globals.css:12863). |
| **Hours** | None. INDEPENDENT_QA_REVIEW.md:45 lists it as a gap. | hours.integration.ts:34; `shot` :45 `fullPage:true` | **NOT-CLAIMED** | `/app/my-time` (`/app/timecards` desktop boundary). Employee and Lead. Same matrix. |
| **Communications** | None | communications.integration.ts:44, :55 (viewport, then fullPage); review :53, :60 `fullPage:true` | **NOT-CLAIMED** | `/app/updates`, `/app/notifications`. Employee and Lead. Same matrix. |
| **Profile** | None. HANDOFF.md:36 and SOURCE_MAP.md:5 only state the 767/coarse boundary rule. | profile.integration.ts:27; `shot` :38 `fullPage:true`; no-JS capture :46 `fullPage:true` | **NOT-CLAIMED** | `/app/profile`, `/app/more`, `/app/profile/{privacy,support,terms}`. Employee and Lead. Same matrix. |
| **Calendar** | gallery/README.md:12. Manual QA CAL-05 (final-f58d040b manual-qa.md:21) and ADV-08 (:49) claim landscape with "44/48 targets, contrast, retry above nav". | **run-01 at 0597a659:** `fullPage:true` at 844x390, no coarse assert. It failed (timeout waiting for `.em-calendar`, EVIDENCE_HISTORY.md:9). **Final runs (fc3a1874 onward: run-02/03/04, final-f58d040b, full-context-f58d040b-01):** context :23 `hasTouch:true` (no `isMobile`), shot :29 `fullPage:false`, :57 asserts `(pointer:coarse)` and that `.em-calendar` is visible and that the page doesn't overflow. Three engines. | run-01 **INVALID-fullPage** (kept as a failure, never a pass). Final runs **VALID** capture and media, but the checks are **partial**: only no-overflow is asserted at landscape. No nav clearance, targets or contrast, despite the ADV-08 wording. | `/app/profile#employee-calendar-title`. Employee and Lead. 844x390, both themes, three engines. Add the full-query assertion, retry/copy controls ≥ 44px and above the nav, `--em-teal` present, contrast ≥ 4.5. |
| **Passkeys** | HANDOFF.md:20-21; QA_REVIEW.md:28; gallery/README.md:17-19; probe-result.json | **run02 at d36ea8b0:** `shot` `fullPage:true`. It failed in Chromium (EVIDENCE_HISTORY.md:14). **run04-09 at 356bca23 to 64063a2a:** passkeys.integration.ts :23 `hasTouch`, :46 `fullPage:false`, :67 asserts `(pointer:coarse)` only, then `shot('coarse-landscape')`. **Supplement** (qa/supplement.mts.txt, Chromium only, 844x390 with `hasTouch`): asserts coarse at :59; per-theme `*-landscape-{saved,keep,remove}.png` are `fullPage:false` (:66, :71) with ≥ 44px and above-nav checks (:70). The **final `legacy-roles/employee.png` and `lead.png` are `fullPage:true` (:81)** and carry the observable "Employee/Lead coarse landscape passkey controls remain reachable" (probe-result.json:43, :69). | run02 **INVALID-fullPage** (failure). Integration run09 **VALID**, checks **partial** (no targets, nav or contrast at landscape; QA_REVIEW.md:28 already declined to rely on it alone). Supplement per-theme images **VALID** (Chromium only, no token/contrast check). **Supplement `employee.png` and `lead.png`: INVALID-fullPage.** Only probe-result and the manifest reference them, not the reviews or gallery. | `/app/profile` (Passkeys section, a saved key, the Keep/Remove review). Employee and Lead. 844x390, both themes, three engines. Full query, contrast ≥ 4.5 on `.em-passkeys-intro`, tokens. Replace the probe-result observable that points at `employee.png`/`lead.png`. |
| **Device alerts** | HANDOFF.md:41; gallery/README.md:16-20; final-qa-report.md:17 | **Before 7ddf3771 (4f9cc547, ebec721a, 72b1c192):** `shot` `fullPage:true` (:44), the landscape step asserted only the JS marker, and the claim was "coarse landscape reflows". This produced full-run-01/device/chromium-coarse-landscape.png, which shows the desktop style. Characterisation-02/03/04 and the "after" images are deliberate fullPage diagnostics. **Final 7ddf3771 / affected-recovery-02:** device-alerts.integration.ts :25 `hasTouch`, :44 `fullPage:false`, :71-77 assert the 900/430 coarse query, `--em-teal`, the marker, no overflow, contrast ≥ 4.5, Turn off and Sign out ≥ 44x44 and above the nav, the nav inside the viewport, and coarse after capture. Three engines × two themes. | Pre-7ddf images **INVALID-fullPage** (preserved as failed; gallery:20 says so). Final **VALID, all checks present.** | Already replayable as written. Remaining gaps: Chromium without `isMobile`; only `/app/profile/device-alerts`. |
| **Deletion** | HANDOFF.md:52-53; ui-ux-review.md:23 | deletion.integration.ts:152 opens a fresh 844x390 context with `hasTouch` (except Firefox) and `isMobile` (Chromium). :155 records coarse, landscape and touch points. Captures at :161 and :166 have no `fullPage` option, so the default (false) applies. It waits for `.em-delete[data-deletion-state=idle]`, then asserts no overflow, control height ≥ 43.5 and actions above the nav. Run 8 media: Chromium and WebKit coarse; Firefox not coarse, desktop recorded and not claimed. | **VALID.** Checks **partial**: height only (no width), no tokens or contrast at landscape. Firefox touch is deliberately off, even though Firefox can emulate coarse. | `/app/account/delete`, plus the signed-out state. Employee. 844x390, both themes, Firefox with `hasTouch:true`. Add the full query, width ≥ 44, tokens and contrast. |
| **Pay** | ui-ux-review.md:162 (PAY-UI-4 header closed on `chromium-landscape-empty`); browser-results-run-10/14/15 | pay.integration.ts:170 uses the same fresh-context pattern; :173 records media; :175 captures with the default (no fullPage). It asserts the `pay` page marker, the empty copy and no overflow. Run 15 media: Chromium and WebKit coarse; Firefox desktop, not claimed. | **VALID.** Checks **partial**: empty state only; no targets, nav clearance, tokens or contrast; Firefox touch off. | `/app/my-pay` with statements listed, plus empty, error and integrity-failed states. Employee and Lead. 844x390, both themes, three engines with touch. Download/View ≥ 44px and above the nav, tokens, contrast. |

**Bottom line**
- None of the passing landscape evidence these handoffs cite was captured with Chromium fullPage.
- The invalid fullPage landscape captures are all kept as failures or diagnostics: Calendar run-01, Passkeys run02, the Alerts pre-7ddf runs and characterisations. The one exception is the Passkeys supplement's `employee.png` and `lead.png`, which still carry a passing landscape claim in probe-result.json.
- The bigger exposure is coverage, not invalid images:
  - **Eight batches (Phase 1 to Profile) have no landscape evidence at all**, although each ships the coarse-landscape CSS.
  - **No batch has ever captured 667x375 or 932x430.**
  - Calendar, Passkeys (integration), Deletion and Pay assert only part of what their claims say.

## 3. Helpers that still use fullPage for mobile captures (fix before any landscape replay)

Integration tests:
- phase1:57 (`shot`) and :40 (failure)
- requests:75 and :71
- responses:86 (fullPage, then viewport) and :79
- creation:52 (`[true,false]`, fullPage first) and :46
- planning:34 and :31
- hours:45 and :41
- communications:55 (viewport, then fullPage) and :52
- communications-review:60
- profile:38 and :46 (:39 is the viewport variant)
- mobile-access-browser:56 and :97
- all-ui-browser:34 and :79

Today these contexts have no `hasTouch`, so the portrait images are unaffected. Adding a landscape step without changing the helper would silently drop coarse, including on later viewport captures in the same page.

Scripts that combine touch emulation with fullPage (they drop coarse now):
- scripts/ui-checks/preview-runtime.mjs:40 sets `hasTouch:width<1024`; :58 captures `fullPage:true`.
- scripts/dev/style-snapshot.mjs:110 sets `hasTouch:w<1024`; :144 captures with `fullPage:!view.scope`.
- scripts/dev/large-root-check.mjs:129 sets `hasTouch:true`; :157 captures `fullPage:true`.
- scripts/ui-checks/checks.mjs:29/41 includes 844x390 with `hasTouch`. It takes no screenshot, but it never asserts coarse media either.

Archived scripts that use fullPage on purpose (diagnostics, fine as they are): passkeys qa/supplement.mts.txt:57, :81, :86; device-alerts characterize-touch-transition / characterize-viewport-click-capture / actual-app-characterization*.txt:83; calendar synthetic-*.cjs.txt (abort diagnostics).

Correct pattern to copy: device-alerts.integration.ts:44 and :70-77.
- Capture with `fullPage:false`.
- Before and after the capture, assert the full query, a token, contrast, 44px boxes and `box.bottom ≤ nav.top`.

## 4. Gaps

- Not checked here: the images themselves (no new visual inspection), anything not committed, pre-teal Employee landscape reviews (docs/product/reviews/phase-7-inspection-2026-10-18, build-review-cycle1; superseded designs) and the Manager CLOUD-CHECKS runs.
- The 932x430 "neither mobile nor desktop" band comes from reading the CSS only and needs a coarse-context replay to confirm.
