# NEVORA page inventory (Nov 22, 2026)

Every page in NEVORA, for every profile and the Clocker, so Jose and Claude can go through them one by one. Built from
the code on `claude-codex-collab-nevora` (all 109 `page.tsx` routes under `src/app`, their role checks and the
components they render). The **Built with** column says which component family the code uses; it is not a verdict on
how the page looks. The design pass "Retire the pre-Direction B screens" (QA 1121 plan, Phase 2 pass 0) checks each
page on screen at 390 and 1440 and fills in **On screen**.

## How to read it

- **Profiles:** O = Owner · M = Manager with company-wide access · Mℓ = Manager limited to some locations · L = Lead ·
  E = Employee.
- **Marks:** ✓ opens the page · ✓* opens its own version of the page for that profile · n = shows a "this page is for
  …" notice · → = redirects elsewhere · – = can't open it (sent to Restricted).
- **Built with:** B = Direction B kit (`owner-b`, `employee-b`, `b-kit`) · Corp = the corporate components that the
  Direction B layers restyle · Older = pre-Direction B kits (`kit`, `wave-a/b/c`, `quiet`, `signature`) · Mixed = some
  of each · Own = its own component set.
- **Grants:** some Manager pages also need an Owner-given permission (for example Publish schedules); noted per row.
- **Reviewed:** tick when we have gone through the page together.
- **Caveat:** the profile marks come from each page's role checks. A few also depend on an Owner-given permission or a
  module being on (Updates, open shifts, payroll, Rondo), and the Mℓ column for pages built on company-wide reads is a
  best reading of the code. We confirm each on screen as we go and correct the row.

Totals: 19 signed-out pages, 76 signed-in app pages (several with a different version per profile), the Clocker
(2 routes, about 15 screens), the phone app's Alerts screen, and 5 development-only previews.

## A. Signed out and public

| # | Page | Route | Built with | Notes | On screen | Reviewed |
|---|---|---|---|---|---|---|
| A1 | Start (redirect) | `/` | — | Sends to Home if signed in, otherwise Sign in | — | ☐ |
| A2 | Sign in | `/login` | B + Quiet auth shell | Employee ID, password, passkey; English and Spanish | | ☐ |
| A3 | Welcome (phone app first run) | `/welcome` | Quiet auth shell | Mobile Access | | ☐ |
| A4 | Forgot access | `/forgot-access` | Quiet auth shell | | | ☐ |
| A5 | Reset access | `/reset-access` | Quiet auth shell | Set a new password | | ☐ |
| A6 | Activate account (invited person) | `/activate` | Quiet auth shell | | | ☐ |
| A7 | Access help | `/access-help/[topic]` | Own (help view) | One page per topic | | ☐ |
| A8 | Owner sign-up | `/onboarding` | Quiet auth shell | New business | | ☐ |
| A9 | Verify email (sign-up) | `/onboarding/verify` | Quiet auth shell | | | ☐ |
| A10 | Activate business (Owner) | `/onboarding/activate` | Quiet auth shell | | | ☐ |
| A11 | Privacy policy | `/privacy` | Policy page | English and Spanish | | ☐ |
| A12 | Terms | `/terms` | Policy page | | | ☐ |
| A13 | Support | `/support` | Policy page + B | | | ☐ |
| A14 | Account deletion (public info) | `/account-deletion` | Policy page | | | ☐ |
| A15 | Plans | `/pages/plans` | Central billing page | | | ☐ |
| A16 | Billing | `/pages/nevora-billing` | Central billing page | | | ☐ |
| A17 | Billing return | `/pages/nevora-billing-return` | Central billing page | After checkout | | ☐ |
| A18 | Facturación (Spanish billing) | `/pages/es-facturacion` | Central billing page | | | ☐ |
| A19 | Pago (Spanish payment) | `/pages/es-pago` | Central billing page | | | ☐ |

## B. Home, navigation and messages

