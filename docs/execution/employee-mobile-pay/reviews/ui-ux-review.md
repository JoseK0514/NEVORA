# Employee/Lead mobile Pay: independent UI/UX review

- **Reviewer role:** Independent senior UI/UX reviewer (NEVORA UI Designer agent). This review is read-only. I changed no application or test code.
- **Revision:** worktree `.claude/worktrees/emp-mobile-p2` at `848e9cc5e2240347d3967b65459027228c5eb541`.
- **Date:** 2026-10-28
- **Benchmarks:** ADP, Gusto and Homebase employee pay-stub lists. Scoped authority: `docs/product/specs/employee-mobile-teal/README.md` and `src/components/employee-mobile/mobile.css`. Accepted comparison pages: `profile.tsx/.css` and `device-alerts.tsx/.css`.
- **Source read:** `src/components/employee-mobile/pay.tsx`, `pay.css`, `requests.css` (shared buttons and heading), `src/components/payroll/my-pay.tsx` (owner, desktop `MyPay` and `QuietMyPay`), `src/app/app/my-pay/page.tsx`, `src/app/api/payroll/documents/navigation.ts`, the `[id]` and `[id]/view` routes (dispositions), `src/lib/navigation.ts` (Pay replaces Hours), `src/app/app/quiet-shell.css` (header suppression ≤767px), `src/components/app-shell.tsx` (page markers), and the `employee-mobile-pay` integration and unit tests.

## Images inspected

Evidence folder: `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS/8dc318c3-a7c1-41c9-b2d0-c675318ab347/scratchpad/evidence/pay-run-10/`

- Ready, light: `chromium-pay-light-390-top`, `chromium-pay-light-390`, `firefox-pay-light-320-top`, `firefox-pay-light-320`, `webkit-pay-light-430-top`
- Ready, dark: `webkit-pay-dark-390-top`, `webkit-pay-dark-390`, `chromium-pay-dark-320-top`, `firefox-pay-dark-430`
- Enlarged text: `chromium-pay-text200`, `webkit-pay-text200`, `firefox-pay-text200`
- Arrival and recovery: `chromium-notification-statement`, `webkit-notification-statement`, `chromium-document-failed`, `firefox-document-failed`, `webkit-document-failed`
- Page states: `chromium-paused`, `chromium-module-off`, `chromium-signed-out`
- Landscape and other roles: `chromium-landscape-empty`, `webkit-landscape-empty`, `chromium-manager-390`
- Comparison: `docs/execution/employee-mobile-profile/gallery/chromium-profile-light-390-viewport.png` and `docs/execution/employee-mobile-device-alerts/evidence/root/root-run-02/chromium-light-390.png`
- Also read: `results.json` (31 checks, 126 contrast samples, all at or above 5.03:1; media, messages and limits).

## What works

- **Same system as the accepted pages:** the page matches the accepted Profile and Alerts pages. It uses the white title band over the canvas, 16px cards, 48px teal primary and outlined secondary actions, regular Phosphor icons at 20/24px, rem type that scales, and dark tokens that pair correctly. Sampled contrast is at least 5.03:1 in both themes.
- **Truthful content:** there are no amounts anywhere. Statements read "Payday …", then the period, then "PDF". The next-payday copy, in source and unit test, says "From your workplace's pay schedule. A statement appears here after payroll is published." It never reads as a payment or deposit.
- **Progressive disclosure:** earlier statements are calm disclosures. The latest statement is the clear focal card. "Your hours" correctly keeps My time and Timecards reachable, because the Pay tab replaces Hours in the tab bar.
- **View and Download:** View opens `/view` in a new tab, and its accessible name says so. Download is a separate attachment.
- **Recovery screens:** unavailable or coworker PDFs return to Pay with a calm amber notice instead of a JSON dead end.
- **Manager:** stays on the incumbent Quiet My pay at 390px.

## Findings

### PAY-UI-1: Material. A stale arrival notice survives into states where it is false

- **State and images:** `chromium-paused`, `chromium-module-off` and `chromium-signed-out`.
- **What is wrong:** the latched "That statement isn't available … Your current statements are below." notice stays on screen after the page moves to paused, module-off or signed-out. In those states no statements are below. Each screen also stacks two status surfaces (amber, then teal) with different messages, which doubles the reading load in exactly the moments that should be calmest. The cause is in `pay.tsx`: `latch.failure` is never cleared or gated by `state`.
- **Change:**
  - Render the arrival notice only when `state` is `ready` or `empty`. Drop the latch when the page leaves those states.
  - When it does render with no statements, say "Your statements will show here when they're available" instead of "below".
  - Show one status surface at a time.

