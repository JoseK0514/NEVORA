# Wave C inspection, round 1: interaction and states

Inspector: interaction and states. October 19, 2026. Preview `http://127.0.0.1:49855`, fictional data, Owner `QAOWNER`. Chromium (Playwright) at 320×568, 390×844 (`isMobile`, `hasTouch`) and 1440×900. Every POST was blocked in the browser (`page.route` → `abort`), throttled (held 5 s), or answered with a mocked 401 or 200. The one exception was a single real read: Clocker recovery with a well-formed unknown reference, which changes nothing. Nothing was saved and nobody signed out.

Scripts, logs and screenshots are in `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS--claude-worktrees-p35-wave-c-93e13c/75458b9c-fbac-4a0a-b5f7-fa683890e520/scratchpad/inspect/interaction/`. Below, `SP` means that folder; screenshots are in `SP/shots/`.

The shared dev server was heavily loaded for the whole run: requests took 2–16 s, and some returned 500 or "could not be loaded". Each was retried before any result was used. Mid-round, the coordinator cut the scope to Chromium at 320, 390, 844×390 and 1440, WebKit spot checks only, and no shell. The "Not covered" section lists what that left out.

## Verdict

The action plumbing is sound on every page:
- Exactly one request leaves per double tap (14 of 14 actions).
- Pending labels swap in place ("Saving…", "Adding…", "Issuing recovery code…", "Checking receipt…"). The button is disabled and moves 0 px.
- Every blocked, offline or failed request ends in a role=alert notice that takes focus, and entries are kept.
- Dialogs open with focus inside. Escape, Cancel and Close all return focus to the opener.

**Field validation is broken, though.** The app-wide `FormValidation` component in the shared shell runs on top of Wave C's own field errors on every Wave C form. The result:
- **P0:** a keyboard trap on Account recovery's confirm checkbox. Neither Tab nor Shift+Tab can leave it.
- **P1:** focus is pulled back into any filled field that's invalid, and clicks are lost.
- **P1:** every invalid field shows two error sentences, one of them the browser's generic text.

Also 11 P2s: validation gaps, destructive dialogs that focus the destructive button, page scroll behind dialogs, 401 notices without a sign-in link, focus loss after Features saves, and naming/announcement details.

**Count: 1 P0, 2 P1, 11 P2.**

