# Manager experience: premium visual review (Nov 11, 2026)

Evidence: screenshots in `inspect2/manager/` at 390 and 1440 (Manager: Elena Ruiz, fictional data). Findings with values and code locations are in `review-manager.json` (17 findings: 4 High, 9 Medium, 4 Low). Findings already in the Owner review are not repeated; they are listed at the end.

## Verdict

The shared screens are at the Owner's level. What is specific to a Manager is thinner: the closed pages are the least designed pages in the app, the Home lead card points at work that is not open yet, and the app does not tell a Manager what is theirs (own timecard, scope, where Scheduling rules and My pay live).

## Top changes

1. **Design the closed page once, for both widths (MG-001).** Desktop shows the old plain card with no lock, a grey "Back to Home" that repeats the band's back link, and 550px of blank canvas. The phone has the lock tile. Use the state card at both widths, capped at 560px.
2. **Give the closed page a way forward (MG-002).** Payroll: "Your part is timecards. Jose Natal runs payroll after you approve them." with "Open Timecards" and "See my pay". Settings: point to Scheduling rules. The `next` prop exists and is unused on these two pages.
3. **Reframe the Home ink card for a Manager (MG-003).** It says "Payday · 11 timecards to review" and opens a page that says "Approval opens Mon, Nov 16". Lead with the Manager's deadline, and use one count (Home 11, Timecards 12, Things to do 22, Time exports 11 and 12 today).
4. **Mark the Manager's own timecard (MG-004).** Elena's card is listed and counted as hers to approve; the app refuses only after she opens it, with "Another manager approves your own timecard." Add a "You" chip, name the Owner, leave it out of the counts.
5. **Make "13 things need you" true (MG-005).** Four corrections and 22 timecards sit under the 13 with their own counts. Count what can be decided today; put what opens later in one closed card.
6. **Teal count on the To do tab; To do higher in the order (MG-006).** The red "13" is on every Manager phone screen. Red is for stop.
7. **One meaning for "More" and a visible home for Scheduling rules and My pay (MG-007).**
8. **Notifications empty state (MG-008).** "No notifications yet · You'll see requests…" while five requests arrived minutes ago. Fix the copy or the feed, and use the state card with a link to Things to do.
9. **Name the section on closed Settings pages (MG-009)** and settle Approve vs Finalize on Time exports (MG-010).
10. **"On now" card on desktop Home (MG-011)** and complete swap and call-out rows with both people and a Review pill (MG-012).

## Keep

- **Phone closed page** (`owner-payroll-390.png`): lock tile, reason as the title, the Owner named. The right idea; it needs the next step and a desktop twin.
- **Phone tab bar for Managers:** To do replaces Payroll, so the Manager's main job is one tap away. Better than hiding it under the bell.
- **Home hero** (`owner-home-390.png`): "13 things need you" with the glass figures and Things to do overlapping the band; identical quality to the Owner's.
- **Phone Schedule "Today" list** (`owner-schedule-390.png`): green ring and "Working", amber ring and "49 min late". This is the best "who's working" answer in the app.
- **Timecards band:** "Approval opens Mon, Nov 16" is the right fact in the right place; other pages should agree with it.
- **Time corrections:** "Fixes your team asked for. You'll always see the original time." Clear and written for a Manager.
- **Sidebar without Payroll and Settings:** closed pages are not offered as links, so a Manager only meets the notice from an old link or bookmark.
- **Add employee and Add shift forms:** same as the Owner's; nothing is hidden or disabled without a reason.

## Owner findings that also apply to the Manager

Seen in the Manager shots, same as the Owner: **OW-001, 002, 003, 004, 006, 007, 009, 010, 011, 012, 013, 014, 015, 016, 017, 019 (desktop 404), 022, 026, 027, 028, 031, 032, 033, 034, 035, 036.**

Do not apply (pages closed to Managers): OW-005, 018 (Payroll), 024, 025 (Settings pages).

Not captured for the Manager, likely the same: OW-008, 020, 021, 023, 029, 030, 037, 038, 039.

MG-005, MG-012 and MG-016 also apply to the Owner and are not in the Owner list.

## What I could not see

- **Team** (`/app/employees`): the capture used `/app/team`, a 404. Team and a person's page (what a Manager can and cannot edit, pay rates, PINs) are unreviewed. Activity likewise.
- **Detail pages:** a time-off request, a swap, a call-out, the timecard panel and its "your own timecard" note (read from code only), update detail.
- **Who's working** (`/app?view=attendance`), **Scheduling rules**, **My pay**, the finder, the account menu, the Schedule "…" menu.
- **A location-scoped Manager.** Elena has company-wide access; the "no locations assigned" and single-location states were not captured.
- **Reports closed to Managers:** Insights opened in full for Elena, so no closed report state was seen.
- **Decision moments:** after Approve or Decline, errors, offline, loading. Stills only, so no motion, hover, press, focus order or reduced motion.
- Full-page phone shots have the tab bar drawn mid-page, hiding about 60px.
- Whether Managers are meant to get notifications for requests (MG-008) is a product question, not visible from the UI.
