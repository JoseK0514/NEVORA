# Release sweep: Employee, Clocker and signed-out pages (Nov 23, 2026)

Setup:
- **Build:** production (`NEVORA_OWNED_APP_PRODUCTION=1`, next build and next start) of `origin/claude-codex-collab-nevora` at `91c08d19`, run from a clean worktree. Fictional data, Chromium, ui-scan harness.
- **Code:** no app code was changed. The checks were added to a scratch copy of the harness only (`tools/ui-scan` is unchanged).

**Views checked: 156, with 0 axe violations (wcag2a + wcag2aa) and 0 page overflow.**

| Area | Views |
|---|---|
| Employee, 15 routes × (320, 390, 390 at 200% text, 1440) | 60 |
| Signed out, 13 pages × (320, 390, 390 at 200%, 1440) | 52 views, plus 2 for the sign-in error state (54) |
| Clocker ID and PIN steps, 6 states × English and Spanish × (390, 1440, 390 at 200%) | 36 |
| Clocker clock-in and clock-out receipts × (390, 1440, 390 at 200%) | 6 |

**Employee routes:** Home `/app`, Schedule, Pick up and swap `/app/exchange`, Swap, Call out, Time `/app/my-time`, Pay `/app/my-pay`, Requests, Requests and time off `/app/requests/hub`, Updates, Profile, More, Help, Availability, Notifications.

**Signed-out pages:** Sign in (plus its error state), Forgot, Reset (plus an expired link), Activate (plus a bad token), Join `/onboarding`, Welcome, Terms, Privacy, Help `/support`, Access help.

**Clocker:** Employee ID (empty and typed), the PIN step with the keypad, unknown ID, offline, locked; clock in and clock out.

Each view was checked for four things:
1. **Overflow:** page width beyond the viewport.
2. **Text:** clipped, overlapping or offscreen.
3. **Small controls:** tap reach under 44px, measured from each control's centre with `elementFromPoint`, where a tap on the control's label counts.
4. **Accessibility:** axe-core with the wcag2a and wcag2aa tags.

Every probe finding was checked by eye on the shot. The shots are full page in `shots/` (Employee: `emp-*`, signed out: `pub-*`, Clocker: `ck-*`).

## Findings
| # | Route | Viewport | What | Shot |
|---|---|---|---|---|
| 1 | Schedule, Swap, Call out (the week strip) | 320 | Each day in the 7-day strip is 39–40px wide (reach 39×62). Seven days don't fit 44px each in the 296px strip. Proposal: the 24px spacing exception of WCAG 2.5.8 applies (days are 39px apart), or scroll the strip | `shots/emp-schedule-320.webp`, `emp-exchange-swap-320.webp`, `emp-exchange-callout-320.webp` |
| 2 | Schedule, Swap, Call out | 1440 | The week arrows "Previous week" and "Next week" reach 36–37×58: under 44 wide | `shots/emp-schedule-1440.webp`, `emp-exchange-swap-1440.webp`, `emp-exchange-callout-1440.webp` |
| 3 | Availability | 320, 390, 1440 | The "Requests" link (`a.eb-avail-req`) is 42px tall (78×42) | `shots/emp-availability-390.webp` |
| 4 | Welcome `/welcome`, Join `/onboarding`, Access help `/access-help` | all | The production build shows "Page not found". This may be on purpose (sign-up is off, and package P was withdrawn and then restored), but please confirm these should be 404s in the release | `shots/pub-welcome-en-390.webp`, `pub-join-en-390.webp`, `pub-access-help-en-390.webp` |
| 5 | Privacy, Terms | 320, 390, 1440 | The email and cross-links inside sentences are 19px tall. This falls under WCAG 2.5.8's inline exception; listed for information only, not a defect | `shots/pub-privacy-en-390.webp`, `pub-terms-en-1440.webp` |

## The probe's overlap and clip reports that aren't defects (checked by eye)
- **Hidden content:** Help (`/app/help`, `/support`) and Pick up and swap measure answers inside closed disclosures, and Employee Home measures the "What this measures" sentence while it's closed.
- **Updates:** the update body is a 3-line clamp with an ellipsis, as designed.
- **Clocker receipts:** the reference ID is inside the closed "Reference" disclosure.
- **Line boxes that touch, with no visible overlap:** the week strip's day name and date at 200% text (Home, Schedule, Time); the PIN keypad's digits at 200% text (the keys are visibly separate); the sign-in headline halves at 1440 ("Your week," / "in one place.", the known DS-1 note).
- **Capture artifact:** in full-page phone shots the fixed tab bar is drawn in the middle of the page. On a device it stays at the bottom of the screen.

## Not covered
- The Clocker connected and preview states, and K13 and K15, were covered by the clocker-states session today.
- 320 was run for Employee Home as asked, and for every Employee route.
