# Product completeness review: requirements gaps

October 21, 2026 · Senior business analyst lens: role coverage, promised-vs-built flows, end-to-end lifecycle (hire → pay → archive), compliance depth, audit, notifications, first run · Read-only review for Jose

**Code reviewed:** `NEVORA-UI-READINESS` at `8c4dd505` (this checkout) and the read-only `claude/auth-premium` copy at `88ca719d` (`/private/tmp/claude-501/-Users-josek0514-Desktop-NEVORA-UI-READINESS/8c7acfe8-4195-49cb-a26a-ba2ac9ec5c59/scratchpad/auth`, cited below as `auth:`). This builds on the October 20 merged gap list (`docs/product/reviews/gap-analysis-2026-10-20/SUMMARY.md`); I re-verified its headline claims rather than repeating them, and this report concentrates on what that list did not cover or what has changed since.

**Classification:** each finding is marked **[Missing]** (not in the product at all), **[Unreachable]** (code exists, no screen or route uses it), or **[Weak]** (reachable but incomplete for the job). Priorities: P0 fix before launch, P1 first month, P2 later. **QW** = quick win.

---

## 1. Status of the October 18 manager findings (MG1–MG5)

The release moved for the Manager/Owner "clean" rework, so this is the ledger of what the Oct 18 review (`docs/product/reviews/manager-mobile-usability-2026-10-18/REVIEW.md`) still leaves open on this branch.

| Finding | Status at 8c4dd505 | Evidence |
|---|---|---|
| D1 context-free Inbox approvals | **Fixed.** Inbox rows carry no decision buttons; every request opens its full review. | `src/components/manager-inbox.tsx:21` ("O1: no decision from here") |
| D2 availability denominator | **Fixed.** Home receives `availabilitySubmitted` / `availabilityEligible` / `activeEmployees` separately. | `src/app/app/page.tsx:81-84`; merge 8c4dd505 |
| D3 disabled-look buttons, D4 all-day time | **Fixed** per merge 8c4dd505 ("disabled look, all-day time"); needs the pending re-verification pass, not re-implementation. | merge 8c4dd505 |
| MG1 duplicate navigation | **Half fixed.** `view=requests` and `view=schedule` now redirect with context (`src/lib/retired-views.ts:5-15`). But `view=team`, `view=activity` and `view=attendance` still render the legacy tabbed dashboard with the "Welcome back" title and second shell. | `src/components/manager-dashboard.tsx:31-34` (view union), `:100-103` (tab list), `:314` (`Welcome back, ${firstName}`) |
| MG2 Inbox filters / Home duplication | **Improved.** Filter lives in the URL so Back restores it (`manager-inbox.tsx:38-56`); missed punches still render above filters as `lead` (`:41`, `:80`). |
| MG3 More grouping | **Improved** — navigation presentation groups exist (`src/lib/navigation.ts:81-89`); verify against the Oct 18 screenshots in the re-test pass. |
| MG5 schedule length | **Improved** — a "Build and publish" action-menu entry sits near the top (`src/app/app/schedule/page.tsx:334`); unassigned-people grouping not verified in this read. |

**F1 · [Weak] · P0 · QW — Retire the last three legacy dashboard views.** `retiredViewDestination` returns `null` for `team` and `activity` (`src/lib/retired-views.ts:7`), so the two-generation UI the Oct 18 review called NO-GO is still one click away (Home "Review attendance" deliberately links to `view=attendance` — that one now has a proper "Time review" title, `manager-dashboard.tsx:314`, and can stay). Redirect `view=team` to `/app/employees` and give `view=activity` either a real page title and shell or a redirect, exactly as MG1's table prescribed. The redirect pattern, with week/day/location/person carry-over, is already written; this is an afternoon, not a project.

---

## 2. Role coverage

