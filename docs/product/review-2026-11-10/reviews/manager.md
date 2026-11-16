# NEVORA UI review: Manager, phone and desktop

Reviewer area: `/tmp/review/manager/` (237 images, 146 audit files), manifest `data` (4 keyboard walks) and `not_captured`.
Account: Elena Ruiz, Manager with company-wide access ("Northside Café & Bakery"), fictional data, Nov 9 2026, 9:04 PM.
Judged against DESIGN.MD "Current direction" (line 363 onward), "Owner and Manager phones/desktop: Direction B" (lines 1363–1451) and the Nov 7 filled-data rules (lines 1446–1451).

**Already covered elsewhere, so not repeated here:**
- From the code audit: band text alphas (C1/C2), tab label grey (C3), bell badge colour (C11), Sign out in red in the desktop menu (C13), pill radii (S1/S4), the hero date pill that looks like a button (B6), hyphens spaced out by tabular figures, e.g. "clock - out", "sign - in", "555 - 0120" (T4), tablet hit areas (B1), and icon weights (I1–I3).
- From the copy audit: duration formats and range spacing, "Things to do" vs "To do", and the recovery jargon.

The red Things to do count on the tab and in the sidebar is approved in DESIGN.MD (lines 1385 and 1418), so it is **not** a finding.

**Method:**
- I viewed every distinct route and state at 390 and 1440, spot-checked 320 and 1280, and viewed the long-name, loading, error and offline variants.
- I used the audit JSON for sizes, contrast and axe results.
- I compared against the Owner captures where a difference might be specific to the Manager role (`owner-phone/owner-home-390-error.jpg`, `owner-desktop/owner-home-1440.jpg`).

**Not verified:**
- Real-device touch behaviour.
- The menus at 390. `not_captured` says no trigger was visible.
- Validation on Add employee and New location at 390, which have no visible submit.
- Tablets, which another reviewer covers.

**Note on numbers:**
- Audit `lowContrastText` values of about 1.07–1.1 on band titles are measurement artifacts: the probe sampled the canvas, not the gradient behind the text. The code audit (C1) already covers band text.
- The `overlap` counts of 16–25 on Shift requests, Time exports, Scheduling rules and Help come from hidden sheet and disclosure content. They are not visible overlaps, except where noted below.

---

## Home: `/app`

### MG-001 · High · Payday tile sends the Manager to the wrong week, and four counts disagree
- **Images:**
  - `manager/manager-home-390.jpg`
  - `manager/manager-home-1440.jpg`
  - `manager/manager-timecards-390.jpg`
  - `manager/manager-timecards-1440.jpg`
  - `manager/manager-payroll-export-390.jpg`
  - `manager/manager-inbox-view-more-1440.jpg`
- **What's wrong:** The tile says "11 timecards to review · **Ready now**" over "Open timecards". The button opens Timecards on **This week**, whose band says "Approval opens Mon, Nov 16" and shows "Approved 0/12". The 11 ready cards are on the "Last week" tab, which the Manager has to find. The same pending work is counted four ways:
  - 11 on Home.
  - "Approve 7 timecards first" on Time exports.
  - "0 selected · 12 not finalized" in the export options.
  - "Timecards to approve 18" under Done and older.
- **Principle:** Jakob's law (the button should land where the promise is) and consistency, a single source of truth. This blocks the Manager's main weekly task.
- **Fix:**
  - When `closed > 0`, point the tile's link at the closed period. Today it is `week?.payrollHref ?? "/app/timecards"` at `src/components/owner-b/home-b.tsx:145`; the count comes from line 141. Use `/app/timecards?period=last`, or whatever query the Last week tab uses.
  - Change the label to "Last week · 11 to approve".
  - Make Time exports and Done and older read the same count, or label each with its period ("Nov 2 – 8: 11", "Nov 9 – 15: 7").

### MG-002 · High · The live tiles are an invalid `<dl>` (axe "serious" on every Home load)
- **Images:**
  - `manager/manager-home-390.jpg`
  - `manager/manager-home-1440.jpg`
  - Audits: `manager-home-390.audit.json`, `manager-home-1440.audit.json`, `manager-home-1280.audit.json` and the redirect captures. Each reports `definition-list` (1) and `dlitem` (6).
- **What's wrong:** `<dl class="b-live">` contains `<div><a><dt/><dd/></a></div>`. The `dt` and `dd` sit inside a link, not directly in the `dl` or a `div` group. Screen readers get a broken list structure on the Manager's landing page.
- **Principle:** WCAG 1.3.1 Info and relationships.
- **Fix:**
  - At `src/components/owner-b/b-kit.tsx:45–52`, render the tiles as `<ul class="b-live">` with `<li><a aria-label=…><span class="b-live__l">…</span><span class="b-live__v">…</span></a></li>`.
  - Alternatively, keep the `dl`, use `<div><dt><dd></div>` groups, and put the link inside the `dd`.

### MG-003 · Medium · Desktop columns are unbalanced, with about 350px of empty canvas under Needs you
- **Images:**
  - `manager/manager-home-1440.jpg`
  - `manager/manager-home-1280.jpg`
  - Compare `owner-desktop/owner-home-1440.jpg`.
- **What's wrong:**
  - The left column ends at y≈562. The right column (Payday and This week) runs to y≈910.
  - The Manager has no "Finish setting up" card, so the gap is larger than the Owner's.
  - Needs you shows 3 of 16 items, so the column is short while 13 items are hidden behind "See all".
- **Principle:** Gestalt common region and figure-ground (an empty region reads as missing content); aesthetic-usability.
- **Fix:** At `src/components/owner-b/home-b.tsx:128` (`rows.slice(0, 3)`), show up to 6 rows at ≥1024px, for example by passing `limit` from a media-aware prop or using CSS `:nth-child(n+4)` hidden only on phones. That fills the column with real work.

### MG-004 · Medium · "Covered this week" shows non-requirements as metrics, and empty values look different by screen
- **Images:**
  - `manager/manager-home-390.jpg`
  - `manager/manager-home-1440.jpg`
  - `manager/manager-schedule-390.jpg`
  - `manager/manager-reports-1440.jpg`
- **What's wrong:**
  - "Positions —" with "No positions required" and "Lead —" with "No lead required" render as two of three metric tiles, each with a big ink em dash at the value size.
  - On Insights, the same "no value" dash is light grey `#A7ACB1`, measured at 2.29:1 (audit `lowContrastText`).
  - So two of the three coverage tiles say nothing, and "empty" has two looks.