## Findings, worst first

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| IS-1 | Account recovery · Owner · 390 and 1440 | `input[name=confirm]` ("I independently confirmed…") | **Keyboard trap.** Starting on "How you verified them", Tab six times: focus is on the checkbox all six times (`input[confirm] → input[confirm] → …`). Shift+Tab three times: still on the checkbox. Keyboard users can't reach Issue recovery code or go back up to fix a field without ticking the box. Each Tab also injects a second error under the box, "Select this to continue", next to Wave C's "Confirm you verified their identity yourself." Same result at 1440. | `trap-chromium-390-tab.png`, `trap-chromium-1440-tab.png` | `src/components/form-validation.tsx:86`: the "untouched empty field" guard uses `!field.value`. A checkbox's value is always `"on"`, so the guard never applies. `:87` then calls `field.checkValidity()`, which fires `invalid`. `:97–103` show the error and `setTimeout(() => firstInvalid.focus())` pulls focus back. Wave C's `onInvalidCapture` (`src/app/app/settings/wave-c-form.tsx:34–43`) catches the same synthetic `invalid` and focuses again in a requestAnimationFrame callback. Mounted for every page by `src/components/app-shell.tsx:376`. | 1. In `form-validation.tsx`, opt Wave C forms out: `if (target.closest("form")?.hasAttribute("data-field-errors")) return false;` in `isField`, and put `data-field-errors` on every form that uses `useFieldErrors` (`SettingsForm`, `NewLocationForm`, `EditLocationForm`, the company policy form, both dialogs, `AssistedRecovery`, the Clocker recovery form). 2. For the forms that stay: in `onBlur`, read `field.validity.valid` instead of calling `checkValidity()`, so blur never fires `invalid`, and treat checkboxes and radios as untouched unless `field.checked` or `dataset.errorId` is set. | **P0** |
| IS-2 | Every Wave C form (seen on New location, Account recovery, Clocker recovery) · Owner · 390 and 1440 | A filled field that is invalid, then Tab or a click elsewhere | **Focus is yanked back and clicks are lost.**<br>• Clocker key: type "Bad Key", press Tab. Focus stays on `clockerKey` (`newLocationKeyBlur`).<br>• Account recovery: type "short" in "How you verified them", then click the confirm checkbox. The box stays **unchecked** and focus goes back to the textarea. On mousedown the blur inserts two error lines, which push the checkbox down 80 px at 390 (y 736 → 816) and 54 px at 1440 (681 → 735). The mouseup lands elsewhere, so the click is lost.<br>• Clicking the label text has the same result (`checked = false`). | `trap-chromium-390-click.png`, `val-chromium-390-newLocationKeyBlur.png` | Same as IS-1: blur calls `checkValidity()` (`form-validation.tsx:87`), and both invalid handlers refocus (`form-validation.tsx:103`, `wave-c-form.tsx:42`). The layout shift comes from errors being inserted on blur. | The IS-1 fix. Wave C's own pattern already shows errors on submit, which is enough. Never refocus from a blur-triggered check. | **P1** |
| IS-3 | Every Wave C form with field checks (Company profile, New location, Edit location, Positions add and edit, Break types dialog, Clocker devices dialog, Account recovery, Clocker recovery) · Owner · 390 and 1440 | Error under each invalid field | **Two error sentences per field.** Each field shows the kit error (icon, "Enter a location name.") and, above it, a second paragraph `p.field-error` with a dot and different words. Examples:<br>• "Enter location name", "Enter business name", "Enter employee ID", "Choose classification", "Enter device name", "Enter saved action reference";<br>• for pattern errors, the browser's generic **"Please match the requested format."** (Clocker key, Reference minutes, Clocker recovery reference).<br>`aria-describedby` lists both, so screen readers read both, e.g. `new-location-name-error` and `new-location-name-error-02btq`. Counts on submit: New location 2+2, Account recovery 3+3, Devices 2+2, Break types 2+2. Branding is the only form without it, because its hex field is not in a `<form>`. | `val-chromium-390-newLocationKey.png`, `val-chromium-390-recoveryEmpty.png`, `val-chromium-390-devicesEmpty.png`, `val-chromium-390-breaksEmpty.png` | `src/components/form-validation.tsx:58–69` (`show()` inserts `p.field-error` after the control and adds its id to `aria-describedby`), running alongside `wave-c-form.tsx:96` | The IS-1 opt-out (`data-field-errors`). | **P1** |
| IS-4 | Break types dialog · Owner · 390 | Reference minutes (`#break-minutes`) | "0" passes the field check and the request leaves the browser (1 POST, blocked). The help says "1 to 1,440 minutes". "9999" also passes (`maxLength=4`). The answer then appears only as the dialog's form-level notice, not on the field. | `val-chromium-390-breaksZero.png` | `src/components/clocker-break-types.tsx:190`: `pattern="[0-9]+"` | `pattern="(?:[1-9][0-9]{0,2}\|1[0-3][0-9]{2}\|14[0-3][0-9]\|1440)"`. The existing `pattern` message "Enter whole minutes, from 1 to 1,440." then applies. | P2 |
| IS-5 | Company policies · Owner · 390 | Rule set to "Custom threshold": Threshold and Effective from | With Threshold and Effective from both empty, Save makes no field error. Instead a form-level notice appears, "Check the effective date — Choose a valid effective date…", and focus goes to the notice, not the field. An empty threshold is never flagged (it becomes `Number("") = 0`). | `val-chromium-390-policiesEmpty.png` | `src/components/company-policy-editor.tsx:188–195`: no `required` on the threshold or effective fields. `:162` catches the date error at form level. The messages map at `:42` has only `range`. | Add `required={mode === "configured"}` to the threshold and Effective from fields, and `missing` messages: "Enter the threshold in minutes." and "Choose when this rule starts." | P2 |
| IS-6 | Break types "Archive this break type?"; Clocker devices "Revoke this device's access?" and "Create a new setup code?" · Owner · 320, 390 | Initial focus in a destructive confirm | These dialogs open with focus on the destructive primary ("Archive break type", the red "Revoke device", "Create new code"), so a stray Enter commits at once. The edit dialogs correctly focus the name field. | `dlg-chromium-320-deviceRevoke.png`, `dlg-chromium-320-breakArchive.png` | `src/components/clocker-break-types.tsx:54` and `src/components/clocker-device-manager.tsx:70`: `querySelector('input[name="name"], button[type="submit"]')` | For ARCHIVE, REVOKE and ROTATE, focus the Cancel button: `'input[name="name"], .wc-actions .nv-btn[data-kind="secondary"]'`. | P2 |
| IS-7 | Break types and Clocker devices dialogs · Owner · 320, 390 | Page behind an open dialog | A mouse wheel over the backdrop scrolls the page behind the open sheet: break types 141 px at 390 and 400 px at 320; devices 393–400 px. Break types sets `body { overflow: hidden }`, but the page scrolls on `html` (computed `clip visible`), so the lock has no effect. Devices sets no lock at all, so the two dialogs behave differently. | `dlg-chromium-390-breakAdd.png` | `src/components/clocker-break-types.tsx:52–55`; `src/components/clocker-device-manager.tsx:66–72` | One rule in `premium-wave-c.css`: `html:has(.wc-dialog[open]) { overflow: hidden; }`. Then remove the `body.style.overflow` lines. | P2 |
| IS-8 | Branding, Features & words, Company policies · Owner · 390 | Notice after a 401 | "Not saved: Your access ended. Sign in again to change branding." (features and policies say the same) has **no link**. Account recovery and Clocker recovery show "Go to sign in → /login" in the same situation. | `sub-chromium-390-branding-401.png`, `sub-chromium-390-features-401.png`, `sub-chromium-390-policies-401.png` | `src/components/brand-editor.tsx:68`, `src/components/features-editor.tsx:51`, `src/components/company-policy-editor.tsx:113`: no `action` on the Notice | Pass `action={<Link className="nv-link" href="/login">Go to sign in</Link>}` for the 401/403 case, and title it "Sign in again", as `assisted-recovery.tsx:105–106` does. | P2 |
| IS-9 | Every action · Owner · 390 | Focus while pending and after success | During pending, the pressed button becomes `disabled`, so focus drops to `<body>` on all 14 actions. On failure the alert takes focus back, which is correct. **On Features success, though, focus stays on `<body>`.** There is no notice, the Save button is disabled again ("All changes saved"), and only a toast is announced. A keyboard user's next Tab starts from the top of the page. | `sub-chromium-390-features-ok.png` | `src/components/features-editor.tsx:57–60` (`setNotice(null)`, toast only); `:28` focuses the notice only on errors | After success, focus the save-state text: give `.wc-save-state--done` `tabIndex={-1}` and a ref, then focus it. Or show a "Features saved" status notice and focus it, as Branding does at `brand-editor.tsx:73`. | P2 |
| IS-10 | Branding · Owner · 390 | Hex code field | The error "Enter a colour like #1D4ED8." and `aria-invalid=true` appear on the first keystroke that leaves an incomplete value (`#1`, `#12`, `#12A`…), while the person is still typing. | `val-chromium-390-brandingHex.png` | `src/components/brand-editor.tsx:121`: `error={valid ? undefined : …}` is computed live from `draft` | Track a `touched` flag that's set on blur. Show the error when `touched && !valid`. Keep the Save button disabled while the value is invalid, as now. | P2 |
| IS-11 | Branding · Owner (DOM) | Live regions | Each colour change (swatch, picker or each hex keystroke) updates two polite live regions at once: the adjustments `role=status` and the "Preview of the phone with buttons in #… and a header in #…" sentence. Screen readers hear both each time. Judgment call: the second sentence repeats hex values that mean little when read aloud. | n/a | `src/components/brand-editor.tsx:126` and `:140` | Drop `aria-live` from the preview sentence at `:140` (keep it as `nv-sr` text the user can read), or announce it only when the Phone/Desktop/Clocker view changes. | P2 |
| IS-12 | Clocker devices · Owner (DOM) | Row actions | Every row has buttons named only "Rename", "Replace tablet" / "New setup code" and "Revoke access". In the screen reader's list of buttons, rows can't be told apart. Break types names its row actions ("Edit Rest break", "Archive Rest break"). | n/a | `src/components/clocker-device-manager.tsx:203–205` | `aria-label={`Rename ${device.name}`}`, and the same pattern for the other two (visible text stays). | P2 |
| IS-13 | Positions (measured) and Break types (from code) · Owner · 390 | "Clear filters" in the no-match state | The button sits inside the empty state that it removes. Measured on Positions: search "zzz" shows "No matching positions" and "Showing 0 of 2". Press Clear filters with the keyboard: the search empties and focus is on `<body>`. Break types has the same code. Clocker devices handles this correctly by focusing its search field (`clocker-device-manager.tsx:211`). | `empty-positions-390.png` | `src/components/clocker-break-types.tsx:167`; `src/app/app/settings/positions/position-catalog.tsx:90`, `:155` | Focus the search field after clearing: `searchRef.current?.focus({ preventScroll: true })`, as devices does. | P2 |
| IS-14 | Every Owner-only Settings page (Manager, Lead, Employee); recovery pages (Lead, Employee) · from code | No-access state | `requireRoles` redirects to `/app` with no message, so a Manager following an old Settings link lands on Home without being told why. I couldn't confirm this in the browser this round: the server answered 200 (streamed redirect) or 500 under load. | n/a | `src/lib/auth/permissions.ts:30–32` (auth code, Codex) | Redirect to `/app?denied=settings` and have the Toaster say "Only an Owner can open Settings." Listed for Codex and the coordinator, because Wave C doesn't own auth. | P2 |

