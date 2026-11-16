# Clocker kiosk: every-inch UI/UX review

Scope: `/clocker/scan-kiosk-main`. This covers all 40 English states at 1024×768, 768×1024 and 390×844; the Spanish states at 1024×768; the keyboard walk; and the motion frames (check draw-in, progress bar and wrong-PIN shake, with reduced-motion versions). There are 179 images in `/tmp/review/clocker/`.

The review judges against the approved Direction B: `DESIGN.MD` "Clocker Direction B" (line 1632) and `docs/product/direction-b/mocks/8-clocker.html`.

Code read:
- `src/components/clocker.module.css`
- `clocker-shell.tsx`, `clocker-setup.tsx`, `clocker-pin-gate.tsx`, `clocker-punch-panel.tsx`, `clocker-recovery.tsx`, `clocker-icon.tsx` and `clocker-language.tsx`
- `clocker-photo/punch-photo-flow.tsx` and `clocker-photo/photo.module.css`
- the server's PIN rate-limit scope, `src/lib/clocker/pins.server.ts`

Skills applied: better-ui, better-typography, better-colors, better-layout, better-interface, better-accessibility and design-critique.

Not repeated here:
- The code audit `code-design-system.md`: band alphas C1, band recipes C8, press scales and durations B2/M1, disabled looks B5, the B3 `.lang` scale.
- The copy audit `copy-audit.md`: missing Spanish server errors, "dueño" vs "gerente", jargon ("request ID", "replayed"), Title Case, "Reference:", fragment joins.

**Evidence notes**
- **No audit JSON exists for any Clocker image.** The manifest lists 179 Clocker images, but none has an `audit` field and there is no `.audit.json` in `/tmp/review/clocker/`.
- In place of the audit JSON I used:
  - the state log `/tmp/review/_logs-clocker-en.json` and `_logs-clocker-es.json` (h1, alerts, `small`, `clipped`, keyboard order);
  - contrast I computed with the WCAG formula from the declared tokens and sampled band pixels;
  - geometry measured from the screenshots.
- The log's `clipped: ["Employee PIN"]` entry is the visually hidden label (`.sr`). It is a false positive.
- **Mouse hover is latched in some shots.** For example, "Help with a saved action" is underlined in 14/15/16/32, "Check Connection" has a grey fill in 37, and the Rest break row is tinted in 17. All hover styles sit behind `@media (hover: hover)` (clocker.module.css:182, 235, 273), so a touch kiosk never shows them. These are not findings.

Severity: **High** blocks or confuses a task, or fails accessibility. **Medium** is a visible inconsistency or friction. **Low** is polish.

---

## Band (all states)

### CK-001 · High · The live clock is clipped at the band's edge, and AM/PM is lost
- **Images:** every 1024×768 state, e.g. `clocker-clocker-scan-kiosk-main-1024-12-ready-off-clock-1024x768.png` ("10:43 P"). In Spanish, `clocker-es-clocker-scan-kiosk-main-1024-10-ready-off-clock-1024x768.png` shows only "10:43 p".
- **What's wrong:**
  - At 1024 the band is `clamp(320px, 36vw, 480px)` = 368px, which leaves a 296px content box after 36px padding each side.
  - The clock is `clamp(5.5rem, 11.7vw, 8.25rem)` = 120px. "10:43" alone measures about 306px in the shot, and the 30px day period plus the 10px gap add about 55px more.
  - `.band { overflow: hidden }` and `.clock { white-space: nowrap }` cut it off.
  - The mock fits only because it shows "3:42 PM". In English, every 10, 11 and 12 o'clock hour clips (3 of every 12 hours).
  - In Spanish, "p. m." is wider, so even "3:42 p. m." needs about 313px and clips at every hour.
  - At 1280 wide it still clips by about 3px. Portrait and 390 are fine.
- **Breaks:** the band's hero figure is the kiosk's primary information (aesthetic-usability; better-layout "plan for growth and clipping"). Clipped content is a better-interface escalation trigger.
- **Fix:**
  - Size the clock to the band, not the viewport. Add `container-type: inline-size` to `.band` (clocker.module.css:56).
  - Use `.clock { font-size: clamp(4.5rem, 29cqi, 8.25rem); }` (:72). At a 296px content box that is about 86px, so "10:43 p. m." fits.
  - Alternatively, let `.clock` wrap the day period under the digits: `flex-wrap: wrap` on `.clock`, with `.clock > span { flex-basis: 100% }` only when it doesn't fit.
  - Verify with 10:00–12:59 in English and Spanish at 1024 and 1280.

### CK-002 · High · The band says "Tablet registered" (green dot) while the card says the tablet is offline, locked or must be reconnected
- **Images:** `…-1024-35-pin-offline`, `-36-pin-unavailable`, `-37-pin-clear-failed`, `-38-pin-reconnect-tablet`, `-39-pin-too-many-attempts`, `-40-browser-storage-needed`, `-22-clock-state-unavailable` (all 1024x768). The same applies at 768 and 390.
- **What's wrong:**
  - The band's status comes only from the setup check, at `clocker-setup.tsx:80` → `clocker-shell.tsx:30,56`.
  - The PIN gate's failures never reach it, at `clocker-pin-gate.tsx:106–107`. These are a 401 device failure, offline, a 503 and "could not clear verification".
  - So a red "Reconnect this tablet before entering an employee PIN" card sits beside a green "Tablet registered".