### PAY-UI-2: Material. The replaced statement is not unmistakably secondary

- **State and images:** `chromium-notification-statement`, `webkit-notification-statement`, `*-pay-*-390`.
- **What is wrong:**
  - The replaced original has the same visible title as the correction ("Payday February 2, 2040"). It sits first in Earlier statements.
  - When a notification points at it, it opens automatically and takes focus. It then offers the same filled teal **View** as the statement the employee should actually use.
  - Its accessible names are identical to the correction's: "View statement, payday February 2, 2040 (opens in a new tab)" and "Download statement, payday …". A screen-reader user hears two indistinguishable pairs.
  - The "Replaced" chip and one sentence of copy carry the whole distinction. ADP and Gusto visibly mark voided or replaced stubs and steer the user to the current one.
- **Change:**
  - Inside a replaced statement, make "Use the corrected statement" the first 48px primary action (it moves focus to the correction).
  - Demote that statement's View and Download to outlined secondary buttons.
  - Put the status in the names: "View replaced statement, payday …" and "View corrected statement, payday …". Do the same for Download.
  - Optionally suffix the visible summary title with "· replaced".

### PAY-UI-3: Material. The next scheduled payday card has no rendered evidence, and its weight and gating need tightening

- **State and images:** none. No capture in any engine, theme or width includes `nextPay`. It is covered only by text assertions in `pay.test.tsx`.
- **What is wrong:**
  - This is the element most at risk of being read as a payment, yet its visual weight has never been seen. As written, its date uses the 22px shift token, the same size and weight as the latest statement title, and it sits above that title. Two equal headlines compete, and the forward-looking date becomes the page's focal point.
  - It renders regardless of `state`. Under "Pay statements are turned off", paused or signed-out, it would still promise "A statement appears here after payroll is published."
- **Change:**
  - Render the date at 16–19px label or section weight, so the published statement stays the hero. The desktop single line, "Next payday is …", is a good model.
  - Show the card only in `loading`, `empty` and `ready`.
  - Capture it in light and dark, at 320, 390 and 430px, and at 200% text, including the Today, Tomorrow and month-crossing period cases.

### PAY-UI-4: Material. Coarse landscape shows the legacy dark E5 header with a "+" action

- **State and images:** `chromium-landscape-empty` and `webkit-landscape-empty`.
- **What is wrong:**
  - Pay's page marker is `other` (`app-shell.tsx`). At 844×390 coarse, `quiet-shell.css` (max-width 767) no longer hides `.mobile-header`, and `mobile.css` restyles only non-`other` pages.
  - Pay is a top-level tab, but it shows the old dark-teal NEVORA band with a "+" create button and a bell. Home, Schedule, Requests and Hours show the white header and hide `.e5-new`.
  - It also takes about 68px of a 390px-tall viewport. It reads as unfinished.
- **Change:** give `/app/my-pay` its own marker (for example `pay`) and include it in the header and `.e5-new` rules in `mobile.css` and in the `quiet-shell.css` exclusion. Then recapture landscape.

### PAY-UI-5: Minor. The inline "Go to the corrected statement" link breaks the type scale and target size

- **State and images:** `chromium-pay-light-390`, `firefox-pay-dark-430`, `firefox-pay-light-320`.
- **What is wrong:** the link renders visibly larger than its 14px sentence, apparently through inherited anchor styling, at about 16–17px bold. It wraps across two lines mid-sentence, and it is not a 44px target.
- **Change:** make it its own block-level control at 44px minimum. PAY-UI-2's primary button already covers this. Otherwise use a full-width text link row at 16px with a regular Phosphor arrow, placed under the explanation.

### PAY-UI-6: Minor. Status chips are inconsistent in placement and color role

- **State and images:** all ready captures.
- **What is wrong:** "Correction" sits above the title on the latest card, but "Replaced" sits under the period line in Earlier statements (the result of commit `848e9cc5`). "Correction" also uses teal-on-wash, which is the selected and action color in this system, for a status.
- **Change:** use one placement for both chips; directly after the period line works. Consider a neutral information chip, or one with a leading icon, so status does not borrow the action color.

### PAY-UI-7: Minor. The date breaks across lines on 320px phones

- **State and images:** `firefox-pay-light-320-top` and `chromium-pay-dark-320-top`.
- **What is wrong:** the title wraps as "Payday February / 2, 2042", which splits the date.
- **Change:** keep the date unbroken with non-breaking spaces (or a `white-space:nowrap` span around the date) so "Payday" wraps alone, or use the short month at the narrowest width.

### PAY-UI-8: Minor. The notice component has two title sizes

