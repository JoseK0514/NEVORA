# Messages package report (Phase 2 cloud, Nov 23, 2026)

Pages: B3 Notifications, B6 Updates, B7 Update detail, B8 Compose an update, for the Owner and the company Manager
(Elena, `OWN-ELENA`). Lead and Employee screens are unchanged; the Owner and Manager versions now use the same Direction B
kit they do.

## Commits (branch `claude-codex-collab-nevora-messages`, based on `claude-codex-collab-nevora` at `2f2387a9`)

| Commit | What |
|---|---|
| `9f963013` | Messages: Owner and Manager Updates, an update, New update and Notifications on Direction B (B3, B6, B7, B8) |
| `34ae7fc9` | Messages: a folded notification row keeps the list rows' look on tablets and desktop (B3) |
| `c0841abe` | Captures in `shots/messages/` and this report, as a separate commit (no app code) |

Files: `src/components/messages-manager-b.tsx` and `.css` (new; the band and cards for all four pages and the Updates
list), `src/components/notifications-manager-b.tsx` (new; B3) with its test, `employee-updates.tsx` (manager branch),
`communication-detail.tsx` (manager branch), `communication-compose.tsx` (manager form and page), `notification-inbox.tsx`
(exports only), `src/app/app/notifications/page.tsx` (manager branch). No kit, Corp or app shell file changed.

## How the pages are built

Team's pattern (`team-b.tsx` inside `employee-directory.tsx`): a `CorpPage` whose `BScreen` holds the phone hero
(`BHero`: back link, title, line, one white action, the band's filter), then a `CorpTitle` that the B layer paints as the band
from 768px. The cards are kit `BCard`/`BRow`/`BState`/`b-btn` and are drawn **once**, in a `b-keep` block that lifts over
the hero on a phone and follows the band from 768px, so every control, live region, reminder and focus target exists once
(no duplicate ids). Rows, chips, state cards and buttons are the ones the Lead's and Employee's Messages use
(`employee-b/messages-b.tsx`).

## Per page

### B6 Updates (Owner, Manager)
- **Changed:** Quiet list with All / "Needs reply" segments and bare rows → band with **New update** (white, the band's one
  action); a **Must be read** card first, then **Other updates**, each row a kit row (megaphone circle: amber while someone
  still has to acknowledge a must-read update, grey otherwise). The segments are gone: the cards already split the list.
- **Words before:** More · Updates · New update · All · Needs reply 1 · New closing checklist · Nov 23 · 3 of 9 have read it ·
  Needs reply · Walk-in freezer repair on Tuesday · Nov 23 · 0 of 10 have read it · …
- **Words after:** More · Updates · New update · Must be read · New closing checklist · Calle Loíza · Mon, Nov 23 · 3 of 9
  acknowledged · Other updates · Walk-in freezer repair on Tuesday · Condado · Mon, Nov 23 · 0 of 10 acknowledged · …
- **Wording fixes (wrong or misleading, fix-now):** "Needs reply" (nobody replies to an update) → the card title "Must be
  read". "N of M have read it" counted acknowledgements only (a recipient's receipt records Acknowledge; Mark as read isn't
  sent back), so it now says "N of M acknowledged", the word on the person's own button. **Trust wording: Jose to OK.**
- **Place:** each row names its location when the person can write to more than one (Owner: Calle Loíza, Condado), from
  New update's own `/context` read (same endpoint, no server change). One place → not repeated.
- **Buttons:** New update 40px on the phone hero, 48px in the desktop band (kit sizes). No other button.

### B7 Update detail (Owner, Manager)
- **Changed:** Quiet title, body, "Read by" disclosure and a full-width red Withdraw card → band with the update's title,
  its place and time; one **message card** (the must-read/optional line, the text, then **Edit** and **Withdraw** as two
  quiet buttons of one size); an **Acknowledged** card (`3 of 9` on its header) of person rows with the acknowledgement time
  or "Not yet" and **Remind** for a must-read update. Withdraw opens its confirm step inside the message card:
  "Withdraw this update for 9 people? They won't see it anymore." with **Keep update** and **Withdraw update** (solid red).
- **Words before:** Updates · New closing checklist · Nov 23, 7:38 AM · Must be read · (text) · Read by · 3 of 9 · Withdraw update
- **Words after:** Updates · New closing checklist · Calle Loíza · Nov 23, 7:38 AM · Must be read · (text) · Edit · Withdraw ·
  Acknowledged · 3 of 9 · Carlos Vega · Not yet · Remind · Gabriela Santos · Nov 23, 7:50 AM · …
- "Read by 1 of 2 so far" after a publish → "Acknowledged by 1 of 2 so far" (same reason as B6). **Jose to OK.**
- Loading: the band says "Update" and two placeholder cards hold the place; failures, withdrawn, signed out and paused use
  the kit state card with the same words and the same one way forward.
- **Buttons:** Edit / Withdraw and Keep update / Withdraw update are 44px; full width each on phones (158px each at 390),
  one shared width right-aligned from 768px (128/128; 152/152).

### B8 New update / Edit update (Owner, Manager)
- **Changed:** Quiet sheet (Cancel / Next in the top bar, select rows, a toggle row, "Expires Never") → band "New update" with
  "Step 1 of 2 · Write" and Cancel (X) as its way back; a **Message** card (Title, Message as outlined fields) and a
  **Delivery** card (Type, Who receives it when Important, Send to, Shift for a shift note, Ask them to confirm as the pill
  switch with its one-line meaning, Expires as an optional outlined date and time field) ending with **Cancel** and **Next**.
  Type moved first because it decides the fields under it. Step 2: the kit review card (title with Edit, the text, its
  facts, "Goes to 9 people · At Calle Loíza", "The list is checked again when you publish.", **Back** and **Publish update**).
