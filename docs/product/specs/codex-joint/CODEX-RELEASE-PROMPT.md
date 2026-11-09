# Codex: NEVORA release on October 20. First your review, then your work, both local and cloud

Hi Codex. Jose is sending you this. NEVORA's premium UI rebuild goes to **production tomorrow, October 20, 2026**. Claude has rebuilt the UI in six parallel chats on Jose's Mac and is driving them to zero defects today.

You own the backend: server routes and actions, SQL, `src/lib/data/*`, auth, payroll calculations, notifications and email, migrations, the deploy, and the local database tooling. Claude owns the UI.

**Two things are needed from you:**
- **First,** review this plan and reply to Jose with the "Your reply" section at the end.
- **Then,** do the work: Part A on Jose's Mac and Part B in the cloud, at the same time if you can.

## Ground rules (all parts)

**Branches:**
- Work only on your own branches: `codex/local-unblock` on the Mac, `codex/premium-backend` in the cloud. Cut both from `claude/premium-phase-1`.
- Commit locally or push only your own branch. Never merge, never push to anyone else's branch, never deploy, without Jose's explicit go.

**Files you must not edit:**
- UI: `src/components/**` (the kit included), page and layout JSX in `src/app/app/**`, any `.css`, `docs/product/reviews/**`.
- If a backend change needs UI wiring, write exactly what's needed for Claude.

**Data:**
- Fictional data only. Nothing goes to a real person: no real email, SMS or push.
- Never print or commit a password or secret. Preview passwords live in `<PREVIEW_OUT>/evidence-*/access.json`; read them from the file only.

**Contracts and wording:**
- Keep existing server behaviour and data contracts. Flag any contract change or migration before making it.
- Payroll and legal wording needs Jose's approval. Don't change it.

**Context to read** (on `claude/premium-phase-1`, already pushed to GitHub, `JoseK0514/NEVORA`):
- `docs/product/specs/codex-joint/HANDOFF.md`:
  - section 1: Jose's revised plan, with "Set aside for joint testing with Codex"
  - section 2: backend changes flagged earlier
  - section 3: how the six UI chats, their previews and test data work
  - section 4: each chat's backend needs (their `CODEX.md` files)
- `docs/product/specs/codex-joint/CODEX-LOCAL-PROMPT.md` and `CODEX-CLOUD-PROMPT.md`: earlier, more detailed versions of Parts A and B. This prompt replaces them where they differ.
- On the Mac only: `docs/product/reviews/premium-direction-2026-10-18/RELEASE-2026-10-20.md`, the release checklist.

**Branches in flight** (only `claude/premium-phase-1` is pushed; the others will be pushed as each is ready, and Jose will tell you):

| Branch | What it is |
|---|---|
| `claude/premium-phase-1` | Phase 3 (Employee and Lead), the shared kit, and the coordinator |
| `claude/p35-profile-6cdee8` | The new Owner and Manager Profile page |
| `claude/p35-wave-a-1283c8` | Shift forms, Coverage, Copy week, the manager Time-off list, Shift requests, Availability, Team member detail, New employee, Clocker PIN, the employee Swap and "Unable to work" forms |
| `claude/p35-wave-b-808dfd` | Insights, Templates, Scheduling rules, Update detail and Compose, Payroll settings, Payroll runs for managers |
| `claude/p35-wave-c-93e13c` | The Settings hub and every Settings page, Account recovery, Clocker recovery |
| `claude/p4-desktop-240fe0` | Desktop layout of the Manager and Owner pages |

A dry-run merge of all six on October 19 was clean. The one exception is `src/app/app/portal-premium.css`, where you keep the coordinator's version. There were no type errors.

## Part A: local, on Jose's Mac (now)

Everything here needs the live local previews and databases, so it can't run in the cloud. The Mac is heavily loaded (load average around 20–30): run one preview of your own, and one browser at a time. Never stop, restart or write to the six chats' previews. Never edit their worktrees. Never edit files the running previews load: `src/test/integration/*` in the main checkout, or `.claude/parallel/**`. Put changes for those in your branch, with an exact patch.

### Your own preview

From the main checkout `/Users/josek0514/Desktop/NEVORA-UI-READINESS`:

```
PREVIEW_OUT=/tmp/codex-preview node --import tsx .claude/parallel/preview/preview-runtime.mjs   # background; prints PREVIEW_READY <url>
PREVIEW_OUT=/tmp/codex-preview node --import tsx .claude/parallel/scripts/seed-extra.mts
PREVIEW_OUT=/tmp/codex-preview node .claude/parallel/scripts/login.mjs AUDIT-E AUDIT-SWAP AUDIT-M QAOWNER
```