- **State and images:** `chromium-paused`, `chromium-module-off`, `chromium-signed-out`.
- **What is wrong:** the arrival notice title is an `h2` at 19px. The paused, module-off, signed-out and error titles are `h3` at 16px. Visually it is the same component at two sizes. Alerts frames its status icon in a 44px wash tile, while Pay uses bare 24px icons.
- **Change:** use one visual size for every notice title (16px label weight). Keep heading levels as semantics only. Optionally align the icon treatment with Alerts.

### PAY-UI-9: Minor. Page-level states sit under the "Latest statement" heading

- **State and images:** `chromium-paused`, `chromium-module-off`, `chromium-signed-out`.
- **What is wrong:** "Sign in", "turned off" and "paused" are page states, not facts about the latest statement. The heading above them misleads, and under module-off the privacy line ("Only your own published statements are available here") still shows.
- **Change:** in non-ready states, replace the section with one page-level status surface without the "Latest statement" heading. Hide the privacy line when the module is off. Keep "Your hours".

### PAY-UI-10: Advisory, and a release condition. Home Screen PDF behavior is unverified

- **State and images:** behavior only; `results.json` limits exclude physical devices.
- **What is wrong:**
  - View uses `target="_blank"`. In an iOS Home Screen app this opens an in-app browser sheet, which may not share the web app's session cookie, so it could land on sign-in.
  - Download is a same-tab navigation to an `attachment` response with no `download` attribute. On iOS standalone, that is the path most likely to trap the app on a PDF with no way back.
  - The hint text "View opens in a new tab. Close it to come back here." uses browser jargon that a Home Screen user won't recognize. It appears only on the latest card.
- **Change:**
  - Prove View and Download on a physical iPhone and an Android Home Screen install.
  - Add the `download` attribute (with the filename) to Download.
  - Reword the hint as "Opens the PDF outside NEVORA. Close it to return here." Either show it once at section level or rely on the icon plus the accessible name.

### PAY-UI-11: Advisory. Evidence gaps and labelling

- **What is wrong:**
  - The integrity-failed copy ("We couldn't open that statement") is never captured. `*-document-failed.png` is taken after the random-UUID loop and shows the "unavailable" copy.
  - Error, loading and portrait empty states are not captured.
  - Recovery surfaces (the amber and red washes) appear only in light.
  - The 200% captures show only the page bottom; the title, chips and the View/Download wrap at 200% are unseen.
  - The Manager capture was taken while still "Loading…".
  - WebKit landscape is recorded as "genuine coarse" with 0 touch points.
- **Change:** add these captures, rename the failed-document shot, and record WebKit landscape as emulated media.

### PAY-UI-12: Advisory. No pressed feedback on touch

- **What is wrong:** disclosure summaries, the "Your hours" rows and outlined secondary buttons have no `:active` or hover state. Only the primary button darkens.
- **Change:** add an `--em-wash` pressed background, short and without transition, matching Profile rows. Leave it unchanged under reduced motion.

## Verdict

**GO with conditions.**

- **Before acceptance:** close PAY-UI-1 to PAY-UI-4 with fresh three-engine evidence. That includes a rendered next-payday card and the corrected landscape header.
- **Before release:** satisfy PAY-UI-10 with physical-device Home Screen proof.
- **Can follow:** PAY-UI-5 to PAY-UI-9 may ship as a short polish pass. PAY-UI-11 and PAY-UI-12 are advisory.

## Closure at e65ca90d

- **Reviewer:** the same independent UI/UX reviewer.
- **Revision:** worktree HEAD `e65ca90d8cf2675168cc133e2e7a959cd61f6d16`.
- **Diff read:** `git diff 848e9cc5..e65ca90d` over `pay.tsx`, `pay.css`, `my-pay.tsx`, `app-shell.tsx` and `mobile.css`. `quiet-shell.css` is unchanged.
- **Evidence:** `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS/8dc318c3-a7c1-41c9-b2d0-c675318ab347/scratchpad/evidence/pay-run-14/`. `results.json` has 37 checks. Sampled contrast is at least 5.03:1; the Correction chip is now 14.0:1 light and 10.25:1 dark.
- **Images inspected:**
  - Next payday, notifications and recovery: `chromium-next-payday`, `chromium-notification-statement`, `firefox-notification-statement`, `firefox-notification-missing-dark`, `webkit-document-integrity-failed-dark`
  - Ready: `webkit-pay-light-390`, `chromium-pay-dark-390`, `firefox-pay-light-320-top`
  - Enlarged text and landscape: `webkit-pay-text200-top`, `chromium-landscape-empty`
  - Page states: `chromium-paused`, `chromium-error`, `chromium-loading`, `firefox-empty-portrait`, `firefox-module-off`
  - Other: `webkit-download-after-access-ended`, `chromium-manager-390`

