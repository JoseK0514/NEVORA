# Screenshot sweep: location Manager, Lead, Employee, signed-out pages, Clocker and phone app Alerts (Nov 22, 2026)

Rows follow `docs/product/page-inventory.md`. Every capture was taken in Chromium on fictional data in an owned local
Postgres (no real accounts, email, SMS or push). Built from `f756f7af` on `claude-codex-collab-nevora`. Full-size PNGs are
in `/tmp/nevora-sweep/le/` on the sweep machine; the thumbnails are in `thumbs/le/` (360 px wide, WebP). The JSON beside
this file holds every capture's final URL, state, family markers, word count, button-style list, text sizes and fonts.

625 captures (300 route, 18 native, 120 public, 187 clocker) covering 194 page or screen × profile units. States: 403 rendered, 152 notice, 46 not reachable, 20 restricted, 4 error. Families (reachable captures): clocker B 187, native B 18, public B 96, route B 236, route Mixed 6, route Older 16.

## How it was captured

- **Harness:** `tools/ui-scan/desk.sh` (a copy pointing at an extended, never-committed copy of `zz-scan.tar.gz`), run as
  `postgres`, each run under `flock /tmp/nevora-heavy.lock`. App pages, signed-out pages and the phone app ran on the
  **production build** (`NEVORA_OWNED_APP_PRODUCTION=1`: `next build`, then `next start`).
- **Mℓ (location Manager):** Daniel Cruz (`OWN-DANI`) in the owner-rich seed (`NEVORA_SCAN_RICH_OWNER=1`), made a Manager
  and given the LOCATIONS scope `[Condado]` through the app's own `assignOperationalScope`, no grants. **Mℓ+Publish:** the
  same session after the Owner grants Publish schedules at Condado (`grantOwnedManagerWorkforcePermission`), revisiting
  Home, More, Things to do, Schedule, Add shift, Review replacement and Build and publish.
- **L and E:** James Ortiz (`QA-SCAN-B`) with the rich employee seed (`NEVORA_SCAN_RICH=1`), role LEAD (leads this week's
  shifts) or EMPLOYEE. The Lead run also had passkeys and browser device alerts on; the Employee run had them off.
- **Signed out:** `NEVORA_SCAN_PUBLIC=1`, English and Spanish (`nv-lang` cookie), 390 and 1440. A second production run
  turned on Mobile Access and commerce to reach Welcome, Access help and Clocker paused (`*-flag-on` rows); those are off
  in production, where the pages answer 404.
- **Clocker:** the kiosk journey (`NEVORA_SCAN_CLOCKER_FLOW=1`, tablet key `scan-kiosk-main`, punches and the PIN key on,
  the extra states on) at 1024×768, 768×1024 and 390×844, once in English and once in Spanish. It ran on the
  **development build**: the production build refuses to set up a tablet over plain http (`clockerOriginFailure` needs an
  https `NEVORA_CLOCKER_ORIGIN` in production), so every production attempt stopped at "Setup not confirmed". The
  capture script's late steps were updated for the current button names (Done, Start over, Confirm clock out).
- **L1:** the Employee's Alerts page in the phone app's user agent (`NEVORA-Native/iOS/1`) with the simulated bridge and
  fictional native alerts config (`NEVORA_SCAN_NATIVE_FLOW=1`, `NEVORA_SCAN_NATIVE_ALERTS=1`), in its own browser context.

## What was measured

- **Family on screen.** B when the screenshot shows the teal band where the title sits (teal share of the band area:
  ≥ 40% of the top 150 px on a phone, ≥ 25% of the area under the desktop top bar) and old-kit markers are under 15 (or
  15% of the visible elements); Mixed when the band is there but old-kit markers pass that line; Older when there is no
  band. Old-kit markers count visible main-content elements with a `wa-`, `wb-`, `wc-`, `q-`, `sg-`, `nv-` or `kit-` class
  or a class containing `quiet` or `signature`; B markers count `b-*` classes and `data-nv-b`. Both counts are in the
  JSON. Every capture was checked against its screenshot on contact sheets; overrides are noted (the sign-in shell's
  Quiet markup is restyled by `auth-b.css` and reads as the Direction B sign-in, so it is B).
- **Words:** visible words in the main content (shell navigation, the tab bar and screen-reader-only text excluded).
- **Button styles:** distinct computed background-color + border + radius (pill when round) + font weight among visible
  buttons and links drawn as buttons in the main content.
- **Text sizes:** distinct computed font sizes of visible text in the main content (listed in the JSON).
- **Cells** below read `family state · words · button styles`. States: r rendered, n notice or closed card, R sent to
  Restricted, e error, x not reachable. `·` means not captured for that profile.

## Key findings

1. **A location Manager can open little of what the inventory marks ✓.** Without company-wide access, Daniel gets
   "Company-wide access needed" on 18 rows marked ✓ for Mℓ (Updates, update detail and compose, Templates, Copy receipt,
   Scheduling rules, Team availability, Availability agreement, Shift changes, Timecards, Time corrections, Fix someone's
   time, Person, Restrictions, Time exports, Paid time export, Insights, Christmas bonus); Payroll G1–G7 say "Payroll is for Owners"; Time off says "Time off is decided by an Owner". What renders:
   Home, More, Notifications, Help, Schedule, Add shift, Shift details (read only), Posted open shifts, Team, My pay,
   Profile and Delete my account, plus Build and publish once the grant is given.
2. **Those working Mℓ pages are the older kit.** Home, Schedule, Add shift, Shift details and Team at your locations have
   no band (white phone header, plain cards; the phone loses the shell header on Add shift and Shift details), while every
   closed card around them is Direction B. This is the biggest visual split left for any profile in this sweep.
3. **Inventory corrections seen on screen:** My pay (G10) and Delete my account (I6) open for Mℓ (marked –); Write an
   update (B8) opens for an Employee (marked –); the Availability agreement (C11) redirects Mℓ to Team availability;
   Billing (J18) and Rondo AI (H1–H4) answer "Page not found" rather than Restricted when the module is off.