**F2 · [Missing] · P1 — Lead has no experience of its own.** Lead is defined into `SELF_SERVICE_ROLES` beside Employee (`src/lib/auth/permissions.ts:7`), gets the identical tab set (`src/lib/navigation.ts:143`), and matters only as a scheduling qualification — a shift can require a lead (`src/lib/scheduling/capabilities.ts:35`, `LEAD_REQUIREMENT`). A customer who promotes someone to Lead will see nothing change and ask what they paid for. The Oct 20 analysis rated this P2 as a permissions decision; from a completeness standpoint it is a P1 **requirements** gap: there is no PRD stating what a Lead is. Minimum credible scope for Jose to decide: read-only "who is on shift now" for their location, visibility of missed punches on their shift, and nothing that touches pay. No PRD for a Lead experience exists under `docs/product/` (the prd-* set covers phone search, foundations, setup card, polish, Capacitor).

**F3 · [Weak] · P2 — Manager vs Owner differences are real but undocumented.** Payroll is capability-gated (`navigation.ts:194` shows payroll entries only when granted) and operational-rule saves are Owner-only (`src/app/app/employees/actions.ts:236`). That logic is right; what's missing is a single written permissions matrix a buyer or support person can read. Today it exists only as scattered code.

---

## 3. Promised vs built

**F4 · [Unreachable] · P1 — The phone time clock is built and dark.** `src/components/time-clock-widget.tsx` has zero importers (grep across `src/app` and `src/components`). The Oct 20 market review ranked phone clock-in the #1 buyer expectation; decision A20 is still open. Until Jose decides, this is dead weight that will drift from the live punch contracts. Either schedule it or delete it with a note.

**F5 · [Unreachable] · P1 — The employee CSV importer still has no screen.** `src/lib/imports/csv.ts` is imported only by its test (re-verified; unchanged since the Oct 20 finding). Any pilot above ~20 staff hits this on day one.

**F6 · [Weak] · P1 — Account deletion is now half-real on auth-premium.** `auth:db/migrations/0034_account_deletion_requests.sql` adds the request table the Oct 20 review found missing (the "dead `error=deleting` branch"). What I could not find is the user-facing flow that files a request, and the support address in `auth:src/lib/auth-copy.ts` still needs the `thevelani.com` fix confirmed. Close the loop end to end before the store-listing claim depends on it.

---

## 4. Language: the Spanish-speaking employee's actual journey

