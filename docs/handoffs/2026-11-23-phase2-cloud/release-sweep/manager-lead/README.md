# Release sweep: Manager and Lead routes (Nov 23, 2026)

Package K, final whole-app screenshot sweep before release. **Report only: no code was changed.**

- **Build:** production (`next build` + `next start`, `NEVORA_OWNED_APP_PRODUCTION=1`) of `origin/claude-codex-collab-nevora`
  at `91c08d19`, run under `flock /tmp/nevora-heavy.lock`.
- **Data:** fictional only, on a throwaway local Postgres. The owned harness seeds Northside Café & Bakery (Calle Loíza =
  Main Office, Condado = West Office) with three weeks of schedules, requests, corrections and updates. Every request
  to a host other than the local app was blocked.
- **Roles:**
  - **Company-wide Manager:** Elena Ruiz (`OWN-ELENA`).
  - **Location Manager:** Daniel Cruz (`OWN-DANI`), limited to Condado and granted *Publish schedules* there.
  - **Lead:** Luis Torres (`OWN-LUIS`), set to `LEAD`, Main Office.
- **Views:** 390×844 (phone, touch), 390 with 200% root text, and 1440×900. Each view gets a full-page shot and these checks:
  - document overflow;
  - text cut by an `overflow` ancestor or an ellipsis;
  - text boxes overlapping other text;
  - controls whose hit area is under 44×44, at 390 and 1440 (probed at four points 21px from the centre, so a `::after`
    hit area counts);
  - axe-core with the `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa` and `wcag22aa` tags.
- **Views checked: 150** (Elena 54, Daniel 51, Luis 45), plus 3 viewport close-ups that confirm one finding.
  Document overflow: 0 of 150. No page errors.

Shots are in `shots/<role>-<screen>-<view>.webp`, where role is `mgr-company`, `mgr-location` or `lead`, and view is
`390`, `390-text200` or `1440`. Phone shots are saved at 1× CSS pixels. Full-page captures draw the fixed tab bar where
the viewport ended, mid-page. That's how the capture works, not the layout.

## Findings