| # | Page | Route | O | M | Mℓ | L | E | Built with | Notes | On screen | Reviewed |
|---|---|---|---|---|---|---|---|---|---|---|---|
| B1 | Home | `/app` | ✓* | ✓* | ✓* | ✓* | ✓* | B (Owner, Manager, Lead, Employee); Older (Mℓ: scoped Home) | Five versions: Owner, Manager, location Manager (`ScopedManagementHome`), Lead, Employee; first-run onboarding guide | | ☐ |
| B2 | More (phone menu) | `/app/more` | ✓* | ✓* | ✓* | ✓* | ✓* | Corp + B | Manager/Owner list vs Employee list | | ☐ |
| B3 | Notifications | `/app/notifications` | ✓ | ✓ | ✓ | ✓ | ✓ | Quiet + B | Owner also sees the billing notice | | ☐ |
| B4 | Things to do (manager inbox) | `/app/inbox` | ✓ | ✓ | ✓ | → | → | Corp | Lead and Employee go to Requests hub | | ☐ |
| B5 | Requests hub (employee) | `/app/requests/hub` | n | n | n | ✓ | ✓ | B | Managers see "This Requests page is for employees" | | ☐ |
| B6 | Updates (messages) | `/app/updates` | ✓* | ✓* | ✓* | ✓* | ✓* | Mixed | When the Updates module is on | | ☐ |
| B7 | Update detail | `/app/updates/[id]` | ✓ | ✓ | ✓ | ✓ | ✓ | Mixed | | | ☐ |
| B8 | Compose an update | `/app/updates/compose` | ✓ | ✓ | ✓ | – | – | Mixed | Send update | | ☐ |
| B9 | Help | `/app/help` | ✓* | ✓* | ✓* | ✓* | ✓* | Corp + B | Employee help vs manager help | | ☐ |
| B10 | Restricted ("That page is for Owners") | `/app/restricted` | — | ✓ | ✓ | ✓ | ✓ | Notice | Where a role is sent when it can't open a page | | ☐ |
| B11 | Page not found | `/app/[...missing]` | ✓ | ✓ | ✓ | ✓ | ✓ | Notice | Signed-in 404 | | ☐ |

## C. Schedule, availability and shift changes

| # | Page | Route | O | M | Mℓ | L | E | Built with | Notes | On screen | Reviewed |
|---|---|---|---|---|---|---|---|---|---|---|---|
| C1 | Schedule | `/app/schedule` | ✓* | ✓* | ✓* | ✓* | ✓* | B (O, M, L, E); Older (Mℓ: scoped schedule) | Week, day and open-shift views; Employee/Lead confirm the week; planning panel with Publish | | ☐ |
| C2 | Add shift | `/app/schedule/new` | ✓ | ✓ | ✓* | – | – | Mixed; Older (Mℓ form) | Company form vs location Manager form | | ☐ |
| C3 | **Find cover: Review replacement** | `/app/schedule/new?review=` | ✓ | ✓ | – | – | – | Older (`kit`, `wave-a`) | Jose, Nov 22: "one of the worst UI"; shows "Publishing permission needed" without the grant | | ☐ |
| C4 | Edit shift / shift details | `/app/schedule/edit` | ✓ | ✓ | ✓* | – | – | Mixed; Older (Mℓ read-only) | Delete shift confirm | | ☐ |
| C5 | Find cover (who can cover) | `/app/schedule/coverage` | ✓ | ✓ | ✓ | – | – | Own (coverage assistant) | | | ☐ |
| C6 | Build and publish | `/app/schedule/publish` | ✓ | ✓ (grant) | ✓ (grant) | – | – | Corp + B | Manager needs Publish schedules; one Publish form per draft location | | ☐ |
| C7 | Templates (copy a week) | `/app/schedule/templates` | ✓ | ✓ | ✓ | – | – | Quiet + Wave | | | ☐ |
| C8 | Copy receipt | `/app/schedule/copy-receipt` | ✓ | ✓ | ✓ | – | – | Older (`kit`, `wave-a`) | After copying a week | | ☐ |
| C9 | Scheduling rules | `/app/schedule/settings` | ✓ | ✓ | ✓ | – | – | Quiet + Wave | Coverage, staffing, positions, shift-change policy | | ☐ |
| C10 | Availability | `/app/availability` | ✓* | ✓* | ✓* | ✓* | ✓* | Mixed (B for Employee/Lead; Corp for managers) | Employee sets own; managers see the team's | | ☐ |
| C11 | Availability agreement | `/app/availability/agreement` | ✓ | ✓ | ✓ | ✓ | ✓ | Own (restrictions screen) | | | ☐ |
| C12 | Shift changes (swaps and call-outs) | `/app/exchange` | ✓* | ✓* | ✓* | ✓* | ✓* | Mixed (Quiet for managers) | Employee requests vs manager review | | ☐ |
| C13 | Open shifts | `/app/exchange/open-shifts` | ✓* | ✓* | ✓* | ✓* | ✓* | Corp (managers) / Quiet (employees) | When the marketplace module is on | | ☐ |
| C14 | Ask for a swap | `/app/exchange/swap` | – | – | – | ✓ | ✓ | B (employee creation) | Also opens as a sheet over Schedule (`@sheet`) | | ☐ |
| C15 | Can't work (call out) | `/app/exchange/callout` | – | – | – | ✓ | ✓ | B (employee creation) | Also opens as a sheet over Schedule (`@sheet`) | | ☐ |

