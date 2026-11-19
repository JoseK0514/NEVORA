# Phase 5 "For Codex": backend fixes and reconciliation (Claude, Nov 17, 2026)

Jose reassigned this backend pass to Claude on Nov 17. Branch `claude-phase5-backend`, built on
`claude-codex-collab-nevora` at `e9d2ba4edf9800ddf8fb2e1036ffa3f29fb0fd7c` (the pushed Phase 5 tip; Development is
`22107a24272f2347bbb59a3da1f54319632772a5` and is an ancestor). Local commits only; nothing pushed or merged. Claude's
active Phase 6 Clocker files (`src/components/clocker*`, `src/app/clocker/**`, `src/app/app/settings/clocker/**`) were
not touched.

| Commit | What |
|---|---|
| `722babea` | Codex's `4687e455` (support-reference contract) cherry-picked unchanged, author kept |
| `a71dff5d` | Reset ends the sign-in pause; Support references on reset, activation and deletion; one cookie name |
| `71b4d032` | U10 test only (red on purpose) |
| `5cc1c838` | U10: a reminder refused by the activation hold answers `held` |
| `17a832b7` | Six web guides rebuilt from `5cc1c838` |
| this commit | This handoff and its evidence |

## Required fixes, done

| Item | Before | After | Proof |
|---|---|---|---|
| PB-030 reset during the sign-in pause | Asking for a reset worked during the 15-minute pause, but after resetting the person was still refused until the window ended. | The reset transaction clears that account's own per-ID counters (password limiter and the passkey/password fallback `login` limiter). Address budgets, other accounts, global caps and recovery budgets are untouched. A refused, expired or failed reset changes nothing. | 2 new SQL tests, red then green; account-recovery suite 20/20 |
| B10 Support reference, item 1 | Seam answered null. | Seam re-exports `readSupportReference` from `src/lib/support-reference.ts`; its test flipped. | `access-recovery.test.tsx` |
| B10 on reset and activation | 503s carried no header (routes not wrapped; services swallowed errors). | `/api/auth/reset-access` and `/api/auth/activate` log each unexpected failure once (route, UUID, error class, SQL state only) and return the UUID in `X-Nevora-Request-Id` on that 503. Refusals (400) carry none; a caller-supplied ID is ignored. | New `reset-access/route.test.ts`, extended activation route test, both red then green |
| B10 on deletion, item 3 | Server action had no way to return one. | `failed` and `uncertain` states carry `supportReference` when an exception was caught. `LAST_OWNER`, policy-off, busy, wrong password and a rolled-back `failed` carry none. | `actions.test.ts` 13/13 |
| PB-010 cookie name | `src/app/page.tsx` repeated `fuel_session`. | `src/lib/auth/session-cookie.ts` exports it; `session.ts` and the bare-domain page import it. Other server modules that repeat the name were left alone. | redirect units 226/226 |
| U10 item 6, hold | A press refused by the activation hold answered `unavailable/read_failed`, so the screen said "couldn't confirm" for a definite non-send. | The command answers `held/activation_held` when the hold refuses the reads or the queue write (the guard is inside that transaction, so nothing was queued). A hold met after the write committed stays `outcome_unknown`. `ManagerReminderResult` gains `held`; the U10 screen already parses it. | communications SQL 52 pass + 1 red at `71b4d032`, 53/53 at `5cc1c838` |

## Verified, no change needed

- **Recovery links.** The emailed link, the forced-replacement redirect and the helper's receipt (QR and Copy link) all
  carry the proof in the URL fragment only (`#proof=`); nothing puts it in a query string. The reset page strips it
  with `history.replaceState` on first read. `/forgot-access` and `/reset-access` send `Referrer-Policy: no-referrer`,
  `Cache-Control: no-store, private` and `frame-ancestors 'none'`. Proofs are single-use, 15 minutes, hashed at rest,
  and the isolated-mode envelope expires with them. Phase 5's one logic line (link-accepted state now set at every
  width, not only with mobile access on) only changes what is displayed; how the proof is read and sent is unchanged.
- **Redirects.** Sign-in only follows `safeReturnTo` allowlisted paths; the proxy stamps the return path from the
  request's own `/app` route and strips caller-supplied markers elsewhere; the bare domain checks only whether a
  session cookie is present. Operator-password browser suite (real login → `/reset-access#proof=` → reset → sign-in)
  passed at `5cc1c838`.
- **Reset 503 (item 5).** Not always before COMMIT: a lost reply after the credential transaction lands in the same
  catch. Keep the amber "not confirmed" wording; never say the password was unchanged.
- **Activation `invalid` for three cases (6), the offline check (7), the activation page reading the session (8), the
  server sentence lookup and the Spanish-only edit in `recovery/route.test.ts`:** fine as built.
- **U02:** a 503 `unavailable` on a command is always before the write (after that the route answers
  `outcome_unknown` with the operation ID); the workspace zone from `getWorkspace()` is the zone the server uses;
  `reason` is required (non-empty, ≤ 500 characters), so the stock reason is valid and is stored.
- **U03/U09:** on a coverage request `OPEN` means nobody yet and `MANAGER_PENDING` means someone picked it up, for rows
  made by current code. Older rows are not constrained by the schema.
- **U01:** a paid-time export `already_generated` writes nothing new (raised before the insert, same transaction).

## Required, not done here

