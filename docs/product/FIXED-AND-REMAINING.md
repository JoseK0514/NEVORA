# NEVORA — fixed and remaining (after the 50-reviewer inspection)

October 21, 2026 · branch `claude/clean-manager` · written by the Wave A session for Jose.

Fifty specialists (business, product, design, accessibility, engineering, security, ops and QA) inspected the whole
product. Their full reports live in the inspection scratchpad; the backend items are specced in
[`specs/clean-manager/CODEX.md`](specs/clean-manager/CODEX.md). This page is the plain summary: what is already
fixed, and what remains, by owner.

---

## Fixed — on this branch

### This round (commits `e5766609`, `bc2a28b2`)

**Work no longer disappears**
- Timecards' 30-second background refresh updates in place: the list, ticked checkboxes, typed reopen notes and the
  open card all stay. Walking away (blur, hidden tab, offline) still takes private rows off the screen — that
  privacy rule is kept — but your typed notes and the open card now survive the pause, and a Refresh you press
  yourself still demands a fresh review. Four reviewers independently hit this bug.
- A week-copy that the server reports as settled-but-failed no longer pins "Check / retry" to Schedule's More menu
  forever.

**Numbers and words now tell the truth**
- Home: a person who clocked in early no longer appears in both *Working now* and *Later today*; the Later-today
  count matches its rows.
- A punch left open since yesterday reads **"in since Sun 12:28 AM"** instead of looking fresh.
- Schedule: a block covering the whole day reads **"All day"** (was "12a – 12a"); *Add shift* opens on today, not a
  Monday already in the past; the chosen day survives the top bar re-arranging itself.
- Insights: a period with nothing recorded says so, instead of drawing an empty scaled grid.
- The "Return to the Action Center" message now points at the Inbox (the Action Center no longer exists).

**Compatibility and access**
- Old Safari (16) no longer crashes the whole app: every popover check goes through safe helpers now. (Menus still
  need a browser-floor decision — see Remaining.)
- Windows High Contrast: selected tabs, filters, the sidebar's current page, the chosen week day and the timeline
  bars stay visible. Timeline bars also got a 3:1 boundary for everyone.
- Reduce Motion users now see success messages (they were running their fade to the invisible end frame) and the
  More sheet stops sliding.
- Every page names itself in the browser tab ("Inbox · NEVORA"), which also fixes screen-reader tab announcements.
- Unknown links show a styled NEVORA 404 with a way back, instead of a bare browser error.
- The error page's *Try again* actually re-reads the server now.
- The Inbox phone sheet no longer duplicates an element id; the tab badge reuses a fresh count instead of
  refetching on every navigation; the two Owner pages that loaded the 876 KB font file now load the small one.

### Earlier rounds on this branch (already verified by the coordinator's QA)
The full v3 rebuild of Home, Inbox, Schedule, Timecards, Insights, Team, the request pages, Updates and
Notifications; zero layout shift while loading; 4.5:1 contrast everywhere; 44 px touch targets; large-text (200%)
layouts; WebKit/Firefox fade fallbacks; one title/tab/card/footer rule across pages; Payroll settings aligned to
the title rule.

---

## Remaining

### Backend — routed to Codex (specced in `specs/clean-manager/CODEX.md`)
1. **Profile is broken for every Owner and Manager** — the read always fails and the error is swallowed. Worst open bug.
2. Sign-in hardening: rate limits, no ID disclosure, invite-token activation (coordinate with Wave C's auth work).
3. Server logging and error references — today "it didn't save" leaves nothing to check in production.
4. Idempotent time-off decisions; versioned Publish and shift edits (no silent overwrites).
5. Scale: the row caps that blank Home/Inbox at ~250 employees; ~95 DB round trips per Home view; unindexed,
   unbounded time reads.
6. Structured action items; location scope applied on every read; server-computed Needs-you count.
7. Unplanned locations emit a 24-hour "open shift" every day, inflating counts.
8. Payroll export: split paid/unpaid and daily/weekly (overtime), mark breaks paid or unpaid — confirm with counsel.
9. Role/scheduled-position data for the Timecards table; acknowledgement counts for Updates rows.
10. A single slow query 500s the whole Schedule page — degrade per read. Push payloads that say what happened (EN/ES).

### Wave C — already on his branch (`claude/auth-premium`), not duplicated here
Sign-in and activation redesign (with Spanish), dark mode, the Employee "Signature" system, the Manager/Owner
Profile page layout, passkeys/Face ID, the shared wordmark component, account deletion and policy pages.

### UI — my backlog, roughly in order of value
1. Inbox decisions inline: Approve/Decline and top cover candidates in the item sheet/pane (cuts 4–6 taps to 2–3);
   a decline-reason sheet and an Undo toast.
2. Desktop Home: merge *Working now* and *Later today* into one card (the mockup's shape), add the timeline's
   "now" line, and a facts grid in the coverage-gap pane.
3. Schedule roster extras: per-day coverage totals, coral strip-dots on days with open shifts, location/position
   visible on blocks in "All locations", search/paging for 200+ people.
4. Keyboard: the Schedule grid as a real grid (arrow keys instead of one Tab per shift); row labels that include
   the visible text.
5. One component each for buttons, view-switchers and sheets (today ~15 button families, 12 switcher variants,
   3 sheet patterns); one person-identity component (the same person shows different initials on two pages).
6. Copy glossary: one status set (Waiting/Approved/Declined), one meaning for "coverage"/"open shift", one date and
   duration format.
7. CSS debt: delete dead stylesheets (~25% of 1.4 MB), split manager CSS from employee pages, migrate the override
   layer to cascade layers, add a style-lint ratchet.
8. Faster first paint: server-render the first Home/Inbox snapshot, merge the three polls into one read.
9. PWA: register the service worker for every role, widen the manifest scope, keep last-known shifts offline.
10. Wide and mid screens: show the sidebar rail at 761–1099 px, cap content at 1,440 px on big monitors.
11. A durable test suite: port the ad-hoc scripts to @playwright/test with a frozen clock, one seed and screenshot
    baselines; add a DOM test tier for the rebuilt pages.
12. Smaller leftovers from the QA rounds: one sheet-close pattern, Sign out colour, date-header formats, the
    launch checklist on Home, the Add-employee dead end.

### Decisions only Jose can make
- **Pricing and packaging** (suggested: ~$39/$79 per location/month, 30-day trial) and building sign-up + billing.
- **Spanish**: full product translation is ~8–11 engineering weeks — when to start, and employees-first?
- **Browser floor**: support iOS 16 Safari (needs a polyfill) or show "update your browser".
- **Employee v3 port**: Wave C's Signature system is heading there — confirm it covers all employee pages.
- **Puerto Rico rules pack** (Ley 379 overtime, meal flags): build after counsel review — it's the #1 selling point.
- **Release operations** (with Codex): the review found production's database behind with no rehearsed upgrade, no
  green CI on a release candidate, and no error reporting — a no-go until fixed.

---

*The one-page executive version with full rankings is queued as the "50-review recommendations report" task.*
