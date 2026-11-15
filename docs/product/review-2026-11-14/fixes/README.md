# Fix round 1 (Nov 15, 2026)

Jose asked for all fixes from the [Nov 14 inspection](../README.md). This round builds the UI fixes that needed no decision and no server change. They sit in the working tree of `claude-codex-collab-nevora` on top of `ce4de4bc`. **Nothing is committed.** Backend items are in [the Codex handoff](../../../handoffs/2026-11-14-claude-to-codex-inspection-fixes.md).

**Update:** Phase 1 of the design system is built on top of this round. See [phase-1/README.md](phase-1/README.md). Phase 2 (the desktop frame, row buttons, loading and error states) is built on top of that. See [phase-2/README.md](phase-2/README.md).

## What changed

205 application files (6,473 lines added, 953 removed), built as ten packages. Each report lists every user-facing string it changed, old to new, in English and Spanish where the surface is bilingual.

| # | Area | Report | Main fixes |
|---|---|---|---|
| 1 | Owner payroll wording | [01-payroll-wording.md](01-payroll-wording.md) | Scope line under "Payroll"; "What's next" card after approval; the truth about automatic sharing at Approve; "Scheduled payday"; every blocked-payroll code mapped to a sentence (104 codes); the "who's included" review opens from the blocker in plain words |
| 2 | Employee app | [02-employee-app.md](02-employee-app.md) | "Scheduled payday" and "Your employer pays you"; Employee ID on Profile; notification titles that say what happened; one primary button on Schedule; 44px targets |
| 3 | Owner Home, Things to do, Team | [03-owner-home-team.md](03-owner-home-team.md) | Jose's attendance words; rows that state the fact; tinted Approve and quiet Decline; setup card first; sign-in status and hours on the person page; email warning on Add employee; plain message when invitations cannot send |
| 4 | Timecards, notifications, durations | [04-timecards-notifications.md](04-timecards-notifications.md) | One duration format; Approve then Finalize explained; a next step to Payroll after finalizing; "Waiting" chips; clearer Owner notifications |
| 5 | Navigation and shell | [05-navigation.md](05-navigation.md) | `/app/restricted` in place of a silent bounce to Home; "Plan and billing" in Settings; Availability on Schedule; How to section in Help; names aligned; Search additions |
| 6 | Sign-in and public pages | [06-sign-in-public.md](06-sign-in-public.md) | ID kept after a wrong password; expired-link message; session-ended note; Spanish Support, Account deletion and error screen; browser language on first visit; error reference |
| 7 | Clocker | [07-clocker.md](07-clocker.md) | Employee ID then PIN; lockout names who is paused and shows the clock time; kiosk error screen; sentence case; paused page follows the tablet's language |
| 8 | Billing pages | [08-billing-pages.md](08-billing-pages.md) | Rebuilt on the sign-in look; one sentence per pause reason; back link in every state; confirming state after Stripe; Sign out |
| 9 | Design foundation | [09-design-foundation.md](09-design-foundation.md) | One teal band; pill buttons everywhere; contrast tokens; labelled tablet rail; reduced motion; High Contrast focus; validation announced; Phase 1 tokens added |
| 10 | Staff list import | [10-roster-import.md](10-roster-import.md) | New screen at `/app/employees/import`: add a list, check it, import |

Also changed, outside the app code: `DESIGN.MD` (Signature marked superseded; a dated section for this round), `docs/product/TEAM-RULES.md` (now says Direction B), `docs/ui/fuel-ui-contract.md` (superseded banner), `.claude/agents/ui-designer.md` (light only), and a new `docs/product/review-2026-11-11/status.json` (22 fixed, 8 partly, 140 open).

## How it was checked

| Check | Result |
|---|---|
| Type check (`tsc --noEmit`, whole project) | Clean |
| Lint (`eslint`) on all 183 changed TypeScript files | Clean |
| Unit tests (`vitest run --dir src`, 903 files) | 13,087 pass, 1 fails (see below), 801 skipped as before |
| Browser, real sign-in on fictional local data | 112 Owner screens, plus tablet, Manager, Employee (320, 390, 1440), signed-out pages in English and Spanish, and the kiosk. No page errors, no horizontal overflow |
| Kiosk end to end with the new Employee ID step | Clock in, break start and end, clock out, saved-action recovery, second location and lockout all pass |

