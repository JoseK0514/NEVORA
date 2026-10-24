# Phase 0: what was broken on phone (Oct 24, 2026)

Built on `development` at `a62aeec7`, in the Quiet v4 style, with fictional data. Before/after captures from a local production build sit in this folder.

| Fix | Files | Proof |
|---|---|---|
| **Schedule week grid.** The desktop people × days grid no longer leaks unstyled under the phone day list (a regression from Claude's `34a974d8`). Desktop shows the styled week at full width, without the phone list. | `manager-weekly-roster.tsx`, `quiet/quiet.css` | `owner-390-schedule-*` (2,732 px tall before, one screen after); `owner-1440-schedule-*` |
| **In-app Delete account.** Quiet rows with gutters for every role; wording unchanged. | `account-deletion-form.tsx`, `app/account/delete/page.tsx`, `account-deletion.css` | `employee-390-delete-*`, `employee-390-dark-delete-*` |
| **Public Account deletion.** Same layout as Privacy (back link, title, expandable sections, one teal button); policy text unchanged. | `app/account-deletion/page.tsx` | `public-390-account-deletion-*` |
| **Swap / Callout opened without a shift.** Returns to Shift requests quietly. A chosen shift that is missing, someone else's or past still shows the error. | `exchange/swap/page.tsx`, `exchange/callout/page.tsx` | unit tests |
| **Notifications.** Rows no longer prefetch `/app/notifications/open`. That caused three 404s per visit; the route handler refuses prefetches by design. | `notification-inbox.tsx`, `notification-inbox-signature.tsx` | browser check: 0 requests to the open route after the fix |
| **Features.** The row divider moves under the note instead of striking through it. | `features-editor.tsx`, `quiet/quiet.css` | `owner-390-features-*` |
| **Shift board.** The empty state is said once, in the band. | `exchange/page.tsx` | `employee-390-shift-requests-*` |
| **Manager without access.** The Quiet page: large title, one sentence, the same actions and wording. Refresh is a quiet text button, and the tab bar shares its width equally. | `company-access/operational-unavailable.tsx`, `scoped-read-frame.tsx`, `quiet-shell.css` | `manager-390-no-access-*` |

## Checks

- **Regression tests:** each new test fails before its fix and passes after it.
- **Full suite:** typecheck and eslint clean; vitest 9,595 passed, 0 failed, 801 skipped.
- **Browser (Chromium, production build):**
  - Owner Schedule at 390 and 1440, Features at 390;
  - Employee Delete in light and dark, plus Swap, Shift requests and Notifications;
  - public Account deletion;
  - Manager no-access and the tab bar.

  No console errors, except the old 404s, which are now gone.

## Left for later

- **Two "Schedule update" notifications look identical.** There is one per published week, and the label doesn't name the week. That is server data, so it is a Codex item.
- **The in-app Delete page is light in dark mode.** It is readable and in the Quiet style; Quiet dark mode for every role comes with the Phase 2 mockups.
- **Not run this round:** WebKit after sign-in (a local cookie limit), a real iPhone, and the GitHub cloud run.
