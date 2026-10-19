Rolling release work: candidate recreated from coordinator `634795d`; backend `31ec698` merged as `29ebdc5` using the exact coordinator-published layout resolution. Candidate-only lint fix is separate commit `2fafc1a`. Validation is in progress on `2fafc1a`; not pushed yet. No chat has a verified zero exit round. Wave A round 2 (exit), Wave C round 3 and Profile round 4 await complete inspections. No deployment or device exposure.

# NEVORA cloud inspection status

Reports branch: `codex/inspections`. Jose's October 19 rolling-merge instruction authorizes merges and pushes to `codex/release-candidate`, plus exactly the three listed candidate-only UI fixes. Source branches remain read only. No `main` or `claude/*` merge/push, deployment, tunnel or device exposure is authorized. This supersedes the earlier inspection-only boundary and rehearsal order.

## Rolling release candidate

- Prior rehearsal remote head: `bec0ed4e64be7a4db3351973e1dc9993eeb90e8b` (base + Profile, unvalidated). Its history is recorded in [the retained rehearsal report](release/bootstrap/rehearsal/RELEASE-CANDIDATE-2026-10-20.md); [the earlier rehearsal evidence](release/bootstrap/rehearsal/MERGE-REHEARSAL-2026-10-19.md) is also preserved verbatim. Historical paths and results there belong to those older sessions, not this workspace or candidate.
- New base refreshed to `claude/premium-phase-1` at `634795d50e0f82ef6229a94703cea599d5c2d1a9`. Recreated without carrying the unverified Profile merge forward. Latest coordinator `portal-premium.css` is authoritative, including when an incoming branch merges cleanly with an older snapshot.
- Backend `31ec6988446607651031c6412b2c9f4c8ccce402` merged as `29ebdc5160c86b37c93e99dce5f5459450e28896`, followed by lint-only `2fafc1aa84f43a120d2f8fff4c3855ebf4b15dcf`. Current candidate source: `/workspace/nevora-release-candidate`. Earlier unpublished bootstrap `a08814c` is retained locally on `codex/rolling-superseded-a08814c`; its checks never count for the new SHA.
- Merge only an immutable SHA whose own full exit round is zero in all five areas, or whose `ROUND.md` explicitly says `status: zero` and names an exit round whose five reports confirm zero. A request to run an exit round is not a zero verdict. Recheck any later push before merging it.
- After every clean merge: locked install, TypeScript, lint, full Vitest; unchanged `checks.mjs` on the chat routes and Home/Inbox plus an opened More sheet for every role; five combined reports under `release/merge-<n>-<chat>/` naming fix owners. Push the candidate and add the required timestamp/test/check/P0-P2 line here. Unknown or incomplete evidence is never zero.
- Merge readiness currently: 0/6 verified. Profile initial wiring waits for both Profile and backend; dead CSS cleanup waits for Wave C and a `src/` class-use search. Final every-page/five-area sweep, build, full tests and `test:dev:production` wait for all six chats.

## Conflicts for Claude

**Resolved by coordinator at `634795d` — backend / coordinator, `src/app/layout.tsx`.** Merge input branches are `claude/premium-phase-1` at `fa7a09b07ddc1ffe179110b0fdc41715a1714b09` (candidate side) and `codex/premium-backend` at `31ec6988446607651031c6412b2c9f4c8ccce402` (incoming). Coordinator side: synchronous `RootLayout`, `TEXT_SCALE_SCRIPT`, `suppressHydrationWarning` and a head script that measures root text size for placeholders. Backend side: asynchronous `RootLayout` and the development-only `forceInspectionError('global')` hook. Full unmodified sides: [coordinator](release/bootstrap/conflicts/layout-coordinator.txt), [backend](release/bootstrap/conflicts/layout-backend.txt). Initial attempt chose no side and was aborted. The coordinator then published [the complete prescribed resolution](release/bootstrap/conflicts/coordinator-resolution-634795d.txt), explicitly for this candidate. Merge `29ebdc5` copies the code below that file’s comment block verbatim, retaining both sides without an independent screen choice. Validation remains pending; the initial aborted attempt has no merge result.

The older Wave A swap-summary conflict is retained in the rehearsal report. Coordinator `fa7a09b` explicitly hands that component back to Wave A; the next eligible Wave A merge must still verify that resolution without choosing a screen version here.

