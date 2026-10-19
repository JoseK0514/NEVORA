# Codex in the cloud: backend work and test runs for the premium UI rebuild

You're Codex, working in the cloud on NEVORA (Next 16 / React 19, Postgres). The GitHub repository is `JoseK0514/NEVORA`. Work from branch `claude/premium-phase-1`.

**What's going on:**
- You own the backend: server routes and actions, SQL, `src/lib/data/*`, auth, payroll calculations, notifications and email delivery.
- Claude owns the UI. Six Claude chats on Jose's Mac are rebuilding every screen in parallel, each on its own branch.
- Your job is to build the backend pieces those screens need, make more of the inspection checklist testable today, and run the heavy test suites off the Mac.

## Rules

- **Your branch.** Create `codex/premium-backend` from `claude/premium-phase-1`. Push your branch, and open a draft pull request into `claude/premium-phase-1` only when Jose asks. Never merge, deploy or push to anyone else's branch.
- **Files you must not edit:**
  - `src/components/**` (including the kit in `src/components/kit/`)
  - page and layout JSX in `src/app/app/**`
  - any `.css` file
  - `docs/product/reviews/**`

  If a backend change needs UI wiring, write down exactly what is needed, and Claude will do it.
- **Data and secrets.** Use fictional data only. Nothing is ever sent to a real person: no real email, SMS or push. Never commit secrets or passwords.
- **Contracts.** Keep existing server behaviour and data contracts. If an item needs a contract to change, write it down and flag it before changing it.
- **Wording.** Payroll and legal wording needs Jose's approval. Don't change it.
- **Pace.** Small commits, each with tests.

## Read first (on `claude/premium-phase-1`)

- `docs/product/specs/codex-joint/HANDOFF.md`: Jose's revised plan (section 1, including "Set aside for joint testing with Codex"), the backend items flagged earlier (section 2), how the six UI chats work (section 3) and each chat's backend needs (section 4).
- `AGENTS.md` and `CLAUDE.md` at the repository root.

## Work, in this order

### 1. Test runs for each branch

The six branches must each pass the full suite before they can finish. Jose's Mac is too loaded to run those reliably: tests time out at 5 s under load.

When Jose pushes a branch, check it out and run:

```
npm ci
npx tsc --noEmit -p .
npx eslint src
npx vitest run
```

The default config skips the Postgres integration suites. Run those too if your environment has Postgres, using the scripts in `package.json`.

The branches:
- `claude/premium-phase-1`: Phase 3 and the shared kit
- `claude/p35-profile-6cdee8`
- `claude/p35-wave-a-1283c8`
- `claude/p35-wave-b-808dfd`
- `claude/p35-wave-c-93e13c`
- `claude/p4-desktop-240fe0`

Report per branch: pass or fail counts, each failing test with its error, and whether the failure is backend (yours to fix on your branch, with a note) or UI (report it for that chat).

The one known lint error, at `src/app/app/exchange/swap/page.tsx:51` ("Cannot reassign variable in async function"), is being fixed by the Wave A branch.

### 2. Owner and Manager Profile data

The Profile chat built a Profile page for Owners and Managers on branch `claude/p35-profile-6cdee8`. Its contract is in that branch at `docs/product/specs/p35-profile/CODEX.md`.

Build the read it needs:
- the signed-in Owner's or Manager's own name, contact, role and work locations
- their notification settings

Follow the existing session, proof and authorization patterns in `src/lib/data/*` and `src/lib/auth/*`. Return only the signed-in person's own data. Write tests for an Owner, a Manager, someone with no locations, and an expired session.

**Done when:** the read exists with tests, and the exact function and route names are written down for the UI to call.

### 3. Dev-only error switch

The inspectors need to see every server-rendered error state live:
- the root error screen (`src/app/error.tsx`, `src/app/global-error.tsx`)
- the in-portal error page (`src/app/app/error.tsx`)
- Home's dashboard-read failure (`src/app/app/page.tsx` renders a kit failure page when `loadManagerDashboardData` fails)

Add a switch that forces each state from a cookie, for example `nv-force-error=root|portal|home-read`.

**It must be impossible in production.** It works only when all three hold:
- `NODE_ENV !== 'production'`
- an explicit env flag such as `NEVORA_DEV_FORCE_ERRORS=1`
- a request from `localhost`, `127.0.0.1` or `[::1]`

Keep the code behind a constant that the production build removes. Add a test that runs `next build` with `NODE_ENV=production` and fails if any trace of the switch (the cookie name or the env flag) is in the build output.

Error-page JSX is UI. If the switch needs a hook in it, keep the hook to one line, and describe it.

**Done when:** the switch, the production-absence test, and a short how-to (the cookie values and the env flag) are written up.

### 4. Local capture of email and push, dev-only

- **Email:** recovery email goes out through nodemailer (`src/lib/auth/recovery-delivery.server.ts`). Add a dev transport that writes each message as an `.eml` file to a local folder instead of sending it.
- **Push:** push goes through web-push (`src/lib/notifications/provider.ts`; `validatePushEndpoint` lives in `src/lib/notifications/subscription-service.ts`). Add a dev transport that records each payload as JSON to a local folder, instead of calling a push service.

Gate both like item 3: never in production, an explicit env flag, local only. Production delivery code must be unchanged when the flag is off. Add tests for the gate and for one captured email and one captured push.

**Done when:** both transports, the tests, and how to turn them on for a local preview are written up.

### 5. The chats' other backend needs

Work through the remaining items in each chat's `CODEX.md`. The contents are collected in `HANDOFF.md`. They include:
- D-5: return to Inbox after a decision
- the Inbox count available on every page
- the other reads the chats list

For each item, build it against the written contract with tests, and write down what the UI must wire up. Skip anything that needs a product decision; list it for Jose instead.

### 6. Review Claude's server-side edits

These are already on `claude/premium-phase-1`. Review them and report anything that affects a contract, an export, a payroll file or another consumer.

- **Commit `d462f54`** (Jose approved it):
  - `src/lib/data/requests.ts` now returns `reviewedAt` and `reviewerName`. It adds `r.reviewed_at` and a `LEFT JOIN employees rv` that gives the reviewer's name only when the reviewer isn't the requester.
  - `src/lib/payroll/calendar.ts` adds `openPeriod()`.
  - `src/lib/payroll/pay-calendar.server.ts` adds `currentPayPeriod()`. It reads only `payload->'preferences'->'schedule'` and returns null when payroll is off.
- **Display-only:**
  - `formatRecordedHours()` in `src/lib/timecards/project.ts` now uses `durationText()` from `src/lib/duration-text.ts`, so it shows "0h", "37m", "8h", "8h 30m" instead of "8h 0m".
  - `formatRecordedDuration()` in `src/lib/employee-time.ts` does the same.
  - `emptyScheduleLabel()` in `src/lib/data/employee-schedule.ts` returns "–" for an unavailable day.
  - Check whether any CSV or export uses these formatters.

## Report

Keep `docs/product/specs/codex-joint/README.md` on your branch up to date: per item, what changed, the files, the tests run with their results, and what Claude must wire up.

Tell Jose as each item lands, with your branch name and commit. Claude does the UI wiring and the joint browser tests on Jose's Mac afterwards.
