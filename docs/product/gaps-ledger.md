# Gaps ledger (Phase 2)

Jose, Nov 23, 2026: every "couldn't do" or "not checked" from every agent goes here. When the current round of screens
is finished, the lead reconciles this list, groups it, and sends agents to close every row. A row closes only with
evidence (a test, a capture or a measurement), never by being reworded.

Status: **open**, **assigned** (with the agent's task), **closed** (with the commit or evidence), **Jose** (needs his
decision), **device** (needs a real iPhone, Safari or a screen reader, which this container doesn't have).

## Round 1 (Nov 23): packages

| Package | Rows | Owns |
|---|---|---|
| A | G12, G13, G24, G32–G35, G38–G41 | Shared Home, Team and Schedule components |
| B | G26, G28–G31, G36, G37 | Shift sheet, delete confirm, Review replacement, readiness browser tests |
| C | G5, G6, G10, G11, G15 | App shell and nav, kit, band back link, Timecards |
| D | G1–G3, G7–G9, G18, G27, G42 | Missing evidence, kiosk harness, day view, scoped `day=` |
| E | G20 | Pre-existing unit failures |

Needs Jose: G14, G17. Needs Jose or Codex (a server read change): G4 (Spanish for Copy receipt), G16 (positions in the
scoped read). Device: G22. Parked: G23.

## Round 2 (Nov 23): packages

| Package | Rows | Owns |
|---|---|---|
| F | G58, G59 (and G31) | Review replacement publish result, its route and action, readiness browser tests |
| P | G45, G49, G56, G65 | Home (`home-b`, `owner-home-corp`, kit `BLive` only), Team directory, Who's working |
| Q | G47, G50, G52 | Timecards, Clocker receipt |
| R | G48, G51, G54, G55, G64, G67 | Kit and shell: band glass strips, action menu, route error screen, React #441, skip link, `.b-state` |
| S | G53, G57, G60, G61, G62, G66 | Employee Home and Schedule, day view, shift sheet header and Person select, delete confirm |

Held until F lands (same Find cover files): G46, G63. Needs Jose: G4, G14, G17, G43, G44, G68. Codex or server: G16.
Device: G22 (and the screen-reader halves of G18, G42). Spanish: G42.

## Rows

| # | Screen | Gap | Source | Kind | Status |
|---|---|---|---|---|---|
| G1 | Copy receipt | BEFORE capture of the real copy at 768 showed a load error ("Try again"); re-capture to confirm it was timing | C8 agent | Evidence | closed: the error was the access frame's slow check (cleared in 1.1–6.7 s); BEFORE `ab0bb151` shows the real copy at 768 in full; 0 on AFTER |
| G2 | Copy receipt | No BEFORE alignment numbers (the probe was added after the BEFORE run) | C8 agent | Evidence | closed: measured both tips with a markup-free probe: text edges 2→1, figures share one right edge, buttons 44px, repeated strings 30→6 |
| G3 | Copy receipt | Loading and error states not captured | C8 agent | Evidence | closed: loading (skeleton) and error (route error screen) captured at 390, 768, 1440; error screen issues → G54 |
| G4 | Copy receipt | No Spanish for this page | C8 agent | Product | open |
| G5 | Shared kit (band back link) | "‹ Schedule" in the band is 32px tall at 768 and 1440 (44px on phones); Find cover has the same | C8 agent | Accessibility | closed: `545c747c`, `5e39d2fb`; 44px hit area from 768 up (32px drawn box kept), hit tests land 6px above to 5.5px below; `b-foundation.test.ts` (G5) |
| G6 | App shell | Sidebar link "Things to do, N" has label-content-name-mismatch at 768 and 1440 on every page | C8, F1, time agents | Accessibility | closed: `d06223a6`; name now starts with the drawn text; mismatch 0 on every page, all widths, three roles; `app-shell-todo-name.test.tsx` |
| G7 | Clocker receipt | Not captured: the scan harness can't find the kiosk PIN entry, so the new time format there is unit-tested only | Time agent | Harness + evidence | closed: `d2ced7b8`; harness serves a production Clocker over the owned TLS origin; receipts captured at 4 sizes, times read "1:40 AM"; 200% text bugs → G50 |
| G8 | Schedule day view (timeline) | Not captured; its capsules stay on one line, so a short shift's full range may run wider than the capsule at 768 | Time agent | Layout risk | closed: `077ca550`; at 768 short capsules 132→85px, nothing past a cell or the card, ranges wrap only after the dash; 1440 unchanged |
| G9 | Time format | Keyboard not walked; 200% text checked at 390 only | Time agent | Evidence | closed: Tab walked on Owner Schedule, Timecards and Employee Home at 390 and 1440, every stop has a ring; 200% text at 320 and 768 breaks no time; layout bugs → G52, G53 |
| G10 | Time format | `business-time.ts` `formatBusinessClock` still prints a leading zero; nothing displays it now; remove or route through the shared formatter | Time agent | Cleanup | closed: `e2d04088`; `formatBusinessClock` removed (only its own test used it) |
| G11 | Timecards | 4 colour-contrast hits at 1440 (pre-existing) | Time agent | Accessibility | closed: `545c747c`, `5e39d2fb`; counts 5.85:1, week strip 6.18:1; colour-contrast 0 at every width for three roles |
| G12 | Schedule, Home, Time (shared roster rows) | label-content-name-mismatch on phones: week-strip days fixed (`39215f3a`), 13→3 for Daniel and 14→7 for Elena; roster row labels ("Find cover for the open shift…", "Edit …'s shift") still differ from their visible text | Lead (C1-Ml), time agent, recheck agent | Accessibility | closed: `13f6c34d`, `7deef53b`; label mismatch on Schedule rows 0 at 390 and 1440 (Owner 8→0, Elena 9→0, Daniel 6→0, two places 8→0); Employee strip 13→6, no strip days left; `manager-weekly-roster.test`, `schedule-b.test` |
| G13 | Team (TeamB, all roles) | Phone empty search has no "Clear search" button (desktop has one) | F1 agent | States | closed: `99c4bc4e`; phone empty search shows a 44px Clear search that returns to `/app/employees`; all roles at 320/390/200%; `team-live.test`, `employees/page.test` |
| G14 | Team | "Clocked in" is both a filter label and a row status | F1 agent | Wording | Jose |
| G15 | Shared kit (b-filters) | Filter-count contrast 4.19:1 (Elena's "All 12") | F1 agent | Accessibility | closed: `545c747c`; count 5.85:1 (white thumb), 5.21:1 (grey track); Team axe contrast 1→0 |
| G16 | Team · Location Manager | The scoped read has no positions, so rows show the role instead of "Front counter" like Elena's | F1 agent | Data contract | open |
| G17 | Team · Location Manager | Rows can't open a person: the person page says "Company-wide access needed" to a location Manager | F1 agent | Product | Jose |
| G18 | Team · Location Manager | Location menu open state and focus not captured; no screen reader or reduced-motion pass | F1 agent | Evidence | closed except the screen reader (→ G22): Enter focuses the current item, Tab moves through places, Escape returns to the trigger; no animation with reduced motion; issues → G51 |
| G19 | Tests | Stale "denied" wording assertion in 6 files (the 3 the F1 agent found, plus `operational-page-composition`, `reports/page`, `reports/christmas-bonus/page`) | F1 agent, lead | Tests | closed: all 22 tests in those files pass |
| G20 | Tests | About 64 pre-existing unit failures across the suite (Phase 1 end count) | Lead | Tests | open: 64→1. 62 tenancy tests were the shallow clone missing a pinned commit (fetched; see G43); the inbox count test was stale (`4232d383`, package E, plus a new denied-access case). The 1 left is the manuals gate (G44), which needs Jose |
| G21 | Schedule (shared roster) | Position cut off at 768 ("Front co…") | Lead | Layout | closed: `56b4c792`, ellipses 6→0 (Daniel) and 16→0 (Elena) |
| G22 | All screens | No WebKit or screen reader in this container: Safari, iPhone and VoiceOver checks | Lead | Device | device |
| G24 | Team · Manager (Elena) and Owner | Band says "2 clocked in" and the filter says "Clocked in 2" (repeat); phone filters are a 2×2 grid with an empty slot and "Not clocked in" spills its pill at 200% text. Fixed for Daniel with `countsOnce`; not yet for Elena or the Owner | Lead review of F1-Ml | Wording + layout | closed: `99c4bc4e`; band "12 employees", All has no count, "Clocked in 3" once, for every role; phone filters one wrapping row; "Not clocked in 0" fits at 200% |
| G25 | Time format | Merged: `0236ba4c`, `3271f4d0`, `493802cd`. Old forms gone from display code and rendered screens | Time agent | — | closed |
| G26 | Shift sheet (Owner and Manager) | Selects and labels sized in px, so they don't grow at 200% text (the read-only value does) | C2/C4 agent | Accessibility | closed: `8f405a78`, `e024315f`; at 390 with 200% text labels 13→26px, selects and Note 16→32px, fields 48→96px tall, for three roles; 100% unchanged |
| G27 | Schedule · Location Manager | After a save, the phone Schedule opens on Monday, not the saved day: the scoped Schedule ignores `day=` | C2/C4 agent | Flow | closed: `6a6d4b16`; after a save the phone strip opens on the saved day (Thu 17), desktop opens its day view; `schedule/page.test.tsx` |
| G28 | Shift sheet (Owner) | Owner's sheet still repeats: "Choose a time" twice, "position"/"No position", the day in both the subtitle and Date, the name in the Note placeholder (fixed for the Manager only) | C2/C4 agent | Wording | closed: `ed3745f1`; Position "None", Start and End empty, Note "Optional"; Edit subtitle is the state only |
| G29 | Shift sheet, desktop | Fields stop at 420px inside a 610px card; the footer buttons sit at the fields' edge, not the card's | Lead review | Alignment | closed: `8f405a78`, `e024315f`; card fits its 560px field block (606px); at 1440 fields 319–879 and Save ends at 879; Delete card the same width |
| G30 | Delete shift confirm | Title "Delete this shift?" and its button "Delete this shift" repeat | C2/C4 agent | Wording | closed: `dc962218`; confirm reads "Delete this shift?", "Keep shift", "Delete"; concurrency browser test passes with the new name |
| G31 | Shift sheet | Readiness browser integration tests not run after the move to the shared sheet | C2/C4 agent | Tests | closed (package F run): `readiness-ui-browser` reaches and passes all 12 shift-sheet checks, Chromium and WebKit, UI-COMPANY and UI-LOCAL (`/tmp/nevora-sweep/gaps-g59/after/ui/*-conflict.png`); the whole test stays red only on G69 |
| G32 | Direction B phone screens (kit) | Glass week strip sits at 20/370 but white cards at 14/376: a 6px offset each side | Recheck agent | Alignment | closed: `13f6c34d`; strip and cards share 14/376 at 390 and 14/306 at 320 for every role |
| G33 | Schedule · Manager (Elena) | Phone band repeats the date and "Add shift" from the day card (fixed for Daniel only) | Recheck agent | Wording | closed: `13f6c34d`; Owner and Elena phone band: no date line, no white Add shift (stays in the … menu) |
| G34 | Schedule (all roles) | At 200% text the week-strip day numbers run edge to edge ("16171819…") | Recheck agent | Layout | closed: `13f6c34d`; each day at least 2.25rem, so at 200% the days wrap 4 + 3; all seven fit at 320 with normal text |
| G35 | Schedule (all roles) | With no key shown, the grid card keeps an empty strip about 50px tall above its header | Recheck agent | Spacing | closed: `13f6c34d`; grid card top strip 52→0px (Daniel two places, one place, Elena at 768 and 1440) |
| G36 | Review replacement | Loading, error and success (after Publish) states not captured after the rebuild; scoped-ask mode not captured after (covered by unit tests) | Recheck agent | Evidence | closed: loading, error (DB unchanged), scoped ask and success after Publish captured on production builds; the slow-response failure → G58 |
| G37 | Review replacement · Daniel draft | "Opens Add shift with these details." sits right above "Add draft shift": the button says it already | Recheck agent | Wording | closed: `9ea8e283`; only "Add draft shift" and "Cancel"; `coverage-review.test.tsx` |
| G38 | Home (all roles) | "Time clock · Not set up" in the band while Today lists someone clocked in | Home agent | Wording / logic | closed: `45c525bf`; Daniel's band shows "Clocked in 1/3 · Not clocked in 0 · Open shifts 2" instead of "Not set up"; `owner-home-corp.test` |
| G39 | Home (Elena and multi-place) | Clocked in / Missed tiles and Not clocked in / Missed rows have aria-labels that differ from their visible text (4 nodes on multi, 8–10 on Elena) | Home agent | Accessibility | closed: `45c525bf`; Home tiles and rows lose differing aria-labels; phone axe 5→0 (Elena), 2→0 (Daniel two places) |
| G40 | Home | Band "Open shifts" figure reports a transparent focus outline at 390; ring not confirmed by eye | Home agent | Accessibility | closed: `45c525bf`; band ring is a 2px white outline at every width; no transparent rings in any keyboard walk |
| G41 | Home · Location Manager | Who's working doesn't name the place; Home's "See everyone" drops `?location=` | Home agent | Flow | closed: `45c525bf` (links keep `&location=`), `79ea724d` (Who's working names the place beside the date); `scoped-home.test`, `whos-working-corp.test` |
| G42 | Home | Reduced motion not checked by eye; no screen reader; no Spanish check | Home agent | Evidence | open: Spanish only. Reduced motion closed (nothing moves but the intended 200 ms fade); screen reader → G22 |
| G43 | Tests (environment) | Tenancy tests need pinned commit `7c628e37…`, missing from a shallow clone. Fetched here; a fresh container loses it. Command added to `.claude/UI-SETUP.md`; adding it to the environment setup script needs Jose | Package E | Environment | Jose |
| G44 | Guides | `src/test/manual-publication.test.ts` fails: the six published guide PDFs are tied to `198168ac` and every app commit since makes them stale. Fix: at the end of Phase 2, check guide text against the new screens and rebuild with `scripts/manuals/build-manuals.mjs`. Rebuilding is publishing | Package E | Release | Jose |
| G45 | Home (Owner, Elena) | 4–7 label-content-name-mismatch nodes beyond G39: the kit's `BLive` draws label and value with nothing between ("in0"), and the Time corrections and Time-off rows' labels | Package C | Accessibility | open (next round, Home files) |
| G46 | Find cover (Owner, Elena) | The `.c-btn` accessible name differs from its text (`coverage-assistant.tsx`) at every width | Package C | Accessibility | open (next round) |
| G47 | Timecards, phones (Owner, Elena) | 12 rows named "Ana Colon, No time yet" while they draw initials, name and status | Package C | Accessibility | open (next round) |
| G48 | Band glass strips (Payroll tabs, `c-seg`, `c-week`, Team search) | Probably the same contrast-tool misread (1.08:1) Timecards' strip had; not measured | Package C | Accessibility | open (next round) |
| G49 | Team | "See all 12" and "All 12": the same count twice | Package C | Wording | open (round 2): G24 removed the filter count; company Team at 1440 still says "See all 12" under "12 employees" (`employee-directory.tsx`) |
| G50 | Clocker receipt, 390 at 200% text | "Clocked in at" breaks inside the time ("1:40 A / M"); the large time is clipped; the band date is cut off | Package D | Layout | open (next round) |
| G51 | Action menu (location menu, likely every menu) | Item focus ring is white on white (only a faint fill shows); trigger name doesn't start with its text; no `aria-expanded` | Package D | Accessibility | open (next round) |
| G52 | Timecards (Owner), 200% text | At 320 band labels collide, names truncate, "Clocked in now" clipped, subtitle off screen; at 768 subtitle overlaps and filters spill | Package D | Layout | open (next round) |
| G53 | Employee Home, 768 at 200% text | Row lines overlap (px line heights), quick actions truncate ("Ti…"), weekday labels collide, legend overlaps the dates, band tiles truncate | Package D | Layout | open (next round) |
| G54 | Route error screen (`WaveARouteError`) | Says "didn't load" twice; two ways back to Schedule; "Check your connection" for a server error; back link name mismatch | Package D | Wording | open (next round) |
| G55 | All production pages | Console logs "Minified React error #441" on every run, every role and width | Package D | Bug | open (next round) |
| G56 | Home (Owner) | "First-week setup" shows while Home checks, then disappears, moving Things to do and Today (QA A2-03/S-02) | Package D | Layout shift | open (next round) |
| G57 | Schedule day view, 768 | A two-line capsule's position line sits flush on its 3px bottom bar | Package D audit | Spacing | open: `1b5eb4d0` adds 6px bottom padding (one-line capsules measured 12px clear); the two-line case isn't captured yet |
| G58 | Review replacement · Owner Publish | **Blocking.** With an 8.5 s server reply the shift is saved and Ana is notified, but the page reloads the review 4 times and ends on "Coverage changed · Nothing was saved". Same at the tip; likely the access frame refresh racing the action's navigation | Package B | States (false failure) | closed (af6e591b, package F): the access frame refreshes with `router.refresh()` while a Server Action is in flight, so the redirect lands first; a lost reply shows "This change could not be confirmed" with Check coverage and keeps the button locked; the stale page says "This shift was updated after you opened the review." Test `scoped-read-frame-action.test.tsx` (2 fail at the tip, 4 pass). Production build, reply held 9.5 s: Owner and Elena at 1440 and 390 end on "Replacement saved" (`/tmp/nevora-sweep/gaps-g58/after/shots/`); 1 shift saved per press in every case |
| G59 | Tests | `readiness-ui-browser` times out at the payroll history `pause()` (network never idle, 20 s), the same at the tip; blocks its WebKit and UI-LOCAL passes | Package B | Tests | closed (dadc9798, package F): the cause was the Recent exports card leaving an unread reply open, so the page never went idle. The card now cancels its read when it leaves (`payroll-export-receipts.test.tsx`: 3 of 4 fail at the tip, 4 pass). All 14 checks pass in Chromium and WebKit, including WebKit payroll history (`/tmp/nevora-sweep/gaps-g59/after/ui/report.json`); the run still ends red on G69 |
| G60 | Delete shift confirm, phones | "Keep shift" 94px and "Delete" 136px: neither equal width nor stacked | Package B | Buttons | open (round 2) |
| G61 | Phone sheet header | Cancel/Save focus ring is teal on the teal band; should be white | Package B | Accessibility | open (round 2) |
| G62 | Shift sheet, 200% text | Person select shows "Choose someo…" | Package B | Layout | open (round 2) |
| G63 | Find cover, after a save | "Covered" three times: "Replacement saved", the Covered pill and "This shift is covered" | Package B | Wording | open (round 2) |
| G64 | Delete confirm (full-page capture) | A "Skip to content" pill shows over the Location field; verify whether it's a capture artifact | Package B | Verify | open (round 2) |
| G65 | Who's working (Owner, Elena) | "Clock-ins to check" row's name differs from its text (1 node, every width) | Package A | Accessibility | open (round 2) |
| G66 | Employee Schedule | "1 open shift you can pick up" and agenda rows with `aria-haspopup`: 6 label-mismatch nodes (`employee-schedule-corp.tsx`) | Package A | Accessibility | open (round 2) |
| G67 | Kit (`.b-state`) | State text is a fixed 14px and doesn't grow at 200% text (seen on the empty search) | Package A | Accessibility | open (round 2) |
| G68 | Team, phones | The four filters wrap 3 + 1, leaving "Off today" alone on a second row | Package A | Layout | Jose (look) |
| G69 | Tests, WebKit | `readiness-ui-browser` ends red on 5 WebKit console errors for UI-COMPANY: the first visit after sign-in cancels the Home shell's fetches, which the app catches but WebKit logs. Timing-dependent (UI-LOCAL passes). Likely fix: wait for Home to settle after sign-in; don't loosen the check | Package F | Tests | open |
| G70 | Scoped pages, forms | Only `ConfigurationForm` records its Server Action, so other forms on scoped pages that call actions directly can still lose a slow redirect to the frame's refresh | Package F | States (false failure) | open |
| G71 | Review replacement | After a lost reply, the frame's next refresh (about 10 s) replaces the amber note and its Check coverage link with the stale-review page | Package F | States | open |
| G72 | Callout links | The callout link ("Check coverage", "Check the schedule") is under 44px tall; the band back link is under 44px at 1440 | Package F | Targets | open |
| G23 | Sign-up and billing portal pages | Not captured in the sweep; set aside by Jose ("focus just on nevora") | Sweep | Evidence | Jose (parked) |