## Device pass access

**Proposal only; pending Jose's approval. Nothing deployed or exposed.** Safest short phone pass: a temporary HTTPS tunnel restricted to Jose's authenticated identity, forwarding only to a loopback production-mode candidate build on an owned fictional PostgreSQL database. Use the normal Secure session cookie over HTTPS. First verify the build SHA, owned database identity and synthetic seed; supply only temporary test credentials and a fresh session secret, no production environment/secrets. Keep real SMTP/push delivery disabled; use local capture where the production gate allows it, otherwise keep delivery off. Do not enable development-only capture or error switches in production mode.

Cost: no new hosting/database resource or paid plan proposed; existing approved/free tunnel access may have a $0 incremental fee, while the running development machine/cloud session still costs its usual usage. Provider/plan eligibility and any fee must be verified before approval is exercised; no purchase or upgrade authorized. Exposure: the authenticated tunnel provider processes traffic and the phone can reach this synthetic app, including its normal authenticated routes. The local database port, filesystem and other services are not forwarded. A tunnel without an access restriction for Jose is not this proposal.

Teardown: revoke the tunnel/access rule, stop the local app and its owned database, delete temporary capture/session/credential files and synthetic database after the pass, and confirm the HTTPS URL is unreachable. Preserve sanitized inspection evidence and candidate SHA. Alternative if an approved identity-restricted tunnel is unavailable: a separate protected Vercel preview project with an independently seeded fictional database, no inherited production secrets, and delivery off/captured. That alternative needs an environment/cost inventory and Jose's explicit approval before project/database creation or deployment.

## Queue (priority order)

| Chat | Branch | Fetched head | Handoff |
|---|---|---|---|
| Phase 3 | `claude/premium-phase-1` | `634795d50e0f82ef6229a94703cea599d5c2d1a9` | `ROUND.md` absent; not inspected |
| Wave A | `claude/p35-wave-a-1283c8` | `c05e0c7cd703fbf19e05e60bb4d488e1d9b19bb0` | round 2 (exit), queued first |
| Wave B | `claude/p35-wave-b-808dfd` | `b0e051a951642ff34692604147fcd76ba805a3e7` | `ROUND.md` absent; not inspected |
| Wave C | `claude/p35-wave-c-93e13c` | `b109ec3fea10418fb9f5c9da2af0a1e561dc2678` | round 3, queued second |
| Profile | `claude/p35-profile-6cdee8` | `829dfe6cf45beb71b77db573c0263c60a5f69856` | round 4 recheck; exit round 5 still needed |
| Desktop | `claude/p4-desktop-240fe0` | `578748d705b941d14f37c0b01bfcfb1332343e31` | `ROUND.md` absent; not inspected |

## Inspection results

No completed cloud rounds. Severity counts are unknown until inspection; missing handoffs are not UI defects and are not a zero verdict.

Start each round from the exact commit in its handoff. Round 1 and exit rounds require all five full sweeps. Later rounds re-check earlier finding IDs and touched surfaces; automated checks still run the full matrix each round. Refresh the coordinator brief and tooling from `claude/premium-phase-1` before each round.

## Boundaries

All page submissions must be answered, held or aborted in the browser. Only fictional preview seeding and sign-in are permitted outside that interception. Passwords and browser storage states stay outside this branch. Simulator keyboard checks and Jose’s real-device pass remain on the Mac.

## Poll log

2026-10-19 18:01:09 UTC · all six branches fetched · no `ROUND.md` handoffs available
2026-10-19T18:08:18.138164+00:00 · all six branches fetched · Wave A round 2 and Wave C round 3 available; others await handoffs
2026-10-19 18:18:49 UTC · queue fetched · Wave A round 2 explicitly retargeted to c05e0c7; prior preview stopped and preliminary checks superseded · other handoffs unchanged
2026-10-19 18:22 UTC · Wave C round 3 on b109ec3fea10418fb9f5c9da2af0a1e561dc2678 · P0 0, P1 1, P2 0 · not zero

2026-10-19 18:37 UTC · queue fetched · coordinator 634795d supplied the exact root-layout resolution; 0/6 verified zero handoffs
