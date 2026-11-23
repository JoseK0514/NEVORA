# Messages part 2: B3 Notifications (Owner and Manager), B8 Compose an update (Owner and Manager)

Branch `claude-codex-collab-nevora-messages-2`, from `claude-codex-collab-nevora` at `b40f60e9`. Nothing in B6 or B7 was
touched; no kit, app-shell or Settings files changed.

## Commits

- `d18b64dc` Messages part 2: B3 Notifications and B8 Compose for Owners and Managers on Direction B (code and tests)
- `00328473` Compose (B8): the Shift and Type selects' screen-reader names match their visible labels
- The shots commit (this report, `shots/messages-2/rows.json` and 12 webp captures), last

Files: `src/app/app/notifications/page.tsx`, `src/components/manager-notifications-b.tsx` (new),
`src/components/manager-notifications-b.css` (new), `src/components/manager-notifications-b.test.tsx` (new),
`src/components/communication-compose.tsx`, `src/components/communication-compose-b.css` (new).

## B3 Notifications (`/app/notifications`), Owner and Manager

**What changed.** The Owner and Manager page was a Quiet page with Quiet rows (relative times, no day groups). It now
renders the Lead's and the Employee's components with the person's own `/api/notifications` read:
`EmployeeNotificationsB` (the B screen: hero with Home, All / Unread, notices grouped by Today, Yesterday and Earlier in
cards) on phones, and `EmployeeNotificationList` (the day-grouped corporate list) under the band from 768px, inside the
Lead's `EmployeeAccountFrame`. Kept from the manager page: opening an unread notice marks that one read (management
only); a manager summary keeps its past-tense title ("26 items were waiting", a.md #29), never "26 waiting"; with no
notices at all the card leads to Things to do (MG-008); the Owner's billing notice still leads the list while one
applies. The list's own rules (EM-005, EM-009, EM-017) were scoped to the Employee shell, so
`manager-notifications-b.css` applies the same rules under the management shell (the time once per row, the teal
circle on rows that open).

**Words, Manager at 390.** Before: Home · Notifications · All · Unread 3 · 26 items were waiting · Open shifts, requests
or missing availability · Just now · Schedule published · Week of Nov 30–Dec 6 · 5 shifts · Just now · Schedule
published · Week of Nov 23–29 · 5 shifts · Just now. After: Home · Notifications · All · Unread 3 · Today · 26 items were
waiting · 8:10 AM · Schedule published · Week of Nov 30 · 5 shifts · 8:10 AM · Schedule published · Week of Nov 23 · 5
shifts · 8:10 AM. No string repeats; the scope line under the summary ("Open shifts, requests or missing availability")
is gone because the shared row has no slot for it (see below).

**At 1440.** Home · Notifications · All · Unread 3 · Today · 26 items were waiting · 8:10 AM · Your schedule for Nov
30–Dec 6 was published · 5 shifts · 8:10 AM · Your schedule for Nov 23–29 was published · 5 shifts · 8:10 AM.

**Buttons.** None on the list (rows are links). All / Unread is the kit segment. The empty card's one action is "Open
Things to do".

**Overflow and alignment.** Harness at 390, 768, 1440 (production build): page overflow 0, no target under 44px, at every
width for both roles. Rows, group titles and the segment share the card's text edge in the captures; I did not run a
`getBoundingClientRect` edge sweep (see Not checked).

## B8 Compose an update (`/app/updates/compose`), Owner and Manager

**What changed.** On phones the Owner and Manager form sat under the older Quiet sheet bar (Cancel · New update · Step 1
of 2 · white "Next" pill). It now has the Lead's Direction B hero (`BScreen` + `BHero` with Cancel as an X, the title and
the step line), the form follows as kept cards (`b-keep`), and Next is the one full-width solid teal button under the
delivery card. On step 2 the review card's Back and Publish sit side by side at the same height (Back was in the bar).
Tablets and desktop are unchanged (band, step line, Cancel and Next in the card footer): the hero mounts only on phones
(`useEmployeeMobile`), because the shared kept-card rule would otherwise pull the desktop band 40px up (seen and fixed in
the dev capture). Same form, validation, preview, publish and discard guard.

**Words, Manager at 390.** Before: Cancel · New update · Step 1 of 2 · Write · Next · Title · Message · Send to · Calle
Loíza · Ask them to confirm · Expires · Never · Type · Announcement. After: Cancel · New update · Step 1 of 2 · Write ·
Title · Message · Send to · Calle Loíza · Ask them to confirm · Expires · Never · Type · Announcement · Next. Same words;
Next moved from the bar to the card. 768 and 1440: unchanged (New update · Step 1 of 2 · Write · … · Cancel · Next).

