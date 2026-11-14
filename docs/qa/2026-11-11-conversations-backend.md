# SCRUM-187 backend qualification — November 11, 2026

Runtime source: `75498984c367784185a2b84abbc9c69f860703b4` (detached), base
`0317598ae6886bc964bbd6bb5c1bbbd3add46069`. Subsequent handoff/qualification edits
are documentation only. No merge, push, hosted schema change or deployment occurred.

Owner: Codex backend. Next implementation owner: Claude UI. The full Jira issue
remains In Progress; SCRUM-58/D04 approval and combined UI acceptance remain open.

| Check actually run | Result |
| --- | --- |
| `npm test -- --maxWorkers=2` | 821 files /11,958 tests passed;32 files /857 configured skips |
| Owned `vitest.conversations-integration.config.mts` | 26 passed, zero skips |
| `onboarding-owned.mjs --suite provisioning` | 21 passed, zero skips |
| Focused conversations + migration-order | 21 passed |
| `npm run typecheck` | passed |
| Changed TS/route/test ESLint | passed, no warnings |
| Full repository ESLint at implementation checkpoint | zero errors, one existing workforce-monitor export warning |
| `npm run test:release-engineering` | 229 passed |
| Canonical onboarding manifest | matches final SQL |
| Development inventory | 73 classified sources /3 branches; held UI not imported |
| `release-build.mjs` with exact expected SHA | exit0; sourceClean/sourceUnchanged true |

Evidence: `/Users/josek0514/.codex/conversations-evidence-20261111/qualification.json`.
It indexes log/report hashes; `runtime-files.json` records 33 changed runtime/test/config
file hashes. Build receipt: `build-complete.json`. SQL report: `sql-complete.json`.
All SQL used new invocation-owned fictional loopback clusters, closed and removed.
No existing/customer databases or external messages/providers were used.

## Test-run limitation retained

A default-parallelism run on the corrected source timed out one unchanged tenancy
migration test at its original 5000ms limit (11,957 passed, one failed,857 configured
skips). That complete file then passed68/68 in isolation; the complete suite passed
11,958/11,958 with two workers and unchanged timeouts/assertions. Earlier baseline
and pre-review default-parallelism runs also passed. This is consistent with local
resource contention; it does not certify hosted CI or guarantee timing on every host.
The failed log is retained as `default-complete.log`, not overwritten.

## Fresh review and verified corrections

One fresh whole-change reviewer examined source `238597cb`, all37 changed paths,
plan/spec, and evidence. It requested changes for four Important findings. Five
new owned-SQL cases failed on that reviewed source. The combined fix pass made all
26 SQL cases pass, including both context revocation timings, LEAVE lifecycle and
fresh-authority rebinding, exact/altered removed-member replays after rejoin, and
actual escaped-identifier byte pagination. No additional reviewer seat was used.

The original review report is retained unchanged outside source as
`whole-change-review.md`; the author's fix evidence is separate. This records
regression-verified corrections, not a new independent approval or live certification.
See the Claude handoff for the final contracts, ownership and release controls.

## Decisions and deferred minor

- context people pages use four people and IDs bounded at 200 UTF-8 bytes, rather than five at 200 JavaScript code units. This keeps 1000 eligibility IDs per person below the one-megabyte wire ceiling; unusually oversized legacy identifiers return capacity unavailable. Cost if wrong: more context pagination and those unsupported identifiers need normalization before use.
- orphaned groups keep authorized history but posting pauses if a stale/ineligible member remains. A current manager may remove that member, otherwise use a replacement group; never grant an unjoined Owner private access. Cost if wrong: conversation continuity requires a replacement group after the last manager departs.
- read authority is derived server-side and response-bound in the supported client; commands/recovery carry the context token. A second browser credential is unnecessary. Cost if wrong: client integration must honor response authority/lifetime and clear state on identity changes.
- Claude UI/mobile/accessibility and offline/focus behavior remain a separate owner/acceptance gate. Cost if wrong: backend qualification cannot establish usable UI.
- D04 retention/hold/live activation, hosted migration/CI and production remain unexecuted gates. Cost if wrong: this local backend must not be presented as a live rollout.
- SCRUM-185 pinned schema adapter does not certify combined runtime/UI deployment. Cost if wrong: assemble actual source and regenerate manifest before joint acceptance.
- conservative locks are qualified for correctness with bounded deadlines, not a throughput/SLA promise. Cost if wrong: contention needs measurement before larger-team rollout.
- retain orphan-group replacement workflow and up-to-four byte-trimmed people pages. Cost if wrong: orphan posting continuity and catalog pagination may require later product refinement; size correctness is covered by R4.

Deferred minor: dense one-line SQL/service/test formatting remains. No additional runtime defect was attributed to formatting.