## D. Time and timecards

| # | Page | Route | O | M | Mℓ | L | E | Built with | Notes | On screen | Reviewed |
|---|---|---|---|---|---|---|---|---|---|---|---|
| D1 | Timecards | `/app/timecards` | ✓* | ✓* | ✓* | ✓* | ✓* | Mixed (manager table; B for Employee/Lead hours) | Approve and finalize; bulk bar; inspector | | ☐ |
| D2 | Time corrections (review) | `/app/timecards/corrections` | ✓ | ✓ (grant) | ✓ (grant) | – | – | Corp | Shows "You don't have access" without the grant | | ☐ |
| D3 | Fix someone's time (delegated correction) | `/app/timecards/corrections/new/[employeeId]` | ✓ | ✓ | ✓ | – | – | Corp | | | ☐ |
| D4 | My time | `/app/my-time` | n | n | n | ✓ | ✓ | B | Managers see "My time is for employees" | | ☐ |
| D5 | Clocker recovery review | `/app/clocker-recovery` | ✓ | – | – | – | – | Own | Punches that need review | | ☐ |

## E. Time off and requests

| # | Page | Route | O | M | Mℓ | L | E | Built with | Notes | On screen | Reviewed |
|---|---|---|---|---|---|---|---|---|---|---|---|
| E1 | Time off | `/app/requests` | ✓* | ✓* | ✓* | ✓* | ✓* | Mixed (Corp for managers; B for Employee/Lead) | Request, withdraw, approve, decline | | ☐ |

## F. Team

| # | Page | Route | O | M | Mℓ | L | E | Built with | Notes | On screen | Reviewed |
|---|---|---|---|---|---|---|---|---|---|---|---|
| F1 | Team | `/app/employees` | ✓ | ✓ | ✓* | – | – | B (company); Older (Mℓ: scoped directory) | Filters, live status | | ☐ |
| F2 | Add person | `/app/employees/new` | ✓ | ✓ | – | – | – | Corp | Invite | | ☐ |
| F3 | Import a staff list | `/app/employees/import` | ✓ | n | n | – | – | Corp | | | ☐ |
| F4 | Person (profile, role, access) | `/app/employees/[employeeId]` | ✓ | ✓ | ✓ | – | – | Mixed | Invitation, operational scope, action grants | | ☐ |
| F5 | Person's pay rate | `/app/employees/[employeeId]/pay` | ✓ | – | – | – | – | Own (wages screen) | | | ☐ |
| F6 | When they can be scheduled (restrictions) | `/app/employees/[employeeId]/restrictions` | ✓ | ✓ | ✓ | – | – | Own (restrictions screen) | | | ☐ |
| F7 | Time off balance | `/app/employees/[employeeId]/time-off` | ✓ | – | – | – | – | Own (account screen) | | | ☐ |
| F8 | Clocker PIN | `/app/employees/[employeeId]/clocker-pin` | ✓ | – | – | – | – | Own | | | ☐ |
| F9 | Help someone sign in | `/app/account-recovery` | ✓ | ✓ | – | – | – | Own | Reset a password or Clocker PIN | | ☐ |

