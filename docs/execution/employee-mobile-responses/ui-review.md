# Employee mobile responses — independent UI and design-system review

Initial candidate: `42237d75f3d05981c3b5c34438b88de432c03dff`, compared with `583b39b4`.
Closure candidate: `333c476250b6727f72b8746404b25ab53a3b88ed` (bounded product fixes at `a2758f8932d5893f59d77f0f6c3c03ee8ed94eae`; subsequent commit corrects test settlement visibility only).
Branch: `codex/employee-mobile-responses-20261027`.
Reviewer: independent UI oversight; no implementation changes made.

**Current recommendation: APPROVE. UI recommendation: GO WITH CONDITIONS for the bounded local UI gate.** UI-RSP-1, UI-RSP-2 and UI-RSP-3 are independently closed below. No UI blocker remains. Independent QA, physical-device/assistive-technology and assembly/release gates remain separate.

Initial outcome at42237d75 was REQUEST_CHANGES / NO-GO. The original findings and failed evidence are preserved below; their initial wording is historical, not the current disposition.

## Independent closure verification — 2026-10-27

- **UI-RSP-1 CLOSED:** `exchange-view.tsx:33` now derives the withdrawal consequence from `detail.summary.kind`. I inspected the actual fresh `accepted/details/firefox-accepted-canonical.png`: it shows a pending **Swap request**, correct text that both employees keep their currently assigned shifts, and an available **Withdraw response** control. `firefox-manual-swap-withdrawn.png` shows the settled **Cancelled** state with no response control or uncertainty. The browser test executes this withdrawal and asserts canonical CANCELLED plus both unchanged assignments. I inspected the regression's saved failing result (`review-copy-red.log`) and passing result (`review-unit-green.log`), and independently ran the current component suite: **4/4 pass** (`.omo/evidence/employee-mobile-responses-ui-fixed-unit.log`).
- **UI-RSP-2 CLOSED:** the harness now waits for the action section's attached non-busy state, no status-retry button, an enabled refresh control and absence of pending/uncertain/Refreshing text, followed by the required canonical status. The first correction wrongly required an empty settled action section to be visible; that failed run is retained at `fixed/`. Commit333c4762 changes that locator to attached, preserving all settlement assertions. I inspected the fresh accepted-canonical and pickup-withdrawn captures: pending manual acceptance has a usable withdrawal button and no uncertainty; the pickup displays **Cancelled**, with no contradicted manager-review label. The fresh orchestrated browser test passes1/1 with34 named checks including the newly exercised manual swap withdrawal. These assertions/captures now substantiate the settled UI instead of an intermediate frame.
- **UI-RSP-3 CLOSED:** the active Employee mobile navigation rule now restores `var(--em-surface) !important` under its existing mobile/role selector, overriding only the inherited Signature alpha rule. I inspected both corrected Chromium and WebKit430px dark viewport captures, including `accepted/details/webkit-detail-dark-430-viewport.png`; underlying acceptance text no longer bleeds through. The fresh browser matrix asserts computed navigation background equals the opaque comparison surface in every Light/Dark320/390/430 sample across all three engines. No new color literal or cross-role palette was introduced.
- **Evidence custody:** independently rehashed all **1,930** source inputs against `accepted/details/owned-next-TtexNy/source-manifest.json`; zero mismatches. Checkpoint equals333c476250b6727f72b8746404b25ab53a3b88ed. Ownership records closed=true, sourceVerified=true, mirrorVerified=true. The component files rerun at a2758f89 are byte-identical at333c4762; that intervening change is test-only.
- **Diagnostics:** personally read `accepted/details/results.json` and the passing browser log. It records34 named checks,36 contrast samples(minimum6.089452668960573:1), three correlated intentional transport/401 console errors, no unmatched console error, no page error and no hydration warning in this invocation. The previous WebKit/error-boundary failure is retained and not reclassified as acceptable. This is review of root's fresh run; independent QA owns its fresh replay and overall44-test regression verdict.

All three UI findings are closed by this reviewer, not by an implementation assertion. No further cosmetic work is requested. Conditions remain actual devices/OS text/background lifecycle/assistive technology and hosted/release readiness; no complete Phase2 or Phase3 certification is implied.

## Scope and reference