4. **Employee and Lead are Direction B on every page they open** (phone and desktop). The worst spots are Posted open
   shifts (the empty line is white on the light canvas on desktop), Passkeys with the flag on (band only, empty body),
   and the Lead's Availability agreement ("The agreement didn't load" at both widths; the Employee's loaded).
5. **Signed-out pages are all the Direction B public variant** in both languages. In production Welcome and Access help
   (Mobile Access off), Owner sign-up and Verify email (sign-up host only) and Clocker paused (commerce off) answer 404.
6. **The Clocker is Direction B on every captured screen** in both languages and at all three sizes. Its busiest
   screens are the action card (teal rows, an outlined Done and two teal text links; up to 14 text sizes with the band)
   and the keypad (up to 7 button styles). The production build cannot set up a tablet over plain http, so the kiosk
   was captured on the development build.
7. **Phone app Alerts (L1)** is Direction B in all nine states.


## A. Signed out and public (English and Spanish)

Cells: family · state (r rendered, n notice, R restricted, e error, x not reachable) · words in the main content · distinct button styles. Full text sizes and button-style details are in the JSON. The sign-in, recovery, activation, Mobile Access and Support pages still carry the Quiet auth markup (`q-` classes) restyled by `auth-b.css`; on screen they are the Direction B public variant, so they are B.

| # | Page (variant) | en 390 | en 1440 | es 390 | es 1440 | Problem |
|---|---|---|---|---|---|---|
| A1 | Start (redirect) (`/`) | B r · 43w · 3b | B r · 87w · 3b | B r · 54w · 3b | B r · 105w · 3b | signed out, / goes to /login |
| A2 | Sign in (`/login`) | B r · 43w · 3b | B r · 87w · 3b | B r · 54w · 3b | B r · 105w · 3b |  |
| A2 | Sign in (wrong ID) (`/login`) | B r · 49w · 3b | B r · 93w · 3b | B r · 64w · 3b | B r · 115w · 3b |  |
| A2 | Sign in (empty submit) (`/login`) | B r · 50w · 3b | B r · 94w · 3b | B r · 62w · 3b | B r · 113w · 3b |  |
| A3 | Welcome (`/welcome`) | x | x | x | x | 404 with Mobile Access off |
| A3 | Welcome (flag on) (`/welcome`) | B r · 37w · 2b | B r · 60w · 2b | B r · 44w · 2b | B r · 73w · 2b |  |
| A4 | Forgot access (`/forgot-access`) | B r · 81w · 3b | B r · 125w · 3b | B r · 79w · 3b | B r · 130w · 3b | up to 9 text sizes |
| A5 | Reset access (bad link) (`/reset-access?token=expired-or-invalid`) | B r · 60w · 3b | B r · 104w · 3b | B r · 66w · 3b | B r · 117w · 3b | an invalid reset token shows the normal form (no bad-link message until submit) |
| A5 | Reset access (`/reset-access`) | B r · 60w · 3b | B r · 104w · 3b | B r · 66w · 3b | B r · 117w · 3b |  |
| A6 | Activate account (`/activate`) | B r · 48w · 1b | B r · 92w · 1b | B r · 50w · 1b | B r · 101w · 1b |  |
| A6 | Activate account (bad link) (`/activate?token=not-a-real-token`) | B r · 48w · 1b | B r · 92w · 1b | B r · 50w · 1b | B r · 101w · 1b | an invalid token shows the same 'Open your email invitation' step |
| A7 | Access help (`/access-help`) | x | x | x | x | 404 with Mobile Access off |
| A7 | Access help: Employee ID (`/access-help/id?from=login`) | x | x | x | x | 404 with Mobile Access off |
| A7 | Access help (flag on) (`/access-help`) | B r · 81w · 1b | B r · 122w · 1b | B r · 82w · 1b | B r · 130w · 1b |  |
| A7 | Access help: Employee ID (flag on) (`/access-help/id?from=login`) | B r · 59w · 2b | B r · 100w · 2b | B r · 56w · 2b | B r · 104w · 2b |  |
| A8 | Owner sign-up (`/onboarding`) | x | x | x | x | 404 off the sign-up host |
| A9 | Verify email (`/onboarding/verify`) | x | x | x | x | 404 off the sign-up host |
| A10 | Activate business (`/onboarding/activate`) | B n · 29w · 1b | B n · 73w · 1b | B n · 28w · 1b | B n · 79w · 1b | 'Open this page from your signup' (needs the sign-up link); on phones the band fills the screen and there is no card |
| A11 | Privacy policy (`/privacy`) | B r · 105w · 2b | B r · 1294w · 1b | B r · 125w · 2b | B r · 1313w · 1b |  |
| A12 | Terms (`/terms`) | B r · 85w · 2b | B r · 491w · 1b | B r · 104w · 2b | B r · 510w · 1b |  |
| A13 | Support (`/support`) | B r · 92w · 1b | B r · 92w · 1b | B r · 107w · 1b | B r · 107w · 1b |  |
| A14 | Account deletion (`/account-deletion`) | B r · 109w · 3b | B r · 451w · 2b | B r · 123w · 3b | B r · 570w · 2b |  |
| A15 | Plans (`/pages/plans`) | B n · 70w · 3b | B n · 81w · 3b | B n · 85w · 2b | B n · 97w · 3b | billing unavailable state only (no central billing in the harness) |
| A16 | Billing (`/pages/nevora-billing`) | B n · 70w · 3b | B n · 81w · 3b | B n · 70w · 3b | B n · 81w · 3b | billing unavailable state only (no central billing in the harness) |
| A17 | Billing return (`/pages/nevora-billing-return`) | B n · 70w · 3b | B n · 81w · 3b | B n · 70w · 3b | B n · 81w · 3b | billing unavailable state only (no central billing in the harness) |
| A18 | Facturación (`/pages/es-facturacion`) | B n · 85w · 2b | B n · 97w · 3b | B n · 85w · 2b | B n · 97w · 3b | billing unavailable state only (no central billing in the harness) |
| A19 | Pago (`/pages/es-pago`) | B n · 85w · 2b | B n · 97w · 3b | B n · 85w · 2b | B n · 97w · 3b | billing unavailable state only (no central billing in the harness) |
| A-404 | Signed-out 404 (`/no-such-page-here`) | B n · 34w · 2b | B n · 34w · 2b | B n · 36w · 2b | B n · 36w · 2b |  |
| K15 | Clocker paused (`/clocker/access/paused`) | x | x | x | x | 404 with commerce off |
| K15 | Clocker paused (flag on) (`/clocker/access/paused`) | B r · 49w · 1b | B r · 60w · 1b | B r · 63w · 1b | B r · 75w · 1b |  |

