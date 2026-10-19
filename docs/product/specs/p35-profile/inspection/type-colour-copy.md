# Profile (Phase 3.5): type, colour and copy

Inspector: type, colour and copy (prefix TC). October 19, 2026. Read only: no code, CSS, test or data edits, nothing committed, Sign out never pressed, no sign-in.

Screenshot paths are relative to `/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS--claude-worktrees-p35-profile-6cdee8/e8429433-65b2-4ff4-835a-8f879fb2454f/scratchpad/inspect/type/`.

## Verdict

The type is clean. Every text node on the page uses a kit role. On phones, landscape included, nothing is under 15px at any text size. On desktop the only 14px text is the kit's callout and label roles. Every node scales with the root size: 125, 150 and 200% give exactly 1.25, 1.5 and 2 times the 100% size. Ready-state contrast passes everywhere (lowest text 5.52:1, lowest graphic 3.26:1). axe found no violations in 1,294 runs across Chromium, WebKit and Firefox. Three defects remain. An old stylesheet fades every disabled control to 55%, so the pending words "Saving…", "Trying again…" and "Signing out…" drop to about 2.3:1 (TC-01). Email addresses break before the "@" (TC-02). At larger text, a long part of an address is cut off by the card edge (TC-03). Five P2 copy and hygiene items follow (TC-04 to TC-08). All three P1s show the same way in all three browsers.

## Findings, worst first

### TC-01 · P1 · Pending words fade below 4.5:1 ("Saving…", "Trying again…", "Signing out…")

- **Where:** Owner and Manager; every width, every text size; the same numbers in Chromium, WebKit and Firefox.
- **Element:** the alert row being saved (`.pmp-switch-row:disabled`), the card-head and error-panel "Trying again…" (`.pmp-text-button:disabled`, `.pmp-topics-note .nv-btn:disabled`), and "Signing out…" (`.pmp-signout .pmp-button-row:disabled`).
- **Measured:**
  - The row being saved is at opacity 0.55. "Saving…" is muted #5F666A at 55% on white: **2.32:1** (needs 4.5). The row title "Time-off requests" is **3.93:1**.
  - The switch has its own 0.55 on top, so 0.30 in total. The thumb on the track is **1.15:1** and the track on the card **1.56:1**. While saving, you can't see whether the switch is on or off.
  - "Trying again…" (head) **2.32:1**, and "Trying again…" (panel button) **2.26:1**: the kit's disabled colours at 55%.
  - "Signing out…" **2.32:1**. Sign out was not pressed. I set `disabled` on the button in my own browser and read the computed style; the code renders this state at `manager-profile-live.tsx:92-95`.
  - These words are the only on-screen sign of the pending state. WCAG exempts inactive controls, but the page relies on these words to say what is happening.
