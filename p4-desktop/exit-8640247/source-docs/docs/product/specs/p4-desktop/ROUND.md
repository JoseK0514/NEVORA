# Desktop (Phase 4): inspection round for Codex

- **Round:** 5 (rounds 1, 2 and 4 ran locally; their reports are in `inspection/`, round 4 appended to each)
- **Status:** not zero yet (rounds 1–2 ran locally; their reports are in `inspection/`)
- **Exit round:** yes, if it reports zero. Every round-4 finding is fixed in this commit; this round is a full sweep by all five areas plus the re-checks.
- **Branch and commit:** `claude/p4-desktop-240fe0`, the commit this file was pushed with (after `97d4611`).
- **Chat prefix for IDs:** `P4` (for example `AL-P4-01`).

## Scope

The desktop layout (761–1440) of the Manager and Owner pages, and the desktop shell for every role. Phones must look as they did before Phase 4, apart from the fixes listed in `inspection/ROUND-2.md`.

| Pages | Routes | Roles |
|---|---|---|
| Home and its views | `/app`, `/app?view=attendance`, `/app?view=team`, `/app?view=activity` | `QAOWNER`, `AUDIT-M` |
| Inbox (list and detail pane) | `/app/inbox`, `?filter=now`, `?filter=requests`, `?filter=planning`, `?item=<id>` | `QAOWNER`, `AUDIT-M` |
| Schedule, Team | `/app/schedule`, `/app/employees` (also `?q=zzz`, `?status=inactive`) | `QAOWNER`, `AUDIT-M` |
| Timecards, Payroll runs, Time exports | `/app/timecards`, `/app/payroll` (Owner), `/app/payroll-export` | `QAOWNER`, `AUDIT-M` |
| Requests folded into Inbox (sidebar and trail only) | `/app/requests`, `/app/exchange`, `/app/availability` | `QAOWNER`, `AUDIT-M` |
| Desktop shell: sidebar, account menu, header, trail, skip link | every page above, plus `/app/updates`, `/app/reports`, `/app/settings` | all roles |

**Widths:** 761, 768, 1023, 1024, 1179, 1180, 1440 (plus the sidebar collapsed at 1440), then 320 and 390 for phone regressions. **Text:** 100, 125, 150, 200%. **Browsers:** Chromium, WebKit spot checks.

## Re-check by ID

Every finding in the five round-1 and round-2 reports under `docs/product/specs/p4-desktop/inspection/` (`alignment.md` AL4-, `stability.md` ST-P4-, `type-colour-copy.md` TCD-, `interaction-states.md` IS-P4-, `widths-roles.md` WR4-), except those listed as waiting on another owner or kept by decision in `inspection/ROUND-2.md` and the round-2 sections. All five round-2 reports are fixed in this commit (stability's ST-P4-03, 05, 09, 10 and 11 included).

## What the fixes since round 4 touched

- Sibling pages under one tab row (Time and pay; Employee Requests and Pay) share one title line (y 88) and, from 1024, one band height (184); at 761–1023 each stays at 200px or less. Controls on the title row overhang it by 2px each side.
- Home's view chips scroll sideways at every desktop width (ST-P4-12, WR4-17).
- Inbox: when the list goes (offline, failed, signed out) its status card stays in view below the header and takes focus (IS-P4-21); arrows skip rows inside closed groups (IS-P4-06); Request pages is a list until the card fits three across without splitting words (AL4-29, WR4-18).
- Sidebar: deeper pages (Team member detail, Update detail) mark their section entry `aria-current="true"` (IS-P4-20).
- Time exports' employee card inset (AL4-28); My time's two cards rounded with the kit shadow (AL4-22); Employee timecard inset 20 (AL4-23); Employee My pay on the band rules (AL4-25); chip fade off from 1100 (AL4-21); My schedule week rows at 1100–1279 put the position on its own line (WR4-14); Time exports names in the row role (TCD-14); Updates' Review update on the floor (TCD-16).
- Placeholder band heights updated to the new band heights.

## What the fixes since round 2 touched

- Since round 3's handover: the Inbox list holds its height in the same render, so the scroll position stays when paused, offline, refreshing or after a failed read (ST-P4-03); Employee and Lead route placeholders carry bands (ST-P4-09); section tabs don't slide when the page arrives (ST-P4-10); Home's loading rows match to 1px (ST-P4-05); My schedule's side column sticks (ST-P4-11); the large-text threshold for moving band controls is 24rem; Employee and Lead 14px floor completed; Pay tabs read My pay, My time, Timecards (TCD-19); the coordinator's e7671e6 shared fixes (WR4-14, WR4-16, TCD-20, TCD-21, Inbox count stops on 404) are cherry-picked.

- Band grid: the title column is `minmax(min-content, max-content)` (wraps between words only), and at large text (band narrower than 30rem) the controls beside the title get a row of their own (WR4-11).
- Section tabs inside the band for Employee pages too; at 1024 and up, a tab-row band with no eyebrow keeps the eyebrow's 20px, so sibling tabs share one title line (AL4-25, WR4-06).
- Inbox: Request pages first in DOM and Tab order (IS-P4-16), three across (AL4-26, WR4-12); Refresh shows "Refreshing…" (IS-P4-17); arrows reach group headings (IS-P4-06); the pane head is centred (AL4-19); pane notes for coverage gaps and availability deadlines (TCD-02).
- Sidebar: a holder entry never claims `aria-current="page"` (IS-P4-08).
- Timecards: Details sits 4px under the name, and the status line is centred on the buttons (AL4-20, AL4-18). Time exports card insets are 20 (AL4-12). Schedule toolbar inset 12/20, and no chip fade from 1180 (AL4-07, AL4-21).
- Header: the account name gives way to the trail below 1100px; "Signed in as" is in the callout role (TCD-17, TCD-18).
- Shared fixes from the coordinator were cherry-picked: D1 left edge, Inter fallback metrics, More sheet Close, readable dates, kit avatars in rem.

## Known, not defects of this branch

- `/api/manager/inbox-count` returns 404 on this branch (Codex's route arrives at the merge), so every Manager and Owner page logs one console 404, and again every 60s. Count it once under Gaps.
- Waiting on other owners: IS-P4-05 and WR4-02 (Profile merge), IS-P4-11 (Wave A), TCD-19/20/21, WR4-14, WR4-16, IS-P4-19 and AL4-27 (coordinator).
- Kept by decision: ST-P4-06 (Inbox band keeps two summary lines, 196px), WR4-05 and AL4-09 (Home column ends depend on data).

## Employee and Lead desktop: ready for a desktop round 1

All twelve Employee and Lead pages are ready, desktop only (761–1440); Phase 3 owns their phones:
Home, My schedule (with `?view=open` and `?intent=swap`), Requests overview, Time off, Shift requests, Availability, My time, Timecards, My pay, Profile, Updates and Notifications. Use `AUDIT-E`, `AUDIT-LEAD`, `AUDIT-ON`, `AUDIT-BREAK`, `AUDIT-LONG`, `payroll-qa-a` and `payroll-qa-b`. What changed for them is in `inspection/ROUND-2.md` ("New in this round"), plus the 14px desktop floor on their legacy text and the tab-row band spacer above. Round 2's local alignment, type and interaction passes already covered them once; re-check AL4-22 to AL4-25, TCD-16 and IS-P4-19.