## Execution ledger

```text
# SDD ledger — plan: docs/superpowers/plans/2026-11-11-conversations.md
Pre-flight: Tasks 1→2→3 share canonical commands and receipt identity; SQL compares canonical payload hash. Tasks 3→4 share private response lifetimes and exact operation targets; use POST recovery with original normalized command. Tasks 2→5 share FINAL migration authority; preserve held tenant files and optional staff source.
Builder check: fixed LEAVE recovery exception and pinned SCRUM-185 fixture locator/hash before implementation.
Task 1: model RED missing module → GREEN 5/5. Baseline default 11,941 passed +857 configured skips.
Task 3: Ruling: context people pages use four people and IDs bounded at 200 UTF-8 bytes, rather than five at 200 JavaScript code units. This keeps 1000 eligibility IDs per person below the one-megabyte wire ceiling; unusually oversized legacy identifiers return capacity unavailable. Cost if wrong: more context pagination and those unsupported identifiers need normalization before use.
Task 3: Ruling: orphaned groups keep authorized history but posting pauses if a stale/ineligible member remains. A current manager may remove that member, otherwise use a replacement group; never grant an unjoined Owner private access. Cost if wrong: conversation continuity requires a replacement group after the last manager departs.
Task 2: complete — owned migrations, exact FINAL manifest and restricted APP upgrade qualified in actual PostgreSQL; no WORKER/DELETE privileges.
Task 3: complete — 21 owned SQL scenarios including concurrency/recovery, true employee lock wait, response revocation, optional task/shift permissions, Unicode history, bounded contexts and snapshot pagination pass.
Task 4: complete — 17 focused model/transport/client/cursor/schema tests plus 4 migration authority tests pass; full typecheck and focused lint pass.
Final: fixed R1 — both before-query and before-response location revocation regressions RED→GREEN.
Final: fixed R2 — lifecycle-bound LEAVE recovery regression RED→GREEN; valid same-lifecycle recovery retained.
Final: fixed R3 — exact/altered removed/rejoined member replay regression RED→GREEN.
Final: fixed R4 — escaped 200-byte/1000-location context regression RED→GREEN, resumable variable-size people pages.
Final: whole owned SQL suite 26/26 after combined fixes.
Final: minor (deferred): dense one-line SQL/service/test formatting; no independent runtime defect attributed to style.
Final: Ruling: read authority is derived server-side and response-bound in the supported client; commands/recovery carry the context token. A second browser credential is unnecessary. Cost if wrong: client integration must honor response authority/lifetime and clear state on identity changes.
Final: Ruling: Claude UI/mobile/accessibility and offline/focus behavior remain a separate owner/acceptance gate. Cost if wrong: backend qualification cannot establish usable UI.
Final: Ruling: D04 retention/hold/live activation, hosted migration/CI and production remain unexecuted gates. Cost if wrong: this local backend must not be presented as a live rollout.
Final: Ruling: SCRUM-185 pinned schema adapter does not certify combined runtime/UI deployment. Cost if wrong: assemble actual source and regenerate manifest before joint acceptance.
Final: Ruling: conservative locks are qualified for correctness with bounded deadlines, not a throughput/SLA promise. Cost if wrong: contention needs measurement before larger-team rollout.
Final: Ruling: retain orphan-group replacement workflow and up-to-four byte-trimmed people pages. Cost if wrong: orphan posting continuity and catalog pagination may require later product refinement; size correctness is covered by R4.
Final: fixed R2 supplementary rebound case — after observing a fresh context, substituting its authority into an earlier-lifecycle LEAVE also stays blocked; RED conflict→GREEN blocked in both recovery and submit. Stored membership generation is checked independently of caller payload.

Task 5: complete — corrected runtime 75498984c367784185a2b84abbc9c69f860703b4; 11,958 default passing +857 configured skips with maxWorkers2, 26 actual SQL,21 provisioning,21 focused/migration,229 release-engineering, clean type/changed-file lint, source-bound build clean/unchanged, canonical manifest and inventory verified. No production/hosted activation.
```

## Integration preflight

Six new API routes were explicitly classified in the existing onboarding inventory;
its unchanged enforcement reproduced RED and then passed5/5. Full source-bound
onboarding backend acceptance on511921ca passed all7 stages (209 onboard/514 foundation/
36 exchange plus receipt/contract stages). The runtime itself is unchanged from75498984.
The optional staff fixture matrix reproduced two prior-fixture failures with storage
already installed, then passed52/52 after reusing actual installed schema and explicitly
exercising the absent adapter in owned databases. No branch/gate/control was weakened.
Actions/merge are pending the sole integration owner's new immutable candidate.