- **Breaks:** one colour, one meaning (green = done or OK) is used against its meaning, which is an escalation trigger. It also breaks consistency between the two regions of one screen (Gestalt common region: the band is the tablet's status panel).
- **Fix:**
  - Lift a `tabletHealth` value from `ClockerPinGate` to `ClockerShell`, through a context or an `onStatus` callback.
  - Map 401/device → `attn` "Reconnect needed", offline/503/clear-failed → `attn` "No connection", 429 → `attn` "Paused: too many attempts".
  - `.status[data-tone=attn]` already exists (clocker.module.css:82). Only the text and tone are passed, with no layout change.

### CK-003 · High · "TIME CLOCK" label under the wordmark is 3.72:1
- **Images:** every state at 1024 and 768, e.g. `…-1024-06-pin-empty-1024x768.png`.
- **What's wrong:**
  - `.label` is 12.5px/600 at `rgb(255 255 255 / .74)` (clocker.module.css:67).
  - Composited over the sampled band pixel behind it, `#0D7771`, it measures **3.72:1**. Small text needs 4.5:1.
  - This is a new instance of code audit C1, which lists only :84–85.
  - By the same method, the date at .86 measures 6.09:1 and the "PM" at .84 measures 4.92:1. Both pass.
- **Breaks:** WCAG 1.4.3.
- **Fix:** `color: #FFFFFF` on `.label` (:67). The uppercase plus tracking already carries the hierarchy. This is the C1 `--b-on-band` token.

---

## 01 Invalid key (404)

### CK-004 · Medium · A kiosk with a broken link gets one action, "Go to sign in"
- **Images:** `clocker-clocker-scan-kiosk-main-1024-01-invalid-key-1024x768.png`, `…-390-01-invalid-key-390x844.png`.
- **What's wrong:**
  - The amber hint ("Is this a time clock tablet?") is the right message. The only button, though, invites whoever is standing at the shared tablet to sign in to NEVORA. An employee arriving to clock in will tap the one teal pill, which leads nowhere useful and puts a personal sign-in on a shared device.
  - The shot also shows the Next.js dev overlay "1 Issue". The log has "Encountered a script tag while rendering React component" on this route.
- **Breaks:** Jakob's law (a kiosk error page should not route to an account flow). One primary action per view should be the right one.
- **Fix:**
  - When the hint shows (`src/app/not-found-hint.tsx:9`), demote "Go to sign in" to a text link.
  - Make the hint the card's lead, with "Ask a manager to set up this tablet again" as the instruction.
  - Fix the script-tag warning, so the dev overlay isn't mistaken for a product badge in QA shots.

## 02–05 Setup

### CK-005 · Low · Setup card alignment and duplicate status
- **Images:** `…-1024-02-setup-checking`, `-03-setup`, `-04-setup-bad-code`, `…-768-03-setup` (all 1024x768 except the 768 shot).
- **What's wrong:**
  1. The "Setup code" label is left-aligned, but the hint under the field is centred: `.hint` has no `text-align` and inherits the card's centre (clocker.module.css:207). The field gets two left edges.
  2. The lead wraps so a line starts with the arrow: "→ Clocker tablets." This happens at 1024 and 768.
  3. While checking, the card shows the same status twice: "Checking setup..." in the disabled button and "Checking this tablet..." with a spinner under it (`clocker-setup.tsx:104,108`).
  4. In the bad-code state, a "Check Setup" link appears under Connect tablet (`clocker-setup.tsx:111–112`). It's a second action that doesn't address the error, which is the pasted code (Hick).
- **Breaks:** Gestalt continuity and common alignment edges; Hick's law.
- **Fix:**
  - Add `.hint { text-align: left }`.
  - Bind the path with a no-break space before the arrow (`Settings → Clocker tablets`), or wrap it in `white-space: nowrap`.
  - Keep only the button's busy label and drop the `.busy` line on the setup form.
  - Show "Check Setup" only for `uncertain` failures.

## 06–11 PIN entry

### CK-006 · High · The empty PIN slots fail non-text contrast, and fail worse in the error state
- **Images:** `…-1024-06-pin-empty`, `-09-pin-two-digits`, `-10-pin-not-recognized` (1024x768); `…-768-06-pin-empty` (768x1024).
- **What's wrong:**
  - The four slots are the only progress indicator for the PIN. An empty slot ring is `#9AA3A8` on the field's `#F2F5F4`: **2.34:1** (clocker.module.css:221).
  - In the error state it's `#E19A92` on `#FDECEA`: **1.99:1** (:224).
  - At arm's length, under store lighting, the user can't count the digits remaining.
- **Breaks:** WCAG 1.4.11 (meaningful graphics need 3:1). Fitts's and Doherty's laws suffer indirectly: the user re-types because they lost count.
- **Fix:**
  - Use `#7A8489` for the empty ring (about 3.6:1 on `#F2F5F4`) at :221.
  - Use `#C2554A` in the error state (about 3.9:1 on `#FDECEA`) at :224.
  - Consider 18px slots with a 2.5px ring.

### CK-007 · Medium · In a bright store the keypad grid nearly disappears
- **Images:** `…-1024-06-pin-empty`, `…-768-06-pin-empty`, `…-390-06-pin-empty`.
- **What's wrong:**
  - Key fill `#F0F2F3` on the white card is 1.12:1 (`--ck-key`, :19, :231).
  - The Clear and delete keys have only a 1.5px `#E1E5E6` line, at 1.27:1 (:233).
  - The PIN field's fill `#F2F5F4` on white is 1.10:1 (:216).
  - The digits read well, but the key boundaries are what a finger aims at. Under glare the grid washes out to floating numerals, and the two tool keys look like empty slots. This is not an AA failure, because the digit labels identify the buttons.
- **Breaks:** Fitts's law (a target you can't see is effectively smaller); Gestalt figure-ground; aesthetic-usability.
- **Fix:**
  - Darken `--ck-key` to `#E6EAEB` (1.22:1), or add `box-shadow: inset 0 0 0 1px #D3D9DB` to `.key`.
  - Raise the tool-key line to `--ck-field` `#D3D9DB` at 2px (:233).
  - The teal pressed tint (`#CFE7E3` with a 2px ring, :234) already reads well.

