# Phase 3.5 Wave B: weekly Owner and Manager pages on the kit

October 19, 2026 · branch `claude/p35-wave-b-808dfd` (pushed for Codex on Jose's yes) · **status: in the exit round** (round 4). This report is final when that round reaches zero.

Jose approved the built screens as they stand ("approved A, B, C", via the coordinator), with no design changes.

## Pages

| Page | Route | Roles | What it is now |
|---|---|---|---|
| Insights | `/app/reports` | Owner, Manager | Kit band, then these cards: Report period, Export, At a glance, Period summary and the report sections. Tables become stacked rows on narrow cards. Print / Save PDF has its own layout. The report stays on screen across its 15-second snapshots (it quietly reads the next one) |
| Templates | `/app/schedule/templates` | Owner, Manager | Week stepper (dims while the next week loads), then Save this week and Saved templates. Archive asks first. A failed save keeps the page and the typed name |
| Scheduling rules | `/app/schedule/settings` | Owner (edits the trade policy), Manager (reads it) | Section links (a side column from 1024px). Location staffing and Weekly hours have a sticky save bar that shows "Saving…", errors and "Saved" in the bar. Recurring coverage periods have day tiles; Remove asks first. "Trades and coverage" is in plain words |
| Update detail | `/app/updates/<id>` | Every role | The band carries category, title, author and time; then the message, the review card (Acknowledge or Mark read) and recipients. Withdraw asks first. Loading, failed, offline, paused and signed-out states each have their own wording |
| Compose | `/app/updates/compose` | Owner and Manager ("Create update"); Lead and Employee ("Message today’s team") | Your message and Delivery cards in the shared form pattern, then an audience preview and Publish. Errors show under their own field |
| Payroll settings | `/app/settings/payroll` | Owner | Each group of settings is its own card under "Company defaults". Save progress and failures float in view. **Payroll wording unchanged** |
| Payroll runs | `/app/payroll` | Manager with payroll access (and the Owner) | Same screen for both roles. This phase made the stepper fit narrow widths, kept amounts and dates whole, floated save feedback into view, and put the guidance line on the kit callout role |

Styles live only in `src/app/app/premium-wave-b.css`. Retired stylesheets: `reports.module.css`, `communication-compose.css`, `communication-detail.css`, `templates.css` and `scheduling-rules.css`. New component: `src/components/wave-b-forms.tsx`, with Wave B's own form wrappers: confirm steps, inline failures, pending labels, one request per press, and focus kept. Other teams use the shared configuration and policy forms, so those weren't changed.

## Inspection

Five read-only inspectors (alignment and geometry; bars and stability; type, colour and copy; interaction and states; widths, roles and consistency) ran each round. They followed PARALLEL.md, with Jose's cuts applied from round 2 onward. Reports are in `inspection/`.

| Round | Build | P0 | P1 | P2 | Notes |
|---|---|---|---|---|---|
| 1 | `73c99cb` | 1 | 31 | 62 | First full sweep (5 areas) |
| 2 | `2e7495c` | 0 | 15 | 31 | Re-check plus the fixes' surface |
| 3 (exit) | `9f32ca6` | 0 | 7 | 20 | Full sweep by all five, plus re-check |
| 4 (exit) | `9bd265e` | _pending_ | | | Full sweep by all five, plus re-check (also handed to Codex) |

## Checks

_Final numbers are filled in at exit._ Round-3 build: typecheck clean, lint clean on every Wave B file, and the related suites passing (1,334 tests across `src/components`, `src/app/app` and `src/lib/reports`). The only `eslint src` error is the known Wave A one at `exchange/swap/page.tsx:51`. `checks.mjs` (Chromium every width and text size, WebKit, axe) found no overflow and no sub-floor text or small targets on Wave B elements; its remaining flags were shell items, dev-server load errors, and the payroll guidance line, now fixed.

## Set aside for Codex (joint testing)

See `CODEX.md`. In short: the real outcome of every save, publish, archive, remove and payroll action; the Insights CSV contents; server-written report definitions; notifications from a published update; server-rendered error screens; and a review-only payroll manager fixture.

## Suggestions for Jose (not changed: payroll and legal wording needs your OK)

| Where | Current | Suggested |
|---|---|---|
| Payroll settings, Payment instructions select | "Neutral instructions · compatibility unverified" (cut on phones) | "Standard file (not bank-checked)" |
| Provider and channel selects | "No provider preference saved" / "No channel preference saved" | "No provider chosen" / "No bank channel chosen" |
| Deductions and contributions | "Missing configuration is not a zero tax or an exemption." | "A rule that isn’t set up yet doesn’t mean zero tax or an exemption." |
| Preparation reminder help | "A missed window can catch up with one current actionable notice." | "If the reminder day has passed, one reminder is sent as soon as it can be." |
| Payroll access | "Manager time-review permission does not grant access to financial records." | "Reviewing timecards doesn’t give access to pay amounts." |
| Automation | "Queue private payroll notices" / "…queued does not mean delivered." | "Send private payroll reminders" / "…a reminder being sent doesn’t mean it was read." |
| Save recovery | "Check an unconfirmed action" plus a raw reference | "We’re not sure this saved. Check before trying again." (reference behind "Show details") |
| Settings history | "Revision 1 · Effective …" | "Version 1 · Starts …" |
| "Save company preferences" button | wraps at 320 | "Save preferences" |
| Insights report definitions (`lib/reports/project.ts`, kept on purpose under DESIGN.MD U5) | "Actual time uses D2 canonical effective entries and breaks; finalized cards use their immutable snapshots." and five more | A plain set, for example "Recorded time is clock-in to clock-out, breaks included. Approved timecards use their approved times." (full list in `inspection/type-colour-copy.md`) |

## Shared items sent to the coordinator, and their outcome

| Item | Outcome |
|---|---|
| Payroll network errors and the error icon; 401 → "Your session ended" | Fixed (a62cc79, and later) |
| Fields grow with text; 3:1 field edges; the full landscape band summary | Fixed (a62cc79); textareas and search fields (WR-49) fixed in e7671e6 |
| Update detail root-loading entry; Inter font swap; landscape toast; keepWhole weekday | Fixed on `claude/premium-phase-1`; they arrive with the merge |
| Tab bar highlights More on Templates and Scheduling rules; the desktop sidebar highlights Settings | Decided: intended |

## Gaps

- **Templates Apply and Archive on a real saved row.** The fictional data has no saved template, and creating one would be a write. Measured on inserted rows with the page's own markup.
- **Large data.** No `--large` preview was run for Wave B.
- **The on-screen keyboard** in the iOS Simulator and the Android emulator: _run at exit, result below_.
- **Real devices** (VoiceOver, TalkBack): Jose's checklist.
- **Firefox:** cut by Jose.

## Screenshots

`screens/`: each page at 390 and 1440 (Owner, Manager, Employee and the payroll reviewer where they apply).