**Finding the database:**
- The database name is `identity.name` in `<PREVIEW_OUT>/evidence-*/owned-next-*/ownership.json`.
- Its cluster is `/private/tmp/nevora-ui-preview-<first 10 hex characters of the name's 12-character suffix>`.
- The port is line 4 of `data/postmaster.pid`. The user is `nevora_audit`, with no password.

**Running your branch's code:** `sh .claude/parallel/scripts/sync.sh <your worktree> /tmp/codex-preview`.

### A1. The swap blocker (first: it blocks a release flow)

**The symptom:** signed in as `AUDIT-E`, `/app/exchange/swap?sourceShiftId=audit-next-0-1` shows "No shifts to swap". No fictional employee is ever offered a swap target.

**What's known:**
- `listSwapTargets()` (`src/lib/data/exchanges.ts`) returns candidates, including `AUDIT-SWAP`, who works only next Saturday and Sunday (`x-swap-5`, `x-swap-6`).
- The page (`src/app/app/exchange/swap/page.tsx` around lines 46–57) drops them all, through `readShiftChangeTerms()` or `readShiftChangeAvailability({kind:'PROPOSE_SWAP'})` in `src/lib/data/shift-changes.ts`.
- The policy is `AUTOMATIC_WHEN_VALID` with 0-minute advance for swap and coverage.

**What to do:**
- Find the exact refusal.
- If it's test data, give the exact rows or helper calls for `seed-extra.mts`. Claude owns that file and will add them.
- If it's a server bug, fix it with tests.
- Prove a valid pair exists on your preview.

### A2. Previews failing under load

**The symptom:** under parallel load the dev server answers reads with HTTP 500: statement timeouts, or "Workspace configuration is unavailable" (seen on `/app/schedule` and `/api/manager/attendance`).

**What to do:**
- Reproduce it on your own preview with 8–12 parallel loads.
- Find the cause in `src/test/integration/owned-pg-transport.ts`, `local-postgres.ts`, `.claude/parallel/preview/owned-preview-app-dev.ts`, or the workspace configuration read.
- Propose the smallest local-only change: pool size, timeouts, connection reuse. Say when it's safe to apply to the running previews (at each chat's round break).
- Also tell Jose whether production could hit the same failure under real load. That matters for tomorrow.

### A3. Snapshot and restore for the joint submission tests (needed tonight)

Joint testing before the release includes real submissions on fictional data: Save, Approve, Decline, Publish, Submit, Delete, Copy week. Write a script that snapshots a preview's database right after seeding and restores it on demand, keyed by `PREVIEW_OUT`.

Before touching any database, prove it belongs to that preview, exactly as `seed-extra.mts` does:
- `ownership.json`'s root is under `PREVIEW_OUT`
- the database name matches the pattern
- the cluster's `owner` marker matches

A reset once hit the wrong database, so this check is required. Test it only on your own preview.

### A4. Run the joint tests with Claude tonight

Once each chat reaches zero, you and Claude run the joint tests on a seeded preview. Claude drives the screens; you verify what the server saved, sent and returned, and reset between runs with A3.

| What | Where |
|---|---|
| Every submission's real outcome | Every page with an action |
| Session expiry and lost access mid-use | Any signed-in page |
| Recovery emails and push notifications | Captured locally (B4) |
| CSV export contents | Time exports, Insights |
| The Owner and Manager Profile data (B2) | `/app/profile` as `QAOWNER` and `AUDIT-M` |
| The swap flow end to end (A1) | `/app/exchange/swap` |
| Server error screens (B3) | Through the dev-only switch |

Write each result in the release checklist's joint-testing list. Use pass, fail with details, or "deferred by Jose".

## Part B: in the cloud (now, from `claude/premium-phase-1`)

### B1. Tests, types, lint and a production build for each branch

Jose's Mac times out tests under load. As each branch is pushed, run:

```
npm ci
npx tsc --noEmit -p .
npx eslint src
npx vitest run
npm run build
```

Run the Postgres integration suites too, if your environment has Postgres; see `package.json`. `npm run build` matters most: only the dev server has run so far.

**Report per branch:**
- pass and fail counts
- each failure with its error
- whether each failure is backend (fix it on your branch) or UI (report it for that chat)