- **Screenshots:** `shots/TC-saving-row-390.png`, `shots/TC-retry-pending-390.png`
- **Cause:** `src/app/app/portal-gusto.css:129`: `html body .app-shell.nevora-portal :is(button,.button):disabled { opacity: .55; }`. This old stylesheet still applies under the kit, as with the Phase 3 defects PARALLEL.md describes. `premium-profile.css:60` then adds another 0.55 on the switch.
- **Fix:** In `premium-profile.css`, add `html body .app-shell.nevora-portal.nevora-portal .page-frame.page-frame .premium-manager-profile :is(.pmp-switch-row, .pmp-button-row, .pmp-text-button, .nv-btn):disabled { opacity: 1; }`. This restores "Saving…" 5.84, title 17.65, "Trying again…" (head) 5.84, panel button 5.14 (#5F666A on #EEF1F0), and "Signing out…" 5.84. Replace the switch's `opacity: .55` (line 60) with `cursor: progress` alone, or with a lighter fill that still gives the thumb 3:1 on its track. Either way the switch shows its current position while saving.

### TC-02 · P1 · Email addresses break before the "@"

- **Where:**
  - Manager `morgan.rivera@northside-qa.example`, at 100% on 320, 360, 390 and 430, and at 1024 (100, 150 and 200%). Same in Chromium, WebKit and Firefox.
  - Owner `owner@northside-qa.example`: 320 at 150–200%, and 360 and 390 at 200%.
  - Large data (`owner-large`): "…long.name / @northside-…" at 320 (200%) and 360 (125%).
- **Element:** Your details › Email value.
- **Measured:** the line break falls between "rivera" and "@northside": "morgan.rivera" on line 1 and "@northside-qa.example" on line 2 (dd 198px wide at 390 and 190px at 1024). The rule is: break only after the @ or before a dot.
- **Screenshots:** `shots/TC-email-manager-1024-100.png`, `shots/TC-email-manager-390-100.png`, `shots/TC-email-before-at-320-200.png`
- **Cause:** `src/components/manager-profile/manager-profile-live.tsx:56` puts `<wbr/>` before every part after the first and prints `joinBefore` at the start of the part. `:62` gives the first domain part `joinBefore: '@'`, so the break opportunity sits before the "@".
- **Fix:** Attach the "@" to the end of the last local part and put the `<wbr/>` after it. In `Email`, give the last local part `text + '@'` and the first domain part no `joinBefore`. "rivera@" then stays whole, and the next line starts with "northside-qa".

### TC-03 · P1 · At larger text, long address parts are cut off by the card; parts over 24 characters break at hyphens

- **Where:** Owner, 320 (also any width where a part is wider than the value column), at 125–200%. Test address `christopherjohnsonmanage@westoverhospitality.example` (a 24-character local part) served from a scratch fixture.
- **Element:** Your details › Email value, `.pmp-nowrap` parts.
- **Measured:**
  - At 125%, "christopherjohnsonmanage" ends at x=307. The value column ends at 284 and the card's clipping edge at 304, so 3px is cut off.
  - At 200%, the same part ends at 449 and "@westoverhospitality" at 364, against the card edge at 304. **145px and 60px of the address are cut off.** The address can't be read, and a blank line appears between the two parts.
  - The matrix fixtures don't show it because their parts are short ("northside-qa", 12 characters). Any part of about 13 or more characters overflows 320 at 200% (column 248px at 34px type). Company domains like "westoverhospitality" are common.
  - The other branch: parts over 24 characters aren't protected and break at hyphens inside the domain ("northside-|quality-|assurance-|workforce" in `owner-large` at 320, 100%). That also breaks the rule, though it's the lesser problem.
- **Screenshots:** `shots/TC-email24-320-2.png` (200%), `shots/TC-email24-320-1.25.png`
- **Cause:** `manager-profile-live.tsx:56` sets `white-space: nowrap` (`.pmp-nowrap`, `premium-profile.css:55`) on every part of 24 characters or fewer, whatever the column width. The card's `overflow: hidden` (`kit.css:181`) then clips the overflow.
- **Fix:** Drop the 24-character threshold and the `white-space: nowrap`. Render every part (the `<span>` after each `<wbr/>`) as `display: inline-block; max-width: 100%; overflow-wrap: anywhere;`. An inline-block that fits its line is never broken inside, so a part moves whole to the next line, and only a part wider than the whole line wraps inside its own box. Nothing is clipped, and the characters stay as typed, so copying is unaffected.

### TC-04 · P2 · After an ended session, the save failure reads "Alert: Not saved. Sign in again, then try."

- **Where:** Owner and Manager, save answered 401 and the re-read answered 401 (all widths, Chromium and WebKit).
- **Element:** the `role="status"` line (`manager-profile-live.tsx:177`) and the visible row message (`:101`).
- **Measured:**
  - When the re-read ends the session, the rows are replaced, so the label lookup fails. A screen reader then hears **"Alert: Not saved. Sign in again, then try."** "Alert" is a fallback, not the topic.
  - When the re-read still succeeds (for example, a 403 on save only), the row shows "Not saved. Sign in again, then try." with no Sign in action anywhere on the page.
  - "then try" is clipped phrasing. Elsewhere the app says "Sign in again to …".
- **Screenshots:** `shots/TC-save-401-row-390.png`, `shots/TC-save-401-session-390.png`
- **Cause:** `manager-profile-live.tsx:177` looks the label up in `ready.alerts`, which is null after the 401 re-read, and falls back to `'Alert'`. The wording is at `:101`.
- **Fix:** Keep the topic label in the save record (`saves[topic.id] = { …, label: topic.label }`) and announce "Time-off requests: not saved." Change `:101` to "Not saved. Sign in again, then try again." Optionally make "Sign in" in that sentence a link when the read is still ready.

### TC-05 · P2 · The band summary promises "pay" when there is no Pay card

- **Where:** Owner and Manager, wherever payroll doesn't offer My pay. This is a code reading: the preview has payroll on, so it can't be shown here.
- **Element:** band summary "Your details, pay and alerts."
- **Measured:** the summary is fixed text, while the Pay card renders only when `identity.payHref` is set.
- **Cause:** `src/components/manager-profile/manager-profile.tsx:20` (fixed text), against `manager-profile-live.tsx:134`.
- **Fix:** `summary={offersPay ? "Your details, pay and alerts." : "Your details and alerts."}`.

### TC-06 · P2 · "Notifications" appears twice, one above the other

- **Where:** Owner and Manager, every width.
- **Element:** card title "Notifications" (`#profile-notifications-title`), then the first row, titled "Notifications".
- **Measured:** two identical labels, tops 42px apart: card title 17/600 at y=906 and row title 17/500 at y=948 (390 phone); 16px, 380 and 422 at 1440. The second reads like a repeat of the heading rather than a link to the notifications list. This is a judgment call: the words are accurate, but a designer would catch the repetition.
- **Screenshot:** `shots/TC-save-401-session-390.png` (top of card)
- **Cause:** `manager-profile-live.tsx:137` and `:139`.
- **Fix:** Keep the card title and rename the row "All notifications" (meta unchanged).

### TC-07 · P2 · The failed-read panel blames the connection for every failure

- **Where:** Owner and Manager, failed read: blocked request, server 404/500, or `state: "unavailable"`.
- **Element:** alert-choices panel text "Your alert choices couldn’t load. Check your connection, then try again."
- **Measured:** the same sentence shows when the network is fine and the server answered 404, 500 or `unavailable`. The cause is stated wrongly, and voice.md asks for "Truthful". The card head's spoken line ("We couldn’t load your contact details…") doesn't make that claim. Judgment call.
- **Cause:** `manager-profile-live.tsx:169`.
- **Fix:** "Your alert choices couldn’t load. Try again." Or add "Check your connection" only when `navigator.onLine` is false.

### TC-08 · P2 · The landscape type workaround should be removed for the shared fix

- **Where:** landscape phone 844×390.
- **Element:** `premium-profile.css:86-95`, which re-declares the kit's phone type tokens for coarse-pointer landscape.
- **Measured:** it works today: 15px floor, rows 17, title 30 at 844×390 in all three browsers. But the coordinator's note in PARALLEL.md ("Coordinator notes", Oct 19) says the kit now keeps phone type on landscape phones (`9f7b649`, not yet on this branch) and asks sessions to remove their own workarounds so the merge has one rule.
- **Cause:** `src/app/app/premium-profile.css:86-95`.
- **Fix:** `git cherry-pick 9f7b649`, delete lines 86–95, and re-measure 844×390. Expect callout 15, label 15, row 17 and title 30.

## Wording to list for Jose (payroll; not changed)

"Pay" (card), "My pay", "Your pay statements", the band word "pay", and the topic "Payroll ready to review" / "When a pay period is ready for you".

## Topic wording (proposal awaiting Jose; no rule breaks found)

All topics are sentence case, with curly apostrophes and no blame words. For the proposal, two term notes:
- "When a punch needs your review": the app's plain-language term is "clock-ins" (voice.md U5).
- "Shift swaps and cover": voice.md's one word per concept is "shift requests".

## Checked and correct (with measurements)

- **Matrix run:** Owner (`owner`, `owner-large` with Show names open and closed) and Manager (`manager`, `manager-empty`). Widths 320, 360, 390, 430, 844×390 (landscape, touch), 768, 1024 and 1440. Text 100, 125, 150 and 200%. States:
  - ready, loading (read held), failed read (blocked), `state: unavailable`, 404 (endpoint not built), signed out (401)
  - paused (window blur), offline
  - save pending (held), save failed (500), save aborted, save 401 (with a 401 re-read)
  - Chromium 844 and WebKit 828 snapshots cover every state × width × text size.
  - Firefox: 390 snapshots. Ready, loading and failed read are at all four text sizes. Every other state is at 100% and 200%, because the dev server, shared by all inspectors (load average 17–20), made a full fourth pass take hours. Ten save-401 snapshots in Firefox (320 and landscape, Manager) are missing for the same reason.
  - Pages that hit the server's 500 under load were reloaded (up to four tries), per the coordinator's note.
  - Each state was loaded once per device group (phones, landscape, desktop), then the viewport and root text size were stepped inside the loaded page.
  - Extra scratch fixtures, served in my browser only: assigned scope with 12 names ("Show all 12" / "Show fewer"), owner with no contact, no locations and no alert topics, owner with one location, and the 24-character address part.
- **Type roles, 100%:**
  - Phone and landscape: title 30/36 600; card titles 17/22 600; dt 15/20 400 muted; dd and row titles 17/22 500; callout and meta 15/20 400; labels and teal text actions 15/20 500; panel button 17/22 600.
  - Desktop (768+): title 32/40; card titles, dd and rows 16/22; callout and label 14/20.
  - Every node is a kit role. The phone and landscape minimum is 15.0px, and the desktop minimum 14.0px (callout and label only). The page has no tab labels or badges.
- **Scaling:** every text node's size divided by the text size equals its 100% size at 125, 150 and 200% (min base 15.0 on phones, 14.0 on desktop). Nothing is fixed in px.
- **Clipping and truncation:** no node is clipped or line-clamped in any matrix snapshot. Alert titles have `-webkit-line-clamp: unset`. 60 location names, including "Centro Comercial Plaza Las Américas, Nivel 1, Local de Servicio al Cliente" (3 lines at 320), wrap whole. No sideways overflow (scrollWidth equals the viewport in every snapshot). The only clipping found is TC-03.
- **Phone numbers:** break only at spaces: "+1 (787) / 555-0100 / ext. 4021" at 320 (200%), "… 555-0100 / ext. 4021" at 125–150%. "555-0100" never splits. At 1024 (100%), "ext." and "4021" can land on separate lines. That's allowed by the rule; keeping "ext. 4021" together would be nicer.
- **Contrast, text:**
  - Ink 17.65:1 (16.69 on the hover fill), muted 5.84 (5.52 on hover), teal actions 5.53 (hover #055C5A 7.82), save error #A3361F 6.76 (6.40 on hover).
  - Band title 9.91, band summary 7.42.
- **Contrast, graphics:**
  - Tile icons 7.43 on #F1F3F4, chevrons 3.45 (3.26 on hover).
  - Switch off: track 3.45 on the card, thumb 3.45 on the track. Switch on: track 5.53 (5.23 on hover), thumb 5.53.
  - Save-error icon #E1553F 3.77 (3.56 on hover). Urgent tile glyph 5.80 on #FBEAE6.
  - Loading switches (1.31) and bars are decorative and `aria-hidden`.
- **Colour never alone:**
  - The save error has an icon and words.
  - The failed-read panel has an icon, a sentence and a button.
  - Switch state is carried by thumb position (translateX 18px) and `aria-checked`, not by colour alone, outside the pending state (TC-01). The stylesheet comment at `premium-profile.css:47` ("The word (On, Off, Saving…) carries the state") describes On/Off words that the page doesn't render. Update the comment, or add the words if Jose wants them.
- **Wording:** sentence case throughout, curly apostrophes in every string (’ in "You’re", "Couldn’t", "aren’t", "can’t"), the ellipsis character in "Checking…", "Saving…", "Trying again…" and "Signing out…", and no "missing" or "missed". State words match the rest of the app ("Checking…", "Updates paused", "You’re offline", "Sign in again to …", "Not saved." as in `generation-explanation-panel.tsx`). Empty values say "Not added", "None assigned yet" (Manager), "No locations yet" (Owner) and "No alert choices for your role yet."
- **axe-core:** 1,294 runs (100% and 200% for every state, width and browser, plus the extra fixtures), 0 violations. axe skips disabled controls, which is why it doesn't catch TC-01.
- **Totals:** 2,294 snapshots. No text node is clipped by `overflow` or a line clamp, and there's no sideways scroll, in any of them. TC-03 was found with an extra address fixture.
- **Scripts and raw data:** `scratchpad/inspect/type/` (`probe2.mjs`, `collect.js`, `analyse.py`, `shot.mjs`, `m-*.jsonl`, `x-*.jsonl`, `shots/`).
- **Employee and Lead:** `AUDIT-E` and `AUDIT-LEAD` at `/app/profile` (Chromium) get the employee Profile (`.premium-employee-profile` 1, `.premium-manager-profile` 0). One `AUDIT-E` load returned 500 under machine load and passed on retry, which matches the coordinator's dev-server note.

Open P0–P2 in type, colour and copy: 8

## Round 2

October 19, build `1f29c3b` (HEAD of `claude/p35-profile-6cdee8`, with the kit landscape fix cherry-picked as `d3d0be1`).

Coverage:
- **Chromium:** 320, 390, 844×390 and 1440 at 100, 125, 150 and 200%, Owner and Manager, every state:
  - ready, loading, failed, `unavailable`, 404, signed out, paused, offline
  - save pending, failed, aborted and 401
  - retry pending, `owner-large`, `manager-empty`
  - scratch fixtures: 12 assigned locations, five inline locations with one very long name, no contact or alerts, one location, and a 24-character address part
- **WebKit spot checks:** ready, owner-large, failed, save pending, save failed, retry pending, inline list and the 24-character address, at the same widths, 100 and 200%.
- **Totals:** 604 snapshots and 346 axe runs. Eight snapshots didn't load or are gone by design:
  - 2 were 500s under load, retried once.
  - 6 were the old "Show names" step: company-wide scope is now one line, so the button no longer exists, by design.

New screenshots are in `scratchpad/inspect/type/r2/shots/` (same root as above).

### Round-1 findings

| ID | Status | Measured now |
|---|---|---|
| TC-01 | **Fixed** | Busy switch rows use `aria-disabled` and keep full opacity. "Saving…" 5.84:1, row title 17.65:1, switch on its card 5.53:1, thumb on track 5.53:1 (`TC-01-saving-390.png`). "Trying again…" is 5.53:1 (teal) in the head and 17.65:1 (ink on white) on the panel button (`TC-01-retry-pending-390.png`). "Signing out…" is at opacity 1, 5.84:1. That was checked by setting `disabled` in my own browser; Sign out wasn't pressed. Busy text measured in Chromium, WebKit spot check same: no text under 4.5:1 anywhere except the decorative loading bars. |
| TC-02 | **Fixed** for every real fixture | "morgan.rivera@ / northside-qa / .example" breaks only after the "@" or before a dot at every width and text size, in Chromium and WebKit (`TC-02-manager-390-100.png`). No real-fixture address breaks before an "@" in any snapshot. The lone "@" below is a new cause, filed as TC-09. |
| TC-03 | **Fixed** | No clipping in any snapshot. The 24-character part at 320 and 200% ends at x=284, the value edge, inside the card's clip at 304 (round 1: 449). Parts wider than the line wrap inside their own box (`TC-03-email24-320-200.png`). |
| TC-04 | **Fixed** | Announced as "Time-off requests: Not saved. Sign in again." The row reads "Not saved. Sign in again." and the offline case "Not saved. You’re offline." No "Alert:" fallback. |
| TC-05 | **Fixed** (code) | `manager-profile.tsx:23` now gives "Your details, pay and alerts." only with My pay, else "Your details and alerts." The preview has payroll on, so only the first branch shows (Pay card present), which is correct. |
| TC-06 | **Fixed** | The first row is now "All notifications" under the card title "Notifications". |
| TC-07 | **Fixed** | The panel reads "Your alert choices couldn’t load." with Try again; no connection claim. |
| TC-08 | **Fixed** | The workaround is gone from `premium-profile.css` (no landscape rule left), and `kit.css:73` excludes coarse-pointer landscape from desktop tokens. At 844×390: callout and label 15, rows 17, title 30, smallest text 15.0. |

### New finding

#### TC-09 · P1 · On phones, long address parts break mid-word beside the label, including a lone "@" line

- **Where:** Owner, Chromium and WebKit, 320 and 390 at 100%, and 390 at 125%. Address `christopherjohnsonmanage@westoverhospitality.example`: a 24-character local part and a 19-character domain label, a realistic company address. Served from a scratch fixture.
- **Element:** Your details › Email value (`.pmp-part`).
- **Measured:**
  - The new 5rem label column with an 8rem value basis keeps the value beside the label: 152px wide at 320 and 222px at 390. Under the label it would be 248 and 318.
  - At 390 and 100%, the value renders as four lines: "christopherjohnsonmanage", then **"@"** alone, then "westoverhospitality", then ".example".
  - At 320 and 100%: "christopherjohnso", "nmanage@", "westoverhospitalit", **"y"**, ".example".
  - Both parts would fit whole under the label: about 226px against 318 and 248. These breaks are avoidable, and they break the rule (after the @ or before dots only).
  - A domain label of about 16 or more characters already splits mid-word at 320 and 100%.
  - The shipped fixtures don't show it: "morgan.rivera@" is 14 characters.
- **Screenshots:** `r2/shots/TC-09-email24-390-100.png`, `r2/shots/TC-09-email24-320-100.png`
- **Cause:** `src/app/app/premium-profile.css:16-17` (dt `flex: 0 0 5rem`, dd `flex: 1 1 8rem`) together with `:99` (`.pmp-part { overflow-wrap: anywhere }`). `anywhere` lowers each part's min-content to one character, so the row never wraps the value under its label; the part breaks letter by letter instead.
- **Fix:**
  1. In `:99`, use `overflow-wrap: break-word`. A part keeps its full min-content, and it can still break inside when it alone is wider than the line.
  2. Give contact values a wider basis so a long part drops under the label: `.pmp-details dd:has(.pmp-part) { flex-basis: 14rem; }` (224px). At 390 the value goes under the label (318px), where "morgan.rivera@northside-qa.example" fits on one line, and at 1440 it stays beside the label (400px). Re-measure the label geometry with the alignment inspector, since this changes it.

### Checked and correct in round 2

- **Type:** every text node is a kit role. Smallest text is 15.0px on phones and landscape and 14.0px on desktop (callout and label). Everything scales with the root size at every step. No sideways overflow, no clipping or line-clamp in 604 snapshots.
- **New copy:** sentence case, curly apostrophes and real ellipses throughout; no blame words; terms match the app. Checked:
  - "All notifications"
  - "Updates paused. Your alert choices show again when you come back to this window."
  - "You’re offline. Your alert choices show again when you’re back online."
  - "Your alert choices couldn’t load."
  - "Your session ended. Sign in again to see your alert choices."
  - "Still couldn’t load your contact details, locations and alert choices." and "Your details loaded." (spoken)
  - "Not saved. Try again." / "Not saved. Sign in again." / "Not saved. You’re offline."
  - "12 locations" and "Show all 12" / "Show fewer"; "All 3 locations"; "All 60 locations"
  - The approved topics ("Shift requests", "When a clock-in needs your review") and payroll wording weren't re-reviewed.
- **Inline locations:** "Main Office · West Office" breaks only between names. The very long name wraps inside its own item, and the "·" stays attached to the name before it (non-breaking space in `::after`).
- **Contrast:**
  - Text: ink 17.65, muted 5.84 (5.52 on hover), teal 5.53, save error 6.76.
  - Paused tile glyph 7.43; urgent tile glyph 5.80; save-error icon 3.77 (3.56 on hover); chevrons 3.45 (3.26 on hover).
  - Switch off: track 3.45, thumb 3.45. Switch on: track 5.53, thumb 5.53. These are unchanged while saving.
- **Loading rows:** the text-shaped bars (#EEF1F0, transparent text) and the thumbless pills (1.14:1) are decorative and `aria-hidden`; they carry no state. "Checking…" in the head carries it (5.84:1).
- **Phone numbers:** break only at spaces. "555-0100" never splits.
- **axe:** 0 violations in 346 runs (Chromium and WebKit, 100 and 200%, every state above).

Open P0–P2 in type, colour and copy: 1

## Round 3

October 19, build `7713d75`.

Coverage:
- **Chromium:** 320, 390, 430, 844×390 and 1440 at 100, 125, 150 and 200%. States: the long-address fixture, ready (Owner and Manager), `owner-large`, 12 assigned locations, five inline locations, save failed, failed read, retry pending, loading, signed out and paused.
- **WebKit spot checks:** long address, ready, `owner-large` and save failed at 320, 390, 430 and 1440, 100 and 200%.
- **Totals:** 388 snapshots and 218 axe runs. No load failures.

Screenshots are in `scratchpad/inspect/type/r3/shots/`.

### TC-09 · **Fixed**

- **Long address, `christopherjohnsonmanage@westoverhospitality.example`:**
  - At 100% it renders as two lines, "christopherjohnsonmanage@" / "westoverhospitality.example", at every phone width:
    - 320: value under its label, 248px wide (`TC-09-email24-320-1.png`)
    - 390: under its label, 318px (`TC-09-email24-390-1.png`)
    - 430: beside its label, 262px (`TC-09-email24-430-1.png`)
  - Also unbroken at 390 and 125%, 430 at 125–150%, and 844 and 1440 at every size.
  - Same in WebKit at 100%.
- **Remaining breaks inside a part** happen only where that part alone is wider than the whole row, which is the agreed fallback. Examples:
  - 320 at 125%: the 25-character part is about 293px against 248.
  - 320 at 200%: "westoverhospit / ality" (about 330px against 248) (`TC-09-email24-320-2.png`).
  - 390 at 150%, and 430 at 200%.
  - No lone "@" or single-letter line at 100%.
- **Manager address:** "morgan.rivera@northside-qa.example" at 100% is one line at 390 (318px). At 320 and 430 it breaks only before ".example".
- **`owner-large`:** its 37-character domain part is wider than any row, so it wraps at its own hyphens (the fallback).

### Quick pass over what changed

- **Phone extension:** "ext. 4021" is one part. "+1 (787) 555-0100 ext. 4021" breaks only at "(787) | 555-0100" and before "ext. 4021", never between "ext." and "4021". Plain numbers break only at spaces.
- **Save-error icon:** now centred with `1lh`. Colour unchanged: #E1553F on white, 3.77:1. Text #A3361F, 6.76:1. Icon and words, so not colour alone.
- **Screen-reader status lines:** "Your details loaded." (after a reader's retry), paused and offline words, and "Time-off requests: Not saved. …". Sentence case, curly apostrophes, no blame words.
- **Owner without payroll:** the payroll topic is filtered out (`manager-profile-live.tsx`, `visible()`). The preview has payroll on, so I checked this in the code only.
- **Held classes renamed:** the held copies are still `visibility: hidden` and `aria-hidden`. No hidden text was measured or announced.
- **Type:** smallest text 15.0px on phones and landscape and 14.0px on desktop (callout and label). Everything scales with the root size.
- **Contrast:** no text under 4.5:1 (loading bars excluded, decorative); switch track and thumb 3.45 and 5.53 as before.
- **Overflow:** no clipping and no sideways overflow in any snapshot.
- **axe:** 0 violations in 218 runs.

Open P0–P2 in type, colour and copy: 0