| # | Route | Role | Viewport | What | Shot |
|---|---|---|---|---|---|
| 1 | Profile `/app/profile`, "What you can approve" | Location Manager | 390 at 200% | **Overlapping text.** "Publish schedules" and its value "Condado" draw over each other (56×36px). The row keeps label and value on one line, unlike Access just above it, which wraps. 390 and 1440 are fine. | `shots/mgr-location-profile-390-text200-peek.webp` (close-up), `shots/mgr-location-profile-390-text200.webp` |
| 2 | Team `/app/employees` | Company-wide Manager | 390 at 200% | **Cut text.** Luis Torres's status "Not clocked in · 2 h 11 min" runs past the card's right edge (to x=399) and is cut at "2 h 11 m". The status line doesn't wrap. | `shots/mgr-company-team-390-text200.webp` |
| 3 | Schedule, next week `/app/schedule?week=2026-11-30` | Both Managers | 390, 390 at 200% | **axe `label-content-name-mismatch` (WCAG 2.5.3).** The band's glass button has `aria-label="Go to this week"`, which doesn't contain its visible text. | `shots/mgr-company-schedule-next-week-390.webp`, `shots/mgr-location-schedule-next-week-390.webp` |
| 4 | Availability `/app/availability` | Lead | 390, 390 at 200%, 1440 | **axe `label-content-name-mismatch` (WCAG 2.5.3), 7 nodes.** The day buttons have `aria-label="Monday, All day"` etc., and the visible text isn't contained in the name. | `shots/lead-availability-390.webp`, `-1440.webp` |
| 5 | Every desktop route (sidebar) | All three | 1440 | **Under 44px.** Sidebar links (Home, Things to do, Schedule, Time…, Help) are 200×40; the bell is 40×40. Their hit area is the drawn box (the probe misses above and below). Same on every route. | e.g. `shots/mgr-company-home-1440.webp` |
| 6 | Schedule `/app/schedule` (this and next week) | Company-wide Manager | 1440 | **Under 44px.** The band's "…" menu (`summary.b-btn--quiet`) is 36×36 with no larger hit area. | `shots/mgr-company-schedule-1440.webp` |
| 7 | Schedule, next week | Both Managers | 1440 | **Under 44px.** The week stepper's "Today" link (`.c-sched-week__today`) is 63×32. | `shots/mgr-company-schedule-next-week-1440.webp` |
| 8 | Build and publish `/app/schedule/publish` | Location Manager | 1440 | **Under 44px.** The cancel link (`.c-shift__cancel`) is 74×42. | `shots/mgr-location-publish-1440.webp` |
| 9 | Schedule (Lead's own week) | Lead | 1440 | **Under 44px.** The week arrows (`.b-week__arrow`) are 36×36. | `shots/lead-schedule-1440.webp` |
| 10 | Team `/app/employees` | Location Manager | 390, 1440 | **For product review, not a layout bug.** Daniel's Team shows "12 employees" and lists Main Office people (Ana, Elena, Gabriela, James, Jose, Luis) under a "Condado" location button. The rows aren't links, so there's no person page for him. His Profile says "Schedule and team at your locations". Confirm that this read-only, whole-company list is intended. | `shots/mgr-location-team-1440.webp`, `-390.webp` |

There are no under-44 hits at 390 for any role.

## Routes per role

| Screen | Elena (company Manager) | Daniel (Condado Manager) | Luis (Lead) |
|---|---|---|---|
| Home `/app` | ✓ | ✓ | ✓ |
| Schedule (this week, next week) | ✓ week grid | ✓ week grid | ✓ his own week (Employee schedule) |
| Build and publish | ✓ | ✓ (Publish schedules granted) | "That page is for Owners and Managers" |
| Find cover | ✓ (Main Office gap, Nov 30) | ✓ (Condado gap, Nov 30) | — no Find cover link in his schedule |
| Shift sheet `/app/schedule/edit` | ✓ "Edit shift" | ✓ "Shift details": read-only, although it's a Condado shift (Sofía Méndez) and he can publish there; Elena gets "Edit shift" for the same shift | — no shift sheet link |
| Time corrections | ✓ | ✓ | "That page is for Owners and Managers" |
| Timecards | ✓ | ✓ | goes to his own "Past timecards" |
| Team, person page | ✓ (Carlos Vega) | list only, no person links (finding 10) | "That page is for Owners and Managers" |
| Messages (Things to do) `/app/inbox` | ✓ | ✓ | goes to Requests (`/app/requests/hub`) |
| Updates, Notifications | ✓ | ✓ | ✓ |
| Availability | ✓ | ✓ "Team availability" | ✓ his own availability |
| Shift requests `/app/exchange` | ✓ | ✓ "Team shift requests" | ✓ "Pick up and swap" |
| Time off `/app/requests` | ✓ "Team time off" | ✓ | ✓ his own time off |
| Profile, More | ✓ | ✓ | ✓ |

The Lead's redirects and "That page is for Owners and Managers" pages appear to follow the role rules; they're listed
here, not as findings.

## Probe hits checked and not reported

- **Schedule week grid at 1440:** text "overlaps" ("Covered this week" × "11 people · 449 h", "58%" × "Mon") and a
  `cm-grid-wrap` y-clip of "Nov 23–29" / "Published". The shot shows a clean grid; these are hidden text.
- **Lead Schedule:** "Open shifts and changes" reported as cut and overlapping "Action needed". The card title isn't
  drawn (checked in `shots/lead-schedule-390.webp`).
- **`span.eb-dots` "·" clipped, and "·" × "Front counter" overlaps (4px):** the dot separators in Profile, More and the
  Lead's lists. They draw normally in the shots.
- **"Spill"** (controls whose content is taller than the box: segment buttons, `.c-nav__back`, `.b-qa__a`): the probe
  compares scroll height to box height. I spot-checked Team's segment at 200% and Schedule's open-shift chips at 1440, and both
  draw their labels inside the control. The rest are not checked one by one.
- **Home at 390 with 200% text, "Wed" × "Thu", 2px:** too small to see in the shot; not checked further.

## Gaps

- **Not run:** keyboard focus walk, reduced-motion comparison, loading, error and empty states. Each view is the loaded
  state with the seeded data.
- **Not captured:**
  - Find cover and the shift sheet for the Lead, and a person page for the location Manager: no link to reach them in
    their UI (see the routes table).
  - Find cover for a single person's shift: it was opened from the first open-gap link.
- The harness module is scratch (`zz-scan/rel.ts` in an unpacked copy of `tools/ui-scan/zz-scan-scoped.tar.gz`) and
  isn't committed.

## Fixes (Jose's decision: fix before release)

Code `504b63f6` on `claude-codex-collab-nevora-kit-final`, merged with `91c08d19` first. Shots in `fixes/`, named
`<role>-<screen>-<view>-<before|after>.webp`. Before = production build of `91c08d19`, after = production build of
`504b63f6`, same harness and fictional data. Views: 390, 390 at 200% text and 1440 for Profile, Team, a Team person's
page, next week's Schedule and Availability, for all three roles (39 before, 42 after: before has no person page for
Daniel). `-peek1` / `-peek2` are viewport close-ups of the rows in question.