Walking one Spanish-speaking employee through the product (the first market's majority case):

1. **Invitation email — English only** (`auth:src/lib/auth/invitations/delivery.server.ts`).
2. **Activation — English**, per `direction.md`'s own admission; sign-in proper has Spanish second lines (`auth:src/lib/auth-copy.ts:12,114`).
3. **Portal — English end to end**, `<html lang="en">` hard-coded (`auth:src/app/layout.tsx:29`), which also makes screen readers mispronounce everything for Spanish users; no language setting exists anywhere in Profile.
4. **Push notifications — English** (payload copy in `src/lib/notifications/payloads.ts` is untranslated).
5. **Clocker — genuinely bilingual** (`src/components/clocker-language.tsx:9`, `CLOCKER_ES`).

So the only fully bilingual surface is the one surface the employee shares with everyone else. **[Missing] · P0 for the PR launch claim.** B5 remains unapproved (`direction.md`). **QW inside the P0:** a bilingual invitation + activation email and a correct `lang` attribute are small, isolated changes that don't wait for the full B5 program. The honest alternative is to stop claiming Spanish-first until B5 ships; the dishonest middle is what exists now.

---

## 5. Puerto Rico compliance depth (counsel decides; product must stop obscuring)

**F7 · [Missing] · P0 — The export's time basis actively hides overtime and paid breaks.** Re-verified at `src/lib/payroll-export/model.ts:3`: the canonical export's basis is literally `RECORDED_ELAPSED_INCLUDING_BREAKS`, and the only hour sources are `recordedHours`/`breakHours` (`:5`). The ADP RUN layout carries one constant Earnings Code (`:33`). So daily OT (PR's distinctive rule), weekly OT, and meal-penalty hours all leave the building priced as regular time — and breaks are *included* in the hours column unless the receiving provider subtracts them. Meanwhile the native payroll engine itself records daily interpretation as `'UNRESOLVED'` pending counsel (`auth:src/lib/payroll/native/workweek-policy.ts:43,55`). **QW:** a one-line warning on Time exports — "This export contains total recorded hours including breaks; overtime and meal penalties are not split" — costs an hour and converts silent risk into informed use. The real fix (REG/daily-OT/weekly-OT/meal-penalty/leave columns) waits on counsel per the Oct 20 plan.

**F8 · [Missing] · P1 — Break compliance is categories without rules.** The Clocker models REST/MEAL/OTHER with target minutes (`src/lib/clocker/break-types.ts:1-6`, `db/migrations/0014_clocker_breaks.sql`), but nothing checks Ley 379 meal timing (meal not before hour 2 / after hour 5, second meal on long shifts) or flags a missed/short meal for the manager. The data to detect it (punches + break punches) already exists; the detection and the attendance flag do not. This belongs in the same counsel-gated package as F7.

**What is genuinely good here:** schedule-side conflict detection is real and better than the Oct 20 list implied — `SHIFT_OVERLAP` (`src/lib/scheduling/validate-shift.ts:34,233`), availability-exception conflicts (`:132`), simultaneous-position conflicts (`src/lib/scheduling/schedule-health.ts:264`), and `PROJECTED_OVERTIME_REVIEW` at scheduling time (`src/lib/scheduling/operational-rules.ts:156`). The gap is downstream (recorded time and exports), not at planning time.

---

## 6. Employee lifecycle end to end (invite → activate → PIN → schedule → pay → archive)

**F9 · [Weak] · P0 — The 15-minute invitation expiry survives on the launch branch.** The database constraint `expires_at<=issued_at+interval '15 minutes'` is unchanged in `auth:db/migrations/0032_company_access_invitations.sql:116`. Everything the Oct 20 review said stands, and nothing has moved. Combined with Owner-only issuing and email-required claiming, onboarding a 20-person team the week of launch will fail in practice, not in theory. This is the single highest-friction item for the first real customer.

**F10 · [Missing] · P1 — No employee self-service PIN, and PIN issuance is invisible to the setup flow.** The only PIN surface is the manager-side page (`src/app/app/employees/[employeeId]/clocker-pin/page.tsx:27`); nothing in the employee Profile references a PIN (grep: no hits). An activated employee cannot see or reset their own Clocker PIN; every forgotten PIN is a manager interruption. Decide whether that's policy (fine — then say so in employee Profile) or a gap.

**F11 · [Missing] · P1 — Offboarding is still a boolean.** Re-verified: no `hire_date`, no separation date or reason anywhere in `db/migrations` (grep: zero hits). Deactivation guards exist and are careful (`src/app/app/employees/actions.ts:185` keeps the last Owner; `:191` handles inactive locations), but the record has no employment dates to hang tenure rules on (Ley 4-2017 pre/post-2017 hire flag, vacation accrual — both waiting on counsel anyway). **Still untraced** (flagged on Oct 20, still unanswered): what happens to a deactivated person's *future published shifts*. No code I found converts them to open shifts or warns the manager. Until someone traces it, assume published schedules silently keep a ghost. **QW:** write the trace up as a test before writing any feature.

**F12 · [Missing] · P1 — First run covers 2 of ~7 setup steps.** The Owner setup card tracks exactly two things: coverage periods and weekly hour targets (`src/components/owner-setup-card.tsx:34-57`, "of 2 done"), with a nice zero-location branch (`:48`). But a brand-new workspace also needs: add employees (or import — F5), invite them (F9), issue PINs, register a Clocker device (`src/components/clocker-setup.tsx` exists for the device side), create break types (none are seeded — no `INSERT` in `0014_clocker_breaks.sql` or `scripts/setup-company.mts`), and publish a first schedule. None of those appear on the card, so a new Owner discovers each missing precondition by hitting its error. **QW:** extend the existing card's `SetupSteps` to the full checklist; the component pattern is already built and tested.

---

## 7. Audit trail and history

**F13 · [Weak] · P1 — Time off is the audit hole in an otherwise strong record.** Corrections carry `decision_note` and an event log (`db/migrations/0016_time_corrections.sql:73`, `0017_missing_time_supersession.sql:349`); timecards carry revisions with an actor≠employee constraint (`0018_timecards.sql`). Time off still has only `reviewed_by`/`reviewed_at` (`0001_initial.sql:97-98`) — no reason, no event history, no cancellation record. Time-off denials are precisely the decisions that end up in DTRH or discrimination disputes. Match the corrections pattern.

**F14 · [Missing] · P1 — No employee timecard confirmation** (unchanged from Oct 20; the actor≠employee constraint forbids it by design). Worth restating here because F13 and F14 together mean the two most disputed record types are the two with one-sided evidence.

**F15 · [Missing] · P2 — No Owner-exportable activity log across domains.** The pieces exist per domain; no single export does.

---

## 8. Notifications

The engine is deeper than the docs suggest: reminders, daily summaries, deduplication, and quiet-hours deferral all exist and are tested (`src/lib/notifications/reminders.ts:14-19,146`; `src/lib/notifications/policy.ts:8,24-27` defers into a 21:00–07:00 PR window). Gaps against that strong base:

- **F16 · [Weak] · P2 — Quiet hours are a hard-coded literal.** `quietStartHour: 21; quietEndHour: 7` is a *type literal* (`src/lib/notifications/types.ts:51`), so no workspace or person can change it. Fine as a default; indefensible for a 24-hour location whose overnight shift sleeps by day.
- **F17 · [Missing] · P1 — Time-correction decisions never notify the employee.** `SourceKind` covers SCHEDULE, TIME_OFF, EXCHANGE, CALLOUT, AVAILABILITY, MANAGER_SUMMARY, COMMUNICATION and PAYROLL_* (`types.ts:14`); there is no correction kind, and grep finds no correction producer. An employee who disputes their hours hears the verdict only by checking manually — the worst flow to leave silent.
- **F18 · [Weak] · P1 — Preferences exist for managers only.** `auth:db/migrations/0033_management_alert_preferences.sql` adds topic preferences for management alerts; employees have no notification settings at all. Combined with the push-only channel (Oct 20 row 8, unchanged), an iPhone employee without the installed PWA gets nothing, and can't choose otherwise.

---

## 9. What this review confirms is solid (don't reopen)

Conflict detection at planning time (§5). The quiet-hours/reminder/summary engine (§8). Retired-view redirects that preserve week/day/location/person (`retired-views.ts`). Inbox filter state in the URL. The append-only correction/timecard/payroll custody chain. CI that runs tests, typecheck, lint, a source-bound build and dependency audits plus a dedicated Postgres Clocker job (`.github/workflows/ci.yml:34-53,64`). Deactivation guards for the last Owner. These are the trust assets; the gaps above mostly sit *around* them.

---

## Priority roll-up

| P0 (before launch) | P1 (first month) | P2 |
|---|---|---|
| F1 legacy views residue (QW) | F2 Lead definition · F4 phone clock decision · F5 import screen | F3 permissions matrix |
| F7 export OT caveat (QW now, split after counsel) | F6 deletion flow end-to-end · F8 meal rules · F10 PIN self-service | F15 activity export |
| F9 invitation expiry | F11 offboarding dates + future-shift trace (QW: the trace) | F16 configurable quiet hours |
| Spanish minimum or honest positioning (§4; QW: bilingual invite email + `lang`) | F12 full setup checklist (QW) · F13 time-off audit · F14 timecard confirmation · F17 correction notifications · F18 employee notification prefs | |

Quick wins total roughly two to three days: F1, the F7 warning line, the §4 email + `lang` fix, the F12 card extension, and the F11 trace test.
