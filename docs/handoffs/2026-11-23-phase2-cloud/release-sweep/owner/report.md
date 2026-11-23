# Owner release sweep, 2026-11-23 18:40 UTC

Build: production (`next build` and `next start`) of `91c08d193`, served at the owned https test origin through the owned
TLS proxy. Fictional data only: `seedOwnedApp` (Owner QAOWNER, two locations) plus four fictional people, one draft week
with two shifts. Payroll and Rondo (owner, weekly, knowledge, business) turned on. Chromium (Playwright 1.62.1).

**Views checked: 213** = 71 Owner routes × 3 views (390×844, 390×844 at 200% text, 1440×900). 200% text is a 32px
root size; the app's type is in rem, so it scales. Every view returned 200, with 0 page errors and 0 navigation errors.
Checks per view: horizontal overflow, clipped text, overlapping text, interactive targets under 44px (inline text links
counted apart), and axe-core 4.11.0 with the wcag2a, wcag2aa, wcag21a, wcag21aa and wcag22aa tags. Screenshots:
`shots/<route>-<view>.jpg` (full page, JPEG quality 55). Raw results: `sweep.json`.

## Findings

| Route | View | What | Screenshot |
|---|---|---|---|
| `/app/employees` | 1440 | axe `color-contrast` (serious): the "Search people" field (`.c-in > input[type=search]`, placeholder) | `shots/employees-1440.jpg` |
| `/app/inbox` | 390 | Filter segments ("All", "Shifts 2", …) are 36px tall | `shots/inbox-390.jpg` |
| `/app/exchange` | 390 | Segments "Waiting", "Open cover", "Done" 36px tall | `shots/exchange-390.jpg` |
| `/app/requests` | 390 | Segments "Waiting", "Approved", "Declined" 36px tall | `shots/requests-390.jpg` |
| `/app/timecards` | 390 | Segments "This week", "Last week", "Earlier weeks" 36px tall | `shots/timecards-390.jpg` |
| `/app/employees` | 390, 390-200 | Filter chips "All", "On the clock 0", "Not clocked in 0" 36px tall | `shots/employees-390.jpg` |
| `/app/settings/clocker/pins` | 390 | Segments "No PIN 5", "PIN set 0" 36px tall | `shots/settings-clocker-pins-390.jpg` |
| `/app/schedule` (and `?week=`, `/coverage`) | 390, 390-200 | "More schedule actions" 40×40; "What this measures" disclosure 36×36 | `shots/schedule-390.jpg` |
| `/app` | 390, 390-200 | "What this measures" disclosure 36px tall | `shots/home-390.jpg` |
| `/app/schedule/publish` | 390, 390-200 | "What this measures" disclosure 36×36 | `shots/schedule-publish-390.jpg` |
| `/app/schedule/new`, `/app/schedule/edit` | 390, 390-200 | Save button in the sheet header 40px tall | `shots/schedule-new-390.jpg` |
| `/app/employees/new` | 390 | "Next" 65×40 | `shots/employees-new-390.jpg` |
| `/app/employees/SWEEP-A`, `/app/profile` | 390, 390-200 | "Edit" link 40px tall | `shots/employees-SWEEP-A-390.jpg`, `shots/profile-390.jpg` |
| `/app/employees/SWEEP-A/time-off` | 390 | "Open time off policies" 168×32 | `shots/employees-SWEEP-A-time-off-390.jpg` |
| `/app/clocker-recovery` | 390, 390-200 | "Refresh" 36px tall | `shots/clocker-recovery-390.jpg` |
| `/app/account/delete` | 390, 390-200 | "Show password" 40×44 | `shots/account-delete-390.jpg` |
| every page | 1440 | Desktop sidebar links 200×40 (passes WCAG 2.5.8's 24px; under the 44pt touch goal) | any `*-1440.jpg` |

Everything under 44px is at least 32px, so all pass WCAG 2.2 AA 2.5.8 (24px). They miss the 44pt HIG target that
DESIGN.MD and the kit use. `10add9c4` aimed at segmented tabs at 320 and "All" on Things to do; at 390 the segments are
still 36px tall.

## Checked and clear
- **Horizontal overflow:** none in any of the 213 views.
- **Clipped text:** none visible. The 6 hits were visually hidden status text (1px-tall "Saved" and count lines on Settings
  Features, Locations, Positions and Breaks at 1440; a screen-reader count on Timecards at 390).
- **Overlapping text:** none visible. The heuristic flagged containers whose box holds neighbouring rows (Home "Shifts
  by day", Schedule week grid, Help, Publish, Scheduling rules, Insights, Company policies, Payroll settings, Punch photos,
  Profile, and Time exports, where the hits are in the closed people sheet). I checked the screenshots of Time exports
  (390), Schedule (1440), Home (390) and Profile (390 at 200%); the layout is correct.
- **axe:** 1 violation in 213 views (above).

## Not covered
- `/app/billing` rendered "Page not found": central billing isn't configured in the owned fixture (the billing pages are
  parked, G23). Billing needs its own run with the central billing test API.
- `/app/profile/device-alerts` and `/app/profile/passkeys` render Profile: those features are off in this fixture.
- `/app/updates/[id]`, `/app/profile/[document]`, `/app/schedule/copy-receipt`: no fictional record to open.
- Rich states (pending requests, payroll runs, timecards with punches, Rondo answers); WebKit (this sweep is Chromium only);
  real devices.