### Status of each finding

| ID | Status | Basis |
|---|---|---|
| PAY-UI-1 | **Closed** | The arrival notice renders only when `listed && state !== 'loading'`. Paused, error and module-off show one status surface and no stale notice (`chromium-paused`, `chromium-error`, `firefox-module-off`). The empty-state copy drops "below". |
| PAY-UI-2 | **Closed** | A replaced statement leads with a full-width 48px "Use the corrected statement". Its View and Download are outlined (`firefox-notification-statement`). Accessible names now say "replaced statement" or "corrected statement". |
| PAY-UI-3 | **Closed** | The next payday is now 16px label weight with a 22px icon, clearly below the 22px statement title (`chromium-next-payday`, `firefox-pay-light-320-top`, `webkit-pay-text200-top`). It is shown only in loading, empty and ready. The copy still says "From your workplace's pay schedule", with no payment or amount wording. |
| PAY-UI-4 | **Closed** | The `pay` marker is applied. Coarse landscape shows the white header with the wordmark, workspace name and bell. The "+" is gone (`chromium-landscape-empty`). |
| PAY-UI-5 | **Closed** | The inline link was removed; the 48px button replaces it. |
| PAY-UI-6 | **Closed** | Both chips sit under the period line. Correction is ink on wash, so it no longer uses the action teal for text. |
| PAY-UI-7 | **Closed** | At 320px the title wraps as "Payday / February 2, 2042". |
| PAY-UI-8 | **Closed** | Every status surface uses an `h2` at 19px (`chromium-error`, `chromium-paused`, the dark notices). |
| PAY-UI-9 | **Closed, with an advisory residue** | States no longer sit under "Latest statement". Residue: the privacy line ("Only your own published statements are available here") still shows under module-off (`firefox-module-off`). Hiding it is optional. |
| PAY-UI-10 | **Open as a release condition (accepted deferral)** | The hint now reads "View opens the PDF on its own. Close it to come back to Pay.", and the accessible name ends "(opens separately)". Not adding `download` is accepted: PAY-CR-9 means a failed statement's redirect could otherwise be saved as a file, and the access-ended Download check passes. Physical iPhone and Android Home Screen proof of View and Download is still required before release (recorded for Phase 3). |
| PAY-UI-11 | **Closed, with one minor residue** | Integrity-failed (light and dark), unavailable, error, loading, portrait empty, the 200% top, and Manager after load are all captured. Residue: `results.json` still records WebKit landscape as "Genuine coarse landscape (0 touch points)". Label it as emulated media. |
| PAY-UI-12 | **Closed (code-verified)** | `:active` wash on summaries and hour rows, and `brightness(.92)` on buttons. Static captures cannot show a pressed state, so this is verified in code only. |

### New findings

- **PAY-UI-13: Minor, an acceptance condition (a trivial fix).** In `chromium-loading`, the loading card collapses to a thin pill with "Loading your statements…" pressed against its left border, with no padding. This is the state every visit shows first.
  - **Cause:** `.em-pay :is(h2,h3,p){padding:0}` is more specific than `.em-pay-card`, so it strips the card padding from `<p class="em-pay-card em-pay-quiet">`. The code predates this round; it was not captured before.
  - **Change:** render loading as a `div`, or exclude `.em-pay-card` from the reset. Recapture it.
- **PAY-UI-14: Minor.** Downloading after access has ended (`webkit-download-after-access-ended`) lands on the shared module gate, not on Pay.
  - **What is wrong:** the gate says "Pay statements **is** turned off". It uses the legacy card style with a "Back to Home ›" text link. Its tab bar shows Hours instead of Pay. It reads differently from Pay's own "Pay statements are turned off" surface.
  - **Change:** fix the grammar ("are"). Preferably route Employee/Lead Pay requests to Pay's own module-off state, or restyle the gate with the scoped mobile tokens.
- **PAY-UI-15: Advisory.**
  - The desktop failed-link notice is not captured. On desktop the `?document=` parameter is never cleaned, so a refresh repeats the notice.
  - The fixture shows statements dated 2040–2042 alongside a next payday in November 2026. That is harmless for testing but confusing in screenshots shown for approval. Align the fixture years.

### Updated verdict

**GO with conditions.**

- **Before acceptance:** close PAY-UI-13 with a fresh loading capture. It is a one-line CSS fix.
- **Before release:** PAY-UI-10 still needs physical-device Home Screen proof.
- **Follow-up:** PAY-UI-14, the PAY-UI-9 and PAY-UI-11 residues, and PAY-UI-15 can ship as follow-up polish.
- PAY-UI-1 to PAY-UI-8 and PAY-UI-12 are closed.