**The one failing unit test is expected.** `src/test/manual-publication.test.ts` ties the published user manuals to the exact application source, so it fails after any source change until the manuals are rebuilt against a commit that contains the change. The manuals also need new wording for the kiosk steps and renamed labels.

**Not run:** the browser integration suites in `src/test/integration` and the QA scripts in `scripts/`. Several of them press labels this round renamed, and the kiosk scripts expect the PIN-only flow. They will fail until Codex updates them; the list is in the handoff. No production build was made.

Screenshots after the fixes are in [after/](after/). Compare with [../evidence/](../evidence/).

## Things to look at before approving

These are judgement calls the engineers made. Each report has the detail.

1. **Payroll wording.** Payroll copy was locked. The new strings are listed in report 1 (Owner) and report 2 (Employee). The pay statement PDF is unchanged; that wording goes through Codex and counsel.
2. **Phone bottom bar.** Pages outside the five tabs (More, Settings, Insights, Profile, Notifications, Help) now light no tab. This reverses the Nov 7 rule that they light Home.
3. **Kiosk.** A workspace-wide pause reads "This tablet is paused". A paused person's card shows "Done" and clears after 30 seconds, so the next person does not read it as theirs. The wrong-entry message is "Employee ID or PIN not recognized."
4. **Sign-in keeps the typed Employee ID** after an error by holding it for five minutes in a cookie only the sign-in page can read. Codex should review this and the session-ended redirect, since both sit next to authentication.
5. **Browser language.** A Spanish browser with no saved choice now gets Spanish on sign-in, billing and the paused kiosk page.
6. **Billing page.** The business name stays on screen after the billing session ends, so "Back to {business}" has something to say. The earlier page hid it.
7. **Staff list import** works only where company workspaces are routed (`NEVORA_WORKSPACE_MODE=isolated`). On a single-company deployment the page says it is not available, and Team hides the link.
8. **Timecards load one more read** (payroll capabilities) to decide the next-step row.
9. **Spanish on Account deletion** is a translation of approved policy facts. Counsel should read the retention wording.

## Corrections to the inspection

Building the fixes showed three inspection findings were wrong or overstated:

- **"Request time correction" was the right label.** The delegated form sends a request that a different person approves. The label stays.
- **Timecards and Insights count the same minutes.** "382 h 51 min" against "382 h 55 min" was two reads a few minutes apart with people clocked in. The real mismatch was rounding ("383 h" against "382 h"), now fixed.
- **Offline Employee Home hides the shift on purpose.** Clearing private rows when the device goes offline is a kept privacy rule (`FIXED-AND-REMAINING.md`). It is unchanged.

## Not in this round

| Item | Why |
|---|---|
| Pay statement PDF wording (PY-2), 2027 rules (PY-6), export of amounts (PY-5), error logging (AR-1), invitation delivery flag (JR-5), flag registry (AR-8) | Server work. In the Codex handoff. |
| Payroll scope decision (PY-1), one billing page, prices, staff without email, location-scoped Managers | Jose's decisions. |
| Spanish inside the app | Large, and needs the timing decision and a stored language per person. |
| Signup, verification, workspace and Owner activation screens | Large, and needs the go or no-go on self-service. |
| Phase 2 desktop frame | Done after this round: see [phase-2/README.md](phase-2/README.md). |
| "Set up your time clock" on Home when no tablet is registered | Home's data does not say whether a tablet exists. Asked of Codex. |
| Kiosk offline screen | Needs the decision on offline punches. |
| Older attendance words in three legacy views | `whos-working-corp.tsx:19`, `manager-weekly-roster.tsx:132`, `premium-home.tsx:215`. Done in Phase 2. |
| User manuals (`docs/guides/web`) | Need the new labels and kiosk steps, then a rebuild after the commit. |

## Release sequence

Unchanged. Review and commit on `claude-codex-collab-nevora`, integrate and verify with the backend on development, then promote the exact verified release to main after Jose approves. Nothing here authorizes a main merge, a production change, a paid activation or a live charge.
