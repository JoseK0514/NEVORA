# Claude → Codex: full report — October 21, 2026

Written by the Claude coordinator session after the development assembly ([#21](https://github.com/JoseK0514/NEVORA/pull/21), `f27216df`).
It builds on [`2026-10-21-development-assembly.md`](2026-10-21-development-assembly.md) and does not repeat it.

**The one-line version:**
- The UI work is all in `development`.
- Release is still **NO-GO**.
- What stands between today and a release is mostly backend, operations, payroll law and CI. That work is Codex's and Jose's.

**What to read with this report:**
- [Issue #19](https://github.com/JoseK0514/NEVORA/issues/19): the release follow-ups from the code inspection.
- [`docs/product/code-inspection-2026-10-21.md`](../product/code-inspection-2026-10-21.md) and its ten area reports.
- [`docs/product/specs/clean-manager/CODEX.md`](../product/specs/clean-manager/CODEX.md): backend items from the 50-reviewer inspection.
- [`docs/product/FIXED-AND-REMAINING.md`](../product/FIXED-AND-REMAINING.md).
- [`docs/product/reviews/gap-analysis-2026-10-20/`](../product/reviews/gap-analysis-2026-10-20/SUMMARY.md): business, market and UI gap reviews, added by this branch.

Facts marked **verified** were re-checked against `origin/development` (`f27216df`) while writing this report. Everything else is cited from the reports above.

---

## 1. Where the work is

### Already in `development` (via #21)

| Source | Contents |
|---|---|
| [#17](https://github.com/JoseK0514/NEVORA/pull/17) `claude/auth-premium` | Employee "Signature" app, phases 1–4 (Home, Schedule, Time off, Availability, Shift requests, swap and unable-to-work, Team updates, Corrections, Profile, My pay, error pages). Signature sign-in. Invitation activation, restyled with development's flow and wording unchanged. Signature Clocker. Approved Spanish sign-in lines. Compliance (policy pages, Delete my account, migration 0034). |
| Same branch, design system | `src/components/signature/tokens.css` (one `--sig-*` token set), `components.css`, `SigButton`, `SIGNATURE-SPEC.md`, and a `/ui-preview/signature` reference page. |
| Same branch, dark mode | "Midnight" v2: `tokens.css` dark block, `dark.css`, `src/lib/theme.ts`, and an Appearance switch in Profile. **Scope:** employee, sign-in and Clocker only; Manager and Owner stay light. **Storage:** client-only, per device (`localStorage` key `nv-theme`). **Contract change:** none. |
| [#18](https://github.com/JoseK0514/NEVORA/pull/18) `FIXING-RELEASE-DEV-NEVORA` | Sign-in limits and constant-time misses. Assisted-recovery scope (Managers help Employees and Leads only; Owners reset Managers). Six dropped push kinds fixed. Payroll interlocks. Deploy runbook. |
| [#20](https://github.com/JoseK0514/NEVORA/pull/20) `claude/sig-components-631f6c` | Shared buttons, a pending state that stays deep, press feedback, a light focus ring on the band, and iOS Safari fixes. |
| `claude/clean-manager` | Manager and Owner v3 plus the fixes from the 50-reviewer inspection. |
| Also included | `claude/review-combined`, `claude/saas-tenant-investigation`, `claude/preview-full-chain`, `claude/p35-profile-6cdee8`, and the D1–D4 tenancy fixes (see [`2026-10-21-claude-tenancy-fixes.md`](2026-10-21-claude-tenancy-fixes.md)). |

### Committed locally but not on GitHub (verified)

| Branch | Commits | What it is |
|---|---|---|
| `claude/upscale-quick-wins` | 22 | Owner and Manager UI quick wins (status ladder, search synonyms, Home, Insights, Timecards). Employee views are proven unchanged. |
| `claude/business-foundations` | 2 | Signed-out landing page, EN/ES. Production stays on the old redirect until `NEVORA_LANDING=on`. |
| `claude/clean-manager-docs` | 1 | Clean Manager and Owner spec and the approved v3 mockups. |
| `claude/bold-joliot-ec227c` | 1 | Five days old: Phase C browser QA scripts aligned with the then-current UI. Possibly superseded; check before using. |

None of these is merged. Pushing them is Jose's call.

### Not committed anywhere

The design boards and build screenshots live untracked in Jose's main checkout under `docs/product/specs/employee-style/**`. That includes the Clocker c4 boards, activation v3, the dark-mode boards and the phase-3/4 boards. Whether to add them to the repo is decision D11 in `SIGNATURE-SPEC.md`.

---

## 2. Release blockers (NO-GO)

| # | Blocker | Evidence | Owner |
|---|---|---|---|
| B1 | **Hosted CI cannot run.** Every job is refused: "The job was not started because an Actions budget is preventing further use." This affects #17's last four runs and #21's publication run. | Check-run annotations; #21 body | Jose (billing) |
| B2 | **Assembly open checks 1–5** (generation 175/176 classification, the Phase D `Device name` locator, the company-setup employee-form driver, the full restore rehearsal on the exact candidate, hosted CI). Checks 2 and 3 are UI-driver drift from the redesign; see §9. | [`2026-10-21-development-assembly.md`](2026-10-21-development-assembly.md) §Open release checks | Codex; Claude can take 2 and 3 |
| B3 | **Production database migrations.** Production is reported at about migration 0002. The release needs 0003 through 0035 in the runbook order, with a backup first. Numbers are reused (**verified**): 0023, 0024, 0025, 0026, 0027, 0031 (`native_payroll` / `workspace_presentation`) and 0032 (`company_access_invitations` / `workspace_words_modules`). There is no ledger of what production has applied. | `db/migrations/`; [`DEPLOY-RUNBOOK.md`](../product/specs/codex-joint/DEPLOY-RUNBOOK.md) | Codex (production database is Codex-only) |
| B4 | **The background workers are never scheduled** (**verified**). `notifications:worker` and `payroll:worker` exist in `package.json`. Nothing runs them: `vercel.json` holds only `git.deploymentEnabled: false`, with no crons, and no workflow schedules them. Reminders, push delivery and pay statements would never run in production. | `package.json:17,37`; `vercel.json` | Codex |
| B5 | **No server logging, error reporting, monitoring or alerting.** Every `catch` discards the error, so "it didn't save" leaves nothing to investigate. No restore has been rehearsed on the final candidate. | Issue #19 §Privacy and observability; CODEX.md item 3 | Codex |
| B6 | **The 2027 payroll ruleset is missing.** Native payroll stops at the first 2027 payday, so it must land before December. | `calculate.ts:40`, `pr-2026.ts:98-110` | Jose approves the figures; Codex builds |

---

## 3. Security and privacy

**Fixed and in `development` (via #18):**
- Sign-in attempt limits (10 per ID and 60 per client address per 15 minutes) and constant-time misses.
- Assisted recovery: a Manager can no longer take over another Manager's account.
- Password-change notice email.
- The six push kinds that were silently dropped.
- Retries now replace cancellation on transient workspace reads.

**Still open:**

| Issue | Evidence |
|---|---|
| Shift pickers send every employee's phone and email to the browser, including inactive people | Issue #19 |
| Swap pages show coworkers' Employee IDs, which are the sign-in identifier | Issue #19 |
| Pay-statement responses expose internal hashes | Issue #19 |
| Subscription encryption has no key-rotation path | Issue #19 |
| QA runners pass the whole shell environment through | Issue #19 |
| `updated_at::text` is used as a version token without a pinned TimeZone or DateStyle | Issue #19 |
| Owners and payroll staff have no second sign-in factor (passkeys exist; MFA is not required) | Business gap review |
| Invitations: only the Owner can invite, by email only, and a database CHECK limits each link to **15 minutes**, which cannot onboard a real team | `db/migrations/0032_company_access_invitations.sql` (CHECK `expires_at <= issued_at + 15 min`) |

---

## 4. Backend bugs reported by the inspections

1. **Owner and Manager Profile read always fails.** `/api/management/profile` returns `read_failed` and the error is swallowed. Two independent reviewers confirmed it. Check whether D2 ("failed authority read reported as denial") fixed it on `development`. If it still fails, it is the worst open user-facing bug. (CODEX.md item 1)
2. **Idempotency and versioning.** Time-off decisions, Publish and shift edits can silently overwrite each other. (CODEX.md item 4)
3. **Scale:**
   - row caps blank Home and Inbox at about 250 employees
   - Home makes about 95 database round trips
   - time reads are unindexed and unbounded
   - Timecards fails above 300 cards
   - 101 pending corrections blank the queue
   (CODEX.md item 5; issue #19)
4. **Locks.** Schedule writes snapshot about 25 whole tables under SHARE ROW EXCLUSIVE (`generation-guards.ts:7-70`). Read paths take blocking locks, and "My pay" contends with kiosk punches on payday. Missing indexes: `shifts(date)`, `schedules(week_start)`, `time_entries(location_id, clock_in_at)` and `push_deliveries(subscription_id)`. (Issue #19)
5. **One slow query returns a 500 for the whole Schedule page.** Reads should degrade one at a time. (CODEX.md item 10)
6. **Unplanned locations emit a 24-hour "open shift" every day**, which inflates counts. (CODEX.md item 7)
7. **Missing data for the UI:**
   - structured action items and a server-computed Needs-you count
   - location scope applied on every read
   - role and position data for the Timecards table
   - acknowledgement counts for Updates
   - push payloads that say what happened, in EN and ES
   (CODEX.md items 6, 9, 10)
8. **Time and attendance dead ends:**
   - no one can close an open time entry for a deactivated person, location or tablet, which blocks final pay
   - Managers can't file a correction for someone else
   - Owners and Managers can't see their own time
   (Issue #19)

---

## 5. Payroll and labour law (needs counsel or a CPA; Jose decides)

1. **Puerto Rico tax maths runs on an Owner waiver with no professional certification.** There is no 499R-2/W-2PR and no Christmas bonus (the Bono de Navidad window opens November 15). (`src/lib/payroll/native/provisional-policy.ts:7`)
2. **The hours export sends totals only.** It needs regular, overtime (Puerto Rico's daily overtime after 8 hours) and meal-penalty columns, plus paid and unpaid breaks. Depends on the Ley 379 rules pack, which needs counsel. (`src/lib/payroll-export/model.ts`; CODEX.md item 8)
3. **Exports are not exactly-once.** Re-exporting with a new operation ID creates a second receipt and CSV. (`payroll-export/service.ts:48-59`)
4. **Correction runs repeat the full net with no link to the original**, so exporting both pays twice. (`documents.ts:63-86`, `service.ts:456-497`)
5. **Time off has no leave types, balances or accruals.** Ley 180 applicability needs counsel. One market note: the part-time accrual rule came from Act 41-2022, which a court voided in 2023. (Market review)

---

## 6. Tests and CI

- `server-only` is undeclared, so 4 of 5 release-postgres suites could not start on the old `development`. Confirm the assembly fixed this.
- 49 of 123 integration files run in no CI configuration.
- `vitest.configurable-payroll-integration` fails 21 of 36 because its fixture lacks 0032. One timing-dependent test in `company-access-notification-producers` is flaky.
- The notification-worker CLI test (`src/test/notification-worker-startup.test.ts`, "rejects invalid arguments…") failed on `development` before #21.
- Local note: a stray `node_modules/server-only` stub makes the "react-server condition" test fail, so keep it out of worktrees.
- Locally, under parallel load, two `src/lib/tenancy/migrations/*backfill*` tests flake on timing. They pass alone (134/134).
- Nothing technical stops a red build from being promoted. Branch protection and required checks should enforce CI.

---

## 7. Product capabilities that are missing (build after Jose decides)

These are ranked by deal and churn impact (market review, with sources):
1. **Clock-in from the employee's own phone, with location recorded at the punch** (decision A20). All seven competitors have it. NEVORA clocks in only at the shared tablet. A phone widget exists (`src/components/time-clock-widget.tsx`) but nothing uses it, and the only clock-in endpoint is `/api/clocker`.
2. Store apps with native push, plus SMS and email fallbacks. Today alerts are web push only, so iPhone users who haven't installed the app miss changes.
3. Labour cost and budget on the schedule, with live overtime and missed-meal alerts.
4. Time-off balances and accruals (§5.5).
5. **Offline Clocker punches (B6).** This is a sales story for Puerto Rico outages; no competitor ships it.
6. Two-way team chat; new-hire paperwork and e-signature; a CSV staff import screen (`src/lib/imports/csv.ts` exists but only its test uses it); billing and subscriptions; multi-company sign-up (SaaS is paused, with one company per deployment); offboarding dates; an exportable audit log; Lead permissions that differ from Employee.

**Positioning from the market review:** "Puerto Rico's workforce app: Spanish first, PR law built in, every hour on the record." Full Spanish is about 8–11 engineering weeks; it is on sign-in only today, and backend copy (emails, push) is English.

---

## 8. Decisions only Jose can make

- Pilots versus finishing multi-company SaaS.
- Engage labour counsel (Ley 379, Ley 180) and a Puerto Rico payroll CPA (tax maths, 2027 figures, Christmas bonus, export columns).
- Phone clock-in (A20).
- Pricing: suggested about $39 or $79 per location per month with a 30-day trial.
- Browser floor: iOS 16 Safari.
- Signature spec decisions D1–D11, notably:
  - teal or green for "done"
  - the system font or bundled Inter
  - company branding (B1)
  - whether to commit the design boards (D11)
- Push the four local-only branches (§1).
- Raise the Actions budget (B1).

---

## 9. What Claude can take next (UI-owned and freeze-safe)

- Assembly open check 2: update the Phase D browser driver to the new Clocker settings markup (`dialog.getByLabel('Device name')`) without changing the behaviour it asserts.
- Assembly open check 3: update the company-setup employee-workflow driver to the rebuilt Manager employee form, keeping every account, session and authorization check.
- The real-iPhone check of the employee app, the Clocker, activation and dark mode, once Jose has a device session.
- Dark mode for Manager and Owner, after their clean-up settles (tokens are ready).
- The UI backlog in `FIXED-AND-REMAINING.md` §UI: inline Inbox decisions, Schedule keyboard grid, one component per control, copy glossary, CSS debt.

Claude does not touch server behaviour, migrations, production data, workers or deployment. Those stay with Codex.

---

*Prepared from: issue #19, PR #18, PR #21 and its assembly handoff, the October 21 code inspection, the 50-reviewer `FIXED-AND-REMAINING.md` and `clean-manager/CODEX.md`, the four senior reviews, and the October 20 gap analysis. The verified facts were re-checked against `origin/development` `f27216df` on October 21, 2026.*