| Item | Why it matters | Owner |
|---|---|---|
| mobile-access browser suite, 2 of 5 fail: the `.ma-language` pill is drawn at 36px (`auth-b.css:190`) with a 48px hit area from `::after`; the suite measures the element box and requires 44 | Blocks qualifying the combined source. Already failing at `e9d2ba4e`; passes 5/5 on Development `22107a24`. Either the pill becomes 44px or the suite measures the hit area: a design decision. | UI (Phase 5) + Jose |
| employee deletion browser suite fails: it clicks `#profile-account-deletion` and drives the pre-Phase-4 `.em-delete` screens; Phase 4 shows `#b-profile-account-deletion` and B2 screens | Blocks qualifying the combined source. Already failing at `e9d2ba4e`. The suite needs rewriting against the B2 screens. Also a small UI bug: the B2 "‹ Profile" back link goes to `#profile-account-deletion`, which is not the visible row's id, so focus doesn't return to it. | UI (Phase 4) |
| U01 item 8: `POST /api/payroll/runs` can answer 403 after the run committed (the replay re-reads the receipt under current authority) | The screen says "not saved" on 403. Either the server answers `outcome_unknown` when its replay is refused, or the screen says "not confirmed" on 403. | Backend, small |
| Rondo item 2: a 409 can follow a committed write (`stamp` after `store.execute`) | Reloading is right; the wording should be "may have saved", not "refused". | UI copy |
| Rondo item 1: every read renewal reserves an operation row against the 10,000 per-workspace cap, and nothing deletes them | Normal reviews slowly spend the cap; then business evidence answers 429 `limit` for the whole workspace. Needs a renewal that reserves nothing, or retention for spent operations. | Backend design + Jose |

## Optional features (not needed for correctness)

Passkey errors returning a reference beside the code (item 4); a reference on render errors (`supportReference` on
the error); a read that checks a reset code without spending it (PB-013); the Employee ID after a reset (PB-017, also
a policy call); a first-sign-in fact (PB-023); emails per the design request (PB-022); a return address after a
session expires naturally (PB-005); `complete:false` on `/api/manager/inbox-count` when the count is a minimum (U03 1);
U10 message text, last-reminded time, history, a schedule kind, a list eligibility read and a distinct "not queued"
reason; U02 list read, the older record's hours and actor display names; U01 a field for why a person is zero and a way
to attach the original file to corrected rows; Rondo publisher identity, a current-version fact on evidence and a
publish flag on map drafts.

## Policy decisions for Jose

- **Recovery budget sentence (U11 item 2).** The code allows 3 requests per account in each fixed 15-minute window
  (windows start at :00, :15, :30, :45), plus 300 per window company-wide. "Up to 3 times every 15 minutes" is exact;
  "wait 15 minutes" is the longest wait, not the usual one.
- Password rule (PB-026); revealing the Employee ID after a reset (PB-017); showing the signed-in person's first name
  on activation; the two proof sentences on sign-in; Spanish legal text; whether an empty Rondo map can be published;
  the supported next step for one person too big for a payroll file; the lease for a long paid-time review.

## Checks run (owned loopback Postgres 17, fictional data, no network calls, no email)

| Check | At | Result |
|---|---|---|
| account-recovery SQL | `5cc1c838` | 20/20 |
| passkeys SQL | `5cc1c838` | 38/38 |
| Phase E home SQL (sign-in limits) | `5cc1c838` | 47/47; the runner then exits 1 on "Owned resource observation failed" (its process observer is written for Linux) |
| Phase E communications SQL | `71b4d032` / `5cc1c838` | 52 pass + 1 fail (red) / 53/53 |
| operator-password browser | `5cc1c838` | 1/1 |
| step4 lifecycle acceptance | `5cc1c838` | passed: 18 stages, 48 matrix cells, 6,822 source hashes |
| mobile-access browser | `5cc1c838` / `e9d2ba4e` / `22107a24` | 3/5 / 3/5 / 5/5 |
| employee deletion SQL + browser | `5cc1c838` / `e9d2ba4e` | 24/25 / 24/25 |
| full units | `5cc1c838` | 14,943 pass, 1 fail (the manuals guard, before the rebuild) |
| manuals guard after rebuild | `17a832b7` | 57/57 |
| `tsc --noEmit`, eslint on changed files | `5cc1c838` | clean |
| `check:development-sources` | `17a832b7` | fails only on "Branch advanced: claude-codex-collab-nevora": the inventory records `4e0783ab`; remote is `e9d2ba4e` |

Logs: `evidence/` (ANSI stripped, gzip). Not run: WebKit/Firefox for anything but the suites above, a real phone, a
screen reader, a hosted environment.

## Where this lives, and the overlap with candidate 02

Delivered on `claude-codex-collab-nevora` as a fast-forward from `e9d2ba4e` (Jose approved, Nov 17), so it travels
with the held Phase 5 commits `7cc7547a` and `e9d2ba4e`. A separate branch briefly pushed as `claude-phase5-backend`
was deleted to keep the three-branch ceiling. The inventory in
`docs/handoffs/2026-10-21-development-assembly-sources.json` needs the collab branch's new head recorded as held.

Candidate 02 (`e7ed9923`, tag `candidate/backend-completion/20261117-claude-ui-integration-02`) wired the same seam
with a hardened `src/lib/support-reference.ts` (try/catch around the header read). `722babea` here carries the earlier
`4687e455` copy. When the two lines are combined, keep candidate 02's `support-reference.ts` and its seam comment; the
rest of this branch (pause release, route and deletion references, U10 `held`, `session-cookie.ts`) is not in
candidate 02.

## Qualification

The backend changes are qualified on their own suites. The combined source is **not** ready for Development: the
mobile-access and deletion browser suites fail because of Phase 4/5 UI, and the inventory needs the collab branch's
new SHA. Release sequence unchanged: integrate and verify on Development, then promote the exact verified release to
main only after Jose approves.
