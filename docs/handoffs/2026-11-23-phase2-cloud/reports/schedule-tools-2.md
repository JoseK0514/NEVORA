# Schedule tools part 2: C10 Availability and C12 Shift changes (Owner and Manager)

Branch `claude-codex-collab-nevora-schedule-tools-2`, from `claude-codex-collab-nevora` at `b40f60e9`. Code only touches
this package's own files; the kit (`b-kit.tsx`, `corp/*`) and the app shell are unchanged.

## Commits
- `0ec3f23f` Shift requests: Decline and Approve stack full width when 200% text leaves no room
- `e99e3daf` Shift requests: the kind label wraps at 200% text instead of being cut
- `e67dc07e` Shift requests: Open cover rows say each fact once
- `30d67217` Shift requests: desktop buttons centred on a closed request's row
- `42202cd0` Shift requests: each request reads in three fixed lines
- `59c70fd2` Availability (C10, Owner and Manager): Direction B frame, week card and people rows
- `a730e4bd` Shift requests (C12, Owner and Manager): Direction B frame, cards and rows
- (this commit) shots, rows.json and this report

## C10 Availability (`/app/availability`, Owner and Manager)
**What changed.** The page moves from the Quiet page (`QuietPage`, `QuietHeader`, `QuietRow`) onto the Corp frame that
Copy receipt and Who's working use: `ScopedReadFrame` wraps `CorpPage`, `CorpNav phoneOnly` carries the title on a
phone, `CorpTitle wide` from 768px, and Not sent / Sent stay in the band as its segments. The body is Direction B kit
cards and rows (`BCard`, `BList`, `BRow`, `BAvatar`, `BIcon`, `BState`). Same reads, reminders, links and deep link
(`?employeeId=`).

| | Before | After |
|---|---|---|
| Under the title | "Nov 23–29 · 9 of 10 sent" | nothing (the counts are on the segments) |
| Segments | Not sent 1 · Sent 9 | same |
| First card | one row: "Deadline … Not set" | card titled "Week of Nov 23–29" with the Deadline row (value, chevron to Scheduling rules; "People are reminded the day before" when alerts are on) |
| People card | title "Not sent 1" (repeating the segment) | no second title; the reminder-for-everyone button on its own line at the top when offered |
| Rows | Quiet rows; aria-label "Name, place, not sent" | kit rows; the name is the visible text |
| Sent rows | open the hours in place | same, times on one right edge, "Updated …" as the last line |
| Empty | grey sentence on the canvas | kit empty/done state in a card ("Everyone has sent theirs") |

Approved reminder copy ("Reminders need a deadline. Set one in Scheduling rules.") kept word for word.

**Buttons.** None on the page except the band segments and, when reminders are on, the tinted "Remind everyone" pill
(44px). Two styles measured (segment thumb, row links).

