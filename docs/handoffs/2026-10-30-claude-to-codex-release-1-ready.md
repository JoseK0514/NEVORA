# Claude → Codex: NEVORA Release 1 is ready for inspection, then deploy

Date: 2026-10-30. Branch: `claude-codex-collab-nevora`. Release SHA: recorded in §4 after the final gate (the commit that adds this file, or the evidence commit right after it).

This hands Release 1 back for the last three steps: independent inspection (8), Jose's device test (9), and your migration and deploy (10). Nothing here authorizes a production migration or deploy. Those wait for the inspection, Jose's device test and Jose's explicit go.

## 1. What Release 1 now contains (Claude's part, 9fe89683 onward)

**Corporate design (Jose, Oct 26), every Owner and Employee page.**
- Owner: Home, Things to do, Schedule (with Build and publish), Team, Person, Timecards, Payroll, Who's working, Insights, More, Settings pages and the Clocker devices section are on the corporate kit (`src/components/corp`). Desktop has the white sidebar shell.
- Employee: the corporate shell with the board tabs Home, Schedule, Time, Pay and Requests. More opens from the header avatar.
  - Home, More, Schedule (shift sheet, Open shifts) and Time are on the kit.
  - Pay, Requests, time off, Availability, timecards and corrections, Notifications, Updates, Profile and Delete account use the corporate bridge `src/app/app/corp-employee-bridge.css`. It remaps the `--em-*` tokens and shapes; the components are unchanged.
- A Lead keeps the v5 look (Lead is on hold, per Jose).
- Light only in Release 1.
- Clock-in stays tablet-only. Where a board shows a phone Clock in button, the app says "Clock in on the [location] tablet".

**Behaviour changes Jose approved:**
1. **Publish changes** (5f234911, needs migration 0043).
   - Manual edits to a published week are held with a per-edit history row.
   - The Schedule pill reads "Published · N changes", and Build and publish offers Publish changes.
   - An approved swap or callout publishes and notifies only itself.
2. **Payroll workweek** (5db8bfdf): week N can be paid without waiting for next Monday's card (00:01 workweek closing context).
3. **Overnight rule** (4fd3f426, Jose Oct 25, confirmed Oct 30).
   - A recorded entry counts wholly on the civil day it starts.
   - Daily overtime is time over 8 h in that day, and each minute counts once.
   - Midnight no longer blocks payroll (`DAILY_BOUNDARY_SENSITIVE` is gone from new runs).
   - Weekly / FLSA overtime and pay-period cuts still split at the exact instant.
   - Saved runs keep their stored evidence and old policy record and still verify.
   - `NATIVE_CALCULATOR_VERSION` is now `NEVORA_NATIVE_WAGE_V11_SHIFT_START_DAY`. **A draft prepared before this release reads as `NATIVE_REVIEW_STALE` and must be recalculated before approval.** Jose still wants PR labor counsel to confirm the 24-hour workday reading.
4. **Company updates held** (d67d652f, 08728bc5, 169e94e1).
   - While D04's live activation is held (`communicationDevelopmentGuard`), the app reads the updates module as off on any database but an owned local test database.
   - Home, More and the menus leave it out. Settings → Features shows "Coming in a later release", and the direct address explains the same.
   - The notification list's SELECT allowlist uses the same builder (`activePresentationSql`).
   - **No deploy setting.** Opening D04 later needs its own review; the Owner's switch then decides again.
5. **Clocker tablet**: `NEVORA_CLOCKER_UI_V2=true` for Release 1 (approved iPad look, corporate colours, system type). Punch enablement stays separately authorized.

## 2. Migrations

- The order is unchanged from `db/migrations/order.ts` and the runbook §4–5.
- The only new file in this release is `0043_schedule_pending_edits.sql`. It is additive: one table, two indexes and an update guard trigger. It runs after `0041` in the base chain and before the final three (`0031_native_payroll`, `0032_company_access_invitations`, `0042_company_invitation_lifetime`).
- All 52 files are listed exactly once.
- The overnight rule and the Updates hold need no migration.

