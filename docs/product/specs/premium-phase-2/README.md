# Premium direction, Phase 2: Manager and Owner phone screens

October 18, 2026 · Worktree `.claude/worktrees/premium-phase-1`, branch `claude/premium-phase-1` (base `8c4dd50`). Nothing committed or pushed.

## What changed

| Screen | Before | Now |
|---|---|---|
| **Shell** | White page headers below the teal bar; a floating tab bar | The teal header and the page's band read as one surface. The tab bar runs full width, and the selected tab gets a pill behind its icon that never moves the icon or label. More is grouped into Time and reporting, Scheduling tools, Workplace and My account (MG3). |
| **Home** | Four separate tiles, a "Tasks 40" card, This week, Clocked in now, Recent activity, Shortcuts | Band: date, greeting and one count ("7 things need you today"). Then a Today card (Scheduled today, Clocked in now, No clock-in), **Next up** with one action, "Also needs you" (up to 3 rows), This week (published locations, availability out of employees and leads), Planning and setup (listed, not counted) and Team tools. Team tools keeps every former shortcut reachable. The Owner's "Finish setting up" card keeps its links in kit styling. |
| **Inbox** | White header; "All 40" counted setup work; missed punches in a separate block above the filters | Band with "Updated" plus Refresh, one count line ("3 shifts with no clock-in, 3 urgent items and 1 request need you."), and filters All / Act now / Requests / Planning. Cards: Act now, Requests, Plan ahead, Earlier this week. Each row opens its full review. The action is a teal link; the condition is a pill. |
| **Time-off review** | A list with Pending / Approved / Declined tabs | When opened from Home or Inbox, it shows one request on its own page. Back says **Home** or **Inbox** (F6). Then the dates, length, the note (labelled "Note"), a link to that week's schedule, and Decline / Approve in a bar that stays above the tab bar. After a decision you go back where you came from and see "Time off approved. The employee will be told." (D-5). |
| **Schedule, Team, Timecards, Payroll** | White headings | Teal band with a summary that says what it counts, e.g. "1 of 2 locations published · 21 shifts this week" and "10 active" (F8). Add shift and Add employee sit on the band. Payroll titles and descriptions are unchanged. Content below is unchanged. |

### Fixes from the plan

- **F1 (one count).** `src/lib/action-center/needs-you.ts` counts shifts with no clock-in, today's urgent items and requests. Home and Inbox both use it. Planning, setup and earlier coverage gaps are listed but not counted. Browser check: Home's count equals the Inbox's for both roles.
- **F4 (pills vs links).** Pills are conditions: Waiting, Today, No clock-in. Actions are teal links ("Review time off"). No row says Approve.
- **F5 (wording).** "No clock-in" replaces "missed punches" on Home and Inbox, and the review says "Note".
- **F6 (Back).** Back names its origin, and the decision returns there.
- **F8 (numbers).** Every number says what it counts.

### Server change (D-5, approved)

`reviewTimeOffAction` reads an optional `returnTo` and accepts only `inbox` or `home`.
- With it, the action redirects to `/app/inbox?filter=requests&decided=timeoff-approved|declined` or `/app?decided=…`.
- Without it, the action keeps its old redirect.
- Any other value is ignored.
- Permissions, the review itself and the error path are unchanged; the error path now keeps the request open.
- Tests cover all of these cases.

### Files

New:
- `src/components/premium-home.tsx`
- `src/components/time-off-review-decision.tsx`
- `src/lib/action-center/needs-you.ts` and its test
- `src/app/app/portal-premium.css`, which is how kit pages sit in the shell

Changed:
- `manager-dashboard.tsx` (Home routes to the new layout)
- `manager-inbox.tsx` and `inbox.css` (Inbox rebuilt)
- `manager-time-off.tsx` (focused review)
- `requests/actions.ts` (D-5)
- `schedule/page.tsx`, `employee-directory.tsx`, `timecards/page.tsx` and `payroll-ui.tsx` (bands)
- `navigation.ts` and `app-shell.tsx` (More groups)
- `toaster.tsx` (decision toast)
- `inbox.ts` (filters `now` and `planning`; the old `?filter=exceptions` opens Planning)
- `kit.tsx` (PageBand)
- tests updated for the new markup

## Checks run

- **Browser:** 247 of 247 passed ([evidence/checks.json](evidence/checks.json)). Run as the Manager (AUDIT-M) and the Owner (QAOWNER) on Home, Inbox, review, Schedule, Team, Timecards and Payroll (Owner), at 390, 320 and 1440.
  - On every page and width:
    - no sideways scroll
    - one h1
    - teal band with a white title
    - kit controls at least 44px
    - kit text at least 15px on phones
    - axe (WCAG 2.2 AA) reports no violations
  - Plus, at 390:
    - Home and Inbox show the same count
    - no "missed" or "missing punch" wording
    - no Approve or Decline in the Inbox
    - Planning filter updates the URL and shows setup work
    - Back says Home or Inbox
    - the decision bar is visible above the tab bar
    - tab icons share one baseline
    - More is grouped
    - every keyboard stop on Home shows a 2px ring
    - reduced motion removes transitions
- **Decision flow:** a fictional request was approved from the Inbox. It returned to `/app/inbox?filter=requests`, showed the toast, removed the flag from the URL, and the Requests card was gone ([decision-1](evidence/decision-1-review-390.png), [decision-2](evidence/decision-2-inbox-390.png)). The request was then reset to pending in this preview's own database.
- **Unit tests:** 7,270 passed in 433 files (27 skipped), none failed. `tsc` and eslint on the changed files are clean.

Before/after: [before/](evidence/before) against `manager-*-390.png` and `owner-*-390.png`, plus 320 and 1440 screenshots.

## Not done or not covered

- **Inbox count on the tab badge and sidebar.** This needs a per-page read (a backend item in PLAN.md). Home and Inbox agree today.
- **Shift-request and callout reviews.** They still use their own pages; only time off has the focused review.
- **Legacy `/app?view=attendance|team|activity` pages.** They are not redesigned yet; Team tools links to them.
- **Date-grouped Inbox and a publish check screen.** Not built. Inbox has Earlier this week only.
- **Employee and Lead screens** are Phase 3.
- **Desktop** got a working two-column Home; desktop design proper is Phase 4.
- **Not tested:** a real phone, VoiceOver and 200% zoom.
- **Another session's database was changed.** A reset script picked the wrong local throwaway database once, an old Oct 15 preview cluster (`/private/tmp/nevora-ui-preview-a9fd4d0339`). It set the fictional request `audit-timeoff` there to PENDING and cleared its reviewer fields. That data is fictional and local, but that preview's state may differ from what its session expects.