- **Words after (step 1):** Cancel · New update · Step 1 of 2 · Write · Title · Message · Type · Send to · Ask them to
  confirm · People can mark it read. · Expires · Optional · Time in Puerto Rico time. Empty means it never expires. · Next
  (Cancel in the card footer from 768px only: on a phone the hero's Cancel is the one way out, so it isn't said twice).
- Same ids, validation, audience preview, publish and edit-version flow; the recovery, conflict, blocked and signed-out
  notices are kit state cards with the same words.
- **Buttons:** Next full width at 390; Cancel / Next and Back / Publish update one shared width (128–136px) from 768px, 44px.

### B3 Notifications (Owner, Manager)
- **Changed:** Quiet segments and rows → band with **All / Unread 3** (glass segments in the hero; lifted into the band from
  768px), one card per day (**Today**, **Yesterday**, **Earlier**, the Lead's and Employee's grouping), kit rows with the
  kind's circle (amber when it needs action), the title, its detail and time, a teal dot while unread. Folds (repeats of
  one summary) open in place, as before; opening an unread notice marks that one read, as before. The Owner's billing
  notice leads the cards while it applies. Empty: "Nothing new · Requests from your team are in Things to do." with
  **Open Things to do**.
- **Words after (Manager):** Home · Notifications · All · Unread 3 · Today · 26 items were waiting · Open shifts, requests or
  missing availability · Just now · Schedule published · Week of Nov 30–Dec 6 · 5 shifts · Just now · …
- The inventory's "Owner: Notifications didn't load" (row 7): the Owner's list failed on the two development-build runs and
  loaded on the production build (the harness's own probe fetch is refused with 403 because it sends no view header; that
  is the probe, not the page).

## Captures

`shots/messages/<row>-<owner|manager>-<390|768|1440>.webp` (production build, quality 80, after only): B3, B3-unread
(Manager), B6, B7 (must read), B7-optional, B7-withdraw (confirm step open, not confirmed), B8, B8-review (step 2 after the
audience preview; nothing published). The first production run captured the Owner; its Manager run failed at app setup
before any page, so the Manager pages and the Owner's B3 (after the fold fix in `34ae7fc9`) come from a second production
run. No message, email, SMS or push was sent.

## Overflow and alignment (production build, `getBoundingClientRect`)

All pages, both roles, at 320, 390, 768 and 1440: horizontal overflow 0; no text clipped outside screen-reader-only text;
no button wraps at 200% text (390). Band title and cards share the left edge (20/14 phone per the kit; 108 at 768, 296 at
1440); card text edge 33 (phone), 127 (768), 315 (1440) in every card, row text 48px further; buttons end 19px inside the
card's right edge (1089 at 1440), the same inset as the text start. 200% text: recipient names no longer break inside a
word; Remind moves under the name when both don't fit.

## Impeccable audit

Impeccable audit: Messages B3, B6, B7, B8 (Owner and Manager, 320/390/768/1440 and 200% text at 390; ready, confirm,
review, empty, failed and loading states)
Checked: production build on fictional data (`tools/ui-scan`, Owner `QAOWNER`, Manager `OWN-ELENA`), full-page captures,
edge and button measurements, string lists; unit tests for each page.

Blocking
- None open.

Should fix
1. [Hierarchy] B7: the step-2 review's Edit sits on the title's centre line, not its first line, when the title wraps to two
   lines at 320. Fix: align the head to the first line (`align-items: start` with a 2px nudge).
2. [States] B8 Edit of an update that already has an expiry shows its date with **Never** to clear it, not a date field, as
   before (the stored instant isn't a local date-time). Unchanged behaviour; logged.

Polish
3. [Spacing] B6/B3 phone hero action is 40px tall (kit `b-btn--white`), the desktop band's 48px; the kit's own sizes.

States: Empty ✓ · Loading ✓ · Error ✓ · Success ✓ (publish result card on the update) · Edge ✓ (one place vs several, long
titles, 10 recipients, 200% text)
Not checked: screen-reader output (no device), keyboard walk on the production build (the dev-build focus order follows the
DOM: band, cards, rows, buttons); Lead/Employee unchanged and not recaptured.

## Tests

`npx tsc --noEmit -p .` clean; `oxlint` clean on changed files; `node scripts/run-rstest.mjs` on
`employee-updates`, `communication-detail`, `communication-compose`, `notification-inbox*`, `notifications-manager-b` (new),
`operational-page-composition`, `employee-mobile`, `employee-b`: 283 passed, 0 failed. Updated tests that pinned the
Quiet manager markup and the "Needs reply" / "Read by" wording.

## Blocking items left

None.

## End sweep (proposed ledger rows)

| Screen | Gap | Kind | Status |
|---|---|---|---|
| B6, B7 | "Acknowledged" replaces "have read it" / "Read by" (the count is acknowledgements): Jose to OK the trust wording | Wording | Jose |
| B7 | Recipients' Remind control renders `b-rem` ids per person; check names and focus after Remind with a screen reader | Screen reader | end sweep |
| B7 | Review's Edit aligned to the title's centre when the title wraps (320) | Alignment polish | end sweep |
| B8 | Editing an update with an expiry shows the date and Never (no date field) | States | end sweep |
| B3 | Owner Notifications failed on two development-build runs, loaded on production; watch for a slow first read | States | end sweep |
| B3, B6, B7, B8 | axe and keyboard walk on the production build not recorded for this package | Evidence | end sweep |