This review covers incoming swap review/response, own request details, permitted cancellation/withdrawal, retained history, responsive presentation and authorization-related UI states. New creation/report ports, time off, availability, the rest of Phase 2, physical-device/assistive-technology certification and Phase 3 are not certified here.

Reference: `docs/product/specs/employee-mobile-teal/README.md` and the scoped 2026-10-27 decisions in `.21st/design.json`, continuing accepted Phase 1 and Requests. Those explicit mobile decisions supersede older global Signature/blue treatment for these Employee/Lead mobile surfaces. This is consistency with the approved composition and tokens, not an exact ADP/Gusto/Homebase clone certification.

## Findings by severity

### CRITICAL

None found. No pasted screenshot, raster page, fake visual overlay or image substitute for application controls was found.

### HIGH

None found in the reviewed UI implementation.

### MEDIUM — initial ISSUE, now CLOSED — UI-RSP-1: pending swap withdrawal is explained as a pickup

`src/components/employee-mobile/exchange-view.tsx:33` renders the same pickup-only consequence for every allowed WITHDRAW: “Withdrawing closes this pickup request. The shift stays with its currently assigned employee.” `src/lib/data/employee-exchange.server.ts:52` also admits WITHDRAW for a target employee's MANAGER_PENDING swap, as the existing lifecycle permits (`src/lib/shift-changes/lifecycle.ts:17`).

Reproduction/evidence: `final/details/firefox-accepted-canonical.png` visibly shows **Swap request**, **Waiting for manager review**, two reviewed shifts, and the pickup-only explanation. This misidentifies the action the employee is taking and explains only one assignment when the workflow is a two-shift swap.

Required correction: derive the consequence from request kind. For a pending swap, say that withdrawing closes that swap request and that both current assignments remain unchanged; retain accurate coverage wording for pickup. Preserve the canonical planner and mutation. Closure requires a focused regression assertion plus an actual pending-manual-swap/withdrawal capture and canonical assignment readback. Independent UI owns closure.

### LOW — initial ISSUE, now CLOSED — UI-RSP-2: captures named as terminal results still show intermediate recovery

`src/test/integration/employee-mobile-responses.integration.ts:122` waits for a status that can already be present after the fresh read, before the original operation reconciliation settles. The withdrawal path around line134 waits for the receipt text, before the subsequent canonical read has finished.

Evidence: `final/details/firefox-accepted-canonical.png` still shows **Checking the original response…**, **Outcome uncertain**, and a disabled status button. `final/details/chromium-pickup-withdrawn.png` shows **Waiting for manager review** alongside the withdrawn receipt and **Refreshing…**. These are intermediate states, not evidence of the settled result. This observation alone does not prove an eventual-state application defect.

Required evidence correction before terminal UI claims: wait for the original operation to finish, no pending/uncertain response UI, and the refreshed canonical state (Cancelled for withdrawal), then capture. Preserve assertions, raw diagnostics and the existing intermediate evidence.

### LOW — initial ISSUE, now CLOSED — UI-RSP-3: legacy translucent dark navigation overrides the solid mobile surface

`src/components/signature/dark.css:11` applies `rgba(12, 24, 23, .94) !important` to the shared navigation. It overrides the approved solid `var(--em-surface)` rule at `src/components/employee-mobile/mobile.css:68`.

Evidence: `final/details/webkit-detail-dark-430-viewport.png` shows the acceptance consequence text bleeding through the fixed navigation behind its icons. This is an inherited shared-foundation defect, not a new hardcoded palette in the response stylesheet. It does not block the scoped response functionality; record it as a shared mobile follow-up if not fixed in the bounded pass. A correction should be scoped to active Employee mobile, retain desktop/other roles, and verify the actual computed opaque surface and dark viewport.

## Verified evidence

