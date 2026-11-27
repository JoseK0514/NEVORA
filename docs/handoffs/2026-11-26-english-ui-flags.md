# English UI follow-ups from the Spanish review (Nov 26, 2026)

Source: Codex's `claude-flags.md` in the Spanish integration bundle (reference build: Collab `6983360dd`). The Spanish
versions are fixed and approved. These are the English, and shared, versions for Claude to match. Every item is to be
verified on the English build in Chromium and WebKit before it's marked done.

Priority: **P1** a control can't be used or text is hidden; **P2** an overlap, contrast or tap edge at large text or a
narrow screen; **P3** polish.

## A. Interactions Jose approved in Spanish, to match in English

| # | Screen · role | Change | P |
|---|---|---|---|
| A1 | Team · Owner, company-wide Manager | After a profile and Back (browser or link), keep the selected filter, the row's scroll position and keyboard focus. On a direct profile visit, the Team link still opens the directory. | P2 |
| A2 | Edit shift · Owner, company-wide Manager | The save button reads **Saving…** at its resting width and is disabled during the request. On confirmation, show and announce **Shift saved**. Keep the publishing reminder and the conflict and unknown-outcome handling. | P2 |
| A3 | Public plans · signed out | The selected language pill fades over 150 ms (instant under reduced motion). Content, selected state and `lang` change at once. Draw the focus ring inside its own segment, visible on both fills. | P3 |
| A4 | Public plans · signed out | Switching language also updates the browser title, description and document `lang`, both ways. | P2 |
| A5 | Schedule after saving a shift | At narrow widths, the week action sits below the date and location. Review the "Show full week" and "Opened for review" wording (Spanish: "Ver semana", "En revisión"). | P3 |
| A6 | In-card "Try again" (about 25 places: Who's working, Payroll runs and statements, My pay, Things to do, Timecards, Requests, Hours, Passkeys and others) | Jose, Nov 26: Try again needs a real loading state. The three full-page error screens have it (useRetry: "Trying again…", spinner, same width, keeps focus). Bring the in-card retries onto the same pattern; some already hide or disable the button while refreshing. | P2 |

## B. Large text and narrow screens (320 px or 768 px at 200% text unless noted)

| # | Screen · role | Problem | P |
|---|---|---|---|
| B1 | My Time · Employee | The weekly hours and breaks totals overlap. Use a two-row summary below 360 px at 200%. | P2 |
| B2 | Settings › Branding · Owner | "Logo" and "None" overlap (shared with Spanish). | P2 |
| B3 | Clocker tablets · Owner, 768 | The "Get setup code" label runs about 27 px past the button. | P2 |
| B4 | Clocker PINs · Owner | "Set PIN" covers the position line. "No PIN" runs 13 px past its filter at 320. The search input is 0 px wide at 768. | P1 |
| B5 | Tablet setup · kiosk | The Settings › Clocker tablets path and the language switch are clipped. | P2 |
| B6 | Payroll › People · Owner | "deductions" and "contributions" break inside the word. | P3 |
| B7 | Settings › Restaurants · Owner | "Inactive" breaks over two lines beside the count. | P3 |
| B8 | Owner Home, 320 | "Next: today, 8:00 PM – 12:00 AM" is cut by the two-line clamp (36 px hidden). | P2 |
| B9 | Owner Home, 1024 at 100% | The "Add employee" shortcut shows "Add empl…". | P2 |
| B10 | Schedule rules › Staffing | "Required" runs 44.55 px past the location row. | P2 |
| B11 | Availability agreement editor | "Not this day" runs outside its group. Each "Copy to other days" has a visible-label mismatch in its accessible name (axe, 7 days × 80 views). | P2 |
| B12 | Updates · Employee, Lead | The search field truncates "Search update titles". Move the filter below it when needed. | P2 |
| B13 | Time off requests · Owner | "Approve" (113 px) overflows its 104 px button. | P2 |
| B14 | Account · Lead, 320 | "Delete my account" runs 16.9 px past its button. | P2 |
| B15 | Employee and Lead Home | The "Timecard" link hits the Monday chart row. The "Things to do" count and "All notifications" link intersect. The weekday and date boxes in "Coming up" intersect (shared). | P2 |
| B16 | Owner and Manager Home | "Not clocked in" crosses the next figure (8 of 40 views). | P2 |
| B17 | Owner and Manager Home chart | Adjacent weekday labels touch (shared). | P3 |
| B18 | Manager Home · timecard approval card, 768 | Heading, status, description and button collide (shared, WebKit). | P1 |
| B19 | Clocker PIN field | At 200%, the inputs extend 40 px below their digit boxes and overlap the labels below. | P2 |
| B20 | Write an update, day without a shift | The explanation runs past the page's right edge. | P2 |

## C. Tap targets and hit areas

| # | Screen · role | Problem | P |
|---|---|---|---|
| C1 | Timecards · name buttons, 200% | 39 English buttons miss the bottom-edge probe (Chromium). | P2 |
| C2 | Clocker recovery, PIN, Help someone sign in · 320 and 390 | The back link captures taps on the page heading. | P2 |
| C3 | Import payroll, Paid time export | The back link misses at its top edge. The Payroll and Time exports tabs miss at an edge (shared). | P3 |
| C4 | Payroll settings tabs · WebKit 768 | One edge of each tab misses (shared). | P3 |
| C5 | Saved export receipt · 390 | The download buttons touch: 0 px between and above them. | P2 |
| C6 | Account deletion | The confirmation checkbox misses the edge test (80 views). The Owner support link misses (20 views). | P2 |
| C7 | Delegated time correction · Owner | Tapping 21.5 px above or left of the checkbox lands on the card. | P2 |
| C8 | Team directory | The lower edge of "See all" hits the first row. | P3 |
| C9 | Write an update | The acknowledgment switch misses above and below its track. | P3 |
| C10 | Public footer | 21.5 px right of the Terms link's centre hits the footer span. | P3 |

## D. Focus and contrast

| # | Screen · role | Problem | P |
|---|---|---|---|
| D1 | Desktop sidebar (collapsed, 768–1024) | The Home link shows no visible keyboard focus. Spanish uses a 2 px inset ring. | P1 |
| D2 | Teal-header back links · WebKit 1024 | Hover contrast is 3.93:1 (needs 4.5:1) on Clocker PIN, Help someone sign in and Clocker recovery. | P2 |
| D3 | Public plans language switch · 390 | The focus outline is 1.35:1 on the teal band. | P1 |
| D4 | Write an update · phone keyboard | The location, title and message fields have no visible 2 px focus indicator. | P1 |
| D5 | Updates with partial results | The grey notice crosses the teal header below 4.5:1. | P2 |
| D6 | Availability agreement navigation | No detected 2 px ring at the same stops in English (shared). | P2 |

## E. Not UI fixes, tracked elsewhere

- The Manager notification service's 503 is shared; it goes to Codex.
- Bilingual verified photo-deletion and backup disclosures go to Codex and the platform owner. They're shown verbatim and may stay English in Spanish.
- The shift action's conflict reason is an English server message in both languages; it goes to Codex.
- The QA state scanner must keep the owned HTTPS origin and proxy for new contexts. That's QA harness work.

## Status (Nov 27, 2026, Collab 9e2beede: application ca129b14, guides built from it)

QA verified every item below on a production build (Chromium; WebKit where the flag names it), with Spanish compared
box-for-box against e1c51aed, and English at default text unchanged apart from the fixes.

| Result | Items |
|---|---|
| Fixed, QA PASS | A1, A2 (button; "Shift saved" not reached in QA's fixture), A3, A4 (was already in place), A6, B1, B2, B3, B4, B5, B8, B9 (wraps; 4px content overshoot accepted, nothing clipped), B11, B12, B13, B14, B15, B16, B17, B18, C2, C3, C6, C7, C9, D1, D2, D3, D4 |
| Sub-pixel only, accepted | C1, C4: probes 1px inside each edge land on their own target; only a 0.5px probe touches the abutting neighbour (same in Spanish) |
| Not reproducible with fictional data (Spanish fix shared where one existed) | B7, B10, B19, B20, C10, D6 |
| Not reached with fictional data (Spanish fix shared, not browser-checked) | B6, C5, C8, D5 |
| Waiting on Jose | A5 wording: "Show full week" / "Opened for review" (Spanish "Ver semana" / "En revisión") |

How the shared fixes work: an approved Spanish rule extended to English swaps `:lang(es)` / `[lang=es]` for
`:not(.nv-any-lang)`, the same specificity, so the cascade is otherwise unchanged. Two shared rules regressed English at
default text (Settings rows, Owner Home strip) and were restored to Spanish-only, with English-specific fixes instead.