- **Principle:** Hick's law and signal-to-noise; consistency.
- **Fix:**
  - When a requirement isn't configured, collapse the tile into one grey line under Staffing: "Positions and lead aren't required."
  - Use one empty-value treatment everywhere: "—" in `#6A7176` at the label size, not the value size.

### MG-005 · Medium · The week mini-chart has no scale, values or caption
- **Image:** `manager/manager-home-390.jpg` (bottom), `manager/manager-home-1440.jpg`.
- **What's wrong:**
  - Seven bars sit under M…S. Only today's bar is dark teal, and Friday is tallest.
  - The bars have no values, axis or caption, and it is unclear whether they show hours or coverage.
  - Sighted users can't read them and nothing is announced.
- **Principle:** Closure only works with a known frame; WCAG 1.1.1 for meaningful graphics.
- **Fix:** Add a caption "Scheduled hours by day" and the value on today's bar. Give the group an `aria-label` that lists the day values (in the This week card in `home-b.tsx`).

### MG-006 · Low · Payday "progress" segments mean nothing
- **Image:** `manager/manager-home-390.jpg`, `manager/manager-home-1440.jpg`.
- **What's wrong:** Three grey bars under the date (`b-ink__segs`) are `aria-hidden`, and only the first can ever light up (`home-b.tsx:150`). For a Manager, who cannot run payroll, they suggest a three-step process they don't own.
- **Principle:** Signal-to-noise (Miller's law on decorative chunks).
- **Fix:** Remove the segments for roles without payroll, or label the steps ("Approve · Finalize · Pay").

---

## Things to do: `/app/inbox` (tab "To do")

### MG-007 · High · A red "Needs an Owner" chip sits next to an active Fill button
- **Images:** `manager/manager-inbox-390.jpg`, `manager/manager-inbox-1440.jpg`.
- **What's wrong:** "Fill Ana Colon's shift" carries a **red** "Needs an Owner" chip, yet the Manager is offered a teal **Fill** primary on the same row.
  - Red means stop, so a Manager reads it as "you can't do this".
  - The button says the opposite.
  - The chip actually means "no one is assigned yet", which is neither a stop nor Owner-only.
- **Principle:** Semantic colour against its meaning (an escalation trigger); a permission state contradicting the action.
- **Fix:**
  - At `src/components/manager-inbox-corp.tsx:136`, change `value: "Needs an Owner", valueTone: "red"` to `value: "Not assigned", valueTone: "amber"` (amber = wait/check).
  - If Managers truly can't fill leave-repair shifts, replace Fill with a grey "Ask an Owner" link and drop the teal pill for that role.

### MG-008 · High · Done and older shows its title twice and loses the band header (phone)
- **Image:** `manager/manager-inbox-view-more-390.jpg` (desktop `-1440` is correct).
- **What's wrong:**
  - The phone shows a white header with the dark "NEVORA WORKFORCE" wordmark, the only main-flow page without the teal header.
  - "Done and older" appears white in the band, then again in dark ink straddling the band's bottom edge (contrast 1.1:1 on teal).
- **Principle:** Figure-ground; consistency with the Direction B hero (DESIGN.MD:1395–1400).
- **Fix:** At `src/components/manager-inbox-corp.tsx:258–261`, `moreView` skips `<InboxB>`, so `CorpNav` and `CorpTitle` both render on phones. Render a `BScreen`/`BHero` with back "Things to do" for `moreView`, or give `CorpTitle` the phone-hidden class there.

### MG-009 · High · Open approvals are hidden under "Done and older · Not counted in today's total"
- **Images:** `manager/manager-inbox-view-more-390.jpg`, `manager/manager-inbox-view-more-1440.jpg`.
- **What's wrong:** The "done" page holds open work:
  - 2 time corrections "waiting for review".
  - "Timecards to approve 18".
  - "Plan ahead 47": 24 open shifts later this week, 10 schedule not confirmed, 8 hours outside targets.
  - "Coverage gaps 3".
  
  The main To do list (16) shows none of it, so a Manager clearing To do to zero still has 70+ items. The label promises the opposite.
- **Principle:** Jakob's law (an inbox holds what needs you); the "honest figures" rule in DESIGN.MD:1391.
- **Fix:**
  - Move "Time corrections" and "Timecards to approve" into the main Things to do groups (`groupThingsToDo` in `manager-inbox-corp.tsx`).
  - Rename the link "Later and done" with the sub-line "47 to plan ahead · history".

### MG-010 · Medium · Inline action buttons are inconsistent in fill, width and alignment
- **Images:** `manager/manager-inbox-390.jpg`, `manager/manager-inbox-1440.jpg`.
- **What's wrong:**
  - **Fill doesn't follow position or urgency.** The first "Find cover" is filled teal and the next two are teal-50 ghosts, although all three are "Today".
  - **Columns misalign on desktop.** "Decline + Review" (rows 1–2) and "Decline + Approve" (rows 3–7) differ in width, so the Decline buttons start at x≈800 vs 792.
  - **Chevrons sit mid-row.** On desktop the chevron is at x≈775, between the text and the buttons, instead of at the trailing edge.
  - **Too many primaries.** One screen has 8 filled teal pills.
- **Principle:** Gestalt similarity and continuity; one primary per region.
- **Fix:**
  - Give row action buttons a fixed `min-width: 96px` (`.b-row__acts .b-btn` in `owner-b.css`).
  - Hide the row chevron when the row has inline actions; the title link still opens the detail. The `b-row__acts` branch is at `b-kit.tsx:105`.
  - Make every Find cover the same ghost style. If the next shift must stand out, add an amber "Next" chip rather than a different fill.

### MG-011 · Medium · Swaps and "Can't work" have no inline actions or counterparty; the same items do on Shift requests
- **Images:**
  - `manager/manager-inbox-1440.jpg` (Shift swaps, Can't work)
  - `manager/manager-exchange-1440.jpg`
- **What's wrong:**
  - Things to do shows "Ana Colon · Tue, Nov 17 · 12:00 PM – 8:00 PM" with only a chevron. It doesn't say who the swap is with.
  - Shift requests shows the same item as "Swap Sat, 12:00 PM with James Ortiz" with Decline and Approve.
  - Time off rows on the same screen do have inline Approve.
- **Principle:** Consistency, so the same object offers the same actions everywhere; Hick's law (an extra hop for a binary choice).
- **Fix:** Give swap and callout rows the same `Decline`/`Approve` pair and a "with James Ortiz" line, as on Shift requests.

### MG-012 · Low · A time range wraps and leaves "– 12 AM" alone on its own line
- **Image:** `manager/manager-inbox-390.jpg` ("Today, 11:30 PM / – 12 AM").
- **Principle:** Wrapping (better-typography: keep ranges together).
- **Fix:** Wrap time ranges in `white-space: nowrap`, or put a non-breaking space before the en dash, in the inbox row title formatter.

### MG-013 · Low · "Nov 2 – Nov 8." trailing period; the same period appears twice
- **Image:** `manager/manager-inbox-view-more-1440.jpg`.
- **What's wrong:** Two separate rows read "Nov 2 – Nov 8." and "Nov 2 – Nov 8", with no visible reason for the split (it's likely by location).
- **Fix:** Drop the period and add the split reason ("· Calle Loíza" / "· Condado").

---

## Error, offline and loading states (Manager-specific shell behaviour)

### MG-014 · High · The Manager loses all navigation in loading, error and offline states
- **Manager images:**
  - `manager/manager-home-390-error.jpg`
  - `manager/manager-home-390-offline.jpg`
  - `manager/manager-timecards-390-loading.jpg`
  - `manager/manager-inbox-390-error.jpg`
  - `manager/manager-home-1440-error.jpg`
  - `manager/manager-home-1440-loading.jpg`
  - `manager/manager-inbox-1440-error.jpg`
- **Owner comparison:** `owner-phone/owner-home-390-error.jpg`
- **What's wrong:** The Manager's phone tab bar collapses to a single "Home" tab. The desktop sidebar collapses to a rail with one Home icon, and Search disappears. The Owner keeps all five tabs in the same state. Navigation vanishes exactly when the Manager needs to try another page.
- **Principle:** Navigation clarity; Jakob's law (stable chrome); Doherty threshold (the state reads as broken, not slow).
- **Fix:**
  - The tabs are built from `navigationForRole(…, context)`, where `context.operational` is unavailable (`src/components/app-shell.tsx:183–185`; `src/lib/navigation.ts:258`). Keep the last authorized navigation in memory and render it while the check is pending or failed. Gray out only items the server actually refuses.
  - Keep Search visible (`app-shell.tsx:483`).

### MG-015 · High · The "Management menu unavailable" card sits above the band, collides with the wordmark, and adds a second refresh button
- **Images:**
  - `manager/manager-home-390-error.jpg` (the white wordmark draws over "Management menu", producing garbled text)
  - `manager/manager-inbox-390-error.jpg`
  - `manager/manager-timecards-390-error.jpg`
- **What's wrong:**
  - The card renders as the first child of `<main>`, above the hero. It uses the old corp card: 12px radius, 15px title (`src/app/app/corp-shell.css:391–394`).
  - Its "Refresh management access" button competes with "Refresh current view" one card lower. That gives two refresh actions and three explanations of one problem.
- **Principle:** Figure-ground and overlap; one primary action per view; an error should name one recovery path.
- **Fix:**
  - At `src/components/app-shell.tsx:496`, drop the separate section.
  - Let the B route state (`scoped-read-frame.tsx:186–191`) carry one message: "Couldn't check your access." with one action, "Try again", that calls both `operational.retry` and `refreshCurrent`.
  - Show it as a 22px card under the hero, with an amber icon in a tinted circle.

### MG-016 · High · Offline says "Showing what was loaded" but shows nothing
- **Images:**
  - `manager/manager-home-390-offline.jpg`
  - `manager/manager-timecards-390-offline.jpg`
  - `manager/manager-home-1440-offline.jpg`
  - `manager/manager-inbox-390-offline.jpg`
- **What's wrong:**
  - The toast reads "You're offline. Showing what was loaded." The page is replaced by "View paused · Return to this window while online…" with no data.
  - On Things to do the same fact is said three times: band sub-line, card and toast. The loaded items are still gone.
  - On desktop the band breaks into three strips: teal top bar, grey "offline" strip, teal band.
- **Principle:** Honest system status (the toast contradicts the page); figure-ground (broken band); redundancy.
- **Fix:**
  - In `src/components/company-access/scoped-read-frame.tsx:181–191` (phase `paused`), keep rendering `body.content` read-only with an amber "Offline · last updated 9:04 PM" chip in the hero. Disable actions with a reason.
  - If content truly can't be kept, change the toast (`app-shell.tsx:494`) to "You're offline."
  - Draw the desktop offline line inside the band (`.c-offline` in `owner-b-desktop.css`).

### MG-017 · High · Keyboard focus lands on invisible and zero-size targets on phone
- **Evidence:** manifest `data` keyboard walks.
  - `/app` at 390: stops 4, 12 and 16 are `button.button.secondary` "Refresh current view" at rect `[-1, 794, 32, 44]`, under the tab bar and off-canvas. Stops 0, 2, 3, 10, 11, 14, 15, 18 and 19 are `null` (nothing visible).
  - `/app/schedule/new` at 390: stop 15 is the "Time" tab at rect `[0,0,0,0]`.
  - The walk never reaches Home's live tiles or Find cover.
- **What's wrong:** The "checking" state hides its heading, text and button visually at 1px but leaves the button focusable (`src/components/quiet/quiet.css:589–590` on `.portal-route-state[data-checking]`, markup at `scoped-read-frame.tsx:181`). The Manager's access check re-runs during the walk, so focus repeatedly drops into this hidden state.
- **Principle:** WCAG 2.4.7 Focus visible and 2.4.3 Focus order. Escalation triggers: a keyboard-reachable control with no visible focus, and content unreachable by keyboard.
- **Fix:** In the checking branch, don't render the button (render it only when `stuck`), or add `inert` to the checking section. Make collapsed tabs `hidden`, not zero-size.

### MG-018 · Medium · The loading skeleton doesn't match the page
- **Images:**
  - `manager/manager-home-1440-loading.jpg`
  - `manager/manager-timecards-390-loading.jpg`
  - `manager/manager-inbox-390-loading.jpg`
- **What's wrong:**
  - **Wrong shape.** It is a generic Quiet list skeleton on a grey canvas: no band, no glass tiles, no 22px card, a desktop title of "Home" in the top bar, and the nav reduced to Home only. When the page loads, the layout jumps from a list to hero + cards.
  - **Off-palette tint.** The second skeleton line has a warm tint (`QuietSkeleton`) that isn't in B's cool neutrals.
- **Principle:** Doherty threshold (perceived speed depends on a stable shape); aesthetic-usability.
- **Fix:** Render a B skeleton (band, three glass tiles, one 22px card with three 64px rows) from `BScreen` when `checking` (`scoped-read-frame.tsx:181`), using `#ECEEEF` blocks.

### MG-019 · Medium · Desktop error and offline bands are 314–390px tall, with the H1 pushed to the bottom
- **Images:**
  - `manager/manager-home-1440-error.jpg`
  - `manager/manager-inbox-1440-error.jpg`
- **What's wrong:** Normal secondary pages use a 196px band (`manager-more-1440.jpg`). The error band is roughly twice as tall, with about 230px of empty teal above the title.
- **Principle:** Consistency of the band; figure-ground.
- **Fix:** Use the secondary-page band height for `c-route-state` pages (the `.c-route-state` band rule in `owner-b-desktop.css`).

### MG-020 · Medium · Error cards are neutral text with no status cue, and the message is repeated
- **Images:**
  - `manager/manager-inbox-1440-error.jpg`
  - `manager/manager-inbox-390-error.jpg`
  - `manager/manager-schedule-coverage-390.jpg`
- **What's wrong:**
  - **No status cue.** The error cards ("Things to do isn't available right now." and "Couldn't open that shift. Pick it again from this week.") are plain white cards with no icon or colour, so an error looks like an empty state.
  - **Repetition.** "Things to do isn't available right now." appears twice: as the band sub-line and in the card.
- **Principle:** Status colour rule (amber = check); avoid redundant information.
- **Fix:**
  - Add a `WarningCircle` bold icon in an amber-50 circle to the state card.
  - Drop the duplicate band sub-line when the card says it (`InboxB` status line in `inbox-b.tsx`).
  - For the coverage redirect, show the note as an amber inline banner with a dismiss control.

---

## Permission-denied and Owner-only states

### MG-021 · Medium · The Owner-only notice is a bare text card with no one to ask
- **Images:**
  - `manager/manager-payroll-390.jpg`
  - `manager/manager-payroll-1440.jpg`
  - `manager/manager-settings-390.jpg`
  - `manager/manager-settings-locations-new-390.jpg`
  - `manager/manager-payroll-fix-390.jpg`
  - The same card appears on all 15 settings sub-routes and 6 payroll sub-routes.
- **What's wrong:**
  - The title is body-size (15px bold) with no icon in a tinted circle. DESIGN uses that pattern for every row and state.
  - "Ask an Owner" doesn't name the Owner (Jose Natal is in the Team list) and offers no way to contact them.
  - The only button is "Back to Home", which duplicates the band's back link.
  - The payroll notice uses the teal band; DESIGN.MD:1450 says payroll pages wear the ink hero.
- **Principle:** An error or denied state should name a way forward; Hick's law (two identical exits); consistency.
- **Fix:** In `src/components/owner-only-notice.tsx:7–13`:
  - Add a `LockSimple` bold icon in a grey-tinted circle and a 17px title ("Payroll is for Owners").
  - Use the body "Jose Natal can give you payroll access." (pass owner names from the layout).
  - Make the action a teal pill "Message Jose" (Updates compose or a `tel:` link), and remove "Back to Home".

### MG-022 · Medium · Denied routes behave four different ways
- **Notice card:** `manager-payroll-*.jpg`, `manager-settings-*.jpg`.
- **Silent redirect to Home** (manifest `finalUrl` = `/app`):
  - `manager-employees-qa-scan-a-clocker-pin-*.jpg`
  - `manager-requests-hub-*.jpg`
  - `manager-clocker-recovery-*.jpg`
  - `manager-my-time-*.jpg`
- **Silent redirect to Profile:** `manager-profile-calendar/device-alerts/passkeys/privacy/terms-*.jpg`.
- **Redirect with an error query:** `/app/schedule/coverage` → `/app/schedule?error=INVALID_SHIFT` (`manager-schedule-coverage-390.jpg`).
- **What's wrong:** A shared link or bookmark drops the Manager on Home or Profile with no explanation. DESIGN.MD:1451 (and the comment at `owner-only-notice.tsx:3`) says Owner-only pages "say why it is closed and who can help, in place of a silent move to Home".
- **Principle:** Consistency; visibility of system status.
- **Fix:**
  - Route the redirects through `OwnerOnlyNotice`: Clocker PIN and Clocker recovery for Owners; requests hub and my-time with "This page is for employees. Your requests are in Things to do" plus a link.
  - Show a toast when Profile sub-pages redirect because the feature is off.

### MG-023 · Low · The Payroll denial page lights no tab; the Settings denial lights Home
- **Images:** `manager/manager-payroll-390.jpg` (no tab active) vs `manager/manager-settings-390.jpg` (Home active).
- **Cause:** `MORE_FAMILY` at `src/lib/navigation.ts:282` includes `settings` but not `payroll`.
- **Fix:** For roles without a Payroll tab, add `payroll` (and `payroll-export` when it isn't owned by Time) to the Home-lit family.

### MG-024 · Medium · The Manager reviews their own and the Owner's time with no "You" or "Owner" marker
- **Images:**
  - `manager/manager-timecards-390.jpg` and `manager/manager-timecards-1440.jpg` (Elena Ruiz in the list, Jose Natal "No time yet")
  - `manager/manager-inbox-view-more-1440.jpg` ("Timecards to approve… Elena")
  - `manager/manager-view-team-390.jpg` (Jose Natal first, "No weekly target")
- **What's wrong:**
  - Elena's own row looks identical to her reports' rows. The copy audit (M-section) notes that another manager must approve her timecard, but nothing on the row says so.
  - The Owner appears first on Hours this week, out of alphabetical order.
- **Principle:** Scoped data must read as scoped; Gestalt similarity misleads.
- **Fix:**
  - Add a grey "You" chip on the current user's row and replace its action with "Another manager approves yours".
  - Tag the Owner row "Owner" and sort alphabetically (`manager-dashboard.tsx` hours list), or exclude Owners from Manager hour targets.

---

## Navigation and More: `/app/more`

### MG-025 · Medium · On desktop, Help, Scheduling rules and the More page can't be reached from the chrome
- **Images:**
  - `manager/manager-more-1440.jpg`
  - `manager/manager-home-1440.jpg`
  - `components/manager-home-1440-open-elena-ruiz-account-menu.jpg`
- **What's wrong:**
  - The desktop sidebar's "More" is a group label, not a link.
  - The account menu holds only Your profile, My pay and Sign out (`src/components/app-shell.tsx:350–365`).
  - Help appears only in Ctrl K (`src/lib/finder.ts:63`), and Search is hidden whenever the access check isn't ready (MG-014).
  - The phone More page lists Insights, Updates, My pay, Scheduling rules and Help.
- **Principle:** Navigation clarity; Jakob's law (Help lives in the account menu or the sidebar footer).
- **Fix:** Add "Help" to the account menu, and give Help a sidebar footer link above "Powered by VELANI LLC".

### MG-026 · Low · More rows have no icons; Sign out is red here too
- **Images:** `manager/manager-more-390.jpg`, `manager/manager-more-1440.jpg`.
- **What's wrong:**
  - Plain text rows. Direction B rows carry "face or 36px tinted icon" (DESIGN.MD:1382), as Team's tool rows do.
  - "Sign out" is red. This is a new instance of code-audit C13 on the More page, not only in the menu.
- **Fix:** Add Phosphor bold icons in tinted circles (ChartBar, Megaphone, Receipt, SlidersHorizontal, Question), and make Sign out ink.

---

## Timecards: `/app/timecards`

### MG-027 · High · The phone's "Attention 4" can't be traced; desktop has no attention figure
- **Images:**
  - `manager/manager-timecards-390.jpg`
  - `manager/manager-timecards-390-long-names.jpg`
  - `manager/manager-timecards-1440.jpg`
- **What's wrong:**
  - The phone hero shows "• Attention 4", but only one row (Valeria, "Missing clock-out") carries a cue.
  - The tile isn't a filter.
  - Desktop drops the figure and offers "All 12 · In progress 7 · Approved 0", so the four problems are invisible.
- **Principle:** Visibility of status; phone/desktop parity; closure (a count needs its members).
- **Fix:**
  - Make the Attention tile a link to `?filter=attention`, and give each affected row an amber chip with the reason (`reasonNames`, `src/components/timecards.tsx:101`).
  - Add a "Needs attention 4" tab on desktop.

### MG-028 · Medium · Total and row hour formats break the approved rule
- **Images:**
  - `manager/manager-timecards-1440.jpg` ("Total 87 h 55 min", "Breaks 2 h", rows "21 h 07")
  - `manager/manager-timecards-390.jpg` (hero "87 h")
  - `manager/manager-reports-1440.jpg` ("88 h 8 min")
  - `manager/manager-more-390.jpg` ("88 h this week")
  - `manager/manager-home-390.jpg` ("433.5 h")
- **What's wrong:** DESIGN.MD:1448–1449 says "period totals are whole hours ('511 h') and rows '24 h 06'". Here the total uses "h min", Insights uses "h min" for a period, and Home uses a decimal. The same week's worked hours read 87 h, 87 h 55 min, 88 h 8 min and 88 h. The copy audit covers the formatter sprawl; these are new instances on Manager screens.
- **Fix:**
  - Totals and period figures go through one whole-hour formatter (`corp-format.ts`): "88 h". Rows use `24 h 06`.
  - Home's "433.5 h" becomes "434 h".

### MG-029 · Medium · Row affordance is inverted on phone, and the progress bars are unlabeled
- **Image:** `manager/manager-timecards-390.jpg`.
- **What's wrong:**
  - Rows with recorded time (the ones worth opening) have no chevron. "No time yet" rows do.
  - The teal bars have no scale ("of 40 h target"?).
- **Principle:** Affordance consistency (Gestalt similarity); a meaningful graphic without a label.
- **Fix:** Show the chevron on every tappable row. Add "of 40 h" to the sub-line, or remove the bar.

### MG-030 · Low · Status is a chip on phone and coloured text on desktop
- **Images:** `manager/manager-timecards-1440.jpg` (amber text "Missing clock-out", grey "Clocked in now"), `manager/manager-timecards-390-long-names.jpg` (amber chip).
- **Rule:** DESIGN.MD:1419 says "pills are chips" on desktop too.
- **Fix:** Render `.c-tc-cue` as a chip (`timecards.tsx:669`), with amber for issues and grey for live.

### MG-031 · Low · Desktop link card loses the icons and sub-lines the phone has
- **Images:** `manager/manager-timecards-1440.jpg` ("Time exports", "Time corrections" as bare rows) vs `-390`.
- **Fix:** Use the same row with icon and sub-line at both widths.

## Time exports: `/app/payroll-export`

### MG-032 · Medium · The 20×20px person checkboxes are hard to hit
- **Images:** `manager/manager-payroll-export-390.jpg`, `manager/manager-payroll-export-1440.jpg`. The audit reports `small` 13 and `targetsUnder24`: "Export Carlos Vega" 20×20, and so on.
- **What's wrong:** The checkboxes in the people sheet are 20px against the 48px project floor. They likely pass WCAG 2.5.8 only through the spacing exception.
- **Fix:** Make the whole row the `<label>` (60px tall), and size the visual box at 22px inside a 44px hit area.

### MG-033 · Low · Payroll wording on a page Managers reach while Payroll is denied
- **Image:** `manager/manager-payroll-export-1440.jpg`.
- **What's wrong:** "Who's included and sent files · People in this payroll and where files went" and "File format · Columns your payroll provider needs" next to a Payroll page the Manager is refused.
- **Fix:** For roles without payroll, use "Export history · Files you've downloaded".

---

## Schedule: `/app/schedule` and its sub-pages

### MG-034 · High · Build and publish: the first label is clipped behind the band (phone)
- **Image:** `manager/manager-schedule-publish-390.jpg` ("This week" is cut by the band's lower edge above "Nov 9 – 15").
- **What's wrong:** DESIGN.MD:1404 says the band runs under the hero "only when a card or list comes next, so a form's first label or a plain line never lands on teal". Here a plain label is clipped.
- **Principle:** Clipped content (escalation trigger).
- **Fix:** Add the publish page's lead block (`.c-pub__lead` and its eyebrow, `src/app/app/owner-b-pages.css:325` area) to the "no band overlap" exception, or wrap the week header inside the first card as desktop does.

### MG-035 · Medium · "Not filled" open shifts are grey; the same gap is amber on Home
- **Images:**
  - `manager/manager-schedule-390.jpg` (grey "Not filled" chips)
  - `manager/manager-home-390.jpg` (amber calendar icon for "Cover 3 open shifts")
  - `manager/manager-view-activity-1440.jpg` (grey icons on "Coverage gap")
- **Principle:** Status colour rule (amber = wait or check); one colour, one meaning.
- **Fix:** Amber chip for "Not filled" (phone row, and `manager-weekly-roster.tsx:302` on desktop). Amber-tinted calendar icon on Activity's coverage-gap rows.

### MG-036 · Medium · The amber dots under every day in the phone week strip have no legend
- **Image:** `manager/manager-schedule-390.jpg` (dots under Mon–Sun).
- **Principle:** Closure needs a key; WCAG 1.4.1 (meaning only in colour).
- **Fix:** Add the caption "• Open shifts", and an `aria-label` on each day ("Tue 10, 4 open shifts").

### MG-037 · Medium · The desktop grid's name column is too narrow; rows balloon
- **Images:**
  - `manager/manager-schedule-1440.jpg` ("Gabriela / Santos", "Sofía / Méndez" on two lines)
  - `manager/manager-schedule-1440-long-names.jpg` (five-line name, 135px row)
- **Principle:** Spacing rhythm; scannability (Gestalt continuity across rows).
- **Fix:** Name column `min-width: 168px`. Keep the name on one line with ellipsis, the full name in `title` and the accessible name, and hours on the second line. The day columns have spare width.

### MG-038 · Medium · Desktop card header wastes a row on "Published"; "Covered this week" floats away from its tiles
- **Image:** `manager/manager-schedule-1440.jpg`.
- **What's wrong:**
  - A 52px card row holds only right-aligned grey "Published".
  - The "Covered this week" label sits about 350px left of its three tiles.
  - The phone shows Published as a teal chip by the week.
  - Build and publish shows it as a grey chip (`manager-schedule-publish-1440.jpg`).
  - "Done" should be green.
- **Fix:**
  - Put a green "Published" chip in the band beside the week stepper, and delete the empty row.
  - Stack the "Covered this week" label above the tiles.

### MG-039 · Medium · No visible Add shift on desktop Schedule
- **Images:** `manager/manager-schedule-1440.jpg` (top bar: Search, bell, account only; band: All locations, ⋯) vs `manager/manager-schedule-390.jpg` ("+ Add shift" at the list end).
- **What's wrong:** The top-bar link is rendered (`src/components/app-shell.tsx:481`, `.cm-add-shift`) but isn't shown at 1440. Not verified which rule hides it.
- **Principle:** Fitts's law and discoverability of the page's main create action.
- **Fix:** Add a white "Add shift" pill in the band beside "All locations" (the band's main action per DESIGN.MD:1416).

### MG-040 · Medium · Edit shift: the desktop H1 is indented 25px from its own sub-line and the content column
- **Image:** `manager/manager-schedule-edit-shiftid-qa-scan-target-1440.jpg` (H1 x≈321, sub-line and card x≈296).
- **Principle:** One alignment edge (DESIGN.MD:1428 "one 296px column edge everywhere").
- **Fix:** Remove the reserved back-link indent on the sheet title in `owner-b-desktop.css`, or render the "‹ Schedule" back link that the indent was made for.

### MG-041 · Low · Edit shift: locked Location with no reason; Build and publish: Cancel with nothing to cancel
- **Images:**
  - `manager/manager-schedule-edit-shiftid-qa-scan-target-390.jpg` and `-1440` (grey "Condado" field)
  - `manager/manager-schedule-publish-1440.jpg` (band "Cancel" when all is published)
- **Fix:**
  - Add the helper "Location can't change on a published shift".
  - Replace Cancel with "‹ Schedule" when nothing is pending.

### MG-042 · Low · Week templates: the empty line floats on the canvas and the only action looks disabled
- **Image:** `manager/manager-schedule-templates-390.jpg`.
- **What's wrong:** "No saved weeks yet" sits above the card as grey text, and "Save this week" is a grey quiet pill, though it is the page's one action.
- **Fix:** Put the empty line inside the card, and make Save a teal pill. It can stay enabled and validate on submit.

### MG-043 · Low · Add shift and Add employee: inconsistent field placeholders, and a 36px Save
- **Images:** `manager/manager-schedule-new-390.jpg` ("Choose"), `manager/manager-employees-new-390.jpg` ("Choose one"; First and Last name with no placeholder).
- **Audit:** The Save/Next pill is 67×36 (`targetsUnder44`).
- **Fix:** One placeholder word ("Choose"). Give the header pill a 44px hit area via `::after`.

---

## Team: `/app/employees` and a person's page

### MG-044 · Medium · Desktop Team loses the phone's filters and status chips
- **Images:** `manager/manager-employees-390.jpg` vs `manager/manager-employees-1440.jpg`.
- **What's wrong:**
  - The phone has filters "All 12 · Working 4 · Late 0 · Off today 4" and "Working" / "Off today" chips.
  - Desktop has neither. "Working" is plain grey text, there are no chevrons, and there's no Late filter.
  - The Manager's quickest attendance check exists only on phones.
- **Principle:** Phone/desktop parity; chips are words (DESIGN.MD:1383).
- **Fix:** Add the filter tabs to the desktop band (on glass, under the search). Render status as chips and add trailing chevrons.

### MG-045 · Low · The phone's selected filter chip is solid black
- **Image:** `manager/manager-employees-390.jpg` ("All 12").
- **What's wrong:** The chip is black (`#111517`), the only black-filled control in the product. Selected states elsewhere are a white thumb on glass or teal-50 with teal text.
- **Fix:** Selected chip in teal-50 `#E8F3F1` with teal `#0B6E69` text and count.

### MG-046 · Low · A person's page is sparse and wraps positions over three lines
- **Images:** `manager/manager-employees-qa-scan-a-390.jpg`, `manager/manager-employees-qa-scan-a-1440.jpg`.
- **What's wrong:** "Front counter, Kitchen, Barista, Baker" wraps over three lines. There's no status (Working or Off), no today's shift and no hours, only three link rows.
- **Fix:** Show positions as chips, and add a "Today" row (shift or "Off") and "This week 40 h of 40 h".

### MG-047 · Medium · Hours this week: over-target and under-target values are plain grey
- **Image:** `manager/manager-view-team-390.jpg` ("56 h of 40 h · 16 h over", "32 h of 40 h · 8 h under").
- **What's wrong:** DESIGN.MD:829 says the meter "turns orange… when hours pass the maximum". Here every line is the same grey.
- **Fix:** An amber chip "16 h over" on over-target rows, and grey for under.

### MG-048 · Low · The Hours this week stepper is a white pill straddling the band
- **Image:** `manager/manager-view-team-390.jpg`.
- **What's wrong:** Schedule and Activity use a glass stepper on the band. This one is a white pill on the band's edge.
- **Fix:** Use the glass stepper (DESIGN.MD:1417).

---

## Requests

### MG-049 · High · Shift requests: phone Decline/Approve are 32px tall with an 8px gap
- **Image:** `manager/manager-exchange-390.jpg`.
- **Audit:** `button.q-bs` 133×32 for every Approve and Decline.
- **What's wrong:**
  - These are the main decisions on the page, and Decline sits next to Approve.
  - Things to do uses 40px, and the project floor is 48px+.
  - On desktop the same buttons stretch to 355px each (`manager-exchange-1440.jpg`), while Things to do uses about 90px. The same action has three sizes.
- **Principle:** Fitts's law; a 48px target floor; similarity.
- **Fix:** In the `.q-bs` rules (Quiet layer, repainted in `owner-b-pages.css`), use `min-height: 44px` (48px visual on phone) and `min-width: 96px; flex: 0 0 auto` on desktop. Right-align them like Things to do.

### MG-050 · Medium · The same policy sentence repeats on every swap row
- **Images:** `manager/manager-exchange-390.jpg`, `manager/manager-exchange-1440.jpg`.
- **What's wrong:** "Current workflow policy requires manager review." appears three times (`src/lib/data/shift-changes.ts:275`). It adds 2 lines per row and no decision value.
- **Fix:** Show it once as a note under the band tabs: "Swaps need your approval (Scheduling rules › Trades)".

### MG-051 · Low · The bell loses its count on Shift requests (desktop)
- **Image:** `manager/manager-exchange-1440.jpg`.
- **What's wrong:** No badge. The aria reads "Notifications, current count…", while every other desktop page shows "1".
- **Fix:** Check `NotificationBell` keying on `operationalAuthority` (`app-shell.tsx:484`); the remount resets the count. Not verified beyond the screenshot.

### MG-052 · Medium · The Time off list hides the staffing conflict that Things to do shows
- **Images:** `manager/manager-requests-390.jpg` and `manager/manager-requests-1440.jpg` vs `manager/manager-inbox-1440.jpg` (amber "On the schedule: Tue, Nov 10 · 7:00 AM – 3:00 PM").
- **What's wrong:** Maria's and James's rows look like the other five, though approving them leaves a shift uncovered.
- **Fix:** Add the amber "On the schedule" chip or line to the list rows.

### MG-053 · Low · Request list polish
- **Images:**
  - `manager/manager-requests-tab-approved-390.jpg`
  - `manager/manager-requests-tab-pending-requestid-scan-leave-maria-1440.jpg`
  - `manager/manager-exchange-390.jpg`
- **What's wrong:**
  - Approved rows have no chevron and no green "Approved" chip.
  - The detail page repeats "Maria Rivera" in the band sub-line and the card header.
  - Relative times read "5 min ago" on Time off but "6 min" on Shift requests.
- **Fix:**
  - Use a green chip and a chevron.
  - Drop the band sub-line on the detail page.
  - Use one relative-time format with "ago".

---

## Insights, Updates, Notifications, Profile, Help and account pages

### MG-054 · Medium · Insights: 193% of plan is drawn as a calm full teal bar
- **Images:** `manager/manager-reports-390.jpg`, `manager/manager-reports-1440.jpg`.
- **What's wrong:** "88 h 8 min of 45 h 30 min planned" fills the bar teal. "42 h 38 min over plan" is small grey text.
- **Principle:** Status colour (amber = check); visual hierarchy.
- **Fix:** Amber bar and amber "42 h over plan" chip when worked > planned. Also fix the degenerate range "Nov 9 – 9 so far" to "Mon, Nov 9 so far".

### MG-055 · Medium · Update detail and Profile put the H1 on the canvas below an empty band
- **Images:**
  - `manager/manager-updates-bbee4853-9bb5-4638-a8d0-4125eb9c6782-390.jpg`
  - `manager/manager-profile-390.jpg`
  - Compare `manager/manager-requests-tab-pending-requestid-scan-leave-maria-390.jpg` (title in band) and the same pages at 1440 (title in band).
- **Principle:** Consistency of the hero ("Back bars become the hero", DESIGN.MD:1398).
- **Fix:** Move the title into the band on phones (`owner-b-pages.css` Quiet detail header), with the date and Optional meta line as the band sub-line.

### MG-056 · Medium · Updates compose: `aria-label` on a generic `div` (axe serious)
- **Images:** `manager/manager-updates-compose-390.jpg` and `-1440`. axe `aria-prohibited-attr` on `div[aria-label="Update review feedback"]`.
- **Cause:** `src/components/communication-compose.tsx:148`.
- **Principle:** WCAG 4.1.2.
- **Fix:** Add `role="group"`, or move the label to a `<section aria-labelledby>`. Since the div is a focus target for feedback, `role="region"` with that label works.

### MG-057 · Low · Updates list: "Needs reply · 1" filter, but no row is marked
- **Image:** `manager/manager-updates-390.jpg`.
- **Fix:** Add an amber "Needs reply" chip on that update's row.

### MG-058 · Medium · The phone 404 drops Direction B
- **Images:** `manager/manager-no-such-page-390.jpg`, `manager/manager-ai-manager-390.jpg`.
- **What's wrong:** A white header with the dark wordmark and a teal badge, then a dark H1 on the canvas. DESIGN.MD:367 lists the 404 under "Direction B (teal band, lifted card)". `/app/ai-manager` is 404 for the Owner too, so it isn't Manager-specific.
- **Fix:** Render `not-found.tsx` through `BScreen`/`BHero`.

### MG-059 · Low · Help: inline links are 19–20px tall; Delete account's back link points to a page that doesn't link to it
- **Images:**
  - `manager/manager-help-390.jpg` (audit `targetsUnder24`: Forgot access 113×20, Account recovery 143×20, support email 192×20)
  - `manager/manager-account-delete-390.jpg` (back "Profile", but Profile has no delete row; the entry point is Help › Account deletion)
- **Fix:**
  - Pad the inline links to a 44px line box, or turn them into rows.
  - Set the back link to the referrer ("‹ Help").

### MG-060 · Low · Help someone sign in: the ID example doesn't match real IDs
- **Image:** `manager/manager-account-recovery-390.jpg` (placeholder "e.g. 10482"; IDs in the app are "QA-SCAN-A", "OWN-ELENA").
- **Fix:** Use an example in the workspace's ID format.

---

## Cross-screen patterns

### MG-061 · Medium · Time ranges use five formats
- **Images:**
  - Home: "8:30–10 PM" (`manager-home-390.jpg`)
  - Schedule phone: "12–7 AM" and "12 AM – 12:30 PM" (`manager-schedule-390.jpg`)
  - Schedule desktop: "12a–6a" (`manager-schedule-1440.jpg`)
  - Things to do: "11:30 PM – 12 AM" (`manager-inbox-1440.jpg`)
  - Activity: "11:30 PM – midnight" (`manager-view-activity-1440.jpg`)
  - Shift requests: "Give Tue, 12:00 PM" with no end time (`manager-exchange-1440.jpg`)
- **What's wrong:** The copy audit covers range spacing and durations. "midnight" vs "12 AM", dropped ":00", the compact "a/p" grid format and missing end times are additional.
- **Principle:** Consistency; Miller's law (one pattern to learn).
- **Fix:**
  - One `rangeText` mode for rows ("11:30 PM – 12:00 AM"; choose "midnight" or "12 AM" once).
  - The compact "a/p" form only in the dense grid.
  - Always include the end time.

### MG-062 · Medium · "Wait or check" states are painted grey or teal
- **Images:**
  - "Not filled" (MG-035)
  - "Coverage gap" (MG-035)
  - Hours over target (MG-047)
  - Over plan (MG-054)
  - Published as teal on phone and grey on publish (MG-038)
- **What's wrong:** The Manager's main signals for "needs your attention" get no amber. The one red used ("Needs an Owner", MG-007) isn't a stop.
- **Principle:** DESIGN status rule; one colour, one meaning.
- **Fix:** Audit `valueTone` and chip tones in `manager-weekly-roster.tsx`, `manager-dashboard.tsx` and `reports` against the four-colour rule.

### MG-063 · Medium · Phone and desktop show different information for the same screen
- **Examples:**
  - Attention 4 (MG-027)
  - Team filters and chips (MG-044)
  - Add shift (MG-039)
  - Insights Export, which is desktop only (`manager-reports-1440.jpg`)
  - Timecards link icons (MG-031)
  - The Management menu error card, which is phone only (MG-015)
- **Principle:** Parity; Jakob's law within one product.
- **Fix:** For each B screen, list the phone hero figures and actions and make sure desktop renders each (band tiles or tabs).

### MG-064 · Medium · The same action comes in many sizes
- **What's wrong:**
  - **Approve height:** 32px on Shift requests phone, 36–40px on Things to do, 44–48px on request detail and Time corrections.
  - **Approve width:** about 90px on Things to do, 355px on Shift requests desktop, full width on Time corrections phone.
  - **Header Save/Next pills:** 36px.
- **Principle:** Gestalt similarity; Fitts's law.
- **Fix:** One row-action size (44px hit, 96px min width) and one footer-action size (48px). The code audit's B-series covers the tokens.

### MG-065 · Low · Titles appear in three places
- **What's wrong:** A page title can sit in the band (most pages), on the canvas below an empty band (Update detail, Profile, phone 404), or twice (Done and older).
- **Fix:** Covered by MG-008, MG-055 and MG-058; fix them together with one `BHero` rule for all phone secondary pages.

---

## What works well
- Long names wrap rather than truncate everywhere checked:
  - `manager-employees-390-long-names.jpg`
  - `manager-timecards-390-long-names.jpg`
  - `manager-schedule-1440-long-names.jpg`
  - `manager-home-1440-long-names.jpg`
- No overflow at 320px (audit `overflowX` 0 on every capture).
- The time off request detail is exemplary: a clear amber staffing warning, the consequence written out, teal Approve and grey Decline, and "Maria gets a notification either way."
- Focus rings are present on every stop that is visible (white on the band, teal elsewhere), per the keyboard data.
- Time corrections lays out Recorded, Current and Proposed side by side on desktop, with an amber "Pending" chip that follows the rule. One fix: highlight the changed time, e.g. "+35 min", and hide "Current effective" when it equals Recorded.
- Owner-only pages do show a notice instead of a blank page, as DESIGN asks (the structure is right; see MG-021 for the content).

---

## Top 10 for the Manager area
1. **MG-014:** Navigation collapses to Home only in loading, error and offline. This is specific to the Manager; the Owner keeps all five tabs.
2. **MG-001:** The Payday tile promises "Ready now" and opens a week that can't be approved. The four timecard counts disagree.
3. **MG-009:** Open approvals (18 timecards, 2 corrections) are hidden under "Done and older · not counted".
4. **MG-007:** The red "Needs an Owner" chip next to an active Fill button reads as a permission block that isn't one.
5. **MG-017:** Keyboard focus lands on invisible and zero-size targets during the Manager's access re-check.
6. **MG-015:** The "Management menu unavailable" card sits above the band, collides with the wordmark, and adds a competing refresh button.
7. **MG-016:** Offline says "Showing what was loaded" but clears the page; the desktop band breaks into strips.
8. **MG-027:** "Attention 4" on Timecards can't be traced, and desktop hides it entirely.
9. **MG-049:** Shift requests' phone Decline and Approve are 32px with an 8px gap; the same action has three sizes.
10. **MG-021 and MG-022:** Owner-only and denied routes: a bare notice with no one to ask, plus silent redirects to Home or Profile for the other gated routes.

**Counts:** 12 High · 33 Medium · 20 Low (65 findings).