## Checked and correct

- **Double tap:** exactly 1 request on every action. The 14 checked were Save (Company profile), Add location, Save (Edit location), Add position, Save position, Create break type, Archive break type, Create setup code, Revoke device, Save brand, Save changes (Features), Save policies, Issue recovery code and Check receipt.
- **Pending (held 5 s):**
  - The label swaps in place: "Saving…", "Adding…", "Issuing recovery code…", "Checking receipt…".
  - The button is disabled. Button, band title and scroll move 0 px (Features: 2 px, the sticky bar).
  - A `role=status` line announces it, e.g. "Saving your location." or "Issuing recovery code. Checking your access…".
  - Clocker recovery's Receipt card shows "Checking the saved receipt".
- **Failure (aborted) and offline:** a focused `role=alert` notice appears above the buttons, the entries are kept and the button comes back enabled.
  - Locations: "Save not confirmed", with a "Check locations" link.
  - Policies: "Save not confirmed", with "Retry the same save".
  - Break types and devices: "Reload break types" / "Refresh devices" replace the primary button.
  - Clocker recovery offline makes 0 requests and shows "Receipt not checked".
- **401 on Account recovery and Clocker recovery:** "Sign in again" / "Sign in to continue", with "Go to sign in → /login", focused.
- **Mocked success:**
  - Branding: "Brand saved", focused, plus a toast.
  - Policies: "Policies saved", focused.
  - Account recovery: "Recovery code ready" receipt, focused (`role=status`), with Select, Single use and Valid until.
  - Clocker recovery: "Recorded action found" with the receipt, focused.
