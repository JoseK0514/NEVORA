# Phase 6 production-readiness QA handoff

Branch: `dash-refine`. Baseline: `c6b4d2c9bd2773ee21c57226a34aafd7b7c7d1d2`.

## Environment and scope

The production build ran locally against a disposable copy of the Phase 3 synthetic PGlite database through the existing local PostgreSQL adapter. No production credentials or customer records were used. The QA database, browser scripts, and raw results are outside the repository at `/tmp/fuel-phase6-qa`. Physical iOS and Android devices were unavailable. Chromium and WebKit browser emulation was used; these results do not prove physical Safari or Android Chrome behavior or production Neon performance.

## Functional and permission results

- **Roles:** Owner and Manager reached management routes. Only Owner reached Settings. Lead and Employee reached their five self-service destinations; direct requests for Employees, Add Employee, Templates, Scheduling Rules, Settings, and management schedule routes redirected to Home. Manager could not create an Owner even after injecting the Owner option into the form. Owner created Employee, Lead, Manager, and Owner profiles in synthetic data.
- **Authentication:** Correct login, wrong ID/password, inactive account, protected-route redirect, activation with wrong phone and password mismatch, successful activation and subsequent login, repeat activation rejection, session persistence, logout, and browser back/refresh after logout were exercised. Native form validation rejected a short password and invalid phone. Employee ID remained populated after activation errors.
- **Employees:** Generated IDs had the expected format and differed on repeated generation. Employee creation updated the directory and retained both primary and additional eligible locations. Duplicate ID and email were rejected; duplicate email left no partial employee. Directory search matched first name, last name, ID, and phone. Role, location, status combinations, no-match, and filter reset were checked with more than 50 synthetic employees. A near-concurrent duplicate ID insert accepted one record and rejected the other.
- **Schedule:** Add, edit, delete, week navigation, published/draft location state, overlap rejection, out-of-availability warning, and publish readiness/confirmation were exercised. The synthetic publish changed the schedule to `PUBLISHED`. Approved Time Off blocked a conflicting new shift. Long-name handling and general grid layout were covered by the responsive pass. Not every possible warning combination or many-shift concurrency path was exercised.
- **Templates:** Save, duplicate-name error, stored shift count, apply to another week, archive, empty active template, and week context were exercised. Replaying the Apply action for an archived template was reproduced as a defect and then blocked server-side; the retest inserted zero shifts.
- **Availability:** Weekday preset, time editing, save/reload, invalid time-range rejection, and week-specific submission persisted. Dashboard availability count reflected the weekly submission. Every-day and Clear All were covered by existing unit tests, not repeated as browser actions in this pass.
- **Time Off:** Full-day and partial-day requests persisted as pending. Lead approval and Manager decline persisted, with an approved request blocking scheduling. A rapid double submit was reproduced and fixed; retest inserted one request. An impossible date was rejected with a controlled form error; other invalid date/time combinations were not exhaustively browser tested.
- **Shift Exchange:** Coverage offer/cancel, coverage claim/Manager approval, swap proposal/Lead acceptance/Manager approval, call-out submission/Manager approval, request state, and actual shift reassignment persisted. Declined swap/call-out and all historical badge combinations were not exercised.
- **Scheduling Rules and Settings:** Staffing minimums, hour targets, reload, and coverage-window add/remove persisted. Changing a staffing rule moved the dashboard coverage count from 17 to 16; restoring it returned the count to 17. Owner Settings showed the canonical two locations, active count, Manage Access, and Manage Rules links without a fake location management control. Coverage-window editing is not implemented.
- **Dashboard/data integration:** For the synthetic current week, Availability showed `0/60` and Requests showed `11`, matching database counts. For the next week, Availability showed `2/63`, matching submissions and active employee counts after QA-created profiles. One published location produced `1/2` schedule readiness. Availability, rules, Time Off, publish, template apply, and exchange changes were checked against their dependent features.
- **Database:** Duplicate Employee IDs and orphan eligibility, shift, request, and template-shift records all counted zero after workflows. The new employee phone persisted normalized. Employee creation's duplicate email path rolled back atomically. No schema migration was performed.

## Defects corrected

1. Archived templates remained applicable through a replayed server action. The template shift query now requires an active template and distinguishes a missing/archived template from an active empty template. The page shows a controlled unavailable message.
2. Rapid Time Off submission created duplicate records. The form carries one server-generated UUID per rendered form, and insertion uses the existing request primary key as an idempotency key.
3. Rapid Create Employee inserted once but surfaced a duplicate-ID error after the second submit. The form now blocks a second in-flight submit; browser retest ended on the success page with one employee row.
4. Malformed week query parameters could throw a server 500. Strict ISO date and Monday checks now protect untrusted week values, and the coverage route redirects invalid requests to the existing schedule error state.

Focused tests were added for archived-template selection, Time Off request-key reuse, and invalid schedule dates. Existing tests remain intact.

## Responsive, accessibility, performance, and code review

- Chromium and WebKit emulation: 320 route/viewport checks across phone, landscape, tablet, and desktop sizes had zero automated overflow, nav/sticky collision, final-scroll, shell-switch, input-font, or page-error findings. The final build was rechecked at 320×568, 390×844, 844×390, 1024×768, and 1440×900 across all ten authenticated routes in both engines: 100 checks, zero issues. Mobile menu and tab interaction checks had zero failures.
- Visible buttons and form fields on the ten authenticated routes plus Login and Activate had accessible text/labels in a DOM audit. Each route had one main landmark and one H1. Focus/menu behavior was exercised by keyboard in the mobile interaction suite. This was not a full automated contrast or screen-reader audit.
- Local warm response samples with the synthetic database: Dashboard 14–31 ms, Schedule 26–28 ms, Employees 7–8 ms, Scheduling Rules 10–11 ms, and coverage suggestions 45–54 ms. The Schedule HTML response was about 497 KiB with 60+ employees; this remains a scaling consideration. These loopback numbers are not production latency evidence.
- Phase 5 `visualViewport`, window, focus, pointer, and keyboard listeners all have matching cleanup. No obvious render loop, leaked listener, debug route, or temporary QA fixture was found in tracked application code. The 9,739-line global stylesheet was not mass-refactored because visual parity is locked and no safe unused subset was proven.
- Redacted Gitleaks scans of `src`, `db`, `scripts`, and `docs` found no leaks. This is a repository secret scan, not a full security audit.

## Gates and remaining limits

The final production build, ESLint, TypeScript typecheck, and Vitest suite passed; the suite has 84 passing tests. Final command output and exact pushed SHA are reported in the completion response after the clean-tree check.

Physical iOS and Android testing, production Neon validation, controlled database-outage injection, exhaustive color-contrast/screen-reader testing, and production load testing remain outstanding. No PR, merge, release, or production deployment is part of Phase 6.