### CK-008 · Medium · The PIN field looks the same focused and unfocused
- **Images:** `…-1024-keyboard-skip-1024x768.png`, `…-1024-keyboard-typed-1024x768.png`, `…-1024-06-pin-empty-1024x768.png`.
- **What's wrong:**
  - At rest the field already has a 2px teal inset ring (:216). Focus only thickens it to 3px (:219), and `.pin input:focus-visible { outline: none }` (:218).
  - A hardware-keyboard user can't tell whether typing goes into the field. The keyboard-skip shot shows no visible difference while focus moves between the field, the body and the skip link (the log's keyboard order: `input#clocker-pin → body → a Skip to time clock → input…`).
- **Breaks:** WCAG 2.4.7 in practice (a 1px change is not a perceivable indicator); better-accessibility "visible focus rings".
- **Fix:** Give the resting field a neutral ring, `inset 0 0 0 2px var(--ck-field)` at :216. Keep teal for `:focus-within` and add an outer ring: `box-shadow: inset 0 0 0 2px var(--ck-focus), 0 0 0 4px rgb(11 110 105 / .18)` at :219.

### CK-009 · Medium · A wrong PIN moves the keypad under the finger
- **Images:**
  - Compare `…-1024-09-pin-two-digits` (key "1" top at y≈215) with `…-1024-10-pin-not-recognized` (y≈242).
  - Shake frames `…-motion-wrong-pin-shake-0120ms` → `-0160ms`: the heading rises about 5px as the card re-centres.
  - At 768, `…-768-10` vs `…-768-06`: the keys drop 31px.
- **What's wrong:**
  - The error paragraph is inserted between the field and the keypad (`clocker-pin-gate.tsx:135`). That pushes the whole keypad down 27–31px and re-centres the card vertically.
  - The user's next tap, already in flight, lands one row off.
- **Breaks:** Fitts's law; Doherty's law (stable layout during feedback); the "high-frequency interactions get no animation or shift" rule.
- **Fix:**
  - Reserve the message line permanently: render the `<p id="clocker-pin-error">` always, with `min-height: 2.8em` (two lines at .9375rem/1.4), and empty its text when there's no error.
  - Keep `role="alert"` on a stable container, so screen readers still announce it.
  - Alternatively, place the message above the field, under the heading, where no target sits.

### CK-010 · Medium · The red error state stays on while the next PIN is typed
- **Images:** `…-1024-10-pin-not-recognized-1024x768.png` (the state that persists). The code path is in `clocker-pin-gate.tsx:83–88`.
- **What's wrong:**
  - `key()` updates the digit count but never clears `error`. `shown = error && !blocked` (:112) keeps the field red, with "PIN not recognized…", while the user enters a new PIN. The newly filled dots render teal on a red wash.
  - The mock describes the red as the response to one submit, not a mode.
- **Breaks:** status colour semantics (red = stop on an input that is now valid); the field's state doesn't match reality.
- **Fix:** In `key()` (:83) and the input's `onChange` (:132), call `setError(null)` on the first keystroke after an error. The message can fade out under `prefers-reduced-motion: no-preference`.

### CK-011 · Medium · "Checking…" appears at the very bottom of the card, far from where the user is looking
- **Images:** `…-1024-11-pin-checking-1024x768.png`; `clocker-es-…-1024-09-pin-checking-1024x768.png`.
- **What's wrong:**
  - After Continue, the keypad dims to .45 and the only status line is placed below the language toggle (`clocker-pin-gate.tsx:145`, `.busy` :193). It sits about 500px from the field the user was watching.
  - The card also grows 17px and shifts up.
  - The Continue button stays grey with no busy state, so the eye gets no feedback at the point of action.
- **Breaks:** Doherty's law (feedback must sit where attention is); Gestalt proximity.
- **Fix:**
  - Put the busy state in the Continue button itself: label "Checking…" plus the 16px spinner. Keep the `role="status"` line, but render it as an `.sr` element so it doesn't change the layout.
  - Optionally show a spinner in the field in place of the dots.

### CK-012 · High · Every blocked PIN state offers the same "Check Connection" button, which doesn't fix three of the four causes
- **Images:** `…-1024-38-pin-reconnect-tablet`, `-37-pin-clear-failed`, `-39-pin-too-many-attempts`, `-35-pin-offline` (1024x768); also at 768 and 390.
- **What's wrong:** `blockedCard` (`clocker-pin-gate.tsx:115–116`) always renders one secondary button, "Check Connection", which calls `reset()`.
  - **Reconnect this tablet (401/device):** the tablet must be re-enrolled with an Owner's setup code. "Check Connection" just clears and shows the keypad again, and the next PIN fails the same way. The card names no way to recover; an employee can't reconnect a tablet.
  - **Too many attempts (429):** the cause is a wait, not the network. "Check Connection" re-opens the keypad immediately, inviting another attempt that extends the lock.
  - The button is styled secondary (white with a line), so the screen has no primary action at all.