**After the merge:** run all of this on the merged `claude/premium-phase-1` tonight. That's the release candidate.

The known lint error at `src/app/app/exchange/swap/page.tsx:51` is being fixed on the Wave A branch.

### B2. Owner and Manager Profile data

The contract is in `docs/product/specs/p35-profile/CODEX.md` on `claude/p35-profile-6cdee8`. It's also copied into HANDOFF.md, section 4.

**What to build:** a read of the signed-in Owner's or Manager's own name, contact, role and work locations, and their notification settings.

**How:**
- Follow the existing session, proof and authorization patterns in `src/lib/data/*` and `src/lib/auth/*`.
- Return only the signed-in person's own data.
- Write tests: an Owner, a Manager, someone with no locations, and an expired session.
- Write down the exact function or route for the UI to call.

### B3. Dev-only error switch

**What it does:** forces each server-rendered error state live, so it can be inspected:
- the root error screen (`src/app/error.tsx`, `global-error.tsx`)
- the in-portal error page (`src/app/app/error.tsx`)
- Home's dashboard-read failure (`src/app/app/page.tsx`)

Use a cookie, for example `nv-force-error=root|portal|home-read`.

**It only works when all three hold:**
- `NODE_ENV !== 'production'`
- an explicit env flag, for example `NEVORA_DEV_FORCE_ERRORS=1`
- the request comes from `localhost`, `127.0.0.1` or `[::1]`

**It must never ship:** keep it behind code the production build removes. Add a test that runs a production build and fails if the cookie name or the env flag appears anywhere in the output. Keep any hook in the error-page JSX to one line, and describe it.

### B4. Local capture of email and push, dev-only

- **Email:** nodemailer (`src/lib/auth/recovery-delivery.server.ts`) writes `.eml` files to a local folder instead of sending.
- **Push:** web-push (`src/lib/notifications/provider.ts`; endpoint checks in `src/lib/notifications/subscription-service.ts`) writes payloads as JSON to a local folder.

Gate both exactly like B3. With the flag off, production delivery must be unchanged. Write tests for the gate, one captured email and one captured push, and explain how to turn them on for a local preview.

### B5. The chats' other backend needs

Work through each chat's `CODEX.md` (HANDOFF.md, section 4), including:
- D-5: return to Inbox after a decision
- the Inbox count on every page

For each: build it against its contract, write tests, and note what the UI must wire up.

Mark anything that can't be safely done and tested before tomorrow as **after release**. Skip anything that needs a product decision and list it for Jose.

### B6. Review Claude's server-side edits (release blocker)

Report anything that affects a contract, an export, a payroll file or another consumer.

- **Commit `d462f54`, approved by Jose:**
  - `src/lib/data/requests.ts` adds `reviewedAt` and `reviewerName`: `r.reviewed_at`, plus a `LEFT JOIN employees rv` that names the reviewer only when it isn't the requester.
  - `src/lib/payroll/calendar.ts` adds `openPeriod()`.
  - `src/lib/payroll/pay-calendar.server.ts` adds `currentPayPeriod()`. It reads only `payload->'preferences'->'schedule'`, and returns null when payroll is off.
- **Display only:**
  - `formatRecordedHours()` (`src/lib/timecards/project.ts`) and `formatRecordedDuration()` (`src/lib/employee-time.ts`) now use `durationText()` (`src/lib/duration-text.ts`): "0h", "37m", "8h", "8h 30m" instead of "8h 0m". Check whether any CSV, payroll export or report consumes these.
  - `emptyScheduleLabel()` (`src/lib/data/employee-schedule.ts`) returns "–" for an unavailable day.

### B7. Release readiness (your side)

Write a short runbook for tomorrow:
- how this repo deploys to production (host, branch, command or pipeline)
- any migrations or environment variables the release needs, including any from B2–B5
- how to roll back
- what to watch right after the deploy

Don't deploy. Jose gives that go himself.

## Your reply to Jose (before you start, then as items land)

1. Which items you can finish **tonight**, which **before tomorrow's deploy**, and which should be **after release**, with a time estimate for each.
2. Any backend risk to tomorrow's release, for example A2 under production load, a needed migration, or a B6 contract issue.
3. What you need from Jose or Claude: branch pushes, access, decisions.
4. Anything missing from this plan that a production release of these changes needs.

Write results to `docs/product/specs/codex-joint/README.md` on your branch, and give Jose the branch name and commit as each item lands.