**Buttons.** Phone: one solid teal Next, full width, 52px. 768 and 1440: Cancel (outlined) and Next (solid teal), same
height, unchanged.

**Overflow and alignment.** Page overflow 0 and no target under 44px at 390, 768 and 1440 for both roles. The 1440 band
title is back at its original place (y 107).

## End-sweep items fixed on these pages

- Compose: the Shift select's screen-reader name was "Published shift" and the Type select's was "Update type" while
  their visible labels say "Shift" and "Type"; both now match.
- No fixed px text added (the new CSS uses the kit's tokens); no targets under 44px reported by the harness.

## Impeccable audit

```
Impeccable audit: B3 Notifications (Owner, Manager; 390, 768, 1440; loaded list, production build)
Checked: harness captures on fictional data (tools/ui-scan/desk.sh, OWN-ELENA and QAOWNER), page overflow and small-target probe

Blocking
None found.

Should fix
1. [Hierarchy] 768 and 1440: the rows are the corporate list's (no icon tile or chevron), while the Lead's desktop shows
   the B screen's rows. The B screen is hidden from 768px in the management shell; showing it there needs a shell or kit
   change (report item K1).
2. [Hierarchy] A manager summary lost its scope line ("Open shifts, requests or missing availability"); the shared row
   has no second-line slot for it. Fix: a `detail` field on the shared row, or a label that carries the scope.

Polish
3. [Hierarchy] 1440: All / Unread sits under the band; on the Lead's desktop it sits in the band.

States: Empty ✓ (leads to Things to do) · Loading ✓ (kit state card, Lead's words) · Error ✓ (Try again) · Success n/a ·
Edge ✓ (Owner billing notice, partial list note from the shared component)
Not checked: 320 and 200% text, keyboard order and focus rings, axe, edge sweep with getBoundingClientRect (no time in
the 2-hour target; the harness has no route-level hook for them).
```

```
Impeccable audit: B8 Compose an update (Owner, Manager; 390, 768, 1440; step 1, production build)
Checked: harness captures on fictional data, overflow and small-target probe

Blocking
None found.

Should fix
None found in step 1.

Polish
1. [Hierarchy] Phone: Next sits under the delivery card rather than in that card's footer (the phone keeps the two cards
   separate, as before); it reads as the page's one action.

States: Empty n/a · Loading ✓ (kit state card, unchanged) · Error ✓ (unchanged) · Success ✓ (unchanged, on the update's
page) · Edge: step 2 not captured
Not checked: step 2 (review) on a phone, 320, 200% text, keyboard and focus, axe (the harness captures route loads only).
```

## Blocking items left

None that I found. Not verified: step 2 of Compose on a phone (Back and Publish side by side) was not captured, because
the harness loads routes only; it needs one interactive check before Jose's review.

## For the kit and shell owners (not changed here)

- K1: In the management shell the Direction B screen (`.b-screen`) is hidden from 768px, so an Owner's or Manager's
  Notifications can't show the Lead's desktop rows. Either allow a page to opt in (as `[data-employee-mobile]` does) or
  accept the corporate list there.
- K2: The Lead's own Compose at 390 overflows horizontally (page about 424px wide; the expiry help line runs off the
  card). Seen in the baseline capture; it's the Lead's page (`employee-mobile/messages-compose`), not in this package.

## End-sweep items as proposed ledger rows

| Page | Item | Where | Proposed |
|---|---|---|---|
| B3 (all roles) | Row screen-reader names add facts beyond the visible title (time, "unread", "action needed") | `EmployeeNotificationsB`, `EmployeeNotificationList` rows (shared) | End sweep: keep the visible title first and drop the duplicated facts, or describe them with `aria-describedby` |
| B3 (Owner, Manager) | Three `h1` in the DOM (hero, phone bar, band); one shows per width | `EmployeeAccountFrame` pattern (shared with the Lead) | End sweep: confirm hidden copies are `display: none` at each width (they are in the captures) |
| B8 (Owner, Manager) | Two `h1` "New update" on phones (hero and the hidden heading); the hidden one is `display: none` on phones | `communication-compose.tsx` | End sweep: check with a screen reader at 390 |
| B8 (all roles) | The Review card's Edit button is named "Edit update" (visible "Edit") | `communication-compose.tsx` | End sweep: fine for label-in-name; align if the sweep wants exact matches |