## G. Payroll and exports

| # | Page | Route | O | M | Mℓ | L | E | Built with | Notes | On screen | Reviewed |
|---|---|---|---|---|---|---|---|---|---|---|---|
| G1 | Payroll | `/app/payroll` | ✓ | ✓ | ✓ | – | – | Own (payroll runs) | When payroll is on; settings edits are Owner-only | | ☐ |
| G2 | Prepare payroll | `/app/payroll/prepare` | ✓ | ✓ | ✓ | – | – | Own | | | ☐ |
| G3 | Review pay | `/app/payroll/review` | ✓ | ✓ | ✓ | – | – | Own | | | ☐ |
| G4 | People in this payroll | `/app/payroll/people` | ✓ | ✓ | ✓ | – | – | Own | | | ☐ |
| G5 | Fix payroll | `/app/payroll/fix` | ✓ | ✓ | ✓ | – | – | Own | | | ☐ |
| G6 | Import payroll | `/app/payroll/import` | ✓ | ✓ | ✓ | – | – | Own | | | ☐ |
| G7 | Payroll history | `/app/payroll/history` | ✓ | ✓ | ✓ | – | – | Own | | | ☐ |
| G8 | Time exports | `/app/payroll-export` | ✓ | ✓ | ✓ | n | n | Own | Recent exports card (A3-03) | | ☐ |
| G9 | Paid time export | `/app/payroll-export/paid-time` | ✓ | ✓ | ✓ | n | n | Corp | | | ☐ |
| G10 | My pay (statements) | `/app/my-pay` | – | – | – | ✓ | ✓ | Own | | | ☐ |

## H. Rondo AI and insights

| # | Page | Route | O | M | Mℓ | L | E | Built with | Notes | On screen | Reviewed |
|---|---|---|---|---|---|---|---|---|---|---|---|
| H1 | Rondo AI | `/app/ai-manager` | ✓* | ✓* | ✓* | – | – | Own (owner advisor / manager Rondo) | When the AI manager is on; day plans, coverage, attendance | | ☐ |
| H2 | Weekly plan ("Where are we short this week?") | `/app/ai-manager/weekly` | ✓ | – | – | – | – | Corp + B | | | ☐ |
| H3 | Business records | `/app/ai-manager/business` | ✓ | – | – | – | – | Own | | | ☐ |
| H4 | Company knowledge | `/app/ai-manager/knowledge` | ✓ | – | – | – | – | Own | | | ☐ |
| H5 | Insights | `/app/reports` | ✓ | ✓ | ✓ | n | n | Own | | | ☐ |
| H6 | Christmas bonus | `/app/reports/christmas-bonus` | ✓ | ✓ | ✓ | n | n | Own | | | ☐ |

## I. Profile and account

| # | Page | Route | O | M | Mℓ | L | E | Built with | Notes | On screen | Reviewed |
|---|---|---|---|---|---|---|---|---|---|---|---|
| I1 | Profile | `/app/profile` | ✓* | ✓* | ✓* | ✓* | ✓* | B (Employee/Lead); Own (manager profile) | | | ☐ |
| I2 | Policy document | `/app/profile/[document]` | ✓ | ✓ | ✓ | ✓ | ✓ | B | Privacy, terms inside the app | | ☐ |
| I3 | Calendar subscription | `/app/profile/calendar` | n | n | n | ✓ | ✓ | Own | | | ☐ |
| I4 | Device alerts | `/app/profile/device-alerts` | ✓ | ✓ | ✓ | ✓ | ✓ | Own | Browser push | | ☐ |
| I5 | Passkeys | `/app/profile/passkeys` | ✓ | ✓ | ✓ | ✓ | ✓ | B | | | ☐ |
| I6 | Delete my account | `/app/account/delete` | ✓ | – | – | ✓ | ✓ | Quiet | | | ☐ |

