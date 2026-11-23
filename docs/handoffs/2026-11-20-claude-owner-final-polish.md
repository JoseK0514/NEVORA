# Owner final polish: hand-back (Nov 20, 2026)

Jose asked for a last polish of the Owner's screens on desktop and phone before production, and a Home that reads
as a dashboard. This is presentation only: no server read, action, link target, count, authorization or contract
changed. One navigation helper changed what it lights (`activeNavigationHref`: Posted open shifts lights Schedule).

## Source
- Branch `claude-codex-collab-nevora`. Base `e76d2bc0d` ("Employee Home: Your week, hours by day").
- `5f0c46eeb` code, `c21de68a0` guide text and DESIGN.MD, then the six rebuilt guides and this note.
- Rules: DESIGN.MD, "Final polish, Owner (Nov 20, 2026)".

## What changed
- **Home.** "On now" is "Today": people scheduled today, their scheduled hours, the peak hour, and one bar per hour of
  the published schedule (`dayHours` in `src/components/owner-b/home-b.tsx`, counted from Today's shifts). It shows on
  phones too. Four shortcuts (Add shift, Add employee, Send update, Time off); the last two follow their modules
  (`shortcutModules` from `src/app/app/page.tsx`).
- **Phones.** One frame for back-link pages (`owner-b-pages.css`, "Frame pass").
- **Desktop.** Band depths on Updates, Notifications, Requests, Exchange; one frame for More, Help, Profile,
  Notifications; Schedule's first card; Timecards' in-card tabs; Insights' Attendance card.
- **Rows.** Team status placement, Things to do facts lines, short time ranges on phones, `BSwapNames`, 36px leads.
- **Notes and buttons.** The timecard "Needs attention" block is a `BCallout`; secondary buttons on Owner and Manager
  pages are the tinted pill (about 215 uses; Employee pages keep the grey pill); Cancel and Decline are quiet text.
- **Forms.** Posted open shifts is a kit page; Save sits in the card footer and appears after a change; New update
  shows its step line; date and time fields draw Phosphor glyphs.

## Evidence
- Pictures: `docs/product/review-2026-11-20-owner-polish/` (Home before and after at 1440 and 390, the timecard
  warning, Posted open shifts). Fictional data, the owned local harness, a throwaway local database.
- Captures of 37 Owner routes at 1440, 390 and 320 plus interaction states: no horizontal overflow; page errors only
  the known `404 /api/commerce/status` (commerce off) and the harness's own `403 /api/notifications` probe.
- Type check 0 errors, oxlint clean, guides 6 of 6 verified.
- Suite: 15,897 pass, 1 fails: `src/components/employee-home-corp-view.test.tsx` (M7, "not to contain 'Oct 26'").
  It fails the same way on the base `e76d2bc0d` without this work; it belongs to the Employee Home change.
- Not checked: screen reader, a keyboard walk of the new shortcuts, real iOS Safari, WebKit.

## Open
- For Jose: one date-range form ("Nov 16 – 22" or "Nov 16–22"); the kit's quiet button (still a grey fill, about 75
  uses, Employee pages included); the new Insights line "Late clock-ins aren't counted for this period."
- For Codex: Notifications sometimes shows "Notifications didn't load" on first open in the local harness (it did
  before this work).
- Not yet captured or reviewed: decline steps and results, publish and payroll approval confirmations, toasts, open
  menus (list in `round-2-findings.md`).
- Next areas, one at a time: Manager, then Employee and Lead.

## Release sequence
Development is the primary working and acceptance release. Codex joins this branch into Development and verifies the
combined backend and UI there on the hosted environment; the exact verified release is promoted to main and
production only after Jose's approval. This hand-back authorizes no main merge, no production activation and no paid
service. Data in every picture is synthetic.