## C12 Shift changes (`/app/exchange`, Owner and Manager): Waiting, Open cover, Done
**What changed.** Same frame as C10 (CorpNav phoneOnly / CorpTitle wide, sections as band segments). Each tab is one
white kit card of request rows. Jose's note during the session ("the information below the name … organized so it
looks cleaner") is applied: a request reads in three fixed lines:
1. the name, with the kind as a small status label beside it (Cover request and Swap in teal, Can't work in amber);
2. the day and hours together ("Tue, Dec 1 · 12:00 PM – 8:00 PM"), each part kept whole;
3. who else is involved or how it ended ("With James Ortiz", "Picked up by Valeria Díaz").

Open cover drops the label and "Nobody has picked it up yet" on every row (the tab already says both). The row opens in
place to the shifts in full (the approved facts and consequence lines unchanged). The age ("3 min ago") is the row's
value from 768px; on a phone it shows under the lines only once a request is over a day old (OW-011, unchanged rule).
Decline and Approve stack full width when 200% text leaves no room. Errors use the kit's red note. Same reads, forms, revision-bound decisions and Decline/Close asks.

| | Before | After |
|---|---|---|
| Row summary | "Cover request · Tue, Dec 1 · 12:00 PM – 8:00 PM · Picked up by Valeria Díaz" wrapping anywhere (down to one word per line at 768) | three fixed lines as above |
| Summary name | aria-label "Ana Colon, Cover request … Show the shift." | the visible text |
| Close request | aria-label "Close the coverage request from X. The shift stays with them." | "Close request from X" (starts with the visible words) |

**Buttons.** Decline (quiet, no fill) and Approve (white with hairline: Jose's board pick 1A for a row's positive action,
the same pair Things to do uses), 44px high, labels centred. Phone: equal width from the text edge to the card edge.
Tablet: under the row at the right, at least 7.5rem each. Desktop: on the row's line, centred on a closed row; a row
with a rule note keeps the buttons under it so the text never squeezes. Three styles on the page counting the segment
thumb.

## Measurements (production build, fictional data, Owner QAOWNER and Manager OWN-ELENA)
One production build (`NEVORA_OWNED_APP_PRODUCTION=1`, under the heavy lock), captured by the scoped harness at 390,
390 with 200% text, 768 and 1440, signed in as the Owner (QAOWNER) and the Manager (OWN-ELENA); 320 from the first run.
Final runs: `/tmp/nvsweep/raw-prod2` (Availability, Done) and `/tmp/nvsweep/raw-prod3` (Waiting, Open cover, after the
200% fix).

| Page | Widths | Horizontal overflow | Clipped / overlapping text | Button styles | axe on page content | Focus rings |
|---|---|---|---|---|---|---|
| C10 Availability | 320, 390, 390@200%, 768, 1440 | 0 | none | 2 (segment thumb, row links) | none (band segment contrast at 768/1440, kit) | all visible |
| C12 Waiting | 390, 390@200%, 768, 1440 | 0 | none (was: Approve cut at 200%, fixed) | 3 (segment thumb, quiet Decline, white Approve) | same kit finding | all visible |
| C12 Open cover | same | 0 | none (was: kind chip cut at 200%, fixed) | 2 | same kit finding | all visible |
| C12 Done | same | 0 | none | 1 | same kit finding | all visible |

Alignment: every line inside a request or a person's hours starts on the row's text edge (card inset + 48px: 66px on a
phone, 70px from 768px); values and chevrons share the card's right inset (18px phone, 22px from 768px); buttons are
44px high with centred labels, equal width on a phone, stacked full width at 200% text. Visible words: Availability 29,
Waiting 89 (phone) / 104 (desktop), Open cover 70 / 85, Done 23. The harness's "spill" note on the 768 buttons is the
busy label held invisibly in the same cell (shared `PendingLabel`), not visible overflow.

Checks run: `tsc --noEmit`, oxlint on the changed files, `run-rstest` on `manager-workflows`, `availability-team-list`,
`decline-asks`, `app/app/exchange` and `app/app/availability` (108 passed, 0 failed).

## Impeccable audit (references/audit.md)
- **Hierarchy.** Title in the band, sections as segments, one card per list; in a request the name leads, the kind is a
  small label, the when is ink2, who/outcome is grey. Pass.
- **Spacing.** 4/8 scale; every line in a request (facts, buttons, hours) starts on the row's text edge (inset + 48px);
  cards 12px apart; inset 18px on phones, 22px from 768px. Pass.
- **Accessibility.** No row aria-label that differs from its text; focus rings visible on every stop (focus walk at 390
  and 1440); 44px buttons; rem text, 200% text clean after the chip fix; reduced motion stops the caret turn. One shared
  finding left (below).
- **States.** Loading (existing route skeletons), empty per tab, error note, rule notes ("Needs Owner rule review",
  "We couldn't check this right now…"), unavailable access (existing `OperationalUnavailable`). Pass.
- **Wording.** Each count once; no "N of M sent" line; no repeated "Cover request" / "Nobody has picked it up yet" on
  Open cover; approved payroll/legal wording untouched.

## Blocking items left
None on these pages.

## End-sweep items (proposed ledger rows)
| Proposed row | Where | Finding | Owner |
|---|---|---|---|
| end sweep | kit: band segments (`.c-seg` on the band, `owner-b-pages.css` / `b-foundation.css`) | axe color-contrast on the unselected segment labels at 768 and 1440 (Not sent/Sent, Open cover/Done); same on every Corp page with band segments | kit |
| end sweep | `ShiftRequestDecide` (`shift-request-decide.tsx`) | still carries the Quiet `q-acts`/`q-bs` class names (styled correctly through `b-rowact`); rename to kit names when the decline-asks tests move | this package next pass |
| end sweep | Employee and Lead side of `/app/exchange` | still the Quiet page; out of this package's scope | — |

## Gaps in the checks
- Location Manager (Mℓ) sees the existing notice on both pages; not changed or captured.
- Keyboard was checked by the harness focus walk, not by hand; screen reader not run.
