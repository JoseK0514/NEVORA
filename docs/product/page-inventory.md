# NEVORA page inventory (Nov 22, 2026)

Every page in NEVORA, for every profile and the Clocker, so Jose and Claude can go through them one by one. Built from
the code on `claude-codex-collab-nevora` (all 109 `page.tsx` routes under `src/app`, their role checks and the
components they render). The **Built with** column says which component family the code uses; it is not a verdict on
how the page looks. **On screen** is what the Nov 22 screenshot sweep saw (production build, fictional data, Chromium,
390 and 1440 px); see [Sweep results](#sweep-results-nov-22-2026) below.

[Run the collab QA workspace in Claude Cloud](page-inventory/claude-cloud.md) to get a fresh fictional workspace, role logins and reproducible browser checks from this branch.

## How to read it

- **Profiles:** O = Owner · M = Manager with company-wide access · Mℓ = Manager limited to some locations · L = Lead ·
  E = Employee.
- **Marks:** ✓ opens the page · ✓* opens its own version of the page for that profile · n = shows a "this page is for
  …" notice · → = redirects elsewhere · – = can't open it (sent to Restricted).
- **Built with:** B = Direction B kit (`owner-b`, `employee-b`, `b-kit`) · Corp = the corporate components that the
  Direction B layers restyle · Older = pre-Direction B kits (`kit`, `wave-a/b/c`, `quiet`, `signature`) · Mixed = some
  of each · Own = its own component set.
- **Grants:** some Manager pages also need an Owner-given permission (for example Publish schedules); noted per row.
- **On screen:** per profile, at 390 px (the Clocker at 1024×768): family on screen (B, **Older**, **Mixed**; "B/Older"
  when the two widths differ), visible words in the page body (w) and distinct button styles (b). A state instead of a
  family means the page didn't render for that profile: n = notice, → = redirected, – = Restricted, ✗ = not reached
  in the sweep (module off or no link), ! = error. Signed-out pages show the English capture; Spanish is in the sweep
  files.
- **†** marks a profile mark the sweep corrected (it showed something else on screen). The original mark is listed
  under [Corrected marks](#corrected-marks).
- **Reviewed:** tick when we have gone through the page together.
- **Caveat:** the profile marks come from each page's role checks. A few also depend on an Owner-given permission or a
  module being on (Updates, open shifts, payroll, Rondo), and the Mℓ column for pages built on company-wide reads is a
  best reading of the code. We confirm each on screen as we go and correct the row.

Totals: 19 signed-out pages, 76 signed-in app pages (several with a different version per profile), the Clocker
(2 routes, about 15 screens), the phone app's Alerts screen, and 5 development-only previews.

## Sweep results (Nov 22, 2026)

Two sweeps, 951 captures in all, on the production build with fictional data (the Clocker on the development build,
because the production build refuses tablet setup over plain http):

- [sweep-owner-manager.md](page-inventory/sweep-owner-manager.md): Owner and company-wide Manager, with and without
  Owner-given grants (326 captures).
- [sweep-lead-employee-public-clocker.md](page-inventory/sweep-lead-employee-public-clocker.md): location Manager (with
  and without Publish schedules), Lead, Employee, signed-out pages in English and Spanish, the Clocker at tablet and
  phone sizes, and the phone app's Alerts (625 captures).
- Per-capture data (words, button styles, text sizes, old-kit class counts, problems) is in the matching `.json`;
  thumbnails are in `page-inventory/thumbs/om/` and `thumbs/le/`.

**What it found**

- **Only two pages still look like the old app for everyone:** C3 Find cover: Review replacement and C8 Copy receipt.
- **The location Manager gets the old app.** Their Home, Schedule, Add shift, Shift details and Team are all the older
  scoped views (no band, white phone header), while the cards around them are Direction B. Most other pages give them
  "Company-wide access needed".
- **22 pages are "Mixed":** the Direction B band over a body still built from older kit classes. Most look like B on
  screen; they need the code moved over, and some carry older-looking toggles and rows (Settings, Updates, Time off,
  Shift changes, Profile).
- **Lead, Employee, signed-out pages, the Clocker and the phone app's Alerts are Direction B everywhere.** Their
  problems are text and buttons, not the old look.
- **Every phone sub-page with a back link is 392 px wide on a 390 phone** (98 of 163 Owner and Manager phone captures).
- **34 of the company-wide Manager's 78 pages end on a one-card notice.**

### Worst 20, both sweeps together

Old look first, then broken or empty pages, then the heaviest pages. This sets the order for Phase 2.

| Rank | # | Page | Who | Why |
|---|---|---|---|---|
| 1 | C3 | Find cover: Review replacement | O, M | Old look (no band, grey canvas); two stacked notes and a long approval checkbox; no Save without the grant |
| 2 | C8 | Copy receipt | O, M | Old look; 778 words on the phone, one warning repeated 54 times, over 5,000 px tall |
| 3 | B1, C1, C2, C4, F1 | Location Manager's Home, Schedule, Add shift, Shift details, Team | Mℓ | Old scoped views; Schedule is about 390 words of day cards with a separate "Show schedule" button; Add shift and Shift details lose the phone header |
| 4 | I5 | Passkeys | L, O | With the switch on, only the band shows; the Owner's Profile shows an error instead of hiding the section |
| 5 | C13 | Posted open shifts | L, E | Looks blank: the empty message has no card and is white text on the light canvas on desktop |
| 6 | C11 | Availability agreement | L | "The agreement didn't load" at both widths (the Employee's loads) |
| 7 | B3 | Notifications | O | "Notifications didn't load" in two runs (the Manager's loads); needs a check |
| 8 | C1 | Schedule | O, M | 476 words at 1440, 7 button styles, 11 text sizes; facts repeat per person |
| 9 | H1 | Rondo AI | O | 435 words, 4,200 px tall on the phone, repeated chips per item |
| 10 | B4 | Things to do | O, M, Mℓ | 365 words, 3,250 px on the phone; time ranges repeat; Mℓ gets "You don't have access" twice |
| 11 | B1 | Home | O, L, E | 11–13 text sizes; the Owner's has two filled buttons for the same payroll job |
| 12 | I6 | Delete my account | M, Mℓ | Opens although marked closed; older body, 170 words, 3 button styles |
| 13 | I1 | Profile | M, Mℓ | Older rows; the Manager's repeats "<Owner> can change this" on every field |
| 14 | F9 | Help someone sign in | M, Mℓ | 134 words of instructions; the band title is cut ("Help someone sign in is") |
| 15 | C12 | Shift changes | O, M | Heaviest older-kit body under a B band; 3 button styles |
| 16 | E1 | Time off | O, M | Older list body; a Manager without Approve leave hits a dead end |
| 17 | K5 | Clocker: Choose an action | Tablet | Four action styles on one card; the "Clears in 6 s" bar covers the card on a phone; up to 14 text sizes |
| 18 | D2 | Time corrections | O, M | The same "no access" message twice (card and toast) without the grant; "Clock in / Clock out" on every request |
| 19 | J2–J5, J8, J11 | Settings pages | O | Older-kit bodies under the band; controls under 32 px on the phone |
| 20 | B6, B7 | Updates and Update detail | O, M | Older list body; "Withdraw update" is a full-width card under the message |

### Corrected marks

The sweep showed these profiles something other than the inventory said. Mℓ was Daniel, limited to Condado, without
grants except where noted; the company-wide Manager was Elena without grants.

| # | Page | Was → on screen |
|---|---|---|
| B4 | Things to do (manager inbox) | Mℓ: ✓ → n (notice) |
| B6 | Updates (messages) | Mℓ: ✓* → n (notice) |
| B7 | Update detail | Mℓ: ✓ → n (notice) |
| B8 | Compose an update | Mℓ: ✓ → n (notice); L: – → ✓ (opens); E: – → ✓ (opens) |
| C3 | Find cover: Review replacement | Mℓ: – → n (notice) |
| C7 | Templates (copy a week) | Mℓ: ✓ → n (notice) |
| C8 | Copy receipt | Mℓ: ✓ → n (notice) |
| C9 | Scheduling rules | Mℓ: ✓ → n (notice) |
| C10 | Availability | Mℓ: ✓* → n (notice) |
| C11 | Availability agreement | O: ✓ → → (redirects); M: ✓ → → (redirects); Mℓ: ✓ → n (notice) |
| C12 | Shift changes (swaps and call-outs) | Mℓ: ✓* → n (notice) |
| C13 | Open shifts | Mℓ: ✓* → n (notice) |
| C14 | Ask for a swap | Mℓ: – → n (notice) |
| C15 | Can't work (call out) | Mℓ: – → n (notice) |
| D1 | Timecards | Mℓ: ✓* → n (notice); L: ✓* → → (redirects); E: ✓* → → (redirects) |
| D3 | Fix someone's time (delegated correction) | Mℓ: ✓ → n (notice) |
| E1 | Time off | Mℓ: ✓* → n (notice) |
| F2 | Add person | Mℓ: – → n (notice) |
| F3 | Import a staff list | O: ✓ → n (notice) |
| F4 | Person (profile, role, access) | Mℓ: ✓ → n (notice) |
| F6 | When they can be scheduled (restrictions) | Mℓ: ✓ → n (notice) |
| F9 | Help someone sign in | Mℓ: – → n (notice) |
| G1 | Payroll | M: ✓ → n (notice); Mℓ: ✓ → n (notice); L: – → n (notice); E: – → n (notice) |
| G2 | Prepare payroll | M: ✓ → n (notice); Mℓ: ✓ → n (notice) |
| G3 | Review pay | M: ✓ → n (notice); Mℓ: ✓ → n (notice) |
| G4 | People in this payroll | M: ✓ → n (notice); Mℓ: ✓ → n (notice) |
| G5 | Fix payroll | M: ✓ → n (notice); Mℓ: ✓ → n (notice) |
| G6 | Import payroll | M: ✓ → n (notice); Mℓ: ✓ → n (notice) |
| G7 | Payroll history | M: ✓ → n (notice); Mℓ: ✓ → n (notice) |
| G8 | Time exports | Mℓ: ✓ → n (notice) |
| G9 | Paid time export | Mℓ: ✓ → n (notice) |
| G10 | My pay (statements) | Mℓ: – → ✓ (opens) |
| H5 | Insights | Mℓ: ✓ → n (notice) |
| H6 | Christmas bonus | Mℓ: ✓ → n (notice) |
| I2 | Policy document | O: ✓ → → (redirects); M: ✓ → → (redirects); Mℓ: ✓ → → (redirects) |
| I6 | Delete my account | M: – → ✓ (opens); Mℓ: – → ✓ (opens) |

Not corrected: rows where the outcome depends on a grant or a module the sweep didn't turn on (C5, C6, C13, D2, E1
without grants; H1–H4 with Rondo AI off; I4 Device alerts and I5 Passkeys, which redirect to Profile or show a notice when their switches are off; C11 failing for the Lead), and B10/B11,
which are the notice and not-found pages themselves.

## A. Signed out and public

| # | Page | Route | Built with | Notes | On screen | Reviewed |
|---|---|---|---|---|---|---|
| A1 | Start (redirect) | `/` | — | Sends to Home if signed in, otherwise Sign in | → | ✓ (Jose, Nov 23) |
| A2 | Sign in | `/login` | B + Quiet auth shell | Employee ID, password, passkey; English and Spanish | B 50w 3b | ✓ (Jose, Nov 23) |
| A3 | Welcome (phone app first run) | `/welcome` | Quiet auth shell | Mobile Access | B 37w 2b | ✓ (Jose, Nov 23) |
| A4 | Forgot access | `/forgot-access` | Quiet auth shell |  | B 81w 3b | ✓ (Jose, Nov 23) |
| A5 | Reset access | `/reset-access` | Quiet auth shell | Set a new password | B 60w 3b | ✓ (Jose, Nov 23) |
| A6 | Activate account (invited person) | `/activate` | Quiet auth shell |  | B 48w 1b | ✓ (Jose, Nov 23) |
| A7 | Access help | `/access-help/[topic]` | Own (help view) | One page per topic | B 81w 1b | ✓ (Jose, Nov 23) |
| A8 | Owner sign-up | `/onboarding` | Quiet auth shell | New business | B 55w 2b (dev build) | ✓ (Jose, Nov 23) |
| A9 | Verify email (sign-up) | `/onboarding/verify` | Quiet auth shell |  | B 110w 2b (dev build) | ✓ (Jose, Nov 23) |
| A10 | Activate business (Owner) | `/onboarding/activate` | Quiet auth shell |  | B 58w 3b | ✓ (Jose, Nov 23) |
| A11 | Privacy policy | `/privacy` | Policy page | English and Spanish | B 105w 2b | ✓ (Jose, Nov 23) |
| A12 | Terms | `/terms` | Policy page |  | B 85w 2b | ✓ (Jose, Nov 23) |
| A13 | Support | `/support` | Policy page + B |  | B 92w 1b | ✓ (Jose, Nov 23) |
| A14 | Account deletion (public info) | `/account-deletion` | Policy page |  | B 109w 3b | ✓ (Jose, Nov 23) |
| A15 | Plans | `/pages/plans` | Central billing page |  | B 113w 4b (dev build) | ☐ |
| A16 | Billing | `/pages/nevora-billing` | Central billing page |  | B 113w 4b (dev build) | ☐ |
| A17 | Billing return | `/pages/nevora-billing-return` | Central billing page | After checkout | B 115w 4b (dev build) | ☐ |
| A18 | Facturación (Spanish billing) | `/pages/es-facturacion` | Central billing page |  | n | ☐ |
| A19 | Pago (Spanish payment) | `/pages/es-pago` | Central billing page |  | n | ☐ |

## B. Home, navigation and messages

| # | Page | Route | O | M | Mℓ | L | E | Built with | Notes | On screen | Reviewed |
|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | Home | `/app` | ✓* | ✓* | ✓* | ✓* | ✓* | B (Owner, Manager, Lead, Employee); Older (Mℓ: scoped Home) | Five versions: Owner, Manager, location Manager (`ScopedManagementHome`), Lead, Employee; first-run onboarding guide | O B 169w 4b · M B 160w 3b · Mℓ **Older** 71w 3b · L B 221w 3b · E B 188w 3b | E L Mℓ M O ✓ (Jose, Nov 23) |
| B2 | More (phone menu) | `/app/more` | ✓* | ✓* | ✓* | ✓* | ✓* | Corp + B | Manager/Owner list vs Employee list | O B 23w 1b · M B 24w 1b · Mℓ B 14w 1b · L B 64w 1b · E B 64w 1b | E L Mℓ M O ✓ (Jose, Nov 23) |
| B3 | Notifications | `/app/notifications` | ✓ | ✓ | ✓ | ✓ | ✓ | Quiet + B | Owner also sees the billing notice | O B 9w 3b · M **Mixed** 40w 2b · Mℓ B 17w 0b · L B 93w 4b · E B 92w 3b | ✓ (Jose, Nov 23) |
| B4 | Things to do (manager inbox) | `/app/inbox` | ✓ | ✓ | ✓* | → | → | Corp | Lead and Employee go to Requests hub | O B 365w 4b · M B 317w 4b · Mℓ n · L → · E → | Mℓ M O ✓ (Jose, Nov 23) |
| B5 | Requests hub (employee) | `/app/requests/hub` | n | n | n | ✓ | ✓ | B | Managers see "This Requests page is for employees" | O n · M n · Mℓ n · L B 106w 2b · E B 106w 2b | ✓ (Jose, Nov 23) |
| B6 | Updates (messages) | `/app/updates` | ✓* | ✓* | n† | ✓* | ✓* | Mixed | When the Updates module is on | O **Mixed** 47w 3b · M **Mixed** 47w 3b · Mℓ n · L B 52w 3b · E B 52w 3b | E L M O ✓ (Jose, Nov 23) |
| B7 | Update detail | `/app/updates/[id]` | ✓ | ✓ | n† | ✓ | ✓ | Mixed |  | O **Mixed** 41w 2b · M **Mixed** 41w 2b · Mℓ n · L B 66w 1b · E B 66w 1b | ✓ (Jose, Nov 23) |
| B8 | Compose an update | `/app/updates/compose` | ✓ | ✓ | n† | ✓† | ✓† | Mixed | Send update | O **Mixed** 20w 1b · M **Mixed** 20w 1b · Mℓ n · L B 63w 1b · E B 63w 1b | ✓ (Jose, Nov 23) |
| B9 | Help | `/app/help` | ✓* | ✓* | ✓* | ✓* | ✓* | Corp + B | Employee help vs manager help | O B 101w 0b · M B 94w 0b · Mℓ B 82w 0b · L B 95w 0b · E B 95w 0b | E L Mℓ M O ✓ (Jose, Nov 23) |
| B10 | Restricted ("That page is for Owners") | `/app/restricted` | — | ✓ | ✓ | ✓ | ✓ | Notice | Where a role is sent when it can't open a page | O n · M n · Mℓ n · L n · E n | ✓ (Jose, Nov 23) |
| B11 | Page not found | `/app/[...missing]` | ✓ | ✓ | ✓ | ✓ | ✓ | Notice | Signed-in 404 | O ✗ · M ✗ · Mℓ n · L n · E n | ✓ (Jose, Nov 23) |

## C. Schedule, availability and shift changes

| # | Page | Route | O | M | Mℓ | L | E | Built with | Notes | On screen | Reviewed |
|---|---|---|---|---|---|---|---|---|---|---|---|
| C1 | Schedule | `/app/schedule` | ✓* | ✓* | ✓* | ✓* | ✓* | B (O, M, L, E); Older (Mℓ: scoped schedule) | Week, day and open-shift views; Employee/Lead confirm the week; planning panel with Publish | O **B/Mixed** 140w 6b · M **B/Mixed** 140w 6b · Mℓ **Older** 392w 2b · L B 79w 3b · E B 78w 3b | E L Mℓ M O ✓ (Jose, Nov 23) |
| C2 | Add shift | `/app/schedule/new` | ✓ | ✓ | ✓* | – | – | Mixed; Older (Mℓ form) | Company form vs location Manager form | O B 20w 1b · M B 20w 1b · Mℓ **Older** 13w 1b · L – · E – | Mℓ ✓ (Jose, Nov 23); M O ✓ (Jose, Nov 23) |
| C3 | **Find cover: Review replacement** | `/app/schedule/new?review=` | ✓ | ✓ | ✓ | – | – | Older (`kit`, `wave-a`) | Jose, Nov 22: "one of the worst UI"; shows "Publishing permission needed" without the grant | O **Older** 105w 2b · M **Older** 101w 1b · Mℓ n | ✓ (Jose, Nov 23) |
| C4 | Edit shift / shift details | `/app/schedule/edit` | ✓ | ✓ | ✓* | – | – | Mixed; Older (Mℓ read-only) | Delete shift confirm | O B 42w 2b · M B 42w 2b · Mℓ **Older** 28w 1b | Mℓ ✓ (Jose, Nov 23); M O ✓ (Jose, Nov 23) |
| C5 | Find cover (who can cover) | `/app/schedule/coverage` | ✓ | ✓ | n† | – | – | Own (coverage assistant) |  | O B 67w 2b · M B 67w 2b · Mℓ n (company-wide only, by design) | ✓ (Jose, Nov 23) |
| C6 | Build and publish | `/app/schedule/publish` | ✓ | ✓ (grant) | ✓ (grant) | – | – | Corp + B | Manager needs Publish schedules; one Publish form per draft location | O B 27w 0b · M n · Mℓ n | ✓ (Jose, Nov 23) |
| C7 | Templates (copy a week) | `/app/schedule/templates` | ✓ | ✓ | n† | – | – | Quiet + Wave |  | O **Mixed** 27w 1b · M **Mixed** 27w 1b · Mℓ n | ✓ (Jose, Nov 23) |
| C8 | Copy receipt | `/app/schedule/copy-receipt` | ✓ | ✓ | n† | – | – | Older (`kit`, `wave-a`) | After copying a week | O **Older** 778w 1b · M **Older** 54w 1b · Mℓ n | ✓ (Jose, Nov 23) |
| C9 | Scheduling rules | `/app/schedule/settings` | ✓ | ✓ | n† | – | – | Quiet + Wave | Coverage, staffing, positions, shift-change policy | O **Mixed** 70w 0b · M **Mixed** 70w 0b · Mℓ n | ✓ (Jose, Nov 23) |
| C10 | Availability | `/app/availability` | ✓* | ✓* | n† | ✓* | ✓* | Mixed (B for Employee/Lead; Corp for managers) | Employee sets own; managers see the team's | O **Mixed** 31w 2b · M **Mixed** 31w 2b · Mℓ n · L B 54w 2b · E B 54w 2b | E L M ✓ (Jose, Nov 23) |
| C11 | Availability agreement | `/app/availability/agreement` | →† | →† | n† | ✓ | ✓ | Own (restrictions screen) |  | O → · M → · Mℓ n · L ! · E B 32w 1b | ✓ (Jose, Nov 23) |
| C12 | Shift changes (swaps and call-outs) | `/app/exchange` | ✓* | ✓* | n† | ✓* | ✓* | Mixed (Quiet for managers) | Employee requests vs manager review | O **Mixed** 85w 3b · M **Mixed** 85w 3b · Mℓ n · L B 82w 2b · E B 82w 2b | E L M O ✓ (Jose, Nov 23) |
| C13 | Open shifts | `/app/exchange/open-shifts` | ✓* | ✓ (grant) | n† | ✓* | ✓* | Corp (managers) / Quiet (employees) | When the marketplace module is on | O B 22w 1b · M n · Mℓ n · L B 15w 0b · E B 15w 0b | E L M O ✓ (Jose, Nov 23) |
| C14 | Ask for a swap | `/app/exchange/swap` | – | – | n† | ✓ | ✓ | B (employee creation) | Also opens as a sheet over Schedule (`@sheet`) | Mℓ n · L B 62w 2b · E B 62w 2b | ✓ (Jose, Nov 23) |
| C15 | Can't work (call out) | `/app/exchange/callout` | – | – | n† | ✓ | ✓ | B (employee creation) | Also opens as a sheet over Schedule (`@sheet`) | Mℓ n · L B 45w 1b · E B 45w 1b | ✓ (Jose, Nov 23) |

## D. Time and timecards

| # | Page | Route | O | M | Mℓ | L | E | Built with | Notes | On screen | Reviewed |
|---|---|---|---|---|---|---|---|---|---|---|---|
| D1 | Timecards | `/app/timecards` | ✓* | ✓* | n† | →† | →† | Mixed (manager table; B for Employee/Lead hours) | Approve and finalize; bulk bar; inspector | O B 134w 2b · M B 133w 2b · Mℓ n · L → · E → | M O ✓ (Jose, Nov 23) |
| D2 | Time corrections (review) | `/app/timecards/corrections` | ✓ | ✓ (grant) | ✓ (grant) | – | – | Corp | Managers need Review time exceptions for each location on the request | O B 176w 2b · M n · Mℓ n · L – · E – | ✓ (Jose, Nov 23) |
| D3 | Fix someone's time (delegated correction) | `/app/timecards/corrections/new/[employeeId]` | ✓ | ✓ | n† | – | – | Corp |  | O B 49w 1b · M B 49w 1b · Mℓ n | ✓ (Jose, Nov 23) |
| D4 | My time | `/app/my-time` | n | n | n | ✓ | ✓ | B | Managers see "My time is for employees" | O n · M n · Mℓ n · L B 149w 1b · E B 149w 1b | ✓ (Jose, Nov 23) |
| D5 | Clocker recovery review | `/app/clocker-recovery` | ✓ | – | – | – | – | Own | Punches that need review | O B 75w 2b · M – · Mℓ – | ✓ (Jose, Nov 23) |

## E. Time off and requests

| # | Page | Route | O | M | Mℓ | L | E | Built with | Notes | On screen | Reviewed |
|---|---|---|---|---|---|---|---|---|---|---|---|
| E1 | Time off | `/app/requests` | ✓* | ✓ (grant) | n† | ✓* | ✓* | Mixed (Corp for managers; B for Employee/Lead) | Request, withdraw, approve, decline | O **Mixed** 71w 3b · M n · Mℓ n; with Approve time off B 20w 0b · L B 36w 2b · E B 36w 2b | E L M O ✓ (Jose, Nov 23) |

## F. Team

| # | Page | Route | O | M | Mℓ | L | E | Built with | Notes | On screen | Reviewed |
|---|---|---|---|---|---|---|---|---|---|---|---|
| F1 | Team | `/app/employees` | ✓ | ✓ | ✓* | – | – | B (company); Older (Mℓ: scoped directory) | Filters, live status | O B 123w 4b · M B 124w 4b · Mℓ **Older** 131w 0b · L – · E – | Mℓ M O ✓ (Jose, Nov 23) |
| F2 | Add person | `/app/employees/new` | ✓ | ✓ | n† | – | – | Corp | Invite | O B 73w 1b · M B 73w 1b · Mℓ n | ✓ (Jose, Nov 23) |
| F3 | Import a staff list | `/app/employees/import` | n† | n | n | – | – | Corp |  | O n · M n · Mℓ n | ☐ |
| F4 | Person (profile, role, access) | `/app/employees/[employeeId]` | ✓ | ✓ | n† | – | – | Mixed | Invitation, operational scope, action grants | O B 54w 2b · M B 46w 2b · Mℓ n | ✓ (Jose, Nov 23) |
| F5 | Person's pay rate | `/app/employees/[employeeId]/pay` | ✓ | – | – | – | – | Own (wages screen) |  | O B 62w 1b · M – · Mℓ – | ✓ (Jose, Nov 23) |
| F6 | When they can be scheduled (restrictions) | `/app/employees/[employeeId]/restrictions` | ✓ | ✓ | n† | – | – | Own (restrictions screen) |  | O B 65w 2b · M B 65w 2b · Mℓ n | ✓ (Jose, Nov 23) |
| F7 | Time off balance | `/app/employees/[employeeId]/time-off` | ✓ | – | – | – | – | Own (account screen) |  | O B 40w 0b · M – · Mℓ – | ✓ (Jose, Nov 23) |
| F8 | Clocker PIN | `/app/employees/[employeeId]/clocker-pin` | ✓ | – | – | – | – | Own |  | O B 42w 1b · M – · Mℓ – | ✓ (Jose, Nov 23) |
| F9 | Help someone sign in | `/app/account-recovery` | ✓ | ✓ | n† | – | – | Own | Reset a password or Clocker PIN | O **Mixed** 125w 1b · M **Mixed** 112w 1b · Mℓ n | M O ✓ (Jose, Nov 23) |

## G. Payroll and exports

| # | Page | Route | O | M | Mℓ | L | E | Built with | Notes | On screen | Reviewed |
|---|---|---|---|---|---|---|---|---|---|---|---|
| G1 | Payroll | `/app/payroll` | ✓ | n† | n† | n† | n† | Own (payroll runs) | When payroll is on; settings edits are Owner-only | O B 140w 2b · M n · Mℓ n · L n · E n | ☐ |
| G2 | Prepare payroll | `/app/payroll/prepare` | ✓ | n† | n† | – | – | Own |  | O B 80w 3b · M n · Mℓ n | ☐ |
| G3 | Review pay | `/app/payroll/review` | ✓ | n† | n† | – | – | Own |  | O B 54w 2b · M n · Mℓ n | ☐ |
| G4 | People in this payroll | `/app/payroll/people` | ✓ | n† | n† | – | – | Own |  | O B 81w 0b · M n · Mℓ n | ☐ |
| G5 | Fix payroll | `/app/payroll/fix` | ✓ | n† | n† | – | – | Own |  | O B 9w 0b · M n · Mℓ n | ☐ |
| G6 | Import payroll | `/app/payroll/import` | ✓ | n† | n† | – | – | Own |  | O B 21w 1b · M n · Mℓ n | ☐ |
| G7 | Payroll history | `/app/payroll/history` | ✓ | n† | n† | – | – | Own |  | O B 80w 1b · M n · Mℓ n | ☐ |
| G8 | Time exports | `/app/payroll-export` | ✓ | ✓ | n† | n | n | Own | Recent exports card (A3-03) | O B 82w 1b · M B 74w 1b · Mℓ n · L n · E n | ☐ |
| G9 | Paid time export | `/app/payroll-export/paid-time` | ✓ | ✓ | n† | n | n | Corp |  | O B 31w 1b · M B 31w 1b · Mℓ n · L n · E n | ☐ |
| G10 | My pay (statements) | `/app/my-pay` | – | – | ✓† | ✓ | ✓ | Own |  | Mℓ B 24w 0b · L B 72w 2b · E B 72w 2b | ☐ |

## H. Rondo AI and insights

| # | Page | Route | O | M | Mℓ | L | E | Built with | Notes | On screen | Reviewed |
|---|---|---|---|---|---|---|---|---|---|---|---|
| H1 | Rondo AI | `/app/ai-manager` | ✓* | ✓* | ✓* | nf† | nf† | Own (owner advisor / manager Rondo) | When the AI manager is on; day plans, coverage, attendance | O B 426w 5b · M B 113w 2b · Mℓ B 116w 2b · L nf · E nf (Rondo module on) | Mℓ M O ✓ (Jose, Nov 23) |
| H2 | Weekly plan ("Where are we short this week?") | `/app/ai-manager/weekly` | ✓ | nf† | nf† | nf† | nf† | Corp + B |  | O B 38w 2b · M nf · Mℓ nf · L nf · E nf (Rondo module on) | ☐ |
| H3 | Business records | `/app/ai-manager/business` | ✓ | nf† | nf† | nf† | nf† | Own |  | O B 20w 1b · M nf · Mℓ nf · L nf · E nf (Rondo module on) | ☐ |
| H4 | Company knowledge | `/app/ai-manager/knowledge` | ✓ | nf† | nf† | nf† | nf† | Own |  | O B 22w 0b · M nf · Mℓ nf · L nf · E nf (Rondo module on) | ☐ |
| H5 | Insights | `/app/reports` | ✓ | ✓ | n† | n | n | Own |  | O B 97w 2b · M B 97w 2b · Mℓ n · L n · E n | ☐ |
| H6 | Christmas bonus | `/app/reports/christmas-bonus` | ✓ | ✓ | n† | n | n | Own |  | O B 55w 1b · M B 55w 1b · Mℓ n · L n · E n | ☐ |

## I. Profile and account

| # | Page | Route | O | M | Mℓ | L | E | Built with | Notes | On screen | Reviewed |
|---|---|---|---|---|---|---|---|---|---|---|---|
| I1 | Profile | `/app/profile` | ✓* | ✓* | ✓* | ✓* | ✓* | B (Employee/Lead); Own (manager profile) |  | O **Mixed** 25w 1b · M **Mixed** 108w 0b · Mℓ **Mixed** 105w 1b · L B 61w 2b · E B 60w 2b | E L Mℓ M O ✓ (Jose, Nov 23) |
| I2 | Policy document | `/app/profile/[document]` | →† | →† | →† | ✓ | ✓ | B | Privacy, terms inside the app | O → · M → · Mℓ → · L B 119w 0b · E B 119w 0b | ✓ (Jose, Nov 23) |
| I3 | Calendar subscription | `/app/profile/calendar` | n | n | n | ✓ | ✓ | Own |  | O n · M n · Mℓ n · L B 76w 2b · E B 76w 2b | ✓ (Jose, Nov 23) |
| I4 | Device alerts | `/app/profile/device-alerts` | ✓ | ✓ | ✓ | ✓ | ✓ | Own | Browser push | O → · M → · Mℓ ✗ · L B 76w 1b (dev build) (switch on) · E B 76w 1b (dev build) (switch on) | ✓ (Jose, Nov 23) |
| I5 | Passkeys | `/app/profile/passkeys` | ✓ | ✓ | ✓ | ✓ | ✓ | B |  | O → · M → · Mℓ ✗ · L B 52w 1b (dev build) (switch on) · E B 52w 1b (dev build) (switch on) | ✓ (Jose, Nov 23) |
| I6 | Delete my account | `/app/account/delete` | ✓ | ✓† | ✓† | ✓ | ✓ | Quiet |  | O **Mixed** 170w 3b · M **Mixed** 154w 3b · Mℓ **Mixed** 154w 3b · L B 135w 2b · E B 135w 2b | ✓ (Jose, Nov 23) |

## J. Settings and billing (Owner)

| # | Page | Route | Built with | Notes | On screen | Reviewed |
|---|---|---|---|---|---|---|
| J1 | Settings | `/app/settings` | Corp | The settings list | O B 44w 0b · M n | ✓ (Jose, Nov 23) |
| J2 | Workspace | `/app/settings/workspace` | Older (`wave-c`) | Business name, time zone | O **Mixed** 22w 0b · M n | ✓ (Jose, Nov 23) |
| J3 | Branding | `/app/settings/branding` | Older (`wave-c`) |  | O **Mixed** 28w 1b · M n | ✓ (Jose, Nov 23) |
| J4 | Features (modules) | `/app/settings/features` | Older (`wave-c`) |  | O **Mixed** 71w 0b · M n | ✓ (Jose, Nov 23) |
| J5 | Locations | `/app/settings/locations` | Older (`wave-c`) + B |  | O **Mixed** 26w 0b · M n | ✓ (Jose, Nov 23) |
| J6 | Add location | `/app/settings/locations/new` | Older (`wave-c`) |  | O **Mixed** 16w 1b · M n | ✓ (Jose, Nov 23) |
| J7 | Edit location | `/app/settings/locations/[locationId]` | Older (`wave-c`) |  | O **Mixed** 20w 2b · M n | ✓ (Jose, Nov 23) |
| J8 | Positions | `/app/settings/positions` | Own (position catalog) |  | O **Mixed** 30w 1b · M n | ✓ (Jose, Nov 23) |
| J9 | Breaks | `/app/settings/breaks` | Older (`wave-c`) | Break types | O **Mixed** 20w 2b · M n | ✓ (Jose, Nov 23) |
| J10 | Time off policies | `/app/settings/time-off` | Own (policies screen) | QA A1-05: three button styles in its empty state | O B 52w 3b · M n | ✓ (Jose, Nov 23) |
| J11 | Company policies | `/app/settings/company-policies` | Older (`wave-c`) |  | O **Mixed** 48w 0b · M n | ✓ (Jose, Nov 23) |
| J12 | Payroll settings | `/app/settings/payroll` | Own | When payroll is on | O B 52w 0b · M n | ☐ |
| J13 | Clocker devices | `/app/settings/clocker` | Own (device manager) | Add a tablet, setup ticket | O B 36w 3b · M n | ✓ (Jose, Nov 23) |
| J14 | Clocker schedule matching | `/app/settings/clocker/matching` | Older (`wave-c`) + Corp | Grace minutes | O B 49w 0b · M n | ✓ (Jose, Nov 23) |
| J15 | Clocker photos | `/app/settings/clocker/photos` | Older (`wave-c`) | Photo and notice settings | O B 105w 0b · M n | ✓ (Jose, Nov 23) |
| J16 | Clocker photo review | `/app/settings/clocker/photos/review` | Older (`wave-c`) + Corp |  | O B 47w 1b · M n | ✓ (Jose, Nov 23) |
| J17 | Clocker PINs | `/app/settings/clocker/pins` | Older (`wave-c`) |  | O B 139w 3b · M n | ☐ |
| J18 | Billing (account recovery / plan) | `/app/billing` | Own (recovery frame) | Owner; when billing needs attention | O B 79w 3b (dev build) · M n | ✓ (Jose, Nov 23) |

## K. Clocker (shared tablet)

Two routes: `/clocker/[location]` (the kiosk, one location per tablet) and `/clocker/access/paused`. The kiosk is one
route with these screens (DESIGN.MD "Clocker Direction B"; English and Spanish).

| # | Screen | Built with | Notes | On screen | Reviewed |
|---|---|---|---|---|---|
| K1 | Tablet setup: not connected / enter setup code | Own (Clocker setup) | Redeem the Owner's code | B 119w 3b | ☐ |
| K2 | Tablet connected (ready) | Own |  | B 51w 3b | ☐ |
| K3 | Enter Employee ID | Own |  | B 51w 3b | ☐ |
| K4 | PIN keypad | Own | Masked | B 66w 3b | ☐ |
| K5 | Choose an action (clock in / out, break) | Own |  | B 78w 4b | ☐ |
| K6 | Choose a break (rest or meal) | Own |  | B 66w 4b | ☐ |
| K7 | Confirm clock out | Own |  | B 75w 3b | ☐ |
| K8 | Photo (camera, local preview) | Own | When photos are on | B 74w 2b (dev build) | ☐ |
| K9 | Review the current punch | Own |  | B 82w 4b (dev build) | ☐ |
| K10 | Sending | Own |  | B 46w 1b | ☐ |
| K11 | Recorded (receipt) | Own |  | B 73w 2b · clock-out receipt: B 62w 2b (dev build) | ☐ |
| K12 | Not confirmed / check status (recovery and retry) | Own | Lost reply | B 65w 3b (dev build) | ☐ |
| K13 | Someone else's punch in progress | Own |  | B 60w 2b (dev build) | ✓ (Jose, Nov 23) |
| K14 | Sign-in / access changed; unavailable; storage problem | Own | Error states | B 58w 2b (dev build) | ☐ |
| K15 | Clocker paused | Own | `/clocker/access/paused` | B 49w 1b | ✓ (Jose, Nov 23) |

## L. Phone app (native)

| # | Screen | Where | Notes | On screen | Reviewed |
|---|---|---|---|---|---|
| L1 | Alerts (device notifications on/off) | `native/capability-ui` | States: off, asking, on, blocked; the rest of the phone app shows the web pages above | E B 84w 2b | ☐ |

## M. Development only (not shipped)

| # | Page | Route | Notes |
|---|---|---|---|
| M1 | Dev inspect | `/dev-inspect` | Development only |
| M2 | App dev inspect | `/app/dev-inspect` | Development only |
| M3 | Home preview (fictional) | `/ui-preview/home` | Development, or with `NEVORA_UI_PREVIEW_ENABLED=1` |
| M4 | Kit preview | `/ui-preview/kit` | Development only |
| M5 | Signature preview | `/ui-preview/signature` | Development only |

## Not separate pages, but reviewed with their page

Sheets and panels that open over a page: shift details and shift sheet (Schedule), the Timecards inspector, Find cover's
results, the publish review, discard-changes dialogs, the search (⌘K), the notification bell, the account menu, and
every page's loading, empty, error, offline and "not allowed" states. Each is checked when we review its page.