## B. Home, navigation and messages

| # | Page | Mℓ 390 | Mℓ 1440 | Mℓ+Publish 390 | Mℓ+Publish 1440 | L 390 | L 1440 | E 390 | E 1440 | Problem |
|---|---|---|---|---|---|---|---|---|---|---|
| B1 | Home | Older r · 71w · 3b | Older r · 71w · 3b | Older r · 71w · 3b | Older r · 71w · 3b | B r · 221w · 3b | B r · 234w · 3b | B r · 188w · 3b | B r · 209w · 3b | scoped Home is the older kit: no band, white phone header, plain 'Your managed locations' card (Mℓ); same older scoped Home with the grant (Mℓ+Publish); up to 11 text sizes (L, E) |
| B2 | More | B r · 14w · 1b | B r · 13w · 1b | B r · 14w · 1b | B r · 13w · 1b | B r · 64w · 1b | B r · 64w · 2b | B r · 64w · 1b | B r · 64w · 2b |  |
| B3 | Notifications | B r · 17w · 0b | B r · 16w · 0b | · | · | B r · 93w · 4b | B r · 96w · 4b | B r · 92w · 3b | B r · 95w · 3b |  |
| B4 | Things to do | B n · 61w · 2b | B n · 60w · 2b | B n · 61w · 2b | B n · 60w · 2b | B r · 106w · 2b | B r · 123w · 2b | B r · 106w · 2b | B r · 123w · 2b | the access denial is said twice: the card and a floating 'You don't have access to this' notice (Mℓ); desktop puts the denial card and the Requests list side by side with a gap (Mℓ); same double denial with the grant (Mℓ+Publish); redirects to the Requests hub (by design) (L, E) |
| B5 | Requests hub | B n · 20w · 1b | B n · 19w · 1b | · | · | B r · 106w · 2b | B r · 123w · 2b | B r · 106w · 2b | B r · 123w · 2b |  |
| B6 | Updates | B n · 20w · 1b | B n · 20w · 1b | · | · | B r · 52w · 3b | B r · 51w · 3b | B r · 52w · 3b | B r · 51w · 3b | closed for a location Manager: 'Company-wide access needed' (inventory marks Mℓ ✓) (Mℓ); band carries 'Write an update' for an Employee (E); band carries 'Write an update' (L) |
| B7 | Update detail | B n · 20w · 1b | B n · 20w · 1b | · | · | B r · 66w · 1b | B r · 66w · 1b | B r · 66w · 1b | B r · 66w · 1b | closed for a location Manager: 'Company-wide access needed' (inventory marks Mℓ ✓) (Mℓ); up to 9 text sizes (L, E) |
| B8 | Compose an update | B n · 20w · 1b | B n · 20w · 1b | · | · | B r · 63w · 1b | B r · 63w · 1b | B r · 63w · 1b | B r · 63w · 1b | closed for a location Manager: 'Company-wide access needed' (inventory marks Mℓ ✓) (Mℓ); Write an update opens for an Employee (inventory –) (E); Write an update opens (inventory –; Lead reaches it from Today's team) (L) |
| B9 | Help | B r · 82w · 0b | B r · 81w · 0b | · | · | B r · 95w · 0b | B r · 94w · 0b | B r · 95w · 0b | B r · 94w · 0b |  |
| B10 | Restricted | B n · 16w · 1b | B n · 15w · 1b | · | · | B n · 18w · 1b | B n · 17w · 1b | B n · 18w · 1b | B n · 17w · 1b |  |
| B11 | Page not found | B n · 24w · 1b | B n · 23w · 1b | · | · | B n · 24w · 1b | B n · 23w · 1b | B n · 24w · 1b | B n · 23w · 1b |  |

## C. Schedule, availability and shift changes

| # | Page | Mℓ 390 | Mℓ 1440 | Mℓ+Publish 390 | Mℓ+Publish 1440 | L 390 | L 1440 | E 390 | E 1440 | Problem |
|---|---|---|---|---|---|---|---|---|---|---|
| C1 | Schedule | Older r · 392w · 2b | Older r · 392w · 2b | Older r · 387w · 2b | Older r · 387w · 2b | B r · 79w · 3b | B r · 157w · 2b | B r · 78w · 3b | B r · 153w · 2b | scoped schedule in the older kit: about 390 words of stacked day cards on a phone (Mℓ); location filter needs a separate 'Show schedule' button (Mℓ); 'Posted open shifts' is a full-width grey bar that reads as a header (Mℓ); pre-Direction B look (no band) (Mℓ+Publish); up to 9 text sizes (L, E) |
| C2 | Add shift | Older r · 13w · 1b | Older r · 13w · 1b | Older r · 13w · 1b | Older r · 13w · 1b | B R · 18w · 1b | B R · 17w · 1b | B R · 18w · 1b | B R · 17w · 1b | older location picker form; on phones the shell header is missing (no NEVORA bar) (Mℓ); pre-Direction B look (no band) (Mℓ+Publish) |
| C3 | Find cover: Review replacement | B n · 21w · 1b | B n · 21w · 1b | B n · 21w · 1b | B n · 21w · 1b | · | · | · | · | closed: 'Company-wide access needed' (expected: inventory says –) (Mℓ); still 'Company-wide access needed' with the Publish grant (Mℓ+Publish) |
| C4 | Edit shift | Older r · 28w · 1b | Older r · 28w · 1b | · | · | · | · | · | · | read-only shift details in the older kit; phone header missing |
| C5 | Find cover | x | x | · | · | · | · | · | · | not reached with fictional parameters |
| C6 | Build and publish | B n · 29w · 1b | B n · 29w · 1b | B r · 19w · 0b | B r · 19w · 1b | · | · | · | · | 'Publishing permission needed' card (correct without the grant) (Mℓ); with the grant: opens; phone shows a sheet-style title bar with Done, desktop the band (Mℓ+Publish) |
| C7 | Templates | B n · 21w · 1b | B n · 21w · 1b | · | · | · | · | · | · | closed for a location Manager: 'Company-wide access needed' (inventory marks Mℓ ✓) |
| C8 | Copy receipt | B n · 21w · 1b | B n · 21w · 1b | · | · | · | · | · | · | closed for a location Manager: 'Company-wide access needed' (inventory marks Mℓ ✓) |
| C9 | Scheduling rules | B n · 21w · 1b | B n · 21w · 1b | · | · | · | · | · | · | closed for a location Manager: 'Company-wide access needed' (inventory marks Mℓ ✓) |
| C10 | Availability | B n · 21w · 1b | B n · 21w · 1b | · | · | B r · 54w · 2b | B r · 65w · 2b | B r · 54w · 2b | B r · 65w · 2b | closed for a location Manager: 'Company-wide access needed' (inventory marks Mℓ ✓) (Mℓ) |
| C11 | Availability agreement | B n · 21w · 1b | B n · 21w · 1b | · | · | B e · 20w · 1b | B e · 20w · 1b | B r · 32w · 1b | B r · 32w · 1b | redirects to Team availability, then 'Company-wide access needed' (Mℓ); 'The agreement didn't load' for the Lead (L) |
| C12 | Shift changes | B n · 22w · 1b | B n · 22w · 1b | · | · | B r · 82w · 2b | B r · 90w · 2b | B r · 82w · 2b | B r · 90w · 2b | closed for a location Manager: 'Company-wide access needed' (inventory marks Mℓ ✓) (Mℓ); up to 9 text sizes (L, E) |
| C13 | Open shifts | B n · 22w · 0b | B n · 22w · 0b | · | · | B r · 15w · 0b | B r · 15w · 0b | B r · 15w · 0b | B r · 15w · 0b | opens with two grey notes, no list ('Posting and withdrawal require schedule publishing permission'); on phone the band is shorter than other pages (Mℓ); empty state is a bare line on the canvas with no card; on desktop the line is white on the light canvas (unreadable) (L, E) |
| C14 | Ask for a swap | B n · 22w · 1b | B n · 22w · 1b | · | · | B r · 62w · 2b | B r · 62w · 2b | B r · 62w · 2b | B r · 62w · 2b | redirects to Team shift requests, then 'Company-wide access needed' (inventory –) (Mℓ) |
| C15 | Can't work | B n · 22w · 1b | B n · 22w · 1b | · | · | B r · 45w · 1b | B r · 45w · 1b | B r · 45w · 1b | B r · 45w · 1b | redirects to Team shift requests, then 'Company-wide access needed' (inventory –) (Mℓ) |

## D. Time and timecards

| # | Page | Mℓ 390 | Mℓ 1440 | Mℓ+Publish 390 | Mℓ+Publish 1440 | L 390 | L 1440 | E 390 | E 1440 | Problem |
|---|---|---|---|---|---|---|---|---|---|---|
| D1 | Timecards | B n · 20w · 1b | B n · 20w · 1b | · | · | B r · 50w · 1b | B r · 107w · 1b | B r · 50w · 1b | B r · 107w · 1b | closed for a location Manager: 'Company-wide access needed' (inventory marks Mℓ ✓) (Mℓ); redirects to My time · Past timecards (by design) (L, E); up to 9 text sizes (L, E) |
| D2 | Time corrections | B n · 21w · 1b | B n · 21w · 1b | · | · | B R · 18w · 1b | B R · 17w · 1b | B R · 18w · 1b | B R · 17w · 1b | closed for a location Manager: 'Company-wide access needed' (inventory marks Mℓ ✓) (Mℓ) |
| D3 | Fix someone's time | B n · 21w · 1b | B n · 21w · 1b | · | · | · | · | · | · | closed for a location Manager: 'Company-wide access needed' (inventory marks Mℓ ✓) |
| D4 | My time | B n · 16w · 1b | B n · 16w · 1b | · | · | B r · 149w · 1b | B r · 149w · 1b | B r · 149w · 1b | B r · 149w · 1b | 'My time is for employees' card (as listed) (Mℓ); up to 9 text sizes (L, E) |
| D5 | Clocker recovery review | B R · 16w · 1b | B R · 15w · 1b | · | · | · | · | · | · |  |

## E. Time off and requests

| # | Page | Mℓ 390 | Mℓ 1440 | Mℓ+Publish 390 | Mℓ+Publish 1440 | L 390 | L 1440 | E 390 | E 1440 | Problem |
|---|---|---|---|---|---|---|---|---|---|---|
| E1 | Time off | B n · 31w · 1b | B n · 31w · 1b | · | · | B r · 36w · 2b | B r · 36w · 2b | B r · 36w · 2b | B r · 36w · 2b | 'Time off is decided by an Owner' card names Jose Natal; two different link styles (outlined pill and text link) (Mℓ) |

## F. Team

| # | Page | Mℓ 390 | Mℓ 1440 | Mℓ+Publish 390 | Mℓ+Publish 1440 | L 390 | L 1440 | E 390 | E 1440 | Problem |
|---|---|---|---|---|---|---|---|---|---|---|
| F1 | Team | Older r · 131w · 0b | Older r · 131w · 0b | · | · | B R · 18w · 1b | B R · 17w · 1b | B R · 18w · 1b | B R · 17w · 1b | scoped team directory in the older kit (no band, plain list) (Mℓ) |
| F2 | Add person | B n · 21w · 1b | B n · 21w · 1b | · | · | · | · | · | · | 'Company-wide access needed' card (inventory –) |
| F3 | Import a staff list | B n · 24w · 1b | B n · 24w · 1b | · | · | · | · | · | · | 'Importing a staff list is for Owners' card (as listed) |
| F4 | Person | B n · 21w · 1b | B n · 21w · 1b | · | · | · | · | · | · | closed for a location Manager: 'Company-wide access needed' (inventory marks Mℓ ✓) |
| F5 | Person's pay rate | B R · 16w · 1b | B R · 15w · 1b | · | · | · | · | · | · |  |
| F6 | Restrictions | B n · 21w · 1b | B n · 21w · 1b | · | · | · | · | · | · | closed for a location Manager: 'Company-wide access needed' (inventory marks Mℓ ✓) |
| F7 | Time off balance | B R · 16w · 1b | B R · 15w · 1b | · | · | · | · | · | · |  |
| F8 | Clocker PIN | B R · 16w · 1b | B R · 15w · 1b | · | · | · | · | · | · |  |
| F9 | Help someone sign in | B n · 24w · 1b | B n · 24w · 1b | · | · | · | · | · | · | 'Company-wide access needed' card (inventory –); the band title is cut: 'Help someone sign in is' |

## G. Payroll and exports

| # | Page | Mℓ 390 | Mℓ 1440 | Mℓ+Publish 390 | Mℓ+Publish 1440 | L 390 | L 1440 | E 390 | E 1440 | Problem |
|---|---|---|---|---|---|---|---|---|---|---|
| G1 | Payroll | B n · 19w · 1b | B n · 18w · 1b | · | · | B n · 14w · 1b | B n · 13w · 1b | B n · 14w · 1b | B n · 13w · 1b | 'Payroll is for Owners' card (inventory marks Mℓ ✓) (Mℓ) |
| G2 | Prepare payroll | B n · 19w · 1b | B n · 18w · 1b | · | · | · | · | · | · | 'Payroll is for Owners' card (inventory marks Mℓ ✓) |
| G3 | Review pay | B n · 19w · 1b | B n · 18w · 1b | · | · | · | · | · | · | 'Payroll is for Owners' card (inventory marks Mℓ ✓) |
| G4 | People in this payroll | B n · 19w · 1b | B n · 18w · 1b | · | · | · | · | · | · | 'Payroll is for Owners' card (inventory marks Mℓ ✓) |
| G5 | Fix payroll | B n · 19w · 1b | B n · 18w · 1b | · | · | · | · | · | · | 'Payroll is for Owners' card (inventory marks Mℓ ✓) |
| G6 | Import payroll | B n · 19w · 1b | B n · 18w · 1b | · | · | · | · | · | · | 'Payroll is for Owners' card (inventory marks Mℓ ✓) |
| G7 | Payroll history | B n · 19w · 1b | B n · 18w · 1b | · | · | · | · | · | · | 'Payroll is for Owners' card (inventory marks Mℓ ✓) |
| G8 | Time exports | B n · 21w · 1b | B n · 21w · 1b | · | · | B n · 18w · 1b | B n · 17w · 1b | B n · 18w · 1b | B n · 17w · 1b | closed for a location Manager: 'Company-wide access needed' (inventory marks Mℓ ✓) (Mℓ) |
| G9 | Paid time export | B n · 22w · 1b | B n · 22w · 1b | · | · | B n · 19w · 1b | B n · 19w · 1b | B n · 19w · 1b | B n · 19w · 1b | closed for a location Manager: 'Company-wide access needed' (inventory marks Mℓ ✓) (Mℓ) |
| G10 | My pay | B r · 24w · 0b | B r · 23w · 0b | · | · | B r · 72w · 2b | B r · 80w · 2b | B r · 72w · 2b | B r · 80w · 2b | opens for a Manager (inventory marks Mℓ –) (Mℓ); up to 9 text sizes (L, E) |

## H. Rondo AI and insights

| # | Page | Mℓ 390 | Mℓ 1440 | Mℓ+Publish 390 | Mℓ+Publish 1440 | L 390 | L 1440 | E 390 | E 1440 | Problem |
|---|---|---|---|---|---|---|---|---|---|---|
| H1 | Rondo AI | x | x | · | · | x | x | x | x | 404: AI manager off in the harness (Mℓ, L, E); answers 'Page not found' instead of Restricted (AI manager off) (L, E) |
| H2 | Weekly plan | x | x | · | · | · | · | · | · | 404: AI manager off in the harness |
| H3 | Business records | x | x | · | · | · | · | · | · | 404: AI manager off in the harness |
| H4 | Company knowledge | x | x | · | · | · | · | · | · | 404: AI manager off in the harness |
| H5 | Insights | B n · 20w · 1b | B n · 20w · 1b | · | · | B n · 16w · 1b | B n · 15w · 1b | B n · 16w · 1b | B n · 15w · 1b | closed for a location Manager: 'Company-wide access needed' (inventory marks Mℓ ✓) (Mℓ) |
| H6 | Christmas bonus | B n · 22w · 1b | B n · 22w · 1b | · | · | B n · 20w · 1b | B n · 19w · 1b | B n · 20w · 1b | B n · 19w · 1b | closed for a location Manager: 'Company-wide access needed' (inventory marks Mℓ ✓) (Mℓ) |

## I. Profile and account

| # | Page | Mℓ 390 | Mℓ 1440 | Mℓ+Publish 390 | Mℓ+Publish 1440 | L 390 | L 1440 | E 390 | E 1440 | Problem |
|---|---|---|---|---|---|---|---|---|---|---|
| I1 | Profile | Mixed n · 105w · 0b | Mixed n · 104w · 0b | · | · | B r · 61w · 2b | B r · 79w · 2b | B r · 60w · 2b | B r · 78w · 2b | manager profile is the older Quiet list under a B band (access rows, 'What you can approve', notifications and privacy disclosures) (Mℓ); mixed kits (old-kit markers 37, B markers 1) (Mℓ); mixed kits (old-kit markers 38, B markers 1) (Mℓ) |
| I2 | Policy document (`privacy`) | Mixed n · 114w · 0b | Mixed n · 113w · 0b | · | · | B r · 119w · 0b | B r · 155w · 0b | B r · 119w · 0b | B r · 155w · 0b | redirects to Profile#profile-privacy (by design for managers) (Mℓ) |
| I2 | Policy document (`terms`) | · | · | · | · | B r · 91w · 0b | B r · 117w · 0b | B r · 91w · 0b | B r · 117w · 0b |  |
| I3 | Calendar subscription | B n · 24w · 1b | B n · 23w · 1b | · | · | B r · 76w · 2b | B r · 75w · 2b | B r · 76w · 2b | B r · 75w · 2b | 'Calendar links are for Employees and Leads' card (as listed) (Mℓ) |
| I4 | Device alerts | x | x | · | · | B r · 76w · 1b | B r · 76w · 1b | B n · 35w · 0b | B n · 35w · 0b | redirect to Profile (flag off) (Mℓ); 'Your workplace hasn't turned on device alerts' (browser alerts off in this run) (E); 'Setup needs a check' is said twice: in the card and again as a warning line under it (L) |
| I5 | Passkeys | x | x | · | · | B e · 2w · 0b | B e · 2w · 0b | x | x | redirect to Profile (flag off) (Mℓ, E); blank page: only the band 'Passkeys', no card or action (L) |
| I6 | Delete my account | Mixed r · 154w · 3b | Mixed r · 154w · 3b | · | · | B r · 135w · 2b | B r · 135w · 2b | B r · 135w · 2b | B r · 135w · 2b | opens for a Manager (inventory marks Mℓ –) (Mℓ); older Quiet deletion page under the band: three button styles, eight text sizes (Mℓ); mixed kits (old-kit markers 50, B markers 0) (Mℓ) |

## J. Settings and billing (Owner)

| # | Page | Mℓ 390 | Mℓ 1440 | Mℓ+Publish 390 | Mℓ+Publish 1440 | L 390 | L 1440 | E 390 | E 1440 | Problem |
|---|---|---|---|---|---|---|---|---|---|---|
| J1 | Settings | B n · 17w · 1b | B n · 16w · 1b | · | · | B n · 14w · 0b | B n · 14w · 0b | B n · 14w · 0b | B n · 14w · 0b | 'Settings are for Owners' card (Mℓ) |
| J18 | Billing | x | x | · | · | · | · | · | · | 404 for a Manager instead of Restricted |

## K. Clocker (kiosk `/clocker/scan-kiosk-main`; K15 is `/clocker/access/paused`)

Family judged against "Clocker Direction B" (teal band or panel, one lifted white card, Inter, 64px rings). English and Spanish each come from one full kiosk journey on the development build (see How it was captured). Some states show at one size only (the script captures them mid-request).

| # | Screen | en 1024x768 | en 768x1024 | en 390x844 | es 1024x768 | es 768x1024 | es 390x844 | Problem |
|---|---|---|---|---|---|---|---|---|
| K1 | Setup: enter code (`setup`) | B r · 97w · 3b | B r · 93w · 3b | B r · 88w · 3b | B r · 107w · 3b | B r · 103w · 3b | B r · 97w · 3b |  |
| K1 | Setup: bad code (`setup-bad-code`) | B r · 109w · 3b | B r · 105w · 3b | B r · 100w · 3b | B r · 119w · 3b | B r · 115w · 3b | B r · 109w · 3b |  |
| K1 | Setup: checking (`setup-checking`) | B r · 97w · 3b | B r · 93w · 3b | B r · 88w · 3b | B r · 107w · 3b | B r · 103w · 3b | B r · 97w · 3b |  |
| K1 | Setup: connection uncertain (`setup-uncertain`) | B r · 45w · 3b | B r · 41w · 3b | B r · 38w · 3b | B r · 50w · 3b | B r · 46w · 3b | B r · 42w · 3b |  |
| K2 | Ready screen at a late hour (`band-late-hour`) | B r · 43w · 3b | B r · 39w · 3b | B r · 33w · 3b | B r · 51w · 3b | B r · 47w · 3b | B r · 40w · 3b |  |
| K3 | Enter Employee ID (connected, empty) (`pin-empty`) | B r · 43w · 3b | B r · 39w · 3b | B r · 33w · 3b | B r · 51w · 3b | B r · 47w · 3b | B r · 40w · 3b |  |
| K3 | Employee ID screen in Spanish (`pin-espanol`) | B r · 51w · 3b | B r · 47w · 3b | B r · 40w · 3b | · | · | · |  |
| K4 | PIN checking (`pin-checking`) | B r · 52w · 6b | · | · | B r · 58w · 6b | · | · |  |
| K4 | PIN not recognized (`pin-not-recognized`) | B r · 57w · 6b | B r · 53w · 6b | B r · 47w · 6b | B r · 65w · 6b | B r · 61w · 6b | B r · 54w · 6b |  |
| K4 | Too many attempts (`pin-too-many-attempts`) | B r · 55w · 3b | B r · 51w · 3b | B r · 45w · 3b | B r · 66w · 3b | B r · 62w · 3b | B r · 55w · 3b |  |
| K4 | PIN keypad (two digits) (`pin-two-digits`) | B r · 52w · 7b | B r · 48w · 6b | B r · 42w · 6b | B r · 58w · 7b | B r · 54w · 6b | B r · 47w · 6b | keypad screen mixes key, Clear, delete, Continue and Español pill styles; up to 7 button styles |
| K5 | Private-screen warning (idle) (`privacy-warning`) | B r · 70w · 4b | B r · 66w · 4b | B r · 60w · 4b | B r · 78w · 4b | B r · 74w · 4b | B r · 67w · 4b | the dark 'Clears in 6 s · Keep my place' bar sits over the bottom of the card on a phone; up to 13 text sizes |
| K5 | Choose action: clocked in (`ready-clocked-in`) | B r · 56w · 5b | B r · 52w · 5b | B r · 46w · 5b | B r · 66w · 5b | B r · 62w · 5b | B r · 55w · 5b | four kinds of action on one card: teal action rows, an outlined Done, and two teal text links (Refresh, Something didn't save?); up to 14 text sizes |
| K5 | Choose action: clocked in (first) (`ready-clocked-in-no-break-types`) | B r · 68w · 4b | B r · 64w · 4b | B r · 58w · 4b | B r · 77w · 4b | B r · 73w · 4b | B r · 66w · 4b | four kinds of action on one card: teal action rows, an outlined Done, and two teal text links (Refresh, Something didn't save?); up to 14 text sizes |
| K5 | Choose action: off clock (`ready-off-clock`) | B r · 52w · 4b | B r · 48w · 4b | B r · 42w · 4b | B r · 60w · 4b | B r · 56w · 4b | B r · 49w · 4b | four kinds of action on one card: teal action rows, an outlined Done, and two teal text links (Refresh, Something didn't save?); up to 14 text sizes |
| K5 | Choose action (Spanish) (`ready-off-clock-espanol`) | B r · 60w · 4b | B r · 56w · 4b | B r · 49w · 4b | · | · | · | four kinds of action on one card: teal action rows, an outlined Done, and two teal text links (Refresh, Something didn't save?); up to 14 text sizes |
| K5 | Choose action: on break (`ready-on-break`) | B r · 61w · 5b | B r · 57w · 5b | B r · 51w · 5b | B r · 71w · 5b | B r · 67w · 5b | B r · 60w · 5b | four kinds of action on one card: teal action rows, an outlined Done, and two teal text links (Refresh, Something didn't save?); up to 14 text sizes |
| K6 | Choose a break (`choose-break`) | B r · 62w · 4b | B r · 58w · 3b | B r · 52w · 3b | B r · 66w · 4b | B r · 62w · 3b | B r · 55w · 3b |  |
| K7 | Confirm clock out (`confirm-clock-out`) | B r · 61w · 3b | B r · 57w · 3b | B r · 51w · 3b | B r · 67w · 3b | B r · 63w · 3b | B r · 56w · 3b |  |
| K7 | Confirm clock out (on break) (`confirm-clock-out-on-break`) | B r · 69w · 3b | B r · 65w · 3b | B r · 59w · 3b | B r · 75w · 3b | B r · 71w · 3b | B r · 64w · 3b |  |
| K10 | Sending (`sending`) | B r · 39w · 1b | · | · | B r · 46w · 1b | · | · |  |
| K11 | Recorded: break end (`receipt-break-end`) | B r · 59w · 2b | B r · 55w · 2b | B r · 49w · 2b | B r · 73w · 2b | B r · 69w · 2b | B r · 62w · 2b | up to 13 text sizes |
| K11 | Recorded: break start (`receipt-break-start`) | B r · 58w · 2b | B r · 54w · 2b | B r · 48w · 2b | B r · 67w · 2b | B r · 63w · 2b | B r · 56w · 2b | up to 13 text sizes |
| K11 | Recorded: clock in (`receipt-clock-in`) | B r · 51w · 2b | B r · 47w · 2b | B r · 41w · 2b | B r · 58w · 2b | B r · 54w · 2b | B r · 47w · 2b |  |
| K12 | Not confirmed: check last action (`check-last-action`) | B r · 65w · 3b | B r · 61w · 3b | B r · 55w · 3b | B r · 74w · 3b | B r · 70w · 3b | B r · 63w · 3b |  |
| K12 | Saved action help (`saved-action-help`) | B r · 52w · 3b | B r · 48w · 3b | B r · 42w · 3b | · | · | · |  |
| K13 | Punch started at another location (`ready-other-location`) | B r · 63w · 3b | B r · 59w · 3b | B r · 53w · 3b | B r · 71w · 3b | B r · 67w · 3b | B r · 60w · 3b | up to 13 text sizes |
| K14 | Clock state unavailable (`clock-state-unavailable`) | B r · 51w · 3b | B r · 47w · 3b | B r · 41w · 3b | B r · 62w · 3b | B r · 58w · 3b | B r · 51w · 3b |  |
| K14 | Invalid tablet key (`invalid-key`) | B r · 40w · 2b | B r · 40w · 2b | B r · 40w · 2b | B r · 47w · 2b | B r · 47w · 2b | B r · 47w · 2b | uses the public band (no clock), as the other signed-out notices do |
| K14 | PIN could not clear (`pin-clear-failed`) | B r · 60w · 3b | B r · 56w · 3b | B r · 50w · 3b | B r · 76w · 3b | B r · 72w · 3b | B r · 65w · 3b |  |
| K14 | PIN check: offline (`pin-offline`) | B r · 59w · 3b | B r · 55w · 3b | B r · 49w · 3b | B r · 72w · 3b | B r · 68w · 3b | B r · 61w · 3b |  |
| K14 | Reconnect this tablet (`pin-reconnect-tablet`) | B r · 63w · 3b | B r · 59w · 3b | B r · 53w · 3b | B r · 73w · 3b | B r · 69w · 3b | B r · 62w · 3b |  |
| K14 | PIN check unavailable (`pin-unavailable`) | B r · 59w · 3b | B r · 55w · 3b | B r · 49w · 3b | B r · 72w · 3b | B r · 68w · 3b | B r · 61w · 3b |  |
| K14 | Sign-in changed: verify PIN again (`verify-pin-again`) | B r · 48w · 2b | B r · 44w · 2b | B r · 38w · 2b | B r · 57w · 2b | B r · 53w · 2b | B r · 46w · 2b |  |
| K15 | Clocker paused (`/clocker/access/paused`, commerce on; captured at 1440 and 390) | 1440: B r · 60w · 1b | · | 390: B r · 49w · 1b | 1440: B r · 75w · 1b | · | 390: B r · 63w · 1b | 404 in production (commerce off); this is the public band variant, not the kiosk layout |

## L. Phone app Alerts (L1: simulated bridge, user agent `NEVORA-Native/iOS/1`, Employee James)

| State | 390 | 1440 | Problem |
|---|---|---|---|
| ready | B r · 43w · 2b | B r · 43w · 2b |  |
| enabled | B r · 42w · 2b | B r · 42w · 2b |  |
| denied | B r · 32w · 1b | B r · 32w · 1b |  |
| revoked | B r · 48w · 2b | B r · 48w · 2b |  |
| error | B r · 48w · 2b | B r · 48w · 2b |  |
| loading | B r · 26w · 0b | B r · 26w · 0b |  |
| confirm-turn-off | B r · 77w · 3b | B r · 77w · 3b |  |
| confirm-use-for-account | B r · 84w · 2b | B r · 84w · 2b |  |
| paused | B r · 32w · 1b | B r · 32w · 1b |  |

## The 20 worst pages and screens

Score: family (Older 3, Mixed 2) + error 4 + 0.7 per button style over 3 + 0.4 per text size over 6 + horizontal overflow 2 + over 400 words on a phone 1 + a reviewer severity (0 to 4) read from the screenshots. The worse width counts. Pages that only send the profile to Restricted are not ranked.

| Rank | # | Page | Profile | Score | Why |
|---|---|---|---|---|---|
| 1 | I5 | Passkeys | L | 7.0 | Passkeys (flag on) renders only the band: no card, no action, no explanation |
| 2 | C11 | Availability agreement | L | 5.5 | Availability agreement failed to load for the Lead at both widths (the Employee's loaded) |
| 3 | C1 | Schedule | Mℓ (with and without Publish) | 5.4 | Scoped schedule: older kit, ~390 words of stacked day cards, a separate 'Show schedule' button and a grey bar that looks like a heading |
| 4 | B1 | Home | Mℓ (with and without Publish) | 4.9 | Location Manager Home stays in the older scoped kit (no band, white phone header) while every page it links to is Direction B |
| 5 | F1 | Team | Mℓ (with and without Publish) | 4.5 | Scoped team directory stays in the older kit with no band |
| 6 | I6 | Delete my account | Mℓ (with and without Publish) | 4.3 | Delete my account opens for a location Manager (inventory –) and is the older Quiet page under the band |
| 7 | C2 | Add shift | Mℓ (with and without Publish) | 4.0 | Add shift for a location Manager: older picker card, and on phones the shell header disappears |
| 8 | C4 | Edit shift | Mℓ (with and without Publish) | 4.0 | Read-only shift details in the older kit with no phone header |
| 9 | C13 | Open shifts | E | 4.0 | Posted open shifts: the empty line has no card and on desktop is white text on the light canvas, so the page looks blank |
| 10 | C13 | Open shifts | L | 4.0 | Posted open shifts: the empty line has no card and on desktop is white text on the light canvas, so the page looks blank |
| 11 | I1 | Profile | Mℓ (with and without Publish) | 3.8 | Manager Profile: older Quiet rows under a B band |
| 12 | B4 | Things to do | Mℓ (with and without Publish) | 3.0 | Things to do says 'You don't have access' twice (card plus floating notice) and the desktop layout splits awkwardly |
| 13 | K5 | Choose an action | kiosk | 2.2 | four kinds of action on one card: teal action rows, an outlined Done, and two teal text links (Refresh, Something didn't save?); the dark 'Clears in 6 s · Keep my place' bar sits over the bottom of the card on a phone; up to 14 text sizes |
| 14 | B1 | Home | E | 2.0 | up to 11 text sizes |
| 15 | B1 | Home | L | 2.0 | up to 11 text sizes |
| 16 | I4 | Device alerts | L | 1.8 | Device alerts states the same check twice (card and warning line below) |
| 17 | K4 | PIN keypad and its states | kiosk | 1.8 | keypad screen mixes key, Clear, delete, Continue and Español pill styles; up to 7 button styles |
| 18 | A10 | Activate business | signed-out | 1.5 | Activate business without its link: the phone band fills the screen with no card |
| 19 | F9 | Help someone sign in | Mℓ (with and without Publish) | 1.5 | Band title reads 'Help someone sign in is' (a cut sentence) over the company-wide card |
| 20 | A4 | Forgot access | signed-out | 1.2 | up to 9 text sizes |


## Not reached, and why

- **C5 Find cover (Mℓ):** the fictional link (Condado, next Monday, 9–5) was refused with "Couldn't open that shift"; it
  needs a link opened from a real shift.
- **H1–H4 Rondo AI:** off in this build ("Page not found" for every profile).
- **I4 Device alerts and I5 Passkeys:** redirect to Profile when their flags are off (Mℓ and E runs); captured with the
  flags on in the Lead run.
- **A3 Welcome, A7 Access help:** 404 in production (Mobile Access off); captured with it on.
- **A8 Owner sign-up, A9 Verify email:** 404 outside the sign-up host; not captured.
- **K15 Clocker paused:** 404 with commerce off; captured with it on.
- **A15–A19 billing pages:** render only "Billing is temporarily unavailable" (no central billing in the harness).
- **A10 Activate business:** only its "Open this page from your signup" state (no sign-up link).
- **C8 Copy receipt, C3 Review replacement (Mℓ):** opened with fictional parameters; both show the company-wide card.
- **Clocker on the production build:** setup refuses plain http, so the kiosk was captured on the development build.

## Gaps

- Desktop and phone only (390 and 1440); no tablet widths for app pages, no 320.
- Reduced motion and hover were not re-checked (app pages ran with reduced motion; the Clocker with normal motion).
- Mℓ+Publish covers seven routes; the Approve time off and Review time exceptions grants were not tried.
- Clocker screens not captured: **K8** photo, **K9** review current status, the clock-out receipt and **K12**'s "Retry
  same action". The capture script's recovery chain stops after the saved-action help (it cannot find "Check if it
  saved" once the help is open), and the photo and review steps need the tablet back at Ready. The browser-storage state
  (K14) reached only the English run. **K13** "someone else's punch in progress" has no capture step; the closest
  screen is a punch started at another location. K10 Sending and PIN checking are captured at 1024×768 only.
- Keyboard: the sign-in focus order was captured (`pub-focus-*.png`) but not summarized here; app pages were not
  tabbed through.
- The rich employee seed reaches James's own data; Maria and Ana have none, so coverage, swaps and team views for a
  Lead are as seeded.