| # | Fix | Result |
|---|---|---|
| 1 | Profile approval rows: at phone widths, once text is enlarged (`@container not style(--nv-rem: 16px)`), the value goes under its label, the same three declarations as the below-360px rule (`owner-b-settings.css`). | "Publish schedules" and "Condado" no longer overlap (`fixes/mgr-location-profile-390-text200-peek1-before/after`). The Access row's value also goes under its label at 200%, since it's the same row. 390 and 1440 at the default size: identical. |
| 2 | Team status chip (`.b-row__state > .b-chip`) wraps at enlarged text (`owner-b.css`). | "Not clocked in · 2 h 11 min" wraps inside the row (`fixes/mgr-company-team-390-text200-peek2-*`). "Clocked in late · 2 min" now also wraps within its column; before, it ran slightly past it. At the default size the only change on Elena's Team is live data (a clocked-in count went from 5 to 4 between runs). |
| 3 | Both "Today" links: `aria-label="Today, go to this week"` (`manager-weekly-roster.tsx`). | axe `label-content-name-mismatch` is gone on next week's Schedule for both Managers at 390 and 390 at 200% (before: 1 node each). Shots identical. |
| 4 | Availability day buttons: text spaces between the day, the bar and the hours (`availability-corp.tsx`). axe joined the spans as "MondayAll day", which isn't in "Monday, All day". | axe `label-content-name-mismatch` is gone on the Lead's Availability at all three views (before: 7 nodes). Shots pixel-identical (spaces between flex items draw nothing). |
| 5a | Location Manager's Team rows link to the person's page (`scoped-team.tsx`); G17 serves that page for anyone on the scoped roster. | Daniel's rows have a chevron and open the page (`fixes/mgr-location-team-*-after`, `fixes/mgr-location-team-person-*-after`). |

After, every view checked has 0 axe violations (wcag2a/aa, 21a/aa, 22aa) and no document overflow. The remaining probe
hits are the hidden-text ones listed above (week grid at 1440, the Lead's "Open shifts and changes").

### Investigation (item 5)
- **12 people on Daniel's Team: fixture data, not a bug.** His read is in LOCATIONS mode with Condado only. The scoped
  roster (`operational-read.server.ts`, `roster()`) lists anyone whose primary location or `employee_location_eligibility`
  is one of his locations. The scan fixture (`zz-scan/seed-owner.ts`) makes every person except Miguel eligible at both
  locations, and `seedOwnedApp` does the same for the Owner, so all of them work at Condado as far as the data says.
- **Read-only shift sheet: by design, not a missing grant.** `operational-read.server.ts:214` sets `saveAvailability` to
  `requires_company` for a location Manager on any shift that isn't a draft (or is a draft Build and publish made).
  Sofía's shift is in the published week, and the sheet says "You can’t change a published shift. Ask an Owner."
  Publish schedules doesn't change this.

Tests:
- `kit-text-rem.test.ts` (items 1 and 2), `manager-weekly-roster.test.tsx` (3), `availability-corp.test.tsx` (4), and
  the new `company-access/scoped-team.test.tsx` (5a).
- `employees/page.test.tsx`: the two pre-G17 "no person links" assertions now expect the links.
- `tsc` is clean. `src/components` + `src/app`: 4937 of 4939 passed on the first run; the 2 failures were those old
  assertions, which now pass (13 of 13 in that file).