## 3. Environment (Production)

As the runbook table, plus:
- `NEVORA_CLOCKER_UI_V2=true`.
- Company updates: nothing to set (see 1.4).
- Keep push, invitation delivery and passkeys as their own approvals say.

## 4. Evidence on the release SHA (owned local Postgres, fictional data, `DATABASE_URL` unset)

Recorded in a follow-up commit after the final gate on this file's commit. The release gate is CI's set:
- validate: unit, advisor pilot, typecheck, lint, release-build, audit;
- the Clocker shards;
- release-postgres and advisor integration;
- Phase E SQL;
- every browser job: Phase D, D2, attendance, advisor browser, Phase E home/communications/calendar/navigation/attention;
- the Clocker iPad and breaks UI;
- every owned database integration config.

**Browser suites brought up to the approved UI on Oct 30.** No check was deleted; checks were re-anchored where the approved design moved a function:
- **Home:** clock status → Time; the full attention list → Notifications.
- **Navigation:** More from the avatar; phone pages are the mobile ports.
- **Calendar:** the entry is More → Add shifts to your calendar.
- **Communications:** the phone messages view.
- **Phase D/D2:** Who's working `#review`, corporate timecard detail, Things to do.

**App fixes found by those suites:**
- Who's working opens its review for Inbox links (`#review`, `#attendance-…`, `#correction-…`) and keeps a loading correction in place.
- Things to do opens a waiting timecard's own period.
- The phone Insights "Hours by person" lets a long name wrap. This is the one exception to the kit's one-line rows; Jose confirmed it.
- The phone update page re-reads after a stale acknowledge is refused.
- The Profile calendar notice has 4.5:1 contrast.
- The phone Time and Requests segments have 44px tap areas.

**Hosted fictional Preview:**
- Neon `nevora-release1-preview-20261030` (us-west-2), Vercel Preview on this branch only, region pdx1.
- Signed in as the fictional Owner and an Employee. Home, Schedule, Things to do, Team, Payroll, Time, Pay, Requests and More load from the hosted database.
- A tablet registered and showed the PIN screen. Updates is hidden as in 1.4.
- Link: https://nevora-git-claude-codex-collab-nevora-josekarlo-5933s-projects.vercel.app (Vercel sign-in or a share link).
- The Preview deploys from a local clone with a local-only marker commit and `regions:["pdx1"]`. Neither is in the branch.

## 5. Known gaps

- **Lead:** a Lead keeps the v5 look (Lead is on hold). The Phase E Home suite now runs as an Employee, so the v5 Lead Home has no browser coverage.
- **Board figures not in the employee reads:** "earned so far", pay amounts in the Pay list, scheduled hours on Time.
- **Desktop sidebar link height:** 36px (188×36). It meets WCAG 2.5.8 (24px), but not the 44px phone rule. Desktop only.
- **Resizing during an uncertain correction:** a desktop Employee who narrows the window below 768px while a time correction is uncertain loses that request's "Try again". The phone Time view replaces the desktop panel. It only happens when resizing during that state.
- **Flaky WebKit check:** `explicit-source-recovery` in the Phase D browser suite failed 1 of 3 iteration runs (stayed on "Current view needs a fresh check") and passed in the gate. No related code changed on this branch.
- **Non-CI suites with an unmatched local harness:** `company-access-*` and `premium-*` refuse the generic owned-DB runner. They fail the same way on 001031aa, the commit before this work.
- **Payroll drafts:** drafts prepared before 4fd3f426 must be recalculated (`NATIVE_REVIEW_STALE`).
- **Updates (D04):** held, see 1.4.

## 6. Not done here (yours or Jose's)

- Production migration, deploy, environment changes and any real notification, payment or credential: Codex after inspection and Jose's go.
- D04 (Updates) activation review.
- The stray remote head `claude/employee-mobile-phase2-20261027` and any branch cleanup: Jose's call.
