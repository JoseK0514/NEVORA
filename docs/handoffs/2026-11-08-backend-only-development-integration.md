# Backend-only development integration — November 8, 2026

Owner: Codex/root. Jose authorized moving the remaining backend logic into
development while Claude retains UI ownership. This handoff is initially a local
verification checkpoint; shared integration/CI results are recorded below when observed.

## Source and scope

- Fresh development base: `e2872f30ea8548b1310ea4a9b25813352decf82a`.
- Selected collaboration snapshot: `d349b66196c847fdb46852a3db0c0630463295c5`.
- Detached implementation worktree:
  `/Users/josek0514/.codex/worktrees/nevora-backend-dev-20261108/nevora-native-employee-owner-20261101`.
- Backend changes: pending incoming swaps are not duplicated in own recent
  requests; the action center includes canonical previous-week timecards with
  their exact period links; coverage items expose optional end timestamps and
  helpers can consume an explicit workspace-local clock.
- No UI component/page/style/navigation/copy/harness, schema, provider, native
  project, package/lock or production configuration is changed.

The [JSON inventory](2026-11-08-backend-only-development-integration.json)
classifies all 289 collaboration-delta paths. The collaboration head remains
**held**, with partial backend extraction documented; it is not merged wholesale.
The original native worktree and its local operational evidence remain intact.

## Compatibility and corrections

Existing no-clock helper calls retain their old behavior. The new server badge
clock activation in `src/lib/data/inbox-count.server.ts` remains held until
Claude's Home/Inbox consumers pass the same clock. Activating just that server
call would make current UI counts disagree. UI integration belongs to Claude.

The exact source extraction failed four new regressions: previous-week validity
was omitted from the aggregate (including expiry during loading), a still-active
overnight gap was classified as past, and `24:00` was not normalized to next-day
midnight. Those cases were corrected without weakening assertions or guards.
The internal pure combiner consumes a card collection rather than labelling
mixed-period cards as one canonical-period DTO. Public response envelopes and
canonical per-card source/period identities remain unchanged.

## Evidence actually obtained

- Baseline: 28 focused unit tests and four existing SQL view cases passed.
- Requests: regression reproduced the duplicate through actual guarded SQL
  commands; three unit checks and 39 related SQL cases passed after correction.
  Sender history and recipient decided history remain visible.
- Action center: 40 focused unit checks and seven actual SQL cases passed,
  including prior-period links, canonical approval/finalization, failed-source
  refusal, current role loss, logout and session expiry.
- Deterministic reader-I/O tests cover the shorter previous-period lifetime.
  Those tests do not claim real SQL authorization; the separate unmocked owned
  SQL cases exercise that boundary.
- TypeScript, whole ESLint and the production-mode build passed without inherited
  database/provider settings. Full default unit suite: **10,993 passed, 801
  existing skips, 0 failures**, 545.589 seconds at e4a3c160. Skips did not pass.
  The source gate passed: 73 classified sources, three active branches and exact
  archive/included-source custody. These are the pre-review qualification results;
  the author repair results below supersede them for the final candidate.

Failed fixture attempts are retained. The first new Requests SQL case tried a
second simultaneous database at the same selected name; the ownership guard
correctly refused it. The case was moved to the existing per-case fixture. The
new cancellation assertion was corrected to the existing `closed` command
contract, and the duplicate was reproduced again on unchanged implementation
before the final green run. No existing assertion or database guard was changed.

All SQL runs used newly created ownership-marked loopback PostgreSQL17.10
clusters with fictional data; each cluster stopped. No existing/customer
database, real message provider or running staging service was used. Private raw
logs and command receipts are retained at the runtime path in the JSON inventory.
Offline npm installation lacked one cached package; prefer-offline installation
completed while retaining npm's existing install-script restrictions.

## Positions and next gate

Engineering: reuse current architecture and canonical readers. Security: preserve
all company/session checks, source-expiry bounds and unavailable states.
Program: local verification, shared development, CI and deployment are separate
states. Governance: no policy exception or production authorization; release
impact remains CONDITION on exact-candidate gates. This is not independent QA/UI
certification.

## Final review and author repair

The [original fresh-context review](evidence/2026-11-08-backend-integration-code-review.md)
returned **With fixes / BLOCK / REQUEST_CHANGES** at d7bfc4c2. Its original verdict
is preserved. One author repair pass at
`6b5f78f30f7df7d32dbab8ce80b840bc6bf80408` addresses the findings:

- Final authorization delay now consumes the source's remaining lifetime as well
  as the original company authority budget. The actual public company-result
  wrapper failed three deterministic regressions before the repair, and all four
  boundary checks pass afterward, including exact expiry and a 1,500ms tail on a
  1,000ms source.
- Incoming and recent swap sections now use one guarded SQL snapshot and one
  statement timestamp. Controlled canonical cancellation reproduced both duplicate
  and omitted records on the original implementation; both interleavings pass.
- All potentially incoming rows are canonically projected with the latest 20
  other participant rows before eligible history is limited. A real SQL fixture
  with 20 pending offers retains sent, decided and effectively expired history.
  A failed exchange source remains explicit while independent coverage survives.
- The minor calendar-helper duplication uses existing `addDays`; existing
  midnight and overnight boundary regressions pass without a redundant new test.

Final repair checks: **10,997 unit passed, 801 existing skips, zero failures**
(383.338 seconds), plus **43 Requests/shift-change SQL and seven action-center
SQL passed**. The focused 47 unit checks, TypeScript, whole ESLint, build and
source custody passed. Application code is qualified at 6b5f78f3; subsequent
handoff edits are documentation only. No second reviewer approval or independent
certification is claimed.

Next: complete the full suite, reconcile any remote drift, push only a normal
fast-forward to development and observe that exact candidate's CI. Main, staging
deployments, signing and the paused physical-iPhone connection check are outside
this integration. The exact pushed commit and observed workflow results are
recorded in the runtime's `shared-integration.json`; it distinguishes local,
pushed and CI states and retains failed attempts. Inspect that receipt or the
exact commit's GitHub Actions runs rather than treating this pre-push document
as proof of shared CI completion.

For later UI integration, preserve development's backend versions, especially the
source-lifetime, overnight and midnight corrections. Reconcile the matching UI
clock calls and held `readInboxCount` activation together; do not overwrite these
server fixes by copying all backend files from the older collaboration snapshot.