## J. Settings and billing (Owner)

| # | Page | Route | Built with | Notes | On screen | Reviewed |
|---|---|---|---|---|---|---|
| J1 | Settings | `/app/settings` | Corp | The settings list | | ☐ |
| J2 | Workspace | `/app/settings/workspace` | Older (`wave-c`) | Business name, time zone | | ☐ |
| J3 | Branding | `/app/settings/branding` | Older (`wave-c`) | | | ☐ |
| J4 | Features (modules) | `/app/settings/features` | Older (`wave-c`) | | | ☐ |
| J5 | Locations | `/app/settings/locations` | Older (`wave-c`) + B | | | ☐ |
| J6 | Add location | `/app/settings/locations/new` | Older (`wave-c`) | | | ☐ |
| J7 | Edit location | `/app/settings/locations/[locationId]` | Older (`wave-c`) | | | ☐ |
| J8 | Positions | `/app/settings/positions` | Own (position catalog) | | | ☐ |
| J9 | Breaks | `/app/settings/breaks` | Older (`wave-c`) | Break types | | ☐ |
| J10 | Time off policies | `/app/settings/time-off` | Own (policies screen) | QA A1-05: three button styles in its empty state | | ☐ |
| J11 | Company policies | `/app/settings/company-policies` | Older (`wave-c`) | | | ☐ |
| J12 | Payroll settings | `/app/settings/payroll` | Own | When payroll is on | | ☐ |
| J13 | Clocker devices | `/app/settings/clocker` | Own (device manager) | Add a tablet, setup ticket | | ☐ |
| J14 | Clocker schedule matching | `/app/settings/clocker/matching` | Older (`wave-c`) + Corp | Grace minutes | | ☐ |
| J15 | Clocker photos | `/app/settings/clocker/photos` | Older (`wave-c`) | Photo and notice settings | | ☐ |
| J16 | Clocker photo review | `/app/settings/clocker/photos/review` | Older (`wave-c`) + Corp | | | ☐ |
| J17 | Clocker PINs | `/app/settings/clocker/pins` | Older (`wave-c`) | | | ☐ |
| J18 | Billing (account recovery / plan) | `/app/billing` | Own (recovery frame) | Owner; when billing needs attention | | ☐ |

## K. Clocker (shared tablet)

Two routes: `/clocker/[location]` (the kiosk, one location per tablet) and `/clocker/access/paused`. The kiosk is one
route with these screens (DESIGN.MD "Clocker Direction B"; English and Spanish).

| # | Screen | Built with | Notes | On screen | Reviewed |
|---|---|---|---|---|---|
| K1 | Tablet setup: not connected / enter setup code | Own (Clocker setup) | Redeem the Owner's code | | ☐ |
| K2 | Tablet connected (ready) | Own | | | ☐ |
| K3 | Enter Employee ID | Own | | | ☐ |
| K4 | PIN keypad | Own | Masked | | ☐ |
| K5 | Choose an action (clock in / out, break) | Own | | | ☐ |
| K6 | Choose a break (rest or meal) | Own | | | ☐ |
| K7 | Confirm clock out | Own | | | ☐ |
| K8 | Photo (camera, local preview) | Own | When photos are on | | ☐ |
| K9 | Review the current punch | Own | | | ☐ |
| K10 | Sending | Own | | | ☐ |
| K11 | Recorded (receipt) | Own | | | ☐ |
| K12 | Not confirmed / check status (recovery and retry) | Own | Lost reply | | ☐ |
| K13 | Someone else's punch in progress | Own | | | ☐ |
| K14 | Sign-in / access changed; unavailable; storage problem | Own | Error states | | ☐ |
| K15 | Clocker paused | Own | `/clocker/access/paused` | | ☐ |

## L. Phone app (native)

| # | Screen | Where | Notes | On screen | Reviewed |
|---|---|---|---|---|---|
| L1 | Alerts (device notifications on/off) | `native/capability-ui` | States: off, asking, on, blocked; the rest of the phone app shows the web pages above | | ☐ |

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