- **Breaks:**
  - An error that names no way to recover is an escalation trigger.
  - Jakob's law (the button label should describe the result).
  - "Fill exactly one action per view".
- **Fix (this keeps the approved flow and copy direction; the copy itself goes to the copy owner):**
  - `tone === 'device'`: add the instruction line "Ask a manager to set up this tablet again (Settings → Clocker tablets)". Label the button "Check again".
  - `tone === 'wait'`: label the button "Try again", or disable it for 60s.
  - `stop` (offline/clear failed): keep "Check Connection".
  - Use `data-kind="primary"` for the single button, at :116.

### CK-013 · High · The PIN lockout covers the whole tablet, but the screen reads as though it's about the next person
- **Images:** `…-1024-39-pin-too-many-attempts-1024x768.png`, `…-390-39-…`, `clocker-es-…-31-pin-too-many-attempts-1024x768.png`.
- **What's wrong:**
  - The attempt budget is per device (`pins.server.ts:62–70`: "Reserve the shared/tablet attempt budget"; scope `DEVICE`).
  - After someone else's wrong PINs, the next employee walks up to "Too many attempts. Wait a few minutes before trying again." The heading is still "Enter your PIN" (`clocker-pin-gate.tsx:125`).
  - They believe they did something wrong and have no way to clock in. There's no "ask a manager to record your time" path, and the band still says green "Tablet registered" (CK-002).
  - The approved design rules out a countdown, and this finding keeps that.
