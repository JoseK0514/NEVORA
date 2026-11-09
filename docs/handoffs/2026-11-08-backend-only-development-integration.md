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
- TypeScript and whole ESLint passed. Full unit/build/review are pending at this
  initial checkpoint.

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

Next: finish full checks, obtain one fresh-context code review, reconcile any new
remote drift and push only a normal fast-forward to development. Then observe
the exact pushed candidate's required CI. Main, staging deployments, signing and
the paused physical-iPhone connection check are outside this integration.
