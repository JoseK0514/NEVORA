# Owner prioritized briefing implementation

Jose approved the competitive enhancement proposal on October 23, 2026. This is the first increment: prioritized Owner briefing and follow-through. Coverage mutation proposals and payroll exception tooling remain subsequent increments of the approved roadmap.

## Scope and acceptance

Build on freshly fetched development `739165b2` with the existing Owner advisor candidate `2530a701` included locally as a dependency. Preserve PR25 and all other worktrees. Keep the advisor feature flag, live Owner/Company Access checks, same-origin commands, finite private display lease and provider budget unchanged. No paid inference, external messaging, production data, deployment, or main merge.

An on-open, deterministic briefing shows at most three prioritized issues across locations from canonical Today and schedule-health readers. Missing punches never imply absence. Scheduling facts explicitly include drafts. Each item has date/location, evidence timestamp, missing-input context and a review link. Group duplicate issues by kind/location/day; rank current missing punches, current/upcoming coverage, historical missing punches, then missing setup. Coverage setup errors and failed/capped readers cannot produce an all-clear or resolved claim.

Owner-scoped follow-through persists track/defer-for-one-hour/irrelevant-today dispositions, with revision conflict handling and idempotency. They are personal triage choices, not business mutations or authority. Changed evidence invalidates suppression. Resolution is derived only from fresh positive canonical records; removed/expired/unknown subjects remain not-current/unverified. A separate reviewed-items list keeps hidden issues discoverable. Store selectors and hashes rather than employee names; bound writes and retained history. No model call occurs when opening, refreshing or reviewing the briefing.

## Task 1: canonical projection and private persistence

Write a service integration assertion for the missing attention briefing and observe failure. Then implement pure projection tests for ranking/deduplication, draft labels, overnight dates, partial data, changed evidence, suppression expiry and resolution semantics. Add one additive migration for Owner-scoped reviews and replay receipts; classify it in canonical order and disposable fixtures, retaining full schema parity. Test PostgreSQL owner isolation, conflicts, replays, expiration and stale evidence. Expected: focused unit/integration suite passes.

## Task 2: protected API and Owner screen

Extend the current snapshot and typed command parser with bounded attention contracts; guard every read/write with original Owner authority. Reuse current controller lifecycle and post-operation fresh-read fence. Render priority cards and follow-through controls with existing clean-manager tokens, keyboard access and honest loading/error/empty/partial states. Test controller authority loss, invalid responses, conflicts and lost responses, and render behavior. Expected: focused suite, typecheck and lint pass.

## Task 3: observed browser behavior and handoff

Exercise the actual Next/PostgreSQL Owner page in Chromium and WebKit at 320/390/1440: issue cards, follow/defer/restore persistence, positive resolution after canonical data changes, empty/failed reads, keyboard/focus, authority retirement and non-Owner denial. Use only fictional disposable records and block external requests. Run default tests, advisor PostgreSQL integrations, full foundation schema upgrade parity, build and release-engineering checks appropriate to changed files. Obtain one fresh-context whole-change code review under the executing-plans skill; fix important findings with regressions. Preserve raw evidence outside tracked source and write a durable handoff with actual outcomes and release limitations.

## Leadership and release impact

Product: deliver a focused recurring decision workflow. Engineering: existing canonical rules remain the source of truth. Security: Owner-only personal state, server-owned issue selectors, fresh authority and bounded retention. Governance: development-only follow-up; current source inventory reports branch drift and 55 remote branches against a ceiling of five. Do not weaken that gate or retire other work. Hosted and production acceptance remain separate.

## Progress

- Discovery: main checkout clean but behind; isolated branch created from current origin/development. Existing advisor dependency merged locally without conflicts. Current release work and research report preserved.
- Pre-flight shared interfaces: projection -> protected snapshot -> browser parser -> controller/screen; migration -> fixture order -> schema catalog parity. All must change together.
