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

## Rows

| # | Screen | Gap | Source | Kind | Status |
|---|---|---|---|---|---|
| G1 | Copy receipt | BEFORE capture of the real copy at 768 showed a load error ("Try again"); re-capture to confirm it was timing | C8 agent | Evidence | assigned (package D) |
| G2 | Copy receipt | No BEFORE alignment numbers (the probe was added after the BEFORE run) | C8 agent | Evidence | assigned (package D) |
| G3 | Copy receipt | Loading and error states not captured | C8 agent | Evidence | assigned (package D) |
| G4 | Copy receipt | No Spanish for this page | C8 agent | Product | open |
| G5 | Shared kit (band back link) | "‹ Schedule" in the band is 32px tall at 768 and 1440 (44px on phones); Find cover has the same | C8 agent | Accessibility | closed: `545c747c`, `5e39d2fb`; 44px hit area from 768 up (32px drawn box kept), hit tests land 6px above to 5.5px below; `b-foundation.test.ts` (G5) |
| G6 | App shell | Sidebar link "Things to do, N" has label-content-name-mismatch at 768 and 1440 on every page | C8, F1, time agents | Accessibility | closed: `d06223a6`; name now starts with the drawn text; mismatch 0 on every page, all widths, three roles; `app-shell-todo-name.test.tsx` |
| G7 | Clocker receipt | Not captured: the scan harness can't find the kiosk PIN entry, so the new time format there is unit-tested only | Time agent | Harness + evidence | assigned (package D) |
| G8 | Schedule day view (timeline) | Not captured; its capsules stay on one line, so a short shift's full range may run wider than the capsule at 768 | Time agent | Layout risk | assigned (package D) |
| G9 | Time format | Keyboard not walked; 200% text checked at 390 only | Time agent | Evidence | assigned (package D) |
| G10 | Time format | `business-time.ts` `formatBusinessClock` still prints a leading zero; nothing displays it now; remove or route through the shared formatter | Time agent | Cleanup | closed: `e2d04088`; `formatBusinessClock` removed (only its own test used it) |
| G11 | Timecards | 4 colour-contrast hits at 1440 (pre-existing) | Time agent | Accessibility | closed: `545c747c`, `5e39d2fb`; counts 5.85:1, week strip 6.18:1; colour-contrast 0 at every width for three roles |
| G12 | Schedule, Home, Time (shared roster rows) | label-content-name-mismatch on phones: week-strip days fixed (`39215f3a`), 13→3 for Daniel and 14→7 for Elena; roster row labels ("Find cover for the open shift…", "Edit …'s shift") still differ from their visible text | Lead (C1-Ml), time agent, recheck agent | Accessibility | assigned (package A) |
| G13 | Team (TeamB, all roles) | Phone empty search has no "Clear search" button (desktop has one) | F1 agent | States | assigned (package A) |
| G14 | Team | "Clocked in" is both a filter label and a row status | F1 agent | Wording | Jose |
| G15 | Shared kit (b-filters) | Filter-count contrast 4.19:1 (Elena's "All 12") | F1 agent | Accessibility | closed: `545c747c`; count 5.85:1 (white thumb), 5.21:1 (grey track); Team axe contrast 1→0 |
| G16 | Team · Location Manager | The scoped read has no positions, so rows show the role instead of "Front counter" like Elena's | F1 agent | Data contract | open |
| G17 | Team · Location Manager | Rows can't open a person: the person page says "Company-wide access needed" to a location Manager | F1 agent | Product | Jose |
| G18 | Team · Location Manager | Location menu open state and focus not captured; no screen reader or reduced-motion pass | F1 agent | Evidence | assigned (package D) |
| G19 | Tests | Stale "denied" wording assertion in 6 files (the 3 the F1 agent found, plus `operational-page-composition`, `reports/page`, `reports/christmas-bonus/page`) | F1 agent, lead | Tests | closed: all 22 tests in those files pass |
| G20 | Tests | About 64 pre-existing unit failures across the suite (Phase 1 end count) | Lead | Tests | open: 64→1. 62 tenancy tests were the shallow clone missing a pinned commit (fetched; see G43); the inbox count test was stale (`4232d383`, package E, plus a new denied-access case). The 1 left is the manuals gate (G44), which needs Jose |
| G21 | Schedule (shared roster) | Position cut off at 768 ("Front co…") | Lead | Layout | closed: `56b4c792`, ellipses 6→0 (Daniel) and 16→0 (Elena) |
| G22 | All screens | No WebKit or screen reader in this container: Safari, iPhone and VoiceOver checks | Lead | Device | device |
| G24 | Team · Manager (Elena) and Owner | Band says "2 clocked in" and the filter says "Clocked in 2" (repeat); phone filters are a 2×2 grid with an empty slot and "Not clocked in" spills its pill at 200% text. Fixed for Daniel with `countsOnce`; not yet for Elena or the Owner | Lead review of F1-Ml | Wording + layout | assigned (package A) |
| G25 | Time format | Merged: `0236ba4c`, `3271f4d0`, `493802cd`. Old forms gone from display code and rendered screens | Time agent | — | closed |
| G26 | Shift sheet (Owner and Manager) | Selects and labels sized in px, so they don't grow at 200% text (the read-only value does) | C2/C4 agent | Accessibility | assigned (package B) |
| G27 | Schedule · Location Manager | After a save, the phone Schedule opens on Monday, not the saved day: the scoped Schedule ignores `day=` | C2/C4 agent | Flow | assigned (package D) |
| G28 | Shift sheet (Owner) | Owner's sheet still repeats: "Choose a time" twice, "position"/"No position", the day in both the subtitle and Date, the name in the Note placeholder (fixed for the Manager only) | C2/C4 agent | Wording | assigned (package B) |
| G29 | Shift sheet, desktop | Fields stop at 420px inside a 610px card; the footer buttons sit at the fields' edge, not the card's | Lead review | Alignment | assigned (package B) |
| G30 | Delete shift confirm | Title "Delete this shift?" and its button "Delete this shift" repeat | C2/C4 agent | Wording | assigned (package B) |
| G31 | Shift sheet | Readiness browser integration tests not run after the move to the shared sheet | C2/C4 agent | Tests | assigned (package B) |
| G32 | Direction B phone screens (kit) | Glass week strip sits at 20/370 but white cards at 14/376: a 6px offset each side | Recheck agent | Alignment | assigned (package A) |
| G33 | Schedule · Manager (Elena) | Phone band repeats the date and "Add shift" from the day card (fixed for Daniel only) | Recheck agent | Wording | assigned (package A) |
| G34 | Schedule (all roles) | At 200% text the week-strip day numbers run edge to edge ("16171819…") | Recheck agent | Layout | assigned (package A) |
| G35 | Schedule (all roles) | With no key shown, the grid card keeps an empty strip about 50px tall above its header | Recheck agent | Spacing | assigned (package A) |
| G36 | Review replacement | Loading, error and success (after Publish) states not captured after the rebuild; scoped-ask mode not captured after (covered by unit tests) | Recheck agent | Evidence | assigned (package B) |
| G37 | Review replacement · Daniel draft | "Opens Add shift with these details." sits right above "Add draft shift": the button says it already | Recheck agent | Wording | assigned (package B) |
| G38 | Home (all roles) | "Time clock · Not set up" in the band while Today lists someone clocked in | Home agent | Wording / logic | assigned (package A) |
| G39 | Home (Elena and multi-place) | Clocked in / Missed tiles and Not clocked in / Missed rows have aria-labels that differ from their visible text (4 nodes on multi, 8–10 on Elena) | Home agent | Accessibility | assigned (package A) |
| G40 | Home | Band "Open shifts" figure reports a transparent focus outline at 390; ring not confirmed by eye | Home agent | Accessibility | assigned (package A) |
| G41 | Home · Location Manager | Who's working doesn't name the place; Home's "See everyone" drops `?location=` | Home agent | Flow | assigned (package A) |
| G42 | Home | Reduced motion not checked by eye; no screen reader; no Spanish check | Home agent | Evidence | assigned (package D) |
| G43 | Tests (environment) | Tenancy tests need pinned commit `7c628e37…`, missing from a shallow clone. Fetched here; a fresh container loses it. Command added to `.claude/UI-SETUP.md`; adding it to the environment setup script needs Jose | Package E | Environment | Jose |
| G44 | Guides | `src/test/manual-publication.test.ts` fails: the six published guide PDFs are tied to `198168ac` and every app commit since makes them stale. Fix: at the end of Phase 2, check guide text against the new screens and rebuild with `scripts/manuals/build-manuals.mjs`. Rebuilding is publishing | Package E | Release | Jose |
| G45 | Home (Owner, Elena) | 4–7 label-content-name-mismatch nodes beyond G39: the kit's `BLive` draws label and value with nothing between ("in0"), and the Time corrections and Time-off rows' labels | Package C | Accessibility | open (next round, Home files) |
| G46 | Find cover (Owner, Elena) | The `.c-btn` accessible name differs from its text (`coverage-assistant.tsx`) at every width | Package C | Accessibility | open (next round) |
| G47 | Timecards, phones (Owner, Elena) | 12 rows named "Ana Colon, No time yet" while they draw initials, name and status | Package C | Accessibility | open (next round) |
| G48 | Band glass strips (Payroll tabs, `c-seg`, `c-week`, Team search) | Probably the same contrast-tool misread (1.08:1) Timecards' strip had; not measured | Package C | Accessibility | open (next round) |
| G49 | Team | "See all 12" and "All 12": the same count twice | Package C | Wording | open (next round, may close with G24) |
| G23 | Sign-up and billing portal pages | Not captured in the sweep; set aside by Jose ("focus just on nevora") | Sweep | Evidence | Jose (parked) |