- **Breaks:** blocks the core task for uninvolved users; mental model (Jakob's law); privacy and fairness on a shared device.
- **Fix:** UI only; the server's limits stay as they are.
  - When `tone === 'wait'`, change the heading from "Enter your PIN" to "This tablet is paused".
  - Add a second line: "Too many wrong PINs were entered on this tablet. Wait about five minutes, or ask a manager to record your time."
  - Combine this with CK-002's band state "Paused: too many attempts".

### CK-014 · Medium · In portrait, the wrong-PIN card runs off the bottom of a 768×1024 tablet
- **Images:** `…-768-10-pin-not-recognized-768x1024.png` (the card's bottom edge isn't visible and Español sits at y≈991 and is clipped); `…-390-10-pin-not-recognized-390x844.png` (Español is cut off).
- **What's wrong:**
  - Key height `clamp(72px, calc((100dvh - 690px) / 4), 96px)` (clocker.module.css:95) is sized for the resting card. The 27px error line (CK-009) then pushes the card past the viewport, and a kiosk without visible scroll hides the language switch and the card's foot.
- **Breaks:** better-layout ("never park a control where content growth clips it").
- **Fix:** Reserving the error line (CK-009) fixes this too. Otherwise subtract it from the clamp: `calc((100dvh - 730px) / 4)`.

---

## 12, 14, 16, 19, 31, 32 Ready (clock state)

### CK-015 · Medium · Start Break and End Break use the same coffee-cup icon
- **Images:** `…-1024-16-ready-clocked-in-1024x768.png` (Start Break: cup); `…-1024-19-ready-on-break-1024x768.png` (End Break: the same cup, now in the teal lead row).
- **What's wrong:**
  - `clocker-icon.tsx:33` maps both `break` and `resume` to `CoffeeIcon`. When on break, the leading teal action shows the cup, which reads as "take a break", not "back to work".
  - Clock In and Clock Out, by contrast, have distinct directional glyphs (SignIn/SignOut).
- **Breaks:** Gestalt similarity (identical icons imply identical actions); icon semantics.
- **Fix:** Map `resume` to a distinct Phosphor bold glyph, e.g. `BriefcaseIcon` ("back to work") or `ArrowUUpLeftIcon` (return), at clocker-icon.tsx:33. Keep `CoffeeIcon` for Start Break only.

### CK-016 · Low · The status chip and the detail line repeat each other, and the 66px indent creates a third left edge
- **Images:** `…-1024-16-ready-clocked-in` ("Clocked in" chip, then "Clocked in 10:43 PM"); `clocker-es-…-14-ready-clocked-in` ("En turno" chip, then "En turno 10:47 p. m."); `…-390-16-ready-clocked-in-390x844.png` (the detail wraps after "·" because of the indent).
- **What's wrong:**
  - `.strow` and `.breakContext` are indented 66px (:257, :265) to sit under the name. The note, the message and the action rows start at 0.
  - At 1024 that gives three left edges in one card (avatar 492, chip 558, note 492). At 390 it forces "under a minute ago" onto its own line.
  - The detail repeats the chip's word.
- **Breaks:** shared alignment edges; Miller's law (redundant tokens add load).
- **Fix:**
  - Drop the indent at ≤599px: `@media (max-width: 599px) { .strow, .breakContext { margin-left: 0 } }`.
  - Make the detail time-only: "Since 10:43 PM · under a minute ago". The label at `clocker-punch-panel.tsx:202` would become "Since"; the copy owner signs off.

### CK-017 · Low · The "kept for review" message after Review has no icon and starts on a different edge
- **Image:** `…-1024-31-ready-after-review-1024x768.png`.
- **What's wrong:** The teal `.msg` (`clocker-punch-panel.tsx:193`, css :161) starts at x=492 with no icon. The detail line above starts at 558. Every other `.msg` carries an 18px icon.
- **Breaks:** consistency between states; Gestalt continuity.
- **Fix:** Render the notice with `<ClockerIcon name="info" size={18}/>`, as in the PIN error. Give the ready-screen notice the `.note` box, which the no-break-types notice already uses.

### CK-018 · Low · The initial's face tint can land on red or pink, beside a red = stop vocabulary
- **Images:** `…-1024-12-ready-off-clock` ("J" on pink with dark red), `…-1024-25-sending`.
- **What's wrong:** `faceTint` (`src/lib/face-tint.ts:4`) produces a red family for "James". On a kiosk where red means stop, the first thing shown beside "Hi, James." is a red-tinted circle.
- **Breaks:** one colour, one meaning (the tint is decorative, but it lands in the status hue).
- **Fix:** On the Clocker, exclude hues within 15° of `--ck-red` (and of amber) from the face palette. Alternatively, use the teal soft tint for every face on the kiosk.

---

## 15 Privacy reminder and timers

### CK-019 · High · The privacy pill wraps, overlaps the card and is clipped at phone width
- **Images:**
  - `…-390-15-privacy-warning-390x844.png`: the text wraps to four lines ("This / screen / clears in 5 / seconds.") and the last line is cut off by the viewport.
  - `clocker-es-…-13-privacy-warning-1024x768.png`: three lines, with the pill rising over the card's last line.
  - `…-768-15-privacy-warning-768x1024.png`: it covers "This screen clears after 30 seconds."
  - `…-1024-15-…`: the orphan "seconds."
- **What's wrong:**
  - `.privacy` is a one-row flex at `width: min(472px, calc(100% - 48px))` (clocker.module.css:247). The button "Continue securely" / "Continue securely" in Spanish ("Continuar de forma segura") takes its full width with `flex: none` (:251).
  - The message is squeezed into the leftover 60–140px.
  - At 390 the absolute pill sits at the bottom of a task area taller than the viewport, so it's partly offscreen.
- **Breaks:** the privacy countdown must be readable in its last seconds. Clipped content is an escalation trigger (better-layout "plan for growth").
- **Fix:**
  - Let the pill wrap. Use `flex-wrap: wrap` on `.privacy`, `.privacy p { min-width: 12ch }`, and `.privacy .btn { flex: 1 0 100% }` under `@media (max-width: 599px)`.
  - Use `position: fixed; bottom: max(16px, env(safe-area-inset-bottom))` on phones, so it is always in view.
  - Shorten the line to "Clears in 5 s" (copy owner), or drop the text, since the count ring already carries it, and keep an `.sr` sentence.

### CK-020 · Medium · Two privacy timers disagree, and two private screens show none
- **Images:** `…-1024-15-privacy-warning` ("This screen clears after 30 seconds." under a live "clears in 6 seconds"); `…-1024-17-choose-break` and `…-1024-24-confirm-clock-out` (no timer line, though the same 30s window runs).
- **What's wrong:**
  - The static line (`clocker-punch-panel.tsx:219`, `clocker-pin-gate.tsx:123`) keeps saying 30 seconds while the pill counts down.
  - Choose a Break and Clock Out? still belong to the 30s private window. They can be wiped without any reminder until the last 10s.
- **Breaks:** consistency between states; visible system status.
- **Fix:**
  - Hide the static `.clears` line while the pill shows: `.content:has(> .privacy) .clears { visibility: hidden }`.
  - Render the same `.clears` line on `select-break` and `confirm-out` (`clocker-punch-panel.tsx:222–236`).

### CK-021 · Medium · The privacy countdown is announced every second
- **Image:** `…-1024-15-privacy-warning-1024x768.png`; code at `clocker-pin-gate.tsx:144`.
- **What's wrong:**
  - The `<p role="status">` text changes on each 250ms tick that crosses a second, so screen readers queue 10 announcements.
  - It is also mounted already containing its text at the 10s mark, which some readers skip.
- **Breaks:** better-accessibility "announce dynamic content" (stable region, no chatter).
- **Fix:**
  - Keep the visible count `aria-hidden`.
  - Render an always-present empty `.sr` status region. Write to it once at 10s ("This screen clears in 10 seconds") and once at 3s.

---

## 17 Choose a Break · 20, 24 Clock Out?

### CK-022 · Low · "Help with a saved action" adds a choice at decision points
- **Images:** `…-1024-17-choose-break`, `-20-confirm-clock-out-on-break`, `-24-confirm-clock-out`, `-22`/`-26`/`-28`/`-30` (all 1024x768).
- **What's wrong:**
  - `handoff(false)` renders on every non-ready mode (`clocker-punch-panel.tsx:256`). Choosing a break type or confirming Clock Out therefore carries a third, unrelated teal link, about the tablet's other saved records, under the two real choices.
  - On Clock Out? it sits where a hurried thumb ends up after "Cancel clock-out".
- **Breaks:** Hick's law; Fitts's law (an extra target near the decision).
- **Fix:** Exclude `select-break` and `confirm-out` from line 256: `!['select-break','confirm-out'].includes(mode)`. It stays on Ready and on the recovery states, where it's relevant.

The confirm screens otherwise work well. The amber ring, the facts box, the amber break warning and teal Confirm over grey Cancel are clear and match the mock. In Spanish, "menos de un minuto" wraps to two lines in the facts cell (`clocker-es-…-18-…`), which is acceptable.

---

## 13, 18, 21, 29 Recorded (receipt)

### CK-023 · Medium · The Spanish receipt puts the date in English order and lowercase
- **Image:** `clocker-es-clocker-scan-kiosk-main-1024-11-receipt-clock-in-1024x768.png` ("Registrado a las nov 9 · 10:47 p. m.").
- **What's wrong:**
  - `clockTime()` assembles `${month} ${day}` by hand (`clocker-punch-panel.tsx:26–30`). The es-PR locale gets month-before-day and a lowercase "nov".
  - "a las" also precedes a date. The copy audit covers the fragment join; the ordering bug is in code.
- **Breaks:** better-typography "language and bidi behaviour" (never reorder by hand); the Spanish layout.
- **Fix:**
  - Use `Intl.DateTimeFormat(locale, {month:'short', day:'numeric'}).format()` for the date part, which gives "9 nov". Join it with the time using " · ".
  - In Spanish the result reads "9 nov · 10:47 p. m.". English is unchanged.

### CK-024 · Low · The receipt states the time three times, and its 13.5px line ends on an orphan
- **Images:** `…-1024-13-receipt-clock-in`, `-18`, `-21`, `-29` (1024x768).
- **What's wrong:**
  - The time appears in the band clock (10:43), the hero ("10:43 PM") and "Saved at Nov 9 · 10:43 PM". The hero is approved.
  - The "Saved at" line wraps to leave "seconds." alone at 1024 (`.saved`, :302).
- **Breaks:** Miller's law (redundant tokens); better-typography `text-wrap: pretty`.
- **Fix:** Add `text-wrap: pretty` to `.saved` (:302). Show the date part only when it differs from today, which is how `shortTime()` already works at :34.

### CK-025 · High · The photo-path receipt doesn't say what was recorded and looks nothing like the normal receipt
- **Image:** `…-1024-34-photo-time-recorded-1024x768.png`, versus `…-1024-29-receipt-clock-out-1024x768.png` for the same action without a photo.
- **What's wrong:**
  - After "Photo for Clock Out", the result is a 64px ring with a thin check (not the 96px filled check) and the heading "Time recorded". It doesn't name the action (Clock Out).
  - There is no hero time, no goodbye line and no 8-second bar.
  - The photo exception ("The photo was not saved; a photo exception is recorded.") sits in a neutral grey box, although it's a warning the employee may need to act on.
  - The time uses a different format, "Nov 9, 10:45 PM" vs "Nov 9 · 10:45 PM".
  - The exit is a quiet teal "Return to PIN" text button, not the grey Done pill.
  - The code is in `punch-photo-flow.tsx:12` (`complete:'Time recorded'`), :14 (`complete:['check','green']` ring), :57 (`.notice` grey), :59 (format) and :71 (quiet button).
- **Breaks:** confirmation clarity (the user must see which punch was recorded); a semantic colour used against its meaning (the warning is shown neutral); consistency between states.
- **Fix:**
  - Reuse the punch panel's receipt block for `phase === 'complete'`: the `.check`, `.hero`, `.bye`, `.saved` and `.countdown` classes from clocker.module.css. Set the heading from `receipts[state.action]` ("Clock Out Recorded").
  - Render the photo exception as `.note[data-tone=amber]` with the warning icon.
  - Use the same `clockTime()` format and a `.btn[data-kind=secondary]` "Done".

---

## 25 Recording · motion

### CK-026 · Low · One hourglass means both "locked out" and "in progress"
- **Images:** `…-1024-25-sending` (teal ring, hourglass); `…-1024-39-pin-too-many-attempts` (amber ring, hourglass).
- **What's wrong:** `waiting ? ['wait','teal']` (`clocker-punch-panel.tsx:183`) and `tone==='wait'` amber (`clocker-pin-gate.tsx:113`) use the same `HourglassMedium` glyph. DESIGN.MD reserves amber for wait.
- **Breaks:** Gestalt similarity; one icon, one meaning.
- **Fix:** For Recording, show the action's own glyph (`actionIcons[sendingAction]`) in the teal ring. Keep the hourglass for the lockout only.

### CK-027 · Low · Under reduced motion, frozen bars read as progress
- **Images:**
  - Motion frames: `…-motion-progress-0000ms…0800ms` (the animated bar is fine).
  - `…-motion-rm-check-*`: the fade works (0 → 480ms, opacity ramps).
- **What's wrong:**
  - Under reduce, `.progress > i` is frozen at `translateX(80%)` (clocker.module.css:334). A 38%-wide block parked at the right reads as "80% done", a determinate bar that never moves.
  - `.countdown > i` loses its animation and stays full for the whole 8s (:331), saying "full time left" until the screen vanishes.
- **Breaks:** better-ui "every animated state change leaves a static cue that is true".
- **Fix:**
  - Under reduce, hide the progress fill (`.progress > i { display: none }`) and keep the track plus the "Keep this screen open…" text, or show a static full-width track at 40% opacity.
  - For the countdown, step it with a non-motion change: `ckClear` with `steps(8)`. A discrete width change is not motion, so it is acceptable under reduce.

**Motion checks I could not confirm (Not verified):**
- **Check draw-in.** All seven frames, `…-motion-check-draw-0000ms…0700ms`, show a fully drawn, full-scale check. Either the capture started after the 320ms pop and the 160+420ms draw, or the animation didn't run.
- **Reduced-motion wrong PIN.** All three frames, `…-motion-rm-wrong-pin-0000/0100/0220ms`, show only the pending, dimmed keypad. The "field only turns red" state is never captured.
- **Shake.** The animated frames show the red state arriving at about 160ms after submit. The 8px displacement is not discernible at this capture rate.

---

## 22, 23, 26–28, 30, 40 Unconfirmed, recovery and storage

### CK-028 · Medium · On Retry, the punch and the exit are identical grey pills with uneven spacing
- **Images:** `…-1024-28-retry-same-action-1024x768.png`; `clocker-es-…-26-retry-same-action-1024x768.png`. The uneven gap also shows on `-22`, `-26` and `-30` (1024x768).
- **What's wrong:**
  - "Retry Same Action" sends a time punch. "Return to PIN" abandons the screen. Both are `.btn[data-kind=secondary]` grey pills of the same size.
  - The gap between them is 22px, versus 12px between Check Action Status and Retry. That's because `leave` renders in its own `.stack` with `margin-top: 22px` (`clocker-punch-panel.tsx:250–255`, css :187).
  - Visually the screen groups {Check, Retry} and {Return} by spacing, but groups {Retry, Return} by look.
- **Breaks:** Gestalt similarity and proximity; Hick's law (three pills plus a link in an error state).
- **Fix:**
  - Render `leave` inside the same `.stack` as the state's actions, so all gaps are 12px.
  - Style "Return to PIN" as a `.link` (text), as "Cancel & return" already is in the photo flow. The two pills then mean "act" and the link means "leave".

### CK-029 · Medium · Opening "Help with a saved action" stretches the page past the viewport and moves the band clock
- **Images:** `…-1024-27-saved-action-help-1024x768.png` (the band's clock drops from y≈330 to y≈460; the card runs off the bottom); `…-768-27-…`; `…-390-27-…` (the UUID wraps mid-string).
- **What's wrong:**
  - The panel (`clocker-recovery.tsx:20`) lists every saved reference on the tablet. Each one is a 36-character monospace UUID with its own full-width "Copy reference" pill.
  - On a locked kiosk there is no app to paste into, so the copy action is dead weight.
  - The list also shows references from other people's saved actions to whoever is signed in. They are opaque IDs, so this is low risk, but it isn't scoped to the current person.
  - The page grows, and because `.when { margin: auto 0 }` (:71) centres the clock in a band that stretches with the page, the hero clock jumps.
- **Breaks:** Doherty's law and layout stability; Hick's law; privacy minimisation.
- **Fix:**
  - Give the panel `max-height: 40dvh; overflow-y: auto; overscroll-behavior: contain` (`.handoffPanel`, :321).
  - Show the current person's reference first and collapse the others behind "+2 more".
  - Drop "Copy reference" when `navigator.clipboard` is unavailable, or always on the kiosk, and keep "Ask Owner to review".
  - Pin the band's height: `.frame { height: 100dvh }` with `.task { overflow-y: auto }` in landscape, so the band never stretches.

### CK-030 · Low · Single-exit states have no primary, and the storage error uses the "refresh" glyph
- **Images:** `…-1024-23-verify-pin-again-1024x768.png`, `…-1024-40-browser-storage-needed-1024x768.png`.
- **What's wrong:**
  - "Return to PIN" is the only way forward, but it renders as a grey secondary (`clocker-punch-panel.tsx:192`), so the screen has no clear next step.
  - Browser Storage Needed uses the amber `refresh` ring (:183), the same as "Check Your Last Action", though nothing can be refreshed there.
- **Breaks:** "fill exactly one action per view"; icon meaning.
- **Fix:**
  - When `leave` is the only button (modes `auth` and `storage`), use `data-kind="primary"`.
  - Use `warning` (WarningCircle) for `storage`.

---

## 33–34 Photo

### CK-031 · Low · The photo flow uses a third disclosure style and mixes alignment
- **Images:** `…-1024-33-photo-for-clock-out-1024x768.png`, `…-768-33-…`.
- **What's wrong:**
  - "View photo notice" and "Get help" use the browser's default ▶ marker (`photo-notice.tsx:11,17`; no `list-style: none`). Elsewhere the kiosk uses a trailing Phosphor caret ("Action reference ⌄", "Help with a saved action ⌄").
  - The description is left-aligned under a centred ring and heading.
- **Breaks:** one icon family per surface (better-ui); shared alignment edges.
- **Fix:**
  - Add `.flow.flow .photoNotice summary { list-style: none; display: flex; justify-content: space-between }` plus `::-webkit-details-marker { display: none }`.
  - Add a trailing `<ClockerIcon name="caret" size={16}/>` that rotates when open, as `.reference` does (clocker.module.css:308–310).
  - Centre `.flow.flow .description` to match the card.

---

## Keyboard walk

The log shows the order: PIN field (autofocus) → body → Skip to time clock → field → 1–9 → Clear → 0 → Delete → Español → body. Continue is skipped while it's disabled, and the order otherwise matches DESIGN. Escape returns focus to the field (`afterEscape`). Key focus is a 3px teal ring at 3px offset and is clearly visible (`…-keyboard-key-1024x768.png`). The skip link's visible state was not captured: `…-keyboard-skip` shows nothing at top-left.

### CK-032 · Low · On text links the focus ring is square and touches the button above
- **Image:** `…-1024-keyboard-ready-1024x768.png` (a square-cornered teal rectangle around "Refresh Clock State" that meets the Done pill's bottom edge).
- **What's wrong:** The global `outline` (clocker.module.css:46) follows `.link`'s zero radius (:189). The link row's `margin-top: 6px` (:188) leaves less room than the 3px offset plus 3px ring.
- **Breaks:** better-ui (shape consistency with the pill family); focus clarity.
- **Fix:** Add `.link { border-radius: 999px }`, and raise `.links { margin-top: 10px }`.

---

## The 390 phone fallback (summary)
The phone fallback holds up. Keys are 56px with 10px gaps, buttons 52px and action rows 84px, and nothing scrolls horizontally. The failures specific to this width are:
- CK-019: the privacy pill is clipped.
- CK-014: the wrong-PIN card pushes Español below the fold.
- CK-016: the 66px indent forces wraps.
- CK-029: the help panel UUIDs break mid-string.

Ready screens need a scroll to reach "This screen clears after 30 seconds" (`…-390-16`, `-15`), which is acceptable for a fallback.

## Spanish layout (summary)
Labels fit; "Marcar entrada", "Confirmar salida", "Seguir en descanso" and "Revisar estado de la acción" all fit their 56px pills. Defects specific to Spanish:
- CK-001: the clock clips at every hour.
- CK-019: the privacy pill wraps to three lines.
- CK-023: the date order.
- The band's device line wraps "Front counter / tablet". This is workspace data in English, as are the "Meal break"/"Rest break" names (`clocker-es-…-15-choose-break`), which can't be translated by the kiosk. The category subline ("Comida", "Descanso") is translated, which is right.

---

## Cross-screen patterns

1. **The band doesn't share the card's state** (CK-002, CK-013). It shows a green "Tablet registered" on 7 of the 40 states, all of which are failures. The band is the tablet's status region (Gestalt common region), so it must reflect PIN-gate, connection and lockout state.
2. **Blocked and error states fall back to a generic button** (CK-012, CK-030). "Check Connection" serves four causes, and "Return to PIN" is the only, secondary exit on two states. Give each blocked state one primary action that matches its cause.
3. **Content inserted mid-card shifts the targets** (CK-009, CK-011, CK-014, CK-029): the error line, the checking line and the help panel. Reserve message slots, put status in the button that was pressed, and cap expanding panels.
4. **Two receipts** (CK-025): the normal and photo paths confirm the same punch differently. Use one receipt component.
5. **Timer visibility is inconsistent** (CK-020, CK-021, CK-027): a static "30 seconds" next to a live count, no timer on two private screens, a chatty live region and frozen bars under reduced motion.
6. **Stacked pill spacing is 12px in one state and 22px in another** (CK-028). This is caused by separate `.stack` wrappers (`clocker-punch-panel.tsx:249–255`). It shows on 22, 26, 28 and 30. Render one `.stack` per state.
7. **Icon meaning overlaps** (CK-015, CK-026, CK-030): the coffee cup for start and end, the hourglass for lockout and progress, refresh for storage. Each headline glyph should mean one thing.
8. **Disclosure patterns differ by state** (CK-031): a trailing Phosphor caret in three places and a native ▶ in the photo notice.
9. **Low-contrast boundaries everywhere on the white card** (CK-006, CK-007): key fills, tool-key lines, PIN slots, the PIN field fill and the secondary action-row border are all between 1.10 and 2.34:1. Under store glare the card flattens to text only. Raise the key and slot pairs first.
10. **What works.** Ring centring is correct throughout: `display: grid; place-items: center` on the 64px rings, the 56px icon circles and the 96px check, and the glyphs read as optically centred. The status chips (grey, green, amber) are correct, and the teal pressed-key tint is clear (`…-pin-mid-press`). Ready → action → receipt takes 4 digits + Continue + 1 action (+1 confirm for Clock Out), with 76–96px keys and 84px action rows: strong Fitts's-law ergonomics. The reduced-motion check fade works.

**Speed note (Doherty).** Reaching the action screen takes three sequential requests: `verify`, then `status` (`clocker-pin-gate.tsx:96–97`), then the punch panel's `state` read. The intermediate "Checking Your Clock…" loading state was not captured, so the delay a user feels was not measured.

---

## Coverage and gaps
- **Viewed:** every 1024 English state (01–40), the 4 keyboard shots, mid-press and all 26 motion frames. Spanish 1024 states viewed: 04, 05, 08, 11, 13, 15, 18, 23, 26 and mid-press; the rest were checked through the log's h1 and alert text. At 768: 03, 06, 10, 12, 13, 15, 19, 27 and 33. At 390: 01, 03, 06, 10, 13, 15, 16, 20 and 27.
- **Not captured (states exist in code):**
  - Checking Your Clock (loading)
  - Previous Action Needs Review (other person)
  - Tablet connected without PINs
  - PIN verified with punches off
  - camera live, photo review, camera error and photo unknown
  - Spanish at 768 and 390 (listed in the manifest's `not_captured`)
- **Not verified:**
  - the check draw-in animation and the reduced-motion wrong-PIN red (see CK-027 notes)
  - the skip link's visible focus state
  - the axe results (no audit JSON)

## Counts
**High 8 · Medium 13 · Low 11** (32 findings)

## Top 10 for the Clocker
1. **CK-001** The live clock is clipped at 1024 (10–12 o'clock in English, every hour in Spanish).
2. **CK-013** The tablet-wide PIN lockout reads as the next person's fault and leaves them no path.
3. **CK-012** "Check Connection" is the only button for reconnect, lockout and clear failures; there's no way to recover and no primary action.
4. **CK-002** The band shows a green "Tablet registered" during offline, reconnect and lockout errors.
5. **CK-006** The PIN slots are 2.34:1, or 1.99:1 in the error state, and fail 1.4.11.
6. **CK-025** The photo-path receipt omits the action name, the hero time and the bar, and shows the photo exception in grey.
7. **CK-019** The privacy pill wraps, overlaps the card and is clipped at 390 and in Spanish.
8. **CK-010** The red wrong-PIN state persists while the next PIN is typed.
9. **CK-009** The wrong-PIN message moves the keypad 27–31px under the finger.
10. **CK-003** "TIME CLOCK" is 3.72:1 (a new instance of C1 at clocker.module.css:67).

Verdict: **Block.** Eight High findings remain.