- **VERIFIED — real component tree:** `ResponsiveEmployeeExchange`, `EmployeeExchangeView`, `ResponseControls`, `Slot` and native `details/summary` render semantic live DOM. Data is supplied through the protected Employee view and existing command owner. Buttons/links are actual controls; regular Phosphor imports and the existing wordmark are used. No image page simulation or new UI dependency appears in the diff.
- **VERIFIED — tokens and reuse:** `exchange.css` uses the shared `--em-*` semantic colors, rem typography, spacing, radii and target sizes. Primary/secondary actions, heading, notice, list rows, footer, focus and shared navigation reuse the accepted Requests/Phase 1 rules. Small fixed icon dimensions and one-pixel separators are conventional existing-system geometry, not a competing theme.
- **VERIFIED — hierarchy:** status precedes a single separated comparison surface. Original reviewed dates, start/end times, location/role and overnight ending are explicit. A single primary Accept action and secondary Decline action follow the consequence; history is progressively disclosed. At inspected widths there is no clipped title or control text. Native history and direct-page navigation keep the flow understandable.
- **VERIFIED — rendered samples:** personally inspected Chromium light390, dark320, stale terms, retained history, incoming list, withdrawn pickup and denied state; WebKit dark430, actual Option-Tab focus and200% text viewport; Firefox light320, manual-review result and the preserved desktop view. Full-page captures include the fixed navigation at the capture viewport; viewport images are the reliable record for visible nav/focus geometry.
- **VERIFIED — bounded automated layout evidence:** read the actual final results and test assertions:33 named journey checks,36 primary/secondary contrast samples over Chromium/WebKit/Firefox, Light/Dark320/390/430, minimum6.089452668960573:1. Buttons are asserted at least48px, horizontal overflow absent,200% root-text and measured bottom clearance checked. Actual keyboard navigation is asserted with Tab in Chromium/Firefox and Option-Tab in WebKit. Named checks are not33 independent top-level tests or a completion percentage.
- **VERIFIED — partial/unavailable UI:** exact rendering code and independently rerun component tests distinguish unavailable from zero, missing/denied/replaced/module-off reads from private detail, unavailable acceptance from permitted decline, and a direct-child desktop tree. The independent command `./node_modules/.bin/vitest run src/components/employee-mobile/exchange-view.test.tsx` passed3/3. Log: `.omo/evidence/employee-mobile-responses-ui-unit.log`. These SSR tests do not certify rendered browser screenshots for every empty/error state.
- **VERIFIED — stale and history presentation:** the inspected stale capture withholds Accept and retains Decline, with a warning about changed reviewed terms. History-only detail shows no current-response claim and uses “Recorded location” when a live location is unavailable. No management action or peer absence reason appears in inspected captures/DTO presentation.
- **VERIFIED — custody:** independently SHA256-checked all1,929 source inputs against `final/details/owned-next-dhGsAX/source-manifest.json`; zero current-source mismatches. Its checkpoint is the exact reviewed candidate. The owned manifest records closed=true, sourceVerified=true and mirrorVerified=true. This review independently rehashed source inputs; it did not rerun the entire authenticated browser harness or independently reproduce every database assertion.

## Open evidence and release conditions

- **Initial BLOCKER at42237d75, superseded by the passing accepted/details run above; independent QA retains its own closure:** `final/details/results.json` records an unexpected WebKit own-details `TypeError: Load failed` error-boundary console error and a dev-overlay access-control page error. This fails the strict diagnostics assertion despite all33 named checks completing. It is not waived by this UI review. Root/QA must identify the cause and verify the affected flow; independent QA owns that diagnostic gate.
- **RISK / separate later gates:** physical iPhone/Android, actual OS text scaling/background behavior, VoiceOver/TalkBack and hosted/staging parity are not established by these screenshots or headless engines. Preserve their Phase 3/release conditions. No production, merge, deployment or Phase 3 authorization is implied.
- **RISK / unverified breadth:** source/component review covers additional absence/empty/failed states, but this reviewer has not seen browser captures for all of them or every possible long localized string. Avoid claims of exhaustive accessibility or complete Employee-profile certification.

## Evidence locations

Evidence root: `/Users/josek0514/Documents/Codex/2026-10-26/hi-right-now-i-am-trying/outputs/employee-mobile-responses/`.
Initial captures/results: `final/details/` (the failed strict-diagnostic run is retained, not represented as passing). Closure captures/results: `accepted/details/`; correction attempt preserved at `fixed/details/`.
Inspected source: `src/components/employee-mobile/{exchange.tsx,exchange-view.tsx,exchange.css,requests.css,mobile.css}`, `src/lib/{employee-exchange.ts,data/employee-exchange.server.ts,private-snapshot-client.ts}`, integration/component tests, route adapter and AppShell diff.

No application, test or configuration file was changed by this reviewer. This report and its durable copy are the only authored artifacts.