- **Dialogs at 320, 390 and 1440:**
  - They open as modals with `aria-labelledby` and `aria-describedby`.
  - Below 600 px they are bottom sheets, full width, 0 px bottom gap. At 320×568 the Add sheet is 544 px tall and scrolls inside itself.
  - Tab never reaches the page behind. It cycles within the dialog and out to the browser chrome, as native `showModal` does.
  - Escape, Cancel and Close (44×44) all close the dialog and return focus to the exact opener. The backdrop doesn't light-dismiss.
  - Buttons are 52 px tall and fields 48 px.
- **Field errors (Wave C's own):** a 15 px urgent sentence with an icon, linked by `aria-describedby`, with `aria-invalid=true`. The first invalid field gets focus, and every `invalid` event is default-prevented, so no browser bubble shows. IS-3 is the duplicate on top of this.
- **Keyboard sweep at 390 (11 pages, before the scope cut):** every in-page stop has a visible 2 px ring. Teal on white cards; white on the teal band for Back and Add. No in-page stop under 44 px except native checkboxes and radios inside their 44 px+ label rows.
- **Empty and no-match:**
  - Locations `?q=zzz`: "Showing 0 of 2 locations matching "zzz".", "No matching locations", "Clear search and filters → /app/settings/locations", and the query kept in the field.
  - `?status=setup`: "Showing 0 of 2", with "Needs setup 0" marked `aria-current`; `?status=ready`: "Showing 2 of 2".
- **Locations search:** Enter submits a GET (`?q=main`, "Showing 1 of 2 locations matching "main"."). Browser Back restores an enabled "Search locations" button with `aria-busy=false`, so it isn't stuck pending.

## Not covered (scope cut or environment)

- 844×390, and the 1440 runs of the validation and submit scripts (validation and the trap were run at 1440; the submit states only at 390).
- The WebKit spot checks and the Firefox runs. Firefox was cut; the WebKit run didn't finish before the deadline.
- Hover and pressed styles (script ready: `SP/hover.mjs`).
- Loading placeholders reached by client navigation (`SP/states.mjs loading`).
- Offline client navigation.
- Signed out mid-use on server-action pages (CODEX §2).
- No access checked in the browser.
- Reduced motion.
- The Clocker devices setup-code card: it only appears after a real success, which wasn't run.
- Native window blur (it hides the recovery code) can't be produced in Playwright.

Zero open P0–P2 in this area: **no**.

## Round 2

October 19, 2026, on the same frozen preview at HEAD `0490d84`. Chromium at 320×568, 390×844 and 1440×900, with WebKit spot checks at 390. Every POST was blocked or mocked, except one real Features save that was then reversed (see IS-9). Round 2 scripts and logs are in `SP/r2/`; screenshots in `SP/shots/` (`r2-*`, `val-*`, `dlg-*`, `trap-*`).

**Verdict:** 11 of 13 actionable round-1 findings are fixed, and IS-14 is now decided. One is not fixed: **IS-6**, the destructive dialogs still open on the destructive button. The fix adds `data-autofocus` to Cancel, but the selector it uses can't pick it. There is one new P2, **IS-15**: the Features save bar is two rows at 390, so the "Features saved" toast covers the Save button.

**Count: 0 P0, 0 P1, 2 P2 open (IS-6, IS-15).**

### Status of round-1 findings

| ID | Status | Evidence (round 2) |
|---|---|---|
| IS-1 | Fixed | Tab from "How you verified them" at 390 goes: checkbox → Issue recovery code → guide disclosure → onward. Shift+Tab leaves too. No injected error. Same at 1440. WebKit at 390: no trap. |
| IS-2 | Fixed | "Bad Key" + Tab: focus moves on to the next control and no error appears on blur. A short attestation and then a click on the checkbox: **checked = true**, and the box stays at y 736 (390) and y 681 (1440). Clicking the label text also checks it. |
| IS-3 | Fixed | Exactly one error sentence per field on every form, with 0 `.field-error` nodes. Checked: Company profile 1, New location 2, Clocker key 1, Edit location 2, Positions add and edit 1, Break types 2, Devices 2, Policies 2, Account recovery 3, Clocker recovery 1, at 390 and 1440. WebKit: New location 1 and Account recovery 3, with 0 duplicates. In each case the first invalid field takes focus, 0 POSTs are sent, and `aria-describedby` holds the error plus the help only. |
| IS-4 | Fixed | Reference time "0" and "9999" show "Enter whole minutes, from 1 to 1,440." on the field, focus it, and send 0 POSTs. "abc" gives the same. |
| IS-5 | Fixed | A custom rule with both fields empty shows "Enter the threshold in minutes." and "Choose when this rule starts." on the fields, and focus goes to the threshold. "-5" shows "Enter whole minutes, 0 or more." 0 POSTs. |
| IS-6 | **Not fixed** | At 320 and 1440, Archive break type, Revoke device and Create new code still open with focus on the destructive primary ("Archive break type", "Revoke device", "Create new code"). Cancel carries `data-autofocus`, but `querySelector('input[name="name"], [data-autofocus], button[type="submit"]')` returns the **first match in document order**, not in selector order. The submit button comes before Cancel in the DOM, so it wins. Cause: `src/components/clocker-break-types.tsx:54`, `src/components/clocker-device-manager.tsx:71`. Fix: `(element.querySelector('[data-autofocus]') ?? element.querySelector('input[name="name"], button[type="submit"]'))?.focus({ preventScroll: true })`. Screenshots: `dlg-chromium-320-breakArchive.png`, `dlg-chromium-320-deviceRevoke.png`, `dlg-chromium-1440-deviceRevoke.png`. P2. |
| IS-7 | Fixed | Wheel over the backdrop: the page moves 0 px for all 7 dialogs at 320 and the 3 checked at 1440. `html` is `overflow: hidden` while a dialog is open and restored after Escape, Cancel or Close. |
| IS-8 | Fixed | A 401 on Branding, Features and Policies shows "Sign in again", the sentence, and **Go to sign in → /login**, with focus on the notice. |
| IS-9 | Fixed | A real Features save (word preset Standard → Retail, then back to Standard, so the fictional data ends unchanged): focus lands on "Saved" (`span.wc-save-state--done`) with a visible 2 px teal ring (`r2-features-saved-standard.png`). During pending, focus still drops to `<body>` on every action, but the outcome notice or the "Saved" line takes it back each time. |
| IS-10 | Fixed | Typing "#12" shows no error and help stays visible. After blur, "Enter a color like #1D4ED8." appears, once. |
| IS-11 | Fixed | One live region is left in the Branding editor (`wc-adjustments`). The preview sentence is plain `nv-sr` text. |
| IS-12 | Fixed | Row buttons are named "Rename Fictional payroll clock", "Replace tablet for Fictional payroll clock" and "Revoke access for Fictional payroll clock". |
| IS-13 | Fixed | Clear filters (pressed with the keyboard) puts focus in the search field on Positions, Break types and Devices, and empties it. |
| IS-14 | Decided | Moved to `CODEX.md` (no-access redirect); not refiled. |

### New findings

| ID | Screen · role · width | Element | What is wrong, measured | Screenshot | Cause | Fix | Sev |
|---|---|---|---|---|---|---|---|
| IS-15 | Features & words · Owner · 390 | Save bar after a save, and the "Features saved" toast | The save bar is **two rows**, 132 px tall (y 644–776): the Save button at y 656–708, then "Saved" at y 720–764. ROUND-2.md says it stays one row. The toast is lifted for a 76 px bar, so it sits at about y 648–692, **on top of the Save button**, for the toast's lifetime. The button is disabled at that moment, but the bar reads as broken. As soon as someone edits again, the Save button is covered until the toast goes. | `r2-features-saved-standard.png` | `src/app/app/portal-premium.css:479` assumes a 76 px bar (`calc(68px + 76px + 8px)`). The Features bar wraps its state under the full-width button (`.wc-actions` on phones, `premium-wave-c.css`). | Keep the bar one row on phones: `.wc-actions.nv-actionbar:has(.wc-save-state) { flex-wrap: nowrap }` with the button `flex: 1 1 auto` and the state `flex: none`. Or lift the toast by the bar's real height through a `--nv-actionbar-h` variable set on the bar. | P2 |

### Checked and correct (round 2)

- **noValidate on every Wave C form:**
  - no browser bubble and no blur checks;
  - the first invalid field focused after a requestAnimationFrame;
  - errors clear on input once the value is valid;
  - 0 requests on an invalid submit.
- **Dialogs at 320:**
  - bottom sheets, full width, bottom gap 0; the Add sheet at 568 tall scrolls inside itself;
  - focus starts in the name field for Add, Edit and Rename;
  - Escape, Cancel and Close return focus to the exact opener (7 of 7);
  - Tab never reaches the page.
- **Back targets:**
  - Manager with `?from=settings` on Account and Clocker recovery: **Home → /app**.
  - Owner with `?from=settings`: **Settings → /app/settings**.
  - `?employee=AUDIT-E`: "AUDIT-E" → `/app/employees/AUDIT-E`, with the ID prefilled.
  - Location detail and New location: Locations.
- **Location not found** (`/app/settings/locations/does-not-exist`):
  - Settings frame with Back to Locations;
  - h1 "Location not found";
  - empty state "We couldn't find this location";
  - "Go to Locations".
- **Count lines:**
  - "Showing 0 of 2 locations matching "zzz"";
  - "Showing 0 of 2 positions";
  - "Showing 0 of 1 break type";
  - "Showing 0 of 1 device";
  - the status filters: setup 0, ready 2, inactive 0, with `aria-current` on the pill.
- **Locations search:** browser Back restores an enabled "Search locations" button with `aria-busy=false`.

**Not covered in round 2:** 844×390, 200% text (checks.mjs covers both), hover, loading by client navigation, and reduced motion.

Zero open P0–P2 in this area: **no** (IS-6 and IS-15 are open, both P2).
